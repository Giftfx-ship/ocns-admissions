const axios = require("axios");

module.exports = async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error("❌ Missing Paystack Secret Key");
      throw new Error("Missing Paystack Secret Key");
    }

    console.log("🔍 Verifying payment with reference:", reference);

    const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    console.log("✅ Paystack API response:", res.data);

    if (!res.data.status) {
      throw new Error(`Paystack verification failed: ${res.data.message}`);
    }

    if (res.data.data.status !== "success") {
      throw new Error(`Payment not successful: ${res.data.data.status}`);
    }

    return {
      reference: res.data.data.reference,
      amount: res.data.data.amount,
      paidAt: res.data.data.paid_at,
      status: res.data.data.status,
    };
  } catch (err) {
    console.error("❌ Error verifying payment:", err.message);
    throw new Error("Unable to verify payment: " + err.message);
  }
};
