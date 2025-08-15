‎const PDFDocument = require('pdfkit');
‎const fs = require('fs');
‎const path = require('path');
‎
‎module.exports = function generateSlip(formData, paymentData) {
‎  return new Promise((resolve, reject) => {
‎    try {
‎      const slipPath = path.join('/tmp', `acknowledgment_${Date.now()}.pdf`);
‎      const doc = new PDFDocument({ margin: 50 });
‎
‎      const writeStream = fs.createWriteStream(slipPath);
‎      doc.pipe(writeStream);
‎
‎      // Header background
‎      doc.rect(0, 0, doc.page.width, 80).fill('#1155cc');
‎
‎      // Logo (now using single images folder at project root)
‎      const logoPath = path.join(process.cwd(), 'images', 'logo.png');
‎      if (fs.existsSync(logoPath)) {
‎        doc.image(logoPath, 50, 15, { width: 50, height: 50 });
‎      }
‎
‎      // Title
‎      doc.fillColor('#ffffff')
‎        .fontSize(20)
‎        .text('Ogbomoso College of Nursing Science', 120, 25);
‎
‎      doc.fillColor('#000000');
‎      doc.moveDown(5);
‎
‎      doc.fontSize(16).text('Acknowledgment Slip', { align: 'center' });
‎
‎      doc.moveDown(2);
‎      doc.fontSize(12)
‎        .text(`Name: ${formData.fullname || `${formData.surname || ''} ${formData.othernames || ''}`}`)
‎        .text(`Email: ${formData.email || 'N/A'}`)
‎        .text(`Phone: ${formData.phone || 'N/A'}`)
‎        .text(`Course: Basic Nursing`)
‎        .text(`Payment Reference: ${paymentData.reference || 'N/A'}`)
‎        .text(`Amount Paid: ₦${paymentData.amount ? (paymentData.amount / 100).toFixed(2) : '0.00'}`)
‎        .text(`Payment Date: ${paymentData.paidAt ? new Date(paymentData.paidAt).toLocaleString() : 'N/A'}`);
‎
‎      doc.moveDown(2);
‎      doc.text('Please bring this slip on the exam day.', { align: 'center' });
‎
‎      doc.moveDown(1);
‎      doc.fillColor('#1155cc')
‎        .fontSize(12)
‎        .text('Join our Aspirant WhatsApp Group:', { align: 'center' });
‎
‎      doc.fillColor('blue')
‎        .text('https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t', {
‎          align: 'center',
‎          link: 'https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t',
‎          underline: true,
‎        });
‎
‎      // Border
‎      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
‎        .lineWidth(2)
‎        .stroke('#1155cc');
‎
‎      doc.end();
‎
‎      writeStream.on('finish', () => resolve(slipPath));
‎      writeStream.on('error', (err) => reject(err));
‎    } catch (error) {
‎      reject(error);
‎    }
‎  });
‎};
‎
