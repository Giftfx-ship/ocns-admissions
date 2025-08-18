// utils/generateSlip.js
import PDFDocument from "pdfkit";

export default function generateSlip(formData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // HEADER
      doc.rect(0, 0, doc.page.width, 80).fill("#1155cc");
      doc.fillColor("#ffffff").fontSize(20).text("Ogbomoso College of Nursing Science", 120, 25);
      doc.fillColor("#000000");
      doc.moveDown(6);
      doc.fontSize(18).text("Acknowledgment Slip", { align: "center", underline: true });

      // DETAILS
      const fields = [
        ["Surname", formData.surname],
        ["Other Names", formData.othernames],
        ["Email", formData.email],
        ["Phone", formData.phone],
      ];

      doc.fontSize(12);
      fields.forEach(([label, value]) => doc.text(`${label}: ${value || "N/A"}`));

      doc.moveDown(2);
      doc.fontSize(11).text("Please bring this slip on exam day.", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
