const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendApplicationEmails(fields, paymentData, slipPath, files) {
  const getSingleFile = (fileField) =>
    Array.isArray(fileField) ? fileField[0] : fileField;
  const olevelFile = getSingleFile(files.olevel);
  const passportFile = getSingleFile(files.passport);

  // Prepare attachments (base64 required for Resend)
  const attachments = [
    {
      filename: "acknowledgment_slip.pdf",
      content: fs.readFileSync(slipPath).toString("base64"),
    },
  ];
  if (olevelFile) {
    attachments.push({
      filename: olevelFile.filename,
      content: fs.readFileSync(olevelFile.path).toString("base64"),
    });
  }
  if (passportFile) {
    attachments.push({
      filename: passportFile.filename,
      content: fs.readFileSync(passportFile.path).toString("base64"),
    });
  }

  // Email body with all fields
  const emailBody = `
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

--- Payment ---
Reference: ${paymentData.reference}
Amount Paid: ₦${(paymentData.amount / 100).toFixed(2)}
Date Paid: ${
    paymentData.paidAt
      ? new Date(paymentData.paidAt).toLocaleString()
      : "N/A"
  }
Status: ${paymentData.status}
  `;

  // Send to Admin
  await resend.emails.send({
    from: "Ogbomoso College <no-reply@yourdomain.com>",
    to: "ogbomosocollegeofnursingsc@gmail.com", // admin email
    subject: "📩 New Student Registration Submitted",
    text: emailBody,
    attachments,
  });

  // Send confirmation to student
  if (fields.email) {
    await resend.emails.send({
      from: "Ogbomoso College <no-reply@yourdomain.com>",
      to: fields.email,
      subject: "✅ Your Application Was Received",
      text: `Dear ${fields.surname},\n\nYour application has been successfully submitted.\n\nPlease find your acknowledgment slip attached.\n\nThank you.`,
      attachments: [
        {
          filename: "acknowledgment_slip.pdf",
          content: fs.readFileSync(slipPath).toString("base64"),
        },
      ],
    });
  }

  // Cleanup temp files
  fs.unlinkSync(slipPath);
  if (olevelFile) fs.unlinkSync(olevelFile.path);
  if (passportFile) fs.unlinkSync(passportFile.path);

  return true;
}

module.exports = sendApplicationEmails;
