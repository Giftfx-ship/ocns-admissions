// utils/generateSlip.js
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export default function generateSlip(formData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // HEADER STRIP
      doc.rect(0, 0, doc.page.width, 80).fill("#1155cc");

      // LOGO (optional)
      try {
        const logoPath = path.join(process.cwd(), "images", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 40, 15, { width: 60, height: 60 });
        }
      } catch {}

      // PASSPORT (direct buffer)
      if (formData.passport) {
        try {
          doc
            .image(formData.passport, doc.page.width - 120, 15, { width: 80, height: 80 })
            .rect(doc.page.width - 125, 10, 90, 90)
            .stroke();
        } catch {
          console.warn("Invalid passport image, skipping.");
        }
      }

      // TITLE
      doc.fillColor("#ffffff").fontSize(20).text("Ogbomoso College of Nursing Science", 120, 25);
      doc.fillColor("#000000");
      doc.moveDown(6);
      doc.fontSize(18).text("Acknowledgment Slip", { align: "center", underline: true });

      // WATERMARK (optional)
      try {
        const logoPath2 = path.join(process.cwd(), "images", "logo.png");
        if (fs.existsSync(logoPath2)) {
          doc.opacity(0.05).image(logoPath2, doc.page.width / 4, doc.page.height / 3, { width: 300 }).opacity(1);
        }
      } catch {}

      doc.moveDown(2);

      // DETAILS
      const textFields = [
        ["Surname", formData.surname],
        ["Other Names", formData.othernames],
        ["Gender", formData.gender],
        ["Marital Status", formData.marital_status],
        ["Date of Birth", formData.dob],
        ["Religion", formData.religion],
        ["Email", formData.email],
        ["Phone", formData.phone],
        ["Address", formData.address],
        ["Course", formData.course || "Basic Nursing"],
        ["Exam Month", formData.exam_month || "September"],
      ];

      doc.fontSize(12);
      textFields.forEach(([label, value]) => {
        doc.text(`${label}: ${value || "N/A"}`);
      });

      doc.moveDown(2);
      doc.fontSize(11).text("Please bring this slip on the exam day.", { align: "center" });

      // SIGNATURE
      doc.moveDown(4);
      doc.fontSize(12).text("______________________________", { align: "left" });
      doc.text("Registrar's Signature", { align: "left" });

      // STAMP BOX
      doc.rect(doc.page.width - 200, doc.page.height - 200, 150, 120).stroke("#1155cc");
      doc.fontSize(10).text("Official Stamp", doc.page.width - 180, doc.page.height - 150);

      // BORDER
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(2).stroke("#1155cc");

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
                         }
