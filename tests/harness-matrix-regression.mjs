import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
vm.runInContext(fs.readFileSync(path.join(root, "harness-core.js"), "utf8"), context, { filename: "harness-core.js" });
let source = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r?\ninit\(\);\r?\n/, "\n");
source += `\nglobalThis.__matrixApi = { parseDelimitedText, normalizeSheetMatrix, compileSheetHarnessResult, buildKiCadHarnessModel, buildSheetHarnessSvg, buildSheetDrawioXml, createSheetRenderPlan, sheetWireRouteGeometry };`;
vm.runInContext(source, context, { filename: "app.js" });
const api = context.__matrixApi;
const core = context.DigiWireCore;

function loadFixture(name) {
  const csv = fs.readFileSync(path.join(root, "tests", "fixtures", name), "utf8");
  const sheet = api.normalizeSheetMatrix(api.parseDelimitedText(csv));
  assert.equal(sheet.importError, "", `${name} import must succeed`);
  return { sheet, result: api.compileSheetHarnessResult(sheet, name) };
}

const w300 = loadFixture("W300.csv");
assert.equal(w300.sheet.objects.length, 2);
assert.equal(w300.sheet.diagnostics.filter((item) => item.severity === "error").length, 0);
assert.match(api.buildSheetHarnessSvg(w300.result), /W300/);
assert.match(api.buildSheetDrawioXml(w300.result), /BATT J49|SENS J1/);

const w320 = loadFixture("W320.csv");
assert.equal(w320.sheet.objects.filter((row) => !core.isDnpRow(row)).length, 4);
assert.deepEqual(Array.from(core.buildEndpointRecords(w320.sheet.objects, "left")[0].unusedPins), ["1", "2", "3", "4", "5", "6", "7", "12", "13"]);
assert.equal(w320.sheet.diagnostics.filter((item) => item.code === "INVALID_TWISTED_PAIR").length, 0);
assert.equal(api.buildKiCadHarnessModel(w320.result.sheetHarness).twistedPairAnalysis.validGroups.length, 2);
assert.doesNotMatch(api.buildSheetHarnessSvg(w320.result), /TWISTED PAIR/);

const w126 = loadFixture("W126.csv");
const w126Right = core.buildEndpointRecords(w126.sheet.objects, "right");
assert.equal(w126Right.length, 2);
assert.equal(w126Right.find((endpoint) => endpoint.id === "LEG:2").positionCount, 8);
assert.match(api.buildSheetDrawioXml(w126.result), /ORANGE \/ WHITE/);

const botblox = loadFixture("BOTBLOX_ENET.csv");
const botbloxActive = botblox.sheet.objects.filter((row) => !core.isDnpRow(row));
assert.equal(botblox.sheet.objects.length, 16, "the imported table must retain source rows for auditability");
assert.equal(botblox.sheet.objects[0].leftPinPos, "1", "Left Pin Position # must map to leftPinPos");
assert.equal(botbloxActive.length, 8, "Left Leg Name DNP rows must not become conductors");
assert.equal(core.buildEndpointRecords(botblox.sheet.objects, "left")[0].positionCount, 8, "DNP pins 9-16 must not inflate the eight-position PicoBlade");
assert.equal(core.buildEndpointRecords(botblox.sheet.objects, "right")[0].positionCount, 8, "DNP pins 9-16 must not inflate the eight-position RJ45");
assert.ok(botblox.sheet.diagnostics.some((item) => item.code === "PICOBLADE_PIGTAIL_SPEC_MISMATCH"));
const botbloxPartDiagnostic = botblox.sheet.diagnostics.find((item) => item.code === "PIVOT_POWER_NOT_EIGHT_INDEPENDENT_CONTACTS");
assert.equal(botbloxPartDiagnostic?.severity, "warning", "a complete T568B map should remain drawable while flagging the incompatible submitted part number");
assert.equal(botblox.sheet.diagnostics.find((item) => item.code === "T568B_TWISTED_PAIR_MISMATCH"), undefined);
assert.equal(botblox.sheet.diagnostics.filter((item) => item.severity === "error").length, 0);
assert.equal(api.createSheetRenderPlan(botblox.result).kind, "kicad");
const botbloxModel = api.buildKiCadHarnessModel(botblox.result.sheetHarness);
assert.equal(botbloxModel.wires.length, 8);
assert.equal(botbloxModel.twistedPairAnalysis.validGroups.length, 4);
assert.deepEqual(
  Array.from(botbloxModel.wires, (wire) => wire.name),
  ["Orange / White", "Orange", "Green / White", "Green", "Blue", "Blue / White", "Brown / White", "Brown"],
  "complete T568B wire labels must follow the right-side RJ45 names"
);
assert.deepEqual(
  Array.from(botbloxModel.wires, (wire) => wire.colorLabel),
  ["ORANGE / WHITE", "ORANGE", "GREEN / WHITE", "GREEN", "BLUE", "BLUE / WHITE", "BROWN / WHITE", "BROWN"],
  "a complete T568B RJ45 termination must use the right-side wire names as its rendered conductor colors"
);
assert.deepEqual(
  Array.from(botbloxModel.wires, (wire) => wire.leftTerminalColorName),
  ["RED", "ORANGE", "GREEN", "VIOLET", "YELLOW", "BLUE", "BROWN", "BLACK"],
  "left terminal housings must retain the submitted left-side lead colors"
);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.fromPin), ["1", "2", "3", "6", "4", "5", "7", "8"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.toPin), ["1", "2", "3", "6", "4", "5", "7", "8"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.leftName), ["Red", "Orange", "Green", "Purple", "Yellow", "Blue", "brown", "black"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.rightName), ["Orange / White", "Orange", "Green / White", "Green", "Blue", "Blue / White", "Brown / White", "Brown"]);
for (const pair of botbloxModel.twistedPairAnalysis.validGroups) {
  assert.equal(Math.abs(pair.routes[0].y - pair.routes[1].y), 52, `${pair.id} members must occupy adjacent visual lanes`);
}
assert.deepEqual(
  Array.from(botbloxModel.wires, (wire) => [wire.toPin, wire.rightTargetY]),
  [["1", 208], ["2", 260], ["3", 312], ["6", 468], ["4", 364], ["5", 416], ["7", 520], ["8", 572]],
  "right terminal housings must be positioned by RJ45 pin number while pair lanes remain adjacent"
);
assert.deepEqual(
  Array.from(botbloxModel.twistedPairAnalysis.validGroups, (group) => group.id),
  ["TP1", "TP2", "TP3", "TP4"]
);
assert.match(botbloxModel.leftConnector.housingPart, /900-2181120802-ND/);
assert.match(botbloxModel.rightConnector.housingPart, /A116128-ND/);
const botbloxSvg = api.buildSheetHarnessSvg(botblox.result);
const botbloxDrawio = api.buildSheetDrawioXml(botblox.result);
assert.match(botbloxSvg, /class="picoblade-face"/);
assert.match(botbloxSvg, /class="rj45-shell"/);
assert.match(botbloxSvg, /RJ45 T568B 8P8C/);
assert.doesNotMatch(botbloxSvg, /class="pivot-power-face"|TWISTED PAIR/);
assert.doesNotMatch(botbloxSvg, /WIRE 9|WIRE 10|WIRE 11|WIRE 12|WIRE 13|WIRE 14|WIRE 15|WIRE 16/);
assert.doesNotMatch(botbloxSvg, /WIRING TABLE|BILL OF MATERIALS|TEMPLATE NOTES/);
assert.match(botbloxDrawio, /left_picoblade_body/);
assert.match(botbloxDrawio, /right_rj45_shell/);
assert.match(botbloxDrawio, /labelBackgroundColor=#ffffff/);
assert.match(botbloxDrawio, /main_protection_label/);
assert.match(botbloxDrawio, /EXPANDABLE BRAIDED SLEEVING \(EXPANDO\)/);
assert.doesNotMatch(botbloxDrawio, /right_pivot_shell|TWISTED PAIR/);
assert.doesNotMatch(botbloxDrawio, /WIRE 9|WIRE 10|WIRE 11|WIRE 12|WIRE 13|WIRE 14|WIRE 15|WIRE 16/);

// Check the actual exported geometry, not just the model's target coordinates.
const svgRightPins = [...botbloxSvg.matchAll(/<text class="pin-label-compact" x="1238" y="([\d.]+)">(\d+)<\/text>/g)]
  .map((match) => ({ y: Number(match[1]), pin: match[2] })).sort((left, right) => left.y - right.y);
assert.deepEqual(svgRightPins.map((item) => item.pin), ["1", "2", "3", "4", "5", "6", "7", "8"], "SVG pin labels must use numeric RJ45 terminal order");
const svgCavityPins = [...botbloxSvg.matchAll(/<text class="picoblade-pin" x="([\d.]+)" y="([\d.]+)">(\d+)<\/text>/g)];
assert.deepEqual(svgCavityPins.map((match) => match[3]), ["1", "2", "3", "4", "5", "6", "7", "8"], "SVG PicoBlade cavity labels must retain physical order");
assert.ok(svgCavityPins.every((match) => Number(match[2]) === 393), "white cavity labels must be inside the dark cavities");
const drawioCell = (id) => {
  const cell = botbloxDrawio.match(new RegExp(`<mxCell id="${id}"[\\s\\S]*?<\\/mxCell>`))?.[0];
  assert.ok(cell, `Draw.io cell ${id} must exist`);
  return cell;
};
for (const wire of botbloxModel.wires) {
  const geometry = api.sheetWireRouteGeometry(wire, botbloxModel.twistedPairAnalysis, 426, 1164);
  assert.deepEqual(Array.from(geometry.points.at(-1)), [1164, wire.rightTargetY], `wire ${wire.toPin} must reach its own right terminal`);
  assert.ok(drawioCell(`left_term_${wire.index}`).includes(`fillColor=${wire.leftTerminalStroke};`));
  assert.ok(drawioCell(`right_term_${wire.index}`).includes(`y="${wire.rightTargetY - 16}"`));
  assert.ok(drawioCell(`right_pin_num_${wire.index}`).includes(`y="${wire.rightTargetY - 14}"`));
  assert.ok(drawioCell(`wire_${wire.index}`).includes(`x="1164" y="${wire.rightTargetY}" as="targetPoint"`));
  assert.ok(drawioCell(`left_pin_num_${wire.index}`).includes("fontColor=#000000;"), "pin labels outside a black terminal must remain visible");
}
for (const pair of botbloxModel.twistedPairAnalysis.validGroups) {
  const waves = pair.routes.map((wire) => api.sheetWireRouteGeometry(wire, botbloxModel.twistedPairAnalysis, 426, 1164).points.slice(1, 16));
  assert.deepEqual(Array.from(waves[0], (point) => point[0]), Array.from(waves[1], (point) => point[0]), `${pair.id} strands must share one twist pitch before fan-out`);
}
for (let pin = 1; pin <= 8; pin += 1) {
  assert.ok(drawioCell(`left_picoblade_cavity_${pin}`).includes(`value="${pin}"`), "PicoBlade face numbering must stay physical, not pair-lane order");
}
const partialRj45Model = api.buildKiCadHarnessModel(w320.result.sheetHarness);
assert.ok(partialRj45Model.wires.every((wire) => wire.rightTargetY === wire.y), "partial RJ45 harnesses must retain their previous layout");

const header = fs.readFileSync(path.join(root, "tests", "fixtures", "W300.csv"), "utf8").split(/\r?\n/, 1)[0];
const w127Rows = [];
for (let leg = 1; leg <= 3; leg += 1) {
  for (let pin = 1; pin <= 16; pin += 1) {
    const pair = leg === 3 ? `TP${Math.ceil(pin / 2)}` : "";
    const color = ["BLACK", "WHITE", "RED", "GREEN", "ORANGE", "BLUE"][pin % 6];
    w127Rows.push([`W127`, leg, `PB${leg}`, `WIRE ${leg}-${pin}`, pin, "16 PIN CIRCULAR SUBCON", "", "", 18, color, pair, 6, "", "", "", "", leg, `CPC${leg}`, `WIRE ${leg}-${pin}`, pin, "16 PIN CIRCULAR CPC", "", "", "", ""].join(","));
  }
}
const w127Sheet = api.normalizeSheetMatrix(api.parseDelimitedText([header, ...w127Rows].join("\n")));
const w127Result = api.compileSheetHarnessResult(w127Sheet, "W127.csv");
const w127Plan = api.createSheetRenderPlan(w127Result);
assert.equal(w127Sheet.objects.length, 48);
assert.equal(w127Plan.kind, "largeCircular");
assert.match(api.buildSheetHarnessSvg(w127Result), /48 CONDUCTORS/);

const malformed = core.validateRows([
  { wireName: "A", leftLeg: "1", leftPinPos: "1", rightLeg: "1", rightPinPos: "1", twistedPairId: "TPX" },
  { wireName: "B", leftLeg: "1", leftPinPos: "1", rightLeg: "1", rightPinPos: "2" }
]);
assert.ok(malformed.some((item) => item.code === "DUPLICATE_PIN"));
assert.ok(malformed.some((item) => item.code === "INVALID_TWISTED_PAIR"));

assert.deepEqual(
  Array.from(core.findRectangleCollisions([
    { id: "a", x: 0, y: 0, width: 20, height: 20 },
    { id: "b", x: 15, y: 5, width: 20, height: 20 },
    { id: "c", x: 100, y: 100, width: 10, height: 10 }
  ]), (pair) => Array.from(pair)),
  [["a", "b"]]
);

console.log("Harness matrix regression passed: BOTBLOX, W126, W127, W300, W320, DNP filtering, part profiles, malformed imports, endpoints, and collision checks.");
