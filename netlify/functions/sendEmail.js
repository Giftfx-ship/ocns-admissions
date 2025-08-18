// netlify/functions/sendEmail.js
import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const fields = JSON.parse(event.body || "{}");

    // Generate PDF slip (direct buffer, no payment)
    const slipBuffer = await generateSlip(fields, {});

    // Compose Admin email with all sections
    const adminBody = `
📩 NEW STUDENT APPLICATION

--- Personal Info ---
Surname: ${fields.surname || "N/A"}
Other Names: ${fields.othernames || "N/A"}
Gender: ${fields.gender || "N/A"}
Marital Status: ${fields.marital_status || "N/A"}
Date of Birth: ${fields.dob || "N/A"}
Religion: ${fields.religion || "N/A"}
Course: ${fields.course || "N/A"}
Exam Month: ${fields.exam_month || "N/A"}

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
Passport: ${fields.passportName || "N/A"}
O’Level: ${fields.olevelName || "N/A"}

--- Notes ---
Additional info: ${fields.notes || "N/A"}
`.trim();

    // Send email to Admin
    await resend.emails.send({
      from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
      to: "ogbomosocollegeofnursingscienc@gmail.com",
      subject: "📩 New Student Registration Submitted",
      text: adminBody,
      attachments: [
        {
          filename: "Acknowledgment_Slip.pdf",
          data: slipBuffer,
        },
      ],
    });

    // Send email to Student
    if (fields.email) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your Acknowledgment Slip is attached to this email.

Please save it and bring it on exam day.

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
            filename: "Acknowledgment_Slip.pdf",
            data: slipBuffer,
          },
        ],
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
