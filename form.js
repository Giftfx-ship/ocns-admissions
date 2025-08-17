document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("admissionForm");
  const formMessage = document.getElementById("formMessage");

  // Convert file to base64
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (err) => reject(err);
    });

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

    const amount = 100 * 100; // ₦100 for testing

    formMessage.textContent = "Opening payment popup...";
    formMessage.style.color = "blue";

    // Paystack popup
    const handler = PaystackPop.setup({
      key: "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27",
      email: email,
      amount: amount,
      currency: "NGN",
      callback: async function (response) {
        try {
          formMessage.textContent = "Payment successful! Sending your application...";
          
          // Convert files
          const olevelFile = form.olevel.files[0];
          const passportFile = form.passport.files[0];

          const olevelBase64 = olevelFile ? await toBase64(olevelFile) : null;
          const passportBase64 = passportFile ? await toBase64(passportFile) : null;

          // Collect form fields
          const fields = {};
          Array.from(form.elements).forEach(el => {
            if (el.name && el.type !== "file" && el.type !== "checkbox") {
              fields[el.name] = el.value;
            }
          });

          // Build payload
          const body = {
            fields,
            paymentData: {
              reference: response.reference,
              amount,
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
            formMessage.innerHTML = `
              Application submitted! ✅<br>
              Check your email for the acknowledgment slip.<br>
              Join the aspirant group: 
              <a href="https://chat.whatsapp.com/IjrU9Cd9e76EosYBVppftM?mode=ac_t" target="_blank">Click here</a>
            `;
            form.reset();
          } else {
            throw new Error(data.error || "Submission failed.");
          }
        } catch (err) {
          formMessage.style.color = "red";
          formMessage.textContent = "Error submitting application: " + err.message;
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
