// netlify/functions/sign-upload.js
import crypto from "crypto";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { folder = "admissions/uploads" } = JSON.parse(event.body || "{}") || {};
    const timestamp = Math.floor(Date.now() / 1000);

    // Build params to sign (sorted by key)
    const params = { folder, timestamp };
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(toSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    return {
      statusCode: 200,
      body: JSON.stringify({
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
      }),
    };
  } catch (err) {
    console.error("sign-upload error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
  }
