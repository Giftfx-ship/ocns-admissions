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
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  return new Promise((resolve) => {
    const bb = busboy({ headers: event.headers });
    const fields = {};
    const files = {};
    const tmpdir = os.tmpdir();
    const fileWritePromises = [];

    bb.on('file', (fieldname, file, filename) => {
      const filepath = path.join(tmpdir, `${uuidv4()}-${filename}`);
      const writePromise = new Promise((fileResolve, fileReject) => {
        const writeStream = fs.createWriteStream(filepath);
        file.pipe(writeStream);
        writeStream.on('finish', () => {
          const fileData = { path: filepath, filename };
          if (files[fieldname]) {
            if (Array.isArray(files[fieldname])) {
              files[fieldname].push(fileData);
            } else {
              files[fieldname] = [files[fieldname], fileData];
            }
          } else {
            files[fieldname] = fileData;
          }
          fileResolve();
        });
        writeStream.on('error', fileReject);
      });
      fileWritePromises.push(writePromise);
    });

    bb.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    bb.on('finish', async () => {
      try {
        await Promise.all(fileWritePromises);

        // Payment data (for now not verified yet)
        const paymentData = {
          reference: fields.paymentReference || 'N/A',
          amount: 0,
          paidAt: null,
          status: 'Not verified',
        };

        // Generate acknowledgment slip
        const slipPath = await generateSlip(fields, paymentData);

        const getSingleFile = (fileField) => Array.isArray(fileField) ? fileField[0] : fileField;
        const olevelFile = getSingleFile(files.olevel);
        const passportFile = getSingleFile(files.passport);

        // Setup mail transporter
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        // Attachments
        const attachments = [{ filename: 'acknowledgment_slip.pdf', path: slipPath }];
        if (olevelFile) attachments.push({ filename: olevelFile.filename, path: olevelFile.path });
        if (passportFile) attachments.push({ filename: passportFile.filename, path: passportFile.path });

        // ================= ADMIN MAIL =================
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: 'ogbomosocollegeofnursingsc@gmail.com',
          subject: 'New Student Registration Submitted',
          text: `
A new student has submitted their application.

‎--- Personal Info ---
‎Surname: ${fields.surname}
‎Other Names: ${fields.othernames}
‎Gender: ${fields.gender}
‎Marital Status: ${fields.marital_status}
‎Date of Birth: ${fields.dob}
‎Religion: ${fields.religion}
‎
‎--- Contact ---
‎Email: ${fields.email}
‎Phone: ${fields.phone}
‎Country: ${fields.country}
‎State of Origin: ${fields.state_origin}
‎State: ${fields.state}
‎LGA: ${fields.lga}
‎Home Town: ${fields.hometown}
‎Address: ${fields.address}
‎
‎--- Sponsor Info ---
‎Name: ${fields.sponsor_name}
‎Relationship: ${fields.sponsor_relationship}
‎Phone: ${fields.sponsor_phone}
‎Address: ${fields.sponsor_address}
‎
‎--- Next of Kin ---
‎Name: ${fields.nok_name}
‎Relationship: ${fields.nok_relationship}
‎Phone: ${fields.nok_phone}
‎Address: ${fields.nok_address}
‎
‎
‎Reference: ${paymentData.reference}
‎Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
‎Date Paid: ${new Date(paymentData.paidAt).toLocaleString()}
Attached: acknowledgment slip + uploaded files.
          `,
          attachments,
        });

        // ================= STUDENT MAIL =================
        if (fields.email) {
          await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: fields.email,
            subject: 'Your Application was Received',
            text: `
Dear ${fields.surname || ''} ${fields.othernames || ''},

Your application has been received successfully.  

Please find attached your acknowledgment slip and uploaded documents.  

Thank you,  
Ogbomoso College of Nursing
            `,
            attachments,
          });
        }

        // Cleanup temp files
        fs.unlinkSync(slipPath);
        if (olevelFile) fs.unlinkSync(olevelFile.path);
        if (passportFile) fs.unlinkSync(passportFile.path);

        resolve({
          statusCode: 200,
          body: JSON.stringify({ success: true }),
        });
      } catch (err) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ success: false, error: err.message }),
        });
      }
    });

    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    bb.end(body);
  });
};
