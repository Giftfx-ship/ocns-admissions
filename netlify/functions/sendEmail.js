const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');
const verifyPayment = require('./verifyPayment');
const generateSlip = require('./generateSlip');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
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
        const reference = fields.paymentReference;
        if (!reference) throw new Error("Missing payment reference");

        const paymentData = await verifyPayment(reference);
        const slipPath = await generateSlip(fields, paymentData);

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'ogbomosocollegeofnursingscienc@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD
          },
        });

        await transporter.sendMail({
          from: 'ogbomosocollegeofnursingscienc@gmail.com',
          to: 'ogbomosocollegeofnursingscienc@gmail.com',
          subject: 'New Student Registration Submitted',
          text: `
A new student has submitted their application.

--- Personal Info ---
Surname: ${fields.surname}
Other Names: ${fields.othernames}
Gender: ${fields.gender}
Marital Status: ${fields.marital_status}
Date of Birth: ${fields.dob}
Religion: ${fields.religion}

--- Contact ---
Email: ${fields.email}
Phone: ${fields.phone}
Country: ${fields.country}
State of Origin: ${fields.state_origin}
State: ${fields.state}
LGA: ${fields.lga}
Home Town: ${fields.hometown}
Address: ${fields.address}

--- Sponsor Info ---
Name: ${fields.sponsor_name}
Relationship: ${fields.sponsor_relationship}
Phone: ${fields.sponsor_phone}
Address: ${fields.sponsor_address}

--- Next of Kin ---
Name: ${fields.nok_name}
Relationship: ${fields.nok_relationship}
Phone: ${fields.nok_phone}
Address: ${fields.nok_address}

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${new Date(paymentData.paidAt).toLocaleString()}

Attached: acknowledgment slip + uploaded files.
          `,
          attachments: [
            { filename: 'acknowledgment_slip.pdf', path: slipPath },
            ...(files.olevel ? [{ filename: files.olevel.filename, path: files.olevel.path }] : []),
            ...(files.passport ? [{ filename: files.passport.filename, path: files.passport.path }] : []),
          ]
        });

        // Cleanup
        fs.unlinkSync(slipPath);
        if (files.olevel) fs.unlinkSync(files.olevel.path);
        if (files.passport) fs.unlinkSync(files.passport.path);

        resolve({
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true })
        });

      } catch (err) {
        console.error("❌ Error inside sendEmail:", err);

        resolve({
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: false,
            error: err.message,
            details: err.stack || err.toString()
          })
        });
      }
    });

    const body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    bb.end(body);
  });
};
