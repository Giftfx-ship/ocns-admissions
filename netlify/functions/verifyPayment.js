const axios = require("axios");

module.exports = async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("❌ Missing PAYSTACK_SECRET_KEY environment variable");
      throw new Error("Missing Paystack Secret Key");
    }

    console.log("🔍 Verifying payment with reference:", reference);

    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log("✅ Paystack response:", JSON.stringify(response.data, null, 2));

    const data = response.data;

    if (!data.status) {
      throw new Error(`Paystack verification failed: ${data.message || 'Unknown error'}`);
    }

    if (data.data.status !== "success") {
      throw new Error(`Payment not successful: ${data.data.status}`);
    }

    return {
      reference: data.data.reference,
      amount: data.data.amount,
      paidAt: data.data.paid_at,
      status: data.data.status,
    };
  } catch (err) {
    console.error("❌ Error verifying payment:", err.message || err.toString());
    throw new Error("Unable to verify payment: " + (err.message || "Unknown error"));
  }
};
