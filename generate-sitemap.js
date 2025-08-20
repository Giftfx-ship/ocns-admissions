const fs = require("fs");
const pages = [
  { url: "/", priority: 1.0, freq: "weekly" },
  { url: "/about", priority: 0.8, freq: "monthly" },
  { url: "/contact", priority: 0.8, freq: "monthly" },
  { url: "/register", priority: 0.9, freq: "weekly" },
];

const baseUrl = "https://ogbomosocollegeofnursingscience2025.netlify.app";
const today = new Date().toISOString().split("T")[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

pages.forEach((page) => {
  xml += `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
});

xml += `</urlset>`;

fs.writeFileSync("sitemap.xml", xml);
console.log("✅ sitemap.xml generated with today's date:", today);
