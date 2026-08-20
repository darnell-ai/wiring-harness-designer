import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreSource = fs.readFileSync(path.join(root, "harness-core.js"), "utf8");
let source = fs.readFileSync(path.join(root, "app.js"), "utf8");
source = source.replace(/\r?\ninit\(\);\r?\n/, "\n");
source += `\nglobalThis.__digiwireTest = {
  parseDelimitedText,
  normalizeSheetMatrix,
  compileSheetHarnessResult,
  buildKiCadHarnessModel,
  buildSheetHarnessSvg,
  buildSheetDrawioXml,
  normalizeHarnessTerminology,
  sheetWireRouteGeometry
};`;

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
const api = context.__digiwireTest;
const core = context.DigiWireCore;

const csv = fs.readFileSync(path.join(root, "examples", "W323-approved.csv"), "utf8");
const sheet = api.normalizeSheetMatrix(api.parseDelimitedText(csv));
assert.equal(sheet.importError, "");
assert.equal(sheet.objects.length, 13);

const result = api.compileSheetHarnessResult(sheet, "W323-approved.csv");
const model = api.buildKiCadHarnessModel(result.sheetHarness);
assert.ok(model, "W323 must use the KiCad harness model");
assert.equal(model.cableName, "W323");
assert.equal(model.leftConnector.positionCount, 13);
assert.match(model.leftConnector.type, /DPBOF13F/);
assert.deepEqual(Array.from(model.leftConnector.unusedPins), ["2", "4", "5", "6", "7", "12", "13"]);
assert.equal(model.wires.length, 6);
assert.deepEqual(
  Array.from(core.findRectangleCollisions(model.wires.map((wire) => ({
    id: `detail-${wire.index}`,
    x: 610,
    y: wire.detailLabelTop,
    width: 380,
    height: 24
  })))),
  [],
  "shared W323 detail-label layout must be collision free"
);
assert.deepEqual(
  Array.from(core.findRectangleCollisions(model.wires.flatMap((wire) => [
    { id: `detail-${wire.index}`, x: 610, y: wire.detailLabelTop, width: 380, height: 24 },
    { id: `lane-${wire.index}`, x: 426, y: wire.y - 4, width: 738, height: 8 }
  ]), 0)).filter(([left, right]) => left.startsWith("detail-") !== right.startsWith("detail-")),
  [],
  "shared W323 detail labels must not cross conductor lanes"
);
assert.deepEqual(
  Array.from(model.wires, (wire) => [
    wire.fromPin,
    wire.name,
    model.rightConnectorGroups.find((group) => group.wires.includes(wire))?.key,
    wire.toPin
  ]),
  [
    ["1", "GND", "LEG:1", "1"],
    ["3", "PWR", "LEG:3", "1"],
    ["8", "ETHERNET TX-", "LEG:2", "1"],
    ["9", "ETHERNET TX+", "LEG:2", "2"],
    ["10", "ETHERNET RX-", "LEG:2", "3"],
    ["11", "ETHERNET RX+", "LEG:2", "4"]
  ]
);

const groupsByLeg = Object.fromEntries(model.rightConnectorGroups.map((group) => [group.key, group]));
assert.equal(groupsByLeg["LEG:1"].positionCount, 1, "GND ferrule housing must remain one position");
assert.equal(groupsByLeg["LEG:3"].positionCount, 1, "PWR ferrule housing must remain one position");
assert.equal(groupsByLeg["LEG:2"].positionCount, 8, "only BOT BLOX Ethernet may be eight positions");
assert.deepEqual(Array.from(groupsByLeg["LEG:2"].unusedPins), ["5", "6", "7", "8"]);

// Reproduce the live failure: a broad connector-size inference contaminated the
// individual ferrule rows with the Ethernet connector's eight-position count.
// Ferrule semantics must remain authoritative for those independent legs.
const contaminatedSheet = structuredClone(sheet);
for (const row of contaminatedSheet.objects.filter((row) => ["GND", "PWR"].includes(row.wireName))) {
  row.rightConnectorPositionCount = 8;
}
const contaminatedResult = api.compileSheetHarnessResult(contaminatedSheet, "W323-contaminated.csv");
const contaminatedModel = api.buildKiCadHarnessModel(contaminatedResult.sheetHarness);
const contaminatedGroups = Object.fromEntries(contaminatedModel.rightConnectorGroups.map((group) => [group.key, group]));
assert.equal(contaminatedGroups["LEG:1"].positionCount, 1, "GND ferrule must ignore a contaminated 8-position inference");
assert.equal(contaminatedGroups["LEG:3"].positionCount, 1, "PWR ferrule must ignore a contaminated 8-position inference");
assert.equal(contaminatedGroups["LEG:2"].positionCount, 8, "Ethernet connector must remain eight positions");

assert.deepEqual(Array.from(model.twistedPairAnalysis.validGroups, (group) => group.id), ["TP1", "TP2"]);
assert.ok(model.wires.every((wire) => wire.y === wire.rightTargetY), "multi-connector lanes must remain straight and compact");
for (const group of model.twistedPairAnalysis.validGroups) {
  for (const wire of group.routes) {
    const geometry = api.sheetWireRouteGeometry(wire, model.twistedPairAnalysis, 426, 1164);
    assert.equal(geometry.points[0][1], geometry.points.at(-1)[1], `${group.id} must not have a large terminal bend`);
    assert.ok(geometry.points.at(-2)[0] - geometry.points[1][0] > 500, `${group.id} weave must span the readable harness width`);
  }
}

assert.equal(api.normalizeHarnessTerminology("FURREL / FERRAELS"), "FERRULE / FERRULES");
const svg = api.buildSheetHarnessSvg(result);
const drawio = api.buildSheetDrawioXml(result);
for (const output of [svg, drawio]) {
  assert.match(output, /TWISTED PAIR TP1/);
  assert.match(output, /TWISTED PAIR TP2/);
  assert.match(output, /FERRULE/);
  assert.doesNotMatch(output, /FURREL|FERRAEL/i);
}
assert.doesNotMatch(svg, /WIRING TABLE|BILL OF MATERIALS|SPECIFICATIONS/);
assert.match(svg, /2 x 1 POS \+ 1 x 8 POS/);
assert.doesNotMatch(drawio, /id="twisted_pair_/, "multi-right drawings must not add overlapping pair-pill labels");

console.log("W323 regression passed: 13-pin SUBCON, 1/1/8 right housings, TP1/TP2, compact straight routes, FERRULE terminology.");
