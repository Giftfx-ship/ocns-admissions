// generateSlip.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

function generateRegNumber() {
  const prefix = "OGCONS";
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${randomNum}`;
}

module.exports = function generateSlip(formData, paymentData) {
  return new Promise((resolve, reject) => {
    try {
      const slipPath = path.join(os.tmpdir(), `acknowledgment_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(slipPath);
      doc.pipe(writeStream);

      // ---------- HEADER ----------
      const logoPath = path.join(__dirname, 'images', 'logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 50, 20, { width: 50, height: 50 });
        } catch (err) {
          console.log('Error loading logo:', err);
        }
      }

      doc.fillColor('#000000')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text('OGBOMOSO COLLEGE OF NURSING SCIENCE', { align: 'center' });

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold')
        .fontSize(14)
        .text('ACKNOWLEDGMENT SLIP', { align: 'center' });

      doc.moveDown(2);

      // ---------- DETAILS ----------
      const regNumber = generateRegNumber();
      const fullName =
        formData.fullname ||
        formData.fullName ||
        `${formData.surname || ''} ${formData.othernames || ''}`.trim() ||
        'N/A';

      doc.fontSize(12)
        .font('Helvetica-Bold').text('Registration Number: ', { continued: true })
        .font('Helvetica').text(regNumber)

        .font('Helvetica-Bold').text('Name: ', { continued: true })
        .font('Helvetica').text(fullName)

        .font('Helvetica-Bold').text('Email: ', { continued: true })
        .font('Helvetica').text(formData.email || 'N/A')

        .font('Helvetica-Bold').text('Phone: ', { continued: true })
        .font('Helvetica').text(formData.phone || 'N/A')

        .font('Helvetica-Bold').text('Course: ', { continued: true })
        .font('Helvetica').text('Basic Nursing')

        .font('Helvetica-Bold').text('Payment Reference: ', { continued: true })
        .font('Helvetica').text(paymentData?.reference || 'N/A')

        .font('Helvetica-Bold').text('Amount Paid: ', { continued: true })
        .font('Helvetica').text(`₦${paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)

        .font('Helvetica-Bold').text('Payment Date: ', { continued: true })
        .font('Helvetica').text(paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A');

      doc.moveDown(1);

      // ---------- APPLICATION STATUS ----------
      doc.font('Helvetica-Bold')
        .text('Application Status: ', { continued: true })
        .font('Helvetica')
        .text('COMPLETED');

      doc.moveDown(2);

      // ---------- INSTRUCTIONS ----------
      doc.font('Helvetica-Bold').text('INSTRUCTIONS', { underline: true });
      doc.font('Helvetica')
        .text('1. You must possess at least five (5) credits at not more than two sittings in the SSCE/NECO or its equivalent.')
        .text('2. If admitted, you are expected to make your own accommodation arrangements and pay all the levies prescribed by the College.')
        .text('3. Ensure you print this slip coloured with APPLICATION STATUS showing COMPLETED.')
        .text('4. Examination date will be communicated to you via the email you provided during registration.');

      // ---------- SEAL ----------
      const cx = doc.page.width - 110;
      const cy = doc.page.height - 120;
      doc.save();
      doc.circle(cx, cy, 60).lineWidth(3).stroke('#1155cc');
      doc.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1155cc')
        .text('OGBOMOSO COLLEGE OF\nNURSING SCIENCE', cx - 50, cy - 36, {
          width: 100,
          align: 'center',
        });
      doc.fontSize(12).text('AUTHORISED', cx - 50, cy - 6, { width: 100, align: 'center' });
      doc.restore();

      // ---------- END ----------
      doc.end();

      writeStream.on('finish', () => resolve(slipPath));
      writeStream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};
