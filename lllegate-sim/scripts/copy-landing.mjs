import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "landing", "index.html");
const target = path.join(root, "dist", "landing.html");

if (!fs.existsSync(source)) {
  console.error(`[copy-landing] No existe ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
console.log("landing/index.html -> dist/landing.html");
