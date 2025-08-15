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

    bb.on('file', (fieldname, file, filename) => {
      const filepath = path.join(tmpdir, `${uuidv4()}-${filename}`);
      file.pipe(fs.createWriteStream(filepath));
      files[fieldname] = { path: filepath, filename };
    });

    bb.on('field', (fieldname, value) => {
      fields[fieldname] = value;
    });

    bb.on('finish', async () => {
      try {
        // No payment verification here
        const paymentData = {
          reference: fields.paymentReference || 'N/A',
          amount: 0,
          paidAt: null,
          status: 'Not verified',
        };

        const slipPath = await generateSlip(fields, paymentData);

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ogbomosocollegeofnursingscienc@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

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
          attachments: [
            { filename: 'acknowledgment_slip.pdf', path: slipPath },
            ...(files.olevel ? [{ filename: files.olevel.filename, path: files.olevel.path }] : []),
            ...(files.passport ? [{ filename: files.passport.filename, path: files.passport.path }] : []),
          ],
        });

        // Cleanup
        fs.unlinkSync(slipPath);
        if (files.olevel) fs.unlinkSync(files.olevel.path);
        if (files.passport) fs.unlinkSync(files.passport.path);

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
            details: err.stack || err.toString(),
          }),
        });
      }
    });

    const body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    bb.end(body);
  });
};
