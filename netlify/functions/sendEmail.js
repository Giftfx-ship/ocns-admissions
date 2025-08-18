// netlify/functions/sendEmail.js
import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";
import formidable from "formidable";
import fs from "fs";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: false, // handle multipart form manually
  },
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const form = new formidable.IncomingForm();
    form.parse(event, async (err, fields, files) => {
      if (err) {
        return {
          statusCode: 500,
          body: JSON.stringify({ success: false, error: err.message }),
        };
      }

      // Payment info
      const paymentData = {
        reference: fields.paymentReference || "N/A",
        amount: 16000 * 100,
        status: "success",
        paidAt: new Date().toISOString(),
      };

      // Read uploaded files as buffers
      const passportBuffer = files.passport ? fs.readFileSync(files.passport.filepath) : null;
      const olevelBuffer = files.olevel ? fs.readFileSync(files.olevel.filepath) : null;

      // Generate PDF slip with passport
      const slipBuffer = await generateSlip(
        { ...fields, passport: passportBuffer },
        paymentData
      );

      // Attachments array
      const attachments = [
        { name: "AcknowledgmentSlip.pdf", data: slipBuffer },
      ];
      if (passportBuffer) attachments.push({ name: "Passport.png", data: passportBuffer });
      if (olevelBuffer) attachments.push({ name: "OLevel.pdf", data: olevelBuffer });

      // Compose Admin email body
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

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${new Date(paymentData.paidAt).toLocaleString()}
Status: ${paymentData.status}
`.trim();

      // Send email to Admin
      await resend.emails.send({
        from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
        to: "ogbomosocollegeofnursingscienc@gmail.com",
        subject: "📩 New Student Registration Submitted",
        text: adminBody,
        attachments,
      });

      // Compose Student email body
      if (fields.email) {
        const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your Acknowledgment Slip is attached to this email.
📌 For your records:
• Passport: ${passportBuffer ? "Attached" : "Not provided"}
• O’Level: ${olevelBuffer ? "Attached" : "Not provided"}

Please save these files and bring the slip on exam day.

Join the aspirant group here: https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM

Best regards,
OCNS Admissions Team
`.trim();

        // Send email to Student
        await resend.emails.send({
          from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
          to: fields.email,
          subject: "✅ Application Received - Ogbomoso College of Nursing Science",
          text: studentBody,
          attachments: [{ name: "AcknowledgmentSlip.pdf", data: slipBuffer }],
        });
      }

      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    });
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
