// netlify/functions/sendEmail.js
import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Parse JSON body (frontend sends JSON)
    const fields = JSON.parse(event.body);

    const paymentData = {
      reference: fields.paymentReference || "N/A",
      amount: 16000 * 100,
      status: "success",
      paidAt: new Date().toISOString(),
    };

    // Generate PDF acknowledgment slip
    const slipBase64 = await generateSlip(fields, paymentData);

    // --- Admin email ---
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
`;

    await resend.emails.send({
      from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
      to: "ogbomosocollegeofnursingscienc@gmail.com",
      subject: "📩 New Student Registration Submitted",
      text: adminBody,
      attachments: slipBase64
        ? [
            {
              filename: "acknowledgment_slip.pdf",
              content: slipBase64,
              encoding: "base64",
            },
          ]
        : [],
    });

    // --- Student email ---
    if (fields.email && slipBase64) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Attached is your **Acknowledgment Slip**.  

Please print it and bring it along on exam day.

Join the aspirant group here: https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppM

Best regards,  
OCNS Admissions Team
`;

      await resend.emails.send({
        from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
        to: fields.email,
        subject: "✅ Application Received - Ogbomoso College of Nursing Science",
        text: studentBody,
        attachments: [
          {
            filename: "acknowledgment_slip.pdf",
            content: slipBase64,
            encoding: "base64",
          },
        ],
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Emails sent successfully" }),
    };
  } catch (error) {
    console.error("❌ Error sending emails:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
