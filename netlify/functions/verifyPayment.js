const axios = require("axios");

module.exports = async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error("Paystack Secret Key missing!");
      throw new Error("Paystack Secret Key missing");
    }

    console.log(`Verifying payment for reference: ${reference}`);

    const res = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    console.log("Paystack response data:", res.data);

    if (!res.data.status) {
      console.error("Paystack verification status false");
      throw new Error("Payment verification failed: status false");
    }

    if (res.data.data.status !== "success") {
      console.error(`Payment status is not success: ${res.data.data.status}`);
      throw new Error(`Payment not successful: ${res.data.data.status}`);
    }

    return {
      reference: res.data.data.reference,
      amount: res.data.data.amount,
      paidAt: res.data.data.paid_at,
      status: res.data.data.status,
    };
  } catch (err) {
    console.error("Error verifying payment:", err.message);
    throw new Error("Unable to verify payment: " + err.message);
  }
};
