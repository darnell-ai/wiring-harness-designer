import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const elements = new Map();
const canvas = new Proxy({}, { get: () => () => {} });
const element = (id) => {
  if (!elements.has(id)) elements.set(id, {
    value: "", textContent: "", innerHTML: "", hidden: true, disabled: false, width: 420, height: 300,
    style: {}, contentWindow: { postMessage() {} }, classList: { add() {}, remove() {} },
    getContext: () => canvas, setAttribute() {}, addEventListener() {}
  });
  return elements.get(id);
};
const storage = new Map();
const context = vm.createContext({
  console, TextEncoder, TextDecoder, Blob, URL, btoa, atob,
  document: { querySelector: element, querySelectorAll: () => [] }, navigator: {},
  window: { localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } },
  setTimeout: () => 1, clearTimeout() {}
});
for (const name of ["harness-core.js", "master-diagram.js", "workspace-session.js", "connector-visuals.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, name), "utf8"), context, { filename: name });
}
let source = fs.readFileSync(path.join(root, "app.js"), "utf8").replace(/\r?\ninit\(\);\r?\n/, "\n");
source += `\nglobalThis.testWorkspace = {
  parseDelimitedText, normalizeSheetMatrix, applyHarnessSheet, applyMasterSheet,
  buildWorkspaceProject, restoreWorkspaceProject, setDrawingMode, queueDrawioDiagram,
  undoLastTableImport, resetApp, persistWorkspaceDraft, restoreWorkspaceDraft,
  compileConfiguredHarnessResult, defaultDesignerConfig,
  getXml: () => drawioSession.xml,
  getState: () => ({ mode: drawingMode, appState, masterProject }),
  getGeometry: () => masterGeometryOverrides
};`;
vm.runInContext(source, context, { filename: "app.js" });
const app = context.testWorkspace;
const Session = context.DigiWireSession;
const Master = context.DigiWireMaster;
const fixture = (name) => app.normalizeSheetMatrix(app.parseDelimitedText(fs.readFileSync(path.join(root, "tests", "fixtures", name), "utf8")));
const boardSheet = app.normalizeSheetMatrix(app.parseDelimitedText(fs.readFileSync(path.join(root, "examples", "master-board-placement-template.tsv"), "utf8")));

// The downloadable original template keeps both Wire Name columns and all 16 pin rows.
const template = app.normalizeSheetMatrix(app.parseDelimitedText(fs.readFileSync(path.join(root, "examples", "harness-template.tsv"), "utf8")));
assert.equal(template.objects.length, 16);
assert.equal(template.objects[0].leftPinPos, "1");
assert.equal(template.objects.at(-1).rightPinPos, "16");
assert.equal(boardSheet.objects.length, 5);
assert.match(boardSheet.objects[0].pcbCenter, /POWER POLE/);
assert.match(boardSheet.objects[4].pcbCenter, /ESC SH/);
const restrictedConfig = app.defaultDesignerConfig();
restrictedConfig.left.family = "customRectangular";
restrictedConfig.left.positions = 1;
const restrictedResult = app.compileConfiguredHarnessResult(fixture("W300.csv"), "W300.csv", restrictedConfig);
assert.ok(restrictedResult.diagnostics.some((item) => item.code === "PIN_EXCEEDS_CAPACITY"), "configuration changes must recalculate validation against the selected connector capacity");

app.applyHarnessSheet(fixture("W325.csv"), "W325.csv");
const editedHarness = app.getXml().replace('id="title"', 'id="title" premiumEdit="manual-color-and-route"');
app.queueDrawioDiagram(editedHarness, "W325.drawio", "W325.pdf");
app.setDrawingMode("master");
app.applyMasterSheet(boardSheet, "boards.tsv");
app.applyMasterSheet(fixture("W300.csv"), "W300.csv");
const generatedMaster = app.getXml();
const boardCell = generatedMaster.match(/<mxCell\b[^>]*id="board_[\s\S]*?<\/mxCell>/)?.[0];
assert.ok(boardCell);
const movedCell = boardCell.replace(/<mxGeometry x="([^"]+)"/, (_, x) => `<mxGeometry x="${Number(x) + 175}"`);
const editedMaster = generatedMaster.replace(boardCell, movedCell);
app.queueDrawioDiagram(editedMaster, "master.drawio", "master.pdf");

app.setDrawingMode("harness");
assert.equal(app.getXml(), editedHarness, "mode switching must preserve exact manual harness edits");
app.setDrawingMode("master");
assert.equal(app.getXml(), editedMaster, "mode switching must preserve exact manual master edits");

app.applyMasterSheet(fixture("W126.csv"), "W126.csv");
const originalGeometry = Master.extractGeometryOverrides(editedMaster);
const updatedGeometry = Master.extractGeometryOverrides(app.getXml());
for (const id of Object.keys(originalGeometry).filter((id) => id.startsWith("board_"))) {
  assert.equal(updatedGeometry[id].x, originalGeometry[id].x, "new cable imports must preserve moved board coordinates");
}
app.undoLastTableImport();
assert.equal(app.getXml(), editedMaster, "master table undo must recover the exact previous route drawing");

const savedJson = Session.serialize(app.buildWorkspaceProject());
app.resetApp();
app.undoLastTableImport();
assert.equal(app.getXml(), editedMaster, "Clear must be recoverable through Undo table");
app.setDrawingMode("harness");
app.applyHarnessSheet(fixture("W300.csv"), "W300.csv");
app.undoLastTableImport();
assert.equal(app.getXml(), editedHarness, "harness undo must restore the manual route and color edits");

app.restoreWorkspaceProject(Session.parse(savedJson));
assert.equal(app.getState().mode, "master");
assert.equal(app.getXml(), editedMaster, "project files must restore the exact master drawing");
app.setDrawingMode("harness");
assert.equal(app.getXml(), editedHarness, "project files must include the inactive harness workspace too");
assert.equal(app.getState().appState.sheet.objects.length, 10);
app.persistWorkspaceDraft();
app.resetApp();
app.restoreWorkspaceDraft();
assert.equal(app.getXml(), editedHarness, "browser draft recovery must preserve the complete edited drawing");
for (const invalid of ['{}', '{"format":"DIGIWIRE_WORKSPACE","formatVersion":99}', 'bad json']) {
  assert.throws(() => Session.parse(invalid));
}
assert.equal(app.getXml(), editedHarness, "invalid project files must leave the current drawing untouched");

console.log("Workspace regression passed: original templates, exact mode switching, import geometry, table/clear undo, project files, draft recovery, and invalid files.");
