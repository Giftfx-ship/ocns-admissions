// public/js/form.js
(function () {
  const PAYSTACK_PUBLIC_KEY = "pk_live_6ec6474fea7400b8bb4b87e53f6b21a38e14ac27";

  const form = document.getElementById("admissionForm");
  const messageBox = document.getElementById("formMessage");
  const passportInput = document.getElementById("passport");
  const olevelInput = document.getElementById("olevel");

  function setStatus(msg, isErr = false) {
    console.log(isErr ? "ERROR: " + msg : "INFO: " + msg);
    if (messageBox) {
      messageBox.textContent = msg;
      messageBox.style.color = isErr ? "crimson" : "inherit";
    }
  }

  function disableForm(disabled) {
    if (form) {
      Array.from(form.elements).forEach((el) => (el.disabled = disabled));
      console.log("Form disabled:", disabled);
    } else {
      console.log("Form not found!");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Form submit clicked");

    if (!passportInput || !passportInput.files[0]) {
      setStatus("Please upload your passport photograph.", true);
      return;
    }

    if (!olevelInput || !olevelInput.files[0]) {
      setStatus("Please upload your O’Level result.", true);
      return;
    }

    if (typeof PaystackPop === "undefined") {
      setStatus("Paystack script not loaded.", true);
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
        amount: 100 * 100,
        currency: "NGN",
        metadata: {
          custom_fields: [
            { display_name: "Surname", variable_name: "surname", value: fields.surname || "" },
            { display_name: "Other Names", variable_name: "othernames", value: fields.othernames || "" },
          ],
        },
        callback: function (response) {
          console.log("Payment successful!", response);
          setStatus("Payment successful. You can proceed with upload...");
          disableForm(false);
        },
        onClose: function () {
          console.log("Payment window closed");
          setStatus("Payment window closed.", true);
          disableForm(false);
        },
      });

      console.log("Opening Paystack iframe...");
      handler.openIframe();
    } catch (err) {
      console.error("Submit error:", err);
      setStatus(`❌ ${err.message || "Something went wrong."}`, true);
      disableForm(false);
    }
  });
})();
