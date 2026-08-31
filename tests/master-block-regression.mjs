import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const Master = require(path.join(root, "master-diagram.js"));
const context = vm.createContext({
  console,
  document: { querySelector: () => null, querySelectorAll: () => [] },
  window: {}, navigator: {}, TextEncoder, TextDecoder, Blob, URL, setTimeout, clearTimeout
});
vm.runInContext(fs.readFileSync(path.join(root, "harness-core.js"), "utf8"), context, { filename: "harness-core.js" });
vm.runInContext(fs.readFileSync(path.join(root, "master-diagram.js"), "utf8"), context, { filename: "master-diagram.js" });
let appSource = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r?\ninit\(\);\r?\n/, "\n");
appSource += "\nglobalThis.__masterParsing = { parseDelimitedText, normalizeSheetMatrix };";
vm.runInContext(appSource, context, { filename: "app.js" });
const parser = context.__masterParsing;

const placementText = [
  "PCB NAME\tLEFT SIDE\tTOP SIDE\tRIGHT SIDE\tBOTTEM",
  "BATT\t\t\tJ49\t",
  "SENS\tJ1\t\t\t",
  "CTRL\t\t\t\tJ2"
].join("\n");
const placement = parser.normalizeSheetMatrix(parser.parseDelimitedText(placementText));
assert.equal(placement.importError, "");
assert.equal(placement.objects[2].pcbBottom, "J2", "the user's BOTTEM spelling must map to the bottom side");

const harnessText = [
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Position #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W300\t1\tBATT J49\t48V\t1\t1\tSENS J1\t48V\t1",
  "\t1\tBATT J49\tGND\t2\t1\tSENS J1\tGND\t2",
  "\t1\tDNP\t\t3\t1\t\t\t3"
].join("\n");
const harness = parser.normalizeSheetMatrix(parser.parseDelimitedText(harnessText));

const secondHarnessText = [
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Position #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W301\t1\tSENS J1\tDATA\t1\t1\tCTRL J2\tDATA\t1"
].join("\n");
const secondHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText(secondHarnessText));

let project = Master.createProject();
Master.addSheet(project, placement, "boards.tsv");
Master.addSheet(project, harness, "W300.tsv");
Master.addSheet(project, secondHarness, "W301.tsv");
const summary = Master.projectSummary(project);
assert.deepEqual(summary, { boardCount: 3, connectorCount: 3, harnessCount: 2, wireCount: 3, warningCount: 0 });
assert.equal(project.harnesses.find((item) => item.name === "W300").wireCount, 2, "DNP rows must not count as conductors");
assert.equal(project.boards.find((item) => item.name === "CTRL").connectors[0].side, "bottom");
const xml = Master.buildDrawioXml(project);
for (const token of ["BATT", "SENS", "CTRL", "J49", "J1", "J2", "W300", "W301"]) assert.match(xml, new RegExp(token));
assert.doesNotMatch(xml, /UNMATCHED/);

Master.addSheet(project, harness, "W300 replacement.tsv");
assert.equal(project.harnesses.length, 2, "re-importing the same cable must replace it instead of duplicating it");

const unmatched = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Position #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W999\t1\tMISSING J9\tSIG\t1\t1\tSENS J1\tSIG\t1"
].join("\n")));
Master.addSheet(project, unmatched, "W999.tsv");
assert.ok(Master.resolveProject(project).diagnostics.some((item) => item.code === "UNMATCHED_MASTER_CONNECTOR"));

console.log("Master block regression passed.");
