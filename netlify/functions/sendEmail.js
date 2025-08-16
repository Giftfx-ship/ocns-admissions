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

        const paymentData = {
          reference: fields.paymentReference || 'N/A',
          amount: 0,
          paidAt: null,
          status: 'Not verified',
        };

        const slipPath = await generateSlip(fields, paymentData);

        const getSingleFile = (fileField) => Array.isArray(fileField) ? fileField[0] : fileField;
        const olevelFile = getSingleFile(files.olevel);
        const passportFile = getSingleFile(files.passport);

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        const attachments = [{ filename: 'acknowledgment_slip.pdf', path: slipPath }];
        if (olevelFile) attachments.push({ filename: olevelFile.filename, path: olevelFile.path });
        if (passportFile) attachments.push({ filename: passportFile.filename, path: passportFile.path });

        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: 'ogbomosocollegeofnursingsc@gmail.com',
          subject: 'New Student Registration Submitted',
          text: `
A new student has submitted their application.

--- Personal Info ---
Surname: ${fields.surname || 'N/A'}
Other Names: ${fields.othernames || 'N/A'}
Gender: ${fields.gender || 'N/A'}
Date of Birth: ${fields.dob || 'N/A'}
Email: ${fields.email || 'N/A'}
Phone: ${fields.phone || 'N/A'}

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Status: ${paymentData.status}

Attached: acknowledgment slip + uploaded files.
          `,
          attachments,
        });

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
