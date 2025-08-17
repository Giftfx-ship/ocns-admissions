// form.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("admissionForm");
  const formMessage = document.getElementById("formMessage");

  // Helper: convert file to base64
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // remove prefix
      reader.onerror = (error) => reject(error);
    });
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    // Confirm checkbox
    if (!formData.get("confirm")) {
      alert("Please confirm that all information is correct.");
      return;
    }

    // Email
    const email = formData.get("email");
    if (!email) {
      alert("Please enter your email.");
      return;
    }

    // Amount in kobo
    const amount = 100 * 100; // ₦16,000

    formMessage.textContent = "Processing payment...";
    formMessage.style.color = "blue";

    // Paystack setup
    const handler = PaystackPop.setup({
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27",
      email: email,
      amount: amount,
      currency: "NGN",
      callback: async function (response) {
        try {
          formMessage.textContent = "Payment successful! Sending your application...";

          // Convert files to base64
          const olevelFile = formData.get("olevel");
          const passportFile = formData.get("passport");

          const olevelBase64 = olevelFile && olevelFile.size > 0 ? await toBase64(olevelFile) : null;
          const passportBase64 = passportFile && passportFile.size > 0 ? await toBase64(passportFile) : null;

          // Build fields object (skip files)
          const fields = {};
          formData.forEach((value, key) => {
            if (value instanceof File) return;
            fields[key] = value;
          });

          // JSON payload
          const body = {
            fields,
            paymentData: {
              reference: response.reference,
              amount: amount,
              status: "success",
              paidAt: new Date().toISOString(),
            },
            olevelBase64,
            passportBase64,
          };

          // Send to Netlify function
          const res = await fetch("/.netlify/functions/sendEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const data = await res.json();
          if (data.success) {
            formMessage.style.color = "green";
            formMessage.textContent = "Application submitted successfully! Check your email for your slip.";
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
