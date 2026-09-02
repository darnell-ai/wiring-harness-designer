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
appSource += "\nglobalThis.__masterParsing = { parseDelimitedText, normalizeSheetMatrix, createUndoHistory, cloneMasterProject };";
vm.runInContext(appSource, context, { filename: "app.js" });
const parser = context.__masterParsing;

const undoHistory = parser.createUndoHistory(2);
undoHistory.push("first");
undoHistory.push("second");
undoHistory.push("third");
assert.equal(undoHistory.size, 2, "table undo history must respect its bounded session limit");
assert.equal(undoHistory.pop(), "third", "undo must restore the most recent table state first");
assert.equal(undoHistory.pop(), "second", "repeated undo must walk backward through table states");
assert.equal(undoHistory.size, 0);

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

const projectBeforeReplacement = parser.cloneMasterProject(project);
Master.addSheet(project, parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Position #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W300\t1\tBATT J49\tREPLACED\t1\t1\tSENS J1\tREPLACED\t1"
].join("\n"))), "W300 changed.tsv");
assert.equal(project.harnesses.find((item) => item.name === "W300").wireCount, 1);
project = projectBeforeReplacement;
assert.equal(project.harnesses.find((item) => item.name === "W300").wireCount, 2, "restoring an undo snapshot must recover the complete replaced cable record");

const unmatched = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Position #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W999\t1\tMISSING J9\tSIG\t1\t1\tSENS J1\tSIG\t1"
].join("\n")));
Master.addSheet(project, unmatched, "W999.tsv");
assert.ok(Master.resolveProject(project).diagnostics.some((item) => item.code === "UNMATCHED_MASTER_CONNECTOR"));

const fullPlacementText = [
  "PCB NAME\tARRANGEMENT\tLEFT SIDE\tTOP SIDE\tRIGHT SIDE\tBOTTOM\tCORNER LEFT AND TOP\tCORNER TOP AND RIGHT\tCORNER RIGHT AND BOTTOM\tCORNER BOTTEM AND LEFT\tCENTER",
  "BATTERY BOARD\tMIDDLE\tJ48, J38,\tJ46, J28,\t\tJ50, J49,\t\tCPC3\tCPC2\tCPC1\tPOWER POLE",
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
assert.equal(fullBoards.reduce((total, board) => total + board.connectors.length, 0), 52, "edge, corner, and center connector cells must create individual ports");
assert.deepEqual(
  fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.map((connector) => connector.name),
  ["J48", "J38", "J46", "J28", "J50", "J49", "CPC3", "CPC2", "CPC1", "POWER POLE"]
);
assert.deepEqual(
  fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.filter((connector) => connector.name.startsWith("CPC")).map((connector) => connector.side),
  ["corner-top-right", "corner-right-bottom", "corner-bottom-left"]
);
assert.equal(fullBoards.find((board) => board.name === "BATTERY BOARD").connectors.find((connector) => connector.name === "POWER POLE").side, "center");
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
const cpcAliasBoard = Master.extractBoards([{
  pcbName: "CPC ALIAS BOARD",
  pcbTop: "CPC3, CPC 3, CPC-3"
}])[0];
assert.equal(cpcAliasBoard.connectors.length, 1, "CPC spacing and punctuation aliases must not duplicate a board connector");
assert.equal(cpcAliasBoard.connectors[0].name, "CPC3");
Master.addSheet(compassProject, fullPlacement, "compass boards.tsv");
const missingSensJ1Harness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #\tLength inches",
  "W300\t1\tBATTERY J49\t48V\t2\t1\tSENS J1\t48V\t2\t9",
  "\t1\tBATTERY J49\tGND\t1\t1\tSENS J1\tGND\t1\t9"
].join("\n")));
Master.addSheet(compassProject, missingSensJ1Harness, "W300.tsv");
const floatingHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W-FLOAT\t1\tESC J13\tESC GND\t1\t3\tFLOATING\tESC GND\t????????"
].join("\n")));
Master.addSheet(compassProject, floatingHarness, "W-FLOAT.tsv");
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
const resolvedFloating = resolvedCompass.harnesses.find((harness) => harness.name === "W-FLOAT");
assert.equal(resolvedFloating.endpoints.find((endpoint) => endpoint.side === "right").match.floating, true, "FLOATING must resolve as an intentional unterminated endpoint");
assert.ok(!resolvedCompass.diagnostics.some((item) => item.message.includes("W-FLOAT")), "FLOATING must not create an unmatched-connector warning");
assert.equal(Master.projectSummary(compassProject).connectorCount, 53, "the CPCs, Power Pole, ESC center connectors, and inferred SENS J1 must be included in the resolved drawing");

const cpcBranchHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "CPC1-HB\t1\tBATTERY CPC1\tSIG A\t1\t1\tHB J7\tSIG A\t1",
  "CPC1-LB\t1\tBATTERY CPC1\tSIG B\t2\t1\tLB J2\tSIG B\t1",
  "CPC2-ESC\t1\tBATTERY CPC2\tSIG C\t1\t1\tESC J8\tSIG C\t1",
  "CPC3-SENS\t1\tBATTERY CPC3\tSIG D\t1\t1\tSENS J8\tSIG D\t1",
  "CENTER-ESC\t1\tBATTERY CPC2\tSHIELD\t2\t1\tESC SH\tSHIELD\t1",
  "POWER-POLE\t1\tBATTERY POWER POLE\tPWR\t1\t1\tHB J1\tPWR\t1",
  "POWER-POLE-UNQUALIFIED\t1\tPOWERPOLE\tPWR\t1\t1\tLB J2\tPWR\t1"
].join("\n")));
Master.addSheet(compassProject, cpcBranchHarness, "CPC branches.tsv");
const spacedCpcHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W306\t1\tCPC 3\tSwitch G\t1\t1\tHB switch\tSwitch G\t2",
  "\t1\tCPC 3\tCam G\t5\t2\tHB switch\tCam G\t2",
  "\t1\tCPC 3\tESC GND\t9\t3\tFLOATING\tESC GND\t",
  "\t1\tCPC 3\tACT PWR\t10\t7\tESC J13\tACT PWR\t3",
  "\t1\tCPC 3\tACT Tx\t11\t4\tLB J12\tACT Tx\t4",
  "\t1\tCPC 3\tDVL PWR\t13\t5\tSENS J5\tDVL PWR\t7",
  "\t1\tCPC 3\tENET PWR\t15\t6\tLB J2\tENET PWR\t1"
].join("\n")));
Master.addSheet(compassProject, spacedCpcHarness, "W306 spaced CPC.tsv");
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
const spacedCpc = branchGraph.harnesses.find((harness) => harness.name === "W306");
const spacedCpcEndpoint = spacedCpc.endpoints.find((endpoint) => endpoint.side === "left");
assert.equal(spacedCpcEndpoint.match.connector?.name, "CPC3", "CPC 3 must resolve to the existing CPC3 board connector");
assert.equal(spacedCpcEndpoint.match.connector?.boardName, "BATTERY BOARD");
assert.ok(!branchGraph.diagnostics.some((item) => item.message.includes("W306") && item.message.includes("CPC 3")), "spacing in a CPC name must not create an unmatched external endpoint");
assert.equal(spacedCpc.endpoints.find((endpoint) => endpoint.name === "FLOATING")?.match.floating, true, "the W306 floating ESC ground must remain intentionally unterminated");
assert.ok(!branchGraph.diagnostics.some((item) => item.message.includes("W306")), "the submitted W306 endpoint pattern must resolve without unmatched connector warnings");
const centerEsc = branchGraph.harnesses.find((harness) => harness.name === "CENTER-ESC");
assert.equal(centerEsc.endpoints.find((endpoint) => endpoint.side === "right").match.connector.name, "ESC SH", "ESC SH must match the full center connector name instead of stripping the ESC board prefix twice");
assert.equal(centerEsc.endpoints.find((endpoint) => endpoint.side === "right").match.connector.side, "center");
for (const name of ["POWER-POLE", "POWER-POLE-UNQUALIFIED"]) {
  const powerPoleHarness = branchGraph.harnesses.find((harness) => harness.name === name);
  assert.equal(powerPoleHarness.endpoints.find((endpoint) => endpoint.side === "left").match.connector.name, "POWER POLE", `${name} must resolve to the BATTERY Power Pole connector`);
}
const multiBranch = branchGraph.harnesses.find((harness) => harness.name === "CPC1-MULTI");
assert.equal(multiBranch.endpoints.length, 4, "one CPC cable must support a shared circular connector branching to three different connectors");
assert.equal(multiBranch.endpoints.filter((endpoint) => endpoint.match.connector?.name === "CPC1").length, 1);
const w304Harness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W304\t1\tBATTERY CPC 1\tS_Horz A\t1\t1\tESC SH\tTO SH A\t1",
  "\t1\tBATTERY CPC 1\tS_Vert A\t4\t2\tESC SV\tTO SV A\t1",
  "\t1\tBATTERY CPC 1\tP_Vert A\t7\t3\tESC PV\tTO PV A\t1",
  "\t1\tBATTERY CPC 1\tP_Horz A\t10\t4\tESC PH\tTO PH A\t1"
].join("\n")));
Master.addSheet(compassProject, w304Harness, "W304.tsv");
const compassXml = Master.buildDrawioXml(compassProject);
assert.match(compassXml, /fontSize=36;fontStyle=1;labelBackgroundColor=#ffffff/, "master wire labels must render at three times their former 12 px size");
assert.match(compassXml, /value="J49"[^>]+fontSize=(?:1[89]|2[0-8]);/, "connector labels must expand to the largest fitted size without escaping their connector shape");
const optimizedCompassXml = Master.buildDrawioXml(compassProject, { optimizeRoutes: true });
const escCell = compassXml.match(/<mxCell id="([^"]+)" value="ESC"[^>]*>[\s\S]*?<mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
assert.ok(escCell, "ESC board cell must be available for manual placement testing");
const movedEscX = Number(escCell[2]) + 173;
const movedEscY = Number(escCell[3]) - 91;
const editedCompassXml = compassXml.replace(
  new RegExp(`(<mxCell id="${escCell[1]}"[^>]*>[\\s\\S]*?<mxGeometry )x="[^"]+" y="[^"]+"`),
  `$1x="${movedEscX}" y="${movedEscY}"`
);
const geometryOverrides = Master.extractGeometryOverrides(editedCompassXml);
assert.equal(geometryOverrides[escCell[1]].x, movedEscX, "edited Draw.io PCB X position must be captured");
assert.equal(geometryOverrides[escCell[1]].y, movedEscY, "edited Draw.io PCB Y position must be captured");
const optimizedMovedCompassXml = Master.buildDrawioXml(compassProject, { optimizeRoutes: true, geometryOverrides });
assert.match(
  optimizedMovedCompassXml,
  new RegExp(`id="${escCell[1]}"[^>]*>[\\s\\S]*?<mxGeometry x="${movedEscX}" y="${movedEscY}"`),
  "Optimize Routes must preserve the manually moved PCB position"
);
const geometry = (name) => {
  const match = compassXml.match(new RegExp(`value="${name}"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"`));
  assert.ok(match, `${name} board geometry must exist`);
  return { x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) };
};
const middle = geometry("BATTERY BOARD");
const boardRects = ["BATTERY BOARD", "HB", "LB", "SENS", "ESC"].map(geometry);
assert.ok(boardRects.every((rect) => rect.width === rect.height), "every PCB body must remain square");
assert.equal(new Set(boardRects.map((rect) => `${rect.width}x${rect.height}`)).size, 1, "all PCB bodies must use the same dimensions");
assert.equal(middle.width, 560, "standard master PCB bodies must use the spacious 560-by-560 footprint");
const hb = geometry("HB");
const esc = geometry("ESC");
const lb = geometry("LB");
const sens = geometry("SENS");
assert.ok(hb.y < middle.y, "TOP board must render above MIDDLE");
assert.ok(esc.y > middle.y, "BOTTEM board must render below MIDDLE");
assert.ok(lb.x < middle.x, "LEFT board must render left of MIDDLE");
assert.ok(sens.x > middle.x, "RIGHT board must render right of MIDDLE");
assert.ok(middle.y - (hb.y + hb.height) >= 300, "TOP and MIDDLE boards must leave a spacious routing corridor");
assert.ok(esc.y - (middle.y + middle.height) >= 300, "MIDDLE and BOTTEM boards must leave a spacious routing corridor");
assert.ok(middle.x - (lb.x + lb.width) >= 500, "LEFT and MIDDLE boards must leave a spacious routing corridor");
assert.ok(sens.x - (middle.x + middle.width) >= 500, "MIDDLE and RIGHT boards must leave a spacious routing corridor");
const portGeometry = (name) => {
  const match = compassXml.match(new RegExp(`value="[^"]*${name}[^"]*"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)"`));
  assert.ok(match, `${name} connector geometry must exist`);
  return { x: Number(match[1]), y: Number(match[2]) };
};
assert.ok(portGeometry("CPC3").x > middle.x + 300 && portGeometry("CPC3").y < middle.y, "CPC3 must render at the top-right battery corner");
assert.ok(portGeometry("CPC2").x > middle.x + 300 && portGeometry("CPC2").y > middle.y + 150, "CPC2 must render at the bottom-right battery corner");
assert.ok(portGeometry("CPC1").x < middle.x && portGeometry("CPC1").y > middle.y + 150, "CPC1 must render at the bottom-left battery corner");
const powerPole = portGeometry("POWER POLE");
assert.ok(powerPole.x > middle.x && powerPole.x < middle.x + middle.width && powerPole.y > middle.y && powerPole.y < middle.y + middle.height, "POWER POLE must render inside the BATTERY board");
for (const name of ["ESC SH", "ESC SV", "ESC PV", "ESC PH"]) {
  const point = portGeometry(name);
  assert.ok(point.x > esc.x && point.x < esc.x + esc.width && point.y > esc.y && point.y < esc.y + esc.height, `${name} must render inside the ESC board`);
}
const centerPoints = ["ESC SH", "ESC SV", "ESC PV", "ESC PH"].map(portGeometry);
assert.equal(new Set(centerPoints.map((point) => point.x)).size, 4, "four vertically-routed CENTER connectors should use four separate columns");
assert.equal(new Set(centerPoints.map((point) => point.y)).size, 1, "four vertically-routed CENTER connectors should use one centered row");
const w304CenterBranchStarts = Array.from(optimizedCompassXml.matchAll(/<mxCell id="cable_W304_[^"]+_branch_\d+"[^>]*style="[^"]*exitY=0;[^"]*"[\s\S]*?<Array as="points"><mxPoint x="([^"]+)"/g), (match) => Number(match[1]));
assert.equal(w304CenterBranchStarts.length, 4, "W304 must route one optimized branch from each ESC center connector");
assert.equal(new Set(w304CenterBranchStarts).size, 4, "W304 ESC branches must start on four separately spaced vertical tracks");
assert.match(compassXml, /16 POS/, "CPC1, CPC2, and CPC3 must be identified as 16-position circular connectors");
assert.match(compassXml, /POWER POLE[\s\S]*CONNECTOR/, "POWER POLE must be identified as a connector");
assert.match(compassXml, /gradientColor=#111827/, "POWER POLE must use its distinct red-and-black connector profile");
assert.match(compassXml, /id="floating_cap_[^"]+" value="CAP"/, "FLOATING must render as a capped wire tail");
assert.doesNotMatch(compassXml, /UNMATCHED \| FLOATING/, "FLOATING must never render as an unmatched connector");
assert.doesNotMatch(compassXml, /WARNING:[^<]*W-FLOAT/, "FLOATING must never add a diagram warning");
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

const collisionPlacement = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "PCB NAME\tARRANGEMENT\tLEFT SIDE",
  "BATTERY\tMIDDLE\tJ48",
  "LB\tLEFT\tJ1"
].join("\n")));
const collisionHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W302\t1\tBATTERY J48\tSIG\t1\t1\tLB J1\tSIG\t1"
].join("\n")));
const collisionProject = Master.createProject();
Master.addSheet(collisionProject, collisionPlacement, "collision boards.tsv");
Master.addSheet(collisionProject, collisionHarness, "W302.tsv");
const collisionXml = Master.buildDrawioXml(collisionProject, { optimizeRoutes: true });
const collisionEdgeStyle = collisionXml.match(/<mxCell id="cable_W302_[^"]+"[^>]*style="([^"]+)"/);
assert.ok(collisionEdgeStyle, "optimized W302 must render as a constrained cable edge");
assert.match(collisionEdgeStyle[1], /exitX=0;exitY=0\.5/, "W302 must leave BATTERY J48 from its outward-facing left edge");
assert.match(collisionEdgeStyle[1], /entryX=0;entryY=0\.5/, "W302 must enter LB J1 from its outward-facing left edge instead of crossing the LB PCB");
const collisionEdge = collisionXml.match(/<mxCell id="cable_W302_[^"]+"[\s\S]*?<Array as="points">([\s\S]*?)<\/Array>/);
assert.ok(collisionEdge, "the optimized same-side W302 route must use explicit obstacle-aware waypoints");
const collisionPoints = Array.from(collisionEdge[1].matchAll(/<mxPoint x="([^"]+)" y="([^"]+)"/g), (match) => ({ x: Number(match[1]), y: Number(match[2]) }));
assert.ok(collisionPoints.length >= 4, "W302 must turn around the LB board instead of crossing it");
const collisionGeometry = (name) => {
  const match = collisionXml.match(new RegExp(`value="${name}"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"`));
  assert.ok(match, `${name} collision-test board geometry must exist`);
  return { left: Number(match[1]), top: Number(match[2]), right: Number(match[1]) + Number(match[3]), bottom: Number(match[2]) + Number(match[4]) };
};
const collisionBoards = [collisionGeometry("BATTERY"), collisionGeometry("LB")];
const crossesBoard = (first, second, rect) => first.x === second.x
  ? first.x > rect.left && first.x < rect.right && Math.max(Math.min(first.y, second.y), rect.top) < Math.min(Math.max(first.y, second.y), rect.bottom)
  : first.y === second.y && first.y > rect.top && first.y < rect.bottom && Math.max(Math.min(first.x, second.x), rect.left) < Math.min(Math.max(first.x, second.x), rect.right);
collisionPoints.slice(1).forEach((point, index) => {
  assert.ok(collisionBoards.every((rect) => !crossesBoard(collisionPoints[index], point, rect)), "no W302 waypoint segment may pass through a PCB body");
});

const optimizationPlacement = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "PCB NAME\tARRANGEMENT\tLEFT SIDE\tBOTTOM",
  "BATTERY\tMIDDLE\t\tJ60",
  "ESC\tBOTTEM\tJ2\t"
].join("\n")));
const optimizationHarness = parser.normalizeSheetMatrix(parser.parseDelimitedText([
  "Cable Name\tLeft Leg\tLeft Leg Name\tWire Name\tLeft Pin Pos #\tRight Leg\tRight Leg Name\tWire Name\tRight Pin Pos #",
  "W303\t1\tBATTERY J60\tSIG\t1\t1\tESC J2\tSIG\t1"
].join("\n")));
const optimizationProject = Master.createProject();
Master.addSheet(optimizationProject, optimizationPlacement, "optimization boards.tsv");
Master.addSheet(optimizationProject, optimizationHarness, "W303.tsv");
const routePoints = (drawingXml, cableName) => {
  const edge = drawingXml.match(new RegExp(`<mxCell id="cable_${cableName}_[^"]+"[\\s\\S]*?<Array as="points">([\\s\\S]*?)<\\/Array>`));
  assert.ok(edge, `${cableName} must use explicit waypoints`);
  return Array.from(edge[1].matchAll(/<mxPoint x="([^"]+)" y="([^"]+)"/g), (match) => ({ x: Number(match[1]), y: Number(match[2]) }));
};
const routeLength = (points) => points.slice(1).reduce((total, point, index) => total + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);
const standardW303 = routePoints(Master.buildDrawioXml(optimizationProject), "W303");
const optimizedW303Xml = Master.buildDrawioXml(optimizationProject, { optimizeRoutes: true });
const optimizedW303 = routePoints(optimizedW303Xml, "W303");
assert.ok(routeLength(optimizedW303) < routeLength(standardW303), "Optimize routes must shorten the W303-style BATTERY-to-ESC path");
const optimizationBoardRects = ["BATTERY", "ESC"].map((name) => {
  const match = optimizedW303Xml.match(new RegExp(`value="${name}"[^>]*><mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"`));
  assert.ok(match, `${name} optimization-test board geometry must exist`);
  return { left: Number(match[1]), top: Number(match[2]), right: Number(match[1]) + Number(match[3]), bottom: Number(match[2]) + Number(match[4]) };
});
optimizedW303.slice(1).forEach((point, index) => {
  assert.ok(optimizationBoardRects.every((rect) => !crossesBoard(optimizedW303[index], point, rect)), "optimized W303 must remain outside every PCB body");
});

console.log("Master block regression passed.");
