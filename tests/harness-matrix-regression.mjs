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
source += `\nglobalThis.__matrixApi = { parseDelimitedText, normalizeSheetMatrix, compileSheetHarnessResult, buildSheetHarnessSvg, buildSheetDrawioXml, createSheetRenderPlan };`;
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
assert.match(api.buildSheetHarnessSvg(w320.result), /TWISTED PAIR TP1/);

const w126 = loadFixture("W126.csv");
const w126Right = core.buildEndpointRecords(w126.sheet.objects, "right");
assert.equal(w126Right.length, 2);
assert.equal(w126Right.find((endpoint) => endpoint.id === "LEG:2").positionCount, 8);
assert.match(api.buildSheetDrawioXml(w126.result), /ORANGE \/ WHITE/);

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

console.log("Harness matrix regression passed: W126, W127, W300, W320, malformed imports, endpoints, and collision checks.");
