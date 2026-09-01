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
  "PCB NAME\tARRANGEMENT\tLEFT SIDE\tTOP SIDE\tRIGHT SIDE\tBOTTOM\tCORNER LEFT AND TOP\tCORNER TOP AND RIGHT\tCORNER RIGHT AND BOTTOM\tCORNER BOTTEM AND LEFT\tCENTER",
  "BATTERY BOARD\tMIDDLE\tJ48, J38,\tJ46, J28,\t\tJ50, J49,\t\tCPC3\tCPC2\tCPC1\t",
  "HB\tTOP\tJ1, J11, J9, J12, J2\t\tJ15, J14, J3\tJ7,J10, J13\t\t\t\t\t",
  "LB\tLEFT\tJ10, J11, J6, J7\tJ8,\tJ2, J12, J3, J9, J4\t\t\t\t\t\t",
  "SENS\tRIGHT\tJ2, J14,\tJ8, J19\t\tJ12, J11, J10, J9,\t\t\t\t\t",
  "ESC\tBOTTEM\tJ2, J14,\tJ8\tJ13, J19\tJ12, J11, J10, J9, <br>\t\t\t\t\tESC SH, ESC SV, ESC PV, ESC PH"
].join("\n");
const fullPlacement = parser.normalizeSheetMatrix(parser.parseDelimitedText(fullPlacementText));
const fullBoards = Master.extractBoards(fullPlacement.objects);
const legacyArrangement = parser.normalizeSheetMatrix(parser.parseDelimitedText(fullPlacementText.replace("ARRANGEMENT", "ORANGMENT")));
assert.equal(Master.extractBoards(legacyArrangement.objects).find((board) => board.name === "HB").arrangement, "top", "legacy ORANGMENT headers must remain compatible");
assert.equal(fullBoards.length, 5);
assert.equal(fullBoards.reduce((total, board) => total + board.connectors.length, 0), 51, "edge, corner, and center connector cells must create individual ports");
assert.deepEqual(
  fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.map((connector) => connector.name),
  ["J48", "J38", "J46", "J28", "J50", "J49", "CPC3", "CPC2", "CPC1"]
);
assert.deepEqual(
  fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.slice(-3).map((connector) => connector.side),
  ["corner-top-right", "corner-right-bottom", "corner-bottom-left"]
);
assert.ok(fullBoards.find((board) => board.name === "ESC").connectors.some((connector) => connector.name === "J9"));
assert.deepEqual(
  fullBoards.find((board) => board.name === "ESC").connectors.filter((connector) => connector.side === "center").map((connector) => connector.name),
  ["ESC SH", "ESC SV", "ESC PV", "ESC PH"]
);
assert.deepEqual(
  Object.fromEntries(fullBoards.map((board) => [board.name, board.arrangement])),
  { "BATTERY BOARD": "middle", HB: "top", LB: "left", SENS: "right", ESC: "bottom" }
);
const compassProject = Master.createProject();
Master.addSheet(compassProject, fullPlacement, "compass boards.tsv");
const missingSensJ1Harness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #\tLength inches",
  "W300\t1\tBATTERY J49\t48V\t2\t1\tSENS J1\t48V\t2\t9",
  "\t1\tBATTERY J49\tGND\t1\t1\tSENS J1\tGND\t1\t9"
].join("\n")));
Master.addSheet(compassProject, missingSensJ1Harness, "W300.tsv");
const resolvedCompass = Master.resolveProject(compassProject);
const resolvedW300 = resolvedCompass.harnesses.find((harness) => harness.name === "W300");
const resolvedLeft = resolvedW300.endpoints.find((endpoint) => endpoint.side === "left").match.connector;
const resolvedRight = resolvedW300.endpoints.find((endpoint) => endpoint.side === "right").match.connector;
assert.equal(resolvedLeft.boardName, "BATTERY BOARD", "BATTERY must match the BATTERY BOARD alias");
assert.equal(resolvedLeft.name, "J49");
assert.equal(resolvedRight.boardName, "SENS", "SENS J1 must never fall through to HB J1");
assert.equal(resolvedRight.name, "J1");
assert.equal(resolvedRight.side, "left", "an inferred connector on a RIGHT board should face the routing field");
assert.equal(resolvedRight.inferred, true);
assert.ok(!resolvedCompass.diagnostics.some((item) => item.code === "INFERRED_MASTER_CONNECTOR"), "a connector inferred from an explicit board-and-connector leg name should not create a warning");
assert.equal(Master.projectSummary(compassProject).connectorCount, 52, "the CPCs, ESC center connectors, and inferred SENS J1 must be included in the resolved drawing");

const cpcBranchHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "CPC1-HB\t1\tBATTERY CPC1\tSIG A\t1\t1\tHB J7\tSIG A\t1",
  "CPC1-LB\t1\tBATTERY CPC1\tSIG B\t2\t1\tLB J2\tSIG B\t1",
  "CPC2-ESC\t1\tBATTERY CPC2\tSIG C\t1\t1\tESC J8\tSIG C\t1",
  "CPC3-SENS\t1\tBATTERY CPC3\tSIG D\t1\t1\tSENS J8\tSIG D\t1",
  "CENTER-ESC\t1\tBATTERY CPC2\tSHIELD\t2\t1\tESC SH\tSHIELD\t1"
].join("\n")));
Master.addSheet(compassProject, cpcBranchHarness, "CPC branches.tsv");
const cpcMultiBranchHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "CPC1-MULTI\t1\tBATTERY CPC1\tSIG 1\t1\t1\tHB J7\tSIG 1\t1",
  "\t1\tBATTERY CPC1\tSIG 2\t2\t2\tLB J2\tSIG 2\t1",
  "\t1\tBATTERY CPC1\tSIG 3\t3\t3\tSENS J8\tSIG 3\t1"
].join("\n")));
Master.addSheet(compassProject, cpcMultiBranchHarness, "CPC multi-branch.tsv");
const branchGraph = Master.resolveProject(compassProject);
const cpc1Matches = branchGraph.harnesses
  .filter((harness) => harness.name.startsWith("CPC1-"))
  .map((harness) => harness.endpoints.find((endpoint) => endpoint.side === "left").match.connector);
assert.equal(cpc1Matches.length, 3);
assert.ok(cpc1Matches.every((connector) => connector.key === cpc1Matches[0].key), "multiple cables must branch from the same CPC1 connector instead of duplicating it");
assert.equal(cpc1Matches[0].boardName, "BATTERY BOARD");
const centerEsc = branchGraph.harnesses.find((harness) => harness.name === "CENTER-ESC");
assert.equal(centerEsc.endpoints.find((endpoint) => endpoint.side === "right").match.connector.name, "ESC SH", "ESC SH must match the full center connector name instead of stripping the ESC board prefix twice");
assert.equal(centerEsc.endpoints.find((endpoint) => endpoint.side === "right").match.connector.side, "center");
const multiBranch = branchGraph.harnesses.find((harness) => harness.name === "CPC1-MULTI");
assert.equal(multiBranch.endpoints.length, 4, "one CPC cable must support a shared circular connector branching to three different connectors");
assert.equal(multiBranch.endpoints.filter((endpoint) => endpoint.match.connector?.name === "CPC1").length, 1);
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
const portGeometry = (name) => {
  const match = compassXml.match(new RegExp(`value="[^"]*${name}[^"]*"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)"`));
  assert.ok(match, `${name} connector geometry must exist`);
  return { x: Number(match[1]), y: Number(match[2]) };
};
assert.ok(portGeometry("CPC3").x > middle.x + 300 && portGeometry("CPC3").y < middle.y, "CPC3 must render at the top-right battery corner");
assert.ok(portGeometry("CPC2").x > middle.x + 300 && portGeometry("CPC2").y > middle.y + 150, "CPC2 must render at the bottom-right battery corner");
assert.ok(portGeometry("CPC1").x < middle.x && portGeometry("CPC1").y > middle.y + 150, "CPC1 must render at the bottom-left battery corner");
const esc = geometry("ESC");
for (const name of ["ESC SH", "ESC SV", "ESC PV", "ESC PH"]) {
  const point = portGeometry(name);
  assert.ok(point.x > esc.x && point.x < esc.x + 540 && point.y > esc.y && point.y < esc.y + 260, `${name} must render inside the ESC board`);
}
const centerPoints = ["ESC SH", "ESC SV", "ESC PV", "ESC PH"].map(portGeometry);
assert.equal(new Set(centerPoints.map((point) => point.x)).size, 2, "four CENTER connectors should use two centered columns");
assert.equal(new Set(centerPoints.map((point) => point.y)).size, 2, "four CENTER connectors should use two centered rows");
assert.match(compassXml, /16 POS/, "CPC1, CPC2, and CPC3 must be identified as 16-position circular connectors");
assert.match(compassXml, /CPC1-MULTI/, "a multi-endpoint CPC harness must render through a junction");
assert.doesNotMatch(compassXml, /CPC1-MULTI \| 3 WIRES/, "branch junction labels should contain only the cable name");
const multiJunction = compassXml.match(/id="[^"]*CPC1_MULTI[^"]*_junction" value="CPC1-MULTI"[^>]*vertex="1"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)"/);
assert.ok(multiJunction, "the CPC multi-branch junction must exist");
assert.ok(Number(multiJunction[1]) < middle.x || Number(multiJunction[2]) > middle.y + 240, "the CPC multi-branch junction must remain outside the BATTERY board");
assert.doesNotMatch(compassXml, /value="J1 \*"/, "an inferred connector should render like a normal connector");
assert.match(compassXml, /value="W300"/, "the master route label should contain the cable name");
assert.doesNotMatch(compassXml, /W300 \| 2 WIRES \| 9/, "the master route label should not include conductor count or length");
const w300Edge = compassXml.match(/<mxCell id="cable_W300_[^"]+"[\s\S]*?<Array as="points">([\s\S]*?)<\/Array>/);
assert.ok(w300Edge, "W300 must use explicit routing waypoints");
assert.ok((w300Edge[1].match(/<mxPoint/g) || []).length >= 4, "W300 must leave each connector on a straight stub before turning");

console.log("Master block regression passed.");
