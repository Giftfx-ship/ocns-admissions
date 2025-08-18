// sendEmail.js (Netlify Function in /.netlify/functions/)
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');
const generateSlip = require('./generateSlip');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  return new Promise((resolve) => {
    const bb = busboy({ headers: event.headers });
    const fields = {};
    const files = {};
    const tmpdir = os.tmpdir();
    const fileWritePromises = [];

    bb.on('file', (fieldname, file, infoOrFilename) => {
      const filename = typeof infoOrFilename === 'string'
        ? infoOrFilename
        : (infoOrFilename && infoOrFilename.filename) || `upload-${Date.now()}`;

      const filepath = path.join(tmpdir, `${uuidv4()}-${filename}`);

      const writePromise = new Promise((fileResolve, fileReject) => {
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
        writeStream.on('finish', () => {
          const fileData = { path: filepath, filename };
          if (files[fieldname]) {
            if (Array.isArray(files[fieldname])) files[fieldname].push(fileData);
            else files[fieldname] = [files[fieldname], fileData];
          } else {
            files[fieldname] = fileData;
          }
          fileResolve();
        });
        writeStream.on('error', (err) => fileReject(err));
      });

      fileWritePromises.push(writePromise);
    });

    bb.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    bb.on('finish', async () => {
      try {
        await Promise.all(fileWritePromises);

        // Minimal payment summary
        const paymentData = {
          reference: fields.paymentReference || 'N/A',
          amount: 0,
          paidAt: null,
          status: 'Not verified',
        };

        // Generate slip (logo only, no passport)
        const slipPath = await generateSlip(fields, paymentData);

        // Helper for single file
        const getSingleFile = (fileField) => Array.isArray(fileField) ? fileField[0] : fileField;
        const olevelFile = getSingleFile(files.olevel);
        const passportFile = getSingleFile(files.passport);

        // Configure transporter
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ogbomosocollegeofnursingscienc@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        // Attachments
        const attachments = [{ filename: 'acknowledgment_slip.pdf', path: slipPath }];
        if (olevelFile && olevelFile.path) attachments.push({ filename: olevelFile.filename, path: olevelFile.path });
        if (passportFile && passportFile.path) attachments.push({ filename: passportFile.filename, path: passportFile.path });

        // === Admin Email with ALL fields ===
        const adminBody = `
A new student has submitted their application.

--- Personal Info ---
Surname: ${fields.surname || 'N/A'}
Other Names: ${fields.othernames || 'N/A'}
Gender: ${fields.gender || 'N/A'}
Marital Status: ${fields.marital_status || 'N/A'}
Date of Birth: ${fields.dob || 'N/A'}
Religion: ${fields.religion || 'N/A'}
State of Origin: ${fields.state_origin || 'N/A'}
LGA: ${fields.lga || 'N/A'}
Address: ${fields.address || 'N/A'}

--- Contact ---
Email: ${fields.email || 'N/A'}
Phone: ${fields.phone || 'N/A'}
Country: ${fields.country || 'N/A'}
State: ${fields.state || 'N/A'}
Home Town: ${fields.hometown || 'N/A'}

--- Sponsor Info ---
Name: ${fields.sponsor_name || 'N/A'}
Relationship: ${fields.sponsor_relationship || 'N/A'}
Phone: ${fields.sponsor_phone || 'N/A'}
Address: ${fields.sponsor_address || 'N/A'}

--- Next of Kin ---
Name: ${fields.nok_name || 'N/A'}
Relationship: ${fields.nok_relationship || 'N/A'}
Phone: ${fields.nok_phone || 'N/A'}
Address: ${fields.nok_address || 'N/A'}

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${paymentData.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'Not verified'}
Status: ${paymentData.status}

Attached: acknowledgment slip + uploaded files.
`;

        await transporter.sendMail({
          from: 'ogbomosocollegeofnursingscienc@gmail.com',
          to: 'ogbomosocollegeofnursingscienc@gmail.com',
          subject: 'New Student Registration Submitted',
          text: adminBody,
          attachments,
        });

        // === Student Email with slip only ===
        if (fields.email) {
          await transporter.sendMail({
            from: 'ogbomosocollegeofnursingscienc@gmail.com',
            to: fields.email,
            subject: 'Your Application Acknowledgment Slip',
            text: `Dear ${fields.surname || fields.othernames || 'Applicant'},

Your application has been received successfully.
Payment Reference: ${paymentData.reference}

Please find your acknowledgment slip attached.

Ogbomoso College of Nursing Science`,
            attachments: [{ filename: 'acknowledgment_slip.pdf', path: slipPath }],
          });
        }

        // Cleanup temp files
        const clean = (f) => { try { fs.unlinkSync(f); } catch {} };
        clean(slipPath);
        if (olevelFile && olevelFile.path) clean(olevelFile.path);
        if (passportFile && passportFile.path) clean(passportFile.path);

        resolve({
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        });
      } catch (err) {
        console.error("❌ Error inside sendEmail:", err);
        resolve({
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: err.message,
            details: err.stack || String(err),
          }),
        });
      }
    });

    const body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    bb.end(body);
  });
};
