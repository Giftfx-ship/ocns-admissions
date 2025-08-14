const axios = require("axios");

module.exports = async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack Secret Key missing");

    const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!res.data.status || res.data.data.status !== "success") {
      throw new Error("Payment verification failed");
    }

    return {
      reference: res.data.data.reference,
      amount: res.data.data.amount,
      paidAt: res.data.data.paid_at,
      status: res.data.data.status,
    };
  } catch (err) {
    throw new Error("Unable to verify payment");
  }
};