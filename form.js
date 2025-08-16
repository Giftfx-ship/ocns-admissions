const express = require('express');
const router = express.Router();
const fetch = require('node-fetch'); // For Paystack verification if needed
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../netlify/functions/sendEmail'); // Adjust path if needed

// Example route: POST /submit
router.post('/submit', async (req, res) => {
  try {
    const formData = req.body;

    // Optional: Verify Paystack payment (skip if testing)
    // const paystackSecret = process.env.PAYSTACK_SECRET;
    // const reference = formData.paymentReference;
    // const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    //   headers: { Authorization: `Bearer ${paystackSecret}` },
    // });
    // const payData = await verifyRes.json();
    // if (!payData.status) throw new Error('Payment verification failed');

    // Simulate payment data if testing without Paystack
    const paymentData = {
      reference: formData.paymentReference || `TEST-${Date.now()}`,
      amount: formData.amount || 15000,
      paidAt: new Date(),
      status: 'success',
    };

    // Prepare a fake event object like Netlify function receives
    const event = {
      httpMethod: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: req.body, // if using file uploads, you may need to handle base64
      isBase64Encoded: false,
    };

    // Call sendEmail function
    const emailResult = await sendEmail.handler(event);
    const resultBody = JSON.parse(emailResult.body);

    if (resultBody.success) {
      res.status(200).json({ message: 'Application submitted successfully! Check your email.' });
    } else {
      res.status(500).json({ message: 'Submission failed', error: resultBody.error });
    }
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
