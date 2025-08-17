// netlify/functions/sendEmail.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body);
    const { fields, paymentData, slipBase64 } = body;

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

--- Sponsor Info ---
Name: ${fields.sponsor_name || "N/A"}
Relationship: ${fields.sponsor_relationship || "N/A"}
Phone: ${fields.sponsor_phone || "N/A"}
Address: ${fields.sponsor_address || "N/A"}

--- Next of Kin ---
Name: ${fields.nok_name || "N/A"}
Relationship: ${fields.nok_relationship || "N/A"}
Phone: ${fields.nok_phone || "N/A"}
Address: ${fields.nok_address || "N/A"}

--- Payment Details ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${
      paymentData.paidAt
        ? new Date(paymentData.paidAt).toLocaleString()
        : "N/A"
    }
Status: ${paymentData.status}
`;

    // Send email to Admin (with slip)
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
            },
          ]
        : [],
    });

    // Confirmation email to Student
    if (fields.email && slipBase64) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

Thank you for applying to **Ogbomoso College of Nursing Science**.

✅ Your application has been successfully received.  
📎 Please find attached your **Acknowledgment Slip**.  

You are required to print this slip and bring it along on the examination day.  

We wish you success in your admission process.  

Best Regards,  
Ogbomoso College of Nursing Science Admissions Team
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
          },
        ],
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Emails sent" }),
    };
  } catch (error) {
    console.error("❌ Error sending emails:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
    }
