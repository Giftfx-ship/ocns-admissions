// public/js/form.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("admissionForm");
  const messageBox = document.getElementById("formMessage");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // ✅ Convert passport to base64 first
    const passportFile = document.querySelector("#passport").files[0];
    if (!passportFile) {
      alert("Please upload your passport photo.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const passportBase64 = reader.result.split(",")[1]; // remove data:image/... prefix

      // ✅ Trigger Paystack
      const handler = PaystackPop.setup({
        key: "pk_live_xxxxxxxxxx", // replace with your public Paystack key
        email: document.getElementById("email").value,
        amount: 16000 * 100, // in kobo
        currency: "NGN",
        callback: function (response) {
          messageBox.innerHTML = "✅ Payment successful. Submitting application...";

          // ✅ Collect form fields
          const formData = new FormData(form);
          const fields = {};
          formData.forEach((value, key) => {
            fields[key] = value;
          });
          fields.passport = passportBase64;
          fields.paymentReference = response.reference;

          // ✅ Send to Netlify function
          fetch("/.netlify/functions/sendEmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                messageBox.innerHTML = "🎉 Application submitted! Check your email.";
                form.reset();
              } else {
                messageBox.innerHTML = "❌ Error: " + data.error;
              }
            })
            .catch((err) => {
              console.error(err);
              messageBox.innerHTML = "❌ Failed to submit application.";
            });
        },
        onClose: function () {
          alert("Payment window closed.");
        },
      });

      handler.openIframe();
    };

    reader.readAsDataURL(passportFile);
  });
});
