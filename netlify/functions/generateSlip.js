const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = function generateSlip(formData, paymentData) {
  return new Promise((resolve, reject) => {
    try {
      const slipPath = path.join(os.tmpdir(), `acknowledgment_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(slipPath);
      doc.pipe(writeStream);

      // --- HEADER BACKGROUND ---
      doc.rect(0, 0, doc.page.width, 80).fill('#1155cc');

      // --- LOGO ---
      const logoPath = path.join(process.cwd(), 'images', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 15, { width: 60, height: 60 });
      }

      // --- PASSPORT PHOTO (top-right) ---
      const passportPath = formData.passport ? path.join(process.cwd(), 'uploads', formData.passport) : null;
      if (passportPath && fs.existsSync(passportPath)) {
        doc.image(passportPath, doc.page.width - 120, 15, { width: 80, height: 80 })
          .rect(doc.page.width - 125, 10, 90, 90).stroke(); // border around passport
      }

      // --- TITLE ---
      doc.fillColor('#ffffff')
        .fontSize(20)
        .text('Ogbomoso College of Nursing Science', 120, 25);

      doc.fillColor('#000000');
      doc.moveDown(6);
      doc.fontSize(18).text('Acknowledgment Slip', { align: 'center', underline: true });

      // --- WATERMARK ---
      if (fs.existsSync(logoPath)) {
        doc.opacity(0.05)
          .image(logoPath, doc.page.width / 4, doc.page.height / 3, {
            width: 300,
            align: 'center',
            valign: 'center'
          })
          .opacity(1);
      }

      doc.moveDown(2);

      // --- STUDENT DETAILS ---
      doc.fontSize(12)
        .text(`Surname: ${formData.surname || 'N/A'}`)
        .text(`Other Names: ${formData.othernames || 'N/A'}`)
        .text(`Gender: ${formData.gender || 'N/A'}`)
        .text(`Marital Status: ${formData.marital_status || 'N/A'}`)
        .text(`Date of Birth: ${formData.dob || 'N/A'}`)
        .text(`Religion: ${formData.religion || 'N/A'}`)
        .moveDown(1)
        .text(`Email: ${formData.email || 'N/A'}`)
        .text(`Phone: ${formData.phone || 'N/A'}`)
        .text(`Address: ${formData.address || 'N/A'}`)
        .moveDown(1)
        .text(`Payment Reference: ${paymentData.reference || 'N/A'}`)
        .text(`Amount Paid: ₦${paymentData.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)
        .text(`Payment Date: ${paymentData.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A'}`);

      doc.moveDown(2);
      doc.fontSize(11).text('Please bring this slip on the exam day.', { align: 'center' });

      // --- SIGNATURE AREA ---
      doc.moveDown(4);
      doc.fontSize(12).text("______________________________", { align: 'left' });
      doc.text("Registrar's Signature", { align: 'left' });

      // --- STAMP BOX ---
      doc.rect(doc.page.width - 200, doc.page.height - 200, 150, 120)
        .stroke('#1155cc');
      doc.fontSize(10).text("Official Stamp", doc.page.width - 180, doc.page.height - 150);

      // --- BORDER ---
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(2)
        .stroke('#1155cc');

      doc.end();

      writeStream.on('finish', () => resolve(slipPath));
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};
