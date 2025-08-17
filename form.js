// public/js/form.js
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
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27", // Correct live key
      email: email,
      amount: amount,
      currency: "NGN",
      callback: function (response) {
        formMessage.textContent = "Payment successful! Sending your application...";

        // Prepare FormData for Netlify function
        const formData = new FormData(form);
        formData.append("paymentReference", response.reference);

        fetch("/.netlify/functions/sendEmail", {
          method: "POST",
          body: formData,
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              formMessage.style.color = "green";
              formMessage.innerHTML = `
                Application submitted! ✅<br>
                Check your email for the acknowledgment slip.<br>
                Bring this slip along on exam day.<br>
                Join the aspirant group: 
                <a href="https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM" target="_blank">Click here</a>
              `;
              form.reset();
            } else {
              formMessage.style.color = "red";
              formMessage.textContent = "Error: " + (data.error || "Please contact support.");
            }
          })
          .catch(err => {
            console.error(err);
            formMessage.style.color = "red";
            formMessage.textContent = "Network error. Please try again.";
          });
      },
      onClose: function () {
        formMessage.style.color = "red";
        formMessage.textContent = "Payment cancelled. You can try again.";
      },
    });

    handler.openIframe();
  });
});
