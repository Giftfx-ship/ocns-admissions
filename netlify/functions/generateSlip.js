// generateSlip.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = function generateSlip(formData, paymentData, passportPath) {
  return new Promise((resolve, reject) => {
    try {
      const slipPath = path.join(os.tmpdir(), `acknowledgment_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(slipPath);
      doc.pipe(writeStream);

      // --- Generate Registration Number ---
      const regNumber = `OGC-${Date.now()}`; // e.g., OGC-1690000000000

      // Header bar
      doc.rect(0, 0, doc.page.width, 60).fill('#1155cc');
      doc.fillColor('#ffffff').fontSize(20)
        .text('Ogbomoso College of Nursing Science', 50, 20);
      
      // Registration Number (top-right)
      doc.fontSize(12).fillColor('#ffffff')
        .text(`Reg No: ${regNumber}`, doc.page.width - 150, 25);

      // Passport (optional)
      if (passportPath && fs.existsSync(passportPath)) {
        doc.image(passportPath, doc.page.width - 120, 70, { width: 80, height: 100 });
      }

      // Title
      doc.fillColor('#000000').fontSize(16).moveDown(2).text('Acknowledgment Slip', { align: 'center' });

      const fullName = formData.fullname || `${formData.surname || ''} ${formData.othernames || ''}`.trim() || 'N/A';

      // Student details
      doc.moveDown(1);
      doc.fontSize(12)
        .text(`Name: ${fullName}`)
        .text(`Email: ${formData.email || 'N/A'}`)
        .text(`Phone: ${formData.phone || 'N/A'}`)
        .text(`Course: Basic Nursing`)
        .text(`Payment Ref: ${paymentData?.reference || 'N/A'}`)
        .text(`Amount Paid: ₦${paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)
        .text(`Payment Date: ${paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A'}`);

      doc.moveDown(2);
      doc.text('Please bring this slip on the exam day.', { align: 'center' });

      // WhatsApp / Info
      doc.moveDown(1);
      doc.fillColor('#1155cc').fontSize(12)
        .text('Join our Aspirant WhatsApp Group:', { align: 'center' });
      doc.fillColor('blue')
        .text('https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t', {
          align: 'center',
          link: 'https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t',
          underline: true,
        });

      // Text-based professional stamp/seal
      const cx = doc.page.width - 110;
      const cy = doc.page.height - 120;
      doc.save();
      doc.circle(cx, cy, 50).lineWidth(3).stroke('#1155cc'); // circle border
      doc.fontSize(7).fillColor('#1155cc')
        .text('OGBOMOSO COLLEGE OF\nNURSING SCIENCE', cx - 45, cy - 25, { width: 90, align: 'center' });
      doc.fontSize(10).text('AUTHORISED', cx - 45, cy + 5, { width: 90, align: 'center' });
      doc.restore();

      // Finalize PDF
      doc.end();

      writeStream.on('finish', () => resolve(slipPath));
      writeStream.on('error', (err) => reject(err));

    } catch (err) {
      reject(err);
    }
  });
};
