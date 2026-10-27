import fs from "node:fs";

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("landing/index.html", "dist/landing.html");
console.log("landing/index.html -> dist/landing.html");
