  // generateSlip.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = function generateSlip(formData, paymentData, passportPath) { // <-- accepts optional 3rd param
  return new Promise((resolve, reject) => {
    try {
      // Save to serverless tmp
      const slipPath = path.join(os.tmpdir(), `acknowledgment_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });

      const writeStream = fs.createWriteStream(slipPath);
      doc.pipe(writeStream);

      // Header bar
      doc.rect(0, 0, doc.page.width, 80).fill('#1155cc');

      // --- Logo (try multiple common locations) ---
      const candidateLogoPaths = [
        path.join(__dirname, 'logo.png'),
        path.join(__dirname, 'images', 'logo.png'),
        path.join(process.cwd(), 'images', 'logo.png'),
      ];
      const logoPath = candidateLogoPaths.find(p => {
        try { return fs.existsSync(p); } catch { return false; }
      });
      if (logoPath) {
        doc.image(logoPath, 50, 15, { width: 50, height: 50 });
      }

      // --- Passport (top-right) ---
      const pp = passportPath || formData.passportPath; // use passed path if provided
      if (pp && typeof pp === 'string' && fs.existsSync(pp)) {
        const x = doc.page.width - 120;
        const y = 15;
        doc.rect(x - 5, y - 5, 90, 110).stroke('#1155cc'); // frame
        doc.image(pp, x, y, { width: 80, height: 100, fit: [80, 100] });
      }

      // Title
      doc.fillColor('#ffffff').fontSize(20)
        .text('Ogbomoso College of Nursing Science', 120, 25);

      doc.fillColor('#000000');
      doc.moveDown(6);
      doc.fontSize(16).text('Acknowledgment Slip', { align: 'center' });

      // Data helpers
      const fullName =
        formData.fullname ||
        `${formData.surname || ''} ${formData.othernames || ''}`.trim() ||
        formData.fullName || 'N/A';

      // Details
      doc.moveDown(2);
      doc.fontSize(12)
        .text(`Name: ${fullName}`)
        .text(`Email: ${formData.email || 'N/A'}`)
        .text(`Phone: ${formData.phone || 'N/A'}`)
        .text(`Course: Basic Nursing`)
        .text(`Payment Reference: ${paymentData?.reference || 'N/A'}`)
        .text(`Amount Paid: ₦${paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)
        .text(`Payment Date: ${paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A'}`);

      doc.moveDown(2);
      doc.text('Please bring this slip on the exam day.', { align: 'center' });

      // WhatsApp info (optional)
      doc.moveDown(1);
      doc.fillColor('#1155cc').fontSize(12)
        .text('Join our Aspirant WhatsApp Group:', { align: 'center' });
      doc.fillColor('blue')
        .text('https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t', {
          align: 'center',
          link: 'https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t',
          underline: true,
        });

      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .lineWidth(2)
        .stroke('#1155cc');

      // --- Text-based Seal (bottom-right) ---
      const cx = doc.page.width - 110;
      const cy = doc.page.height - 120;
      doc.save();
      doc.circle(cx, cy, 60).lineWidth(3).stroke('#1155cc');
      doc.fontSize(8).fillColor('#1155cc')
        .text('OGBOMOSO COLLEGE OF\nNURSING SCIENCE', cx - 50, cy - 36, { width: 100, align: 'center' });
      doc.fontSize(12).text('AUTHORISED', cx - 50, cy - 6, { width: 100, align: 'center' });
      doc.restore();

      doc.end();

      writeStream.on('finish', () => resolve(slipPath));
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};
