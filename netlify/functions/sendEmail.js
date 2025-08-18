import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const fields = JSON.parse(event.body || "{}");

    // Generate PDF slip
    const slipBuffer = await generateSlip(fields);

    // Send email to student
    if (fields.email) {
      await resend.emails.send({
        from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
        to: fields.email,
        subject: "✅ Application Received",
        text: `Dear ${fields.surname || "Applicant"},\n\nYour application has been received.\nAttached is your acknowledgment slip.`,
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
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
