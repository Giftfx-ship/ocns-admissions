// generateSlip.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');

function generateRegNumber() {
  const prefix = "OGCONS"; // Ogbomoso College of Nursing
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2); // last 2 digits of year
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `${prefix}${year}${randomNum}`;
}

module.exports = function generateSlip(formData, paymentData) {
  return new Promise((resolve, reject) => {
    try {
      const slipPath = path.join(os.tmpdir(), `acknowledgment_${Date.now()}.pdf`);
      const doc = new PDFDocument({ margin: 50 });

      const writeStream = fs.createWriteStream(slipPath);
      doc.pipe(writeStream);

      // Header bar
      doc.rect(0, 0, doc.page.width, 80).fill('#1155cc');

      // Logo
      const logoPath = path.join(__dirname, 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 15, { width: 50, height: 50 });
      }

      // Title
      doc.fillColor('#ffffff').fontSize(20)
        .text('Ogbomoso College of Nursing Science', 120, 25);

      doc.fillColor('#000000');
      doc.moveDown(6);
      doc.fontSize(14).text('OGBOMOSO COLLEGE OF NURSING SCIENCE ACKNOLEDGEMENT SLIP COMPLETED', { align: 'center' });

      // Generate reg number
      const regNumber = generateRegNumber();

      const fullName =
        formData.fullname ||
        `${formData.surname || ''} ${formData.othernames || ''}`.trim() ||
        formData.fullName || 'N/A';

      // Details
      doc.moveDown(2);
      doc.fontSize(12)
        .text(`Registration Number: ${regNumber}`)
        
        .text(`Name: ${fullName}`)
        
        .text(`Email: ${formData.email || 'N/A'}`)
        
        .text(`Phone: ${formData.phone || 'N/A'}`)
        
        .text(`Course: Basic Nursing`)
        
        .text(`Payment Reference: ${paymentData?.reference || 'N/A'}`)
        
        .text(`Amount Paid: ₦${paymentData?.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)
        
        .text(`Payment Date: ${paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A'}`);

      doc.moveDown(4);
      doc.text( 'INSTRUCTIONS' )
      doc.text( '1.You must possess at least four (4) credits at not more than two sittings in the SSCE/NECO or its equivalent.' )
      doc.text( '2.If admitted, you are expected to make your own accommodation arrangements and pay all the levies prescribed by the College.' )
      doc.text( '3.Ensure you print this copy(page) coloured with the APPLICATION STATUS SHOWING COMPLETED.' )
      doc.text( '4.Examination date will be communicated to you via the email you provided during registration.' )

      // Text-based Seal (bottom-right)
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
