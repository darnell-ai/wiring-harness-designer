import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreSource = fs.readFileSync(path.join(root, "harness-core.js"), "utf8");
let source = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r?\ninit\(\);\r?\n/, "\n");
source += `\nglobalThis.__digiwireGenerate = { parseDelimitedText, normalizeSheetMatrix, compileSheetHarnessResult, buildSheetHarnessSvg, buildSheetDrawioXml };`;
const context = vm.createContext({
  console,
  document: { querySelector: () => null },
  window: {},
  navigator: {},
  TextEncoder,
  TextDecoder,
  Blob,
  URL,
  setTimeout,
  clearTimeout
});
vm.runInContext(coreSource, context, { filename: "harness-core.js" });
vm.runInContext(source, context, { filename: "app.js" });
const api = context.__digiwireGenerate;
const csv = fs.readFileSync(path.join(root, "examples", "W323-approved.csv"), "utf8");
const sheet = api.normalizeSheetMatrix(api.parseDelimitedText(csv));
if (sheet.importError) throw new Error(sheet.importError);
const result = api.compileSheetHarnessResult(sheet, "W323-approved.csv");
const outputDir = path.join(root, "examples", "generated");
fs.mkdirSync(outputDir, { recursive: true });
const cleanGeneratedText = (value) => `${String(value).split(/\r?\n/).map((line) => line.trimEnd()).join("\n").trim()}\n`;
fs.writeFileSync(path.join(outputDir, "W323-approved.svg"), cleanGeneratedText(api.buildSheetHarnessSvg(result)));
fs.writeFileSync(path.join(outputDir, "W323-approved.drawio"), cleanGeneratedText(api.buildSheetDrawioXml(result)));
console.log(`Generated W323 assets in ${outputDir}`);
