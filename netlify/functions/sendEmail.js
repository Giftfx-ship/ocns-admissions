// netlify/functions/sendEmail.js
import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";
import formidable from "formidable";
import fs from "fs";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: false, // disable default body parser to handle multipart/form-data
  },
};

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Parse FormData
    const form = new formidable.IncomingForm();
    const formData = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const { fields, files } = formData;

    // Convert uploaded files to buffers
    const passportBuffer = files.passportFile
      ? fs.readFileSync(files.passportFile.filepath)
      : null;
    const olevelBuffer = files.olevelFile
      ? fs.readFileSync(files.olevelFile.filepath)
      : null;

    // Generate PDF slip (no payment)
    const slipBuffer = await generateSlip(
      { ...fields, passport: passportBuffer },
      { reference: "N/A", amount: 0, paidAt: null }
    );

    // Compose Admin email
    const adminBody = `
📩 NEW STUDENT APPLICATION

--- Personal Info ---
Surname: ${fields.surname || "N/A"}
Other Names: ${fields.othernames || "N/A"}
Gender: ${fields.gender || "N/A"}
Marital Status: ${fields.marital_status || "N/A"}
Date of Birth: ${fields.dob || "N/A"}
Religion: ${fields.religion || "N/A"}

--- Contact ---
Email: ${fields.email || "N/A"}
Phone: ${fields.phone || "N/A"}
Country: ${fields.country || "N/A"}
State of Origin: ${fields.state_origin || "N/A"}
State: ${fields.state || "N/A"}
LGA: ${fields.lga || "N/A"}
Home Town: ${fields.hometown || "N/A"}
Address: ${fields.address || "N/A"}

--- Sponsor ---
Name: ${fields.sponsor_name || "N/A"}
Relationship: ${fields.sponsor_relationship || "N/A"}
Phone: ${fields.sponsor_phone || "N/A"}
Address: ${fields.sponsor_address || "N/A"}

--- Next of Kin ---
Name: ${fields.nok_name || "N/A"}
Relationship: ${fields.nok_relationship || "N/A"}
Phone: ${fields.nok_phone || "N/A"}
Address: ${fields.nok_address || "N/A"}

--- Uploads ---
Passport: ${files.passportFile ? files.passportFile.originalFilename : "N/A"}
O’Level: ${files.olevelFile ? files.olevelFile.originalFilename : "N/A"}
`.trim();

    // Send admin email
    await resend.emails.send({
      from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
      to: "ogbomosocollegeofnursingscienc@gmail.com",
      subject: "📩 New Student Registration Submitted",
      text: adminBody,
      attachments: [
        {
          content: slipBuffer.toString("base64"),
          filename: `${fields.surname || "applicant"}_slip.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });

    // Send student email
    if (fields.email) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your Acknowledgment Slip is attached to this email.

📌 For your records:
• Passport: ${files.passportFile ? files.passportFile.originalFilename : "N/A"}
• O’Level: ${files.olevelFile ? files.olevelFile.originalFilename : "N/A"}

Please save these documents and bring the slip on exam day.

Join the aspirant group here: https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t

Best regards,
OCNS Admissions Team
`.trim();

      await resend.emails.send({
        from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
        to: fields.email,
        subject: "✅ Application Received - Ogbomoso College of Nursing Science",
        text: studentBody,
        attachments: [
          {
            content: slipBuffer.toString("base64"),
            filename: `${fields.surname || "applicant"}_slip.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        passportName: files.passportFile?.originalFilename || null,
        olevelName: files.olevelFile?.originalFilename || null,
      }),
    };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
          }
