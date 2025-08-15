const axios = require("axios");

module.exports = async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error("❌ Missing PAYSTACK_SECRET_KEY in environment variables.");
      throw new Error("Paystack Secret Key missing");
    }

    if (!reference) {
      console.error("❌ No payment reference provided.");
      throw new Error("Missing payment reference");
    }

    console.log("🔍 Verifying payment for reference:", reference);

    const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ Received response from Paystack:", res.data);

    const paymentStatus = res.data?.data?.status;

    if (!res.data.status || paymentStatus !== "success") {
      console.error("❌ Payment verification failed. Status:", paymentStatus);
      throw new Error("Payment verification failed");
    }

    return {
      reference: res.data.data.reference,
      amount: res.data.data.amount,
      paidAt: res.data.data.paid_at,
      status: res.data.data.status,
    };

  } catch (err) {
    // Log the actual error returned by Paystack or Axios
    if (err.response) {
      console.error("❌ Paystack API error:", err.response.data);
    } else {
      console.error("❌ General error verifying payment:", err.message);
    }

    throw new Error("Unable to verify payment");
  }
};
