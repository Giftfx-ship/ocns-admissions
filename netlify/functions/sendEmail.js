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

    // ✅ supports both old & new busboy signatures
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

        const paymentData = {
          reference: fields.paymentReference || 'N/A',
          amount: 0,
          paidAt: null,
          status: 'Not verified',
        };

        // Helper to normalize single/multiple upload fields
        const getSingleFile = (fileField) => Array.isArray(fileField) ? fileField[0] : fileField;

        const olevelFile = getSingleFile(files.olevel);
        const passportFile = getSingleFile(files.passport);

        // 🔗 pass passport path into the slip generator
        const passportPath = (passportFile && typeof passportFile.path === 'string') ? passportFile.path : null;
        const slipPath = await generateSlip(fields, paymentData, passportPath);

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ogbomosocollegeofnursingscienc@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const attachments = [
          { filename: 'acknowledgment_slip.pdf', path: slipPath },
        ];
        if (olevelFile && typeof olevelFile.path === 'string') {
          attachments.push({ filename: olevelFile.filename, path: olevelFile.path });
        }
        if (passportFile && typeof passportFile.path === 'string') {
          attachments.push({ filename: passportFile.filename, path: passportFile.path });
        }

        // === Admin Email (unchanged body, just ensures slip + uploads) ===
        await transporter.sendMail({
          from: 'ogbomosocollegeofnursingscienc@gmail.com',
          to: 'ogbomosocollegeofnursingscienc@gmail.com',
          subject: 'New Student Registration Submitted',
          text: `
A new student has submitted their application.

--- Personal Info ---
Surname: ${fields.surname || 'N/A'}
Other Names: ${fields.othernames || 'N/A'}
Gender: ${fields.gender || 'N/A'}
Marital Status: ${fields.marital_status || 'N/A'}
Date of Birth: ${fields.dob || 'N/A'}
Religion: ${fields.religion || 'N/A'}

--- Contact ---
Email: ${fields.email || 'N/A'}
Phone: ${fields.phone || 'N/A'}
Country: ${fields.country || 'N/A'}
State of Origin: ${fields.state_origin || 'N/A'}
State: ${fields.state || 'N/A'}
LGA: ${fields.lga || 'N/A'}
Home Town: ${fields.hometown || 'N/A'}
Address: ${fields.address || 'N/A'}

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
          `,
          attachments,
        });

        // === Student Email (NEW) — sends the slip ===
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

        // Cleanup temp files AFTER both emails
        const clean = (f) => { try { fs.unlinkSync(f); } catch {} };
        clean(slipPath);
        if (olevelFile && typeof olevelFile.path === 'string') clean(olevelFile.path);
        if (passportFile && typeof passportFile.path === 'string') clean(passportFile.path);

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
