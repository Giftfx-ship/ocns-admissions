import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";
import fetch from "node-fetch";

const resend = new Resend(process.env.RESEND_API_KEY);

async function fetchAsBuffer(url, label = "file") {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Could not fetch ${label}: ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    console.warn(`Failed to fetch ${label}:`, err.message);
    return null;
  }
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const fields = JSON.parse(event.body || "{}");

    // Convert passport to buffer
    const passportBuffer = await fetchAsBuffer(fields.passportUrl, "passport");

    // Generate PDF slip
    const slipBuffer = await generateSlip({ ...fields, passport: passportBuffer });

    // Admin email
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
Passport: ${fields.passportUrl || "N/A"}
O’Level: ${fields.olevelUrl || "N/A"}
`.trim();

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

    // Student email
    if (fields.email) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your Acknowledgment Slip is attached to this email.

📌 For your records:
• Passport: ${fields.passportUrl || "N/A"}
• O’Level: ${fields.olevelUrl || "N/A"}

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

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
  }
