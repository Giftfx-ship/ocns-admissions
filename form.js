// form.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("admissionForm");
  const formMessage = document.getElementById("formMessage");

  // Helper: convert File to base64 string
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // strip prefix
      reader.onerror = (error) => reject(error);
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    if (!formData.get("confirm")) {
      alert("Please confirm that all information is correct.");
      return;
    }

    const email = formData.get("email");
    const amount = 100 * 100; // ₦200 for testing, change to 16000*100 for live

    formMessage.textContent = "Processing payment...";
    formMessage.style.color = "blue";

    const handler = PaystackPop.setup({
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27", // your live key
      email: email,
      amount: amount,
      currency: "NGN",
      callback: async function (response) {
        try {
          formMessage.textContent = "Payment successful! Sending your application...";

          // Convert files to base64
          const slipFile = formData.get("slip");
          const olevelFile = formData.get("olevel");
          const passportFile = formData.get("passport");

          const slipBase64 = slipFile && slipFile.size > 0 ? await toBase64(slipFile) : null;
          const olevelBase64 = olevelFile && olevelFile.size > 0 ? await toBase64(olevelFile) : null;
          const passportBase64 = passportFile && passportFile.size > 0 ? await toBase64(passportFile) : null;

          // Build JSON payload
          const body = {
            fields: Object.fromEntries(formData.entries()),
            paymentData: {
              reference: response.reference,
              amount: amount,
              status: "success",
              paidAt: new Date().toISOString(),
            },
            slipBase64,
            olevelBase64,
            passportBase64,
          };

          const res = await fetch("/.netlify/functions/sendEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const data = await res.json();
          if (data.success) {
            formMessage.style.color = "green";
            formMessage.textContent =
              "Application submitted successfully! Check your email for confirmation.";
            form.reset();
          } else {
            throw new Error(data.error || "Submission failed.");
          }
        } catch (err) {
          formMessage.style.color = "red";
          formMessage.textContent = "Error submitting form: " + err.message;
        }
      },
      onClose: function () {
        formMessage.style.color = "red";
        formMessage.textContent = "Payment cancelled.";
      },
    });

    handler.openIframe();
  });
});
