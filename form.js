const form = document.querySelector("#applicationForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  const payload = {
    surname: formData.get("surname"),
    othernames: formData.get("othernames"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  };

  try {
    const res = await fetch("/.netlify/functions/sendEmail", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert("Application submitted! Check your email for your slip.");
      form.reset();
    } else {
      alert("Failed: " + data.error);
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred.");
  }
});
