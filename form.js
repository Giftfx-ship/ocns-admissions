// form.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("admissionForm");
  const formMessage = document.getElementById("formMessage");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    if (!formData.get("confirm")) {
      alert("Please confirm that all information is correct.");
      return;
    }

    const email = formData.get("email");
    const amount = 100 * 100; // ₦100 for testing

    formMessage.textContent = "Processing payment...";
    formMessage.style.color = "blue";

    const handler = PaystackPop.setup({
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27",
      email,
      amount,
      currency: "NGN",
      callback: function (response) {
        formMessage.textContent = "Payment successful! Sending your application...";
        formData.append("paymentReference", response.reference);

        fetch("/.netlify/functions/sendEmail", {
          method: "POST",
          body: formData, // multipart/form-data (browser sets boundary)
        })
          .then(async (res) => {
            let data;
            try { data = await res.json(); } catch { throw new Error("Server response not JSON"); }
            if (data.success) {
              formMessage.style.color = "green";
              formMessage.textContent = "Application submitted successfully! Check your email.";
              form.reset();
            } else {
              throw new Error(data.error || "Submission failed.");
            }
          })
          .catch(err => {
            formMessage.style.color = "red";
            formMessage.textContent = "Error submitting form: " + err.message;
          });
      },
      onClose: function () {
        formMessage.style.color = "red";
        formMessage.textContent = "Payment cancelled.";
      }
    });

    handler.openIframe();
  });
});
