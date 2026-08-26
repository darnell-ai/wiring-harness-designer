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
source += `\nglobalThis.__matrixApi = { parseDelimitedText, normalizeSheetMatrix, compileSheetHarnessResult, buildKiCadHarnessModel, buildSheetHarnessSvg, buildSheetDrawioXml, createSheetRenderPlan };`;
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
assert.equal(botblox.sheet.diagnostics.find((item) => item.code === "T568B_TWISTED_PAIR_MISMATCH")?.severity, "warning");
assert.equal(botblox.sheet.diagnostics.filter((item) => item.severity === "error").length, 0);
assert.equal(api.createSheetRenderPlan(botblox.result).kind, "kicad");
const botbloxModel = api.buildKiCadHarnessModel(botblox.result.sheetHarness);
assert.equal(botbloxModel.wires.length, 8);
assert.equal(botbloxModel.twistedPairAnalysis.validGroups.length, 4);
assert.deepEqual(
  Array.from(botbloxModel.wires, (wire) => wire.colorLabel),
  ["RED", "ORANGE", "GREEN", "YELLOW", "BLUE", "VIOLET", "BROWN", "BLACK"],
  "the physical Color column must control the rendered conductor colors"
);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.fromPin), ["1", "2", "3", "4", "5", "6", "7", "8"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.toPin), ["1", "2", "3", "4", "5", "6", "7", "8"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.leftName), ["Red", "Orange", "Green", "Yellow", "Blue", "Purple", "brown", "black"]);
assert.deepEqual(Array.from(botbloxModel.wires, (wire) => wire.rightName), ["Orange / White", "Orange", "Green / White", "Blue", "Blue / White", "Green", "Brown / White", "Brown"]);
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
assert.doesNotMatch(botbloxDrawio, /right_pivot_shell|TWISTED PAIR/);
assert.doesNotMatch(botbloxDrawio, /WIRE 9|WIRE 10|WIRE 11|WIRE 12|WIRE 13|WIRE 14|WIRE 15|WIRE 16/);

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
