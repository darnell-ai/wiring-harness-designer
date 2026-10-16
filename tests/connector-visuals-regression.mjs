import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Visuals = require("../connector-visuals.js");
const context = vm.createContext({ console, TextEncoder, TextDecoder, Blob, URL, setTimeout, clearTimeout,
  document: { querySelector: () => null, querySelectorAll: () => [] }, window: {}, navigator: {} });
for (const name of ["harness-core.js", "master-diagram.js", "connector-visuals.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, name), "utf8"), context, { filename: name });
}
let source = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r?\ninit\(\);\r?\n/, "\n");
source += "\nglobalThis.visualTest = { parseDelimitedText, normalizeSheetMatrix, compileSheetHarnessResult, buildSheetDrawioXml, buildSheetHarnessSvg, CONNECTOR_EDITOR_LIBRARY };";
vm.runInContext(source, context, { filename: "app.js" });
const api = context.visualTest;

for (const key of Object.keys(api.CONNECTOR_EDITOR_LIBRARY)) {
  assert.ok(Visuals.profiles[key], `${key} must have a preview`);
  const profile = Visuals.resolve([], "left", key, 10);
  const svg = Visuals.svg(profile);
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /undefined|NaN|<script/);
  assert.ok(Visuals.dataUri(profile).startsWith("data:image/svg+xml,"));
  if (profile.photo) assert.ok(fs.statSync(path.join(root, "assets", "connectors", profile.photo)).size > 1000);
}

const white = Visuals.resolve([{ leftLegName: "A POWER POLE", leftHousingPart: "2243-1327G7-BK-ND", color: "BLACK" }], "left");
assert.equal(white.key, "powerpole1545");
assert.equal(white.positions, 1);
assert.equal(white.housingColor, "#f1f2ef", "white housing must not inherit black wire color");
assert.equal(white.photo, "powerpole-white.jpg");
const yellow = Visuals.resolve([{ leftHousingPart: "2243-1327G16-BK-ND" }], "left");
assert.equal(yellow.housingColor, "#f0cd28");
const circular = Visuals.resolve([{ rightLegName: "10 PIN MEDIUM CURCUILAR CONNECTOR", rightPinPos: "8" }], "right");
assert.equal(circular.key, "customCircular");
assert.equal(circular.positions, 10, "declared unused contacts must remain visible");
for (let count = 1; count <= 64; count++) {
  const svg = Visuals.svg({ ...circular, positions: count });
  assert.equal((svg.match(/fill="#cbb781"/g) || []).length, count, `circular contact count ${count}`);
}

const fixture = fs.readFileSync(path.join(root, "tests", "fixtures", "W325.csv"), "utf8");
const sheet = api.normalizeSheetMatrix(api.parseDelimitedText(fixture));
const result = api.compileSheetHarnessResult(sheet, "W325.csv");
const xml = api.buildSheetDrawioXml(result);
const cell = (id) => xml.match(new RegExp(`<mxCell id="${id}"[\\s\\S]*?<\\/mxCell>`))?.[0] || "";
for (let index = 1; index <= 8; index++) {
  assert.doesNotMatch(cell(`sheet_wire_${index}`), /value="[^"]+"/, "wire geometry must not have an inline opaque label");
  const edgeY = Number(cell(`sheet_wire_${index}`).match(/<mxPoint x="1340" y="([^"]+)" as="targetPoint"/)?.[1]);
  const label = cell(`sheet_wire_label_${index}`);
  const geometry = label.match(/<mxGeometry x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/);
  assert.ok(geometry, `wire ${index} label geometry exists`);
  assert.ok(Number(geometry[1]) + Number(geometry[2]) <= edgeY - 7, "labels must finish above the conductor");
  assert.match(label, /labelBackgroundColor=none/);
}
for (let index = 1; index <= 4; index++) assert.match(cell(`left_endpoint_visual_${index}`), /shape=image;.*image=data:image\/svg\+xml,/);
assert.match(cell("right_endpoint_visual_1"), /shape=image/);
assert.match(cell("right_endpoint_detail_1"), /10 POSITION/);
const cableIdY = Number(cell("shared_cable_id_label").match(/<mxGeometry x="[^"]+" y="([^"]+)"/)?.[1]);
assert.ok(cableIdY > 630, "the cable ID must be outside the conductor bundle");
const svg = api.buildSheetHarnessSvg(result);
assert.equal((svg.match(/<image /g) || []).length, 5);
assert.match(svg, /FAMILY ILLUSTRATION/);
if (process.argv[2]) {
  fs.mkdirSync(process.argv[2], { recursive: true });
  fs.writeFileSync(path.join(process.argv[2], "W325-visuals.svg"), svg);
  fs.writeFileSync(path.join(process.argv[2], "W325-visuals.drawio"), xml);
}

const credits = JSON.parse(fs.readFileSync(path.join(root, "assets", "connectors", "sources.json"), "utf8"));
for (const image of credits.sources) {
  const bytes = fs.readFileSync(path.join(root, "assets", "connectors", image.file));
  assert.ok(bytes.length > 1000);
  assert.ok(bytes[0] === 0xff || bytes.subarray(0, 4).toString() === "RIFF", `${image.file} must be an image, not an HTML error`);
}
console.log("Connector visuals regression passed: all selectable families, local photo assets, Powerpole housing colors, 1–64 circular contacts, W325 illustrated endpoints and label clearance.");
