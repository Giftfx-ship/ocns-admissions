import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";
import Busboy from "busboy";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const fields = {};
  const files = {};

  // parse multipart/form-data
  const busboy = Busboy({ headers: event.headers });
  busboy.on("field", (name, value) => { fields[name] = value; });
  busboy.on("file", (name, file) => {
    const chunks = [];
    file.on("data", (chunk) => chunks.push(chunk));
    file.on("end", () => { files[name] = Buffer.concat(chunks); });
  });

  await new Promise((resolve) => busboy.end(Buffer.from(event.body, "base64")).on("finish", resolve));

  try {
    const slipBuffer = await generateSlip({ ...fields, passport: files.passport });

    // Compose Admin email body with all form fields
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
Passport: ${files.passport ? "Attached" : "N/A"}
O’Level: ${files.olevel ? "Attached" : "N/A"}
`.trim();

    // Send Admin Email
    await resend.emails.send({
      from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
      to: "ogbomosocollegeofnursingscienc@gmail.com",
      subject: "📩 New Student Registration Submitted",
      text: adminBody,
      attachments: [
        { content: slipBuffer.toString("base64"), filename: `${fields.surname || "applicant"}_slip.pdf`, type: "application/pdf", disposition: "attachment" }
      ],
    });

    // Compose Student Email
    if (fields.email) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your Acknowledgment Slip is attached to this email.

📌 For your records:
• Passport: ${files.passport ? "Attached" : "N/A"}
• O’Level: ${files.olevel ? "Attached" : "N/A"}

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
          { content: slipBuffer.toString("base64"), filename: `${fields.surname || "applicant"}_slip.pdf`, type: "application/pdf", disposition: "attachment" }
        ],
      });
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Error sending email:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
}
