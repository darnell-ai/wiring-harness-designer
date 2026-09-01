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

const fullPlacementText = [
  "PCB NAME\tORANGMENT\tLEFT SIDE\tTOP SIDE\tRIGHT SIDE\tBOTTOM",
  "BATTERY BOARD\tMIDDLE\tJ48, J38,\tJ46, J28,\t\tJ50, J49,",
  "HB\tTOP\tJ1, J11, J9, J12, J2\t\tJ15, J14, J3\tJ7,J10, J13",
  "LB\tLEFT\tJ10, J11, J6, J7\tJ8,\tJ2, J12, J3, J9, J4\t",
  "SENS\tRIGHT\tJ2, J14,\tJ8, J19\t\tJ12, J11, J10, J9,",
  "ESC\tBOTTEM\tJ2, J14,\tJ8\tJ13, J19\tJ12, J11, J10, J9, <br>"
].join("\n");
const fullPlacement = parser.normalizeSheetMatrix(parser.parseDelimitedText(fullPlacementText));
const fullBoards = Master.extractBoards(fullPlacement.objects);
assert.equal(fullBoards.length, 5);
assert.equal(fullBoards.reduce((total, board) => total + board.connectors.length, 0), 44, "comma-separated connector cells must create individual ports");
assert.deepEqual(
  fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.map((connector) => connector.name),
  ["J48", "J38", "J46", "J28", "J50", "J49"]
);
assert.equal(fullBoards.find((board) => board.name === "ESC").connectors.at(-1).name, "J9");
assert.deepEqual(
  Object.fromEntries(fullBoards.map((board) => [board.name, board.arrangement])),
  { "BATTERY BOARD": "middle", HB: "top", LB: "left", SENS: "right", ESC: "bottom" }
);
const compassProject = Master.createProject();
Master.addSheet(compassProject, fullPlacement, "compass boards.tsv");
const compassXml = Master.buildDrawioXml(compassProject);
const geometry = (name) => {
  const match = compassXml.match(new RegExp(`value="${name}"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)"`));
  assert.ok(match, `${name} board geometry must exist`);
  return { x: Number(match[1]), y: Number(match[2]) };
};
const middle = geometry("BATTERY BOARD");
assert.ok(geometry("HB").y < middle.y, "TOP board must render above MIDDLE");
assert.ok(geometry("ESC").y > middle.y, "BOTTEM board must render below MIDDLE");
assert.ok(geometry("LB").x < middle.x, "LEFT board must render left of MIDDLE");
assert.ok(geometry("SENS").x > middle.x, "RIGHT board must render right of MIDDLE");

console.log("Master block regression passed.");
