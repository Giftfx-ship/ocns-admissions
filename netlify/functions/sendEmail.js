// netlify/functions/sendEmail.js
import { v2 as cloudinary } from "cloudinary";
import { Resend } from "resend";
import generateSlip from "../../utils/generateSlip.js";
import fetch from "node-fetch";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// Safe fetch helper: converts image URL -> base64
async function fetchAsBase64Safe(url, label = "file") {
  if (!url) {
    console.warn(`No URL provided for ${label}. Skipping.`);
    return null;
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Could not fetch ${label}: ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    return buf.toString("base64");
  } catch (err) {
    console.warn(`Failed to fetch ${label}:`, err.message);
    return null;
  }
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const fields = JSON.parse(event.body || "{}");

    const paymentData = {
      reference: fields.paymentReference || "N/A",
      amount: 16000 * 100, // kobo
      status: "success",
      paidAt: new Date().toISOString(),
    };

    // Convert uploaded files to base64 safely
    const passportBase64 = await fetchAsBase64Safe(fields.passportUrl, "passport");
    const olevelBase64 = await fetchAsBase64Safe(fields.olevelUrl, "O’Level");

    // Generate PDF (returns base64)
    const slipBase64 = await generateSlip(
      { ...fields, passport: passportBase64 },
      paymentData
    );

    // Upload PDF slip to Cloudinary
    const slipDataUri = `data:application/pdf;base64,${slipBase64}`;
    const slipUpload = await cloudinary.uploader.upload(slipDataUri, {
      folder: "admissions/slips",
      resource_type: "auto",
      public_id: `${(fields.surname || "applicant")}_${paymentData.reference}`.replace(/\s+/g, "_"),
      overwrite: true,
    });
    const slipUrl = slipUpload.secure_url;

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
Passport: ${fields.passportUrl || "N/A"}
O’Level: ${fields.olevelUrl || "N/A"}

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${new Date(paymentData.paidAt).toLocaleString()}
Status: ${paymentData.status}

--- Acknowledgment Slip ---
${slipUrl}
`.trim();

    await resend.emails.send({
      from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
      to: "ogbomosocollegeofnursingscienc@gmail.com",
      subject: "📩 New Student Registration Submitted",
      text: adminBody,
    });

    // Compose Student email
    if (fields.email) {
      const studentBody = `
Dear ${fields.surname || "Applicant"},

✅ Your application has been successfully received by Ogbomoso College of Nursing Science.

📎 Your **Acknowledgment Slip** is available here:
${slipUrl}

📌 For your records:
• Passport: ${fields.passportUrl || "N/A"}
• O’Level: ${fields.olevelUrl || "N/A"}

Please save these links and bring the slip on exam day.

Join the aspirant group here: https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t

Best regards,
OCNS Admissions Team
`.trim();

      await resend.emails.send({
        from: "Ogbomoso College <no-reply@ogbomosocollegeofnursingscience.onresend.com>",
        to: fields.email,
        subject: "✅ Application Received - Ogbomoso College of Nursing Science",
        text: studentBody,
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slipUrl,
        passportUrl: fields.passportUrl || null,
        olevelUrl: fields.olevelUrl || null,
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
