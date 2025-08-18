const form = document.querySelector("#applicationForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  const payload = {
    surname: formData.get("surname"),
    othernames: formData.get("othernames"),
    gender: formData.get("gender"),
    marital_status: formData.get("marital_status"),
    dob: formData.get("dob"),
    religion: formData.get("religion"),
    course: formData.get("course"),
    exam_month: formData.get("exam_month"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    state_origin: formData.get("state_origin"),
    state: formData.get("state"),
    lga: formData.get("lga"),
    hometown: formData.get("hometown"),
    address: formData.get("address"),
    sponsor_name: formData.get("sponsor_name"),
    sponsor_relationship: formData.get("sponsor_relationship"),
    sponsor_phone: formData.get("sponsor_phone"),
    sponsor_address: formData.get("sponsor_address"),
    nok_name: formData.get("nok_name"),
    nok_relationship: formData.get("nok_relationship"),
    nok_phone: formData.get("nok_phone"),
    nok_address: formData.get("nok_address"),
    passportUrl: formData.get("passport")?.name || null,
    olevelUrl: formData.get("olevel")?.name || null,
  };

  try {
    const res = await fetch("/.netlify/functions/sendEmail", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      alert("Application submitted successfully! Check your email for your slip.");
      form.reset();
    } else {
      alert("Failed to submit: " + data.error);
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred while submitting the form.");
  }
});
