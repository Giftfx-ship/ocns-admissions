// form.js
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("admissionForm");
  const formMessage = document.getElementById("formMessage");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.confirm.checked) {
      alert("Please confirm all information is correct.");
      return;
    }

    const email = form.email.value;
    if (!email) {
      alert("Enter your email.");
      return;
    }

    const amount = 100 * 100; // ₦16,000 in kobo

    formMessage.textContent = "Processing payment, please wait...";
    formMessage.style.color = "blue";

    const handler = PaystackPop.setup({
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27", // replace with your Paystack public key
      email: email,
      amount: amount,
      currency: "NGN",
      callback: function (response) {
        formMessage.textContent =
          "✅ Payment successful, sending application...";
        formMessage.style.color = "blue";

        // Collect all form data
        const formData = Object.fromEntries(new FormData(form).entries());
        formData.paymentReference = response.reference;

        // Send data to Netlify function
        fetch("/.netlify/functions/sendEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              formMessage.textContent =
                "🎉 Application submitted successfully!";
              formMessage.style.color = "green";
              form.reset();
            } else {
              throw new Error(data.error || "Unknown error");
            }
          })
          .catch((err) => {
            formMessage.textContent =
              "❌ Error submitting application. Please try again.";
            formMessage.style.color = "red";
            console.error("Submission error:", err);
          });
      },
      onClose: function () {
        formMessage.textContent = "❌ Payment window closed.";
        formMessage.style.color = "red";
      },
    });

    handler.openIframe();
  });
});
