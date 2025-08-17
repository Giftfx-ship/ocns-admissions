// public/js/form.js
// REQUIRE: <script src="https://js.paystack.co/v1/inline.js"></script> before this file

(function () {
  const PAYSTACK_PUBLIC_KEY = "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27";

  const form = document.getElementById("admissionForm");
  const messageBox = document.getElementById("formMessage");

  // Use name selectors instead of IDs to match your HTML
  const passportInput = form.querySelector('[name="passport"]');
  const olevelInput = form.querySelector('[name="olevel"]');

  function setStatus(msg, isErr = false) {
    console[isErr ? "error" : "log"](msg);
    if (messageBox) {
      messageBox.textContent = msg;
      messageBox.style.color = isErr ? "crimson" : "inherit";
    }
  }

  function disableForm(disabled) {
    Array.from(form.elements).forEach((el) => (el.disabled = disabled));
  }

  async function getSignature(folder) {
    console.log("Requesting upload signature for folder:", folder);
    const res = await fetch("/.netlify/functions/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    if (!res.ok) throw new Error("Failed to get upload signature");
    const data = await res.json();
    console.log("Received signature:", data);
    return data;
  }

  async function signedUpload(file, folder) {
    console.log("Uploading file:", file.name, "to folder:", folder);
    const sig = await getSignature(folder);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", sig.timestamp);
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);

    const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
    const up = await fetch(endpoint, { method: "POST", body: fd });
    const data = await up.json();

    if (!up.ok || !data.secure_url) {
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    console.log("Upload successful:", data.secure_url);
    return data.secure_url;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Form submission started.");

    if (!passportInput.files[0]) {
      setStatus("Please upload your passport photograph.", true);
      return;
    }
    if (!olevelInput.files[0]) {
      setStatus("Please upload your O’Level result.", true);
      return;
    }

    if (typeof PaystackPop === "undefined") {
      setStatus('Paystack script not loaded.', true);
      return;
    }

    try {
      disableForm(true);
      setStatus("Opening Paystack…");

      const fd = new FormData(form);
      const fields = Object.fromEntries(fd.entries());
      console.log("Form fields:", fields);

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: fields.email || "",
        amount: 100 * 100, // kobo
        currency: "NGN",
        metadata: {
          custom_fields: [
            { display_name: "Surname", variable_name: "surname", value: fields.surname || "" },
            { display_name: "Other Names", variable_name: "othernames", value: fields.othernames || "" },
          ],
        },
        callback: async function (response) {
          console.log("Payment callback received:", response);
          try {
            setStatus("Payment successful. Uploading your files…");

            const passportUrl = await signedUpload(passportInput.files[0], "admissions/passports");
            const olevelUrl = await signedUpload(olevelInput.files[0], "admissions/olevels");

            setStatus("Submitting your application…");

            const payload = {
              ...fields,
              paymentReference: response.reference,
              passportUrl,
              olevelUrl,
            };

            console.log("Sending payload to backend:", payload);

            const res = await fetch("/.netlify/functions/sendEmail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
              throw new Error(data.error || `Submission failed (${res.status})`);
            }

            setStatus("🎉 Application submitted! Check your email for confirmation and slip link.");
            form.reset();
          } catch (err) {
            console.error("Error during callback:", err);
            setStatus(`❌ ${err.message || "Submission failed"}`, true);
          } finally {
            disableForm(false);
          }
        },
        onClose: function () {
          setStatus("Payment window closed. Application not submitted.");
          disableForm(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      console.error("Submission error:", err);
      setStatus(`❌ ${err.message || "Something went wrong."}`, true);
      disableForm(false);
    }
  });
})();
