import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "src/index.css");
const outDir = path.join(root, "src/styles/partials");
const text = fs.readFileSync(srcPath, "utf8");
const lines = text.split(/\r?\n/);
const headerLines = 7;
const header = lines.slice(0, headerLines).join("\n") + "\n";
const rest = lines.slice(headerLines);
const chunkSize = 820;
fs.mkdirSync(outDir, { recursive: true });
const imports = [];
for (let i = 0; i < rest.length; i += chunkSize) {
  const chunk = rest.slice(i, i + chunkSize).join("\n") + "\n";
  const n = String(Math.floor(i / chunkSize) + 1).padStart(2, "0");
  const name = `part-${n}.css`;
  fs.writeFileSync(path.join(outDir, name), chunk, "utf8");
  imports.push(`@import "./partials/${name}";`);
}
const newIndex = `${header}${imports.join("\n")}\n`;
fs.writeFileSync(path.join(root, "src/index.css"), newIndex, "utf8");
console.log("Wrote", imports.length, "partials to", outDir);
