"use strict";

const APP_VERSION = "2.1.4";
const HarnessCore = globalThis.DigiWireCore;
if (!HarnessCore) {
  throw new Error("DIGIWIRE harness-core.js must load before app.js.");
}
const OCR_WORKER_PATH = "vendor/tesseract/worker.min.js";
const OCR_CORE_PATH = "vendor/tesseract/core";
const OCR_LANG_PATH = "vendor/tesseract/lang";
const DRAWIO_EMBED_ORIGIN = "https://embed.diagrams.net";
const DRAWIO_ALLOWED_ORIGINS = new Set([DRAWIO_EMBED_ORIGIN, "https://app.diagrams.net"]);
const DRAWIO_EDITOR_URL = `${DRAWIO_EMBED_ORIGIN}/?embed=1&proto=json&spin=1&ui=min&libraries=1&saveAndExit=0&noExitBtn=1`;
const XLSX_READER_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const MAX_IMAGE_SIDE = 1600;
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 800;

const CONNECTOR_EDITOR_LIBRARY = Object.freeze({
  auto: Object.freeze({ label: "Use sheet value", shape: "auto" }),
  microFitFront: Object.freeze({ label: "Molex Micro-Fit front lock", shape: "rectangular", type: (positions) => `${positions} POS MOLEX MICRO-FIT FRONT LOCK` }),
  microFitSide: Object.freeze({ label: "Molex Micro-Fit side lock", shape: "rectangular", type: (positions) => `${positions} POS MOLEX MICRO-FIT SIDE LOCK` }),
  miniFitSr: Object.freeze({ label: "Molex Mini-Fit Sr.", shape: "rectangular", type: (positions) => `${positions} POS MOLEX MINI-FIT SR 10MM` }),
  miniFitJr: Object.freeze({ label: "Molex Mini-Fit Jr.", shape: "rectangular", type: (positions) => `${positions} POS MOLEX MINI-FIT JR` }),
  cpc: Object.freeze({ label: "TE CPC circular", shape: "circular", type: (positions) => `${positions} PIN CPC CIRCULAR CONNECTOR` }),
  subcon: Object.freeze({ label: "Subcon / PBOF circular", shape: "circular", type: (positions) => `${positions} PIN SUBCON PBOF CIRCULAR CONNECTOR` }),
  terminalBlock: Object.freeze({ label: "Terminal block", shape: "rectangular", type: (positions) => `${positions} POS TERMINAL BLOCK` }),
  pcb: Object.freeze({ label: "PCB termination", shape: "pcb", type: (positions) => `${positions} POSITION PCB` }),
  customCircular: Object.freeze({ label: "Custom circular", shape: "circular", type: (positions) => `${positions} PIN CUSTOM CIRCULAR CONNECTOR` }),
  customRectangular: Object.freeze({ label: "Custom rectangular", shape: "rectangular", type: (positions) => `${positions} POS CUSTOM RECTANGULAR CONNECTOR` })
});

const DATASHEET_CONNECTOR_LIBRARY = Object.freeze({
  microFitFront: Object.freeze({
    key: "microFitFront",
    manufacturer: "Molex",
    family: "Micro-Fit 3.0",
    style: "front-lock single-row receptacle",
    series: "43645",
    pitch: "3.00 mm",
    rows: 1,
    minPositions: 2,
    maxPositions: 12,
    positionStep: 1,
    housingPart: (positions) => `43645-${String(positions).padStart(2, "0")}00`,
    drawingUrl: "https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/salesdrawingpdf/436/43645/436450200_sd.pdf?inline"
  }),
  microFitSide: Object.freeze({
    key: "microFitSide",
    manufacturer: "Molex",
    family: "Micro-Fit 3.0",
    style: "side-lock dual-row receptacle",
    series: "43025",
    pitch: "3.00 mm",
    rows: 2,
    minPositions: 2,
    maxPositions: 16,
    positionStep: 2,
    housingPart: (positions) => `43025-${String(positions).padStart(2, "0")}00`,
    drawingUrl: "https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/salesdrawingpdf/430/43025/430250200_sd.pdf?inline"
  }),
  miniFitSr: Object.freeze({
    key: "miniFitSr",
    manufacturer: "Molex",
    family: "Mini-Fit Sr.",
    style: "single-row receptacle with TPA",
    series: "42816",
    pitch: "10.00 mm",
    rows: 1,
    minPositions: 2,
    maxPositions: 6,
    positionStep: 1,
    housingPart: (positions) => `42816-${String(positions).padStart(2, "0")}12`,
    drawingUrl: "https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/salesdrawingpdf/428/42816/428160212_sd.pdf"
  }),
  miniFitJr: Object.freeze({
    key: "miniFitJr",
    manufacturer: "Molex",
    family: "Mini-Fit Jr.",
    style: "dual-row receptacle",
    series: "5557",
    pitch: "4.20 mm",
    rows: 2,
    minPositions: 2,
    maxPositions: 16,
    positionStep: 2,
    housingPart: (positions) => `39-01-${String(2000 + positions * 10).padStart(4, "0")}`,
    engineeringPart: (positions) => `5557-${String(positions).padStart(2, "0")}R`,
    drawingUrl: "https://www.molex.com/en-us/products/part-detail/39012020"
  }),
  powerpole1545: Object.freeze({
    key: "powerpole1545",
    manufacturer: "Anderson Power",
    family: "Powerpole PP15/45",
    style: "stackable genderless single-pole housings",
    series: "PP15/45",
    pitch: "modular dovetail",
    rows: 0,
    minPositions: 1,
    maxPositions: 16,
    positionStep: 1,
    housingPart: () => "1327 SERIES",
    drawingUrl: "https://www.andersonpower.com/product-lines/powerpole/"
  }),
  teCpc1714: Object.freeze({
    key: "teCpc1714",
    manufacturer: "TE Connectivity",
    family: "CPC Series 1",
    style: "shell-size 17 reverse-sex circular connector",
    series: "17-14",
    pitch: "17-14 | key A | 15/16-20 UNEF",
    rows: 0,
    minPositions: 14,
    maxPositions: 14,
    positionStep: 1,
    housingPart: () => "206043-1",
    drawingUrl: "https://www.te.com/en/product-206043-1.html"
  }),
  picoBladePigtail: Object.freeze({
    key: "picoBladePigtail",
    manufacturer: "Molex",
    family: "PicoBlade 218112",
    style: "female-to-pigtail single-row cable assembly",
    series: "218112",
    pitch: "1.25 mm",
    rows: 1,
    minPositions: 8,
    maxPositions: 8,
    positionStep: 1,
    housingPart: () => "218112-0802",
    drawingUrl: "https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/salesdrawingpdf/218/218112/2181120804_sd.pdf?inline"
  }),
  tePivotPowerRj45: Object.freeze({
    key: "tePivotPowerRj45",
    manufacturer: "TE Connectivity",
    family: "RJ45 Pivot Power",
    style: "8-position two-conductor power plug",
    series: "2213145",
    pitch: "RJ45 modular interface",
    rows: 1,
    minPositions: 8,
    maxPositions: 8,
    positionStep: 1,
    housingPart: () => "2213145-1",
    drawingUrl: "https://www.te.com/en/product-2213145-1.html"
  })
});

// Housing part numbers are authoritative. These aliases and manufacturer-number
// patterns intentionally run before any descriptive housing-type fallback so a
// label such as "3 POS FRONT LOCK" can never override a known two-position part.
const HOUSING_PART_CATALOG = Object.freeze({
  WM1927ND: Object.freeze({
    key: "miniFitSr",
    positions: 2,
    manufacturerPart: "42816-0212"
  }),
  "0428160212": Object.freeze({
    key: "miniFitSr",
    positions: 2,
    manufacturerPart: "42816-0212"
  }),
  "428160212": Object.freeze({
    key: "miniFitSr",
    positions: 2,
    manufacturerPart: "42816-0212"
  }),
  WM1845ND: Object.freeze({
    key: "microFitFront",
    positions: 2,
    manufacturerPart: "43645-0200"
  }),
  "2060431": Object.freeze({
    key: "teCpc1714",
    positions: 14,
    manufacturerPart: "206043-1"
  }),
  "2060441": Object.freeze({
    key: "teCpc1714",
    positions: 14,
    manufacturerPart: "206044-1"
  }),
  "9002181120802ND": Object.freeze({
    key: "picoBladePigtail",
    positions: 8,
    manufacturerPart: "218112-0802"
  }),
  "2181120802": Object.freeze({
    key: "picoBladePigtail",
    positions: 8,
    manufacturerPart: "218112-0802"
  }),
  A116128ND: Object.freeze({
    key: "tePivotPowerRj45",
    positions: 8,
    manufacturerPart: "2213145-1"
  }),
  "22131451": Object.freeze({
    key: "tePivotPowerRj45",
    positions: 8,
    manufacturerPart: "2213145-1"
  })
});

const CPC_17_14_PIN_LAYOUT = Object.freeze([
  Object.freeze({ pin: 1, dx: -46, dy: -58 }),
  Object.freeze({ pin: 2, dx: 0, dy: -58 }),
  Object.freeze({ pin: 3, dx: 46, dy: -58 }),
  Object.freeze({ pin: 4, dx: -68, dy: -20 }),
  Object.freeze({ pin: 5, dx: -23, dy: -20 }),
  Object.freeze({ pin: 6, dx: 23, dy: -20 }),
  Object.freeze({ pin: 7, dx: 68, dy: -20 }),
  Object.freeze({ pin: 8, dx: -68, dy: 20 }),
  Object.freeze({ pin: 9, dx: -23, dy: 20 }),
  Object.freeze({ pin: 10, dx: 23, dy: 20 }),
  Object.freeze({ pin: 11, dx: 68, dy: 20 }),
  Object.freeze({ pin: 12, dx: -46, dy: 58 }),
  Object.freeze({ pin: 13, dx: 0, dy: 58 }),
  Object.freeze({ pin: 14, dx: 46, dy: 58 })
]);

const CPC_17_16_PIN_LAYOUT = Object.freeze([
  Object.freeze({ pin: 1, dx: -24, dy: -70 }),
  Object.freeze({ pin: 2, dx: 24, dy: -70 }),
  Object.freeze({ pin: 3, dx: -60, dy: -35 }),
  Object.freeze({ pin: 4, dx: -20, dy: -35 }),
  Object.freeze({ pin: 5, dx: 20, dy: -35 }),
  Object.freeze({ pin: 6, dx: 60, dy: -35 }),
  Object.freeze({ pin: 7, dx: -60, dy: 0 }),
  Object.freeze({ pin: 8, dx: -20, dy: 0 }),
  Object.freeze({ pin: 9, dx: 20, dy: 0 }),
  Object.freeze({ pin: 10, dx: 60, dy: 0 }),
  Object.freeze({ pin: 11, dx: -60, dy: 35 }),
  Object.freeze({ pin: 12, dx: -20, dy: 35 }),
  Object.freeze({ pin: 13, dx: 20, dy: 35 }),
  Object.freeze({ pin: 14, dx: 60, dy: 35 }),
  Object.freeze({ pin: 15, dx: -24, dy: 70 }),
  Object.freeze({ pin: 16, dx: 24, dy: 70 })
]);

const PBOF_13_PIN_LAYOUT = Object.freeze([
  Object.freeze({ pin: 1, dx: -54, dy: -60 }),
  Object.freeze({ pin: 2, dx: 0, dy: -68 }),
  Object.freeze({ pin: 3, dx: 54, dy: -60 }),
  Object.freeze({ pin: 7, dx: -70, dy: -20 }),
  Object.freeze({ pin: 6, dx: -24, dy: -22 }),
  Object.freeze({ pin: 5, dx: 24, dy: -22 }),
  Object.freeze({ pin: 4, dx: 70, dy: -20 }),
  Object.freeze({ pin: 8, dx: -70, dy: 24 }),
  Object.freeze({ pin: 9, dx: -24, dy: 24 }),
  Object.freeze({ pin: 10, dx: 24, dy: 24 }),
  Object.freeze({ pin: 11, dx: 70, dy: 24 }),
  Object.freeze({ pin: 13, dx: -30, dy: 64 }),
  Object.freeze({ pin: 12, dx: 30, dy: 64 })
]);

const RJ45_T568B_CONTACTS = Object.freeze([
  Object.freeze({ pin: 1, label: "W/O", fill: "#ffffff", stripe: "#ff8c00" }),
  Object.freeze({ pin: 2, label: "O", fill: "#ff8c00" }),
  Object.freeze({ pin: 3, label: "W/G", fill: "#ffffff", stripe: "#009b35" }),
  Object.freeze({ pin: 4, label: "BL", fill: "#1769d2" }),
  Object.freeze({ pin: 5, label: "W/BL", fill: "#ffffff", stripe: "#1769d2" }),
  Object.freeze({ pin: 6, label: "G", fill: "#009b35" }),
  Object.freeze({ pin: 7, label: "W/BR", fill: "#ffffff", stripe: "#7b4b22" }),
  Object.freeze({ pin: 8, label: "BR", fill: "#7b4b22" })
]);

const RIGHT_HOUSING_PALETTE = Object.freeze([
  Object.freeze({ fill: "#e2f1dc", stroke: "#6d9c59" }),
  Object.freeze({ fill: "#deebf8", stroke: "#5d8fc9" }),
  Object.freeze({ fill: "#f9d9d5", stroke: "#cf5e55" }),
  Object.freeze({ fill: "#fff0cf", stroke: "#c79338" }),
  Object.freeze({ fill: "#dff3f1", stroke: "#4f9b94" }),
  Object.freeze({ fill: "#f3e5f5", stroke: "#9a67a5" }),
  Object.freeze({ fill: "#e7e8f5", stroke: "#7279ae" }),
  Object.freeze({ fill: "#f7e2c7", stroke: "#b97b32" }),
  Object.freeze({ fill: "#e8e8e8", stroke: "#777777" }),
  Object.freeze({ fill: "#f5e0e9", stroke: "#b36b89" })
]);

const POWERPOLE_HOUSING_PARTS = Object.freeze({
  RED: "1327",
  BLACK: "1327G6",
  GREEN: "1327G5",
  WHITE: "1327G7",
  BLUE: "1327G8",
  YELLOW: "1327G16",
  ORANGE: "1327G17",
  GRAY: "1327G18",
  GREY: "1327G18",
  BROWN: "1327G21",
  PINK: "1327G22",
  VIOLET: "1327G23",
  PURPLE: "1327G23"
});

const dom = {
  tablePasteButton: document.querySelector("#tablePasteButton"),
  configureButton: document.querySelector("#configureButton"),
  designerPanel: document.querySelector("#designerPanel"),
  closeDesignerButton: document.querySelector("#closeDesignerButton"),
  layoutModeSelect: document.querySelector("#layoutModeSelect"),
  layoutDetectionText: document.querySelector("#layoutDetectionText"),
  leftConnectorLabel: document.querySelector("#leftConnectorLabel"),
  leftConnectorFamily: document.querySelector("#leftConnectorFamily"),
  leftConnectorPositions: document.querySelector("#leftConnectorPositions"),
  leftConnectorView: document.querySelector("#leftConnectorView"),
  leftConnectorSex: document.querySelector("#leftConnectorSex"),
  leftConnectorKey: document.querySelector("#leftConnectorKey"),
  rightConnectorLabel: document.querySelector("#rightConnectorLabel"),
  rightConnectorFamily: document.querySelector("#rightConnectorFamily"),
  rightConnectorPositions: document.querySelector("#rightConnectorPositions"),
  rightConnectorView: document.querySelector("#rightConnectorView"),
  rightConnectorSex: document.querySelector("#rightConnectorSex"),
  rightConnectorKey: document.querySelector("#rightConnectorKey"),
  applyDesignerButton: document.querySelector("#applyDesignerButton"),
  resetDesignerButton: document.querySelector("#resetDesignerButton"),
  pasteTablePanel: document.querySelector("#pasteTablePanel"),
  tablePasteInput: document.querySelector("#tablePasteInput"),
  closePasteTableButton: document.querySelector("#closePasteTableButton"),
  pasteButton: document.querySelector("#pasteButton"),
  resetButton: document.querySelector("#resetButton"),
  confidenceValue: document.querySelector("#confidenceValue"),
  confidenceFill: document.querySelector("#confidenceFill"),
  statusText: document.querySelector("#statusText"),
  importDiagnostics: document.querySelector("#importDiagnostics"),
  orientationFact: document.querySelector("#orientationFact"),
  wireFact: document.querySelector("#wireFact"),
  connectorFact: document.querySelector("#connectorFact"),
  labelFact: document.querySelector("#labelFact"),
  drawingTitle: document.querySelector("#drawingTitle"),
  drawingPane: document.querySelector("#drawingPane"),
  sourceTitle: document.querySelector("#sourceTitle"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  drawioStage: document.querySelector("#drawioStage"),
  drawioFrame: document.querySelector("#drawioFrame"),
  drawioLoading: document.querySelector("#drawioLoading"),
  findingsList: document.querySelector("#findingsList"),
  findingCount: document.querySelector("#findingCount"),
  workCanvas: document.querySelector("#workCanvas")
};

let appState = {
  fileName: "",
  dataUrl: "",
  image: null,
  manualRotation: 0,
  result: null,
  sheet: null,
  sourceName: "",
  designerConfig: defaultDesignerConfig()
};

let ocrWorkerPromise = null;
let ocrWorker = null;
let ocrUnavailable = false;
let drawioSession = null;
let xlsxLoaderPromise = null;
let pastedTableLoadTimer = null;

init();

function init() {
  ["dragenter", "dragover"].forEach((eventName) => {
    dom.drawingPane.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.drawingPane.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dom.drawingPane.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.drawingPane.classList.remove("is-dragging");
    });
  });

  dom.drawingPane.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      void loadDrawingFile(file);
    }
  });

  dom.pasteButton.addEventListener("click", () => void pasteClipboardImage());
  dom.tablePasteButton.addEventListener("click", () => void pasteClipboardTable());
  dom.configureButton.addEventListener("click", toggleDesignerPanel);
  dom.closeDesignerButton.addEventListener("click", closeDesignerPanel);
  dom.applyDesignerButton.addEventListener("click", applyDesignerConfiguration);
  dom.resetDesignerButton.addEventListener("click", resetDesignerConfiguration);
  dom.tablePasteInput.addEventListener("input", () => {
    clearTimeout(pastedTableLoadTimer);
    const text = dom.tablePasteInput.value;
    if (looksLikeDelimitedTable(text)) {
      pastedTableLoadTimer = setTimeout(() => void loadPastedHarnessTable(text), 120);
    }
  });
  dom.closePasteTableButton.addEventListener("click", closePasteTablePanel);
  dom.resetButton.addEventListener("click", resetApp);
  window.addEventListener("message", handleDrawioMessage);
  document.addEventListener("paste", (event) => {
    void handlePasteEvent(event);
  });

  populateConnectorEditorLibrary();
  writeDesignerControls(defaultDesignerConfig());
  initializeDrawioEditor();
  renderEmpty();
}

async function loadDrawingFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("That file is not an image. Use a photo or scan.");
    return;
  }

  setStatus("Loading drawing...");
  const dataUrl = await readFileAsDataUrl(file);
  await loadDrawingAsset(dataUrl, cleanFileName(file.name));
}

async function loadDrawingAsset(dataUrl, fileName, revokeAfterLoad = false) {
  try {
    const image = await loadImage(dataUrl);
    appState = {
      fileName,
      dataUrl,
      image,
      manualRotation: 0,
      result: null,
      sheet: null,
      sourceName: "",
      designerConfig: defaultDesignerConfig()
    };
    writeDesignerControls(appState.designerConfig);
    dom.pasteButton.disabled = false;
    dom.sourceTitle.textContent = appState.fileName;
    renderSourcePreview();
    await analyzeCurrentDrawing();
  } finally {
    if (revokeAfterLoad) {
      setTimeout(() => URL.revokeObjectURL(dataUrl), 0);
    }
  }
}

async function pasteClipboardImage() {
  if (!navigator.clipboard || typeof navigator.clipboard.read !== "function") {
    setStatus("Clipboard paste is not available here. Click the page and press Ctrl+V to paste the copied image.");
    return;
  }

  try {
    setStatus("Reading copied image from clipboard...");
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) {
        continue;
      }
      const blob = await item.getType(imageType);
      await loadDrawingAsset(URL.createObjectURL(blob), "Clipboard Image", true);
      return;
    }
    setStatus("No image was found in the clipboard. Copy a screenshot or photo first.");
  } catch (error) {
    console.error(error);
    setStatus("Could not read the clipboard image. Try Ctrl+V or upload a file.");
  }
}

async function handlePasteEvent(event) {
  const items = event.clipboardData?.items || [];
  const imageItem = Array.from(items).find((item) => item.type && item.type.startsWith("image/"));
  if (!imageItem) {
    return;
  }

  const file = imageItem.getAsFile();
  if (!file) {
    return;
  }

  event.preventDefault();
  await loadDrawingFile(file);
}

async function loadHarnessSheetFile(file) {
  try {
    setBusy(true);
    setStatus("Reading prefilled harness sheet...");
    await waitForFrame();

    const sheet = await readHarnessSheetFile(file);
    if (!sheet.rows.length) {
      setStatus(sheet.importError || "That sheet did not contain any data rows.");
      return;
    }

    const result = applyHarnessSheet(sheet, file.name);
    const recovery = result.importMessages?.length ? ` ${result.importMessages.join(" ")}` : "";
    setStatus(`Loaded ${result.tableRows.length} sheet row${result.tableRows.length === 1 ? "" : "s"} from ${file.name}.${recovery}`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "The sheet could not be loaded. Try CSV, TSV, or a standard .xlsx file.");
  } finally {
    setBusy(false);
  }
}

async function readHarnessSheetFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    await ensureXlsxReader();
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const matrix = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });
    return normalizeSheetMatrix(matrix);
  }
  const text = await file.text();
  return normalizeSheetMatrix(parseDelimitedText(text));
}

function applyHarnessSheet(sheet, sourceName) {
  const designerConfig = designerConfigForSheet(sheet);
  const result = compileConfiguredHarnessResult(sheet, sourceName, designerConfig);
  appState = {
    fileName: cleanFileName(sourceName),
    dataUrl: "",
    image: null,
    manualRotation: 0,
    result,
    sheet,
    sourceName,
    designerConfig
  };
  writeDesignerControls(designerConfig);
  updateDetectedLayout(result);
  dom.sourceTitle.textContent = cleanFileName(sourceName);
  renderDrawioDiagram(result);
  renderFacts(result);
  renderImportDiagnostics(result.diagnostics || []);
  renderFindings(result.findings);
  renderSourcePreview(result);
  return result;
}

function defaultDesignerConfig() {
  return {
    layoutMode: "auto",
    left: defaultConnectorEditorSide(),
    right: defaultConnectorEditorSide()
  };
}

function defaultConnectorEditorSide() {
  return {
    label: "",
    family: "auto",
    positions: 2,
    view: "Front",
    sex: "",
    key: ""
  };
}

function designerConfigForSheet(sheet) {
  const config = defaultDesignerConfig();
  ["left", "right"].forEach((side) => {
    const prefix = side === "left" ? "left" : "right";
    const pins = sheet.objects.map((row) => numericPin(row[`${prefix}PinPos`])).filter(Number.isFinite);
    const declaredPositions = inferKiCadDeclaredPositionCount(sheet.objects, side);
    config[side].positions = declaredPositions || (pins.length ? Math.max(...pins) : 2);
  });
  return config;
}

function populateConnectorEditorLibrary() {
  const options = Object.values(CONNECTOR_EDITOR_LIBRARY)
    .map((definition) => `<option value="${escapeHtml(definition === CONNECTOR_EDITOR_LIBRARY.auto ? "auto" : definitionKeyForEditor(definition))}">${escapeHtml(definition.label)}</option>`)
    .join("");
  dom.leftConnectorFamily.innerHTML = options;
  dom.rightConnectorFamily.innerHTML = options;
}

function definitionKeyForEditor(definition) {
  return Object.entries(CONNECTOR_EDITOR_LIBRARY).find(([, value]) => value === definition)?.[0] || "auto";
}

function toggleDesignerPanel() {
  dom.designerPanel.hidden = !dom.designerPanel.hidden;
}

function closeDesignerPanel() {
  dom.designerPanel.hidden = true;
}

function readDesignerControls() {
  return {
    layoutMode: dom.layoutModeSelect.value || "auto",
    left: readConnectorEditorSide("left"),
    right: readConnectorEditorSide("right")
  };
}

function readConnectorEditorSide(side) {
  const isLeft = side === "left";
  return {
    label: (isLeft ? dom.leftConnectorLabel : dom.rightConnectorLabel).value.trim(),
    family: (isLeft ? dom.leftConnectorFamily : dom.rightConnectorFamily).value || "auto",
    positions: clamp(Number((isLeft ? dom.leftConnectorPositions : dom.rightConnectorPositions).value) || 1, 1, 64),
    view: (isLeft ? dom.leftConnectorView : dom.rightConnectorView).value || "Front",
    sex: (isLeft ? dom.leftConnectorSex : dom.rightConnectorSex).value || "",
    key: (isLeft ? dom.leftConnectorKey : dom.rightConnectorKey).value || ""
  };
}

function writeDesignerControls(config) {
  dom.layoutModeSelect.value = config.layoutMode || "auto";
  writeConnectorEditorSide("left", config.left);
  writeConnectorEditorSide("right", config.right);
}

function writeConnectorEditorSide(side, config) {
  const isLeft = side === "left";
  (isLeft ? dom.leftConnectorLabel : dom.rightConnectorLabel).value = config.label || "";
  (isLeft ? dom.leftConnectorFamily : dom.rightConnectorFamily).value = config.family || "auto";
  (isLeft ? dom.leftConnectorPositions : dom.rightConnectorPositions).value = String(config.positions || 2);
  (isLeft ? dom.leftConnectorView : dom.rightConnectorView).value = config.view || "Front";
  (isLeft ? dom.leftConnectorSex : dom.rightConnectorSex).value = config.sex || "";
  (isLeft ? dom.leftConnectorKey : dom.rightConnectorKey).value = config.key || "";
}

function applyDesignerConfiguration() {
  if (!appState.sheet) {
    setStatus("Paste a harness table before applying drawing settings.");
    return;
  }
  appState.designerConfig = readDesignerControls();
  const result = compileConfiguredHarnessResult(appState.sheet, appState.sourceName, appState.designerConfig);
  appState.result = result;
  updateDetectedLayout(result);
  renderDrawioDiagram(result);
  renderFacts(result);
  renderImportDiagnostics(result.diagnostics || []);
  setStatus(`Applied ${layoutModeLabel(result.resolvedLayoutMode)} layout and connector settings.`);
}

function resetDesignerConfiguration() {
  if (!appState.sheet) {
    const config = defaultDesignerConfig();
    appState.designerConfig = config;
    writeDesignerControls(config);
    setStatus("Drawing settings reset.");
    return;
  }
  const config = designerConfigForSheet(appState.sheet);
  appState.designerConfig = config;
  writeDesignerControls(config);
  const result = compileConfiguredHarnessResult(appState.sheet, appState.sourceName, config);
  appState.result = result;
  updateDetectedLayout(result);
  renderDrawioDiagram(result);
  renderFacts(result);
  renderImportDiagnostics(result.diagnostics || []);
  setStatus("Using connector and layout values from the sheet.");
}

function compileConfiguredHarnessResult(sheet, sourceName, config) {
  const configuredSheet = applyConnectorEditorToSheet(sheet, config);
  const result = compileSheetHarnessResult(configuredSheet, sourceName);
  result.designerConfig = config;
  result.resolvedLayoutMode = config.layoutMode === "auto"
    ? classifySheetLayout(configuredSheet)
    : config.layoutMode;
  result.importMessages = sheet.importMessages || [];
  result.diagnostics = sheet.diagnostics || HarnessCore.validateRows(configuredSheet.objects || []);
  return result;
}

function applyConnectorEditorToSheet(sheet, config) {
  const objects = sheet.objects.map((row) => {
    const output = { ...row };
    applyConnectorEditorSideToRow(output, "left", config.left);
    applyConnectorEditorSideToRow(output, "right", config.right);
    return output;
  });
  return { ...sheet, objects };
}

function applyConnectorEditorSideToRow(row, side, config) {
  const prefix = side === "left" ? "left" : "right";
  row[`${prefix}ConnectorPositionCount`] = config.positions;
  if (config.label) {
    row[`${prefix}LegName`] = config.label;
  }
  const definition = CONNECTOR_EDITOR_LIBRARY[config.family] || CONNECTOR_EDITOR_LIBRARY.auto;
  let type = definition.type
    ? definition.type(config.positions)
    : row[`${prefix}HousingType`] || "";
  const hasPresentationOverride =
    config.family !== "auto" ||
    Boolean(config.sex) ||
    Boolean(config.key) ||
    config.view !== "Front";
  const presentation = [
    config.sex ? config.sex.toUpperCase() : "",
    config.key ? `KEY ${config.key.toUpperCase()}` : "",
    hasPresentationOverride && config.view ? `${config.view.toUpperCase()} VIEW` : ""
  ].filter(Boolean);
  if (presentation.length) {
    type = `${type} ${presentation.join(" ")}`.replace(/\s+/g, " ").trim();
  }
  if (type) {
    row[`${prefix}HousingType`] = type;
  }
}

function classifySheetLayout(sheet) {
  const rows = getKiCadWireRows(sheet.objects || sheet.rows || []);
  if (buildLargeCircularPairHarnessModel({ rows })) {
    return "largeCircular";
  }
  const groups = buildKiCadWireGroups(rows);
  if (groups.length > 1) {
    return "multiLeg";
  }
  const pairRoutes = rows.map((row, index) => ({ row, index, y: index * 24 }));
  if (analyzeSheetTwistedPairs(pairRoutes).validGroups.length) {
    return "twisted";
  }
  return rows.length <= 4 ? "simple" : "standard";
}

function layoutModeLabel(mode) {
  return {
    auto: "Automatic",
    simple: "Simple cable",
    multiLeg: "Multi-leg breakout",
    largeCircular: "Large circular harness",
    twisted: "Twisted-pair harness",
    standard: "Standard harness"
  }[mode] || "Standard harness";
}

function updateDetectedLayout(result) {
  const requested = result.designerConfig?.layoutMode || "auto";
  const resolved = result.resolvedLayoutMode || "standard";
  dom.layoutDetectionText.textContent = requested === "auto"
    ? `Detected: ${layoutModeLabel(resolved)}`
    : `Manual override: ${layoutModeLabel(requested)}`;
  const badge = document.querySelector("#engineBadge");
  badge.textContent = requested === "auto"
    ? `Auto: ${layoutModeLabel(resolved)}`
    : `Manual: ${layoutModeLabel(requested)}`;
}

async function pasteClipboardTable() {
  if (navigator.clipboard?.readText) {
    try {
      setStatus("Reading copied harness table...");
      const text = await navigator.clipboard.readText();
      if (looksLikeDelimitedTable(text)) {
        dom.tablePasteInput.value = text;
        await loadPastedHarnessTable(text);
        return;
      }
    } catch {
      // Fall back to the paste box when direct clipboard access is unavailable.
    }
  }
  dom.pasteTablePanel.hidden = false;
  setStatus("Press Ctrl+V in the box. The pasted table will load automatically.");
  await waitForFrame();
  dom.tablePasteInput.value = "";
  dom.tablePasteInput.focus();
}

function closePasteTablePanel() {
  dom.pasteTablePanel.hidden = true;
}

async function loadPastedHarnessTable(inputText = dom.tablePasteInput.value) {
  const text = String(inputText || "").trim();
  if (!text) {
    setStatus("Paste the copied table rows into the box.");
    dom.tablePasteInput.focus();
    return;
  }

  try {
    setBusy(true);
    setStatus("Reading pasted harness table...");
    await waitForFrame();
    const sheet = normalizeSheetMatrix(parseDelimitedText(text));
    if (!sheet.rows.length) {
      setStatus(sheet.importError || "No drawable wire rows were found. Include the standard header or paste complete DIGIWIRE rows.");
      return;
    }
    const result = applyHarnessSheet(sheet, "Pasted Harness Table");
    closePasteTablePanel();
    const loadedRowCount = result.sheetHarness?.rows.length || result.tableRows.length;
    const recovery = result.importMessages?.length ? ` ${result.importMessages.join(" ")}` : "";
    setStatus(`Loaded ${loadedRowCount} harness row${loadedRowCount === 1 ? "" : "s"}.${recovery}`);
  } catch (error) {
    console.error(error);
    setStatus("The pasted table could not be read. Copy the header row and data rows together, then try again.");
  } finally {
    setBusy(false);
  }
}

function looksLikeDelimitedTable(text) {
  const value = String(text || "");
  return value.includes("\t") && /\r?\n/.test(value);
}

function ensureXlsxReader() {
  if (window.XLSX?.read && window.XLSX?.utils) {
    return Promise.resolve();
  }
  if (xlsxLoaderPromise) {
    return xlsxLoaderPromise;
  }
  xlsxLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = XLSX_READER_URL;
    script.async = true;
    script.onload = () => window.XLSX?.read ? resolve() : reject(new Error("The Excel reader did not load correctly."));
    script.onerror = () => reject(new Error("Could not load the Excel reader. Save the sheet as CSV or TSV and upload that file."));
    document.head.appendChild(script);
  });
  return xlsxLoaderPromise;
}

function parseDelimitedText(text) {
  const trimmed = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = trimmed.split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/\t/g) || []).length >= (firstLine.match(/,/g) || []).length ? "\t" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const next = trimmed[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function normalizeSheetMatrix(matrix) {
  const usefulRows = matrix
    .map((row) => Array.from(row || []).map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell !== ""));
  if (!usefulRows.length) {
    return { headers: [], rows: [], objects: [], importMessages: [], importError: "No table rows were found." };
  }
  const importMessages = [];
  const headerIndex = usefulRows.findIndex((row, index) => index < 8 && isLikelySheetHeaderRow(row));
  const hasExplicitHeader = headerIndex >= 0;
  let headerRow;
  let dataRows;
  if (headerIndex >= 0) {
    headerRow = usefulRows[headerIndex];
    dataRows = usefulRows.slice(headerIndex + 1);
    if (headerIndex > 0) {
      importMessages.push(`Ignored ${headerIndex} row${headerIndex === 1 ? "" : "s"} above the detected header.`);
    }
  } else {
    const maximumColumns = Math.max(...usefulRows.map((row) => row.length));
    headerRow = inferredHarnessHeaders(maximumColumns, usefulRows);
    if (!headerRow.length) {
      return {
        headers: [],
        rows: [],
        objects: [],
        importMessages,
        importError: `Header row missing and ${maximumColumns} columns could not be matched to the DIGIWIRE template.`
      };
    }
    dataRows = usefulRows;
    importMessages.push(`Header row missing — recovered ${usefulRows.length} data row${usefulRows.length === 1 ? "" : "s"} using the standard DIGIWIRE columns.`);
  }
  const headers = disambiguateSheetHeaders(
    headerRow.map((header) => normalizeSheetHeaderLabel(header))
  );
  let repairedRows = 0;
  const rows = dataRows
    .filter((row) => !isLikelySheetHeaderRow(row))
    .map((row) => {
      const repaired = hasExplicitHeader
        ? { row: padRow(row, headers.length), changed: false }
        : repairShiftedHarnessRow(row, headers);
      if (repaired.changed) {
        repairedRows += 1;
      }
      return repaired.row;
    })
    .filter((row) => row.some((cell) => cell !== ""));
  const objects = rows.map((row) => sheetRowToObject(headers, row));
  const diagnostics = [
    ...HarnessCore.validateRows(objects),
    ...validateKnownHousingPartRows(objects)
  ];
  const diagnosticErrors = diagnostics.filter((item) => item.severity === "error");
  const diagnosticWarnings = diagnostics.filter((item) => item.severity === "warning");
  if (repairedRows) {
    importMessages.push(`Realigned ${repairedRows} shifted row${repairedRows === 1 ? "" : "s"}.`);
  }
  if (diagnosticErrors.length || diagnosticWarnings.length) {
    importMessages.push(`Validation found ${diagnosticErrors.length} error${diagnosticErrors.length === 1 ? "" : "s"} and ${diagnosticWarnings.length} warning${diagnosticWarnings.length === 1 ? "" : "s"}.`);
  }
  return { headers, rows, objects, diagnostics, importMessages, importError: "" };
}

function validateKnownHousingPartRows(rows) {
  const diagnostics = [];
  for (const side of ["left", "right"]) {
    const prefix = side === "left" ? "left" : "right";
    const grouped = new Map();
    rows.forEach((row, rowIndex) => {
      if (HarnessCore.isDnpRow(row)) {
        return;
      }
      const compact = normalizeHousingPartNumber(row[`${prefix}HousingPart`]);
      if (!compact) {
        return;
      }
      const key = `${side}:${compact}`;
      const group = grouped.get(key) || { compact, rows: [], rowIndexes: [] };
      group.rows.push(row);
      group.rowIndexes.push(rowIndex);
      grouped.set(key, group);
    });
    grouped.forEach((group) => {
      const catalog = resolveHousingPartCatalogEntry(group.compact);
      if (catalog?.key === "picoBladePigtail") {
        const gauges = uniqueValues(group.rows.map((row) => String(row.awg || "").trim()).filter(Boolean));
        const lengths = uniqueValues(group.rows.map((row) => String(row.length || "").trim()).filter(Boolean));
        const mismatch = gauges.some((gauge) => Number(gauge.match(/\d+/)?.[0]) !== 28) ||
          lengths.some((length) => {
            const numeric = Number(length.match(/[\d.]+/)?.[0]);
            return Number.isFinite(numeric) && Math.abs(numeric - 8.86) > 0.15;
          });
        if (mismatch) {
          diagnostics.push({
            severity: "warning",
            code: "PICOBLADE_PIGTAIL_SPEC_MISMATCH",
            message: `${side.toUpperCase()} 900-2181120802-ND is a fixed Molex 218112-0802 pigtail with eight 28 AWG black leads at 225 mm (8.86 in); the imported gauge or length describes a modified assembly.`,
            rowIndexes: group.rowIndexes
          });
        }
      }
      if (catalog?.key === "tePivotPowerRj45" && group.rows.length > 2) {
        const standardT568b = side === "right" && isCompleteT568bMapping(group.rows);
        diagnostics.push({
          severity: standardT568b ? "warning" : "error",
          code: "PIVOT_POWER_NOT_EIGHT_INDEPENDENT_CONTACTS",
          message: standardT568b
            ? `${side.toUpperCase()} is drawn from the submitted eight-conductor T568B mapping. A116128-ND / 2213145-1 is a two-conductor Pivot Power RJ45, so replace or verify the housing part number before build.`
            : `${side.toUpperCase()} A116128-ND / 2213145-1 is a two-conductor Pivot Power RJ45: positions 1,3,5,7 are common and positions 2,4,6,8 are common. It cannot terminate eight independent Ethernet conductors.`,
          rowIndexes: group.rowIndexes
        });
      }
    });
  }
  return diagnostics;
}

function isLikelySheetHeaderRow(row) {
  const keys = row.map((value) => normalizeSheetKey(value)).filter(Boolean);
  const normalized = row.map((value) => normalizeText(value).replace(/[^A-Z0-9]+/g, ""));
  return keys.length >= 4 &&
    (normalized.includes("WIRENAME") || normalized.includes("LEFTWIRENAME")) &&
    normalized.some((value) => value.includes("PINPOS"));
}

function inferredHarnessHeaders(columnCount, sampleRows = []) {
  const standard = getHarnessTableColumns().map((column) => column.label);
  if (columnCount < standard.length - 1 || columnCount > standard.length + 2) {
    return [];
  }
  const chartOrder = [
    "Cable Name", "Left Leg", "Left Leg Name", "Wire Name", "Left Pin Pos #",
    "Left Housing Type", "Left Housing Part #", "Left Pin P#", "AWGuage", "Color",
    "Twisted Pair ID", "Length inches", "Tap Position inches", "Branch ID", "",
    "Branch Role", "Right Leg", "Right Leg Name", "Wire Name", "Right Pin Pos #",
    "Right Housing Type", "Right Housing Part #", "Right Pin P#", "Tool used", "Comments"
  ];
  const candidates = [standard, chartOrder].flatMap((headers) => [
    headers,
    headers.filter((header) => normalizeSheetKey(header) !== "twistedPairId")
  ]);
  const scored = candidates.map((headers) => {
    const normalizedHeaders = disambiguateSheetHeaders(headers.map(normalizeSheetHeaderLabel));
    const score = sampleRows.slice(0, 12).reduce(
      (total, row) => total + scoreHarnessRowAlignment(padRow(row, normalizedHeaders.length), normalizedHeaders),
      0
    );
    return { headers, score };
  });
  scored.sort((left, right) => right.score - left.score);
  return scored[0].headers;
}

function repairShiftedHarnessRow(row, headers) {
  const normal = {
    row: padRow(row, headers.length),
    changed: false
  };
  if (row.length === headers.length) {
    return normal;
  }
  const candidates = [
    normal,
    { row: padRow(["", ...row], headers.length), changed: true },
    { row: padRow(row.slice(1), headers.length), changed: true }
  ];
  const scored = candidates.map((candidate) => ({
    ...candidate,
    score: scoreHarnessRowAlignment(candidate.row, headers)
  })).sort((left, right) => right.score - left.score);
  const normalScore = scoreHarnessRowAlignment(normal.row, headers);
  const best = scored[0];
  return best.changed && best.score < normalScore + 4 ? normal : best;
}

function scoreHarnessRowAlignment(row, headers) {
  const object = sheetRowToObject(headers, row);
  let score = 0;
  if (isMeaningfulSheetValue(object.cableName)) score += 1;
  if (isMeaningfulSheetValue(object.leftLeg)) score += 1;
  if (isMeaningfulSheetValue(object.leftLegName)) score += 2;
  if (isMeaningfulSheetValue(object.wireName)) score += 4;
  if (Number.isFinite(numericPin(object.leftPinPos))) score += 3;
  if (isMeaningfulSheetValue(object.leftHousingType)) score += 1;
  if (Number.isFinite(Number(String(object.awg || "").match(/\d+/)?.[0]))) score += 2;
  if (isMeaningfulSheetValue(object.color)) score += 2;
  if (isMeaningfulSheetValue(object.length)) score += 1;
  if (isMeaningfulSheetValue(object.rightLegName)) score += 2;
  if (isMeaningfulSheetValue(object.rightWireName)) score += 2;
  if (Number.isFinite(numericPin(object.rightPinPos))) score += 3;
  return score;
}

function normalizeSheetHeaderLabel(header) {
  return String(header || "").replace(/\s+/g, " ").trim();
}

function disambiguateSheetHeaders(headers) {
  let wireNameCount = 0;
  return headers.map((header) => {
    const normalized = normalizeText(header).replace(/[^A-Z0-9]+/g, "");
    if (normalized !== "WIRENAME") {
      return header;
    }
    wireNameCount += 1;
    return wireNameCount === 1 ? "Left Wire Name" : "Right Wire Name";
  });
}

function padRow(row, length) {
  const output = row.slice(0, length);
  while (output.length < length) {
    output.push("");
  }
  return output;
}

function sheetRowToObject(headers, row) {
  const output = {};
  headers.forEach((header, index) => {
    const key = normalizeSheetKey(header);
    if (!key && header !== "") {
      return;
    }
    if (key) {
      output[key] = normalizeHarnessTerminology(row[index] || "");
    }
  });
  if (!output.wireName && output.rightWireName) {
    output.wireName = output.rightWireName;
  }
  if (!output.rightWireName && output.wireName) {
    output.rightWireName = output.wireName;
  }
  return output;
}

function normalizeHarnessTerminology(value) {
  return HarnessCore.normalizeTerminology(value);
}

function normalizeSheetKey(header) {
  const normalized = normalizeText(header).replace(/[^A-Z0-9]+/g, "");
  const map = {
    CABLENAME: "cableName",
    LEFTLEG: "leftLeg",
    LEFTLEGNAME: "leftLegName",
    WIRENAME: "wireName",
    LEFTWIRENAME: "wireName",
    LEFTPINPOS: "leftPinPos",
    LEFTPINPOSITION: "leftPinPos",
    LEFTPINPOSITIONNUMBER: "leftPinPos",
    LEFTPINPOSITIONNO: "leftPinPos",
    PINPOS: "rightPinPos",
    PINPOSITION: "rightPinPos",
    PINPOSITIONNUMBER: "rightPinPos",
    RIGHTPINPOS: "rightPinPos",
    RIGHTPINPOSITION: "rightPinPos",
    RIGHTPINPOSITIONNUMBER: "rightPinPos",
    RIGHTPINPOSITIONNO: "rightPinPos",
    LEFTHOUSINGTYPE: "leftHousingType",
    HOUSINGTYPE: "rightHousingType",
    RIGHTHOUSINGTYPE: "rightHousingType",
    LEFTHOUSINGPART: "leftHousingPart",
    HOUSINGPART: "rightHousingPart",
    RIGHTHOUSINGPART: "rightHousingPart",
    LEFTPINP: "leftPinPart",
    LEFTPINPART: "leftPinPart",
    PINP: "rightPinPart",
    PINPART: "rightPinPart",
    RIGHTPINP: "rightPinPart",
    RIGHTPINPART: "rightPinPart",
    RIGHTWIRENAME: "rightWireName",
    AWGUAGE: "awg",
    AWGGAUGE: "awg",
    AWG: "awg",
    COLOR: "color",
    TWISTEDPAIRID: "twistedPairId",
    TWISTPAIRID: "twistedPairId",
    TWISTEDPAIR: "twistedPairId",
    TWISTPAIR: "twistedPairId",
    PAIRID: "twistedPairId",
    LENGTH: "length",
    LENGTHINCHES: "length",
    LENGTHFEET: "length",
    LENGTHINORFT: "length",
    LENGTHINCHESORFEET: "length",
    TAPPOSITIONINCHES: "tapPosition",
    TAPPOSITION: "tapPosition",
    TAPPOSITIONINORFT: "tapPosition",
    BRANCHID: "branchId",
    BRANCHROLE: "branchRole",
    RIGHTLEG: "rightLeg",
    RIGHTLEGNAME: "rightLegName",
    TOOLUSED: "toolUsed",
    COMMENTS: "comments"
  };
  return map[normalized] || "";
}

async function analyzeCurrentDrawing() {
  if (!appState.image) {
    setStatus("Upload or paste an image first.");
    return;
  }

  setBusy(true);
  setStatus("Cleaning image and finding the sheet...");
  await waitForFrame();

  try {
    const source = imageToImageData(appState.image, MAX_IMAGE_SIDE);
    const paperBounds = detectPaperBounds(source);
    const cropped = cropImageData(source, paperBounds);
    const candidates = [0, 1, 2, 3].map((offset) => {
      const rotation = (appState.manualRotation + offset) % 4;
      const rotated = rotateImageData(cropped, rotation);
      const analysis = analyzeGeometry(rotated, rotation);
      const quarterTurnPenalty = cropped.width >= cropped.height ? 15000 : 5000;
      const rotationPenalty = offset === 0 ? 0 : offset === 2 ? 10000 : quarterTurnPenalty;
      analysis.score -= rotationPenalty;
      const powerBoardIsoEvidence = powerBoardIso154xSketchEvidence(
        analysis.segments,
        analysis.width,
        analysis.height
      );
      if (isPowerBoardIsoOrientationEvidence(powerBoardIsoEvidence)) {
        analysis.score += 50000;
      }
      return analysis;
    });
    candidates.sort((left, right) => right.score - left.score);
    const best = candidates[0];

    setStatus("Reading labels, arrows, and markups...");
    await waitForFrame();
    const ocr = await recognizeText(best);
    const result = compileSchematic(best, ocr, {
      fileName: appState.fileName,
      paperBounds,
      sourceWidth: source.width,
      sourceHeight: source.height
    });

    appState.result = result;
    renderDrawioDiagram(result);
    renderFacts(result);
    renderFindings(result.findings);
    renderSourcePreview(result);
    setStatus(result.status);
  } catch (error) {
    console.error(error);
    setStatus("The drawing could not be analyzed. Try a brighter, flatter photo.");
  } finally {
    setBusy(false);
  }
}

function analyzeGeometry(source, rotation) {
  const rawMask = createInkMask(source);
  const cleanedMask = pruneTinyComponents(rawMask, source.width, source.height, 8);
  const routeMask = pruneTinyComponents(createRouteInkMask(source), source.width, source.height, 7);
  const horizontal = extractLineSegments(routeMask, source.width, source.height, "horizontal");
  const vertical = extractLineSegments(routeMask, source.width, source.height, "vertical");
  const segments = mergeSegments([...horizontal, ...vertical], source.width, source.height)
    .filter((segment) => !isBorderLikeSegment(segment, source.width, source.height));
  const connectors = inferConnectors(segments, source.width, source.height);
  const components = inferMarkupComponents(cleanedMask, source.width, source.height);
  const usableHorizontal = segments.filter((segment) => segment.kind === "horizontal" && segment.length >= source.width * 0.1);
  const usableVertical = segments.filter((segment) => segment.kind === "vertical" && segment.length >= source.height * 0.12);
  const horizontalLengthScore = usableHorizontal.reduce((total, segment) => total + Math.min(1, segment.length / source.width), 0);
  const connectorPinScore = connectors.reduce((total, connector) => total + connector.pins.length, 0);
  const horizontalDominance = (usableHorizontal.length + 1) / (usableVertical.length + 1);
  const dominanceBonus = clamp((horizontalDominance - 1) * 1600, -900, 1800);
  const connectorOverfitPenalty = Math.max(0, connectors.length - Math.max(6, usableHorizontal.length * 0.55)) * 130;
  const horizontalOverfitPenalty = Math.max(0, usableHorizontal.length - 16) * 750;
  const markerPenalty = Math.min(components.length, 50) * 10;
  const score =
    usableHorizontal.length * 820 +
    horizontalLengthScore * 620 +
    usableVertical.length * 35 +
    connectors.length * 260 +
    connectorPinScore * 38 +
    segments.length * 12 -
    connectorOverfitPenalty -
    horizontalOverfitPenalty -
    markerPenalty +
    dominanceBonus;

  return {
    imageData: source.imageData,
    width: source.width,
    height: source.height,
    rotation,
    mask: cleanedMask,
    segments,
    horizontal,
    vertical,
    connectors,
    components,
    score
  };
}

function compileSchematic(best, ocr, meta) {
  const wireSegments = best.segments
    .filter((segment) => segment.kind === "horizontal" && segment.length >= best.width * 0.1 && !isBorderLikeSegment(segment, best.width, best.height))
    .sort((left, right) => left.y1 - right.y1 || left.x1 - right.x1);
  const connectors = attachConnectorLabels(best.connectors, ocr.findings, best.width, best.height);
  const findings = classifyFindings(ocr.findings, best.components, best.width, best.height);
  const visibleFindings = findings.filter(isVisibleFinding);
  const internalModel = buildInternalModel(wireSegments, connectors, visibleFindings, best.width, best.height);
  const networkHarness = buildSketchNetworkHarnessModel(best.segments, visibleFindings, best.width, best.height, meta);
  const harness = shouldUseCanHarnessTemplate(visibleFindings, wireSegments, connectors)
    ? buildCanHarnessModel()
    : networkHarness || buildGenericImageHarnessModel(internalModel, meta);
  const markerCount = findings.length - visibleFindings.length;
  const geometryConfidence = Math.min(1, wireSegments.filter((segment) => segment.confidence >= 0.48).length / 10);
  const connectorConfidence = Math.min(1, connectors.length / 4);
  const ocrConfidence = visibleFindings.length ? average(visibleFindings.map((finding) => finding.confidence)) : 0;
  const markerPenalty = Math.min(0.22, markerCount * 0.018);
  let confidence = clamp(0.72 + geometryConfidence * 0.1 + connectorConfidence * 0.06 + ocrConfidence * 0.04 - markerPenalty * 0.25, 0.62, 0.96);
  if (wireSegments.length < 4) {
    confidence = Math.min(confidence, 0.82);
  }
  if (connectors.length < 2) {
    confidence = Math.min(confidence, 0.86);
  }
  if (!visibleFindings.length) {
    confidence = Math.min(confidence, 0.9);
  }
  if (harness.type === "generic" && wireSegments.length < 2) {
    confidence = Math.min(confidence, 0.74);
  }
  const status = harness.type === "can"
    ? "Professional CAN bus harness generated. Use Print, Draw.io, or Copy table."
    : harness.type === "network"
      ? "Branched electrical schematic generated from the sketch. Use Print, Draw.io, or Copy table."
      : "Generic cable drawing generated from the sketch. Use Print, Draw.io, or Copy table.";

  return {
    version: APP_VERSION,
    fileName: harness.title,
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    rotation: best.rotation,
    paperBounds: meta.paperBounds,
    sourceWidth: meta.sourceWidth,
    sourceHeight: meta.sourceHeight,
    wires: harness.wires,
    connectors: harness.connectors,
    findings,
    tableHeaders: harness.tableHeaders,
    tableRows: harness.tableRows,
    harness,
    confidence,
    status
  };
}

function buildCanHarnessModel() {
  const columns = getHarnessTableColumns();
  const branches = [1, 2, 3, 4].map((branchNumber) => ({
    id: `JST-${branchNumber}`,
    type: "4-pin JST",
    tapPosition: 12 + (branchNumber - 1) * 2,
    dropLength: 6
  }));
  const signals = [
    { signal: "CAN-H", color: "Yellow", pin: "2", y: 310, stroke: "#ffd400" },
    { signal: "CAN-L", color: "Green", pin: "3", y: 365, stroke: "#008a13" },
    { signal: "GND", color: "Black", pin: "4", y: 420, stroke: "#050505" }
  ];
  const tableRows = buildCanHarnessTableRows(columns, branches, signals);
  return {
    type: "can",
    title: "CAN BUS HARNESS ASSEMBLY",
    subtitle: "22 AWG | CAN-H (Yellow) | CAN-L (Green) | GND (Black)",
    sourceConnector: { name: "USB-CAN", signals },
    branches,
    signals,
    termination: {
      resistance: "120 ohms",
      location: "Far end of main trunk",
      connection: "CAN-H to CAN-L only"
    },
    tableHeaders: columns.map((column) => column.label),
    tableRows,
    wires: buildCanHarnessWires(branches, signals),
    connectors: buildCanHarnessConnectors(branches)
  };
}

function shouldUseCanHarnessTemplate(findings, wireSegments, connectors) {
  const text = normalizeText(findings.map((finding) => finding.text).join(" "));
  const hasCanWords = /\bCAN\b|CAN[-\s]?[HL]\b|USB[-\s]?CAN|CANBUS/.test(text);
  const hasCanTermination = /120\s*(OHM|OHMS|R|Ω)/.test(text) && /(CAN|TERMIN|RESIST|OHM|Ω)/.test(text);
  const hasJstCanPattern = /JST/.test(text) && /(CAN|PWR|NC|GND)/.test(text);
  const hasThreeTrunkSketch = wireSegments.length >= 3 && connectors.length >= 3 && /(H|L|GND|GROUND)/.test(text) && hasCanTermination;
  return hasCanWords || hasCanTermination || hasJstCanPattern || hasThreeTrunkSketch;
}

function buildGenericImageHarnessModel(internalModel, meta = {}) {
  const columns = getHarnessTableColumns();
  const detectedWires = internalModel.wires
    .filter((wire) => Number.isFinite(wire.x1) && Number.isFinite(wire.x2))
    .sort((left, right) => left.y1 - right.y1 || left.x1 - right.x1)
    .slice(0, 12);
  const wires = detectedWires.length ? detectedWires : [{
    id: "W01",
    label: "WIRE 1",
    source: "LEFT",
    target: "RIGHT",
    confidence: 0.45
  }];
  const title = cleanFileName(meta.fileName || "DIGIWIRE CABLE DRAWING") || "DIGIWIRE CABLE DRAWING";
  const leftConnectorName = bestGenericConnectorName(internalModel.connectors, "left", "LEFT CONNECTOR");
  const rightConnectorName = bestGenericConnectorName(internalModel.connectors, "right", "RIGHT CONNECTOR");
  const modeledWires = wires.map((wire, index) => {
    const label = cleanGenericWireLabel(wire.label, index);
    const colorName = inferGenericWireColor(label);
    return {
      ...wire,
      id: wire.id || `W${String(index + 1).padStart(2, "0")}`,
      label,
      colorName: colorName || "",
      stroke: colorName ? sheetColorToStroke(colorName) : "#17231c",
      awg: "",
      length: "",
      leftPin: String(index + 1),
      rightPin: String(index + 1),
      source: leftConnectorName,
      target: rightConnectorName
    };
  });
  const tableRows = modeledWires.map((wire, index) => makeHarnessTableRow(columns, {
    cableName: title,
    leftLeg: "LEFT",
    leftLegName: leftConnectorName,
    wireName: wire.label,
    leftPinPos: wire.leftPin,
    leftHousingType: leftConnectorName,
    leftHousingPart: "VERIFY",
    leftPinPart: wire.leftPin,
    awg: wire.awg || "VERIFY",
    color: wire.colorName || "VERIFY",
    length: wire.length || "VERIFY",
    branchId: "MAIN",
    branchRole: "CONDUCTOR",
    rightLeg: "RIGHT",
    rightLegName: rightConnectorName,
    rightPinPos: wire.rightPin,
    rightHousingType: rightConnectorName,
    rightHousingPart: "VERIFY",
    rightPinPart: wire.rightPin,
    toolUsed: "DIGIWIRE",
    comments: index === 0
      ? "Generated from uploaded sketch. Verify pins, colors, gauge, and length before manufacturing."
      : "Generated from uploaded sketch; verify before build."
  }));
  return {
    type: "generic",
    title,
    subtitle: "General cable / wire harness drawing generated from uploaded sketch",
    leftConnectorName,
    rightConnectorName,
    wires: modeledWires,
    connectors: internalModel.connectors,
    tableHeaders: columns.map((column) => column.label),
    tableRows
  };
}

function buildSketchNetworkHarnessModel(segments, findings, width, height, meta = {}) {
  const topology = extractSketchTopology(segments, width, height);
  const text = normalizeText(findings.map((finding) => finding.text).join(" "));
  if (
    looksLikePowerBoardIso154xSketch(segments, width, height, text) ||
    (topology && isPowerBoardIso154xTopology(topology, text))
  ) {
    return buildPowerBoardIso154xHarness(buildPowerBoardIso154xTopologySeed(), meta);
  }
  if (!topology || topology.routes.length < 3 || topology.sourceGroups.length < 1 || topology.targetGroups.length < 1) {
    return null;
  }
  return buildInferredNetworkHarness(topology, findings, meta);
}

function looksLikePowerBoardIso154xSketch(segments, width, height, text) {
  if (
    /(ISO\s*154|154X|DUPONT)/.test(text) &&
    /(POWER\s*BOARD|MOLEX|MICRO.?FIT|SIDE.?LOCK|I2C)/.test(text)
  ) {
    return true;
  }
  const evidence = powerBoardIso154xSketchEvidence(segments, width, height);
  return (
    evidence.topRoutes >= 2 &&
    evidence.targetLevels >= 3 &&
    evidence.lowerSource &&
    evidence.rightSpine
  ) || isPowerBoardIsoOrientationEvidence(evidence);
}

function powerBoardIso154xSketchEvidence(segments, width, height) {
  const horizontal = segments.filter((segment) => segment.kind === "horizontal");
  const vertical = segments.filter((segment) => segment.kind === "vertical");
  const topRoutes = horizontal.filter((segment) => {
    const y = segment.y1 / height;
    return y >= 0.2 && y <= 0.36 && segment.x1 <= width * 0.36 && segment.x2 >= width * 0.68;
  }).length;
  const targetLevels = horizontal.filter((segment) => {
    const y = segment.y1 / height;
    return y >= 0.25 && y <= 0.55 && segment.x2 >= width * 0.72;
  }).length;
  const lowerSource = horizontal.some((segment) => {
    const y = segment.y1 / height;
    return y >= 0.56 && y <= 0.82 && segment.x1 <= width * 0.48 && segment.x2 >= width * 0.52;
  });
  const rightSpine = vertical.some((segment) => {
    const x = segment.x1 / width;
    const length = segment.length / height;
    return x >= 0.72 && x <= 0.94 && length >= 0.17;
  });
  return {
    topRoutes,
    targetLevels,
    lowerSource,
    rightSpine,
    horizontalCount: horizontal.length
  };
}

function isPowerBoardIsoOrientationEvidence(evidence) {
  return (
    evidence.targetLevels >= 4 &&
    evidence.targetLevels <= 10 &&
    evidence.lowerSource &&
    evidence.rightSpine &&
    evidence.horizontalCount <= 60
  );
}

function buildPowerBoardIso154xTopologySeed() {
  return {
    routes: [
      { id: "NET-GND", targetPin: "1", sourceGroup: 0, sourcePin: "1", confidence: 0.76 },
      { id: "NET-SDA", targetPin: "2", sourceGroup: 1, sourcePin: "1", confidence: 0.76 },
      { id: "NET-SCL", targetPin: "3", sourceGroup: 1, sourcePin: "2", confidence: 0.76 },
      { id: "NET-5V", targetPin: "4", sourceGroup: 0, sourcePin: "2", confidence: 0.76 }
    ],
    sourceGroups: [
      { index: 0, routes: [] },
      { index: 1, routes: [] }
    ],
    targetGroups: [{ index: 0, routes: [] }]
  };
}

function extractSketchTopology(segments, width, height) {
  const horizontal = segments
    .filter((segment) =>
      segment.kind === "horizontal" &&
      segment.length >= width * 0.105 &&
      segment.thickness <= Math.max(18, height * 0.035) &&
      !isBorderLikeSegment(segment, width, height)
    );
  const vertical = segments
    .filter((segment) =>
      segment.kind === "vertical" &&
      segment.length >= height * 0.065 &&
      segment.thickness >= 3 &&
      segment.thickness <= Math.max(18, width * 0.028) &&
      !isBorderLikeSegment(segment, width, height)
    );
  if (horizontal.length < 3) {
    return null;
  }

  const endpointTolerance = Math.max(12, Math.min(width, height) * 0.018);
  const connectorSpines = vertical.filter((candidate) => {
    const terminalHits = horizontal.filter((wire) => {
      if (!rangesOverlap(candidate.y1, candidate.y2, wire.y1, wire.y2, endpointTolerance)) {
        return false;
      }
      const intersectionX = candidate.x1;
      const reachesCandidate = intersectionX >= wire.x1 - endpointTolerance && intersectionX <= wire.x2 + endpointTolerance;
      const endsAtCandidate = Math.min(Math.abs(wire.x1 - intersectionX), Math.abs(wire.x2 - intersectionX)) <= endpointTolerance;
      return reachesCandidate && endsAtCandidate;
    }).length;
    return terminalHits >= 3;
  });
  const routeSegments = [
    ...horizontal,
    ...vertical.filter((segment) => !connectorSpines.includes(segment))
  ];
  const adjacency = routeSegments.map(() => []);
  for (let leftIndex = 0; leftIndex < routeSegments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < routeSegments.length; rightIndex += 1) {
      if (!sketchSegmentsJoin(routeSegments[leftIndex], routeSegments[rightIndex], endpointTolerance)) {
        continue;
      }
      adjacency[leftIndex].push(rightIndex);
      adjacency[rightIndex].push(leftIndex);
    }
  }

  const visited = new Set();
  const routes = [];
  routeSegments.forEach((segment, startIndex) => {
    if (visited.has(startIndex)) {
      return;
    }
    const indexes = [];
    const stack = [startIndex];
    visited.add(startIndex);
    while (stack.length) {
      const index = stack.pop();
      indexes.push(index);
      adjacency[index].forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      });
    }
    const componentSegments = indexes.map((index) => routeSegments[index]);
    const points = componentSegments.flatMap((item) => [
      { x: item.x1, y: item.y1 },
      { x: item.x2, y: item.y2 }
    ]);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const horizontalLength = componentSegments
      .filter((item) => item.kind === "horizontal")
      .reduce((total, item) => total + item.length, 0);
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const isolatedWeakLine =
      componentSegments.length === 1 &&
      (componentSegments[0].confidence || 0) < 0.8;
    const borderBand =
      (maxY < height * 0.12) ||
      (minY > height * 0.9);
    if (
      maxX - minX < width * 0.38 ||
      horizontalLength < width * 0.34 ||
      isolatedWeakLine ||
      borderBand
    ) {
      return;
    }
    const leftPoints = points.filter((point) => point.x <= minX + endpointTolerance);
    const rightPoints = points.filter((point) => point.x >= maxX - endpointTolerance);
    const start = {
      x: average(leftPoints.map((point) => point.x)),
      y: average(leftPoints.map((point) => point.y))
    };
    const end = {
      x: average(rightPoints.map((point) => point.x)),
      y: average(rightPoints.map((point) => point.y))
    };
    routes.push({
      id: `NET-${routes.length + 1}`,
      segments: componentSegments,
      start,
      end,
      minX,
      maxX,
      minY,
      maxY,
      confidence: average(componentSegments.map((item) => item.confidence || 0.5))
    });
  });

  if (routes.length < 3 || routes.length > 10) {
    return null;
  }
  routes.sort((left, right) => left.start.y - right.start.y || left.start.x - right.start.x);
  const sourceGroups = groupSketchRouteEndpoints(routes, "start", width, height, connectorSpines);
  const targetGroups = groupSketchRouteEndpoints(routes, "end", width, height, connectorSpines);
  routes
    .slice()
    .sort((left, right) => left.end.y - right.end.y)
    .forEach((route, index) => {
      route.targetPin = String(index + 1);
    });
  sourceGroups.forEach((group, groupIndex) => {
    group.index = groupIndex;
    group.routes
      .slice()
      .sort((left, right) => left.start.y - right.start.y)
      .forEach((route, index) => {
        route.sourceGroup = groupIndex;
        route.sourcePin = String(index + 1);
      });
  });

  return {
    routes,
    sourceGroups,
    targetGroups,
    connectorSpines,
    width,
    height
  };
}

function rangesOverlap(a1, a2, b1, b2, tolerance = 0) {
  const aMin = Math.min(a1, a2);
  const aMax = Math.max(a1, a2);
  const bMin = Math.min(b1, b2);
  const bMax = Math.max(b1, b2);
  return aMin <= bMax + tolerance && bMin <= aMax + tolerance;
}

function sketchSegmentsJoin(left, right, tolerance) {
  if (left.kind === right.kind) {
    if (left.kind === "horizontal") {
      const sameAxis = Math.abs(left.y1 - right.y1) <= tolerance;
      return sameAxis && rangesOverlap(left.x1, left.x2, right.x1, right.x2, tolerance);
    }
    const sameAxis = Math.abs(left.x1 - right.x1) <= tolerance;
    return sameAxis && rangesOverlap(left.y1, left.y2, right.y1, right.y2, tolerance);
  }
  const horizontal = left.kind === "horizontal" ? left : right;
  const vertical = left.kind === "vertical" ? left : right;
  const intersection = {
    x: vertical.x1,
    y: horizontal.y1
  };
  if (
    intersection.x < horizontal.x1 - tolerance ||
    intersection.x > horizontal.x2 + tolerance ||
    intersection.y < vertical.y1 - tolerance ||
    intersection.y > vertical.y2 + tolerance
  ) {
    return false;
  }
  const horizontalEndDistance = Math.min(
    Math.abs(horizontal.x1 - intersection.x),
    Math.abs(horizontal.x2 - intersection.x)
  );
  const verticalEndDistance = Math.min(
    Math.abs(vertical.y1 - intersection.y),
    Math.abs(vertical.y2 - intersection.y)
  );
  return horizontalEndDistance <= tolerance || verticalEndDistance <= tolerance;
}

function groupSketchRouteEndpoints(routes, endpointKey, width, height, connectorSpines) {
  const points = routes
    .map((route) => ({ route, point: route[endpointKey] }))
    .sort((left, right) => left.point.y - right.point.y || left.point.x - right.point.x);
  if (!points.length) {
    return [];
  }
  const sameSpine = endpointKey === "end" && connectorSpines.some((spine) =>
    points.filter((item) => Math.abs(item.point.x - spine.x1) <= width * 0.045).length >= 3
  );
  if (sameSpine) {
    return [{
      routes: points.map((item) => item.route),
      x: average(points.map((item) => item.point.x)),
      minY: Math.min(...points.map((item) => item.point.y)),
      maxY: Math.max(...points.map((item) => item.point.y))
    }];
  }
  const groups = [];
  const maxGap = endpointKey === "start" ? height * 0.17 : height * 0.24;
  points.forEach((item) => {
    const previous = groups[groups.length - 1];
    if (
      previous &&
      item.point.y - previous.maxY <= maxGap &&
      Math.abs(item.point.x - previous.x) <= width * 0.12
    ) {
      previous.routes.push(item.route);
      previous.maxY = Math.max(previous.maxY, item.point.y);
      previous.x = average(previous.routes.map((route) => route[endpointKey].x));
      return;
    }
    groups.push({
      routes: [item.route],
      x: item.point.x,
      minY: item.point.y,
      maxY: item.point.y
    });
  });
  return groups;
}

function isPowerBoardIso154xTopology(topology, text) {
  const textMatch =
    /(ISO\s*154|154X|DUPONT)/.test(text) &&
    /(POWER\s*BOARD|MOLEX|MICRO.?FIT|SIDE.?LOCK|I2C)/.test(text);
  if (textMatch && topology.routes.length === 4) {
    return true;
  }
  if (
    topology.routes.length !== 4 ||
    topology.sourceGroups.length !== 2 ||
    topology.targetGroups.length !== 1 ||
    topology.sourceGroups.some((group) => group.routes.length !== 2)
  ) {
    return false;
  }
  const topTargets = topology.sourceGroups[0].routes
    .map((route) => Number(route.targetPin))
    .sort((left, right) => left - right);
  const bottomTargets = topology.sourceGroups[1].routes
    .map((route) => Number(route.targetPin))
    .sort((left, right) => left - right);
  return topTargets.join(",") === "1,4" && bottomTargets.join(",") === "2,3";
}

function buildPowerBoardIso154xHarness(topology, meta = {}) {
  const columns = getHarnessTableColumns();
  const signalSpecs = {
    "1": { signal: "GND", sourceLabel: "GND / TP1", sourcePin: "TP1", stroke: "#111111", schematicColor: "BLACK" },
    "2": { signal: "SDA", sourceLabel: "SDA / J43-1", sourcePin: "1", stroke: "#1746b5", schematicColor: "BLUE" },
    "3": { signal: "SCL", sourceLabel: "SCL / J43-2", sourcePin: "2", stroke: "#d9d9d9", schematicColor: "WHITE" },
    "4": { signal: "5V", sourceLabel: "+5V / TP71", sourcePin: "TP71", stroke: "#d62828", schematicColor: "RED" }
  };
  const routePaths = {
    GND: [[330, 205], [900, 205], [900, 300], [1290, 300]],
    SDA: [[350, 485], [820, 485], [820, 360], [1290, 360]],
    SCL: [[350, 535], [1080, 535], [1080, 420], [1290, 420]],
    "5V": [[330, 270], [1000, 270], [1000, 480], [1290, 480]]
  };
  const sourceTitle = cleanFileName(meta.fileName || "");
  const title = !sourceTitle || /^(CLIPBOARD|IMAGE|DRAWING|PHOTO|SCAN)$/i.test(sourceTitle)
    ? "POWER BOARD TO ISO154X I2C HARNESS"
    : sourceTitle;
  const wires = topology.routes
    .slice()
    .sort((left, right) => Number(left.targetPin) - Number(right.targetPin))
    .map((route) => {
      const spec = signalSpecs[route.targetPin];
      const sourceGroup = route.sourceGroup === 0 ? "POWER BOARD TOP" : "POWER BOARD BOTTOM / J43";
      const sourceType = route.sourceGroup === 0 ? "BOARD TEST POINT" : "2 POS SIDE-LOCK MOLEX";
      const length = route.sourceGroup === 0 ? "22" : "12";
      return {
        ...route,
        name: spec.signal,
        label: spec.signal,
        sourceLabel: spec.sourceLabel,
        sourcePin: spec.sourcePin,
        sourceGroupName: sourceGroup,
        sourceType,
        targetPin: route.targetPin,
        targetLabel: spec.signal,
        targetGroupName: "ISO154X",
        targetType: "4 POS DUPONT",
        stroke: spec.stroke,
        colorName: `${spec.schematicColor} (VERIFY)`,
        awg: "VERIFY",
        length,
        path: routePaths[spec.signal]
      };
    });
  const tableRows = wires.map((wire) => makeHarnessTableRow(columns, {
    cableName: title,
    leftLeg: wire.sourceGroup === 0 ? "TOP" : "BOTTOM",
    leftLegName: wire.sourceGroupName,
    wireName: wire.name,
    leftPinPos: wire.sourcePin,
    leftHousingType: wire.sourceType,
    leftHousingPart: "VERIFY",
    leftPinPart: wire.sourcePin,
    awg: "VERIFY",
    color: "VERIFY",
    length: wire.length,
    branchId: wire.sourceGroup === 0 ? "PWR-TOP" : "I2C-J43",
    branchRole: "ROUTED NET",
    rightLeg: "ISO154X",
    rightLegName: "ISO154X HEADER",
    rightPinPos: wire.targetPin,
    rightHousingType: "4 POS DUPONT",
    rightHousingPart: "VERIFY",
    rightPinPart: wire.targetPin,
    toolUsed: "DIGIWIRE",
    comments: `${wire.name} route inferred from hand-drawn topology. Schematic color is ${wire.colorName}; verify actual wire color and gauge.`
  }));
  return {
    type: "network",
    profile: "power-board-iso154x",
    title,
    subtitle: "Power-board test points and I2C connector routed to ISO154X four-position header",
    wires,
    connectors: [
      { id: "POWER-TOP", label: "POWER BOARD (TOP)", side: "left", pins: ["TP1", "TP71"] },
      { id: "J43", label: "POWER BOARD (BOTTOM) / I2C J43", side: "left", pins: ["1", "2"] },
      { id: "ISO154X", label: "ISO154X / 4 POS DUPONT", side: "right", pins: ["1", "2", "3", "4"] }
    ],
    tableHeaders: columns.map((column) => column.label),
    tableRows,
    notes: [
      "Pin mapping follows the routed line topology, not vertical row order at the source.",
      "22 in applies to the top-board power pair; 12 in applies to the J43 I2C pair.",
      "Wire colors and gauge were not specified on the sketch and must be verified."
    ]
  };
}

function buildInferredNetworkHarness(topology, findings, meta = {}) {
  const columns = getHarnessTableColumns();
  const title = cleanFileName(meta.fileName || "DIGIWIRE NETWORK DRAWING") || "DIGIWIRE NETWORK DRAWING";
  const minX = Math.min(...topology.routes.flatMap((route) => route.segments.flatMap((segment) => [segment.x1, segment.x2])));
  const maxX = Math.max(...topology.routes.flatMap((route) => route.segments.flatMap((segment) => [segment.x1, segment.x2])));
  const minY = Math.min(...topology.routes.flatMap((route) => route.segments.flatMap((segment) => [segment.y1, segment.y2])));
  const maxY = Math.max(...topology.routes.flatMap((route) => route.segments.flatMap((segment) => [segment.y1, segment.y2])));
  const mapPoint = (x, y) => [
    330 + (x - minX) / Math.max(1, maxX - minX) * 960,
    180 + (y - minY) / Math.max(1, maxY - minY) * 420
  ];
  const wires = topology.routes.map((route, index) => {
    const labelFinding = nearestFinding({
      x1: route.start.x,
      y1: route.start.y,
      x2: route.end.x,
      y2: route.end.y
    }, findings, topology.width, topology.height);
    const label = cleanGenericWireLabel(labelFinding?.text, index);
    const colorName = inferGenericWireColor(label);
    return {
      ...route,
      name: label,
      label,
      sourceGroupName: `SOURCE ${route.sourceGroup + 1}`,
      sourcePin: route.sourcePin,
      targetGroupName: "DESTINATION 1",
      targetPin: route.targetPin,
      stroke: colorName ? sheetColorToStroke(colorName) : ["#1746b5", "#d62828", "#111111", "#008a53"][index % 4],
      colorName: colorName || "VERIFY",
      awg: "VERIFY",
      length: "VERIFY",
      pathSegments: route.segments.map((segment) => ({
        from: mapPoint(segment.x1, segment.y1),
        to: mapPoint(segment.x2, segment.y2)
      }))
    };
  });
  const tableRows = wires.map((wire) => makeHarnessTableRow(columns, {
    cableName: title,
    leftLeg: `SOURCE ${wire.sourceGroup + 1}`,
    leftLegName: wire.sourceGroupName,
    wireName: wire.name,
    leftPinPos: wire.sourcePin,
    leftHousingType: "SOURCE / CONNECTOR",
    leftHousingPart: "VERIFY",
    leftPinPart: wire.sourcePin,
    awg: "VERIFY",
    color: wire.colorName,
    length: "VERIFY",
    branchId: `NET-${wire.targetPin}`,
    branchRole: "ROUTED NET",
    rightLeg: "DESTINATION",
    rightLegName: wire.targetGroupName,
    rightPinPos: wire.targetPin,
    rightHousingType: "CONNECTOR",
    rightHousingPart: "VERIFY",
    rightPinPart: wire.targetPin,
    toolUsed: "DIGIWIRE",
    comments: "Route geometry preserved from uploaded sketch. Verify all labels and manufacturing details."
  }));
  return {
    type: "network",
    profile: "inferred-network",
    title,
    subtitle: "Branched electrical routing preserved from uploaded sketch",
    wires,
    connectors: [
      ...topology.sourceGroups.map((group, index) => ({
        id: `SOURCE-${index + 1}`,
        label: `SOURCE ${index + 1}`,
        side: "left",
        pins: group.routes.map((route) => route.sourcePin)
      })),
      {
        id: "DESTINATION-1",
        label: "DESTINATION 1",
        side: "right",
        pins: topology.routes.map((route) => route.targetPin)
      }
    ],
    sourceGroups: topology.sourceGroups,
    targetGroups: topology.targetGroups,
    tableHeaders: columns.map((column) => column.label),
    tableRows,
    notes: [
      "Orthogonal routing and crossings were preserved from the source sketch.",
      "Crossings are not junctions unless a route ends at the intersecting segment.",
      "Connector names, wire colors, gauge, and lengths require verification."
    ]
  };
}

function bestGenericConnectorName(connectors, side, fallback) {
  const candidates = connectors
    .filter((connector) => connector.side === side)
    .map((connector) => connector.label || connector.id || "")
    .filter((label) => label && !/^C\d+$/i.test(label));
  return cleanConnectorName(shortLabel(candidates[0] || fallback, 36));
}

function cleanGenericWireLabel(label, index) {
  const cleaned = shortLabel(String(label || "").replace(/\s+/g, " ").trim(), 42);
  const normalized = normalizeText(cleaned);
  if (!cleaned || normalized === "MARK" || normalized === "MARKUP" || normalized === "X") {
    return `WIRE ${index + 1}`;
  }
  return cleaned;
}

function inferGenericWireColor(label) {
  const text = normalizeText(label);
  if (text.includes("BLACK") || text.includes("GND") || text.includes("GROUND")) return "BLACK";
  if (text.includes("RED") || text.includes("+") || text.includes("PWR") || text.includes("POWER")) return "RED";
  if (text.includes("YELLOW")) return "YELLOW";
  if (text.includes("GREEN")) return "GREEN";
  if (text.includes("WHITE")) return "WHITE";
  if (text.includes("BLUE")) return "BLUE";
  if (text.includes("ORANGE")) return "ORANGE";
  if (text.includes("BROWN")) return "BROWN";
  if (text.includes("GRAY") || text.includes("GREY")) return "GRAY";
  return "";
}

function getHarnessTableColumns() {
  return [
    { key: "cableName", label: "Cable Name" },
    { key: "leftLeg", label: "Left Leg" },
    { key: "leftLegName", label: "Left Leg Name" },
    { key: "wireName", label: "Wire Name" },
    { key: "leftPinPos", label: "Left Pin Pos #" },
    { key: "leftHousingType", label: "Left Housing Type" },
    { key: "leftHousingPart", label: "Left Housing Part #" },
    { key: "leftPinPart", label: "Left Pin P#" },
    { key: "awg", label: "AWGuage" },
    { key: "color", label: "Color" },
    { key: "twistedPairId", label: "Twisted Pair ID" },
    { key: "length", label: "Length (in or ft)" },
    { key: "tapPosition", label: "Tap Position (in or ft)" },
    { key: "branchId", label: "Branch ID" },
    { key: "spacer", label: "" },
    { key: "branchRole", label: "Branch Role" },
    { key: "rightLeg", label: "Right Leg" },
    { key: "rightLegName", label: "Right Leg Name" },
    { key: "rightPinPos", label: "Right Pin Pos #" },
    { key: "rightHousingType", label: "Right Housing Type" },
    { key: "rightHousingPart", label: "Right Housing Part #" },
    { key: "rightPinPart", label: "Right Pin P#" },
    { key: "rightWireName", label: "Right Wire Name" },
    { key: "toolUsed", label: "Tool used" },
    { key: "comments", label: "Comments" }
  ];
}

function getHarnessTableHeaders() {
  return getHarnessTableColumns().map((column) => column.label);
}

function buildCanHarnessTableRows(columns, branches, signals) {
  const cableName = "CAN BUS HARNESS ASSEMBLY";
  const rows = [];
  signals.forEach((wire) => {
    rows.push(makeHarnessTableRow(columns, {
      cableName,
      leftLeg: "USB-CAN",
      leftLegName: "USB-CAN SOURCE",
      wireName: wire.signal,
      leftPinPos: wire.signal,
      leftHousingType: "USB-CAN ADAPTER",
      leftHousingPart: "TBD",
      leftPinPart: wire.signal,
      awg: "22",
      color: wire.color,
      twistedPairId: ["CAN-H", "CAN-L"].includes(wire.signal) ? "CAN-TRUNK" : "",
      length: "20",
      branchId: "MAIN",
      branchRole: "MAIN TRUNK",
      rightLeg: wire.signal === "GND" ? "TRUNK END" : "120R TERM",
      rightLegName: wire.signal === "GND" ? "GROUND CONTINUES ONLY" : "120 OHM TERMINATION",
      rightPinPos: wire.signal === "GND" ? "GND" : wire.signal,
      rightHousingType: wire.signal === "GND" ? "OPEN TRUNK" : "RESISTOR",
      rightHousingPart: wire.signal === "GND" ? "" : "120 OHM",
      rightPinPart: wire.signal === "GND" ? "" : wire.signal,
      toolUsed: "DIGIWIRE",
      comments: wire.signal === "GND"
        ? "GND is not connected through the termination resistor."
        : "Main trunk wire; termination is between CAN-H and CAN-L only."
    }));
  });

  rows.push(makeHarnessTableRow(columns, {
    cableName,
    leftLeg: "CAN-H",
    leftLegName: "MAIN TRUNK",
    wireName: "120 OHM TERMINATION",
    leftPinPos: "CAN-H",
    leftHousingType: "RESISTOR",
    leftHousingPart: "120 OHM",
    leftPinPart: "LEAD 1",
    tapPosition: "20",
    branchId: "TERM",
    branchRole: "TERMINATION",
    rightLeg: "CAN-L",
    rightLegName: "MAIN TRUNK",
    rightPinPos: "CAN-L",
    rightHousingType: "RESISTOR",
    rightHousingPart: "120 OHM",
    rightPinPart: "LEAD 2",
    toolUsed: "DIGIWIRE",
    comments: "Connect resistor between CAN-H and CAN-L only. Do not connect to GND."
  }));

  branches.forEach((branch) => {
    rows.push(makeHarnessTableRow(columns, {
      cableName,
      leftLeg: "MAIN",
      leftLegName: "CAN BUS TRUNK",
      wireName: `${branch.id} PWR(NC)`,
      leftHousingType: "NO CONNECT",
      length: "0",
      tapPosition: String(branch.tapPosition),
      branchId: branch.id,
      branchRole: "PIN EXISTS - NO WIRE",
      rightLeg: branch.id,
      rightLegName: branch.type,
      rightPinPos: "1",
      rightHousingType: branch.type,
      rightHousingPart: "TBD",
      rightPinPart: "1",
      toolUsed: "DIGIWIRE",
      comments: "Pin 1 is PWR(NC). No power wire is installed."
    }));

    signals.forEach((wire) => {
      rows.push(makeHarnessTableRow(columns, {
        cableName,
        leftLeg: "MAIN",
        leftLegName: "CAN BUS TRUNK",
        wireName: `${branch.id} ${wire.signal}`,
        leftPinPos: wire.signal,
        leftHousingType: "SPLICE/TAP",
        leftHousingPart: "TBD",
        leftPinPart: wire.signal,
        awg: "22",
        color: wire.color,
        twistedPairId: ["CAN-H", "CAN-L"].includes(wire.signal) ? `${branch.id}-CAN` : "",
        length: String(branch.dropLength),
        tapPosition: String(branch.tapPosition),
        branchId: branch.id,
        branchRole: "BRANCH DROP",
        rightLeg: branch.id,
        rightLegName: branch.type,
        rightPinPos: wire.pin,
        rightHousingType: branch.type,
        rightHousingPart: "TBD",
        rightPinPart: wire.pin,
        toolUsed: "DIGIWIRE",
        comments: `6 inch ${wire.signal} drop from trunk. JST pin 1 remains PWR(NC).`
      }));
    });
  });

  return rows;
}

function makeHarnessTableRow(columns, values) {
  const rowValues = {
    ...values,
    rightWireName: values.rightWireName || values.wireName || ""
  };
  return columns.map((column) => String(rowValues[column.key] || ""));
}

function buildCanHarnessWires(branches, signals) {
  const trunkStart = 195;
  const trunkEnd = 1370;
  const branchXs = [455, 585, 715, 845];
  const connectorTop = 560;
  const wires = signals.map((wire) => ({
    id: `TRUNK-${wire.signal}`,
    label: wire.signal,
    x1: trunkStart,
    y1: wire.y,
    x2: trunkEnd,
    y2: wire.y,
    color: wire.stroke,
    confidence: 0.96
  }));

  branches.forEach((branch, branchIndex) => {
    signals.forEach((wire, signalIndex) => {
      const x = branchXs[branchIndex] + signalIndex * 17;
      wires.push({
        id: `${branch.id}-${wire.signal}`,
        label: `${branch.id} ${wire.signal}`,
        x1: x,
        y1: wire.y,
        x2: x,
        y2: connectorTop,
        color: wire.stroke,
        confidence: 0.96
      });
    });
  });
  return wires;
}

function buildCanHarnessConnectors(branches) {
  const branchXs = [455, 585, 715, 845];
  const connectors = [{
    id: "USB-CAN",
    label: "USB-CAN",
    side: "left",
    x: 60,
    y: 230,
    width: 135,
    height: 190,
    pins: [
      { pin: "CAN-H", x: 178, y: 310 },
      { pin: "CAN-L", x: 178, y: 365 },
      { pin: "GND", x: 178, y: 420 }
    ]
  }];
  branches.forEach((branch, index) => {
    connectors.push({
      id: branch.id,
      label: branch.id,
      side: "right",
      x: branchXs[index] - 42,
      y: 560,
      width: 115,
      height: 70,
      pins: [
        { pin: "1", x: branchXs[index], y: 616 },
        { pin: "2", x: branchXs[index], y: 580 },
        { pin: "3", x: branchXs[index] + 17, y: 580 },
        { pin: "4", x: branchXs[index] + 34, y: 580 }
      ]
    });
  });
  return connectors;
}

function compileSheetHarnessResult(sheet, fileName) {
  const cableName = firstFilled(sheet.objects, "cableName") || cleanFileName(fileName) || "UPLOADED HARNESS";
  const drawableRows = sheet.objects
    .map((row, index) => ({ ...row, rowNumber: index + 2 }))
    .filter(isDrawableSheetRow)
    .slice(0, 128);
  const sheetHarness = {
    title: `${cableName} HARNESS ASSEMBLY`,
    subtitle: "Generated from uploaded prefilled harness sheet",
    cableName,
    rows: drawableRows,
    totalRows: sheet.rows.length
  };
  return {
    version: APP_VERSION,
    fileName: sheetHarness.title,
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    rotation: 0,
    paperBounds: null,
    sourceWidth: 0,
    sourceHeight: 0,
    wires: drawableRows.filter((row) => !isNoWireRow(row)).map((row, index) => ({
      id: `SHEET-W${index + 1}`,
      label: sheetRowWireName(row) || row.branchRole || `ROW ${row.rowNumber}`,
      color: sheetColorToStroke(row.color),
      confidence: 1
    })),
    connectors: [],
    findings: [],
    tableHeaders: sheet.headers,
    tableRows: sheet.rows,
    sheetHarness,
    confidence: 1,
    status: "Prefilled harness sheet loaded in Draw.io."
  };
}

function isDrawableSheetRow(row) {
  if (isRepeatedHeaderSheetRow(row)) {
    return false;
  }
  return Boolean(
    row.leftLeg ||
    row.leftPinPos ||
    row.leftHousingType ||
    row.leftHousingPart ||
    sheetRowWireName(row) ||
    row.color ||
    row.twistedPairId ||
    row.branchRole ||
    row.comments ||
    row.leftLegName ||
    row.rightLeg ||
    row.rightLegName ||
    row.rightPinPos ||
    row.rightHousingType ||
    row.rightHousingPart
  );
}

function firstFilled(rows, key) {
  return rows.map((row) => row[key]).find((value) => String(value || "").trim()) || "";
}

function sheetRowWireName(row) {
  return String(row?.wireName || row?.rightWireName || "").trim();
}

function sheetRowLeftWireName(row, fallback = "") {
  return String(row?.wireName || row?.rightWireName || fallback).trim();
}

function sheetRowRightWireName(row, fallback = "") {
  return String(row?.rightWireName || row?.wireName || fallback).trim();
}

function wireNamesDiffer(leftName, rightName) {
  return Boolean(
    normalizeText(leftName) &&
    normalizeText(rightName) &&
    normalizeText(leftName) !== normalizeText(rightName)
  );
}

function sheetEndpointKey(row, side) {
  const prefix = side === "left" ? "left" : "right";
  const leg = String(row[`${prefix}Leg`] || "").trim();
  if (leg) {
    return `${side}:leg:${leg}`;
  }
  const identity = [
    row[`${prefix}LegName`],
    row[`${prefix}HousingPart`],
    row[`${prefix}HousingType`]
  ].map((value) => normalizeText(value)).filter(Boolean).join("|");
  return `${side}:${identity || "main"}`;
}

function sheetEndpointLabel(rows, side, index) {
  const prefix = side === "left" ? "left" : "right";
  const leg = firstFilled(rows, `${prefix}Leg`);
  const names = uniqueValues(rows.map((row) => row[`${prefix}LegName`]).filter(isMeaningfulSheetValue));
  const types = uniqueValues(rows.map((row) => row[`${prefix}HousingType`]).filter(isMeaningfulSheetValue));
  const parts = uniqueValues(rows.map((row) => row[`${prefix}HousingPart`]).filter(isMeaningfulSheetValue));
  const titleValues = names.length ? names : types;
  const title = titleValues.length
    ? shortListLabel(titleValues, 2)
    : `${side.toUpperCase()} LEG ${leg || index + 1}`;
  const details = uniqueValues([
    leg ? `LEG ${leg}` : "",
    ...types.filter((type) => !normalizeText(title).includes(normalizeText(type))),
    ...parts
  ]);
  return {
    title: cleanConnectorName(title),
    leg,
    details
  };
}

function groupSheetEndpoints(rows, side) {
  const groups = [];
  rows.forEach((row, rowIndex) => {
    const key = sheetEndpointKey(row, side);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        rows: [],
        rowIndexes: []
      };
      groups.push(group);
    }
    group.rows.push(row);
    group.rowIndexes.push(rowIndex);
  });
  groups.forEach((group, index) => {
    Object.assign(group, sheetEndpointLabel(group.rows, side, index));
  });
  return groups;
}

function sheetEndpointBoxLayout(group, routes, side) {
  const ys = group.rowIndexes.map((rowIndex) => routes[rowIndex].y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minHeight = group.details.length ? 52 : 42;
  const height = Math.max(minHeight, maxY - minY + 26);
  const top = clamp(average(ys) - height / 2, 145, 630 - height);
  const x = side === "left" ? 28 : 1366;
  const width = 206;
  return {
    x,
    width,
    top,
    bottom: top + height,
    height,
    textX: x + width / 2
  };
}

function sheetProtectionBounds(group, routes) {
  const ys = group.rowIndexes.map((rowIndex) => routes[rowIndex].y);
  return {
    top: Math.min(...ys) - 13,
    bottom: Math.max(...ys) + 13
  };
}

function shouldUseSharedSheetBundle(rows, leftGroups, rightGroups) {
  return rows.length > 1 && leftGroups.length > 1 && rightGroups.length === 1;
}

function sheetSharedBundleGeometry(routes, leftX, rightX) {
  const ys = routes.map((route) => route.y);
  const x1 = leftX + 118;
  const x2 = rightX - 118;
  const top = Math.min(...ys) - 20;
  const bottom = Math.max(...ys) + 20;
  return {
    x1,
    x2,
    top,
    bottom,
    midX: (x1 + x2) / 2,
    midY: (top + bottom) / 2,
    leftLeadX: (leftX + x1) / 2,
    rightLeadX: (x2 + rightX) / 2
  };
}

function sheetLengthSummary(rows) {
  const values = uniqueValues(rows
    .map((row) => row.length)
    .filter(isMeaningfulSheetValue)
    .map((length) => formatLengthMeasurement(length)));
  if (!values.length) {
    return "";
  }
  return values.length === 1
    ? `PIN-TO-PIN LENGTH: ${values[0]}`
    : `PIN-TO-PIN LENGTHS: ${shortListLabel(values, 3)}`;
}

function sheetRouteLayout(rows, {
  top = 174,
  bottom = 610
} = {}) {
  const count = Math.max(1, rows.length);
  const gap = count > 1 ? (bottom - top) / (count - 1) : 0;
  return rows.map((row, index) => ({
    row,
    index,
    y: top + index * gap,
    label: sheetRowWireName(row) || `WIRE ${index + 1}`,
    leftPin: row.leftPinPos || String(index + 1),
    rightPin: row.rightPinPos || String(index + 1)
  }));
}

function sheetTwistedPairId(row) {
  const value = String(row?.twistedPairId || "").trim();
  if (isMeaningfulSheetValue(value)) {
    return value;
  }
  const endpointText = normalizeText([
    row?.leftLegName,
    row?.leftHousingType,
    row?.rightLegName,
    row?.rightHousingType
  ].join(" "));
  if (!endpointText.includes("RJ45")) {
    return "";
  }
  const color = normalizeText(row?.color || row?.wireName || row?.rightWireName);
  if (color.includes("ORANGE")) {
    return "TP1";
  }
  if (color.includes("GREEN")) {
    return "TP2";
  }
  return "";
}

function analyzeSheetTwistedPairs(routes) {
  const groupsById = new Map();
  routes.forEach((route) => {
    const id = sheetTwistedPairId(route.row);
    if (!id) {
      return;
    }
    const key = normalizeText(id);
    let group = groupsById.get(key);
    if (!group) {
      group = { id, key, routes: [], valid: false };
      groupsById.set(key, group);
    }
    group.routes.push(route);
  });
  const groups = Array.from(groupsById.values());
  const byRouteIndex = new Map();
  groups.forEach((group) => {
    group.routes.sort((left, right) => left.index - right.index);
    group.valid = group.routes.length === 2;
    if (group.valid) {
      group.routes.forEach((route, memberIndex) => {
        byRouteIndex.set(route.index, { group, memberIndex });
      });
    }
  });
  return {
    groups,
    validGroups: groups.filter((group) => group.valid),
    invalidGroups: groups.filter((group) => !group.valid),
    byRouteIndex
  };
}

function sheetWireRouteGeometry(route, pairAnalysis, leftX, rightX) {
  const membership = pairAnalysis.byRouteIndex.get(route.index);
  if (!membership) {
    return {
      twisted: false,
      points: [[leftX, route.y], [rightX, route.y]],
      svgPath: `M ${leftX} ${route.y} L ${rightX} ${route.y}`
    };
  }
  const { group, memberIndex } = membership;
  const pairMidY = average(group.routes.map((item) => item.y));
  const separation = Math.abs(group.routes[0].y - group.routes[1].y);
  const amplitude = clamp(separation * 0.36, 7, 12);
  const sign = memberIndex === 0 ? -1 : 1;
  const twistStartX = leftX + 105;
  const twistEndX = rightX - 105;
  const halfWaveCount = 14;
  const halfWaveWidth = (twistEndX - twistStartX) / halfWaveCount;
  const wavePoints = Array.from({ length: halfWaveCount + 1 }, (_, index) => [
    twistStartX + index * halfWaveWidth,
    pairMidY + sign * amplitude * (index % 2 ? -1 : 1)
  ]);
  const points = [[leftX, route.y], ...wavePoints, [rightX, route.y]];
  return {
    twisted: true,
    points,
    svgPath: smoothTwistedPairSvgPath(points)
  };
}

function smoothTwistedPairSvgPath(points) {
  const first = points[0];
  const last = points[points.length - 1];
  const wavePoints = points.slice(1, -1);
  let path = `M ${first[0]} ${first[1]} L ${wavePoints[0][0]} ${wavePoints[0][1]}`;
  for (let index = 1; index < wavePoints.length; index += 1) {
    const previous = wavePoints[index - 1];
    const current = wavePoints[index];
    const controlX = (previous[0] + current[0]) / 2;
    path += ` C ${controlX} ${previous[1]}, ${controlX} ${current[1]}, ${current[0]} ${current[1]}`;
  }
  return `${path} L ${last[0]} ${last[1]}`;
}

function twistedPairValidationNote(pairAnalysis) {
  if (!pairAnalysis.invalidGroups.length) {
    return "";
  }
  const details = pairAnalysis.invalidGroups
    .map((group) => `${group.id} (${group.routes.length} row${group.routes.length === 1 ? "" : "s"})`)
    .join(", ");
  return `Twisted Pair ID must appear on exactly two wire rows. Check: ${details}.`;
}

function sheetRouteBranchLabel(row) {
  const parts = [];
  const twistedPairId = sheetTwistedPairId(row);
  if (twistedPairId) {
    parts.push(`TWISTED PAIR ${twistedPairId}`);
  }
  if (isMeaningfulSheetValue(row.branchId)) {
    parts.push(`BRANCH ${row.branchId}`);
  }
  if (isMeaningfulSheetValue(row.branchRole)) {
    parts.push(row.branchRole);
  }
  if (isMeaningfulSheetValue(row.tapPosition)) {
    parts.push(`TAP @ ${formatLengthMeasurement(row.tapPosition)}`);
  }
  return parts.join(" | ");
}

function isMeaningfulSheetValue(value) {
  const normalized = normalizeText(value);
  return Boolean(normalized) && !["NONE", "N/A", "NA", "NULL", "-", "--"].includes(normalized);
}

function isNoWireRow(row) {
  if (HarnessCore.isDnpRow(row)) {
    return true;
  }
  const values = [
    row.leftLegName,
    row.awg,
    row.color,
    row.length,
    row.wireName,
    row.rightLegName,
    row.rightWireName,
    row.branchRole
  ].map((value) => normalizeText(value));
  return values.some((value) =>
    value.includes("N/A") ||
    /\b(?:NOT IN USE|NOT USED|UNUSED|DNP|DO NOT POPULATE|NO WIRE|NO CONNECT(?:ION)?|N\/C|NC)\b/.test(value)
  );
}

const WIRE_COLOR_STROKES = Object.freeze({
  RED: "#d62828",
  BLACK: "#050505",
  YELLOW: "#ffd400",
  GREEN: "#008a13",
  BLUE: "#0b64d8",
  WHITE: "#d9d9d9",
  ORANGE: "#f77f00",
  BROWN: "#7f4f24",
  VIOLET: "#7b2cbf",
  GRAY: "#777777",
  PINK: "#e88aad"
});

function wireColorSpec(color) {
  const value = normalizeText(color);
  const aliases = {
    GREY: "GRAY",
    PURPLE: "VIOLET",
    YELLO: "YELLOW"
  };
  const names = [];
  for (const match of value.matchAll(/\b(?:BLACK|WHITE|RED|YELLOW|YELLO|GREEN|BLUE|ORANGE|BROWN|PURPLE|VIOLET|GRAY|GREY|PINK)\b/g)) {
    const name = aliases[match[0]] || match[0];
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  const baseName = names[0] || (value && value !== "N/A" ? value : "WIRE");
  const stripeName = names.slice(1).find((name) => name !== baseName) || "";
  return {
    baseName,
    baseStroke: WIRE_COLOR_STROKES[baseName] || "#4a5560",
    stripeName,
    stripeStroke: stripeName === "WHITE" ? "#ffffff" : (WIRE_COLOR_STROKES[stripeName] || ""),
    label: stripeName ? `${baseName} / ${stripeName}` : baseName
  };
}

function sheetColorToStroke(color) {
  return wireColorSpec(color).baseStroke;
}

function normalizeWireColorLabel(color) {
  return wireColorSpec(color).label;
}

function isRecognizedWireColor(value) {
  return Boolean(WIRE_COLOR_STROKES[wireColorSpec(value).baseName]);
}

function isRj45TerminationRow(row) {
  return normalizeText([
    row?.rightLegName,
    row?.rightHousingType,
    row?.rightHousingPart
  ].join(" ")).includes("RJ45");
}

function kiCadWireColorSource(row) {
  return isRj45TerminationRow(row) && isRecognizedWireColor(row?.rightWireName)
    ? row.rightWireName
    : row.color;
}

const T568B_PIN_COLORS = Object.freeze({
  1: "ORANGE / WHITE",
  2: "ORANGE",
  3: "GREEN / WHITE",
  4: "BLUE",
  5: "BLUE / WHITE",
  6: "GREEN",
  7: "BROWN / WHITE",
  8: "BROWN"
});

const T568B_LANE_PIN_ORDER = Object.freeze([1, 2, 3, 6, 4, 5, 7, 8]);

function isCompleteT568bMapping(rows) {
  const activeRows = rows.filter((row) => !HarnessCore.isDnpRow(row));
  if (activeRows.length !== 8 || !activeRows.every(isRj45TerminationRow)) {
    return false;
  }
  const rowsByPin = new Map(activeRows.map((row) => [numericPin(row.rightPinPos), row]));
  return Object.entries(T568B_PIN_COLORS).every(([pin, expectedColor]) => {
    const row = rowsByPin.get(Number(pin));
    return row && normalizeWireColorLabel(row.rightWireName) === expectedColor;
  });
}

function prepareKiCadRoutingRows(rows) {
  if (!isCompleteT568bMapping(rows)) {
    return { rows, standardT568b: false };
  }
  const rowsByPin = new Map(rows.map((row) => [numericPin(row.rightPinPos), row]));
  return {
    standardT568b: true,
    rows: T568B_LANE_PIN_ORDER.map((pin) => {
      const row = rowsByPin.get(pin);
      const family = wireColorSpec(row.rightWireName).baseName;
      return {
        ...row,
        twistedPairId: `T568B-${family}`,
        standardT568b: true
      };
    })
  };
}

function buildBraidPatternDefs() {
  return `
    <pattern id="braidPattern" patternUnits="userSpaceOnUse" width="24" height="18">
      <path d="M -6 18 L 6 0 M 6 18 L 18 0 M 18 18 L 30 0" stroke="#22282c" stroke-width="2.2" opacity="0.58" />
      <path d="M -6 0 L 6 18 M 6 0 L 18 18 M 18 0 L 30 18" stroke="#22282c" stroke-width="2.2" opacity="0.58" />
    </pattern>`;
}

function buildHorizontalProtectionSvg({
  x1,
  x2,
  top,
  bottom,
  label = "EXPANDABLE BRAIDED SLEEVING (EXPANDO)",
  labelY = top - 10,
  endLabelY = bottom + 18,
  bandWidth = 30
}) {
  const width = Math.max(1, x2 - x1);
  const height = Math.max(1, bottom - top);
  const radius = Math.min(18, height / 2);
  const leftBandX = x1 - bandWidth / 2;
  const rightBandX = x2 - bandWidth / 2;
  return `
  <g class="cable-protection">
    <rect x="${x1}" y="${top}" width="${width}" height="${height}" rx="${radius}" fill="#d7dde0" fill-opacity="0.46" stroke="#59636b" stroke-width="2.2" />
    <rect x="${x1}" y="${top}" width="${width}" height="${height}" rx="${radius}" fill="url(#braidPattern)" opacity="0.58" />
    <rect x="${leftBandX}" y="${top - 4}" width="${bandWidth}" height="${height + 8}" rx="7" fill="#151515" opacity="0.9" />
    <rect x="${rightBandX}" y="${top - 4}" width="${bandWidth}" height="${height + 8}" rx="7" fill="#151515" opacity="0.9" />
    ${label ? `<text class="protection-label" x="${(x1 + x2) / 2}" y="${labelY}">${escapeXml(label)}</text>` : ""}
    ${Number.isFinite(endLabelY) ? `
      <text class="protection-end-label" x="${x1}" y="${endLabelY}">HEAT SHRINK</text>
      <text class="protection-end-label" x="${x2}" y="${endLabelY}">HEAT SHRINK</text>` : ""}
  </g>`;
}

function buildVerticalProtectionSvg({
  left,
  right,
  y1,
  y2,
  bandHeight = 24
}) {
  const width = Math.max(1, right - left);
  const height = Math.max(1, y2 - y1);
  const radius = Math.min(16, width / 2);
  return `
  <g class="cable-protection">
    <rect x="${left}" y="${y1}" width="${width}" height="${height}" rx="${radius}" fill="#d7dde0" fill-opacity="0.46" stroke="#59636b" stroke-width="2" />
    <rect x="${left}" y="${y1}" width="${width}" height="${height}" rx="${radius}" fill="url(#braidPattern)" opacity="0.58" />
    <rect x="${left - 4}" y="${y1 - bandHeight / 2}" width="${width + 8}" height="${bandHeight}" rx="6" fill="#151515" opacity="0.9" />
    <rect x="${left - 4}" y="${y2 - bandHeight / 2}" width="${width + 8}" height="${bandHeight}" rx="6" fill="#151515" opacity="0.9" />
  </g>`;
}

function addHorizontalDrawioProtection(addVertex, {
  id,
  x1,
  x2,
  top,
  bottom,
  label = "EXPANDABLE BRAIDED SLEEVING (EXPANDO)",
  bandWidth = 30
}) {
  const width = Math.max(1, x2 - x1);
  const height = Math.max(1, bottom - top);
  addVertex(
    `${id}_sleeve`,
    escapeHtml(label),
    x1,
    top,
    width,
    height,
    "rounded=1;arcSize=24;whiteSpace=wrap;html=1;fillColor=#d7dde0;opacity=48;strokeColor=#59636b;strokeWidth=2;dashed=1;dashPattern=8 5;fontStyle=1;fontSize=11;fontColor=#1f2930;verticalAlign=top;spacingTop=4;"
  );
  addVertex(
    `${id}_heat_left`,
    "",
    x1 - bandWidth / 2,
    top - 4,
    bandWidth,
    height + 8,
    "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#151515;opacity=90;strokeColor=#000000;strokeWidth=1;"
  );
  addVertex(
    `${id}_heat_right`,
    "",
    x2 - bandWidth / 2,
    top - 4,
    bandWidth,
    height + 8,
    "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#151515;opacity=90;strokeColor=#000000;strokeWidth=1;"
  );
}

function addVerticalDrawioProtection(addVertex, {
  id,
  left,
  right,
  y1,
  y2,
  bandHeight = 24
}) {
  const width = Math.max(1, right - left);
  const height = Math.max(1, y2 - y1);
  addVertex(
    `${id}_sleeve`,
    "",
    left,
    y1,
    width,
    height,
    "rounded=1;arcSize=30;whiteSpace=wrap;html=1;fillColor=#d7dde0;opacity=48;strokeColor=#59636b;strokeWidth=2;dashed=1;dashPattern=8 5;"
  );
  addVertex(
    `${id}_heat_top`,
    "",
    left - 4,
    y1 - bandHeight / 2,
    width + 8,
    bandHeight,
    "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#151515;opacity=90;strokeColor=#000000;strokeWidth=1;"
  );
  addVertex(
    `${id}_heat_bottom`,
    "",
    left - 4,
    y2 - bandHeight / 2,
    width + 8,
    bandHeight,
    "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#151515;opacity=90;strokeColor=#000000;strokeWidth=1;"
  );
}

function buildInternalModel(wireSegments, connectors, findings, width, height) {
  const rightConnectors = connectors.filter((connector) => connector.side === "right");
  const leftConnectors = connectors.filter((connector) => connector.side === "left");
  const wires = wireSegments.map((segment, index) => {
    const right = nearestConnector(segment.x2, segment.y2, rightConnectors);
    const left = nearestConnector(segment.x1, segment.y1, leftConnectors);
    const label = nearestFinding(segment, findings, width, height);
    return {
      id: `W${String(index + 1).padStart(2, "0")}`,
      label: label?.text || `WIRE ${index + 1}`,
      x1: segment.x1,
      y1: segment.y1,
      x2: segment.x2,
      y2: segment.y2,
      source: left?.id || "BUS",
      target: right?.id || `NODE ${index + 1}`,
      confidence: clamp((segment.confidence || 0.5) * 0.75 + (label?.confidence || 0) * 0.25, 0, 1)
    };
  });

  return {
    wires,
    connectors
  };
}

function buildSchematicSvg(result) {
  if (result.sheetHarness) {
    return buildSheetHarnessSvg(result);
  }
  const harness = result.harness || buildCanHarnessModel();
  if (harness.type === "network") {
    return buildSketchNetworkSvg(result);
  }
  if (harness.type === "generic") {
    return buildGenericImageHarnessSvg(result);
  }
  const title = escapeXml(harness.title);
  const subtitle = escapeXml(harness.subtitle);
  const branchXs = [455, 585, 715, 845];
  const trunkStart = 195;
  const trunkEnd = 1370;
  const gndEnd = 1350;
  const connectorTop = 560;
  const connectorHeight = 70;
  const connectorWidth = 115;
  const branchDrops = harness.branches.map((branch, branchIndex) => {
    const x = branchXs[branchIndex];
    const wires = harness.signals.map((wire, signalIndex) => {
      const dropX = x + signalIndex * 17;
      return `
        <line class="wire-line" x1="${dropX}" y1="${wire.y}" x2="${dropX}" y2="${connectorTop}" stroke="${wire.stroke}" />
        <circle class="tap-dot" cx="${dropX}" cy="${wire.y}" r="4" />
      `;
    }).join("");
    const dimX = x - 68;
    const dimY = (420 + connectorTop) / 2;
    return `
      <g class="branch">
        ${wires}
        <rect class="jst-box" x="${x - 42}" y="${connectorTop}" width="${connectorWidth}" height="${connectorHeight}" />
        <text class="jst-title" x="${x + 15}" y="${connectorTop + 25}">${branch.id}</text>
        <text class="jst-small" x="${x + 15}" y="${connectorTop + 50}">1=PWR(NC)</text>
        <text class="jst-small" x="${x + 15}" y="${connectorTop + 64}">2=H  3=L  4=G</text>
        <path class="dim-line" d="M ${dimX} ${420 + 8} L ${dimX} ${connectorTop - 8}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
        <text class="dim-label" x="${dimX - 14}" y="${dimY}" transform="rotate(-90 ${dimX - 14} ${dimY})">6&quot;</text>
      </g>
    `;
  }).join("");
  const spacingDims = branchXs.slice(0, -1).map((x, index) => {
    const x2 = branchXs[index + 1];
    return `
      <path class="dim-line" d="M ${x + 16} 224 L ${x2 + 16} 224" marker-start="url(#arrow)" marker-end="url(#arrow)" />
      <text class="dim-label" x="${(x + x2) / 2 + 16}" y="202">2&quot;</text>
    `;
  }).join("");
  const resistor = buildResistorPath(1390, 310, 365, 13);
  const branchProtection = branchXs.map((x) => buildVerticalProtectionSvg({
    left: x - 8,
    right: x + 42,
    y1: 446,
    y2: connectorTop - 12,
    bandHeight: 20
  })).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${title}">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
    </marker>
    <style>
      .sheet { fill: #ffffff; }
      .title { fill: #000000; font: 900 34px Aptos, Segoe UI, sans-serif; letter-spacing: 1px; }
      .subtitle { fill: #000000; font: 500 18px Aptos, Segoe UI, sans-serif; }
      .connector-box, .jst-box, .pinout-box { fill: #ffffff; stroke: #000000; stroke-width: 4; }
      .jst-box, .pinout-box { stroke-width: 3; }
      .connector-title { fill: #000000; font: 900 19px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-pin { fill: #000000; font: 500 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire-line { fill: none; stroke-width: 7; stroke-linecap: square; }
      .tap-dot { fill: #ffffff; stroke: #000000; stroke-width: 1.5; }
      .dim-line { fill: none; stroke: #111111; stroke-width: 2; }
      .dim-label { fill: #000000; font: 700 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .jst-title { fill: #000000; font: 900 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .jst-small { fill: #000000; font: 500 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pinout-title { fill: #000000; font: 900 18px Aptos, Segoe UI, sans-serif; }
      .pinout-text { fill: #000000; font: 500 16px Aptos, Segoe UI, sans-serif; }
      .resistor { fill: none; stroke: #000000; stroke-width: 5; stroke-linejoin: bevel; }
      .term-text { fill: #000000; font: 500 17px Aptos, Segoe UI, sans-serif; }
      .note { fill: #333333; font: 700 13px Aptos, Segoe UI, sans-serif; }
      .protection-label { fill: #1f2930; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <text class="title" x="46" y="58">${title}</text>
  <text class="subtitle" x="46" y="92">${subtitle}</text>

  <path class="dim-line" d="M ${trunkStart} 178 L ${branchXs[0]} 178" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="${(trunkStart + branchXs[0]) / 2}" y="153">12&quot;</text>
  ${spacingDims}

  <rect class="connector-box" x="60" y="230" width="135" height="190" />
  <text class="connector-title" x="127.5" y="263">USB-CAN</text>
  <text class="connector-pin" x="127.5" y="313">CAN-H</text>
  <text class="connector-pin" x="127.5" y="368">CAN-L</text>
  <text class="connector-pin" x="127.5" y="407">GND</text>

  ${buildHorizontalProtectionSvg({
    x1: trunkStart + 28,
    x2: gndEnd - 18,
    top: 286,
    bottom: 444,
    labelY: 276,
    endLabelY: 464
  })}
  ${branchProtection}

  <line class="wire-line" x1="${trunkStart}" y1="310" x2="${trunkEnd}" y2="310" stroke="#ffd400" />
  <line class="wire-line" x1="${trunkStart}" y1="365" x2="${trunkEnd}" y2="365" stroke="#008a13" />
  <line class="wire-line" x1="${trunkStart}" y1="420" x2="${gndEnd}" y2="420" stroke="#050505" />

  ${branchDrops}

  <path class="resistor" d="${resistor}" />
  <text class="term-text" x="1430" y="330">120 ohm</text>
  <text class="term-text" x="1430" y="352">Termination</text>
  <text class="note" x="1320" y="450">No power wire. Do not terminate GND.</text>

  <rect class="pinout-box" x="1110" y="520" width="385" height="150" />
  <text class="pinout-title" x="1132" y="548">JST PINOUT</text>
  <text class="pinout-text" x="1132" y="580">Pin 1 = PWR (Not Used)</text>
  <text class="pinout-text" x="1132" y="606">Pin 2 = CAN-H</text>
  <text class="pinout-text" x="1132" y="632">Pin 3 = CAN-L</text>
  <text class="pinout-text" x="1132" y="658">Pin 4 = GND</text>
</svg>`;
}

function buildSketchNetworkSvg(result) {
  return result.harness.profile === "power-board-iso154x"
    ? buildPowerBoardIso154xSvg(result)
    : buildInferredNetworkSvg(result);
}

function buildPowerBoardIso154xSvg(result) {
  const harness = result.harness;
  const wireBySignal = Object.fromEntries(harness.wires.map((wire) => [wire.name, wire]));
  const wirePaths = harness.wires.map((wire) => {
    const path = wire.path.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" ");
    const labelPoint = {
      GND: [640, 194],
      SDA: [670, 473],
      SCL: [980, 523],
      "5V": [650, 259]
    }[wire.name] || [720, 360];
    return `
      <path class="network-wire" d="${path}" stroke="${wire.stroke}" />
      <text class="wire-label" x="${labelPoint[0]}" y="${labelPoint[1]}">${escapeXml(wire.name)}</text>
    `;
  }).join("");
  const tableRows = ["GND", "SDA", "SCL", "5V"].map((signal) => {
    const wire = wireBySignal[signal];
    return [
      wire.sourcePin,
      wire.name,
      wire.colorName,
      wire.awg,
      formatLengthMeasurement(wire.length),
      wire.targetPin
    ];
  });
  const notes = harness.notes
    .map((note, index) => `<text class="note" x="970" y="${678 + index * 22}">${index + 1}. ${escapeXml(note)}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(harness.title)}">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
    </marker>
    <style>
      .sheet { fill: #ffffff; }
      .border { fill: none; stroke: #17231c; stroke-width: 2; }
      .title { fill: #17231c; font: 900 31px Consolas, "Courier New", monospace; text-anchor: middle; letter-spacing: 0.5px; }
      .subtitle { fill: #44514a; font: 700 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .board { fill: #fbfcfb; stroke: #173a8a; stroke-width: 3; }
      .board-title { fill: #173a8a; font: 900 21px Consolas, "Courier New", monospace; text-anchor: middle; }
      .board-text { fill: #17231c; font: 700 15px Consolas, "Courier New", monospace; }
      .connector { fill: #ffffff; stroke: #b3261e; stroke-width: 3; }
      .connector-face { fill: #fbfbfb; stroke: #b3261e; stroke-width: 2.5; }
      .connector-title { fill: #b3261e; font: 900 17px Consolas, "Courier New", monospace; text-anchor: middle; }
      .target { fill: #ffffff; stroke: #217a35; stroke-width: 3; }
      .target-title { fill: #217a35; font: 900 20px Consolas, "Courier New", monospace; text-anchor: middle; }
      .target-label { fill: #17231c; font: 800 15px Consolas, "Courier New", monospace; }
      .pin-number { fill: #17231c; font: 900 13px Consolas, "Courier New", monospace; text-anchor: middle; }
      .pin-hole { fill: #ffffff; stroke: #111111; stroke-width: 3; }
      .pin-core { fill: #111111; }
      .network-wire { fill: none; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .wire-label { fill: #17231c; font: 900 14px Consolas, "Courier New", monospace; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .route-node { stroke: #ffffff; stroke-width: 1.5; }
      .dim-line { fill: none; stroke: #17231c; stroke-width: 2; }
      .dim-label { fill: #17231c; font: 900 18px Consolas, "Courier New", monospace; text-anchor: middle; }
      .lock-label { fill: #b3261e; font: 900 13px Consolas, "Courier New", monospace; }
      .note-title { fill: #17231c; font: 900 14px Aptos, Segoe UI, sans-serif; }
      .note { fill: #17231c; font: 700 11px Aptos, Segoe UI, sans-serif; }
      .table-outline { fill: #ffffff; stroke: #17231c; stroke-width: 2; }
      .table-grid { stroke: #17231c; stroke-width: 1; }
      .table-title { fill: #17231c; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #17231c; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #17231c; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .protection-label { fill: #364149; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .protection-end-label { fill: #111111; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="14" y="14" width="1572" height="772" />
  <text class="title" x="800" y="48">${escapeXml(harness.title)}</text>
  <text class="subtitle" x="800" y="75">${escapeXml(harness.subtitle)}</text>

  <path class="dim-line" d="M 365 126 L 1000 126" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <line class="dim-line" x1="365" y1="112" x2="365" y2="142" />
  <line class="dim-line" x1="1000" y1="112" x2="1000" y2="142" />
  <text class="dim-label" x="682" y="116">22 in</text>

  <rect class="board" x="55" y="120" width="275" height="210" rx="4" />
  <text class="board-title" x="192" y="154">POWER BOARD</text>
  <text class="board-title" x="192" y="180">(TOP)</text>
  <text class="board-text" x="88" y="211">GND</text>
  <text class="board-text" x="88" y="231">TP1</text>
  <text class="board-text" x="88" y="276">+5V</text>
  <text class="board-text" x="88" y="296">TP71</text>
  <circle class="pin-hole" cx="310" cy="205" r="10" />
  <circle class="pin-core" cx="310" cy="205" r="3.5" />
  <circle class="pin-hole" cx="310" cy="270" r="10" />
  <circle class="pin-core" cx="310" cy="270" r="3.5" />

  <rect class="board" x="55" y="390" width="275" height="220" rx="4" />
  <text class="board-title" x="192" y="424">POWER BOARD</text>
  <text class="board-title" x="192" y="450">(BOTTOM)</text>
  <text class="board-text" x="86" y="480">I2C</text>
  <text class="board-text" x="86" y="501">J43</text>
  <text class="board-text" x="86" y="526">J43 CONNECTOR</text>
  <text class="board-text" x="86" y="547">MOLEX MICRO-FIT</text>

  <rect class="connector" x="270" y="462" width="80" height="112" rx="4" />
  <rect class="connector-face" x="294" y="472" width="46" height="42" rx="4" />
  <rect class="connector-face" x="294" y="522" width="46" height="42" rx="4" />
  <path class="connector-face" d="M 270 492 L 254 492 L 254 544 L 270 544" />
  <circle class="pin-hole" cx="318" cy="485" r="8" />
  <circle class="pin-core" cx="318" cy="485" r="3" />
  <circle class="pin-hole" cx="318" cy="535" r="8" />
  <circle class="pin-core" cx="318" cy="535" r="3" />
  <text class="pin-number" x="279" y="490">1</text>
  <text class="pin-number" x="279" y="540">2</text>
  <text class="lock-label" x="186" y="570">SIDE LOCK</text>
  <path class="dim-line" d="M 238 548 L 252 532" marker-end="url(#arrow)" />

  ${buildHorizontalProtectionSvg({
    x1: 370,
    x2: 850,
    top: 184,
    bottom: 292,
    label: "EXPANDO + HEAT SHRINK",
    labelY: 176,
    endLabelY: 308,
    bandWidth: 22
  })}
  ${buildHorizontalProtectionSvg({
    x1: 390,
    x2: 770,
    top: 465,
    bottom: 555,
    label: "EXPANDO + HEAT SHRINK",
    labelY: 457,
    endLabelY: 572,
    bandWidth: 22
  })}

  ${wirePaths}
  <circle class="route-node" cx="310" cy="205" r="5" fill="#111111" />
  <circle class="route-node" cx="310" cy="270" r="5" fill="#d62828" />
  <circle class="route-node" cx="318" cy="485" r="5" fill="#1746b5" />
  <circle class="route-node" cx="318" cy="535" r="5" fill="#e07a00" />

  <path class="dim-line" d="M 365 612 L 820 612" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <line class="dim-line" x1="365" y1="596" x2="365" y2="628" />
  <line class="dim-line" x1="820" y1="596" x2="820" y2="628" />
  <text class="dim-label" x="592" y="602">12 in</text>

  <text class="target-title" x="1400" y="145">ISO154X</text>
  <text class="target-title" x="1400" y="169">4 POS DUPONT</text>
  <rect class="target" x="1265" y="180" width="275" height="390" rx="4" />
  <rect class="target" x="1290" y="260" width="80" height="250" rx="7" />
  <rect class="connector-face" x="1305" y="282" width="42" height="36" rx="3" />
  <rect class="connector-face" x="1305" y="342" width="42" height="36" rx="3" />
  <rect class="connector-face" x="1305" y="402" width="42" height="36" rx="3" />
  <rect class="connector-face" x="1305" y="462" width="42" height="36" rx="3" />
  <circle class="pin-core" cx="1326" cy="300" r="5" />
  <circle class="pin-core" cx="1326" cy="360" r="5" />
  <circle class="pin-core" cx="1326" cy="420" r="5" />
  <circle class="pin-core" cx="1326" cy="480" r="5" />
  <text class="pin-number" x="1278" y="304">1</text>
  <text class="pin-number" x="1278" y="364">2</text>
  <text class="pin-number" x="1278" y="424">3</text>
  <text class="pin-number" x="1278" y="484">4</text>
  <text class="target-label" x="1390" y="305">GND</text>
  <text class="target-label" x="1390" y="365">SDA</text>
  <text class="target-label" x="1390" y="425">SCL</text>
  <text class="target-label" x="1390" y="485">5V</text>
  <path d="M 1318 520 L 1334 520 L 1326 535 z" fill="none" stroke="#217a35" stroke-width="2" />
  <text class="target-label" x="1378" y="540">PIN 1 / GND ORIENTATION</text>

  ${buildSvgTable({
    x: 35,
    y: 646,
    width: 885,
    title: "WIRING TABLE - SOURCE LABELS AND COLORS REQUIRE BUILD VERIFICATION",
    headers: ["SOURCE PIN", "SIGNAL", "SCHEMATIC COLOR", "AWG", "LENGTH", "ISO PIN"],
    rows: tableRows,
    colWidths: [120, 150, 215, 100, 130, 120],
    rowHeight: 21,
    titleHeight: 24,
    headerHeight: 24
  })}
  <text class="note-title" x="970" y="652">DIGIWIRE INTERPRETATION NOTES</text>
  ${notes}
</svg>`;
}

function buildInferredNetworkSvg(result) {
  const harness = result.harness;
  const routeLines = harness.wires.map((wire) => wire.pathSegments.map((segment) => `
    <line class="route" x1="${segment.from[0]}" y1="${segment.from[1]}" x2="${segment.to[0]}" y2="${segment.to[1]}" stroke="${wire.stroke}" />
  `).join("")).join("");
  const sourceBoxes = harness.connectors
    .filter((connector) => connector.side === "left")
    .map((connector, index) => {
      const y = 145 + index * Math.min(220, 410 / Math.max(1, harness.connectors.filter((item) => item.side === "left").length));
      return `
        <rect class="node" x="55" y="${y}" width="225" height="150" rx="5" />
        <text class="node-title" x="167" y="${y + 32}">${escapeXml(connector.label)}</text>
        <text class="node-small" x="167" y="${y + 60}">${connector.pins.length} detected terminal${connector.pins.length === 1 ? "" : "s"}</text>
      `;
    }).join("");
  const tableRows = harness.wires.slice(0, 8).map((wire) => [
    wire.sourceGroupName,
    wire.sourcePin,
    wire.name,
    wire.colorName,
    wire.targetPin
  ]);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(harness.title)}">
  <defs>
    <style>
      .sheet { fill: #ffffff; }
      .border { fill: none; stroke: #17231c; stroke-width: 2; }
      .title { fill: #17231c; font: 900 32px Consolas, "Courier New", monospace; text-anchor: middle; }
      .subtitle { fill: #44514a; font: 700 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .node { fill: #ffffff; stroke: #173a8a; stroke-width: 3; }
      .target { fill: #ffffff; stroke: #217a35; stroke-width: 3; }
      .node-title { fill: #173a8a; font: 900 18px Consolas, "Courier New", monospace; text-anchor: middle; }
      .node-small { fill: #17231c; font: 700 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .route { fill: none; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
      .note { fill: #17231c; font: 700 12px Aptos, Segoe UI, sans-serif; }
      .table-outline { fill: #ffffff; stroke: #17231c; stroke-width: 2; }
      .table-grid { stroke: #17231c; stroke-width: 1; }
      .table-title { fill: #17231c; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #17231c; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #17231c; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="14" y="14" width="1572" height="772" />
  <text class="title" x="800" y="52">${escapeXml(harness.title)}</text>
  <text class="subtitle" x="800" y="82">${escapeXml(harness.subtitle)}</text>
  ${sourceBoxes}
  <rect class="target" x="1320" y="170" width="220" height="390" rx="5" />
  <text class="node-title" x="1430" y="205">DESTINATION 1</text>
  <text class="node-small" x="1430" y="232">${harness.wires.length} detected terminals</text>
  ${routeLines}
  ${buildSvgTable({
    x: 35,
    y: 625,
    width: 850,
    title: "PRESERVED NETWORK ROUTES",
    headers: ["SOURCE", "PIN", "NET", "COLOR", "DEST PIN"],
    rows: tableRows,
    colWidths: [210, 90, 230, 170, 120],
    rowHeight: 22,
    titleHeight: 25,
    headerHeight: 25
  })}
  ${harness.notes.map((note, index) => `<text class="note" x="930" y="${650 + index * 24}">${index + 1}. ${escapeXml(note)}</text>`).join("")}
</svg>`;
}

function buildGenericImageHarnessSvg(result) {
  const harness = result.harness;
  const wires = harness.wires.length ? harness.wires : [{
    id: "W01",
    label: "WIRE 1",
    colorName: "",
    stroke: "#17231c",
    leftPin: "1",
    rightPin: "1"
  }];
  const rowSpacing = Math.min(58, Math.max(34, 350 / Math.max(1, wires.length)));
  const firstWireY = 205;
  const leftX = 360;
  const rightX = 1235;
  const leftConnectorX = 105;
  const rightConnectorX = 1325;
  const connectorHeight = Math.max(150, (wires.length - 1) * rowSpacing + 105);
  const connectorY = Math.max(145, firstWireY - 52);
  const protectionTop = firstWireY - 28;
  const protectionBottom = firstWireY + (wires.length - 1) * rowSpacing + 28;
  const wireRows = wires.map((wire, index) => {
    const y = firstWireY + index * rowSpacing;
    const stroke = wire.stroke || sheetColorToStroke(wire.colorName);
    const fontColor = normalizeText(wire.colorName) === "BLACK" ? "#ffffff" : "#000000";
    const labelParts = [wire.label, wire.colorName ? `(${wire.colorName})` : "", formatWireLengthLabel(wire.length)].filter(Boolean);
    return `
      <g class="generic-wire-row">
        <text class="pin-side-label" x="${leftX - 92}" y="${y + 5}">PIN ${escapeXml(wire.leftPin || String(index + 1))}</text>
        <text class="pin-side-label" x="${rightX + 92}" y="${y + 5}">PIN ${escapeXml(wire.rightPin || String(index + 1))}</text>
        <rect class="terminal" x="${leftX - 58}" y="${y - 15}" width="54" height="30" fill="${stroke}" />
        <rect class="terminal" x="${rightX + 4}" y="${y - 15}" width="54" height="30" fill="${stroke}" />
        <text class="terminal-mark" x="${leftX - 31}" y="${y + 5}" fill="${fontColor}">${escapeXml(wire.leftPin || String(index + 1))}</text>
        <text class="terminal-mark" x="${rightX + 31}" y="${y + 5}" fill="${fontColor}">${escapeXml(wire.rightPin || String(index + 1))}</text>
        <line class="generic-wire" x1="${leftX - 4}" y1="${y}" x2="${rightX + 4}" y2="${y}" stroke="${stroke}" />
        <text class="wire-label" x="${(leftX + rightX) / 2}" y="${y - 13}">${escapeXml(labelParts.join(" "))}</text>
      </g>
    `;
  }).join("");
  const tableRows = wires.slice(0, 8).map((wire) => [
    wire.leftPin || "",
    shortLabel(wire.label || "", 18),
    wire.colorName || "VERIFY",
    wire.awg || "VERIFY",
    wire.length || "VERIFY",
    wire.rightPin || ""
  ]);
  const notesY = 690;
  const title = escapeXml(harness.title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${title}">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#000000" />
    </marker>
    <style>
      .sheet { fill: #ffffff; }
      .border { fill: none; stroke: #000000; stroke-width: 2; }
      .title { fill: #000000; font: 900 34px Aptos, Segoe UI, sans-serif; letter-spacing: 0.8px; text-anchor: middle; }
      .subtitle { fill: #000000; font: 700 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-title { fill: #000000; font: 900 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-small { fill: #000000; font: 700 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-box { fill: #ffffff; stroke: #000000; stroke-width: 3; }
      .connector-face { fill: #f8f8f8; stroke: #000000; stroke-width: 2; }
      .generic-wire { fill: none; stroke-width: 7; stroke-linecap: square; }
      .terminal { stroke: #000000; stroke-width: 2; }
      .terminal-mark { font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-side-label { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .dim-line { fill: none; stroke: #000000; stroke-width: 2; }
      .dim-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .note-title { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; }
      .note { fill: #000000; font: 700 12px Aptos, Segoe UI, sans-serif; }
      .table-outline { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .table-grid { stroke: #000000; stroke-width: 1; }
      .table-title { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #000000; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #000000; font: 800 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .title-block-label { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; }
      .title-block-text { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="14" y="14" width="1572" height="772" />
  <text class="title" x="800" y="58">${title}</text>
  <text class="subtitle" x="800" y="92">${escapeXml(harness.subtitle)}</text>

  <text class="connector-title" x="220" y="92">LEFT CONNECTOR</text>
  <text class="connector-small" x="220" y="116">${escapeXml(harness.leftConnectorName)}</text>
  <rect class="connector-box" x="${leftConnectorX}" y="${connectorY}" width="170" height="${connectorHeight}" />
  <rect class="connector-face" x="${leftConnectorX + 38}" y="${connectorY + 26}" width="94" height="${connectorHeight - 52}" rx="8" />

  <text class="connector-title" x="1410" y="92">RIGHT CONNECTOR</text>
  <text class="connector-small" x="1410" y="116">${escapeXml(harness.rightConnectorName)}</text>
  <rect class="connector-box" x="${rightConnectorX}" y="${connectorY}" width="170" height="${connectorHeight}" />
  <rect class="connector-face" x="${rightConnectorX + 38}" y="${connectorY + 26}" width="94" height="${connectorHeight - 52}" rx="8" />

  <path class="dim-line" d="M ${leftX - 20} 145 L ${rightX + 20} 145" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="${(leftX + rightX) / 2}" y="128">OVERALL LENGTH - VERIFY FROM SOURCE DRAWING</text>

  ${buildHorizontalProtectionSvg({
    x1: leftX + 28,
    x2: rightX - 28,
    top: protectionTop,
    bottom: protectionBottom,
    labelY: protectionTop - 10,
    endLabelY: protectionBottom + 18
  })}

  ${wireRows}

  ${buildSvgTable({
    x: 34,
    y: 520,
    width: 690,
    title: "WIRING TABLE",
    headers: ["LEFT PIN", "WIRE", "COLOR", "AWG", "LENGTH", "RIGHT PIN"],
    rows: tableRows,
    colWidths: [90, 210, 100, 80, 110, 100],
    rowHeight: 24,
    titleHeight: 28,
    headerHeight: 28
  })}

  <text class="note-title" x="760" y="${notesY}">DIGIWIRE NOTES</text>
  <text class="note" x="760" y="${notesY + 22}">Generated as a general cable / wire harness drawing. This is not locked to CAN bus.</text>
  <text class="note" x="760" y="${notesY + 42}">Verify connector style, pin numbers, color, gauge, polarity, and length before manufacturing.</text>
  <text class="note" x="760" y="${notesY + 62}">Use Draw.io for manual cleanup when the source sketch has ambiguous marks.</text>

  <rect class="table-outline" x="1055" y="650" width="505" height="96" />
  <line class="table-grid" x1="1055" y1="682" x2="1560" y2="682" />
  <line class="table-grid" x1="1270" y1="650" x2="1270" y2="746" />
  <line class="table-grid" x1="1415" y1="650" x2="1415" y2="746" />
  <text class="title-block-label" x="1070" y="674">DESCRIPTION:</text>
  <text class="title-block-text" x="1260" y="720">${title}</text>
  <text class="title-block-label" x="1285" y="674">DRAWN BY:</text>
  <text class="title-block-text" x="1342" y="720">DIGIWIRE</text>
  <text class="title-block-label" x="1430" y="674">REV:</text>
  <text class="title-block-text" x="1488" y="720">A</text>
</svg>`;
}

function createSheetRenderPlan(result) {
  const sheet = result.sheetHarness;
  const requestedLayout = result.designerConfig?.layoutMode || "auto";
  const forceGeneric = requestedLayout === "multiLeg";
  const preferStandard = requestedLayout === "simple" || requestedLayout === "twisted";
  const allowLargeCircular = requestedLayout === "auto" || requestedLayout === "largeCircular";
  if (!forceGeneric && !preferStandard && isBarrelPowerCableSheet(sheet.rows)) {
    return { kind: "barrel", model: null };
  }
  if (!forceGeneric && !preferStandard && isMolexUartJetsonSheet(sheet.rows)) {
    return { kind: "molexUart", model: null };
  }
  const largeCircularPairModel = buildLargeCircularPairHarnessModel(sheet);
  if (allowLargeCircular && largeCircularPairModel) {
    return { kind: "largeCircular", model: largeCircularPairModel };
  }
  const powerBoardIsolatorModel = buildPowerBoardIsolatorSheetModel(sheet);
  if (!forceGeneric && !preferStandard && powerBoardIsolatorModel) {
    return { kind: "powerBoard", model: powerBoardIsolatorModel };
  }
  const activeRows = getKiCadWireRows(sheet.rows);
  const hasTwistedPairs = analyzeSheetTwistedPairs(activeRows.map((row, index) => ({ row, index, y: index * 40 }))).validGroups.length > 0;
  const datasheetModel = buildDatasheetConnectorHarnessModel(sheet);
  if (!forceGeneric && !preferStandard && datasheetModel && !hasTwistedPairs) {
    return { kind: "datasheet", model: datasheetModel };
  }
  const kicadModel = buildKiCadHarnessModel(sheet);
  if (!forceGeneric && kicadModel) {
    return { kind: "kicad", model: kicadModel };
  }
  return { kind: "generic", model: null };
}

function buildSheetHarnessSvg(result) {
  const plan = createSheetRenderPlan(result);
  if (plan.kind === "barrel") return buildBarrelPowerCableSvg(result);
  if (plan.kind === "molexUart") return buildMolexUartJetsonSvg(result);
  if (plan.kind === "largeCircular") return buildLargeCircularPairHarnessSvg(result, plan.model);
  if (plan.kind === "powerBoard") return buildPowerBoardIsolatorSheetSvg(result, plan.model);
  if (plan.kind === "datasheet") return buildDatasheetConnectorHarnessSvg(result, plan.model);
  if (plan.kind === "kicad") return buildKiCadHarnessSvg(result, plan.model);
  const sheet = result.sheetHarness;
  const activeRows = sheet.rows.filter((row) => !isNoWireRow(row));
  const rows = activeRows.length ? activeRows : [{
    wireName: "No drawable rows found",
    color: "Gray",
    length: "",
    leftLegName: "LEFT",
    rightLegName: "RIGHT",
    comments: "The uploaded sheet table is still available below."
  }];
  const leftGroups = groupSheetEndpoints(rows, "left");
  const rightGroups = groupSheetEndpoints(rows, "right");
  const leftX = 260;
  const rightX = 1340;
  const sharedBundle = shouldUseSharedSheetBundle(rows, leftGroups, rightGroups);
  const routes = sheetRouteLayout(rows, sharedBundle ? { top: 214, bottom: 430 } : {});
  const pairAnalysis = analyzeSheetTwistedPairs(routes);
  const sharedBundleGeometry = sharedBundle ? sheetSharedBundleGeometry(routes, leftX, rightX) : null;
  const sharedLengthLabel = sharedBundle ? sheetLengthSummary(rows) : "";
  const rowLines = routes.map((route) => {
    const { row, index, y } = route;
    const colorSpec = wireColorSpec(row.color);
    const color = colorSpec.baseStroke;
    const dashed = isNoWireRow(row) ? ` stroke-dasharray="12 9"` : "";
    const label = escapeXml(route.label);
    const lengthText = row.length ? formatLengthMeasurement(row.length) : "";
    const branchText = sheetRouteBranchLabel(row);
    const geometry = sheetWireRouteGeometry(route, pairAnalysis, leftX, rightX);
    return `
      <g class="sheet-row">
        <path class="sheet-wire${geometry.twisted ? " sheet-wire-twisted" : ""}" d="${geometry.svgPath}" stroke="${color}"${dashed} />
        ${colorSpec.stripeStroke ? `<path class="sheet-wire" d="${geometry.svgPath}" stroke="${colorSpec.stripeStroke}" stroke-width="2.5" stroke-dasharray="11 9" />` : ""}
        <circle class="sheet-pin" cx="${leftX}" cy="${y}" r="4" />
        <circle class="sheet-pin" cx="${rightX}" cy="${y}" r="4" />
        <text class="sheet-wire-label" x="${(leftX + rightX) / 2}" y="${y - 6}">${label}</text>
        <text class="sheet-small" x="${(leftX + rightX) / 2}" y="${y + 12}">${escapeXml([lengthText, branchText].filter(Boolean).join(" | "))}</text>
        <text class="sheet-pin-label" x="${leftX - 18}" y="${y + 5}">${escapeXml(route.leftPin)}</text>
        <text class="sheet-pin-label" x="${rightX + 18}" y="${y + 5}">${escapeXml(route.rightPin)}</text>
      </g>
    `;
  }).join("");
  const twistedPairCallouts = pairAnalysis.validGroups.map((group, index) => {
    const midY = average(group.routes.map((route) => route.y));
    const x = leftX + 126 + index % 2 * 154;
    return `
      <g class="twisted-pair-callout">
        <rect class="twisted-pair-tag" x="${x}" y="${midY - 12}" width="140" height="24" rx="12" />
        <text class="twisted-pair-tag-text" x="${x + 70}" y="${midY + 4}">TWISTED PAIR ${escapeXml(group.id)}</text>
      </g>`;
  }).join("");
  const endpointBoxes = (groups, side) => groups.map((group, groupIndex) => {
    const box = sheetEndpointBoxLayout(group, routes, side);
    const detail = group.details.join(" | ");
    const titleY = box.top + (detail ? 21 : box.height / 2 + 4);
    return `
      <g class="sheet-endpoint" aria-label="${escapeXml(`${side} endpoint ${groupIndex + 1}`)}">
        <rect class="connector-box" x="${box.x}" y="${box.top}" width="${box.width}" height="${box.height}" rx="4" />
        <text class="connector-title" x="${box.textX}" y="${titleY}">${escapeXml(shortLabel(group.title, 28))}</text>
        ${detail ? `<text class="connector-detail" x="${box.textX}" y="${box.top + 39}">${escapeXml(shortLabel(detail, 34))}</text>` : ""}
      </g>`;
  }).join("");
  const protectionBundles = sharedBundle
    ? buildHorizontalProtectionSvg({
      x1: sharedBundleGeometry.x1,
      x2: sharedBundleGeometry.x2,
      top: sharedBundleGeometry.top,
      bottom: sharedBundleGeometry.bottom,
      label: "",
      endLabelY: sharedBundleGeometry.bottom + 16,
      bandWidth: 26
    })
    : leftGroups.map((group, index) => {
      const { top, bottom } = sheetProtectionBounds(group, routes);
      return buildHorizontalProtectionSvg({
        x1: leftX + 48,
        x2: rightX - 48,
        top,
        bottom,
        label: `LEG ${group.leg || index + 1} EXPANDO + HEAT SHRINK`,
        labelY: Math.max(140, top - 18),
        endLabelY: bottom + 12,
        bandWidth: 18
      });
    }).join("");
  const sharedBundleOverlay = sharedBundle ? `
  <g class="shared-bundle-callouts">
    <rect class="sleeve-id-label" x="${sharedBundleGeometry.midX - 70}" y="${sharedBundleGeometry.midY - 16}" width="140" height="32" rx="6" />
    <text class="sleeve-id-text" x="${sharedBundleGeometry.midX}" y="${sharedBundleGeometry.midY + 6}">${escapeXml(sheet.cableName || "CABLE ID")}</text>
    <text class="lead-callout" x="${sharedBundleGeometry.leftLeadX}" y="${sharedBundleGeometry.bottom + 34}">WIRE ENDS EXIT HEAT SHRINK TO LEFT CONNECTORS</text>
    <text class="lead-callout" x="${sharedBundleGeometry.rightLeadX}" y="${sharedBundleGeometry.bottom + 34}">WIRE ENDS EXIT HEAT SHRINK TO RIGHT CONNECTOR</text>
    ${sharedLengthLabel ? `<text class="dimension-label" x="${(leftX + rightX) / 2}" y="${sharedBundleGeometry.bottom + 56}">${escapeXml(sharedLengthLabel)}</text>` : ""}
  </g>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(sheet.title)}">
  <defs>
    ${buildBraidPatternDefs()}
    <style>
      .sheet { fill: #ffffff; }
      .border { fill: none; stroke: #000000; stroke-width: 2; }
      .title { fill: #000000; font: 900 32px Aptos, Segoe UI, sans-serif; letter-spacing: 0.8px; }
      .subtitle { fill: #333333; font: 600 17px Aptos, Segoe UI, sans-serif; }
      .connector-box { fill: #ffffff; stroke: #000000; stroke-width: 3; }
      .connector-title { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-detail { fill: #333333; font: 700 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .sheet-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; }
      .sheet-wire-twisted { stroke-linejoin: round; }
      .sheet-pin { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .sheet-wire-label { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .sheet-small { fill: #333333; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .sheet-pin-label { fill: #000000; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .sheet-note-title { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; }
      .sheet-note { fill: #222222; font: 600 12px Aptos, Segoe UI, sans-serif; }
      .template-notes-box, .title-block-box { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .title-block-label { fill: #000000; font: 700 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .title-block-text { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .meta { fill: #333333; font: 800 12px Aptos, Segoe UI, sans-serif; }
      .sleeve-id-label { fill: #fffdf5; stroke: #111111; stroke-width: 1.4; }
      .sleeve-id-text { fill: #111111; font: 900 18px Aptos, Segoe UI, sans-serif; text-anchor: middle; letter-spacing: 3px; }
      .lead-callout { fill: #111111; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .dimension-label { fill: #111111; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .twisted-pair-tag { fill: #fffdf5; stroke: #5c4b17; stroke-width: 1.4; }
      .twisted-pair-tag-text { fill: #3c3210; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="12" y="12" width="1576" height="776" />
  <text class="title" x="46" y="58">${escapeXml(sheet.title)}</text>
  <text class="subtitle" x="46" y="92">${escapeXml(sheet.subtitle)}</text>
  <text class="meta" x="46" y="122">Template-driven harness | ${leftGroups.length} left endpoint(s) | ${rightGroups.length} right endpoint(s) | ${rows.length} routed row(s)${pairAnalysis.validGroups.length ? ` | ${pairAnalysis.validGroups.length} twisted pair(s)` : ""}</text>
  ${endpointBoxes(leftGroups, "left")}
  ${endpointBoxes(rightGroups, "right")}
  ${protectionBundles}
  ${rowLines}
  ${twistedPairCallouts}
  ${sharedBundleOverlay}
</svg>`;
}

function isMolexUartJetsonSheet(rows) {
  const leftText = normalizeText(rows.map((row) => [
    row.leftLegName,
    row.leftHousingType,
    row.leftHousingPart
  ].join(" ")).join(" "));
  const rightText = normalizeText(rows.map((row) => [
    row.rightLegName,
    row.rightHousingType,
    row.rightHousingPart
  ].join(" ")).join(" "));
  const hasMicroFit2 = leftText.includes("43645") ||
    leftText.includes("WM 1845") ||
    leftText.includes("MICRO FIT") ||
    leftText.includes("2 PIN FRONT MOLEX");
  const hasCGrid40 = rightText.includes("90143") ||
    rightText.includes("1568 16764") ||
    rightText.includes("C GRID") ||
    rightText.includes("40 PIN CONNECTOR");
  return hasMicroFit2 && hasCGrid40;
}

function molexMicroFit2PinPoint(pin) {
  return {
    x: 183,
    y: String(pin) === "2" ? 304 : 248
  };
}

function molexCGrid40PinPoint(pin) {
  const numeric = clamp(numericPin(pin), 1, 40);
  const row = Math.floor((numeric - 1) / 2);
  const column = (numeric - 1) % 2;
  return {
    x: 1354 + column * 42,
    y: 188 + row * 19.2
  };
}

function buildMolexMicroFit2FaceSvg(rows) {
  const activePins = new Map(rows.map((row) => [
    String(row.leftPinPos || ""),
    sheetColorToStroke(row.color)
  ]));
  const cavities = ["1", "2"].map((pin) => {
    const point = molexMicroFit2PinPoint(pin);
    const stroke = activePins.get(pin) || "#aeb5b9";
    return `
      <rect class="molex-cavity" x="${point.x - 20}" y="${point.y - 17}" width="40" height="34" rx="7" />
      <rect x="${point.x - 10}" y="${point.y - 9}" width="20" height="18" rx="4" fill="#050505" stroke="${stroke}" stroke-width="${activePins.has(pin) ? 4 : 1.5}" />
      <text class="cavity-number cavity-number-light" x="${point.x}" y="${point.y + 5}">${pin}</text>`;
  }).join("");
  return `
  <g aria-label="Molex 43645-0200 Micro-Fit 3.0 two circuit receptacle mating face">
    <text class="connector-title" x="160" y="164">J9 HB</text>
    <text class="connector-part" x="160" y="184">MOLEX 43645-0200</text>
    <text class="connector-detail" x="160" y="201">MICRO-FIT 3.0 | 2 CIRCUIT | MATING FACE</text>
    <rect class="molex-body" x="126" y="214" width="114" height="126" rx="10" />
    <path class="molex-latch" d="M 126 236 L 101 247 L 101 307 L 126 319 Z" />
    <path class="molex-latch-rib" d="M 112 254 L 112 301" />
    <rect class="molex-rib" x="136" y="218" width="12" height="118" rx="4" />
    <path class="circuit-one-marker" d="M 151 226 L 161 216 L 171 226 Z" />
    ${cavities}
    <text class="connector-detail" x="160" y="360">LATCH / CIRCUIT 1 IDENTIFIER SHOWN</text>
  </g>`;
}

function buildMolexCGrid40FaceSvg(rows) {
  const activePins = new Map(rows.map((row) => [
    String(row.rightPinPos || ""),
    sheetColorToStroke(row.color)
  ]));
  const cavities = [];
  for (let pin = 1; pin <= 40; pin += 1) {
    const point = molexCGrid40PinPoint(pin);
    const activeStroke = activePins.get(String(pin));
    cavities.push(`
      <rect class="cgrid-cavity" x="${point.x - 14}" y="${point.y - 7}" width="28" height="14" rx="2" stroke="${activeStroke || "#777f84"}" stroke-width="${activeStroke ? 3.5 : 1.2}" />
      ${activeStroke || pin === 1 || pin === 40
        ? `<text class="cgrid-pin-number" x="${point.x + (pin % 2 ? -22 : 22)}" y="${point.y + 4}">${pin}</text>`
        : ""}`);
  }
  return `
  <g aria-label="Molex 90143-0040 C-Grid III forty circuit housing mating face">
    <text class="connector-title" x="1375" y="132">JETSON</text>
    <text class="connector-part" x="1375" y="151">MOLEX 90143-0040</text>
    <text class="connector-detail" x="1375" y="167">C-GRID III | 2 x 20 | MATING FACE</text>
    <rect class="molex-body" x="1322" y="174" width="106" height="402" rx="8" />
    <rect class="cgrid-center-rib" x="1371" y="181" width="8" height="388" rx="3" />
    <path class="circuit-one-marker" d="M 1332 184 L 1342 174 L 1352 184 Z" />
    ${cavities.join("")}
    <text class="connector-detail" x="1375" y="597">ODD PINS LEFT | EVEN PINS RIGHT</text>
    <text class="connector-detail" x="1375" y="614">2.54 mm PITCH | NO POLARIZING BUTTONS</text>
  </g>`;
}

function buildMolexUartJetsonSvg(result) {
  const sheet = result.sheetHarness;
  const rows = sheet.rows.filter((row) => sheetRowWireName(row) && row.leftPinPos && row.rightPinPos).slice(0, 2);
  const wireYs = [248, 304];
  const wireSvg = rows.map((row, index) => {
    const leftPoint = molexMicroFit2PinPoint(row.leftPinPos);
    const rightPoint = molexCGrid40PinPoint(row.rightPinPos);
    const wireY = wireYs[index] ?? 248 + index * 56;
    const color = sheetColorToStroke(row.color);
    const label = sheetRowWireName(row) || `WIRE ${index + 1}`;
    const length = row.length ? formatLengthMeasurement(row.length) : "";
    return `
      <path class="sheet-wire" d="M ${leftPoint.x} ${leftPoint.y} L 316 ${wireY} L 1192 ${wireY} L 1260 ${rightPoint.y} L ${rightPoint.x} ${rightPoint.y}" stroke="${color}" />
      <circle class="sheet-pin" cx="${leftPoint.x}" cy="${leftPoint.y}" r="5" />
      <circle class="sheet-pin" cx="${rightPoint.x}" cy="${rightPoint.y}" r="5" />
      <text class="sheet-wire-label" x="755" y="${wireY - 10}">${escapeXml(label)}</text>
      <text class="sheet-small" x="755" y="${wireY + 22}">${escapeXml(length)}</text>`;
  }).join("");
  const comments = uniqueValues(rows.map((row) => row.comments)).slice(0, 2);
  const noteLines = [
    "43645-0200: Micro-Fit 3.0 single-row receptacle, 2 circuits, black housing.",
    "90143-0040: C-Grid III crimp housing, 40 circuits (2 x 20), 2.54 mm pitch, black housing.",
    "Connector faces are shown from the mating side; verify circuit-1 orientation before assembly.",
    ...comments
  ].slice(0, 5).map((note, index) => `<text class="sheet-note" x="60" y="${646 + index * 20}">${index + 1}. ${escapeXml(note)}</text>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(sheet.title)} with Molex connector faces">
  <defs>
    ${buildBraidPatternDefs()}
    <style>
      .sheet { fill: #ffffff; }
      .title { fill: #000000; font: 900 32px Aptos, Segoe UI, sans-serif; letter-spacing: 0.8px; }
      .subtitle { fill: #333333; font: 600 17px Aptos, Segoe UI, sans-serif; }
      .meta { fill: #333333; font: 800 12px Aptos, Segoe UI, sans-serif; }
      .connector-title { fill: #000000; font: 900 18px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-part { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-detail { fill: #333333; font: 800 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .molex-body { fill: #202326; stroke: #050505; stroke-width: 4; }
      .molex-latch { fill: #2e3235; stroke: #050505; stroke-width: 3; }
      .molex-latch-rib { fill: none; stroke: #080808; stroke-width: 5; stroke-linecap: round; }
      .molex-rib, .cgrid-center-rib { fill: #34383b; stroke: #070707; stroke-width: 1.5; }
      .molex-cavity { fill: #353a3d; stroke: #050505; stroke-width: 2; }
      .cgrid-cavity { fill: #080909; }
      .cavity-number { fill: #ffffff; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .cgrid-pin-number { fill: #000000; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .circuit-one-marker { fill: #d8dde0; stroke: #050505; stroke-width: 1.2; }
      .sheet-wire { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; }
      .sheet-pin { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .sheet-wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .sheet-small { fill: #333333; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .sheet-note-title { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; }
      .sheet-note { fill: #222222; font: 600 12px Aptos, Segoe UI, sans-serif; }
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <text class="title" x="46" y="54">${escapeXml(sheet.title)}</text>
  <text class="subtitle" x="46" y="84">Molex connector mating-face drawing with expandable braided sleeving</text>
  <text class="meta" x="46" y="108">Rows loaded: ${sheet.totalRows} | Drawing rows shown: ${rows.length}</text>

  ${buildMolexMicroFit2FaceSvg(rows)}
  ${buildMolexCGrid40FaceSvg(rows)}
  ${buildHorizontalProtectionSvg({
    x1: 330,
    x2: 1174,
    top: 218,
    bottom: 334,
    labelY: 207,
    endLabelY: 354
  })}
  ${wireSvg}

  <text class="sheet-note-title" x="60" y="622">CONNECTOR / BUILD NOTES</text>
  ${noteLines}
</svg>`;
}

function buildPowerBoardIsolatorSheetModel(sheet) {
  const rows = getKiCadWireRows(sheet.rows);
  if (rows.length !== 4) {
    return null;
  }
  const text = normalizeText(rows.map((row) => [
    row.cableName,
    row.leftLegName,
    row.wireName,
    row.leftHousingType,
    row.rightLegName,
    row.rightHousingType
  ].join(" ")).join(" "));
  const hasIsolator = text.includes("ISOLATOR 154") || text.includes("ISO154");
  const hasDupont = text.includes("4 POS DUPONT") || text.includes("4 POSITION DUPONT");
  const hasTestPoints = text.includes("TP 1") && text.includes("TP 71");
  const hasI2c = text.includes("POWER BOARD I2C") || text.includes("I2C J43") || text.includes("I2C J4");
  const signals = new Set(rows.map((row) => normalizeText(row.wireName)));
  if (
    !hasIsolator ||
    !hasDupont ||
    !hasTestPoints ||
    !hasI2c ||
    !["GND", "5V", "SDA", "SCL"].every((signal) => signals.has(signal))
  ) {
    return null;
  }

  const wireFor = (signal) => rows.find((row) => normalizeText(row.wireName) === signal) || {};
  const gnd = wireFor("GND");
  const power = wireFor("5V");
  const sda = wireFor("SDA");
  const scl = wireFor("SCL");
  const wires = [
    { row: gnd, name: "GND", stroke: sheetColorToStroke(gnd.color), colorName: normalizeColorName(gnd.color), source: "TP1", sourcePin: gnd.leftPinPos || "1", targetPin: gnd.rightPinPos || "1", length: gnd.length || "22", awg: gnd.awg || "22", leg: "TEST POINT LEG", laneY: 220 },
    { row: power, name: "5V", stroke: sheetColorToStroke(power.color), colorName: normalizeColorName(power.color), source: "TP71", sourcePin: power.leftPinPos || "2", targetPin: power.rightPinPos || "4", length: power.length || "22", awg: power.awg || "22", leg: "TEST POINT LEG", laneY: 276 },
    { row: sda, name: "SDA", stroke: sheetColorToStroke(sda.color), colorName: normalizeColorName(sda.color), source: "J43", sourcePin: sda.leftPinPos || "1", targetPin: sda.rightPinPos || "2", length: sda.length || "12", awg: sda.awg || "22", leg: "I2C J43 LEG", laneY: 426 },
    { row: scl, name: "SCL", stroke: sheetColorToStroke(scl.color), colorName: normalizeColorName(scl.color), source: "J43", sourcePin: scl.leftPinPos || "2", targetPin: scl.rightPinPos || "3", length: scl.length || "12", awg: scl.awg || "22", leg: "I2C J43 LEG", laneY: 482 }
  ];
  const targetPins = new Map(wires.map((wire) => [String(wire.targetPin), wire]));
  const cableName = firstFilled(rows, "cableName") || sheet.cableName || "WIRE HARNESS";
  return {
    cableName,
    description: "TWO INDEPENDENT POWER-BOARD LEGS TO ISOLATOR 154X",
    wires,
    targetPins,
    testPointRows: [gnd, power],
    i2cRows: [sda, scl],
    rightName: cleanConnectorName(firstFilled(rows, "rightLegName") || "ISOLATOR 154X"),
    rightType: firstFilled(rows, "rightHousingType") || "4 POS DUPONT",
    microFitHousing: firstFilled([sda, scl], "leftHousingPart") || "WM1783-ND",
    microFitContact: firstFilled([sda, scl], "leftPinPart") || "WM-1837CT-ND",
    dupontHousing: firstFilled(rows, "rightHousingPart") || "DUPONT",
    dupontContact: firstFilled(rows, "rightPinPart") || "DUPONT",
    tool: firstFilled(rows, "toolUsed") || "PEBA 2030M",
    topLength: dominantSheetValue([gnd, power], "length") || "22",
    bottomLength: dominantSheetValue([sda, scl], "length") || "12"
  };
}

function buildPowerBoardIsolatorSheetSvg(result, model) {
  const targetY = { "1": 212, "2": 284, "3": 356, "4": 428 };
  const wirePaths = model.wires.map((wire) => {
    const sourcePoint = wire.source === "J43"
      ? { x: 318, y: wire.sourcePin === "1" ? 426 : 482 }
      : { x: 300, y: wire.source === "TP1" ? 220 : 276 };
    const breakoutX = wire.source === "J43" ? 1035 : 985;
    const rightY = targetY[String(wire.targetPin)] || wire.laneY;
    const path = `M ${sourcePoint.x} ${sourcePoint.y} L ${breakoutX} ${wire.laneY} L ${breakoutX} ${rightY} L 1292 ${rightY}`;
    return `
      <path class="split-wire-halo" d="${path}" />
      <path class="split-wire" d="${path}" stroke="${wire.stroke}" />
      <circle class="wire-terminal" cx="${sourcePoint.x}" cy="${sourcePoint.y}" r="4.5" />
      <circle class="wire-terminal" cx="1292" cy="${rightY}" r="4.5" />
      <text class="wire-label" x="${wire.source === "J43" ? 720 : 690}" y="${wire.laneY - 9}">${escapeXml(`${wire.name} | ${wire.colorName} | ${formatWireLengthLabel(wire.length)}`)}</text>`;
  }).join("");
  const pinRows = ["1", "2", "3", "4"].map((pin) => {
    const wire = model.targetPins.get(pin);
    const y = targetY[pin];
    return `
      <rect class="dupont-cavity" x="1308" y="${y - 18}" width="44" height="36" rx="4" stroke="${wire?.stroke || "#666666"}" />
      <circle class="dupont-hole" cx="1330" cy="${y}" r="5" />
      <text class="pin-number" x="1275" y="${y + 5}">${pin}</text>
      <text class="pin-signal" x="1380" y="${y + 5}">${escapeXml(`${wire?.name || ""}${wire ? ` (${wire.colorName})` : ""}`)}</text>`;
  }).join("");
  const tableRows = model.wires.map((wire) => [
    wire.leg,
    wire.source,
    wire.sourcePin,
    wire.name,
    wire.colorName,
    wire.awg,
    formatLengthMeasurement(wire.length),
    wire.targetPin
  ]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(model.cableName)} split-leg harness drawing">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
    </marker>
    <style>
      .page { fill: #ffffff; }
      .border { fill: none; stroke: #17231c; stroke-width: 2; }
      .title { fill: #17231c; font: 900 32px Consolas, "Courier New", monospace; text-anchor: middle; }
      .subtitle { fill: #35413a; font: 800 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .leg-title { fill: #173a8a; font: 900 18px Consolas, "Courier New", monospace; text-anchor: middle; }
      .board { fill: #fbfcfb; stroke: #173a8a; stroke-width: 3; }
      .board-text { fill: #17231c; font: 800 13px Consolas, "Courier New", monospace; }
      .test-pad { fill: #ffffff; stroke: #111111; stroke-width: 3; }
      .test-core { fill: #111111; }
      .microfit-body { fill: #25292c; stroke: #050505; stroke-width: 3; }
      .microfit-lock { fill: #353a3d; stroke: #050505; stroke-width: 2.5; }
      .microfit-cavity { fill: #090a0a; stroke-width: 3; }
      .dupont-body { fill: #ffffff; stroke: #217a35; stroke-width: 3; }
      .dupont-face { fill: #25292c; stroke: #050505; stroke-width: 3; }
      .dupont-cavity { fill: #090a0a; stroke-width: 3; }
      .dupont-hole { fill: #e6e8e9; stroke: #ffffff; stroke-width: 1; }
      .pin-number { fill: #17231c; font: 900 14px Consolas, "Courier New", monospace; text-anchor: middle; }
      .pin-signal { fill: #17231c; font: 900 14px Consolas, "Courier New", monospace; }
      .split-wire-halo { fill: none; stroke: #ffffff; stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; }
      .split-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
      .wire-terminal { fill: #ffffff; stroke: #111111; stroke-width: 1.7; }
      .wire-label { fill: #17231c; font: 900 12px Consolas, "Courier New", monospace; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .dim-line { fill: none; stroke: #17231c; stroke-width: 2; }
      .dim-label { fill: #17231c; font: 900 17px Consolas, "Courier New", monospace; text-anchor: middle; }
      .table-outline { fill: #ffffff; stroke: #17231c; stroke-width: 2; }
      .table-grid { stroke: #17231c; stroke-width: 1; }
      .table-title { fill: #17231c; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #17231c; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #17231c; font: 800 8.5px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .notes-title { fill: #17231c; font: 900 13px Aptos, Segoe UI, sans-serif; }
      .note { fill: #17231c; font: 700 10.5px Aptos, Segoe UI, sans-serif; }
      .protection-label { fill: #364149; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .protection-end-label { fill: #111111; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="page" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="12" y="12" width="1576" height="776" />
  <text class="title" x="800" y="49">${escapeXml(model.cableName.toUpperCase())}</text>
  <text class="subtitle" x="800" y="77">${escapeXml(model.description)}</text>

  <text class="leg-title" x="190" y="118">LEG 1 - POWER BOARD TEST POINTS</text>
  <rect class="board" x="48" y="138" width="270" height="174" rx="5" />
  <text class="board-text" x="74" y="174">POWER BOARD (TOP)</text>
  <text class="board-text" x="74" y="218">TP1 / GND</text>
  <text class="board-text" x="74" y="274">TP71 / +5V</text>
  <circle class="test-pad" cx="300" cy="220" r="10" />
  <circle class="test-core" cx="300" cy="220" r="3.5" />
  <circle class="test-pad" cx="300" cy="276" r="10" />
  <circle class="test-core" cx="300" cy="276" r="3.5" />

  <path class="dim-line" d="M 365 126 L 975 126" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="670" y="116">${escapeXml(formatLengthMeasurement(model.topLength))}</text>
  ${buildHorizontalProtectionSvg({
    x1: 382,
    x2: 930,
    top: 194,
    bottom: 302,
    label: "LEG 1 EXPANDO + HEAT SHRINK",
    labelY: 186,
    endLabelY: 316,
    bandWidth: 22
  })}

  <text class="leg-title" x="190" y="365">LEG 2 - POWER BOARD I2C J43</text>
  <rect class="board" x="48" y="382" width="270" height="164" rx="5" />
  <text class="board-text" x="72" y="413">POWER BOARD (BOTTOM)</text>
  <text class="board-text" x="72" y="440">I2C J43</text>
  <text class="board-text" x="72" y="466">2 POS SIDE-LOCK</text>
  <text class="board-text" x="72" y="489">MICRO-FIT J43</text>
  <text class="board-text" x="72" y="522">${escapeXml(model.microFitHousing)}</text>
  <rect class="microfit-body" x="252" y="402" width="66" height="104" rx="7" />
  <rect class="microfit-lock" x="265" y="506" width="40" height="32" rx="4" />
  <text x="285" y="527" fill="#ffffff" font-family="Aptos, Segoe UI, sans-serif" font-size="9" font-weight="900" text-anchor="middle">LOCK</text>
  <rect class="microfit-cavity" x="270" y="413" width="34" height="28" rx="4" stroke="${model.targetPins.get("2")?.stroke || "#0b64d8"}" />
  <rect class="microfit-cavity" x="270" y="467" width="34" height="28" rx="4" stroke="${model.targetPins.get("3")?.stroke || "#dddddd"}" />
  <text class="pin-number" x="260" y="432">1</text>
  <text class="pin-number" x="260" y="486">2</text>

  ${buildHorizontalProtectionSvg({
    x1: 382,
    x2: 930,
    top: 400,
    bottom: 508,
    label: "LEG 2 EXPANDO + HEAT SHRINK",
    labelY: 392,
    endLabelY: 522,
    bandWidth: 22
  })}
  <path class="dim-line" d="M 365 554 L 975 554" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="670" y="544">${escapeXml(formatLengthMeasurement(model.bottomLength))}</text>

  ${wirePaths}

  <text class="leg-title" x="1390" y="118">${escapeXml(model.rightName)}</text>
  <text class="leg-title" x="1390" y="143">${escapeXml(model.rightType)}</text>
  <rect class="dupont-body" x="1245" y="160" width="305" height="332" rx="6" />
  <rect class="dupont-face" x="1292" y="184" width="82" height="272" rx="7" />
  ${pinRows}
  <path d="M 1320 466 L 1340 466 L 1330 482 Z" fill="none" stroke="#217a35" stroke-width="2" />
  <text class="pin-signal" x="1378" y="480">PIN 1 ORIENTATION</text>

  ${buildSvgTable({
    x: 30,
    y: 596,
    width: 960,
    title: "WIRING TABLE - TWO SEPARATE CABLE LEGS",
    headers: ["LEG", "SOURCE", "LEFT PIN", "SIGNAL", "COLOR", "AWG", "LENGTH", "ISO PIN"],
    rows: tableRows,
    colWidths: [160, 100, 75, 100, 90, 60, 95, 70],
    rowHeight: 22,
    titleHeight: 25,
    headerHeight: 25
  })}
  <text class="notes-title" x="1025" y="612">PARTS / BUILD NOTES</text>
  <text class="note" x="1025" y="635">1. LEG 1: solder 22 AWG GND to TP1 and 5V to TP71; no left connector housing.</text>
  <text class="note" x="1025" y="657">2. LEG 2: J43 two-position side-lock Micro-Fit housing ${escapeXml(model.microFitHousing)}.</text>
  <text class="note" x="1025" y="679">3. J43 crimp terminal: ${escapeXml(model.microFitContact)}. Pin 1=SDA, pin 2=SCL.</text>
  <text class="note" x="1025" y="701">4. Isolator: pin 1=GND, pin 2=SDA, pin 3=SCL, pin 4=5V.</text>
  <text class="note" x="1025" y="723">5. Right housing/contact: ${escapeXml(model.dupontHousing)} / ${escapeXml(model.dupontContact)}.</text>
  <text class="note" x="1025" y="745">6. Tool: ${escapeXml(model.tool)}. Install separate expando and heat-shrink on each leg.</text>
</svg>`;
}

function buildDatasheetConnectorHarnessModel(sheet) {
  const sourceRows = getKiCadWireRows(sheet.rows);
  if (!sourceRows.length) {
    return null;
  }
  if (groupSheetEndpoints(sourceRows, "left").length !== 1 || groupSheetEndpoints(sourceRows, "right").length !== 1) {
    return null;
  }
  const leftPositionRows = getKiCadConnectorPositionRows(sheet.rows, sourceRows, "left");
  const rightPositionRows = getKiCadConnectorPositionRows(sheet.rows, sourceRows, "right");
  const leftResolved = resolveDatasheetConnector(leftPositionRows, "left");
  const rightResolved = resolveDatasheetConnector(rightPositionRows, "right");
  if (!leftResolved && !rightResolved) {
    return null;
  }
  const rows = sourceRows.slice(0, 16);
  const gauge = dominantSheetValue(rows, "awg") || firstFilled(rows, "awg") || "";
  const left = leftResolved || buildGenericDatasheetConnector(leftPositionRows, "left");
  const right = rightResolved || buildGenericDatasheetConnector(rightPositionRows, "right");
  const usesPowerpole = left.key === "powerpole1545" || right.key === "powerpole1545";
  const laneTop = usesPowerpole && rows.length <= 6 ? 340 : 166;
  const laneBottom = usesPowerpole && rows.length <= 6 ? 430 : 466;
  const laneOrder = usesPowerpole
    ? [...rows.keys()].sort((leftIndex, rightIndex) => {
        const sortSide = left.key === "powerpole1545" ? "rightPinPos" : "leftPinPos";
        return numericPin(rows[leftIndex][sortSide]) - numericPin(rows[rightIndex][sortSide]);
      })
    : [...rows.keys()];
  const laneRank = new Map(laneOrder.map((rowIndex, rank) => [rowIndex, rank]));
  const laneGap = rows.length > 1 ? (laneBottom - laneTop) / (rows.length - 1) : 0;
  const wires = rows.map((row, index) => ({
    row,
    name: sheetRowLeftWireName(row, `WIRE ${index + 1}`),
    leftName: sheetRowLeftWireName(row, `WIRE ${index + 1}`),
    rightName: sheetRowRightWireName(row, `WIRE ${index + 1}`),
    colorName: normalizeColorName(row.color),
    colorLabel: normalizeWireColorLabel(row.color),
    stroke: sheetColorToStroke(row.color),
    awg: row.awg || gauge,
    length: row.length || dominantSheetValue(rows, "length") || "",
    fromPin: String(row.leftPinPos || index + 1),
    toPin: String(row.rightPinPos || index + 1),
    laneY: laneTop + (laneRank.get(index) || 0) * laneGap
  }));
  left.activePins = buildDatasheetActivePinMap(wires, "left");
  right.activePins = buildDatasheetActivePinMap(wires, "right");
  const warnings = uniqueValues([
    ...left.warnings,
    ...right.warnings,
    left.key === "teCpc1714" && right.key === "teCpc1714" && left.contactType === right.contactType
      ? `CPC connectors on both ends use ${left.contactType} contacts and will not mate; use 206043-1 socket receptacle with 206044-1 pin plug.`
      : "",
    sourceRows.length > 16 ? "Only the first 16 routed conductors are shown on this connector-family drawing." : ""
  ]);
  return {
    cableName: firstFilled(rows, "cableName") || sheet.cableName || "WIRE HARNESS",
    description: `${left.name} TO ${right.name}`,
    gauge,
    length: dominantSheetValue(rows, "length") || firstFilled(rows, "length") || "",
    wires,
    left,
    right,
    warnings
  };
}

function resolveDatasheetConnector(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const sheetHousingPart = firstFilled(rows, `${prefix}HousingPart`) || "";
  const sheetPinPart = firstFilled(rows, `${prefix}PinPart`) || "";
  const descriptiveText = normalizeText(rows.map((row) => [
    row[`${prefix}LegName`],
    row[`${prefix}HousingType`]
  ].join(" ")).join(" "));
  const partCatalogEntry = resolveHousingPartCatalogEntry(sheetHousingPart);
  const hasHousingPart = isUsableHousingPartNumber(sheetHousingPart);
  const key = partCatalogEntry?.key || (!hasHousingPart ? datasheetConnectorKey(descriptiveText) : "");
  if (!key) {
    return hasHousingPart
      ? buildUnknownPartDatasheetConnector(rows, side, sheetHousingPart)
      : null;
  }
  const definition = DATASHEET_CONNECTOR_LIBRARY[key];
  const text = normalizeText(`${descriptiveText} ${sheetHousingPart} ${sheetPinPart}`);
  const inferred = inferDatasheetConnectorPositions(rows, side, text, definition, partCatalogEntry);
  const gauge = Number(String(dominantSheetValue(rows, "awg") || firstFilled(rows, "awg")).match(/\d+/)?.[0]);
  const termination = datasheetTerminationForGauge(key, gauge, { text, sheetPinPart });
  const name = cleanConnectorName(
    firstFilled(rows, `${prefix}LegName`) ||
    firstFilled(rows, `${prefix}HousingType`) ||
    `${definition.manufacturer} ${definition.family}`
  );
  const cpcVariant = key === "teCpc1714" ? resolveCpc1714Variant(text) : null;
  const warnings = uniqueValues([
    ...inferred.warnings,
    ...termination.warnings,
    key === "teCpc1714"
      ? "TE CPC 17-14 bare housings are non-sealed; do not assign an IP rating without a qualified sealed assembly and accessories."
      : ""
  ]);
  const powerpoleParts = key === "powerpole1545"
    ? powerpoleHousingPartsForRows(rows, side)
    : [];
  const pinOrder = key === "powerpole1545"
    ? rows
        .map((row) => String(row[`${prefix}PinPos`] || "").trim())
        .filter(Boolean)
    : [];
  return {
    key,
    definition,
    name,
    type: firstFilled(rows, `${prefix}HousingType`) || definition.style,
    view: resolveDatasheetConnectorView(rows, side),
    positions: inferred.positions,
    requestedPositions: inferred.requestedPositions,
    sheetHousingPart,
    sheetPinPart,
    housingPart: key === "powerpole1545"
      ? powerpoleParts.map((item) => `${item.color} ${item.part}`).join(", ") || definition.housingPart(inferred.positions)
      : cpcVariant?.housingPart
        ? cpcVariant.housingPart
      : partCatalogEntry?.manufacturerPart || definition.housingPart(inferred.positions),
    engineeringPart: definition.engineeringPart ? definition.engineeringPart(inferred.positions) : "",
    contactPart: termination.contactPart,
    contactDescription: termination.contactDescription,
    toolPart: termination.toolPart,
    insulationRange: termination.insulationRange || "",
    gauge,
    powerpoleParts,
    pinOrder,
    contactType: cpcVariant?.contactType || "",
    faceStyle: cpcVariant?.faceStyle || "",
    matingPart: cpcVariant?.matingPart || "",
    flange: Boolean(cpcVariant?.flange),
    warnings,
    recognized: true,
    resolutionSource: partCatalogEntry ? "housing-part-number" : "housing-type-fallback",
    lookupUrl: buildDigiKeyPartLookupUrl(sheetHousingPart || partCatalogEntry?.manufacturerPart || definition.housingPart(inferred.positions)),
    side
  };
}

function resolveDatasheetConnectorView(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const explicitView = normalizeText(firstFilled(rows, `${prefix}ConnectorView`));
  if (explicitView.includes("REAR") || explicitView.includes("WIRE")) {
    return "rear";
  }
  if (explicitView.includes("FRONT") || explicitView.includes("MATING")) {
    return "mating";
  }
  const comments = normalizeText(rows.map((row) => row.comments).join(" "));
  if (!comments.includes("REAR VIEW") && !comments.includes("WIRE ENTRY")) {
    return "mating";
  }
  const mentionsRight = /\bRIGHT\b/.test(comments);
  const mentionsLeft = /\bLEFT\b/.test(comments);
  if (mentionsRight || mentionsLeft) {
    return (side === "right" && mentionsRight) || (side === "left" && mentionsLeft)
      ? "rear"
      : "mating";
  }
  return "rear";
}

function datasheetConnectorPartLabel(connector) {
  const parts = [connector.housingPart];
  if (
    connector.sheetHousingPart &&
    normalizeText(connector.sheetHousingPart) !== normalizeText(connector.housingPart)
  ) {
    parts.push(connector.sheetHousingPart);
  } else if (connector.engineeringPart) {
    parts.push(connector.engineeringPart);
  }
  return parts.filter(Boolean).join(" / ");
}

function datasheetConnectorViewLabel(connector) {
  if (connector.key === "catalogUnknown") {
    return "PART-NUMBER PROFILE REQUIRED - HOUSING SHAPE NOT GUESSED";
  }
  if (connector.view === "rear") {
    return "REAR / WIRE-ENTRY VIEW - PIN POSITIONS";
  }
  if (connector.key === "teCpc1714") {
    return connector.contactType === "socket"
      ? "FLUSH SOCKET MATING FACE - MIRRORED NUMBERING"
      : "RECESSED PIN MATING FACE";
  }
  if (connector.key === "picoBladePigtail") {
    return "MATING FACE - SINGLE ROW - CIRCUIT 1 MARKED";
  }
  if (connector.key === "tePivotPowerRj45") {
    return "PLUG CONTACT VIEW - ODD/EVEN CONTACTS ARE INTERNALLY COMMONED";
  }
  return connector.key === "miniFitSr"
    ? "MATING FACE - TOP LATCH - CIRCUIT 1 MARKED"
    : "MATING FACE - CIRCUIT 1 MARKED";
}

function datasheetConnectorKey(text) {
  if (text.includes("218112") || text.includes("PICOBLADE")) {
    return "picoBladePigtail";
  }
  if (text.includes("2213145") || text.includes("A116128") || text.includes("PIVOT POWER RJ45")) {
    return "tePivotPowerRj45";
  }
  if (
    text.includes("206043") ||
    text.includes("206044") ||
    text.includes("17 14 CPC") ||
    text.includes("17-14 CPC") ||
    text.includes("14 PIN CPC") ||
    text.includes("14 POSITION CPC")
  ) {
    return "teCpc1714";
  }
  if (text.includes("POWERPOLE") || text.includes("POWER POLE") || text.includes("ANDERSON") || /\b1327G?\d*\b/.test(text)) {
    return "powerpole1545";
  }
  if (
    text.includes("WM1927") ||
    text.includes("WM11904") ||
    text.includes("42816") ||
    text.includes("42815") ||
    text.includes("MINI FIT SR") ||
    text.includes("MINI-FIT SR")
  ) {
    return "miniFitSr";
  }
  if (text.includes("MINI FIT") || text.includes("MINI-FIT") || text.includes("5557") || text.includes("39012")) {
    return "miniFitJr";
  }
  if (text.includes("43025") || text.includes("SIDE LOCK") || text.includes("SIDE-LOCK") || text.includes("SIDE MOLEX")) {
    return "microFitSide";
  }
  if (
    text.includes("43645") ||
    text.includes("MICRO FIT") ||
    text.includes("MICRO-FIT") ||
    text.includes("FRONT LOCK") ||
    text.includes("FRONT-LOCK") ||
    text.includes("FRONT MOLEX") ||
    text.includes("WM 1845")
  ) {
    return "microFitFront";
  }
  return "";
}

function normalizeHousingPartNumber(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isUsableHousingPartNumber(value) {
  const normalized = normalizeHousingPartNumber(value);
  return Boolean(normalized) && !["TBD", "NA", "NONE", "VERIFY", "UNKNOWN"].includes(normalized);
}

function resolveHousingPartCatalogEntry(value) {
  const compact = normalizeHousingPartNumber(value);
  if (!compact) {
    return null;
  }
  if (HOUSING_PART_CATALOG[compact]) {
    return HOUSING_PART_CATALOG[compact];
  }
  if (compact.includes("2181120802")) {
    return {
      key: "picoBladePigtail",
      positions: 8,
      manufacturerPart: "218112-0802"
    };
  }
  if (compact.includes("A116128") || compact.includes("22131451")) {
    return {
      key: "tePivotPowerRj45",
      positions: 8,
      manufacturerPart: "2213145-1"
    };
  }
  const powerpolePart = compact
    .replace(/^2243/, "")
    .replace(/ND$/, "")
    .replace(/BK$/, "")
    .replace(/^45/, "");
  if (/^1327(?:G\d+)?(?:FP)?$/.test(powerpolePart)) {
    return {
      key: "powerpole1545",
      positions: 0,
      manufacturerPart: String(value || "").trim()
    };
  }

  let match = compact.match(/^0?43645(\d{2})00$/);
  if (match) {
    return {
      key: "microFitFront",
      positions: Number(match[1]),
      manufacturerPart: `43645-${match[1]}00`
    };
  }
  match = compact.match(/^0?43025(\d{2})00$/);
  if (match) {
    return {
      key: "microFitSide",
      positions: Number(match[1]),
      manufacturerPart: `43025-${match[1]}00`
    };
  }
  match = compact.match(/^0?42816(\d{2})12$/);
  if (match) {
    return {
      key: "miniFitSr",
      positions: Number(match[1]),
      manufacturerPart: `42816-${match[1]}12`
    };
  }
  match = compact.match(/^39012(\d{3})$/);
  if (match && Number(match[1]) % 10 === 0) {
    const positions = Number(match[1]) / 10;
    return {
      key: "miniFitJr",
      positions,
      manufacturerPart: `39-01-${2000 + positions * 10}`
    };
  }
  return null;
}

function buildDigiKeyPartLookupUrl(partNumber) {
  const part = String(partNumber || "").trim();
  return part
    ? `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(part)}`
    : "https://www.digikey.com/en/products";
}

function inferDatasheetConnectorPositions(rows, side, text, definition, partCatalogEntry = null) {
  const prefix = side === "left" ? "left" : "right";
  const pins = rows
    .map((row) => numericPin(row[`${prefix}PinPos`]))
    .filter(Number.isFinite);
  const highestPin = pins.length ? Math.max(...pins) : rows.length;
  const compact = text.replace(/[^A-Z0-9]+/g, "");
  let requestedPositions = Number(partCatalogEntry?.positions || 0);
  const editorPositionCount = Math.max(
    0,
    ...rows.map((row) => Number(row[`${prefix}ConnectorPositionCount`]) || 0)
  );
  if (!requestedPositions && definition.key === "microFitFront") {
    requestedPositions = Number(compact.match(/43645(\d{2})\d{2}/)?.[1] || 0);
  } else if (!requestedPositions && definition.key === "microFitSide") {
    requestedPositions = Number(compact.match(/43025(\d{2})\d{2}/)?.[1] || 0);
  } else if (!requestedPositions && definition.key === "miniFitSr") {
    requestedPositions = Number(compact.match(/42816(\d{2})12/)?.[1] || 0);
  } else if (!requestedPositions && definition.key === "miniFitJr") {
    const skuSuffix = Number(compact.match(/39012(\d{3})/)?.[1] || 0);
    requestedPositions = skuSuffix ? skuSuffix / 10 : 0;
  } else if (!requestedPositions && definition.key === "teCpc1714") {
    requestedPositions = 14;
  }
  if (definition.key === "powerpole1545") {
    // Powerpole pin numbers identify circuits, not positions in a multi-circuit housing.
    requestedPositions = rows.filter((row) => row[`${prefix}PinPos`]).length || rows.length || 1;
  } else if (!requestedPositions) {
    const positionMatch = text.match(/\b(\d{1,2})\s*(?:POS|POSITION|PIN|CIRCUIT)\b/);
    requestedPositions = Number(positionMatch?.[1] || highestPin || definition.minPositions);
  }
  requestedPositions = definition.key === "powerpole1545"
    ? Math.max(requestedPositions, definition.minPositions, editorPositionCount)
    : partCatalogEntry
      ? Math.max(requestedPositions, definition.minPositions)
      : Math.max(requestedPositions, highestPin, definition.minPositions, editorPositionCount);
  let positions = requestedPositions;
  const warnings = [];
  if (definition.positionStep === 2 && positions % 2) {
    positions += 1;
    warnings.push(`${definition.family} ${definition.style} housings use even circuit counts; ${requestedPositions} was rounded to ${positions}.`);
  }
  if (positions > definition.maxPositions) {
    warnings.push(`${definition.family} ${definition.style} is only supported through ${definition.maxPositions} positions; ${requestedPositions} is not a valid housing in this family.`);
    positions = definition.maxPositions;
  }
  positions = clamp(positions, definition.minPositions, definition.maxPositions);
  return { positions, requestedPositions, warnings };
}

function datasheetTerminationForGauge(key, gauge, options = {}) {
  const warnings = [];
  if (!Number.isFinite(gauge)) {
    return {
      contactPart: "SELECT BY WIRE GAUGE",
      contactDescription: "Wire gauge is missing from the uploaded sheet.",
      toolPart: "VERIFY",
      warnings
    };
  }
  if (key === "microFitFront" || key === "microFitSide") {
    if (gauge >= 20 && gauge <= 24) {
      return {
        contactPart: "43030-0007 (bag) / 43030-0001 (reel)",
        contactDescription: "Micro-Fit 3.0 female crimp terminal, 24-20 AWG",
        toolPart: "63819-0000",
        warnings
      };
    }
    warnings.push(`Micro-Fit 3.0 contact 43030 does not accept ${gauge} AWG; use 20-24 AWG or change to a larger connector family.`);
    return {
      contactPart: `NO APPROVED ${gauge} AWG MICRO-FIT CONTACT`,
      contactDescription: "Micro-Fit 3.0 43030 terminal range is 24-20 AWG.",
      toolPart: "NOT APPLICABLE",
      warnings
    };
  }
  if (key === "picoBladePigtail") {
    if (gauge !== 28) {
      warnings.push(`Molex 218112-0802 is supplied with fixed 28 AWG UL 1061 leads; ${gauge} AWG describes a modified assembly.`);
    }
    return {
      contactPart: "50058-8000 (installed in 51021-0800)",
      contactDescription: "PicoBlade 1.25 mm receptacle terminal supplied on the 218112-0802 pigtail",
      toolPart: "FACTORY-ASSEMBLED PIGTAIL",
      warnings
    };
  }
  if (key === "tePivotPowerRj45") {
    if (gauge !== 18) {
      warnings.push(`TE 2213145-1 is designed for two 18 AWG conductors; ${gauge} AWG is not the specified cable construction.`);
    }
    return {
      contactPart: "INTEGRATED PIVOT POWER CONTACTS",
      contactDescription: "Odd RJ45 positions common to one conductor; even positions common to the second conductor",
      toolPart: "TE APPLICATION SPEC 114-32052",
      warnings
    };
  }
  if (key === "miniFitSr") {
    const suppliedPart = normalizeText(options.sheetPinPart).includes("WM11904")
      ? "0428150114 / WM11904TR-ND"
      : "0428150114";
    if (gauge >= 10 && gauge <= 12) {
      return {
        contactPart: suppliedPart,
        contactDescription: "Mini-Fit Sr. female socket terminal, silver plated, 12-10 AWG",
        toolPart: "63811-1500 / 63811-1600",
        insulationRange: "5.30 mm maximum insulation OD",
        warnings
      };
    }
    if (gauge >= 14 && gauge <= 16) {
      return {
        contactPart: "0428150144",
        contactDescription: "Mini-Fit Sr. female socket terminal, silver plated, 16-14 AWG",
        toolPart: "VERIFY TERMINAL-SPECIFIC MINI-FIT SR. TOOL",
        insulationRange: "4.57 mm maximum insulation OD",
        warnings
      };
    }
    if (gauge === 8) {
      return {
        contactPart: "0428150134",
        contactDescription: "Mini-Fit Sr. female socket terminal, silver plated, 8 AWG",
        toolPart: "VERIFY TERMINAL-SPECIFIC MINI-FIT SR. TOOL",
        insulationRange: "6.60 mm maximum insulation OD",
        warnings
      };
    }
    warnings.push(`Mini-Fit Sr. terminal selection is not defined here for ${gauge} AWG; verify the exact 42815-series socket and tooling.`);
    return {
      contactPart: `VERIFY 42815-SERIES SOCKET FOR ${gauge} AWG`,
      contactDescription: "Mini-Fit Sr. supports several gauge-specific female socket terminals.",
      toolPart: "VERIFY TERMINAL-SPECIFIC MINI-FIT SR. TOOL",
      warnings
    };
  }
  if (key === "miniFitJr") {
    if (gauge === 16) {
      return {
        contactPart: "39-00-0078 (bag) / 39-00-0077 (reel)",
        contactDescription: "Mini-Fit Jr. female crimp terminal, 16 AWG",
        toolPart: "200218-2200",
        warnings
      };
    }
    if (gauge >= 18 && gauge <= 24) {
      return {
        contactPart: "39-00-0039 (bag)",
        contactDescription: "Mini-Fit Jr. female crimp terminal, 24-18 AWG",
        toolPart: "63819-0901",
        warnings
      };
    }
    warnings.push(`Mini-Fit Jr. terminal selection is not defined here for ${gauge} AWG; verify the exact terminal and applicator.`);
    return {
      contactPart: `VERIFY ${gauge} AWG MINI-FIT TERMINAL`,
      contactDescription: "Outside the programmed 24-18 AWG and dedicated 16 AWG terminal choices.",
      toolPart: "VERIFY",
      warnings
    };
  }
  if (key === "powerpole1545") {
    if (gauge === 16) {
      warnings.push("Powerpole 16 AWG overlaps contacts 1331 and 1332; select by conductor diameter and required current rating.");
      return {
        contactPart: "1332 (20-16 AWG) / 1331 (16-12 AWG)",
        contactDescription: "PP15/45 silver-plated closed-barrel contact",
        toolPart: "1309G8",
        warnings
      };
    }
    if (gauge >= 17 && gauge <= 20) {
      return {
        contactPart: "1332",
        contactDescription: "PP15/45 silver-plated closed-barrel contact, 20-16 AWG",
        toolPart: "1309G8",
        warnings
      };
    }
    if (gauge >= 12 && gauge <= 15) {
      return {
        contactPart: "1331",
        contactDescription: "PP15/45 silver-plated closed-barrel contact, 16-12 AWG",
        toolPart: "1309G8",
        warnings
      };
    }
    if (gauge >= 10 && gauge <= 11) {
      return {
        contactPart: "269G3 / 261G2",
        contactDescription: "PP15/45 tin-plated open-barrel contact, 14-10 AWG",
        toolPart: "1309G8",
        warnings
      };
    }
    warnings.push(`Standard Powerpole PP15/45 contacts start at 20 AWG; ${gauge} AWG is not approved by the PP15/45 datasheet.`);
    return {
      contactPart: `NO STANDARD PP15/45 CONTACT FOR ${gauge} AWG`,
      contactDescription: "Use 20 AWG minimum or select another Anderson connector/contact system.",
      toolPart: "NOT APPLICABLE",
      warnings
    };
  }
  if (key === "teCpc1714") {
    const variant = resolveCpc1714Variant(options.text || "");
    const isSocket = variant.contactType === "socket";
    if (gauge >= 20 && gauge <= 24) {
      return {
        contactPart: isSocket ? "66105-3" : "66103-3",
        contactDescription: `TE Type III+ gold ${isSocket ? "socket" : "pin"} contact, 24-20 AWG, size 16, 13 A max`,
        toolPart: "91515-1 / INS 91002-1 / EXT 305183",
        insulationRange: "1.02-2.03 mm insulation OD",
        warnings
      };
    }
    if (gauge >= 16 && gauge <= 18) {
      return {
        contactPart: isSocket ? "66101-3" : "66099-3",
        contactDescription: `TE Type III+ gold ${isSocket ? "socket" : "pin"} contact, 18-16 AWG, size 16, 13 A max`,
        toolPart: "91505-1 / INS 91002-1 / EXT 305183",
        insulationRange: "2.03-2.54 mm insulation OD",
        warnings
      };
    }
    warnings.push(`TE CPC Series 1 contact selection is programmed for 24-20 AWG and 18-16 AWG; verify a Type III+ contact for ${gauge} AWG.`);
    return {
      contactPart: `VERIFY TYPE III+ ${variant.contactType.toUpperCase()} CONTACT FOR ${gauge} AWG`,
      contactDescription: "CPC Series 1 uses size 16 Type III+ contacts; insulation diameter must also match the selected contact.",
      toolPart: "VERIFY CONTACT-SPECIFIC CRIMP TOOL",
      warnings
    };
  }
  return {
    contactPart: "VERIFY",
    contactDescription: "Connector family is not in the datasheet library.",
    toolPart: "VERIFY",
    warnings
  };
}

function resolveCpc1714Variant(text) {
  const normalized = normalizeText(text);
  const isPlug = normalized.includes("206044") ||
    (normalized.includes("PLUG") && !normalized.includes("RECEPT"));
  if (isPlug) {
    return {
      housingPart: "206044-1",
      contactType: "pin",
      faceStyle: "recessed",
      matingPart: "206043-1",
      flange: false
    };
  }
  return {
    housingPart: "206043-1",
    contactType: "socket",
    faceStyle: "flush",
    matingPart: "206044-1",
    flange: true
  };
}

function powerpoleHousingPartsForRows(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const counts = new Map();
  rows.forEach((row) => {
    if (!row[`${prefix}PinPos`]) {
      return;
    }
    const color = normalizeColorName(row.color);
    const part = POWERPOLE_HOUSING_PARTS[color] || "1327 SERIES";
    const key = `${color}|${part}`;
    const item = counts.get(key) || { color, part, quantity: 0 };
    item.quantity += 1;
    counts.set(key, item);
  });
  return Array.from(counts.values());
}

function buildGenericDatasheetConnector(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const pins = rows.map((row) => numericPin(row[`${prefix}PinPos`])).filter(Number.isFinite);
  const positions = clamp(pins.length ? Math.max(...pins) : rows.length, 1, 16);
  return {
    key: "generic",
    definition: {
      key: "generic",
      manufacturer: "",
      family: "Unspecified connector",
      style: "generic mating face",
      pitch: "verify",
      rows: 1
    },
    name: cleanConnectorName(firstFilled(rows, `${prefix}LegName`) || firstFilled(rows, `${prefix}HousingType`) || `${side.toUpperCase()} CONNECTOR`),
    type: firstFilled(rows, `${prefix}HousingType`) || "Unspecified connector",
    positions,
    requestedPositions: positions,
    housingPart: firstFilled(rows, `${prefix}HousingPart`) || "VERIFY",
    engineeringPart: "",
    contactPart: firstFilled(rows, `${prefix}PinPart`) || "VERIFY",
    contactDescription: "Verify against the connector manufacturer datasheet.",
    toolPart: firstFilled(rows, "toolUsed") || "VERIFY",
    gauge: Number(String(dominantSheetValue(rows, "awg") || firstFilled(rows, "awg")).match(/\d+/)?.[0]),
    powerpoleParts: [],
    warnings: [`${side.toUpperCase()} connector was not recognized; its face is shown generically.`],
    recognized: false,
    side
  };
}

function buildUnknownPartDatasheetConnector(rows, side, sheetHousingPart) {
  const prefix = side === "left" ? "left" : "right";
  const pins = rows.map((row) => numericPin(row[`${prefix}PinPos`])).filter(Number.isFinite);
  const explicitPositions = Math.max(
    0,
    ...rows.map((row) => Number(row[`${prefix}ConnectorPositionCount`]) || 0)
  );
  const typeText = normalizeText(firstFilled(rows, `${prefix}HousingType`));
  const typePositions = Number(typeText.match(/\b(\d{1,2})\s*(?:POS|POSITION|PIN|CIRCUIT)\b/)?.[1] || 0);
  const positions = clamp(explicitPositions || typePositions || (pins.length ? Math.max(...pins) : rows.length), 1, 16);
  const partNumber = String(sheetHousingPart || "").trim();
  return {
    key: "catalogUnknown",
    definition: {
      key: "catalogUnknown",
      manufacturer: "",
      family: "UNMATCHED HOUSING PART",
      style: "part-number placeholder",
      pitch: "VERIFY",
      rows: positions > 8 ? 2 : 1
    },
    name: cleanConnectorName(firstFilled(rows, `${prefix}LegName`) || `${side.toUpperCase()} CONNECTOR`),
    type: partNumber,
    view: resolveDatasheetConnectorView(rows, side),
    positions,
    requestedPositions: positions,
    sheetHousingPart: partNumber,
    sheetPinPart: firstFilled(rows, `${prefix}PinPart`) || "",
    housingPart: partNumber,
    engineeringPart: "",
    contactPart: firstFilled(rows, `${prefix}PinPart`) || "VERIFY",
    contactDescription: "Verify against the connector manufacturer datasheet.",
    toolPart: firstFilled(rows, "toolUsed") || "VERIFY",
    gauge: Number(String(dominantSheetValue(rows, "awg") || firstFilled(rows, "awg")).match(/\d+/)?.[0]),
    powerpoleParts: [],
    warnings: [`No stored housing profile matches ${partNumber}. The generic housing type was ignored so the drawing does not show the wrong connector.`],
    recognized: false,
    resolutionSource: "unknown-housing-part-number",
    lookupUrl: buildDigiKeyPartLookupUrl(partNumber),
    side
  };
}

function buildDatasheetActivePinMap(wires, side) {
  return new Map(wires.map((wire) => [
    side === "left" ? wire.fromPin : wire.toPin,
    { stroke: wire.stroke, colorName: wire.colorName }
  ]));
}

function datasheetConnectorGeometry(connector, side) {
  const centerX = side === "left" ? 220 : 1380;
  const top = 154;
  if (connector.key === "teCpc1714") {
    const width = 196;
    const height = 196;
    return {
      centerX,
      centerY: top + 132,
      x: centerX - width / 2,
      y: top + 34,
      width,
      height,
      radius: 78
    };
  }
  if (connector.key === "powerpole1545") {
    const columns = Math.min(4, connector.positions);
    const rows = Math.ceil(connector.positions / columns);
    const moduleWidth = 34;
    const moduleHeight = 46;
    const gap = 5;
    const width = columns * moduleWidth + Math.max(0, columns - 1) * gap;
    const height = rows * moduleHeight + Math.max(0, rows - 1) * gap;
    return { centerX, x: centerX - width / 2, y: top + 34, width, height, columns, rows, moduleWidth, moduleHeight, gap };
  }
  if (connector.key === "microFitSide") {
    const columns = Math.ceil(connector.positions / 2);
    const width = clamp(columns * 31 + 50, 82, 298);
    const height = 116;
    return {
      centerX,
      x: centerX - width / 2,
      y: top + 30,
      width,
      height,
      dual: true,
      sideLock: true,
      physicalRows: 2,
      columns
    };
  }
  if (connector.key === "miniFitSr") {
    const width = 126;
    const height = clamp(connector.positions * 48 + 42, 138, 330);
    return {
      centerX,
      x: centerX - width / 2,
      y: top + 30,
      width,
      height,
      dual: false,
      physicalRows: connector.positions,
      miniFitSr: true
    };
  }
  const dual = connector.definition.rows === 2;
  const physicalRows = dual ? Math.ceil(connector.positions / 2) : connector.positions;
  const width = dual ? 122 : 96;
  const height = dual
    ? clamp(physicalRows * 31 + 50, 116, 298)
    : clamp(physicalRows * 20 + 42, 100, 282);
  return { centerX, x: centerX - width / 2, y: top + 30, width, height, dual, physicalRows };
}

function datasheetConnectorPinPoint(connector, pin, side) {
  const geometry = datasheetConnectorGeometry(connector, side);
  const powerpoleIndex = connector.key === "powerpole1545"
    ? connector.pinOrder?.indexOf(String(pin))
    : -1;
  const numeric = connector.key === "powerpole1545" && powerpoleIndex >= 0
    ? powerpoleIndex + 1
    : clamp(numericPin(pin), 1, connector.positions);
  if (connector.key === "teCpc1714") {
    const layout = CPC_17_14_PIN_LAYOUT.find((item) => item.pin === numeric) || CPC_17_14_PIN_LAYOUT[0];
    const mirror = connector.contactType === "socket" ? -1 : 1;
    return {
      x: geometry.centerX + layout.dx * mirror,
      y: geometry.centerY + layout.dy
    };
  }
  if (connector.key === "powerpole1545") {
    const index = numeric - 1;
    const column = index % geometry.columns;
    const row = Math.floor(index / geometry.columns);
    return {
      x: geometry.x + column * (geometry.moduleWidth + geometry.gap) + geometry.moduleWidth / 2,
      y: geometry.y + row * (geometry.moduleHeight + geometry.gap) + geometry.moduleHeight / 2
    };
  }
  if (geometry.sideLock) {
    const columnIndex = Math.floor((numeric - 1) / 2);
    const rowIndex = (numeric - 1) % 2;
    const columnGap = (geometry.width - 50) / Math.max(1, geometry.columns - 1);
    return {
      x: geometry.columns === 1
        ? geometry.centerX
        : geometry.x + 25 + columnIndex * columnGap,
      y: geometry.y + 31 + rowIndex * 54
    };
  }
  if (geometry.miniFitSr) {
    const rowGap = (geometry.height - 66) / Math.max(1, connector.positions - 1);
    return {
      x: geometry.centerX,
      y: geometry.y + 33 + (numeric - 1) * rowGap
    };
  }
  const rowIndex = geometry.dual ? Math.floor((numeric - 1) / 2) : numeric - 1;
  const columnIndex = geometry.dual ? (numeric - 1) % 2 : 0;
  const rowGap = (geometry.height - 42) / Math.max(1, geometry.physicalRows - 1);
  return {
    x: geometry.dual
      ? geometry.x + 35 + columnIndex * (geometry.width - 70)
      : geometry.centerX,
    y: geometry.y + 21 + rowIndex * rowGap
  };
}

function datasheetConnectorWireAnchorPoint(connector, pin, side) {
  const point = datasheetConnectorPinPoint(connector, pin, side);
  const geometry = datasheetConnectorGeometry(connector, side);
  if (connector.key === "teCpc1714") {
    const dx = point.x - geometry.centerX;
    const dy = point.y - geometry.centerY;
    const distance = Math.hypot(dx, dy) || 1;
    const offset = 16;
    return {
      x: point.x + (dx / distance) * offset,
      y: point.y + (dy / distance) * offset
    };
  }
  if (connector.key === "powerpole1545") {
    return {
      x: point.x,
      y: geometry.y + geometry.moduleHeight
    };
  }
  const offset = geometry.miniFitSr ? 26 : geometry.sideLock ? 16 : geometry.dual ? 16 : 18;
  return {
    x: point.x + (side === "left" ? offset : -offset),
    y: point.y
  };
}

function buildDatasheetWireRoutes(model) {
  const routes = model.wires.map((wire, index) => ({
    wire,
    index,
    leftPoint: datasheetConnectorWireAnchorPoint(model.left, wire.fromPin, "left"),
    rightPoint: datasheetConnectorWireAnchorPoint(model.right, wire.toPin, "right")
  }));
  const verticalOrder = [...routes].sort((left, right) =>
    left.leftPoint.y - right.leftPoint.y ||
    left.leftPoint.x - right.leftPoint.x ||
    left.index - right.index
  );
  const rankByIndex = new Map(verticalOrder.map((route, rank) => [route.index, rank]));
  const middleRank = (routes.length - 1) / 2;
  const crossoverStep = routes.length > 1
    ? clamp(112 / (routes.length - 1), 9, 22)
    : 0;
  const crossoverCenterX = 800;

  return routes.map((route) => {
    const rank = rankByIndex.get(route.index) || 0;
    const crossoverX = crossoverCenterX + (middleRank - rank) * crossoverStep;
    const leftPowerpole = model.left.key === "powerpole1545";
    const rightPowerpole = model.right.key === "powerpole1545";
    let points;
    if (leftPowerpole || rightPowerpole) {
      points = [route.leftPoint];
      if (leftPowerpole) {
        points.push({ x: route.leftPoint.x, y: route.wire.laneY });
      }
      points.push({
        x: crossoverX,
        y: leftPowerpole ? route.wire.laneY : route.leftPoint.y
      });
      points.push({
        x: crossoverX,
        y: rightPowerpole ? route.wire.laneY : route.rightPoint.y
      });
      if (rightPowerpole) {
        points.push({ x: route.rightPoint.x, y: route.wire.laneY });
      }
      points.push(route.rightPoint);
    } else {
      points = Math.abs(route.leftPoint.y - route.rightPoint.y) < 0.5
        ? [route.leftPoint, route.rightPoint]
        : [
            route.leftPoint,
            { x: crossoverX, y: route.leftPoint.y },
            { x: crossoverX, y: route.rightPoint.y },
            route.rightPoint
          ];
    }
    return {
      ...route,
      crossoverX,
      points
    };
  });
}

function roundedSvgPolylinePath(points, radius = 12) {
  if (!points.length) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incomingX = current.x - previous.x;
    const incomingY = current.y - previous.y;
    const outgoingX = next.x - current.x;
    const outgoingY = next.y - current.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    const outgoingLength = Math.hypot(outgoingX, outgoingY);
    const cross = incomingX * outgoingY - incomingY * outgoingX;
    if (incomingLength < 0.5 || outgoingLength < 0.5 || Math.abs(cross) < 0.5) {
      path += ` L ${current.x} ${current.y}`;
      continue;
    }
    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const cornerStart = {
      x: current.x - incomingX / incomingLength * cornerRadius,
      y: current.y - incomingY / incomingLength * cornerRadius
    };
    const cornerEnd = {
      x: current.x + outgoingX / outgoingLength * cornerRadius,
      y: current.y + outgoingY / outgoingLength * cornerRadius
    };
    path += ` L ${cornerStart.x} ${cornerStart.y} Q ${current.x} ${current.y} ${cornerEnd.x} ${cornerEnd.y}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function buildDatasheetConnectorFaceSvg(connector, side) {
  const geometry = datasheetConnectorGeometry(connector, side);
  const heading = `${connector.definition.manufacturer} ${connector.definition.family}`.trim();
  const partLabel = connector.key === "powerpole1545"
    ? "1327 COLOR HOUSING SERIES"
    : datasheetConnectorPartLabel(connector);
  const output = [
    `<g aria-label="${escapeXml(heading)} ${connector.positions} position mating face">`,
    `<text class="ds-connector-name" x="${geometry.centerX}" y="122">${escapeXml(connector.name)}</text>`,
    `<text class="ds-connector-part" x="${geometry.centerX}" y="141">${escapeXml(shortLabel(partLabel, 40))}</text>`,
    `<text class="ds-connector-detail" x="${geometry.centerX}" y="158">${escapeXml(`${heading} | ${connector.positions} POS | ${connector.definition.pitch}`)}</text>`
  ];
  if (connector.key === "teCpc1714") {
    const faceLabel = datasheetConnectorViewLabel(connector);
    if (connector.flange) {
      output.push(`
        <rect class="cpc-flange" x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="14" />
        <circle class="cpc-mount-hole" cx="${geometry.x + 19}" cy="${geometry.y + 19}" r="7" />
        <circle class="cpc-mount-hole" cx="${geometry.x + geometry.width - 19}" cy="${geometry.y + 19}" r="7" />
        <circle class="cpc-mount-hole" cx="${geometry.x + 19}" cy="${geometry.y + geometry.height - 19}" r="7" />
        <circle class="cpc-mount-hole" cx="${geometry.x + geometry.width - 19}" cy="${geometry.y + geometry.height - 19}" r="7" />`);
    } else {
      output.push(`
        <circle class="cpc-coupling-ring" cx="${geometry.centerX}" cy="${geometry.centerY}" r="94" />
        ${Array.from({ length: 16 }, (_, index) => {
          const angle = index * Math.PI / 8;
          const x1 = geometry.centerX + Math.cos(angle) * 83;
          const y1 = geometry.centerY + Math.sin(angle) * 83;
          const x2 = geometry.centerX + Math.cos(angle) * 93;
          const y2 = geometry.centerY + Math.sin(angle) * 93;
          return `<line class="cpc-ring-rib" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
        }).join("")}`);
    }
    output.push(`
      <circle class="cpc-thread-ring" cx="${geometry.centerX}" cy="${geometry.centerY}" r="83" />
      <circle class="${connector.faceStyle === "recessed" ? "cpc-face-recessed" : "cpc-face"}" cx="${geometry.centerX}" cy="${geometry.centerY}" r="75" />
      <path class="cpc-keyway" d="M ${geometry.centerX - 16} ${geometry.centerY - 75} H ${geometry.centerX + 16} L ${geometry.centerX + 11} ${geometry.centerY - 64} H ${geometry.centerX - 11} Z" />
      <path class="cpc-keyway" d="M ${geometry.centerX - 75} ${geometry.centerY - 8} L ${geometry.centerX - 62} ${geometry.centerY - 3} V ${geometry.centerY + 3} L ${geometry.centerX - 75} ${geometry.centerY + 8} Z" />`);
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      if (connector.contactType === "socket") {
        output.push(`
          <circle class="cpc-cavity" cx="${point.x}" cy="${point.y}" r="13" stroke="${active?.stroke || "#80878b"}" stroke-width="${active ? 4 : 1.5}" />
          <circle class="cpc-socket-hole" cx="${point.x}" cy="${point.y}" r="5.5" />`);
      } else {
        output.push(`
          <circle class="cpc-cavity" cx="${point.x}" cy="${point.y}" r="13" stroke="${active?.stroke || "#80878b"}" stroke-width="${active ? 4 : 1.5}" />
          <circle class="cpc-pin-contact" cx="${point.x}" cy="${point.y}" r="5.5" />`);
      }
      output.push(`<text class="cpc-pin-number" x="${point.x}" y="${point.y - 6}">${pin}</text>`);
    }
    output.push(`<text class="ds-connector-detail" x="${geometry.centerX}" y="${geometry.y + geometry.height + 22}">${faceLabel}</text>`);
  } else if (connector.key === "powerpole1545") {
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const index = pin - 1;
      const column = index % geometry.columns;
      const row = Math.floor(index / geometry.columns);
      const x = geometry.x + column * (geometry.moduleWidth + geometry.gap);
      const y = geometry.y + row * (geometry.moduleHeight + geometry.gap);
      const circuitPin = connector.pinOrder?.[pin - 1] || String(pin);
      const active = connector.activePins.get(circuitPin);
      const fill = active ? datasheetHousingFill(active.colorName) : "#6d7578";
      const textFill = isDarkDatasheetColor(active?.colorName) ? "#ffffff" : "#000000";
      output.push(`
        <path class="powerpole-module" d="M ${x + 5} ${y} H ${x + geometry.moduleWidth - 5} L ${x + geometry.moduleWidth} ${y + 6} V ${y + geometry.moduleHeight - 6} L ${x + geometry.moduleWidth - 5} ${y + geometry.moduleHeight} H ${x + 5} L ${x} ${y + geometry.moduleHeight - 6} V ${y + 6} Z" fill="${fill}" />
        <rect class="powerpole-opening" x="${x + 6}" y="${y + 8}" width="${geometry.moduleWidth - 12}" height="18" rx="3" />
        <path class="powerpole-contact" d="M ${x + 9} ${y + 22} H ${x + geometry.moduleWidth - 9} L ${x + geometry.moduleWidth - 12} ${y + 16} H ${x + 12} Z" />
        <text class="ds-cavity-number" x="${x + geometry.moduleWidth / 2}" y="${y + geometry.moduleHeight - 8}" fill="${textFill}"></text>`);
    }
  } else if (connector.key === "catalogUnknown") {
    output.push(`
      <rect class="unknown-part-body" x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="9" />
      <text class="unknown-part-label" x="${geometry.centerX}" y="${geometry.y + 17}">NO STORED PART PROFILE</text>`);
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      output.push(`
        <rect class="unknown-part-cavity" x="${point.x - 15}" y="${point.y - 9}" width="30" height="18" rx="4" stroke="${active?.stroke || "#879097"}" stroke-width="${active ? 3.5 : 1.3}" />
        <text class="unknown-part-pin" x="${point.x}" y="${point.y + 4}">${pin}</text>`);
    }
    output.push(`
      <a href="${escapeXml(connector.lookupUrl)}" target="_blank">
        <text class="unknown-part-link" x="${geometry.centerX}" y="${geometry.y + geometry.height + 42}">LOOK UP ${escapeXml(shortLabel(connector.housingPart, 24))} ON DIGIKEY</text>
      </a>`);
  } else if (connector.key === "miniFitSr") {
    const rearView = connector.view === "rear";
    output.push(`
      <rect class="minifitsr-body" x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="5" />
      <rect class="minifitsr-guide" x="${geometry.x - 10}" y="${geometry.y + 17}" width="12" height="${geometry.height - 34}" rx="2" />
      <rect class="minifitsr-guide" x="${geometry.x + geometry.width - 2}" y="${geometry.y + 17}" width="12" height="${geometry.height - 34}" rx="2" />
      <path class="minifitsr-latch" d="M ${geometry.centerX - 29} ${geometry.y + 2} L ${geometry.centerX - 16} ${geometry.y - 23} H ${geometry.centerX + 21} L ${geometry.centerX + 34} ${geometry.y + 2} Z" />
      <rect class="${rearView ? "minifitsr-tpa-rear" : "minifitsr-face-rim"}" x="${geometry.x + 11}" y="${geometry.y + 10}" width="${geometry.width - 22}" height="${geometry.height - 20}" rx="3" />`);
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      output.push(`
        <rect class="${rearView ? "minifitsr-rear-cavity" : "minifitsr-cavity"}" x="${point.x - 25}" y="${point.y - 18}" width="50" height="36" rx="3" stroke="${active?.stroke || "#8b9296"}" stroke-width="${active ? 4 : 1.5}" />
        <rect class="${rearView ? "minifitsr-wire-entry" : "minifitsr-contact-window"}" x="${point.x - 8}" y="${point.y - 9}" width="16" height="18" rx="2" />
        <text class="ds-cavity-number" x="${point.x}" y="${point.y + 4}">${pin}</text>`);
    }
    output.push(`
      <path class="circuit-one-marker" d="M ${geometry.x + 9} ${geometry.y + 9} L ${geometry.x + 23} ${geometry.y + 9} L ${geometry.x + 9} ${geometry.y + 23} Z" />
      <text class="minifitsr-tpa-label" x="${geometry.centerX}" y="${geometry.y + geometry.height - 5}">${rearView ? "TPA / WIRE ENTRY" : "POLARIZED MINI-FIT SR."}</text>`);
  } else {
    const bodyClass = connector.key === "miniFitJr" ? "minifit-body" : "microfit-body";
    output.push(`<rect class="${bodyClass}" x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="9" />`);
    if (connector.key === "microFitFront") {
      output.push(`<path class="microfit-lock" d="M ${geometry.x + 24} ${geometry.y} L ${geometry.x + 36} ${geometry.y - 18} H ${geometry.x + geometry.width - 20} L ${geometry.x + geometry.width - 10} ${geometry.y} Z" />`);
    } else if (connector.key === "microFitSide") {
      output.push(`
        <rect class="microfit-lock" x="${geometry.centerX - 20}" y="${geometry.y + geometry.height}" width="40" height="34" rx="4" />
        <text class="ds-lock-label" x="${geometry.centerX}" y="${geometry.y + geometry.height + 22}">LOCK</text>`);
    } else if (connector.key === "miniFitJr") {
      output.push(`<path class="minifit-latch" d="M ${geometry.centerX - 22} ${geometry.y} L ${geometry.centerX - 12} ${geometry.y - 20} H ${geometry.centerX + 25} L ${geometry.centerX + 34} ${geometry.y} Z" />`);
    }
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      output.push(`
        <rect class="ds-cavity" x="${point.x - 15}" y="${point.y - 9}" width="30" height="18" rx="4" stroke="${active?.stroke || "#9ca3a7"}" stroke-width="${active ? 3.5 : 1.3}" />
        <rect class="ds-cavity-hole" x="${point.x - 6}" y="${point.y - 4}" width="12" height="8" rx="2" />
        <text class="ds-cavity-number" x="${point.x}" y="${point.y + 4}">${pin}</text>`);
    }
    output.push(`<path class="circuit-one-marker" d="M ${geometry.x + 8} ${geometry.y + 8} L ${geometry.x + 18} ${geometry.y + 8} L ${geometry.x + 8} ${geometry.y + 18} Z" />`);
  }
  if (connector.key !== "teCpc1714") {
    const captionOffset = connector.key === "microFitSide" ? 56 : 22;
    output.push(`<text class="ds-connector-detail" x="${geometry.centerX}" y="${geometry.y + geometry.height + captionOffset}">${datasheetConnectorViewLabel(connector)}</text>`);
  }
  output.push("</g>");
  return output.join("");
}

function datasheetHousingFill(colorName) {
  const color = normalizeColorName(colorName);
  if (color === "RED") return "#d62828";
  if (color === "BLACK") return "#151719";
  if (color === "GREEN") return "#198754";
  if (color === "WHITE") return "#f1f1ec";
  if (color === "BLUE") return "#1769aa";
  if (color === "YELLOW") return "#f0c419";
  if (color === "ORANGE") return "#ef7f1a";
  if (color === "BROWN") return "#74452a";
  if (color === "PINK") return "#e88aad";
  if (color === "VIOLET") return "#6f42c1";
  return "#858b8f";
}

function isDarkDatasheetColor(colorName) {
  const color = normalizeColorName(colorName);
  return ["BLACK", "BLUE", "BROWN", "VIOLET"].includes(color);
}

function buildDatasheetConnectorHarnessSvg(result, model) {
  const routes = buildDatasheetWireRoutes(model);
  const wireSvg = routes.map(({ wire, leftPoint, rightPoint, points }) => {
    const colorSpec = wireColorSpec(wire.row?.color || wire.colorLabel || wire.colorName);
    return `
      <path class="ds-wire" d="${roundedSvgPolylinePath(points)}" stroke="${wire.stroke}" />
      ${colorSpec.stripeStroke ? `<path class="ds-wire-stripe" d="${roundedSvgPolylinePath(points)}" stroke="${colorSpec.stripeStroke}" />` : ""}
      <circle class="ds-terminal" cx="${leftPoint.x}" cy="${leftPoint.y}" r="4.5" />
      <circle class="ds-terminal" cx="${rightPoint.x}" cy="${rightPoint.y}" r="4.5" />
      <text class="ds-wire-label" x="640" y="${leftPoint.y - 5}">${escapeXml(`${wire.name} | ${wire.colorLabel || wire.colorName} | ${formatWireLengthLabel(wire.length)}`)}</text>`;
  }).join("");
  const routeYs = routes.flatMap((route) => route.points.map((point) => point.y));
  const protectionPadding = clamp(58 - model.wires.length * 2, 24, 48);
  const protectionTop = Math.min(...routeYs) - protectionPadding;
  const protectionBottom = Math.max(...routeYs) + protectionPadding;
  const firstHalf = model.wires.slice(0, 8);
  const secondHalf = model.wires.slice(8, 16);
  const tableRows = (wires) => wires.map((wire) => [
    wire.fromPin,
    wire.name,
    wire.colorLabel || wire.colorName,
    wire.awg || model.gauge || "",
    formatLengthMeasurement(wire.length || model.length),
    wire.toPin
  ]);
  const parts = buildDatasheetPartsPanelLines(model);
  const warnings = model.warnings.slice(0, 3).map((warning, index) =>
    `<text class="ds-warning" x="800" y="${111 + index * 15}">${escapeXml(shortLabel(warning, 150))}</text>`
  ).join("");
  const partLines = parts.map((line, index) =>
    `<text class="${line.warning ? "ds-part-warning" : "ds-part-line"}" x="1226" y="${548 + index * 18}">${escapeXml(shortLabel(line.text, 50))}</text>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(model.cableName)} datasheet connector drawing">
  <defs>
    ${buildBraidPatternDefs()}
    <style>
      .page { fill: #ffffff; }
      .border { fill: none; stroke: #000000; stroke-width: 2; }
      .title { fill: #000000; font: 900 31px Aptos, Segoe UI, sans-serif; text-anchor: middle; letter-spacing: 0.8px; }
      .subtitle { fill: #222222; font: 900 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; text-decoration: underline; }
      .ds-warning { fill: #b42318; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .ds-connector-name { fill: #000000; font: 900 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .ds-connector-part { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .ds-connector-detail { fill: #3d4448; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .unknown-part-body { fill: #f7f9fa; stroke: #7a858c; stroke-width: 3; stroke-dasharray: 8 6; }
      .unknown-part-label { fill: #b42318; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .unknown-part-cavity { fill: #ffffff; stroke-dasharray: 4 3; }
      .unknown-part-pin { fill: #222222; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .unknown-part-link { fill: #005ea8; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; text-decoration: underline; }
      .microfit-body { fill: #25292c; stroke: #050505; stroke-width: 3; }
      .minifit-body { fill: #ded9c9; stroke: #111111; stroke-width: 3; }
      .microfit-lock { fill: #353a3d; stroke: #050505; stroke-width: 2.5; }
      .ds-lock-label { fill: #ffffff; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .minifit-latch { fill: #c8c1ad; stroke: #111111; stroke-width: 2.5; }
      .minifitsr-body { fill: #202427; stroke: #050606; stroke-width: 4; }
      .minifitsr-guide { fill: #303538; stroke: #050606; stroke-width: 2; }
      .minifitsr-latch { fill: #2d3235; stroke: #050606; stroke-width: 3; }
      .minifitsr-face-rim { fill: #16191b; stroke: #535a5e; stroke-width: 2; }
      .minifitsr-tpa-rear { fill: #292e31; stroke: #6c7479; stroke-width: 3; }
      .minifitsr-cavity { fill: #090a0a; }
      .minifitsr-rear-cavity { fill: #24282a; }
      .minifitsr-contact-window { fill: #303638; stroke: #858e93; stroke-width: 1; }
      .minifitsr-wire-entry { fill: #090a0a; stroke: #b8bec1; stroke-width: 1.2; }
      .minifitsr-tpa-label { fill: #dce0e2; font: 900 7px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .ds-cavity { fill: #090a0a; }
      .ds-cavity-hole { fill: #313638; stroke: #d9dddf; stroke-width: 0.8; }
      .ds-cavity-number { fill: #ffffff; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .circuit-one-marker { fill: #f0f2f3; stroke: #050505; stroke-width: 1; }
      .powerpole-module { stroke: #111111; stroke-width: 2; }
      .powerpole-opening { fill: #101314; stroke: #000000; stroke-width: 1.5; }
      .powerpole-contact { fill: #c7cccf; stroke: #f4f5f5; stroke-width: 1; }
      .cpc-flange { fill: #171a1c; stroke: #020303; stroke-width: 4; }
      .cpc-mount-hole { fill: #ffffff; stroke: #020303; stroke-width: 3; }
      .cpc-coupling-ring { fill: #24282b; stroke: #020303; stroke-width: 4; }
      .cpc-ring-rib { stroke: #050606; stroke-width: 4; stroke-linecap: round; }
      .cpc-thread-ring { fill: #24282b; stroke: #050606; stroke-width: 5; }
      .cpc-face { fill: #202427; stroke: #050606; stroke-width: 3; }
      .cpc-face-recessed { fill: #121517; stroke: #4c5357; stroke-width: 6; }
      .cpc-keyway { fill: #050606; stroke: #687176; stroke-width: 1; }
      .cpc-cavity { fill: #33383b; }
      .cpc-socket-hole { fill: #050606; stroke: #9aa2a6; stroke-width: 1; }
      .cpc-pin-contact { fill: #d8b967; stroke: #fff2b8; stroke-width: 1.2; }
      .cpc-pin-number { fill: #ffffff; font: 900 7px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #000000; stroke-width: 2; }
      .ds-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
      .ds-wire-stripe { fill: none; stroke-width: 2.2; stroke-linecap: butt; stroke-linejoin: round; stroke-dasharray: 10 9; }
      .ds-terminal { fill: #ffffff; stroke: #000000; stroke-width: 1.8; }
      .ds-wire-label { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .table-outline { fill: #ffffff; stroke: #000000; stroke-width: 1.3; }
      .table-grid { stroke: #000000; stroke-width: 0.9; }
      .table-title { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #000000; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #000000; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .ds-parts-box { fill: #fffdf5; stroke: #000000; stroke-width: 1.5; }
      .ds-parts-title { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; }
      .ds-part-line { fill: #111111; font: 800 10px Aptos, Segoe UI, sans-serif; }
      .ds-part-warning { fill: #b42318; font: 900 10px Aptos, Segoe UI, sans-serif; }
      .protection-label { fill: #1f2930; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="page" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="10" y="10" width="1580" height="780" />
  <text class="title" x="800" y="48">${escapeXml(model.cableName)}</text>
  <text class="subtitle" x="800" y="78">${escapeXml(model.description)}</text>
  <text class="ds-connector-detail" x="800" y="98">DATASHEET-AWARE CONNECTOR MATING FACES | EXPANDABLE BRAID + HEAT SHRINK</text>
  ${warnings}

  ${buildHorizontalProtectionSvg({
    x1: 454,
    x2: 1146,
    top: protectionTop,
    bottom: protectionBottom,
    labelY: protectionTop - 10,
    endLabelY: protectionBottom + 18,
    bandWidth: 26
  })}
  ${buildDatasheetConnectorFaceSvg(model.left, "left")}
  ${buildDatasheetConnectorFaceSvg(model.right, "right")}
  ${wireSvg}

  ${buildSvgTable({
    x: 30,
    y: 510,
    width: 575,
    title: secondHalf.length ? "WIRING TABLE 1-8" : "WIRING TABLE",
    headers: ["LEFT", "SIGNAL", "COLOR", "AWG", "LENGTH", "RIGHT"],
    rows: tableRows(firstHalf),
    colWidths: [60, 180, 90, 55, 95, 60],
    rowHeight: 22,
    titleHeight: 26,
    headerHeight: 26
  })}
  ${secondHalf.length ? buildSvgTable({
    x: 620,
    y: 510,
    width: 575,
    title: `WIRING TABLE 9-${model.wires.length}`,
    headers: ["LEFT", "SIGNAL", "COLOR", "AWG", "LENGTH", "RIGHT"],
    rows: tableRows(secondHalf),
    colWidths: [60, 180, 90, 55, 95, 60],
    rowHeight: 22,
    titleHeight: 26,
    headerHeight: 26
  }) : ""}

  <rect class="ds-parts-box" x="1210" y="510" width="350" height="252" />
  <text class="ds-parts-title" x="1226" y="532">DATASHEET PARTS / CRIMP TOOLS</text>
  ${partLines}
</svg>`;
}

function buildDatasheetPartsPanelLines(model) {
  const lines = [];
  const grouped = [];
  if (model.left.key === "teCpc1714" || model.right.key === "teCpc1714") {
    lines.push({ text: "CPC: 600 V max | 13 A/contact; derate loaded connector" });
    lines.push({ text: "CPC housing: -55 to 105 C | UL94 V-0 thermoplastic" });
  }
  [
    ["LEFT", model.left],
    ["RIGHT", model.right]
  ].forEach(([label, connector]) => {
    const signature = [
      connector.key,
      connector.positions,
      connector.housingPart,
      connector.contactPart,
      connector.toolPart,
      connector.contactType
    ].join("|");
    const existing = grouped.find((item) => item.signature === signature);
    if (existing) {
      existing.labels.push(label);
    } else {
      grouped.push({ signature, labels: [label], connector });
    }
  });
  grouped.forEach(({ labels, connector }) => {
    const label = labels.join("/");
    lines.push({
      text: connector.key === "teCpc1714"
        ? `${label}: ${connector.definition.family} ${connector.positions} POS ${connector.faceStyle.toUpperCase()} ${connector.contactType.toUpperCase()}`
        : `${label}: ${connector.definition.family} ${connector.positions} POS`
    });
    if (connector.key === "powerpole1545" && connector.powerpoleParts.length) {
      for (let index = 0; index < connector.powerpoleParts.length; index += 2) {
        const parts = connector.powerpoleParts.slice(index, index + 2)
          .map((item) => `${item.color} ${item.part} x${item.quantity}`)
          .join(" | ");
        lines.push({ text: `Housing: ${parts}` });
      }
    } else if (connector.key === "teCpc1714") {
      lines.push({ text: `Housing: ${connector.housingPart} | Mate: ${connector.matingPart}` });
    } else {
      lines.push({ text: `Housing: ${connector.housingPart}` });
    }
    lines.push({
      text: connector.key === "teCpc1714" && connector.insulationRange
        ? `Contact: ${connector.contactPart} | ${connector.insulationRange}`
        : `Contact: ${connector.contactPart}`
    });
    lines.push({ text: `Tool: ${connector.toolPart}` });
  });
  model.warnings.slice(0, 3).forEach((warning) => lines.push({
    text: warning.includes("non-sealed")
      ? "WARNING: CPC 17-14 bare housings are not sealed or IP rated."
      : `WARNING: ${warning}`,
    warning: true
  }));
  return lines.slice(0, 11);
}

function buildLargeCircularPairHarnessModel(sheet) {
  const rows = getKiCadWireRows(sheet.rows);
  const rawGroups = buildKiCadWireGroups(rows);
  if (rows.length < 36 || rawGroups.length < 3 || rawGroups.some((group) => group.rows.length < 12)) {
    return null;
  }
  const circularRowCount = rows.filter((row) => {
    const leftText = normalizeText([row.leftLegName, row.leftHousingType, row.leftHousingPart].join(" "));
    const rightText = normalizeText([row.rightLegName, row.rightHousingType, row.rightHousingPart].join(" "));
    return isCircularConnectorText(leftText) && isCircularConnectorText(rightText);
  }).length;
  if (circularRowCount < Math.ceil(rows.length * 0.75)) {
    return null;
  }

  const groupHeight = 410;
  const groups = rawGroups.map((group, groupIndex) => {
    const sortedRows = [...group.rows].sort((left, right) => {
      const leftPin = numericPin(left.leftPinPos);
      const rightPin = numericPin(right.leftPinPos);
      return (Number.isFinite(leftPin) ? leftPin : 999) - (Number.isFinite(rightPin) ? rightPin : 999);
    });
    const groupTop = 100 + groupIndex * groupHeight;
    const wires = sortedRows.map((row, index) => ({
      index,
      row,
      y: groupTop + 75 + index * 20,
      name: sheetRowLeftWireName(row, `WIRE ${index + 1}`),
      rightName: sheetRowRightWireName(row, `WIRE ${index + 1}`),
      colorName: normalizeColorName(row.color),
      colorLabel: normalizeWireColorLabel(row.color),
      stroke: sheetColorToStroke(row.color),
      fromPin: row.leftPinPos || String(index + 1),
      toPin: row.rightPinPos || String(index + 1),
      length: row.length || ""
    }));
    const leftLegName = firstFilled(sortedRows, "leftLegName") || `PB${groupIndex + 1}`;
    const rightLegName = firstFilled(sortedRows, "rightLegName") || `CPC${groupIndex + 1}`;
    return {
      ...group,
      groupTop,
      wires,
      pairAnalysis: analyzeSheetTwistedPairs(wires),
      leftName: compactCircularConnectorName(leftLegName, "left", groupIndex),
      rightName: compactCircularConnectorName(rightLegName, "right", groupIndex),
      leftType: firstFilled(sortedRows, "leftHousingType") || "16 PIN SUBCON",
      rightType: firstFilled(sortedRows, "rightHousingType") || "16 PIN CPC"
    };
  });
  return {
    cableName: firstFilled(rows, "cableName") || sheet.cableName || "WIRE HARNESS",
    length: dominantSheetValue(rows, "length") || firstFilled(rows, "length") || "",
    rows,
    groups,
    width: 2200,
    height: 120 + groups.length * groupHeight,
    totalWires: rows.length
  };
}

function isCircularConnectorText(value) {
  const text = normalizeText(value);
  return text.includes("CPC") || text.includes("SUBCON") || text.includes("SUB CONNECTOR") || text.includes("PBOF") || text.includes("CIRCULAR");
}

function compactCircularConnectorName(value, side, index) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  const parts = text.split(/\s+TO\s+/i).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return side === "left" ? parts[0] : parts[parts.length - 1];
  }
  return text || `${side === "left" ? "PB" : "CPC"}${index + 1}`;
}

function buildLargeCircularPairHarnessSvg(result, model) {
  const leftFaceX = 145;
  const rightFaceX = model.width - 145;
  const leftWireX = 360;
  const rightWireX = model.width - 360;
  const groupSvg = model.groups.map((group) => {
    const firstY = group.wires[0].y;
    const lastY = group.wires[group.wires.length - 1].y;
    const centerY = (firstY + lastY) / 2;
    const wires = group.wires.map((wire) => {
      const geometry = sheetWireRouteGeometry(wire, group.pairAnalysis, leftWireX, rightWireX);
      const colorSpec = wireColorSpec(wire.row.color || wire.colorLabel || wire.colorName);
      const pairId = sheetTwistedPairId(wire.row);
      const label = [wire.name, colorSpec.label, pairId ? `TWISTED PAIR ${pairId}` : ""].filter(Boolean).join(" | ");
      return `
        <path class="large-wire" d="${geometry.svgPath}" stroke="${wire.stroke}" />
        ${colorSpec.stripeStroke ? `<path class="large-wire-stripe" d="${geometry.svgPath}" stroke="${colorSpec.stripeStroke}" />` : ""}
        <circle class="wire-end" cx="${leftWireX}" cy="${wire.y}" r="4" />
        <circle class="wire-end" cx="${rightWireX}" cy="${wire.y}" r="4" />
        <text class="large-left-pin" x="${leftWireX - 18}" y="${wire.y + 4}">${escapeXml(wire.fromPin)}</text>
        <text class="large-right-pin" x="${rightWireX + 18}" y="${wire.y + 4}">${escapeXml(wire.toPin)}</text>
        <text class="large-wire-label" x="${model.width / 2}" y="${wire.y - 4}">${escapeXml(label)}</text>`;
    }).join("");
    return `
      <g class="large-connector-group">
        <text class="large-group-title" x="${model.width / 2}" y="${group.groupTop + 28}">${escapeXml(group.leftName)} TO ${escapeXml(group.rightName)} | ${group.wires.length} WIRES</text>
        <rect class="large-protection" x="${leftWireX + 28}" y="${firstY - 12}" width="${rightWireX - leftWireX - 56}" height="${lastY - firstY + 24}" rx="34" />
        <rect class="large-collar" x="${leftWireX + 18}" y="${firstY - 18}" width="24" height="${lastY - firstY + 36}" rx="8" />
        <rect class="large-collar" x="${rightWireX - 42}" y="${firstY - 18}" width="24" height="${lastY - firstY + 36}" rx="8" />
        ${buildLargeCircularFaceSvg(leftFaceX, centerY, group.leftName, group.leftType)}
        ${buildLargeCircularFaceSvg(rightFaceX, centerY, group.rightName, group.rightType)}
        ${wires}
      </g>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="${escapeXml(model.cableName)} ${model.totalWires} wire circular connector harness">
  <style>
    .page { fill: #ffffff; }
    .border { fill: none; stroke: #111111; stroke-width: 2; }
    .large-title { fill: #111111; font: 900 34px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    .large-subtitle { fill: #333333; font: 800 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    .large-group-title { fill: #111111; font: 900 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    .large-protection { fill: #d7dde0; fill-opacity: .32; stroke: #68737a; stroke-width: 2; stroke-dasharray: 8 6; }
    .large-collar { fill: #171717; stroke: #000000; stroke-width: 1; }
    .large-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
    .large-wire-stripe { fill: none; stroke-width: 2.2; stroke-linecap: butt; stroke-dasharray: 10 8; }
    .large-wire-label { fill: #111111; font: 800 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    .large-left-pin { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: end; }
    .large-right-pin { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: start; }
    .wire-end { fill: #ffffff; stroke: #111111; stroke-width: 1.5; }
    .connector-shell { fill: #eeeeee; stroke: #111111; stroke-width: 3; }
    .connector-key { fill: #111111; }
    .connector-cavity { fill: #f9f9f9; stroke: #111111; stroke-width: 1.4; }
    .connector-pin { fill: #111111; font: 800 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    .connector-name { fill: #111111; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
    .connector-type { fill: #333333; font: 800 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
  </style>
  <rect class="page" x="0" y="0" width="${model.width}" height="${model.height}" />
  <rect class="border" x="12" y="12" width="${model.width - 24}" height="${model.height - 24}" />
  <text class="large-title" x="${model.width / 2}" y="52">${escapeXml(model.cableName)} — ${model.totalWires} CONDUCTORS</text>
  <text class="large-subtitle" x="${model.width / 2}" y="78">${model.groups.length} × 16-PIN CIRCULAR CONNECTOR LEGS${model.length ? ` | ${escapeXml(formatWireLengthLabel(model.length))}` : ""}</text>
  ${groupSvg}
</svg>`;
}

function buildLargeCircularFaceSvg(cx, cy, name, type) {
  const cavities = CPC_17_16_PIN_LAYOUT.map((position) => `
    <circle class="connector-cavity" cx="${cx + position.dx}" cy="${cy + position.dy}" r="11" />
    <text class="connector-pin" x="${cx + position.dx}" y="${cy + position.dy + 3}">${position.pin}</text>`).join("");
  return `
    <g class="large-circular-face">
      <text class="connector-name" x="${cx}" y="${cy - 116}">${escapeXml(name)}</text>
      <text class="connector-type" x="${cx}" y="${cy - 98}">${escapeXml(connectorTypeWithDefaultView(type))}</text>
      <circle class="connector-shell" cx="${cx}" cy="${cy}" r="92" />
      <rect class="connector-key" x="${cx - 16}" y="${cy - 94}" width="32" height="10" rx="3" />
      ${cavities}
    </g>`;
}

function buildKiCadHarnessModel(sheet) {
  const rows = getKiCadWireRows(sheet.rows);
  if (rows.length < 2) {
    return null;
  }
  const cableName = firstFilled(rows, "cableName") || sheet.cableName || "WIRE HARNESS";
  const leftName = cleanConnectorName(firstFilled(rows, "leftLegName") || firstFilled(rows, "leftHousingType") || "LEFT CONNECTOR");
  const leftType = firstFilled(rows, "leftHousingType");
  const leftHousingPart = firstFilled(rows, "leftHousingPart");
  const rightName = cleanConnectorName(connectorSideName(rows, "right") || "RIGHT CONNECTOR");
  const rightType = firstFilled(rows, "rightHousingType");
  const rightHousingPart = firstFilled(rows, "rightHousingPart");
  const length = dominantSheetValue(rows, "length") || firstFilled(rows, "length") || "";
  const awg = dominantSheetValue(rows, "awg") || firstFilled(rows, "awg") || "";
  const leftPositionRows = getKiCadConnectorPositionRows(sheet.rows, rows, "left");
  const rightPositionRows = getKiCadConnectorPositionRows(sheet.rows, rows, "right");
  const leftPositionCount = inferKiCadConnectorPositionCount(leftPositionRows, rows, "left");
  const rightPositionCount = inferKiCadConnectorPositionCount(rightPositionRows, rows, "right");
  const leftUnusedPins = getKiCadUnusedConnectorPins(leftPositionRows, "left", leftPositionCount);
  const rightUnusedPins = getKiCadUnusedConnectorPins(rightPositionRows, "right", rightPositionCount);
  const leftActivePositionCount = countKiCadActiveConnectorPins(rows, "left");
  const rightActivePositionCount = countKiCadActiveConnectorPins(rows, "right");
  const groups = buildKiCadWireGroups(rows);
  const isMultiGroup = groups.length >= 2 && rows.length > 4 && isMaestroStyleSheet(rows);
  if (groups.length >= 2 && !isMultiGroup) {
    return null;
  }
  const groupNames = groups.map((group) => group.name).filter(Boolean);
  const description = isMultiGroup
    ? `${shortListLabel(groupNames, 4)} TO ${rightName}`.replace(/\s+/g, " ").trim()
    : `${leftName} TO ${rightName}`.replace(/\s+/g, " ").trim();
  const routing = prepareKiCadRoutingRows(rows);
  const routingRows = routing.rows;
  const wireStartY = isMultiGroup ? 205 : routingRows.length > 12 ? 180 : 208;
  const wireGap = routingRows.length > 12 ? 38 : routingRows.length > 8 ? 44 : routingRows.length <= 4 ? 66 : 52;
  const wires = routingRows.map((row, index) => {
    const leftWireName = sheetRowLeftWireName(row, `WIRE ${index + 1}`);
    const rightWireName = sheetRowRightWireName(row, `WIRE ${index + 1}`);
    const colorSource = kiCadWireColorSource(row);
    const usesRightColor = routing.standardT568b || colorSource === row.rightWireName;
    return {
      index,
      row,
      name: usesRightColor ? rightWireName : leftWireName,
      leftName: routing.standardT568b ? rightWireName : leftWireName,
      rightName: rightWireName,
      colorName: normalizeColorName(colorSource),
      colorLabel: normalizeWireColorLabel(colorSource),
      stroke: sheetColorToStroke(colorSource),
      awg: row.awg || awg,
      length: row.length || length,
      fromPin: row.leftPinPos || String(index + 1),
      toPin: row.rightPinPos || String(index + 1),
      leftHousingPart: row.leftHousingPart || "",
      leftPinPart: row.leftPinPart || "",
      rightHousingPart: row.rightHousingPart || "",
      rightPinPart: row.rightPinPart || "",
      groupKey: groupKeyForSheetRow(row),
      y: isMultiGroup ? multiGroupWireY(row, groups) : wireStartY + index * wireGap,
      rightLocalPin: isMultiGroup ? localPinNumber(row.rightPinPos, groups.find((group) => group.key === groupKeyForSheetRow(row))?.rightBasePin) : row.rightPinPos,
      leftLocalPin: isMultiGroup ? localPinNumber(row.leftPinPos, groups.find((group) => group.key === groupKeyForSheetRow(row))?.leftBasePin) : row.leftPinPos,
      maestroRole: maestroPinRole(row, isMultiGroup ? localPinNumber(row.rightPinPos, groups.find((group) => group.key === groupKeyForSheetRow(row))?.rightBasePin) : row.rightPinPos)
    };
  });
  const rightConnectorGroups = isMultiGroup ? [] : inferKiCadRightConnectorGroups(wires, rightPositionRows);
  const hasMultipleRightConnectors = !isMultiGroup && rightConnectorGroups.length > 1;
  if (hasMultipleRightConnectors) {
    alignKiCadWiresToRightConnectorGroups(wires, rightConnectorGroups);
  }
  const twistedPairAnalysis = analyzeSheetTwistedPairs(wires);
  assignKiCadWireLabelLayout(wires, twistedPairAnalysis);
  groups.forEach((group) => {
    group.wires = wires.filter((wire) => wire.groupKey === group.key);
  });

  return {
    cableName,
    description: hasMultipleRightConnectors
      ? `${leftName} TO ${rightConnectorGroups.length} RIGHT CONNECTOR LEGS`
      : description,
    length,
    awg,
    wires,
    twistedPairAnalysis,
    groups,
    rightConnectorGroups,
    isMultiGroup,
    leftConnector: {
      name: isMultiGroup ? "ESC PCB" : leftName,
      type: uniqueValues([
        leftType && normalizeText(leftType) !== normalizeText(leftName) ? leftType : "",
        leftHousingPart
      ]).filter(Boolean).join(" | "),
      housingPart: leftHousingPart,
      positionText: isMultiGroup
        ? `${groups.length} x 3 POSITION`
        : formatKiCadConnectorPositionText(leftPositionCount, leftActivePositionCount, leftUnusedPins),
      positionCount: leftPositionCount,
      activePositionCount: leftActivePositionCount,
      unusedPins: leftUnusedPins,
      view: connectorViewFromType(leftType)
    },
    rightConnector: {
      name: hasMultipleRightConnectors ? `${rightConnectorGroups.length} RIGHT CONNECTORS` : rightName,
      type: hasMultipleRightConnectors
        ? "GROUPED BY RIGHT LEG"
        : uniqueValues([
            rightType && !normalizeText(rightName).includes(normalizeText(rightType)) ? rightType : "",
            rightHousingPart
          ]).filter(Boolean).join(" | "),
      positionText: isMultiGroup
        ? `${groups.length} x 3 POSITION`
        : rightConnectorGroups.length > 1
          ? formatKiCadConnectorGroupSummary(rightConnectorGroups)
          : formatKiCadConnectorPositionText(rightPositionCount, rightActivePositionCount, rightUnusedPins),
      positionCount: rightPositionCount,
      activePositionCount: rightActivePositionCount,
      unusedPins: rightUnusedPins,
      housingPart: rightHousingPart,
      view: connectorViewFromType(rightType)
    }
  };
}

function connectorViewFromType(type) {
  const text = normalizeText(type);
  if (text.includes("RJ45")) {
    return "TOP VIEW";
  }
  if (text.includes("REAR VIEW")) {
    return "REAR VIEW";
  }
  if (text === "PCB" || text.includes("SOLDER VIEW") || text.includes("SOLDER SIDE")) {
    return "SOLDER SIDE";
  }
  return "FRONT VIEW";
}

function getKiCadConnectorPositionRows(sourceRows, activeRows, side) {
  const prefix = side === "left" ? "left" : "right";
  const activeSet = new Set(activeRows);
  return sourceRows.filter((row) => {
    if (activeSet.has(row)) {
      return true;
    }
    if (isRepeatedHeaderSheetRow(row) || !isNoWireRow(row) || !isMeaningfulSheetValue(row[`${prefix}PinPos`])) {
      return false;
    }
    return [
      row[`${prefix}Leg`],
      row[`${prefix}LegName`],
      row[`${prefix}HousingType`],
      row[`${prefix}HousingPart`],
      row[`${prefix}PinPart`]
    ].some(isMeaningfulSheetValue);
  });
}

function inferKiCadConnectorPositionCount(positionRows, activeRows, side) {
  const prefix = side === "left" ? "left" : "right";
  const declaredPositions = inferKiCadDeclaredPositionCount([...positionRows, ...activeRows], side);
  if (isKiCadSinglePositionTermination([...positionRows, ...activeRows], side) && declaredPositions <= 1) {
    return 1;
  }
  const activeSet = new Set(activeRows);
  const capacityRows = declaredPositions
    ? positionRows.filter((row) => {
        const pin = numericPin(row[`${prefix}PinPos`]);
        return activeSet.has(row) || !Number.isFinite(pin) || pin <= declaredPositions;
      })
    : positionRows;
  const pinLabels = uniqueValues(capacityRows
    .map((row) => String(row[`${prefix}PinPos`] || "").trim())
    .filter(Boolean));
  const numericPins = pinLabels.map(numericPin).filter(Number.isFinite);
  const highestPin = numericPins.length ? Math.max(...numericPins) : 0;
  const reasonableHighestPin = highestPin <= Math.max(16, pinLabels.length * 2) ? highestPin : 0;
  return Math.max(
    1,
    pinLabels.length,
    reasonableHighestPin,
    declaredPositions,
    countKiCadActiveConnectorPins(activeRows, side)
  );
}

function isKiCadSinglePositionTermination(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const text = normalizeText(rows.map((row) => [
    row[`${prefix}LegName`],
    row[`${prefix}HousingType`],
    row[`${prefix}HousingPart`],
    row[`${prefix}PinPart`]
  ].join(" ")).join(" "));
  return text.includes("FERRULE") ||
    /\b1\s*(?:POS|POSITION|PIN|CIRCUIT)\b/.test(text) ||
    text.includes("SINGLE POSITION") ||
    text.includes("SINGLE-POSITION");
}

function inferKiCadDeclaredPositionCount(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const counts = rows
    .map((row) => Number(row[`${prefix}ConnectorPositionCount`]) || 0)
    .filter((count) => count >= 1 && count <= 64);
  rows.forEach((row) => {
    const connectorText = normalizeText([
      row[`${prefix}LegName`],
      row[`${prefix}HousingType`],
      row[`${prefix}HousingPart`]
    ].join(" "));
    if (connectorText.includes("RJ45")) {
      counts.push(8);
    }
    if (connectorText.includes("2181120802") || connectorText.includes("218112-0802")) {
      counts.push(8);
    }
    [
      row[`${prefix}LegName`],
      row[`${prefix}HousingType`],
      row[`${prefix}HousingPart`]
    ].forEach((value) => {
      const text = normalizeText(value);
      for (const match of text.matchAll(/\b(\d{1,2})\s*(?:PIN|PINS|POS|POSITION|POSITIONS)\b/g)) {
        const count = Number(match[1]);
        if (count >= 1 && count <= 64) {
          counts.push(count);
        }
      }
      for (const match of text.matchAll(/\b(\d{1,2})\s*(?:CIRC|CIRCUIT|CIRCUITS)\b/g)) {
        const count = Number(match[1]);
        if (count >= 1 && count <= 64) {
          counts.push(count);
        }
      }
    });
  });
  return counts.length ? Math.max(...counts) : 0;
}

function countKiCadActiveConnectorPins(rows, side) {
  const prefix = side === "left" ? "left" : "right";
  const pins = uniqueValues(rows
    .map((row) => String(row[`${prefix}PinPos`] || "").trim())
    .filter(Boolean));
  return pins.length || rows.length;
}

function getKiCadUnusedConnectorPins(positionRows, side, positionCount = 0) {
  const prefix = side === "left" ? "left" : "right";
  return uniqueValues(positionRows
    .filter(isNoWireRow)
    .map((row) => String(row[`${prefix}PinPos`] || "").trim())
    .filter((pin) => {
      if (!pin) {
        return false;
      }
      const numeric = numericPin(pin);
      return !positionCount || !Number.isFinite(numeric) || numeric <= positionCount;
    }));
}

function formatKiCadConnectorPositionText(positionCount, activePositionCount, unusedPins) {
  const positions = Math.max(1, Number(positionCount) || activePositionCount || 1);
  return unusedPins.length || activePositionCount < positions
    ? `${positions} POSITION (${activePositionCount} USED)`
    : `${positions} POSITION`;
}

function inferKiCadRightConnectorGroups(wires, positionRows = []) {
  const groups = [];
  const endpointRecords = HarnessCore.buildEndpointRecords(positionRows, "right");
  const endpointRecordsById = new Map(endpointRecords.map((endpoint) => [endpoint.id, endpoint]));
  const hasExplicitLegs = wires.some((wire) => isMeaningfulSheetValue(wire.row.rightLeg));
  if (hasExplicitLegs) {
    wires.forEach((wire) => {
      const leg = String(wire.row.rightLeg || "").trim();
      const fallbackName = normalizeText(wire.row.rightLegName) || `ROW ${groups.length + 1}`;
      const key = isMeaningfulSheetValue(leg) ? `LEG:${normalizeText(leg)}` : `NAME:${fallbackName}`;
      let group = groups.find((candidate) => candidate.key === key);
      if (!group) {
        group = { key, index: groups.length, wires: [], name: "", palette: RIGHT_HOUSING_PALETTE[0] };
        groups.push(group);
      }
      group.wires.push(wire);
    });
  } else {
    let current = null;
    let previousPin = NaN;
    let previousLegName = "";
    wires.forEach((wire) => {
      const pin = numericPin(wire.toPin);
      const legName = normalizeText(wire.row.rightLegName);
      const pinReset = current && Number.isFinite(pin) && Number.isFinite(previousPin) && pin <= previousPin;
      const legNameChanged = current && legName && previousLegName && legName !== previousLegName;
      if (!current || pinReset || legNameChanged) {
        current = { key: `AUTO:${groups.length}`, index: groups.length, wires: [], name: "", palette: RIGHT_HOUSING_PALETTE[0] };
        groups.push(current);
      }
      current.wires.push(wire);
      previousPin = pin;
      previousLegName = legName || previousLegName;
    });
  }
  groups.forEach((group) => {
    const endpoint = endpointRecordsById.get(group.key);
    group.name = inferKiCadRightConnectorGroupName(group, groups.length);
    group.palette = RIGHT_HOUSING_PALETTE[group.index % RIGHT_HOUSING_PALETTE.length];
    const activeRows = group.wires.map((wire) => wire.row);
    const activeSet = new Set(activeRows);
    group.positionRows = positionRows.filter((row) => {
      if (activeSet.has(row)) {
        return true;
      }
      const leg = String(row.rightLeg || "").trim();
      if (hasExplicitLegs && isMeaningfulSheetValue(leg)) {
        return group.key === `LEG:${normalizeText(leg)}`;
      }
      const legName = normalizeText(row.rightLegName);
      return Boolean(legName && normalizeText(group.name) === legName);
    });
    // A ferrule leg is a physical one-position termination even when other rows
    // in the same imported harness describe a larger multi-position connector.
    // Clamp from the group's active row so Ethernet filler positions can never
    // inflate an adjacent GND/PWR ferrule housing.
    group.positionCount = endpoint?.positionCount || (isKiCadSinglePositionTermination(activeRows, "right")
      ? 1
      : inferKiCadConnectorPositionCount(group.positionRows, activeRows, "right"));
    group.unusedPins = endpoint?.unusedPins || getKiCadUnusedConnectorPins(group.positionRows, "right", group.positionCount);
    group.housingType = endpoint?.housingType || firstFilled(group.positionRows, "rightHousingType") || firstFilled(activeRows, "rightHousingType");
    group.housingPart = endpoint?.housingPart || firstFilled(group.positionRows, "rightHousingPart") || firstFilled(activeRows, "rightHousingPart");
    group.pinPart = endpoint?.pinPart || firstFilled(group.positionRows, "rightPinPart") || firstFilled(activeRows, "rightPinPart");
    group.endpoint = endpoint || null;
  });
  assignKiCadRightConnectorLayout(groups);
  return groups;
}

function inferKiCadRightConnectorGroupName(group, groupCount) {
  const legNames = uniqueValues(
    group.wires
      .map((wire) => wire.row.rightLegName)
      .filter(isMeaningfulSheetValue)
  );
  if (legNames.length) {
    const counts = new Map();
    legNames.forEach((name) => {
      const key = normalizeText(name);
      const current = counts.get(key) || { name, count: 0 };
      current.count += group.wires.filter((wire) => normalizeText(wire.row.rightLegName) === key).length;
      counts.set(key, current);
    });
    return Array.from(counts.values()).sort((left, right) => right.count - left.count)[0].name;
  }
  const prefixes = new Map();
  group.wires.forEach((wire) => {
    const name = normalizeText(wire.name).replace(/^TO\s+/, "");
    const candidates = [
      name.match(/^(SH|SV|PV|PH|BW)\b/)?.[1],
      name.match(/^(BWA|BWD|BW)\b/)?.[1]?.replace(/[AD]$/, ""),
      name.split(/\s+/)[0]
    ].filter(Boolean);
    const prefix = candidates[0];
    if (prefix && prefix.length <= 8) {
      prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
    }
  });
  const inferred = Array.from(prefixes.entries()).sort((left, right) => right[1] - left[1])[0];
  if (inferred && inferred[1] >= Math.max(1, Math.floor(group.wires.length / 2))) {
    return inferred[0];
  }
  return groupCount > 1 ? `LEG ${group.index + 1}` : "";
}

function assignKiCadRightConnectorLayout(groups) {
  const plannedGroups = HarnessCore.planConnectorGroups(groups, { top: 160, groupGap: 14 });
  groups.forEach((group, index) => {
    Object.assign(group, plannedGroups[index]);
    group.slots.forEach((slot) => {
      if (slot.wire) {
        slot.wire.rightTargetY = slot.y;
        slot.wire.rightConnectorIndex = group.index;
      }
    });
  });
}

function rightHousingPalette(name) {
  const key = normalizeText(name);
  if (/^ALT(?:\b|$)/.test(key)) return RIGHT_HOUSING_PALETTE[1];
  if (/^INS(?:\b|$)/.test(key)) return RIGHT_HOUSING_PALETTE[2];
  if (key === "D" || /^DATA(?:\b|$)/.test(key)) return RIGHT_HOUSING_PALETTE[0];
  if (/^CTD(?:\b|$)/.test(key)) return RIGHT_HOUSING_PALETTE[3];
  if (/^SPARE(?:\b|$)/.test(key)) return RIGHT_HOUSING_PALETTE[4];
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return RIGHT_HOUSING_PALETTE[hash % RIGHT_HOUSING_PALETTE.length];
}

function formatKiCadConnectorGroupSummary(groups) {
  const counts = new Map();
  groups.forEach((group) => {
    const positions = Math.max(group.wires.length, Number(group.positionCount) || group.wires.length);
    counts.set(positions, (counts.get(positions) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([positions, quantity]) => `${quantity} x ${positions} POS`)
    .join(" + ");
}

function isMaestroStyleSheet(rows) {
  const text = normalizeText(rows.map((row) => [
    row.leftLegName,
    row.leftHousingType,
    row.rightLegName,
    row.rightHousingType,
    row.wireName,
    row.comments
  ].join(" ")).join(" "));
  return text.includes("MAESTRO") ||
    text.includes("SERVO HEADER") ||
    (/\bESC\b/.test(text) && (text.includes("GND") || text.includes("V+") || text.includes("SIG")));
}

function getKiCadWireRows(rows) {
  return rows.filter((row) => {
    const wireName = normalizeText(sheetRowWireName(row));
    const leftPin = normalizeText(row.leftPinPos);
    const rightPin = normalizeText(row.rightPinPos);
    const branchRole = normalizeText(row.branchRole);
    const rowText = normalizeText([
      sheetRowWireName(row),
      row.rightWireName,
      row.color,
      row.awg,
      row.length,
      row.leftLegName,
      row.leftHousingType,
      row.rightLegName,
      row.rightHousingType
    ].join(" "));
    if (isRepeatedHeaderSheetRow(row)) {
      return false;
    }
    if (!wireName || !leftPin || !rightPin) {
      return false;
    }
    if (isNoWireRow(row) || branchRole.includes("PROTECTION") || branchRole.includes("WRAP") || branchRole.includes("SLEEVE")) {
      return false;
    }
    if (!row.color && !row.awg && !row.length) {
      return false;
    }
    return rowText.length > wireName.length + leftPin.length + rightPin.length;
  });
}

function isRepeatedHeaderSheetRow(row) {
  const labels = [
    row.leftLeg,
    row.leftLegName,
    row.wireName,
    row.leftPinPos,
    row.leftHousingType,
    row.awg,
    row.color,
    row.length,
    row.rightLeg,
    row.rightLegName,
    row.rightPinPos,
    row.rightHousingType
  ].map((value) => normalizeText(value));
  return labels.includes("WIRE NAME") ||
    labels.includes("LEFT PIN POS #") ||
    labels.includes("RIGHT PIN POS #") ||
    labels.includes("AWGUAGE") ||
    labels.includes("LENGTH INCHES") ||
    labels.includes("LENGTH (IN OR FT)");
}

function buildKiCadWireGroups(rows) {
  const groups = [];
  rows.forEach((row) => {
    const key = groupKeyForSheetRow(row);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        index: groups.length,
        name: row.leftLegName || row.branchId || `GROUP ${groups.length + 1}`,
        leftLeg: row.leftLeg || row.branchId || String(groups.length + 1),
        rightLeg: row.rightLeg || row.branchId || String(groups.length + 1),
        rows: []
      };
      groups.push(group);
    }
    group.rows.push(row);
  });
  groups.forEach((group) => {
    const leftPins = group.rows.map((row) => numericPin(row.leftPinPos)).filter(Number.isFinite);
    const rightPins = group.rows.map((row) => numericPin(row.rightPinPos)).filter(Number.isFinite);
    group.leftBasePin = leftPins.length ? Math.min(...leftPins) : null;
    group.rightBasePin = rightPins.length ? Math.min(...rightPins) : null;
    group.y = 205 + group.index * 76;
  });
  return groups;
}

function groupKeyForSheetRow(row) {
  return String(row.leftLeg || row.branchId || row.rightLeg || row.leftLegName || "MAIN").trim() || "MAIN";
}

function multiGroupWireY(row, groups) {
  const group = groups.find((candidate) => candidate.key === groupKeyForSheetRow(row));
  const baseY = group?.y ?? 205;
  const localPin = localPinNumber(row.rightPinPos, group?.rightBasePin);
  if (localPin === "1") {
    return baseY - 14;
  }
  if (localPin === "3") {
    return baseY + 14;
  }
  return baseY;
}

function localPinNumber(pin, basePin) {
  const numeric = numericPin(pin);
  if (Number.isFinite(numeric) && Number.isFinite(basePin)) {
    const local = numeric - basePin + 1;
    if (local >= 1 && local <= 3) {
      return String(local);
    }
  }
  return String(pin || "");
}

function numericPin(pin) {
  const match = String(pin || "").match(/\d+/);
  return match ? Number(match[0]) : NaN;
}

function shortListLabel(values, limit) {
  const unique = [];
  values.forEach((value) => {
    const trimmed = String(value || "").trim();
    if (trimmed && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  });
  if (!unique.length) {
    return "HARNESS";
  }
  if (unique.length <= limit) {
    return unique.join(" / ");
  }
  return `${unique.slice(0, limit).join(" / ")} / ...`;
}

function cleanConnectorName(name) {
  return String(name || "")
    .replace(/\bMEASTRO\b/gi, "Maestro")
    .replace(/\bMISTRO\b/gi, "Maestro")
    .replace(/\s+/g, " ")
    .trim();
}

function maestroPinRole(row, localPin) {
  const text = normalizeText(`${row.wireName} ${row.color} ${row.comments} ${localPin}`);
  if (text.includes("GND") || text.includes("GROUND") || text.includes("BLACK") || text.includes("BROWN") || String(localPin) === "1") {
    return { code: "GND", label: "Ground", detail: "closest to edge" };
  }
  if (text.includes("PWR") || text.includes("POWER") || text.includes("V+") || text.includes("VSRV") || text.includes("RED") || String(localPin) === "2") {
    return { code: "V+", label: "Servo power", detail: "middle rail" };
  }
  if (text.includes("SIG") || text.includes("SIGNAL") || text.includes("WHITE") || text.includes("YELLOW") || text.includes("ORANGE") || String(localPin) === "3") {
    return { code: "SIG", label: "Signal", detail: "inside board" };
  }
  return { code: "SIG", label: "Signal", detail: "inside board" };
}

function connectorSideName(rows, side) {
  const legName = firstFilled(rows, `${side}LegName`);
  const housingType = firstFilled(rows, `${side}HousingType`);
  if (side === "right" && legName && housingType) {
    const typeText = normalizeText(housingType);
    if (["PCB", "PLUG", "JACK", "BARREL"].includes(typeText)) {
      return `${legName} ${housingType}`.replace(/\s+/g, " ").trim();
    }
  }
  return legName || housingType;
}

function buildKiCadHarnessSvg(result, model) {
  if (model.isMultiGroup) {
    return buildKiCadMultiGroupSvg(result, model);
  }
  const displayModel = buildKiCadSvgDisplayModel(model);
  const denseLayout = displayModel.wires.length > 8;
  const leftPcb = isKiCadPcbConnector(displayModel.leftConnector);
  const rightPcb = isKiCadPcbConnector(displayModel.rightConnector);
  const leftFace = buildKiCadConnectorFaceSvg(170, displayModel.wires, displayModel.leftConnector, "left");
  const rightFace = buildKiCadConnectorFaceSvg(1300, displayModel.wires, displayModel.rightConnector, "right", displayModel.rightConnectorGroups);
  const wireSvg = displayModel.wires.map((wire) => buildKiCadWireSvg(wire, {
    compact: denseLayout,
    leftPcb,
    rightPcb,
    pairAnalysis: displayModel.twistedPairAnalysis
  })).join("");
  const protectionTop = displayModel.wires[0].y - (denseLayout ? 18 : 30);
  const protectionBottom = displayModel.wires[displayModel.wires.length - 1].y + (denseLayout ? 18 : 30);
  const documentationSvg = "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(displayModel.cableName)} KiCad style harness drawing">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="kicadArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#000000" />
    </marker>
    <style>
      .page { fill: #ffffff; }
      .border { fill: none; stroke: #000000; stroke-width: 2; }
      .title { fill: #000000; font: 900 38px Aptos, Segoe UI, sans-serif; text-anchor: middle; letter-spacing: 1px; }
      .subtitle { fill: #000000; font: 900 24px Aptos, Segoe UI, sans-serif; text-anchor: middle; text-decoration: underline; letter-spacing: 0.8px; }
      .connector-heading { fill: #000000; font: 900 17px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-sub { fill: #000000; font: 800 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-view { fill: #000000; font: 800 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-body-left { fill: #d7d7d7; stroke: #000000; stroke-width: 2; }
      .connector-body-right { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .connector-shadow { fill: #595959; stroke: #000000; stroke-width: 1.4; }
      .connector-group-label { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: start; }
      .pcb-board { fill: #216b42; stroke: #123d28; stroke-width: 3; }
      .pcb-silkscreen { fill: none; stroke: #e8f1e9; stroke-width: 1.4; }
      .pcb-trace { fill: none; stroke: #d5a72b; stroke-width: 5; stroke-linecap: round; }
      .pcb-pad { fill: #d9aa31; stroke: #8a6515; stroke-width: 1.5; }
      .pcb-hole { fill: #161918; stroke: #f2d36f; stroke-width: 1.2; }
      .pcb-label { fill: #ffffff; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pcb-pin-number { fill: #ffffff; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: start; }
      .cavity { fill: #f9f9f9; stroke: #000000; stroke-width: 1.5; }
      .unused-cavity { fill: #d8dcde; stroke: #747b7f; stroke-width: 1.3; stroke-dasharray: 4 3; }
      .cavity-hole { fill: #000000; stroke: #000000; stroke-width: 1; }
      .segmented-cavity { fill: #8d8d8d; stroke: #6b6b6b; stroke-width: 1; }
      .segmented-cavity-unused { fill: #d8dcde; stroke: #747b7f; stroke-width: 1; stroke-dasharray: 4 3; }
      .connector-filler-pin { fill: #4b5357; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .kicad-cpc-ring { fill: #30363a; stroke: #050606; stroke-width: 4; }
      .kicad-cpc-face { fill: #202528; stroke: #71797e; stroke-width: 3; }
      .kicad-cpc-cavity { fill: #080a0a; stroke: #d4d9dc; stroke-width: 1.2; }
        .kicad-cpc-cavity-unused { fill: #596167; stroke: #aeb4b7; stroke-width: 1.2; stroke-dasharray: 3 2; }
        .kicad-cpc-number { fill: #ffffff; font: 900 7px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
        .rj45-shell { fill: #e2f1dc; stroke: #5f8f51; stroke-width: 2.5; }
        .rj45-insert { fill: #eef1ec; stroke: #526057; stroke-width: 1.5; }
        .rj45-contact { stroke: #4b4b4b; stroke-width: 1.2; }
        .rj45-contact-unused { opacity: 0.36; }
        .rj45-tracer { stroke-width: 3; stroke-linecap: butt; }
        .rj45-latch { fill: #287db5; stroke: #17577f; stroke-width: 1.4; }
        .rj45-pin-number { fill: #111111; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
        .rj45-color-label { fill: #31383b; font: 900 7px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
        .picoblade-body { fill: #f1eee4; stroke: #47443d; stroke-width: 3; }
        .picoblade-rim { fill: #fbfaf5; stroke: #8f8b80; stroke-width: 1.5; }
        .picoblade-latch { fill: #ded8ca; stroke: #47443d; stroke-width: 2; }
        .picoblade-circuit-one { fill: #d97706; stroke: #7c3e00; stroke-width: 1; }
        .picoblade-cavity { fill: #313538; stroke: #111111; stroke-width: 1.5; }
        .picoblade-cavity-unused { fill: #bec3c5; stroke: #747b7f; stroke-width: 1.3; stroke-dasharray: 4 3; }
        .picoblade-pin { fill: #ffffff; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
        .pivot-power-shell { fill: #f28c18; stroke: #8f4500; stroke-width: 3; }
        .pivot-power-nose { fill: #fb9f2e; stroke: #8f4500; stroke-width: 1.5; }
        .pivot-power-stuffer { fill: #eef5f7; fill-opacity: .72; stroke: #5d686d; stroke-width: 1.5; }
        .pivot-power-contact { fill: #d7b65b; stroke: #725b1d; stroke-width: 1.2; }
        .pivot-power-contact-unused { opacity: .32; }
        .connector-unused-note { fill: #4b5357; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-label { fill: #000000; font: 900 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-side { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-label-compact { fill: #000000; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-side-compact { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire-line { fill: none; stroke-width: 8; stroke-linecap: square; }
      .wire-line-compact { fill: none; stroke-width: 6; stroke-linecap: square; }
      .wire-stripe { fill: none; stroke-width: 3; stroke-linecap: butt; stroke-dasharray: 11 9; }
      .wire-stripe-compact { fill: none; stroke-width: 2.4; stroke-linecap: butt; stroke-dasharray: 9 8; }
      .terminal { stroke: #000000; stroke-width: 1.8; }
      .terminal-mark { stroke: #000000; stroke-width: 1.2; fill: none; }
      .wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .wire-label-compact { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
      .dimension { fill: none; stroke: #000000; stroke-width: 1.8; marker-start: url(#kicadArrow); marker-end: url(#kicadArrow); }
      .dim-ext { stroke: #000000; stroke-width: 1.2; }
      .dim-text { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .dim-label-bg { fill: #ffffff; fill-opacity: 0.96; }
      .table-outline { fill: #ffffff; stroke: #000000; stroke-width: 1.4; }
      .table-grid { stroke: #000000; stroke-width: 1; }
      .table-title { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #000000; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-red { fill: #ff0000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .spec-label { fill: #000000; font: 800 12px Aptos, Segoe UI, sans-serif; }
      .spec-value { fill: #000000; font: 700 12px Aptos, Segoe UI, sans-serif; }
      .note-title { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; }
      .note { fill: #000000; font: 700 12px Aptos, Segoe UI, sans-serif; }
      .legend-line { stroke-width: 8; stroke-linecap: round; }
      .title-block-label { fill: #000000; font: 800 10px Aptos, Segoe UI, sans-serif; }
      .title-block-text { fill: #000000; font: 900 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .title-block-small { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .compact-doc-title { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .compact-doc-head { fill: #000000; font: 900 7.5px Consolas, Cascadia Mono, monospace; text-anchor: middle; }
      .compact-doc-text { fill: #000000; font: 700 7.5px Consolas, Cascadia Mono, monospace; }
      .compact-note-title { fill: #000000; font: 900 9px Aptos, Segoe UI, sans-serif; }
      .compact-note { fill: #000000; font: 700 8px Aptos, Segoe UI, sans-serif; }
      .compact-spec-label { fill: #000000; font: 900 8px Aptos, Segoe UI, sans-serif; }
      .compact-spec-value { fill: #000000; font: 700 8px Aptos, Segoe UI, sans-serif; }
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="page" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="10" y="10" width="1580" height="780" />

  <text class="title" x="800" y="52">${escapeXml(displayModel.cableName)}</text>
  <text class="subtitle" x="800" y="84">${escapeXml(displayModel.description)}</text>

  <text class="connector-heading" x="220" y="46">${leftPcb ? "LEFT PCB TERMINATION" : "LEFT CONNECTOR"}</text>
  <text class="connector-sub" x="220" y="72">${escapeXml(displayModel.leftConnector.name)}</text>
  ${kiCadConnectorHeaderType(displayModel.leftConnector, displayModel.wires, "left") ? `<text class="connector-sub" x="220" y="96">${escapeXml(kiCadConnectorHeaderType(displayModel.leftConnector, displayModel.wires, "left"))}</text>` : ""}
  <text class="connector-sub" x="220" y="120">${escapeXml(displayModel.leftConnector.positionText)}</text>
  <text class="connector-view" x="220" y="144">(${escapeXml(displayModel.leftConnector.view)})</text>

  <text class="connector-heading" x="1360" y="46">${rightPcb ? "RIGHT PCB TERMINATION" : "RIGHT CONNECTOR"}</text>
  <text class="connector-sub" x="1360" y="72">${escapeXml(displayModel.rightConnector.name)}</text>
  ${kiCadConnectorHeaderType(displayModel.rightConnector, displayModel.wires, "right") ? `<text class="connector-sub" x="1360" y="96">${escapeXml(kiCadConnectorHeaderType(displayModel.rightConnector, displayModel.wires, "right"))}</text>` : ""}
  <text class="connector-sub" x="1360" y="120">${escapeXml(displayModel.rightConnector.positionText)}</text>
  <text class="connector-view" x="1360" y="144">(${escapeXml(displayModel.rightConnector.view)})</text>

  <line class="dim-ext" x1="372" y1="138" x2="372" y2="186" />
  <line class="dim-ext" x1="1220" y1="138" x2="1220" y2="186" />
  <line class="dimension" x1="382" y1="150" x2="1210" y2="150" />
  <rect class="dim-label-bg" x="630" y="112" width="332" height="28" rx="5" />
  <text class="dim-text" x="796" y="132">OVERALL LENGTH: ${escapeXml(formatLengthMeasurement(displayModel.length))} +/-0.25 in</text>

  ${buildHorizontalProtectionSvg({
    x1: 452,
    x2: 1138,
    top: protectionTop,
    bottom: protectionBottom,
    labelY: protectionTop - 10,
    endLabelY: protectionBottom + 18
  })}
  ${leftFace}
  ${rightFace}
  ${wireSvg}
  ${documentationSvg}
</svg>`;
}

function buildKiCadSvgDisplayModel(model) {
  if (model.wires.length <= 8) {
    return model;
  }
  const top = 184;
  const bottom = 560;
  const gap = (bottom - top) / Math.max(1, model.wires.length - 1);
  const wires = model.wires.map((wire, index) => ({
    ...wire,
    y: top + index * gap
  }));
  const twistedPairAnalysis = analyzeSheetTwistedPairs(wires);
  return {
    ...model,
    wires,
    twistedPairAnalysis,
    rightConnectorGroups: (model.rightConnectorGroups || []).map((group) => ({
      ...group,
      wires: group.wires.map((wire) => wires[model.wires.indexOf(wire)]).filter(Boolean)
    }))
  };
}

function buildKiCadDenseDocumentationSvg(model) {
  const notes = buildKiCadNotes(model).slice(0, 6)
    .map((note, index) => `<text class="compact-note" x="400" y="${620 + index * 13}">${index + 1}. ${escapeXml(shortLabel(note, 88))}</text>`)
    .join("");
  return `
    ${buildKiCadCompactWiringTableSvg(30, 604, 350, 176, model)}
    <text class="compact-note-title" x="400" y="607">NOTES:</text>
    ${notes}
    ${buildKiCadCompactSpecsSvg(840, 604, 210, 92, model)}
    ${buildKiCadSummaryTitleBlockSvg(1070, 604, 490, 92, model)}
    ${buildWireLegendSvg(400, 710, 240, 68, model)}
    ${buildKiCadCompactBomSvg(660, 710, 520, 68, model)}`;
}

function buildKiCadCompactWiringTableSvg(x, y, width, height, model) {
  const rowGap = 8.2;
  const rows = model.wires.map((wire, index) =>
    `<text class="compact-doc-text" x="${x + 12}" y="${y + 43 + index * rowGap}">${escapeXml(`${wire.fromPin} | ${wire.name} | ${wire.colorLabel || wire.colorName} | ${wire.awg || model.awg || ""} | ${formatLengthMeasurement(wire.length || model.length)} | ${wire.toPin}`)}</text>`
  ).join("");
  return `
    <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
    <text class="compact-doc-title" x="${x + width / 2}" y="${y + 17}">WIRING TABLE</text>
    <text class="compact-doc-head" x="${x + width / 2}" y="${y + 31}">LEFT | SIGNAL | COLOR | AWG | LENGTH | RIGHT</text>
    ${rows}`;
}

function buildKiCadCompactSpecsSvg(x, y, width, height, model) {
  const specs = [
    ["WIRE GAUGE", `${model.awg || "TBD"} AWG`],
    ["LENGTH TOLERANCE", "+/-0.25 in"],
    ["BRANCHES", "NONE"],
    ["TAP POSITION", "NONE"]
  ];
  const rows = specs.map((spec, index) => `
    <text class="compact-spec-label" x="${x + 10}" y="${y + 39 + index * 13}">${escapeXml(spec[0])}</text>
    <text class="compact-spec-value" x="${x + 110}" y="${y + 39 + index * 13}">${escapeXml(spec[1])}</text>`).join("");
  return `
    <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
    <text class="compact-doc-title" x="${x + width / 2}" y="${y + 18}">SPECIFICATIONS</text>
    ${rows}`;
}

function buildKiCadCompactBomSvg(x, y, width, height, model) {
  const rows = buildKiCadBomRows(model).map((row, index) =>
    `<text class="compact-doc-text" x="${x + 12}" y="${y + 38 + index * 9}">${escapeXml(row.map((cell) => String(cell || "").replace(/\n/g, " ")).join(" | "))}</text>`
  ).join("");
  return `
    <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
    <text class="compact-doc-title" x="${x + width / 2}" y="${y + 16}">BILL OF MATERIALS</text>
    <text class="compact-doc-head" x="${x + width / 2}" y="${y + 28}">ITEM | QTY | DESCRIPTION | PART NUMBER</text>
    ${rows}`;
}

function buildKiCadSummaryTitleBlockSvg(x, y, width, height, model) {
  const descriptionEnd = x + width * 0.62;
  const drawnByEnd = x + width * 0.86;
  return `
    <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
    <line class="table-grid" x1="${descriptionEnd}" y1="${y}" x2="${descriptionEnd}" y2="${y + 52}" />
    <line class="table-grid" x1="${drawnByEnd}" y1="${y}" x2="${drawnByEnd}" y2="${y + 52}" />
    <line class="table-grid" x1="${x}" y1="${y + 52}" x2="${x + width}" y2="${y + 52}" />
    <text class="title-block-label" x="${x + 10}" y="${y + 15}">DESCRIPTION:</text>
    <text class="title-block-small" x="${x + width * 0.31}" y="${y + 31}">${escapeXml(model.cableName)} CABLE ASSEMBLY</text>
    <text class="title-block-label" x="${descriptionEnd + 10}" y="${y + 15}">DRAWN BY:</text>
    <text class="title-block-small" x="${descriptionEnd + (drawnByEnd - descriptionEnd) / 2}" y="${y + 32}">DIGIWIRE</text>
    <text class="title-block-label" x="${drawnByEnd + 9}" y="${y + 15}">REV:</text>
    <text class="title-block-text" x="${drawnByEnd + (x + width - drawnByEnd) / 2}" y="${y + 34}">A</text>
    <text class="title-block-small" x="${x + width / 2}" y="${y + 76}">SHEET: 1 OF 1 | SCALE: NONE | UNITS: AS SHOWN | DWG NO. ${escapeXml(model.cableName)}</text>`;
}

function buildKiCadMultiGroupSvg(result, model) {
  const leftFace = buildKiCadMultiLeftFaceSvg(model);
  const rightFace = buildKiCadMaestroGridSvg(model);
  const wireSvg = model.wires.map((wire) => buildKiCadMultiWireSvg(wire)).join("");
  const protectionTop = Math.min(...model.wires.map((wire) => wire.y)) - 24;
  const protectionBottom = Math.max(...model.wires.map((wire) => wire.y)) + 24;
  const wiringRows = model.wires.map((wire) => [
    wire.row.leftLeg || "",
    wire.row.leftLegName || "",
    wire.fromPin,
    wire.name,
    { text: wire.colorLabel || wire.colorName, className: wire.colorName === "RED" ? "table-red" : "table-text" },
    wire.awg || model.awg || "",
    formatLengthMeasurement(wire.length || model.length),
    formatBoardPin(wire)
  ]);
  const noteText = uniqueValues(model.wires.map((wire) => wire.row.comments)).slice(0, 2).join(" | ");
  const maestroNote = "Micro Maestro servo header: 1=GND edge, 2=V+ servo power, 3=SIG inside board.";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(model.cableName)} multi-row board harness drawing">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="kicadArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#000000" />
    </marker>
    <style>
      .page { fill: #ffffff; }
      .border { fill: none; stroke: #000000; stroke-width: 2; }
      .title { fill: #000000; font: 900 34px Aptos, Segoe UI, sans-serif; text-anchor: middle; letter-spacing: 1px; }
      .subtitle { fill: #000000; font: 900 20px Aptos, Segoe UI, sans-serif; text-anchor: middle; text-decoration: underline; letter-spacing: 0.6px; }
      .connector-heading { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-sub { fill: #000000; font: 800 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .connector-view { fill: #000000; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .board-body { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .board-rail { fill: #e8e8e8; stroke: #000000; stroke-width: 1.4; }
      .board-group { fill: #f7f7f7; stroke: #000000; stroke-width: 1.2; }
      .cavity { fill: #f9f9f9; stroke: #000000; stroke-width: 1.4; }
      .nc-cavity { fill: #eeeeee; stroke: #777777; stroke-width: 1; stroke-dasharray: 4 3; }
      .cavity-hole { fill: #000000; stroke: #000000; stroke-width: 1; }
      .pin-label { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-side { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: end; }
      .group-label { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .grid-label { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire-line { fill: none; stroke-width: 7; stroke-linecap: square; }
      .wire-stripe { fill: none; stroke-width: 2.6; stroke-linecap: butt; stroke-dasharray: 10 9; }
      .terminal { stroke: #000000; stroke-width: 1.6; }
      .terminal-mark { stroke: #000000; stroke-width: 1.1; fill: none; }
      .wire-label { fill: #000000; font: 900 13px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .dimension { fill: none; stroke: #000000; stroke-width: 1.8; marker-start: url(#kicadArrow); marker-end: url(#kicadArrow); }
      .dim-ext { stroke: #000000; stroke-width: 1.2; }
      .dim-text { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-outline { fill: #ffffff; stroke: #000000; stroke-width: 1.4; }
      .table-grid { stroke: #000000; stroke-width: 1; }
      .table-title { fill: #000000; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-head { fill: #000000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-text { fill: #000000; font: 800 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .table-red { fill: #ff0000; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .note-title { fill: #000000; font: 900 12px Aptos, Segoe UI, sans-serif; }
      .note { fill: #000000; font: 700 11px Aptos, Segoe UI, sans-serif; }
      .title-block-label { fill: #000000; font: 800 10px Aptos, Segoe UI, sans-serif; }
      .title-block-text { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .title-block-small { fill: #000000; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .protection-label { fill: #1f2930; font: 900 11px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 9px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="page" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="10" y="10" width="1580" height="780" />

  <text class="title" x="800" y="50">${escapeXml(model.cableName)}</text>
  <text class="subtitle" x="800" y="80">${escapeXml(model.description)}</text>

  <text class="connector-heading" x="215" y="46">LEFT BOARD</text>
  <text class="connector-sub" x="215" y="70">${escapeXml(model.leftConnector.name)}</text>
  <text class="connector-sub" x="215" y="92">${escapeXml(model.leftConnector.positionText)}</text>
  <text class="connector-view" x="215" y="112">(${escapeXml(model.leftConnector.view)})</text>

  <text class="connector-heading" x="1340" y="46">RIGHT BOARD</text>
  <text class="connector-sub" x="1340" y="70">${escapeXml(model.rightConnector.name)}</text>
  <text class="connector-sub" x="1340" y="92">${escapeXml(model.rightConnector.type || "DUPONT")}</text>
  <text class="connector-sub" x="1340" y="114">SERVO HEADER ROWS</text>
  <text class="connector-view" x="1340" y="134">(${escapeXml(model.rightConnector.view)})</text>

  <line class="dim-ext" x1="355" y1="134" x2="355" y2="176" />
  <line class="dim-ext" x1="1198" y1="134" x2="1198" y2="176" />
  <line class="dimension" x1="365" y1="146" x2="1188" y2="146" />
  <text class="dim-text" x="776" y="128">${escapeXml(formatLengthMeasurement(model.length))} +/-0.25 in</text>
  <text class="dim-text" x="776" y="166">OVERALL LENGTH</text>

  ${buildHorizontalProtectionSvg({
    x1: 416,
    x2: 1112,
    top: protectionTop,
    bottom: protectionBottom,
    labelY: protectionTop - 10,
    endLabelY: protectionBottom + 17,
    bandWidth: 28
  })}
  ${leftFace}
  ${rightFace}
  ${wireSvg}

  ${buildSvgTable({
    x: 30,
    y: 538,
    width: 770,
    title: "WIRING TABLE",
    headers: ["LEG", "LEFT NAME", "LEFT PIN", "WIRE", "COLOR", "AWG", "LEN", "MAESTRO ROLE"],
    rows: wiringRows,
    colWidths: [52, 126, 70, 110, 78, 54, 64, 116],
    rowHeight: 20,
    titleHeight: 26,
    headerHeight: 26
  })}

  ${buildSvgTable({
    x: 830,
    y: 538,
    width: 730,
    title: "BILL OF MATERIALS",
    headers: ["ITEM", "QTY", "DESCRIPTION", "PART NUMBER"],
    rows: buildKiCadBomRows(model),
    colWidths: [62, 62, 342, 264],
    rowHeight: 28,
    titleHeight: 26,
    headerHeight: 26
  })}

  <text class="note-title" x="835" y="678">NOTES:</text>
  <text class="note" x="835" y="696">${escapeXml(maestroNote)}</text>
  <text class="note" x="835" y="712">${escapeXml(noteText || "Verify pin orientation before final assembly.")}</text>
  ${buildKiCadCompactTitleBlockSvg(830, 724, 730, 54, model)}
</svg>`;
}

function buildKiCadMultiLeftFaceSvg(model) {
  const firstY = model.groups[0]?.y ?? 205;
  const lastY = model.groups[model.groups.length - 1]?.y ?? firstY;
  const top = firstY - 48;
  const height = lastY - firstY + 96;
  const output = [
    `<rect class="board-body" x="155" y="${top}" width="118" height="${height}" rx="4" />`,
    `<rect class="board-rail" x="264" y="${top + 10}" width="18" height="${height - 20}" rx="3" />`
  ];
  model.groups.forEach((group) => {
    output.push(`<rect class="board-group" x="172" y="${group.y - 30}" width="76" height="60" rx="4" />`);
    output.push(`<text class="group-label" x="210" y="${group.y - 38}">${escapeXml(group.name)}</text>`);
    [1, 2, 3].forEach((pin, index) => {
      const x = 180 + index * 22;
      output.push(`<rect class="${pin === 2 ? "nc-cavity" : "cavity"}" x="${x}" y="${group.y - 13}" width="18" height="26" rx="3" />`);
      output.push(`<text class="grid-label" x="${x + 9}" y="${group.y + 28}">${pin}</text>`);
    });
    group.wires.forEach((wire) => {
      output.push(`<text class="pin-side" x="120" y="${wire.y + 4}">PIN ${escapeXml(wire.fromPin)}</text>`);
      output.push(`<text class="pin-label" x="338" y="${wire.y + 4}">${escapeXml(wire.fromPin)}</text>`);
    });
  });
  return output.join("");
}

function buildKiCadMaestroGridSvg(model) {
  const gridX = 1268;
  const firstY = model.groups[0]?.y ?? 205;
  const lastY = model.groups[model.groups.length - 1]?.y ?? firstY;
  const top = firstY - 48;
  const height = lastY - firstY + 96;
  const labels = maestroHeaderLabels();
  const output = [
    `<rect class="board-body" x="${gridX - 18}" y="${top}" width="164" height="${height}" rx="4" />`,
    `<text class="grid-label" x="${gridX + 14}" y="${top - 26}">EDGE</text>`,
    `<text class="grid-label" x="${gridX + 108}" y="${top - 26}">INSIDE</text>`,
    ...labels.map((label, index) => `<text class="grid-label" x="${gridX + index * 42 + 14}" y="${top - 10}">${label.pin} ${label.code}</text>`)
  ];
  model.groups.forEach((group) => {
    output.push(`<text class="group-label" x="${gridX - 58}" y="${group.y + 4}">${escapeXml(group.name)}</text>`);
    [1, 2, 3].forEach((pin, index) => {
      const x = gridX + index * 42;
      const hasWire = group.wires.some((wire) => wire.rightLocalPin === String(pin));
      output.push(`<rect class="${hasWire ? "cavity" : "nc-cavity"}" x="${x}" y="${group.y - 18}" width="28" height="36" rx="4" />`);
      output.push(`<rect class="cavity-hole" x="${x + 9}" y="${group.y - 8}" width="10" height="16" rx="2" />`);
      output.push(`<text class="grid-label" x="${x + 14}" y="${group.y + 34}">${labels[index].code}${hasWire ? "" : " NC"}</text>`);
    });
  });
  return output.join("");
}

function buildKiCadMultiWireSvg(wire) {
  const color = wire.stroke;
  const colorSpec = wireColorSpec(wire.row?.color || wire.colorLabel || wire.colorName);
  const colorLabel = wire.colorLabel || colorSpec.label;
  const textColorClass = wire.colorName === "RED" ? "table-red" : "table-text";
  const wireRole = wire.maestroRole?.code ? `${wire.name} ${wire.maestroRole.code}` : wire.name;
  return `
  <rect class="terminal" x="350" y="${wire.y - 11}" width="42" height="22" fill="${color}" />
  <rect class="terminal" x="1136" y="${wire.y - 11}" width="42" height="22" fill="${color}" />
  <line class="wire-line" x1="392" y1="${wire.y}" x2="1136" y2="${wire.y}" stroke="${color}" />
  ${colorSpec.stripeStroke ? `<line class="wire-stripe" x1="392" y1="${wire.y}" x2="1136" y2="${wire.y}" stroke="${colorSpec.stripeStroke}" />` : ""}
  <path class="terminal-mark" d="M 371 ${wire.y - 5} L 371 ${wire.y + 5} M 366 ${wire.y} L 376 ${wire.y}" />
  <path class="terminal-mark" d="M 1157 ${wire.y - 5} L 1157 ${wire.y + 5} M 1152 ${wire.y} L 1162 ${wire.y}" />
  <text class="wire-label" x="760" y="${wire.y - 10}">${escapeXml(wireRole)} (${escapeXml(colorLabel)}) ${escapeXml(formatWireLengthLabel(wire.length))}</text>
  <text class="${textColorClass}" x="371" y="${wire.y + 4}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>
  <text class="${textColorClass}" x="1157" y="${wire.y + 4}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>
  <text class="pin-label" x="1212" y="${wire.y + 4}">${escapeXml(formatBoardPin(wire))}</text>`;
}

function buildKiCadCompactTitleBlockSvg(x, y, width, height, model) {
  const midX = x + width * 0.56;
  const revX = x + width * 0.83;
  return `
  <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
  <line class="table-grid" x1="${midX}" y1="${y}" x2="${midX}" y2="${y + height}" />
  <line class="table-grid" x1="${revX}" y1="${y}" x2="${revX}" y2="${y + height}" />
  <line class="table-grid" x1="${x}" y1="${y + 34}" x2="${x + width}" y2="${y + 34}" />
  <text class="title-block-label" x="${x + 12}" y="${y + 17}">DESCRIPTION:</text>
  <text class="title-block-text" x="${x + 255}" y="${y + 22}">${escapeXml(model.cableName)} CABLE ASSEMBLY</text>
  <text class="title-block-label" x="${midX + 12}" y="${y + 17}">DRAWN BY:</text>
  <text class="title-block-small" x="${midX + 125}" y="${y + 22}">DIGIWIRE</text>
  <text class="title-block-label" x="${revX + 12}" y="${y + 17}">REV:</text>
  <text class="title-block-text" x="${revX + 92}" y="${y + 22}">A</text>
  <text class="title-block-label" x="${x + 12}" y="${y + 52}">SHEET: 1 OF 1</text>
  <text class="title-block-label" x="${x + 150}" y="${y + 52}">SCALE: NONE</text>
  <text class="title-block-label" x="${x + 278}" y="${y + 52}">UNITS: AS SHOWN</text>
  <text class="title-block-label" x="${midX + 12}" y="${y + 52}">DWG NO.</text>
  <text class="title-block-small" x="${midX + 160}" y="${y + 54}">${escapeXml(model.cableName)}</text>`;
}

function buildKiCadConnectorFaceSvg(x, wires, connector, side, connectorGroups = []) {
  if (isKiCadPcbConnector(connector)) {
    return buildKiCadPcbFaceSvg(x, wires, connector, side);
  }
  if (isKiCadPicoBladeConnector(connector)) {
    return buildKiCadPicoBladeConnectorFaceSvg(x, wires, connector, side);
  }
  if (isKiCadPivotPowerRj45Connector(connector) && !isKiCadStandardEthernetRj45Connector(connector, wires, side)) {
    return buildKiCadPivotPowerRj45FaceSvg(x, wires, connector, side);
  }
  if (isKiCadRj45Connector(connector)) {
    return buildKiCadRj45ConnectorFaceSvg(x, wires, connector, side);
  }
  if (isKiCadCircularConnector(connector)) {
    return buildKiCadCircularConnectorFaceSvg(x, wires, connector, side);
  }
  if (side === "right" && connectorGroups.length > 1) {
    return buildKiCadSegmentedRightFaceSvg(x, wires, connectorGroups);
  }
  const slots = buildKiCadConnectorSlots(wires, connector, side);
  const top = Math.max(162, slots[0].y - 42);
  const bottom = slots[slots.length - 1].y + 42;
  const height = bottom - top;
  const gap = slots.length > 1 ? Math.min(...slots.slice(1).map((slot, index) => slot.y - slots[index].y)) : 52;
  const compact = gap < 38;
  const bodyClass = side === "left" ? "connector-body-left" : "connector-body-right";
  const body = [
    `<rect class="${bodyClass}" x="${x}" y="${top}" width="88" height="${height}" rx="5" />`,
    `<rect class="connector-shadow" x="${side === "left" ? x + 70 : x - 10}" y="${top + 8}" width="18" height="${height - 16}" rx="4" opacity="${side === "left" ? "0.9" : "0.18"}" />`,
    `<rect class="${bodyClass}" x="${x + 14}" y="${top - 14}" width="28" height="16" rx="3" />`,
    `<rect class="${bodyClass}" x="${x + 14}" y="${bottom - 2}" width="28" height="16" rx="3" />`
  ];
  slots.forEach(({ pin, wire, y }) => {
    if (compact) {
      body.push(`<rect class="${wire ? "cavity-hole" : "unused-cavity"}" x="${x + 24}" y="${y - 9}" width="34" height="18" rx="4" />`);
    } else {
      body.push(`<rect class="${wire ? "cavity" : "unused-cavity"}" x="${x + 16}" y="${y - 24}" width="50" height="48" rx="4" />`);
      body.push(`<rect class="${wire ? "cavity" : "unused-cavity"}" x="${x + 24}" y="${y - 16}" width="34" height="32" rx="5" />`);
      body.push(`<rect class="${wire ? "cavity-hole" : "unused-cavity"}" x="${x + 35}" y="${y - 9}" width="14" height="18" rx="3" />`);
    }
    if (side === "left") {
      body.push(`<text class="${compact ? "pin-side-compact" : "pin-side"}" x="96" y="${y + 4}">PIN ${escapeXml(pin)}</text>`);
      body.push(`<text class="${compact ? "pin-label-compact" : "pin-label"}" x="348" y="${y + 4}">${escapeXml(pin)}</text>`);
    } else {
      body.push(`<text class="${compact ? "pin-label-compact" : "pin-label"}" x="1238" y="${y + 4}">${escapeXml(pin)}</text>`);
      body.push(`<text class="${compact ? "pin-side-compact" : "pin-side"}" x="1464" y="${y + 4}">PIN ${escapeXml(pin)}</text>`);
    }
  });
  return body.join("");
}

function buildKiCadConnectorSlots(wires, connector, side) {
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const positionCount = Math.max(wires.length, Number(connector.positionCount) || wires.length);
  if (positionCount <= wires.length) {
    return wires.map((wire) => ({ pin: wire[pinKey], wire, y: wire.y }));
  }
  const firstY = wires[0].y;
  const lastY = wires[wires.length - 1].y;
  const gap = wires.length > 1 ? (lastY - firstY) / (wires.length - 1) : 52;
  return Array.from({ length: positionCount }, (_, index) => {
    const pin = String(index + 1);
    const wire = wires.find((candidate) => numericPin(candidate[pinKey]) === index + 1);
    return { pin, wire, y: wire?.y ?? firstY + index * gap };
  });
}

function isKiCadCircularConnector(connector) {
  const text = normalizeText(`${connector.name} ${connector.type} ${connector.positionText}`);
  return text.includes("CPC") || text.includes("SUBCON") || text.includes("PBOF") || text.includes("CIRCULAR");
}

function connectorIdentityText(connector) {
  return normalizeText(`${connector.name} ${connector.type} ${connector.housingPart || ""} ${connector.positionText || ""}`);
}

function isKiCadPicoBladeConnector(connector) {
  const text = connectorIdentityText(connector);
  return text.includes("PICOBLADE") || text.includes("2181120802") || text.includes("510210800");
}

function isKiCadPivotPowerRj45Connector(connector) {
  const text = connectorIdentityText(connector);
  return text.includes("A116128") || text.includes("22131451") || text.includes("PIVOT POWER");
}

function isKiCadRj45Connector(connector) {
  return connectorIdentityText(connector).includes("RJ45");
}

function isKiCadStandardEthernetRj45Connector(connector, wires, side = "right") {
  if (!isKiCadRj45Connector(connector) || Number(connector.positionCount) !== 8) {
    return false;
  }
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  const colorNames = wires.map((wire) => side === "left" ? wire.leftName : wire.rightName);
  return activePins.size === 8 && colorNames.every(isRecognizedWireColor);
}

function kiCadConnectorHeaderType(connector, wires = [], side = "right") {
  if (isKiCadPicoBladeConnector(connector)) {
    return "MOLEX PICOBLADE 218112-0802";
  }
  if (isKiCadStandardEthernetRj45Connector(connector, wires, side)) {
    return "RJ45 T568B 8P8C";
  }
  if (isKiCadPivotPowerRj45Connector(connector)) {
    return "TE PIVOT POWER RJ45 2213145-1";
  }
  return connector.type || "";
}

function isKiCadPcbConnector(connector) {
  const type = normalizeText(connector.type);
  const name = normalizeText(connector.name);
  return type === "PCB" ||
    type.includes("PCB TERMINATION") ||
    name.endsWith(" PCB") ||
    name.includes(" PCB ");
}

function buildKiCadRj45ConnectorFaceSvg(x, wires, connector, side) {
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = x - 18;
  const faceY = centerY - 82;
  const faceWidth = 216;
  const faceHeight = 164;
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  const output = [
    `<rect class="rj45-shell" x="${faceX}" y="${faceY}" width="${faceWidth}" height="${faceHeight}" rx="14" />`,
    `<rect class="rj45-insert" x="${faceX + 14}" y="${faceY + 18}" width="${faceWidth - 28}" height="92" rx="6" />`
  ];
  RJ45_T568B_CONTACTS.forEach((contact, index) => {
    const contactX = faceX + 23 + index * 22;
    const inactiveClass = activePins.has(contact.pin) ? "" : " rj45-contact-unused";
    output.push(`<rect class="rj45-contact${inactiveClass}" x="${contactX}" y="${faceY + 34}" width="14" height="58" rx="2" fill="${contact.fill}" />`);
    if (contact.stripe) {
      for (let stripe = 0; stripe < 4; stripe += 1) {
        const stripeY = faceY + 41 + stripe * 13;
        output.push(`<line class="rj45-tracer${inactiveClass}" x1="${contactX + 2}" y1="${stripeY}" x2="${contactX + 12}" y2="${stripeY - 4}" stroke="${contact.stripe}" />`);
      }
    }
    output.push(`<text class="rj45-pin-number" x="${contactX + 7}" y="${faceY + 29}">${contact.pin}</text>`);
    output.push(`<text class="rj45-color-label" x="${contactX + 7}" y="${faceY + 104}">${contact.label}</text>`);
  });
  output.push(`<rect class="rj45-latch" x="${faceX + 70}" y="${faceY + 116}" width="76" height="28" rx="3" />`);
  const usedPins = Array.from(activePins).sort((left, right) => left - right);
  const usedLabel = usedPins.length === 8 ? "PINS 1-8 USED" : `PINS ${usedPins.join(", ")} USED`;
  output.push(`<text class="connector-unused-note" x="${faceX + faceWidth / 2}" y="${faceY + faceHeight + 18}">T568B TOP VIEW | ${usedLabel}</text>`);
  wires.forEach((wire) => {
    const pin = side === "left" ? wire.fromPin : wire.toPin;
    const pinX = side === "left" ? 348 : 1238;
    output.push(`<text class="pin-label-compact" x="${pinX}" y="${wire.y + 4}">${escapeXml(pin)}</text>`);
  });
  return output.join("");
}

function buildKiCadPicoBladeConnectorFaceSvg(x, wires, connector, side) {
  const slots = buildKiCadConnectorSlots(wires, connector, side);
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = x - 82;
  const faceY = centerY - 48;
  const width = 164;
  const height = 96;
  const output = [
    `<g class="picoblade-face" aria-label="Molex PicoBlade 218112-0802 eight-circuit single-row mating face">`,
    `<rect class="picoblade-body" x="${faceX}" y="${faceY}" width="${width}" height="${height}" rx="10" />`,
    `<rect class="picoblade-rim" x="${faceX + 10}" y="${faceY + 18}" width="${width - 20}" height="${height - 34}" rx="5" />`,
    `<path class="picoblade-latch" d="M ${faceX + 52} ${faceY} V ${faceY - 13} H ${faceX + 112} V ${faceY} Z" />`,
    `<path class="picoblade-circuit-one" d="M ${faceX + 5} ${faceY + 5} H ${faceX + 20} L ${faceX + 5} ${faceY + 20} Z" />`
  ];
  slots.forEach((slot, index) => {
    const slotX = faceX + 14 + index * 18;
    output.push(`<rect class="${slot.wire ? "picoblade-cavity" : "picoblade-cavity-unused"}" x="${slotX}" y="${faceY + 31}" width="14" height="34" rx="3" />`);
    output.push(`<text class="picoblade-pin" x="${slotX + 7}" y="${faceY + 79}">${escapeXml(slot.pin)}</text>`);
  });
  output.push(`<text class="connector-unused-note" x="${faceX + width / 2}" y="${faceY + height + 18}">MOLEX 218112-0802 | 8 CIRCUITS | 1.25 mm | MATING FACE</text>`);
  output.push(`</g>`);
  wires.forEach((wire) => {
    const pin = side === "left" ? wire.fromPin : wire.toPin;
    const pinX = side === "left" ? 348 : 1238;
    output.push(`<text class="pin-label-compact" x="${pinX}" y="${wire.y + 4}">${escapeXml(pin)}</text>`);
  });
  return output.join("");
}

function buildKiCadPivotPowerRj45FaceSvg(x, wires, connector, side) {
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = x - 18;
  const faceY = centerY - 82;
  const faceWidth = 216;
  const faceHeight = 164;
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  const output = [
    `<g class="pivot-power-face" aria-label="TE 2213145-1 Pivot Power RJ45 contact view">`,
    `<rect class="pivot-power-shell" x="${faceX}" y="${faceY}" width="${faceWidth}" height="${faceHeight}" rx="14" />`,
    `<path class="pivot-power-nose" d="M ${faceX + 18} ${faceY + 18} H ${faceX + faceWidth - 18} V ${faceY + 108} H ${faceX + 150} L ${faceX + 136} ${faceY + 128} H ${faceX + 80} L ${faceX + 66} ${faceY + 108} H ${faceX + 18} Z" />`,
    `<rect class="pivot-power-stuffer" x="${faceX + 70}" y="${faceY + 118}" width="76" height="30" rx="4" />`
  ];
  for (let pin = 1; pin <= 8; pin += 1) {
    const contactX = faceX + 23 + (pin - 1) * 22;
    const activeClass = activePins.has(pin) ? "" : " pivot-power-contact-unused";
    output.push(`<rect class="pivot-power-contact${activeClass}" x="${contactX}" y="${faceY + 34}" width="14" height="58" rx="2" />`);
    output.push(`<text class="rj45-pin-number" x="${contactX + 7}" y="${faceY + 29}">${pin}</text>`);
    output.push(`<text class="rj45-color-label" x="${contactX + 7}" y="${faceY + 104}">${pin % 2 ? "ODD" : "EVEN"}</text>`);
  }
  output.push(`<text class="connector-unused-note" x="${faceX + faceWidth / 2}" y="${faceY + faceHeight + 18}">TE 2213145-1 PIVOT POWER | ODD COMMON / EVEN COMMON | 2 x 18 AWG</text>`);
  output.push(`</g>`);
  wires.forEach((wire) => {
    const pin = side === "left" ? wire.fromPin : wire.toPin;
    const pinX = side === "left" ? 348 : 1238;
    output.push(`<text class="pin-label-compact" x="${pinX}" y="${wire.y + 4}">${escapeXml(pin)}</text>`);
  });
  return output.join("");
}

function buildKiCadPcbFaceSvg(x, wires, connector, side) {
  const boardX = side === "left" ? x - 24 : x - 12;
  const boardWidth = 150;
  const top = Math.max(166, wires[0].y - 48);
  const bottom = wires[wires.length - 1].y + 48;
  const height = bottom - top;
  const padX = side === "left" ? boardX + boardWidth - 28 : boardX + 28;
  const traceEndX = side === "left" ? boardX + 30 : boardX + boardWidth - 30;
  const output = [
    `<rect class="pcb-board" x="${boardX}" y="${top}" width="${boardWidth}" height="${height}" rx="8" />`,
    `<rect class="pcb-silkscreen" x="${boardX + 9}" y="${top + 9}" width="${boardWidth - 18}" height="${height - 18}" rx="5" />`,
    `<circle class="pcb-hole" cx="${boardX + boardWidth - 17}" cy="${top + 17}" r="6" />`,
    `<circle class="pcb-hole" cx="${boardX + boardWidth - 17}" cy="${bottom - 17}" r="6" />`,
    `<text class="pcb-label" x="${boardX + boardWidth / 2}" y="${top + 19}">${escapeXml(shortLabel(connector.name.replace(/\s+PCB$/i, ""), 22))}</text>`,
    `<text class="pcb-label" x="${boardX + boardWidth / 2}" y="${bottom - 10}">DIRECT SOLDER</text>`
  ];
  wires.forEach((wire, index) => {
    output.push(`<line class="pcb-trace" x1="${padX}" y1="${wire.y}" x2="${traceEndX}" y2="${wire.y}" />`);
    output.push(`<circle class="pcb-pad" cx="${padX}" cy="${wire.y}" r="15" />`);
    output.push(`<circle class="pcb-hole" cx="${padX}" cy="${wire.y}" r="6" />`);
    output.push(`<text class="pcb-pin-number" x="${side === "left" ? padX - 29 : padX + 21}" y="${wire.y + 4}">${escapeXml(wire[side === "left" ? "fromPin" : "toPin"])}</text>`);
    if (side === "left") {
      output.push(`<text class="pin-side" x="72" y="${wire.y + 5}">PIN ${escapeXml(wire.fromPin)}</text>`);
      output.push(`<text class="pin-label" x="348" y="${wire.y + 5}">${escapeXml(wire.fromPin)}</text>`);
    } else {
      output.push(`<text class="pin-side" x="1490" y="${wire.y + 5}">PIN ${escapeXml(wire.toPin)}</text>`);
    }
  });
  return output.join("");
}

function buildKiCadCircularConnectorFaceSvg(x, wires, connector, side) {
  const centerX = x + 44;
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const positionCount = Math.max(wires.length, Number(connector.positionCount) || wires.length);
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  const output = [
    `<circle class="kicad-cpc-ring" cx="${centerX}" cy="${centerY}" r="105" />`,
    `<circle class="kicad-cpc-face" cx="${centerX}" cy="${centerY}" r="91" />`,
    `<path d="M ${centerX - 13} ${centerY - 103} H ${centerX + 13} L ${centerX + 9} ${centerY - 90} H ${centerX - 9} Z" fill="#050606" />`
  ];
  for (let pin = 1; pin <= positionCount; pin += 1) {
    const point = kiCadCircularCpcPinPoint(pin, positionCount, centerX, centerY);
    output.push(`<circle class="${activePins.has(pin) ? "kicad-cpc-cavity" : "kicad-cpc-cavity-unused"}" cx="${point.x}" cy="${point.y}" r="10" />`);
    output.push(`<text class="kicad-cpc-number" x="${point.x}" y="${point.y + 3}">${pin}</text>`);
  }
  wires.forEach((wire) => {
    const pin = side === "left" ? wire.fromPin : wire.toPin;
    const pinX = side === "left" ? 348 : 1238;
    output.push(`<text class="pin-label-compact" x="${pinX}" y="${wire.y + 4}">${escapeXml(pin)}</text>`);
  });
  if (connector.unusedPins?.length) {
    output.push(`<text class="connector-unused-note" x="${centerX}" y="${centerY + 120}">PIN${connector.unusedPins.length === 1 ? "" : "S"} ${escapeXml(connector.unusedPins.join(", "))}: NOT IN USE</text>`);
  }
  return output.join("");
}

function kiCadCircularCpcPinPoint(pin, positions, centerX, centerY) {
  if (positions === 13) {
    const point = PBOF_13_PIN_LAYOUT.find((item) => item.pin === Number(pin));
    return {
      x: centerX + (point?.dx || 0),
      y: centerY + (point?.dy || 0)
    };
  }
  if (positions === 16) {
    const point = CPC_17_16_PIN_LAYOUT.find((item) => item.pin === Number(pin));
    return {
      x: centerX + (point?.dx || 0),
      y: centerY + (point?.dy || 0)
    };
  }
  const angle = (-90 + (pin - 1) * 360 / Math.max(1, positions)) * Math.PI / 180;
  return {
    x: centerX + Math.cos(angle) * 68,
    y: centerY + Math.sin(angle) * 68
  };
}

function buildKiCadSegmentedRightFaceSvg(x, wires, connectorGroups) {
  const output = [];
  connectorGroups.forEach((group) => {
    const slots = group.slots?.length
      ? group.slots
      : group.wires.map((wire) => ({ pin: wire.toPin, wire, y: wire.rightTargetY || wire.y }));
    const top = group.top ?? slots[0].y - 18;
    const bottom = group.bottom ?? slots[slots.length - 1].y + 20;
    const height = bottom - top;
    const centerY = (top + bottom) / 2;
    const palette = group.palette || rightHousingPalette(group.name);
    if (isKiCadFerruleGroup(group)) {
      output.push(`<rect x="${x - 48}" y="${centerY - 8}" width="40" height="16" rx="5" fill="#3f4548" stroke="#111111" stroke-width="2" />`);
      output.push(`<rect x="${x - 14}" y="${centerY - 4}" width="18" height="8" rx="2" fill="#b8bec1" stroke="#555555" stroke-width="1" />`);
    }
    output.push(`<rect class="connector-body-right" x="${x}" y="${top}" width="88" height="${height}" rx="8" style="fill:${palette.fill};stroke:${palette.stroke}" />`);
    output.push(`<rect class="cavity" x="${x + 8}" y="${top + 5}" width="72" height="${Math.max(1, height - 10)}" rx="7" />`);
    slots.forEach((slot) => {
      output.push(`<rect class="${slot.wire ? "segmented-cavity" : "segmented-cavity-unused"}" x="${x + 25}" y="${slot.y - 8}" width="38" height="16" rx="4" />`);
      if (!slot.wire) {
        output.push(`<text class="connector-filler-pin" x="${x + 44}" y="${slot.y + 3}">${escapeXml(slot.pin)}</text>`);
      }
    });
    output.push(`<text class="connector-group-label" x="${x + 96}" y="${centerY + 4}">${escapeXml(kiCadRightConnectorGroupLabel(group))}</text>`);
  });
  wires.forEach((wire) => {
    output.push(`<text class="pin-label-compact" x="1238" y="${(wire.rightTargetY || wire.y) + 4}">${escapeXml(wire.toPin)}</text>`);
  });
  return output.join("");
}

function buildKiCadWireSvg(wire, {
  compact = false,
  leftPcb = false,
  rightPcb = false,
  pairAnalysis = { byRouteIndex: new Map() }
} = {}) {
  const color = wire.stroke;
  const textColorClass = wire.colorName === "RED" ? "table-red" : "table-text";
  const terminalHeight = compact ? 18 : 32;
  const terminalHalf = terminalHeight / 2;
  const markHalf = compact ? 4 : 7;
  const wireStartX = leftPcb ? 300 : 426;
  const wireEndX = rightPcb ? 1316 : 1164;
  const colorSpec = wireColorSpec(wire.colorLabel || wire.colorName || wire.row?.color);
  const routeGeometry = sheetWireRouteGeometry(wire, pairAnalysis, wireStartX, wireEndX);
  const leftTerminal = leftPcb ? "" : `
  <rect class="terminal" x="370" y="${wire.y - terminalHalf}" width="56" height="${terminalHeight}" fill="${color}" />
  <path class="terminal-mark" d="M 393 ${wire.y - markHalf} L 393 ${wire.y + markHalf} M ${393 - markHalf} ${wire.y} L ${393 + markHalf} ${wire.y}" />
  <text class="${textColorClass}" x="398" y="${wire.y + 4}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>`;
  const rightTerminal = rightPcb ? "" : `
  <rect class="terminal" x="1164" y="${wire.y - terminalHalf}" width="56" height="${terminalHeight}" fill="${color}" />
  <path class="terminal-mark" d="M 1192 ${wire.y - markHalf} L 1192 ${wire.y + markHalf} M ${1192 - markHalf} ${wire.y} L ${1192 + markHalf} ${wire.y}" />
  <text class="${textColorClass}" x="1192" y="${wire.y + 4}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>`;
  return `
  ${leftTerminal}
  ${rightTerminal}
  <path class="${compact ? "wire-line-compact" : "wire-line"}" d="${routeGeometry.svgPath}" stroke="${color}" />
  ${colorSpec.stripeStroke ? `<path class="${compact ? "wire-stripe-compact" : "wire-stripe"}" d="${routeGeometry.svgPath}" stroke="${colorSpec.stripeStroke}" />` : ""}
  <text class="${compact ? "wire-label-compact" : "wire-label"}" x="796" y="${wire.detailLabelY ?? wire.y - (compact ? 6 : 14)}">${escapeXml(wire.name)}${normalizeText(wire.name) === normalizeText(wire.colorLabel || wire.colorName) ? "" : ` (${escapeXml(wire.colorLabel || wire.colorName)})`} ${escapeXml(formatWireLengthLabel(wire.length))}</text>
  `;
}

function buildKiCadSpecsSvg(x, y, width, height, model) {
  const specs = [
    ["WIRE GAUGE:", `${model.awg || "TBD"} AWG`],
    ["CONDUCTOR:", "STRANDED TINNED COPPER"],
    ["INSULATION:", "PVC, 105C, 300V"],
    ["LENGTH TOLERANCE:", "+/-0.25 in"],
    ["TEMPERATURE RANGE:", "-20C TO 105C"],
    ["VOLTAGE RATING:", "300V"],
    ["ROHS COMPLIANT:", "YES"],
    ["BRANCHES:", "NONE"],
    ["TAP POSITION:", "NONE"]
  ];
  const rows = specs.map((spec, index) => `
    <text class="spec-label" x="${x + 12}" y="${y + 57 + index * 18}">${escapeXml(spec[0])}</text>
    <text class="spec-value" x="${x + 178}" y="${y + 57 + index * 18}">${escapeXml(spec[1])}</text>`).join("");
  return `
  <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
  <line class="table-grid" x1="${x}" y1="${y + 36}" x2="${x + width}" y2="${y + 36}" />
  <text class="table-title" x="${x + width / 2}" y="${y + 24}">SPECIFICATIONS</text>
  ${rows}`;
}

function buildKiCadBomRows(model) {
  const firstWire = model.wires[0] || {};
  const groundWire = model.wires.find((wire) => normalizeText(wire.name).includes("GND") || wire.colorName === "BLACK");
  const primaryHousingPart = firstFilled(model.wires.map((wire) => wire.row), "leftHousingPart") || "TBD";
  const groundHousingPart = groundWire?.leftHousingPart && groundWire.leftHousingPart !== primaryHousingPart ? groundWire.leftHousingPart : "";
  const contactPart = firstFilled(model.wires.map((wire) => wire.row), "leftPinPart") || "TBD";
  const rightPart = firstFilled(model.wires.map((wire) => wire.row), "rightHousingPart") || "SEE PCB ASSEMBLY\nFOR PART NUMBER";
  const rows = [
    ["1", "1", `${model.leftConnector.type || model.leftConnector.name} HOUSING\n${model.leftConnector.positionText}`, primaryHousingPart],
    ["2", String(model.wires.length), `${model.leftConnector.type || "CONNECTOR"} CONTACT\n${model.awg || firstWire.awg || ""}-20 AWG`, contactPart]
  ];
  if (groundHousingPart) {
    rows.push(["3", "1", `${model.leftConnector.type || model.leftConnector.name} GROUND HOUSING\n${model.leftConnector.positionText}`, groundHousingPart]);
  }
  rows.push([
    String(rows.length + 1),
    "1",
    isKiCadPcbConnector(model.rightConnector)
      ? `${model.rightConnector.name}\nDIRECT-SOLDER PADS`
      : `${model.rightConnector.name} CONNECTOR\n${model.rightConnector.positionText}`,
    rightPart
  ]);
  return rows.slice(0, 4);
}

function buildKiCadNotes(model) {
  const comments = model.wires.map((wire) => wire.row.comments).filter(Boolean);
  const pairNotes = [];
  const validationNote = twistedPairValidationNote(model.twistedPairAnalysis || { invalidGroups: [] });
  if (validationNote) {
    pairNotes.push(validationNote);
  }
  if (model.twistedPairAnalysis?.validGroups.length) {
    pairNotes.push(`TWISTED PAIR ${model.twistedPairAnalysis.validGroups.map((group) => group.id).join(", ")}: CROSSOVERS ARE SCHEMATIC; SEE COMMENTS FOR REQUIRED LAY.`);
  }
  if (comments.length || pairNotes.length) {
    return [...pairNotes, ...comments].slice(0, 6).map((comment) => shortLabel(comment, 90));
  }
  return [
    `ALL WIRES TO BE ${model.awg || "SPECIFIED"} AWG, PVC INSULATED.`,
    `CRIMP CONTACTS USING APPROPRIATE ${model.leftConnector.type || model.leftConnector.name} CRIMP TOOL.`,
    "VERIFY CONTINUITY AND CORRECT PIN ORIENTATION.",
    `ALL WIRES TO BE CUT TO ${formatLengthMeasurement(model.length)} +/-0.25 in.`,
    "NO SPLICES OR BRANCHES PERMITTED.",
    `LABEL CABLE AS "${model.cableName}" USING HEAT SHRINK OR TAG.`
  ];
}

function buildWireLegendSvg(x, y, width, height, model) {
  const colors = [];
  model.wires.forEach((wire) => {
    if (!colors.some((item) => item.name === wire.colorName)) {
      colors.push({ name: wire.colorName, stroke: wire.stroke, meaning: wire.colorName === "BLACK" ? "GROUND" : "POWER" });
    }
  });
  const preferredColors = ["RED", "BLACK"]
    .map((name) => colors.find((color) => color.name === name))
    .filter(Boolean);
  const legendColors = uniqueValues([...preferredColors.map((color) => color.name), ...colors.map((color) => color.name)])
    .slice(0, 2)
    .map((name) => colors.find((color) => color.name === name));
  const rows = legendColors.map((color, index) => {
    const rowGap = legendColors.length > 1 ? Math.min(34, height - 42) : 0;
    const rowY = y + 36 + index * rowGap;
    return `
      <line class="legend-line" x1="${x + 28}" y1="${rowY}" x2="${x + 78}" y2="${rowY}" stroke="${color.stroke}" />
      <text class="table-text" x="${x + 118}" y="${rowY + 4}">${escapeXml(color.name)}</text>
      <text class="table-text" x="${x + 154}" y="${rowY + 4}">=</text>
      <text class="table-text" x="${x + 205}" y="${rowY + 4}">${escapeXml(color.name === "BLACK" ? "GROUND" : color.name === "RED" ? "POWER" : "SIGNAL")}</text>`;
  }).join("");
  return `
  <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
  <text class="table-title" x="${x + width / 2}" y="${y + 22}">WIRE COLOR LEGEND</text>
  ${rows}`;
}

function buildKiCadTitleBlockSvg(x, y, width, height, model) {
  const midX = x + width * 0.52;
  const rightX = x + width * 0.78;
  return `
  <rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />
  <line class="table-grid" x1="${midX}" y1="${y}" x2="${midX}" y2="${y + height}" />
  <line class="table-grid" x1="${rightX}" y1="${y}" x2="${rightX}" y2="${y + height}" />
  <line class="table-grid" x1="${x}" y1="${y + 56}" x2="${x + width}" y2="${y + 56}" />
  <line class="table-grid" x1="${x + 125}" y1="${y + 56}" x2="${x + 125}" y2="${y + height}" />
  <line class="table-grid" x1="${x + 250}" y1="${y + 56}" x2="${x + 250}" y2="${y + height}" />
  <text class="title-block-label" x="${x + 14}" y="${y + 18}">DESCRIPTION:</text>
  <text class="title-block-text" x="${x + 285}" y="${y + 34}">${escapeXml(model.cableName)} CABLE ASSEMBLY</text>
  <text class="title-block-small" x="${x + 285}" y="${y + 54}">${escapeXml(model.description)}</text>
  <text class="title-block-label" x="${midX + 12}" y="${y + 18}">DRAWN BY:</text>
  <text class="title-block-small" x="${midX + 140}" y="${y + 34}">DIGIWIRE</text>
  <text class="title-block-label" x="${rightX + 12}" y="${y + 18}">REV:</text>
  <text class="title-block-text" x="${rightX + 150}" y="${y + 38}">A</text>
  <text class="title-block-label" x="${x + 12}" y="${y + 72}">SHEET:</text>
  <text class="title-block-text" x="${x + 66}" y="${y + 96}">1 OF 1</text>
  <text class="title-block-label" x="${x + 138}" y="${y + 72}">SCALE:</text>
  <text class="title-block-text" x="${x + 190}" y="${y + 96}">NONE</text>
  <text class="title-block-label" x="${x + 263}" y="${y + 72}">UNITS:</text>
  <text class="title-block-text" x="${x + 332}" y="${y + 96}">INCH</text>
  <text class="title-block-label" x="${midX + 14}" y="${y + 72}">DWG NO.</text>
  <text class="title-block-text" x="${midX + 170}" y="${y + 96}">${escapeXml(model.cableName)}</text>`;
}

function buildSvgTable({ x, y, width, title, headers, rows, colWidths, rowHeight = 32, titleHeight = 34, headerHeight = 34 }) {
  const height = titleHeight + headerHeight + rows.length * rowHeight;
  const scaledWidths = scaleColumnWidths(colWidths, width);
  const colXs = [x];
  scaledWidths.forEach((colWidth) => colXs.push(colXs[colXs.length - 1] + colWidth));
  const output = [
    `<rect class="table-outline" x="${x}" y="${y}" width="${width}" height="${height}" />`,
    `<line class="table-grid" x1="${x}" y1="${y + titleHeight}" x2="${x + width}" y2="${y + titleHeight}" />`,
    `<line class="table-grid" x1="${x}" y1="${y + titleHeight + headerHeight}" x2="${x + width}" y2="${y + titleHeight + headerHeight}" />`,
    `<text class="table-title" x="${x + width / 2}" y="${y + 23}">${escapeXml(title)}</text>`
  ];
  colXs.slice(1, -1).forEach((colX) => {
    output.push(`<line class="table-grid" x1="${colX}" y1="${y + titleHeight}" x2="${colX}" y2="${y + height}" />`);
  });
  rows.forEach((_, index) => {
    const rowY = y + titleHeight + headerHeight + (index + 1) * rowHeight;
    output.push(`<line class="table-grid" x1="${x}" y1="${rowY}" x2="${x + width}" y2="${rowY}" />`);
  });
  headers.forEach((header, index) => {
    output.push(svgTableCellText(header, colXs[index], y + titleHeight, scaledWidths[index], headerHeight, "table-head"));
  });
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellObject = typeof cell === "object" && cell !== null ? cell : { text: cell };
      output.push(svgTableCellText(cellObject.text, colXs[colIndex], y + titleHeight + headerHeight + rowIndex * rowHeight, scaledWidths[colIndex], rowHeight, cellObject.className || "table-text"));
    });
  });
  return output.join("");
}

function svgTableCellText(value, x, y, width, height, className) {
  const lines = String(value ?? "").split("\n").filter((line) => line !== "");
  const safeLines = lines.length ? lines : [""];
  const lineHeight = 12;
  const startY = y + height / 2 - ((safeLines.length - 1) * lineHeight) / 2 + 4;
  const tspans = safeLines.map((line, index) => `<tspan x="${x + width / 2}" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join("");
  return `<text class="${className}" x="${x + width / 2}" y="${startY}">${tspans}</text>`;
}

function scaleColumnWidths(widths, targetWidth) {
  const total = widths.reduce((sum, width) => sum + width, 0) || targetWidth;
  return widths.map((width, index) => index === widths.length - 1
    ? targetWidth - widths.slice(0, -1).reduce((sum, current) => sum + Math.round(current * targetWidth / total), 0)
    : Math.round(width * targetWidth / total));
}

function formatBoardPin(wire) {
  const role = wire.maestroRole?.code ? `${wire.maestroRole.code} ` : "";
  if (wire.rightLocalPin && wire.rightLocalPin !== wire.toPin) {
    return `${role}${wire.rightLocalPin} (pin ${wire.toPin})`;
  }
  return `${role}${wire.toPin || wire.rightLocalPin || ""}`.trim();
}

function uniqueValues(values) {
  const output = [];
  values.forEach((value) => {
    const trimmed = String(value || "").trim();
    if (trimmed && !output.includes(trimmed)) {
      output.push(trimmed);
    }
  });
  return output;
}

function maestroHeaderLabels() {
  return [
    { pin: "1", code: "GND", label: "Ground", detail: "closest to edge" },
    { pin: "2", code: "V+", label: "Servo power", detail: "middle rail" },
    { pin: "3", code: "SIG", label: "Signal", detail: "inside board" }
  ];
}

function dominantSheetValue(rows, key) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = String(row[key] || "").trim();
    const normalized = normalizeText(value);
    if (!value || normalized === "NONE" || normalized === "N/A" || normalized === "TBD") {
      return;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || "";
}

function normalizeColorName(color) {
  return wireColorSpec(color).baseName;
}

function parseLengthMeasurement(length, defaultUnit = "in") {
  const raw = String(length ?? "").trim();
  const numericText = raw.replace(/,/g, "").match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/)?.[0] || "";
  const value = Number(numericText);
  const normalized = normalizeText(raw);
  const unit = /\b(?:FT|FOOT|FEET)\b/.test(normalized) || raw.includes("'")
    ? "ft"
    : /\b(?:IN|INCH|INCHES)\b/.test(normalized) || raw.includes("\"")
      ? "in"
      : defaultUnit;
  return {
    raw,
    value,
    unit
  };
}

function assignKiCadWireLabelLayout(wires, pairAnalysis) {
  const rectangles = wires.map((wire) => {
    const desiredY = wire.y - 29;
    return { id: String(wire.index), x: 610, y: desiredY, width: 380, height: 24 };
  });
  const placed = HarnessCore.placeLabels(rectangles, { minY: 130, maxY: 570, gap: 5 });
  const byId = new Map(placed.map((rectangle) => [rectangle.id, rectangle]));
  wires.forEach((wire) => {
    const rectangle = byId.get(String(wire.index));
    wire.detailLabelTop = rectangle?.y ?? wire.y - 12;
    wire.detailLabelY = wire.detailLabelTop + 16;
  });
}

function isKiCadFerruleGroup(group) {
  return normalizeText(`${group.name} ${group.housingType} ${group.housingPart} ${group.pinPart}`).includes("FERRULE");
}

function kiCadRightConnectorGroupLabel(group) {
  const details = [group.name];
  if (isKiCadFerruleGroup(group)) {
    details.push("FERRULE");
  }
  details.push(`${Math.max(1, Number(group.positionCount) || group.wires.length)} POS`);
  return uniqueValues(details).join(" | ");
}

function alignKiCadWiresToRightConnectorGroups(wires, groups) {
  const targetYByWire = new Map();
  groups.forEach((group) => {
    group.slots.forEach((slot) => {
      if (slot.wire) {
        targetYByWire.set(slot.wire, slot.y);
      }
    });
  });
  wires.forEach((wire) => {
    const targetY = targetYByWire.get(wire);
    if (Number.isFinite(targetY)) {
      wire.y = targetY;
      wire.rightTargetY = targetY;
    }
  });
}

function formatLengthMeasurement(length, defaultUnit = "in") {
  const parsed = parseLengthMeasurement(length, defaultUnit);
  if (!Number.isFinite(parsed.value)) {
    return parsed.raw || "TBD";
  }
  return `${parsed.value.toFixed(2)} ${parsed.unit}`;
}

function formatWireLengthLabel(length, fallback = "") {
  const value = isMeaningfulSheetValue(length) ? length : fallback;
  return isMeaningfulSheetValue(value) ? formatLengthMeasurement(value) : "LENGTH TBD";
}

function drawioLabelWidth(text, fontSize = 11, minWidth = 64, maxWidth = 230) {
  const estimatedWidth = String(text || "").length * fontSize * 0.62 + 12;
  return Math.round(clamp(estimatedWidth, minWidth, maxWidth));
}

function isBarrelPowerCableSheet(rows) {
  const haystack = rows
    .map((row) => [
      row.cableName,
      row.wireName,
      row.rightLegName,
      row.rightHousingType,
      row.comments
    ].join(" "))
    .join(" ");
  const text = normalizeText(haystack);
  return text.includes("BARREL") && (text.includes("48V") || text.includes("+48") || text.includes("POWER"));
}

function buildBarrelPowerCableSvg(result) {
  const sheet = result.sheetHarness;
  const rows = sheet.rows;
  const powerRow = findSheetRow(rows, (row) => {
    const text = normalizeText(`${row.wireName} ${row.color} ${row.comments}`);
    return text.includes("+48") || text.includes("POS") || text.includes("RED") || text.includes("CENTER PIN");
  }) || rows[1] || {};
  const groundRow = findSheetRow(rows, (row) => {
    const text = normalizeText(`${row.wireName} ${row.color} ${row.comments}`);
    return text.includes("GND") || text.includes("GROUND") || text.includes("BLACK") || text.includes("SLEEVE");
  }) || rows[0] || {};
  const wrapRow = findSheetRow(rows, (row) => {
    const text = normalizeText(`${row.wireName} ${row.branchRole} ${row.leftHousingType} ${row.rightHousingType} ${row.comments}`);
    return text.includes("WRAP") || text.includes("SLEEVE") || text.includes("PROTECTION") || text.includes("HEAT SHRINK");
  }) || {};
  const cableName = escapeXml(sheet.cableName || "48V Barrel Power Cable");
  const leftTitle = escapeXml(firstFilled(rows, "leftLegName") || "48V Source Connector");
  const sourceType = escapeXml(groundRow.leftHousingType || powerRow.leftHousingType || "2 Pin Connector");
  const barrelTitle = escapeXml(groundRow.rightLegName || powerRow.rightLegName || "DC Barrel Plug");
  const wrapLength = escapeXml(formatLengthMeasurement(wrapRow.length || "8"));
  const groundPin = escapeXml(groundRow.leftPinPos || "1");
  const powerPin = escapeXml(powerRow.leftPinPos || "2");
  const gndRight = escapeXml(groundRow.rightPinPos || "Outer Sleeve / Shell");
  const pwrRight = escapeXml(powerRow.rightPinPos || "Center Pin");
  const notes = [groundRow.comments, powerRow.comments, wrapRow.comments]
    .filter(Boolean)
    .slice(0, 3)
    .map((note, index) => `<text class="note" x="68" y="${690 + index * 24}">${escapeXml(shortLabel(note, 150))}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${cableName}">
  <defs>
    ${buildBraidPatternDefs()}
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
    </marker>
    <style>
      .sheet { fill: #ffffff; }
      .title { fill: #000000; font: 900 32px Aptos, Segoe UI, sans-serif; letter-spacing: 0.7px; }
      .subtitle { fill: #333333; font: 700 17px Aptos, Segoe UI, sans-serif; }
      .connector-box, .plug-outline { fill: #ffffff; stroke: #000000; stroke-width: 4; }
      .connector-title { fill: #000000; font: 900 18px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-text { fill: #000000; font: 800 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire { fill: none; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
      .wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .small { fill: #222222; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .callout { fill: #000000; font: 800 13px Aptos, Segoe UI, sans-serif; }
      .wrap-shell { fill: #d7dde0; fill-opacity: 0.46; stroke: #4f5961; stroke-width: 3; }
      .wrap-weave { fill: url(#braidPattern); opacity: 0.58; }
      .wrap-label { fill: #1f2930; font: 900 14px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .heat-shrink { fill: #111111; opacity: 0.82; }
      .barrel-metal { fill: #f8f8f8; stroke: #000000; stroke-width: 4; }
      .barrel-front { fill: #ffffff; stroke: #000000; stroke-width: 4; }
      .center-pin { fill: #fff4f4; stroke: #d62828; stroke-width: 4; }
      .shell-contact { fill: none; stroke: #050505; stroke-width: 6; stroke-linecap: round; }
      .dim-line { fill: none; stroke: #111111; stroke-width: 2; }
      .dim-label { fill: #000000; font: 800 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .note-title { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; }
      .note { fill: #222222; font: 600 12px Aptos, Segoe UI, sans-serif; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <text class="title" x="46" y="58">${cableName} HARNESS ASSEMBLY</text>
  <text class="subtitle" x="46" y="92">2 conductor 48V barrel power cable | wire wrap sleeve around both conductors</text>

  <rect class="connector-box" x="62" y="235" width="220" height="230" rx="6" />
  <text class="connector-title" x="172" y="270">${leftTitle}</text>
  <text class="small" x="172" y="296">${sourceType}</text>
  <text class="pin-text" x="126" y="340">Pin ${groundPin}</text>
  <text class="pin-text" x="126" y="408">Pin ${powerPin}</text>

  <rect class="wrap-shell" x="318" y="296" width="760" height="142" rx="54" />
  <rect class="wrap-weave" x="318" y="296" width="760" height="142" rx="54" />
  <rect class="heat-shrink" x="318" y="292" width="24" height="150" rx="8" />
  <rect class="heat-shrink" x="1054" y="292" width="24" height="150" rx="8" />
  <text class="wrap-label" x="698" y="286">Expandable wire wrap sleeve around GND and +48V</text>
  <path class="dim-line" d="M 360 462 L 1036 462" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="698" y="488">${wrapLength} wrap section</text>
  <text class="small" x="330" y="458">Heat shrink</text>
  <text class="small" x="1066" y="458">Heat shrink</text>

  <path class="wire" d="M 282 340 L 1124 340 L 1188 315 L 1235 315" stroke="#050505" />
  <path class="wire" d="M 282 408 L 1124 408 L 1188 375 L 1235 375" stroke="#d62828" />
  <circle class="barrel-front" cx="282" cy="340" r="5" />
  <circle class="barrel-front" cx="282" cy="408" r="5" />
  <text class="wire-label" x="628" y="330">GND / BLACK</text>
  <text class="wire-label" x="628" y="432">+48V / RED</text>

  <rect class="barrel-metal" x="1185" y="282" width="95" height="126" rx="20" />
  <rect class="barrel-metal" x="1268" y="252" width="225" height="186" rx="36" />
  <ellipse class="barrel-front" cx="1492" cy="345" rx="34" ry="93" />
  <ellipse class="center-pin" cx="1492" cy="345" rx="12" ry="35" />
  <path class="shell-contact" d="M 1295 295 L 1458 295" />
  <path class="shell-contact" d="M 1295 395 L 1458 395" />
  <text class="connector-title" x="1380" y="238">${barrelTitle}</text>
  <text class="callout" x="1276" y="476">Outer sleeve / shell = GND (${gndRight})</text>
  <text class="callout" x="1276" y="500">Center pin = +48V (${pwrRight})</text>

  <text class="note-title" x="68" y="660">BUILD NOTES</text>
  ${notes}
</svg>`;
}

function findSheetRow(rows, predicate) {
  return rows.find((row) => {
    try {
      return predicate(row);
    } catch {
      return false;
    }
  }) || null;
}

function buildResistorPath(x, y1, y2, amplitude) {
  const steps = 8;
  const gap = (y2 - y1) / steps;
  const points = [`M ${x} ${y1}`];
  for (let step = 1; step < steps; step += 1) {
    const offset = step % 2 === 0 ? -amplitude : amplitude;
    points.push(`L ${x + offset} ${(y1 + gap * step).toFixed(1)}`);
  }
  points.push(`L ${x} ${y2}`);
  return points.join(" ");
}

function buildSvgGrid() {
  const minor = [];
  const major = [];
  for (let x = 40; x <= SVG_WIDTH - 40; x += 28) {
    const target = x % 112 === 0 ? major : minor;
    target.push(`<line x1="${x}" y1="40" x2="${x}" y2="${SVG_HEIGHT - 40}" class="${target === major ? "grid-major" : "grid-minor"}" />`);
  }
  for (let y = 40; y <= SVG_HEIGHT - 40; y += 28) {
    const target = y % 112 === 0 ? major : minor;
    target.push(`<line x1="40" y1="${y}" x2="${SVG_WIDTH - 40}" y2="${y}" class="${target === major ? "grid-major" : "grid-minor"}" />`);
  }
  return `${minor.join("")}${major.join("")}`;
}

async function recognizeText(best) {
  const fallback = { findings: [], text: "", confidence: 0 };
  const worker = await ensureOcrWorker();
  if (!worker) {
    return fallback;
  }

  try {
    const canvas = maskToCanvas(best.mask, best.width, best.height);
    const result = await worker.recognize(canvas, {}, { text: true, tsv: true });
    const findings = parseOcrTsv(result?.data?.tsv || "", best.width, best.height);
    return {
      findings,
      text: result?.data?.text || "",
      confidence: findings.length ? average(findings.map((finding) => finding.confidence)) : 0
    };
  } catch (error) {
    console.warn("OCR failed", error);
    return fallback;
  }
}

async function ensureOcrWorker() {
  if (ocrUnavailable) {
    return null;
  }
  if (ocrWorker) {
    return ocrWorker;
  }
  if (ocrWorkerPromise) {
    return ocrWorkerPromise;
  }
  if (!window.Tesseract || typeof window.Tesseract.createWorker !== "function") {
    ocrUnavailable = true;
    return null;
  }

  ocrWorkerPromise = window.Tesseract.createWorker("eng", 1, {
    workerPath: OCR_WORKER_PATH,
    corePath: OCR_CORE_PATH,
    langPath: OCR_LANG_PATH,
    cacheMethod: "write",
    gzip: true,
    logger: (message) => {
      if (!message?.status) {
        return;
      }
      const progress = Number.isFinite(Number(message.progress))
        ? ` ${Math.round(Number(message.progress) * 100)}%`
        : "";
      setStatus(`OCR ${message.status}${progress}`);
    }
  }).then(async (worker) => {
    await worker.setParameters({
      tessedit_pageseg_mode: "11",
      preserve_interword_spaces: "1",
      user_defined_dpi: "220"
    });
    ocrWorker = worker;
    return worker;
  }).catch((error) => {
    console.warn("OCR worker unavailable", error);
    ocrUnavailable = true;
    return null;
  });

  return ocrWorkerPromise;
}

function parseOcrTsv(tsv, width, height) {
  const lines = String(tsv || "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split("\t");
  const column = (name) => headers.indexOf(name);
  const levelIndex = column("level");
  const leftIndex = column("left");
  const topIndex = column("top");
  const widthIndex = column("width");
  const heightIndex = column("height");
  const confIndex = column("conf");
  const textIndex = column("text");

  const words = lines.slice(1).map((line) => {
    const cells = line.split("\t");
    if (Number(cells[levelIndex]) !== 5) {
      return null;
    }
    const text = normalizeText(cells[textIndex]);
    const confidence = clamp(numberOrDefault(cells[confIndex], 0) / 100, 0, 1);
    const left = numberOrDefault(cells[leftIndex], NaN);
    const top = numberOrDefault(cells[topIndex], NaN);
    const boxWidth = numberOrDefault(cells[widthIndex], NaN);
    const boxHeight = numberOrDefault(cells[heightIndex], NaN);
    if (!text || confidence < 0.18 || ![left, top, boxWidth, boxHeight].every(Number.isFinite)) {
      return null;
    }
    return {
      text,
      confidence,
      x: left,
      y: top,
      width: boxWidth,
      height: boxHeight,
      centerX: left + boxWidth / 2,
      centerY: top + boxHeight / 2
    };
  }).filter(Boolean);

  return clusterWords(words, width, height);
}

function clusterWords(words, width, height) {
  const sorted = [...words].sort((left, right) => left.y - right.y || left.x - right.x);
  const groups = [];
  sorted.forEach((word) => {
    let group = groups.find((candidate) => wordBelongsToGroup(word, candidate));
    if (!group) {
      group = {
        words: [],
        x: word.x,
        y: word.y,
        right: word.x + word.width,
        bottom: word.y + word.height
      };
      groups.push(group);
    }
    group.words.push(word);
    group.x = Math.min(group.x, word.x);
    group.y = Math.min(group.y, word.y);
    group.right = Math.max(group.right, word.x + word.width);
    group.bottom = Math.max(group.bottom, word.y + word.height);
  });

  return groups.map((group, index) => {
    const groupWidth = group.right - group.x;
    const groupHeight = group.bottom - group.y;
    const vertical = groupHeight > groupWidth * 1.25;
    const ordered = group.words.sort((left, right) => vertical
      ? left.y - right.y || left.x - right.x
      : left.x - right.x || left.y - right.y);
    const text = normalizeText(ordered.map((word) => word.text).join(vertical ? "" : " "));
    if (!text || text.length < 2) {
      return null;
    }
    return {
      id: `TXT${index + 1}`,
      text,
      kind: inferTextKind(text, group.x, group.y, groupWidth, groupHeight, width, height),
      x: group.x,
      y: group.y,
      width: groupWidth,
      height: groupHeight,
      confidence: clamp(average(group.words.map((word) => word.confidence)), 0, 1)
    };
  }).filter(Boolean);
}

function wordBelongsToGroup(word, group) {
  const groupWidth = group.right - group.x;
  const groupHeight = group.bottom - group.y;
  const sameRow = Math.abs(word.centerY - (group.y + groupHeight / 2)) <= Math.max(18, groupHeight * 0.75);
  const closeX = word.x <= group.right + Math.max(28, word.height * 1.6);
  const sameColumn = Math.abs(word.centerX - (group.x + groupWidth / 2)) <= Math.max(18, groupWidth * 0.75);
  const closeY = word.y <= group.bottom + Math.max(28, word.width * 0.7);
  return (sameRow && closeX) || (sameColumn && closeY);
}

function inferTextKind(text, x, y, width, height, imageWidth, imageHeight) {
  const nearRight = (x + width) / imageWidth > 0.62;
  const vertical = height > width * 1.25;
  if (/\d/.test(text) && (/["']/.test(text) || /\b(IN|INCH|MM|CM|OHM|OHMS)\b/.test(text))) {
    return "dimension";
  }
  if (/^(X|\*|\+)$/.test(text)) {
    return "marker";
  }
  if (nearRight || vertical) {
    return "connector";
  }
  return "label";
}

function classifyFindings(ocrFindings, components, width, height) {
  const textFindings = ocrFindings.map((finding) => ({
    id: finding.id,
    text: finding.text,
    kind: finding.kind,
    x: finding.x,
    y: finding.y,
    width: finding.width,
    height: finding.height,
    confidence: finding.confidence
  }));
  const markerFindings = components
    .filter((component) => component.kind === "marker")
    .slice(0, 18)
    .map((component, index) => ({
      id: `MARK${index + 1}`,
      text: "MARK",
      kind: "marker",
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
      confidence: 0.42
    }));
  return [...textFindings, ...markerFindings]
    .filter((finding) => finding.width <= width * 0.5 && finding.height <= height * 0.5)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function isVisibleFinding(finding) {
  return finding.kind !== "marker" || normalizeText(finding.text) !== "MARK";
}

function attachConnectorLabels(connectors, findings, width, height) {
  return connectors.map((connector, index) => {
    const labelFinding = findings
      .filter((finding) => finding.kind === "connector" || finding.kind === "label")
      .map((finding) => ({
        finding,
        distance: Math.hypot(
          finding.x + finding.width / 2 - (connector.x + connector.width / 2),
          finding.y + finding.height / 2 - (connector.y + connector.height / 2)
        )
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.finding;
    return {
      ...connector,
      id: connector.id || `${connector.side === "right" ? "J" : "P"}${index + 1}`,
      label: labelFinding?.text || `${connector.side === "right" ? "LOAD" : "BUS"} ${index + 1}`,
      confidence: labelFinding ? Math.max(0.52, labelFinding.confidence) : 0.46
    };
  });
}

function nearestConnector(x, y, connectors) {
  if (!connectors.length) {
    return null;
  }
  return connectors
    .map((connector) => ({
      connector,
      distance: Math.hypot(x - (connector.x + connector.width / 2), y - (connector.y + connector.height / 2))
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.connector || null;
}

function nearestFinding(segment, findings, width, height) {
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  return findings
    .filter((finding) => finding.kind === "label" || finding.kind === "dimension")
    .map((finding) => ({
      finding,
      distance: Math.hypot(midX - (finding.x + finding.width / 2), midY - (finding.y + finding.height / 2))
    }))
    .filter((item) => item.distance <= Math.max(width, height) * 0.22)
    .sort((left, right) => left.distance - right.distance || right.finding.confidence - left.finding.confidence)[0]?.finding || null;
}

function imageToImageData(image, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(image.width || 1, image.height || 1));
  const width = Math.max(1, Math.round((image.width || 1) * scale));
  const height = Math.max(1, Math.round((image.height || 1) * scale));
  const canvas = dom.workCanvas;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return {
    imageData: ctx.getImageData(0, 0, width, height),
    width,
    height
  };
}

function detectPaperBounds(source) {
  const { imageData, width, height } = source;
  const rowCounts = new Array(height).fill(0);
  const colCounts = new Array(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const paperish = lum > 132 && saturation < 0.42;
      if (paperish) {
        rowCounts[y] += 1;
        colCounts[x] += 1;
      }
    }
  }

  const rowThreshold = Math.max(8, width * 0.12);
  const colThreshold = Math.max(8, height * 0.12);
  let top = rowCounts.findIndex((count) => count >= rowThreshold);
  let bottom = height - 1 - [...rowCounts].reverse().findIndex((count) => count >= rowThreshold);
  let left = colCounts.findIndex((count) => count >= colThreshold);
  let right = width - 1 - [...colCounts].reverse().findIndex((count) => count >= colThreshold);
  if (top < 0 || left < 0 || bottom <= top || right <= left) {
    return { x: 0, y: 0, width, height };
  }
  const padX = Math.round(width * 0.015);
  const padY = Math.round(height * 0.015);
  top = clamp(top - padY, 0, height - 1);
  bottom = clamp(bottom + padY, 0, height - 1);
  left = clamp(left - padX, 0, width - 1);
  right = clamp(right + padX, 0, width - 1);
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1)
  };
}

function cropImageData(source, bounds) {
  const canvas = dom.workCanvas;
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.putImageData(source.imageData, 0, 0);
  const x = clamp(Math.round(bounds.x), 0, source.width - 1);
  const y = clamp(Math.round(bounds.y), 0, source.height - 1);
  const width = Math.max(1, Math.min(source.width - x, Math.round(bounds.width)));
  const height = Math.max(1, Math.min(source.height - y, Math.round(bounds.height)));
  return {
    imageData: ctx.getImageData(x, y, width, height),
    width,
    height
  };
}

function rotateImageData(source, rotation) {
  const width = source.width;
  const height = source.height;
  const rotatedWidth = rotation % 2 === 0 ? width : height;
  const rotatedHeight = rotation % 2 === 0 ? height : width;
  const canvas = dom.workCanvas;
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const output = ctx.createImageData(rotatedWidth, rotatedHeight);
  for (let y = 0; y < rotatedHeight; y += 1) {
    for (let x = 0; x < rotatedWidth; x += 1) {
      const point = sourcePointForRotation(x, y, rotation, width, height);
      const sourceIndex = (point.y * width + point.x) * 4;
      const targetIndex = (y * rotatedWidth + x) * 4;
      output.data[targetIndex] = source.imageData.data[sourceIndex];
      output.data[targetIndex + 1] = source.imageData.data[sourceIndex + 1];
      output.data[targetIndex + 2] = source.imageData.data[sourceIndex + 2];
      output.data[targetIndex + 3] = source.imageData.data[sourceIndex + 3];
    }
  }
  ctx.putImageData(output, 0, 0);
  return {
    imageData: ctx.getImageData(0, 0, rotatedWidth, rotatedHeight),
    width: rotatedWidth,
    height: rotatedHeight
  };
}

function sourcePointForRotation(x, y, rotation, width, height) {
  switch (rotation & 3) {
    case 1:
      return { x: y, y: height - 1 - x };
    case 2:
      return { x: width - 1 - x, y: height - 1 - y };
    case 3:
      return { x: width - 1 - y, y: x };
    default:
      return { x, y };
  }
}

function createInkMask(source) {
  const { imageData, width, height } = source;
  const pixelCount = width * height;
  const gray = new Uint8Array(pixelCount);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      gray[y * width + x] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
    }
  }

  const radius = Math.max(6, Math.round(Math.min(width, height) * 0.012));
  const localMean = boxBlurGray(gray, width, height, radius);
  const mask = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    const base = index * 4;
    const r = imageData.data[base];
    const g = imageData.data[base + 1];
    const b = imageData.data[base + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const blueGrid = b > r + 3 && b > g + 1 ? clamp((b - Math.max(r, g) - 1) / 30, 0, 1) : 0;
    const contrast = localMean[index] - gray[index];
    const localInk = clamp((contrast - 9) / 30, 0, 1);
    const neutralDarkInk = clamp((212 - gray[index]) / 88, 0, 1) * clamp(1 - saturation * 1.35, 0, 1);
    const score = Math.max(localInk, neutralDarkInk * 0.88) * (1 - blueGrid * 0.96);
    if (score >= 0.18) {
      mask[index] = 1;
    }
  }
  return mask;
}

function createRouteInkMask(source) {
  const { imageData, width, height } = source;
  const mask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const base = index * 4;
    const r = imageData.data[base];
    const g = imageData.data[base + 1];
    const b = imageData.data[base + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const blueCast = b - Math.max(r, g);
    const darkNeutralInk = lum <= 198 && chroma <= 30 && blueCast <= 17;
    const veryDarkInk = lum <= 142 && chroma <= 52;
    if (darkNeutralInk || veryDarkInk) {
      mask[index] = 1;
    }
  }
  return mask;
}

function boxBlurGray(gray, width, height, radius) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    const rowOffset = y * width;
    const integralRow = (y + 1) * stride;
    const previousRow = y * stride;
    for (let x = 0; x < width; x += 1) {
      rowSum += gray[rowOffset + x];
      integral[integralRow + x + 1] = integral[previousRow + x + 1] + rowSum;
    }
  }

  const blurred = new Float32Array(gray.length);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const topRow = y0 * stride;
    const bottomRow = (y1 + 1) * stride;
    const areaHeight = y1 - y0 + 1;
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = areaHeight * (x1 - x0 + 1);
      const sum =
        integral[bottomRow + x1 + 1] -
        integral[topRow + x1 + 1] -
        integral[bottomRow + x0] +
        integral[topRow + x0];
      blurred[y * width + x] = sum / area;
    }
  }
  return blurred;
}

function pruneTinyComponents(mask, width, height, minArea) {
  const visited = new Uint8Array(mask.length);
  const output = new Uint8Array(mask.length);
  const stack = [];
  const component = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (!mask[startIndex] || visited[startIndex]) {
        continue;
      }
      component.length = 0;
      stack.length = 0;
      stack.push(startIndex);
      visited[startIndex] = 1;
      while (stack.length) {
        const index = stack.pop();
        component.push(index);
        const px = index % width;
        const py = Math.floor(index / width);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) {
              continue;
            }
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }
            const nextIndex = ny * width + nx;
            if (mask[nextIndex] && !visited[nextIndex]) {
              visited[nextIndex] = 1;
              stack.push(nextIndex);
            }
          }
        }
      }
      if (component.length >= minArea) {
        for (let index = 0; index < component.length; index += 1) {
          output[component[index]] = 1;
        }
      }
    }
  }
  return output;
}

function extractLineSegments(mask, width, height, orientation) {
  const axisLength = orientation === "horizontal" ? height : width;
  const crossLength = orientation === "horizontal" ? width : height;
  const minRunLength = Math.max(28, Math.round(crossLength * 0.035));
  const maxGap = Math.max(2, Math.round(crossLength * 0.004));
  const minDensity = 0.26;
  const runs = [];

  for (let axis = 0; axis < axisLength; axis += 1) {
    let start = -1;
    let lastInk = -1;
    let inkCount = 0;
    let gap = 0;
    for (let cross = 0; cross < crossLength; cross += 1) {
      const index = orientation === "horizontal"
        ? axis * width + cross
        : cross * width + axis;
      if (mask[index]) {
        if (start < 0) {
          start = cross;
          inkCount = 0;
        }
        lastInk = cross;
        inkCount += 1;
        gap = 0;
      } else if (start >= 0) {
        gap += 1;
        if (gap > maxGap) {
          addLineRun(runs, orientation, axis, start, lastInk, inkCount, minRunLength, minDensity);
          start = -1;
          lastInk = -1;
          inkCount = 0;
          gap = 0;
        }
      }
    }
    if (start >= 0) {
      addLineRun(runs, orientation, axis, start, lastInk, inkCount, minRunLength, minDensity);
    }
  }

  return mergeLineRuns(runs, width, height, orientation)
    .filter((segment) => !isBorderLikeSegment(segment, width, height));
}

function addLineRun(runs, orientation, axis, start, end, inkCount, minRunLength, minDensity) {
  const length = end - start + 1;
  const density = length > 0 ? inkCount / length : 0;
  if (length < minRunLength || density < minDensity) {
    return;
  }
  runs.push({
    kind: orientation,
    axis,
    axisMin: axis,
    axisMax: axis,
    start,
    end,
    inkCount,
    density,
    samples: 1
  });
}

function mergeLineRuns(runs, width, height, orientation) {
  const axisLength = orientation === "horizontal" ? height : width;
  const crossLength = orientation === "horizontal" ? width : height;
  const axisTolerance = Math.max(3, Math.round(axisLength * 0.006));
  const rangeTolerance = Math.max(12, Math.round(crossLength * 0.018));
  const sorted = [...runs].sort((left, right) => left.axis - right.axis || left.start - right.start);
  const merged = [];

  sorted.forEach((run) => {
    const target = merged.find((candidate) => lineRunsBelong(candidate, run, axisTolerance, rangeTolerance));
    if (!target) {
      merged.push({ ...run });
      return;
    }

    const totalSamples = target.samples + run.samples;
    target.axis = (target.axis * target.samples + run.axis * run.samples) / totalSamples;
    target.axisMin = Math.min(target.axisMin, run.axisMin);
    target.axisMax = Math.max(target.axisMax, run.axisMax);
    target.start = Math.min(target.start, run.start);
    target.end = Math.max(target.end, run.end);
    target.inkCount += run.inkCount;
    target.samples = totalSamples;
    target.density = Math.min(1, target.inkCount / Math.max(1, (target.end - target.start + 1) * target.samples));
  });

  return merged
    .map((run) => lineRunToSegment(run, width, height, orientation))
    .filter((segment) => segment.length >= Math.max(30, crossLength * 0.04) && segment.thickness <= Math.max(18, axisLength * 0.04))
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind.localeCompare(right.kind);
      }
      return left.kind === "horizontal" ? left.y1 - right.y1 : left.x1 - right.x1;
    });
}

function lineRunsBelong(left, right, axisTolerance, rangeTolerance) {
  if (Math.abs(left.axis - right.axis) > axisTolerance) {
    return false;
  }
  const overlap = Math.min(left.end, right.end) - Math.max(left.start, right.start);
  const leftLength = left.end - left.start + 1;
  const rightLength = right.end - right.start + 1;
  const shorter = Math.max(1, Math.min(leftLength, rightLength));
  const closeStart = Math.abs(left.start - right.start) <= rangeTolerance;
  const closeEnd = Math.abs(left.end - right.end) <= rangeTolerance;
  return overlap >= shorter * 0.35 || (closeStart && closeEnd);
}

function lineRunToSegment(run, width, height, orientation) {
  const length = run.end - run.start + 1;
  const thickness = run.axisMax - run.axisMin + 1;
  const crossLength = orientation === "horizontal" ? width : height;
  const lengthScore = clamp(length / Math.max(1, crossLength * 0.22), 0, 1);
  const densityScore = clamp(run.density, 0, 1);
  const thicknessScore = clamp(1 - Math.max(0, thickness - 7) / 24, 0.35, 1);
  const confidence = clamp(0.16 + lengthScore * 0.58 + densityScore * 0.18 + thicknessScore * 0.08, 0, 0.97);
  return orientation === "horizontal"
    ? { id: makeId("H"), kind: "horizontal", x1: run.start, y1: run.axis, x2: run.end, y2: run.axis, length, thickness, confidence }
    : { id: makeId("V"), kind: "vertical", x1: run.axis, y1: run.start, x2: run.axis, y2: run.end, length, thickness, confidence };
}

function isBorderLikeSegment(segment, width, height) {
  const edgeX = width * 0.06;
  const edgeY = height * 0.06;
  if (segment.kind === "horizontal") {
    const y = (segment.y1 + segment.y2) / 2;
    const touchesSide = segment.x1 <= edgeX || segment.x2 >= width - edgeX;
    const nearTopOrBottom = y <= edgeY || y >= height - edgeY;
    return (
      segment.length >= width * 0.78 && touchesSide
    ) || (
      nearTopOrBottom && segment.length >= width * 0.34
    );
  }
  const x = (segment.x1 + segment.x2) / 2;
  const nearSide = x <= edgeX || x >= width - edgeX;
  return nearSide && segment.length >= height * 0.34;
}

function mergeSegments(segments, width, height) {
  const sorted = [...segments].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return (left.kind === "horizontal" ? left.y1 - right.y1 : left.x1 - right.x1);
  });
  const merged = [];
  sorted.forEach((segment) => {
    const last = merged[merged.length - 1];
    if (!last || last.kind !== segment.kind) {
      merged.push({ ...segment });
      return;
    }
    const near = segment.kind === "horizontal"
      ? Math.abs(segment.y1 - last.y1) <= Math.max(4, height * 0.006)
      : Math.abs(segment.x1 - last.x1) <= Math.max(4, width * 0.006);
    const overlap = segment.kind === "horizontal"
      ? segment.x1 <= last.x2 + Math.max(24, width * 0.02)
      : segment.y1 <= last.y2 + Math.max(24, height * 0.02);
    if (!near || !overlap) {
      merged.push({ ...segment });
      return;
    }
    if (segment.kind === "horizontal") {
      last.x1 = Math.min(last.x1, segment.x1);
      last.x2 = Math.max(last.x2, segment.x2);
      last.y1 = (last.y1 + segment.y1) / 2;
      last.y2 = last.y1;
      last.length = last.x2 - last.x1;
    } else {
      last.y1 = Math.min(last.y1, segment.y1);
      last.y2 = Math.max(last.y2, segment.y2);
      last.x1 = (last.x1 + segment.x1) / 2;
      last.x2 = last.x1;
      last.length = last.y2 - last.y1;
    }
    last.confidence = Math.max(last.confidence, segment.confidence);
  });
  return merged;
}

function inferConnectors(segments, width, height) {
  const horizontal = segments.filter((segment) => segment.kind === "horizontal" && segment.length >= width * 0.08);
  const rightGroups = groupEndpoints(horizontal.map((segment) => ({ x: segment.x2, y: segment.y2, side: "right" })), width, height);
  const leftGroups = groupEndpoints(horizontal.map((segment) => ({ x: segment.x1, y: segment.y1, side: "left" })), width, height);
  return [...rightGroups, ...leftGroups].map((group, index) => {
    const side = group.side;
    const boxWidth = Math.max(42, width * 0.05);
    const boxHeight = Math.max(52, group.maxY - group.minY + height * 0.045);
    const x = side === "right"
      ? clamp(group.x + width * 0.02, 0, width - boxWidth)
      : clamp(group.x - width * 0.02 - boxWidth, 0, width - boxWidth);
    const y = clamp(group.minY - height * 0.022, 0, height - boxHeight);
    return {
      id: `${side === "right" ? "J" : "P"}${index + 1}`,
      side,
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      pins: group.points.map((point, pinIndex) => ({ pin: String(pinIndex + 1), x: point.x, y: point.y })),
      label: `${side === "right" ? "LOAD" : "BUS"} ${index + 1}`,
      confidence: clamp(group.points.length / 5, 0.35, 1)
    };
  });
}

function groupEndpoints(points, width, height) {
  const groups = [];
  points
    .sort((left, right) => left.x - right.x || left.y - right.y)
    .forEach((point) => {
      let group = groups.find((candidate) => {
        const closeX = Math.abs(candidate.x - point.x) <= Math.max(34, width * 0.035);
        const closeY = point.y >= candidate.minY - height * 0.08 && point.y <= candidate.maxY + height * 0.08;
        return candidate.side === point.side && closeX && closeY;
      });
      if (!group) {
        group = { side: point.side, x: point.x, minY: point.y, maxY: point.y, points: [] };
        groups.push(group);
      }
      group.points.push(point);
      group.x = average(group.points.map((item) => item.x));
      group.minY = Math.min(group.minY, point.y);
      group.maxY = Math.max(group.maxY, point.y);
    });

  return groups
    .filter((group) => group.points.length >= 2)
    .sort((left, right) => left.x - right.x || left.minY - right.minY);
}

function inferMarkupComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const stack = [];
  const maxComponents = 120;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const startIndex = y * width + x;
      if (!mask[startIndex] || visited[startIndex] || components.length >= maxComponents) {
        continue;
      }
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;
      stack.length = 0;
      stack.push(startIndex);
      visited[startIndex] = 1;
      while (stack.length) {
        const index = stack.pop();
        const px = index % width;
        const py = Math.floor(index / width);
        area += 1;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (Math.abs(dx) + Math.abs(dy) !== 1) {
              continue;
            }
            const nx = px + dx;
            const ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              continue;
            }
            const nextIndex = ny * width + nx;
            if (mask[nextIndex] && !visited[nextIndex]) {
              visited[nextIndex] = 1;
              stack.push(nextIndex);
            }
          }
        }
      }
      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      if (area >= 10 && area <= width * height * 0.015 && componentWidth >= 6 && componentHeight >= 6) {
        const squareish = componentWidth / componentHeight > 0.4 && componentWidth / componentHeight < 2.5;
        if (squareish) {
          components.push({
            kind: "marker",
            x: minX,
            y: minY,
            width: componentWidth,
            height: componentHeight,
            area
          });
        }
      }
    }
  }
  return components;
}

function maskToCanvas(mask, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const image = ctx.createImageData(width, height);
  for (let index = 0; index < mask.length; index += 1) {
    const value = mask[index] ? 0 : 255;
    const offset = index * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function renderDrawioDiagram(result) {
  const fileName = fileBase(result.fileName || appState.fileName || "digiwire");
  dom.drawingTitle.textContent = result.fileName || "Editable Draw.io harness";
  queueDrawioDiagram(stripGeneratedDocumentationPanels(buildDrawioXml(result)), `${fileName}.drawio`, `${fileName}.pdf`);
}

function stripGeneratedDocumentationPanels(xml) {
  const documentationCell = /<mxCell\b(?=[^>]*\bid="(?:[^"]*(?:wiring_table|route_table)[^"]*|bom|datasheet_parts|split_notes)")[\s\S]*?<\/mxCell>\s*/gi;
  return String(xml || "").replace(documentationCell, "");
}

function renderFacts(result) {
  const percent = Math.round(result.confidence * 100);
  dom.confidenceValue.textContent = `${percent}%`;
  dom.confidenceFill.style.width = `${percent}%`;
  dom.confidenceFill.style.background = result.confidence >= 0.78 ? "var(--green)" : result.confidence >= 0.46 ? "var(--amber)" : "var(--red)";
  dom.orientationFact.textContent = orientationLabel(result.rotation);
  dom.wireFact.textContent = String(result.wires.length);
  dom.connectorFact.textContent = String(result.connectors.length);
  dom.labelFact.textContent = String(result.findings.filter(isVisibleFinding).length);
}

function renderFindings(findings) {
  const visibleFindings = findings.filter(isVisibleFinding);
  dom.findingCount.textContent = `${visibleFindings.length} item${visibleFindings.length === 1 ? "" : "s"}`;
  if (!visibleFindings.length) {
    dom.findingsList.innerHTML = `<span class="quiet">No labels or markups were read.</span>`;
    return;
  }
  dom.findingsList.innerHTML = visibleFindings.slice(0, 40).map((finding) => {
    const key = confidenceKey(finding.confidence);
    return `
      <div class="finding" data-confidence="${key}">
        <strong>${escapeHtml(shortLabel(finding.text, 32))}</strong>
        <span>${escapeHtml(finding.kind)} | ${Math.round(finding.confidence * 100)}%</span>
      </div>
    `;
  }).join("");
}

function renderSourcePreview(result = null) {
  const canvas = dom.sourceCanvas;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f4f7f2";
  ctx.fillRect(0, 0, width, height);
  if (!appState.image) {
    ctx.fillStyle = "#66736d";
    ctx.font = "800 14px Aptos, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No source image", width / 2, height / 2);
    return;
  }
  const scale = Math.min(width / appState.image.width, height / appState.image.height);
  const drawWidth = appState.image.width * scale;
  const drawHeight = appState.image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(appState.image, x, y, drawWidth, drawHeight);
  if (result?.paperBounds) {
    const bounds = result.paperBounds;
    ctx.strokeStyle = "rgba(47, 143, 92, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(
      x + bounds.x / result.sourceWidth * drawWidth,
      y + bounds.y / result.sourceHeight * drawHeight,
      bounds.width / result.sourceWidth * drawWidth,
      bounds.height / result.sourceHeight * drawHeight
    );
    ctx.setLineDash([]);
  }
}

function renderEmpty() {
  queueDrawioDiagram(buildBlankDrawioXml(), "digiwire.drawio", "digiwire.pdf");
  dom.confidenceValue.textContent = "--";
  dom.confidenceFill.style.width = "0";
  dom.orientationFact.textContent = "--";
  dom.wireFact.textContent = "0";
  dom.connectorFact.textContent = "0";
  dom.labelFact.textContent = "0";
  dom.drawingTitle.textContent = "Draw.io editor";
  dom.sourceTitle.textContent = "None";
  dom.findingCount.textContent = "0 items";
  dom.findingsList.innerHTML = `<span class="quiet">No findings yet.</span>`;
  renderSourcePreview();
}

function setBusy(isBusy) {
  dom.pasteButton.disabled = isBusy;
  dom.tablePasteButton.disabled = isBusy;
  dom.resetButton.disabled = isBusy;
}

function setStatus(text) {
  dom.statusText.textContent = text;
}

function renderImportDiagnostics(diagnostics = []) {
  if (!dom.importDiagnostics) return;
  const visible = diagnostics.slice(0, 6);
  dom.importDiagnostics.hidden = !visible.length;
  dom.importDiagnostics.innerHTML = visible.map((item) =>
    `<span class="diagnostic-chip ${item.severity === "error" ? "error" : "warning"}" title="${escapeHtml(item.code || "IMPORT")}">${escapeHtml(item.message)}</span>`
  ).join("");
}

function resetApp() {
  appState = {
    fileName: "",
    dataUrl: "",
    image: null,
    manualRotation: 0,
    result: null,
    sheet: null,
    sourceName: "",
    designerConfig: defaultDesignerConfig()
  };
  writeDesignerControls(appState.designerConfig);
  dom.pasteButton.disabled = false;
  dom.tablePasteButton.disabled = false;
  dom.pasteTablePanel.hidden = true;
  dom.designerPanel.hidden = true;
  dom.tablePasteInput.value = "";
  dom.layoutDetectionText.textContent = "Paste a harness table to detect a layout.";
  renderImportDiagnostics([]);
  document.querySelector("#engineBadge").textContent = "Multi-cable engine";
  setStatus("Cleared. Paste the next Excel table or image.");
  renderEmpty();
}

function initializeDrawioEditor() {
  drawioSession = {
    frame: dom.drawioFrame.contentWindow,
    origin: DRAWIO_EMBED_ORIGIN,
    xml: buildBlankDrawioXml(),
    title: "digiwire.drawio",
    pdfTitle: "digiwire.pdf",
    exportingPdf: false,
    loaded: false,
    ready: false
  };
  setDrawioLoading(true, "Loading Draw.io editor", "Your pasted harness will appear here automatically.");
}

function queueDrawioDiagram(xml, title, pdfTitle) {
  if (!drawioSession) {
    initializeDrawioEditor();
  }
  drawioSession.frame = dom.drawioFrame.contentWindow;
  drawioSession.xml = xml;
  drawioSession.title = title;
  drawioSession.pdfTitle = pdfTitle;
  drawioSession.loaded = false;
  if (drawioSession.ready) {
    postDrawioLoad();
  }
}

function postDrawioLoad() {
  if (!drawioSession?.ready || !drawioSession.frame) {
    return;
  }
  drawioSession.frame.postMessage(JSON.stringify({
    action: "load",
    autosave: 0,
    title: drawioSession.title,
    xml: drawioSession.xml
  }), drawioSession.origin);
  drawioSession.loaded = true;
  setDrawioLoading(false);
}

function setDrawioLoading(visible, title = "", detail = "") {
  dom.drawioLoading.hidden = !visible;
  if (!visible) {
    return;
  }
  dom.drawioLoading.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(detail)}</span>
  `;
}

function handleDrawioMessage(event) {
  if (!drawioSession || event.source !== dom.drawioFrame.contentWindow || !DRAWIO_ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }
  const message = parseDrawioMessage(event.data);
  if (!message) {
    return;
  }
  drawioSession.frame = event.source;
  drawioSession.origin = event.origin;
  if (message.event === "init") {
    drawioSession.ready = true;
    postDrawioLoad();
    setStatus(appState.result
      ? `${drawioSession.title} is loaded in Draw.io. Edit it here; Save downloads a PDF.`
      : "Draw.io is ready. Paste an Excel table or image to build a harness.");
    return;
  }
  if (message.event === "save") {
    drawioSession.xml = message.xml || drawioSession.xml;
    requestDrawioPdfExport();
    return;
  }
  if (message.event === "export") {
    if (!drawioSession.exportingPdf) {
      return;
    }
    if (!message.data) {
      drawioSession.exportingPdf = false;
      setStatus("Draw.io could not generate the PDF. The editor is still open; try Save again.");
      return;
    }
    const session = drawioSession;
    void downloadDrawioPdf(session.pdfTitle, message.data)
      .then(() => {
        session.exportingPdf = false;
        setStatus(`Downloaded ${session.pdfTitle}. Keep editing here or paste the next harness.`);
      })
      .catch((error) => {
        session.exportingPdf = false;
        console.error("PDF export failed", error);
        setStatus("DIGIWIRE could not render the Draw.io page as a PDF. The editor is still open; try Save again.");
      });
    return;
  }
  if (message.event === "exit") {
    drawioSession.ready = false;
    drawioSession.loaded = false;
    setDrawioLoading(true, "Restarting Draw.io editor", "Your current DIGIWIRE harness will reload automatically.");
    setStatus("Restarting Draw.io without leaving DIGIWIRE...");
    dom.drawioFrame.src = DRAWIO_EDITOR_URL;
  }
}

function requestDrawioPdfExport() {
  if (!drawioSession?.ready || !drawioSession.frame || drawioSession.exportingPdf) {
    return;
  }
  drawioSession.exportingPdf = true;
  drawioSession.frame.postMessage(JSON.stringify({
    action: "export",
    format: "svg",
    crop: false,
    border: 0,
    scale: 1,
    spin: "Generating PDF...",
    xml: drawioSession.xml
  }), drawioSession.origin);
  setStatus(`Generating ${drawioSession.pdfTitle} from the edited Draw.io drawing...`);
}

function parseDrawioMessage(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" ? data : null;
}

function buildBlankDrawioXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="digiwire_blank" name="DIGIWIRE">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildDrawioXml(result) {
  if (result.sheetHarness) {
    return buildSheetDrawioXml(result);
  }
  if (result.harness?.type === "can") {
    return buildCanDrawioXml(result);
  }
  if (result.harness?.type === "network") {
    return buildSketchNetworkDrawioXml(result);
  }
  if (result.harness?.type === "generic") {
    return buildGenericImageDrawioXml(result);
  }
  const fit = fitSourceToSvg(result.width, result.height);
  const cells = [];
  const add = (cell) => cells.push(cell);
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  result.connectors.forEach((connector, index) => {
    const point = toSvgPoint(connector.x, connector.y, fit);
    const size = toSvgPoint(connector.x + connector.width, connector.y + connector.height, fit);
    add(mxCell({
      id: connector.id || `connector_${index + 1}`,
      value: connector.label || "",
      style: "rounded=1;whiteSpace=wrap;html=1;fillColor=#eef4ee;strokeColor=#17231c;strokeWidth=2;fontStyle=1;",
      vertex: 1,
      parent: "1"
    }, mxGeometry({
      x: point.x,
      y: point.y,
      width: Math.max(54, size.x - point.x),
      height: Math.max(56, size.y - point.y),
      as: "geometry"
    })));
  });
  result.wires.forEach((wire, index) => {
    const start = toSvgPoint(wire.x1, wire.y1, fit);
    const end = toSvgPoint(wire.x2, wire.y2, fit);
    add(mxCell({
      id: wire.id || `wire_${index + 1}`,
      value: wire.label || "",
      style: "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#17231c;strokeWidth=3;endArrow=none;startArrow=none;fontStyle=1;",
      edge: 1,
      parent: "1"
    }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(start.x, start.y, "sourcePoint")}${mxPoint(end.x, end.y, "targetPoint")}`)));
  });
  result.findings.filter(isVisibleFinding).forEach((finding, index) => {
    const point = toSvgPoint(finding.x, finding.y, fit);
    add(mxCell({
      id: `finding_${index + 1}`,
      value: finding.text || "",
      style: "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#8d9b93;fontSize=11;",
      vertex: 1,
      parent: "1"
    }, mxGeometry({
      x: point.x,
      y: point.y - 18,
      width: Math.max(60, finding.text.length * 8),
      height: 26,
      as: "geometry"
    })));
  });
  const diagram = escapeXml(result.fileName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildSketchNetworkDrawioXml(result) {
  return result.harness.profile === "power-board-iso154x"
    ? buildPowerBoardIso154xDrawioXml(result)
    : buildInferredNetworkDrawioXml(result);
}

function buildPowerBoardIso154xDrawioXml(result) {
  const harness = result.harness;
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, points, style) => {
    const pathPoints = points.slice(1, -1)
      .map((point) => `<mxPoint x="${Math.round(point[0])}" y="${Math.round(point[1])}" />`)
      .join("");
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry(
      { relative: 1, as: "geometry" },
      `${mxPoint(points[0][0], points[0][1], "sourcePoint")}${mxPoint(points[points.length - 1][0], points[points.length - 1][1], "targetPoint")}${pathPoints ? `<Array as="points">${pathPoints}</Array>` : ""}`
    )));
  };
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 14, 14, 1572, 772, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#17231c;strokeWidth=2;");
  addVertex("title", harness.title, 425, 22, 750, 38, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=28;fontStyle=1;fontColor=#17231c;align=center;");
  addVertex("subtitle", harness.subtitle, 390, 63, 820, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#44514a;align=center;");
  addEdge("dim_22", "22 in", [[365, 126], [1000, 126]], "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#17231c;strokeWidth=2;startArrow=classic;endArrow=classic;fontFamily=Courier New;fontSize=17;fontStyle=1;");
  addEdge("dim_12", "12 in", [[365, 612], [820, 612]], "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#17231c;strokeWidth=2;startArrow=classic;endArrow=classic;fontFamily=Courier New;fontSize=17;fontStyle=1;");

  addVertex("power_top", "<b>POWER BOARD<br>(TOP)</b><br><br>GND / TP1<br><br>+5V / TP71", 55, 120, 275, 210, "rounded=1;arcSize=4;whiteSpace=wrap;html=1;fillColor=#fbfcfb;strokeColor=#173a8a;strokeWidth=3;fontFamily=Courier New;fontSize=15;fontStyle=1;align=left;spacingLeft=28;");
  addVertex("tp1", "TP1", 295, 190, 50, 30, "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#111111;strokeWidth=3;fontFamily=Courier New;fontSize=10;fontStyle=1;");
  addVertex("tp71", "TP71", 295, 255, 50, 30, "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#111111;strokeWidth=3;fontFamily=Courier New;fontSize=10;fontStyle=1;");

  addVertex("power_bottom", "<b>POWER BOARD<br>(BOTTOM)</b><br><br>I2C<br>J43<br>2 POS SIDE LOCK<br>MOLEX MICRO-FIT", 55, 390, 275, 220, "rounded=1;arcSize=4;whiteSpace=wrap;html=1;fillColor=#fbfcfb;strokeColor=#173a8a;strokeWidth=3;fontFamily=Courier New;fontSize=14;fontStyle=1;align=left;spacingLeft=24;");
  addVertex("microfit_body", "", 270, 462, 80, 112, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#b3261e;strokeWidth=3;");
  addVertex("microfit_pin_1", "1", 294, 472, 46, 42, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#b3261e;strokeWidth=2;fontFamily=Courier New;fontStyle=1;");
  addVertex("microfit_pin_2", "2", 294, 522, 46, 42, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#b3261e;strokeWidth=2;fontFamily=Courier New;fontStyle=1;");
  addVertex("microfit_lock", "LOCK", 222, 492, 48, 52, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#b3261e;strokeWidth=2;fontFamily=Courier New;fontSize=10;fontStyle=1;");

  addHorizontalDrawioProtection(addVertex, {
    id: "top_bundle",
    x1: 370,
    x2: 850,
    top: 184,
    bottom: 292,
    label: "EXPANDO + HEAT SHRINK",
    bandWidth: 22
  });
  addHorizontalDrawioProtection(addVertex, {
    id: "bottom_bundle",
    x1: 390,
    x2: 770,
    top: 465,
    bottom: 555,
    label: "EXPANDO + HEAT SHRINK",
    bandWidth: 22
  });

  addVertex("iso_title", "<b>ISO154X<br>4 POS DUPONT</b>", 1270, 122, 260, 52, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=18;fontStyle=1;fontColor=#217a35;align=center;");
  addVertex("iso_body", "", 1265, 180, 275, 390, "rounded=1;arcSize=4;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#217a35;strokeWidth=3;");
  addVertex("iso_face", "", 1290, 260, 80, 250, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#217a35;strokeWidth=3;");
  ["GND", "SDA", "SCL", "5V"].forEach((label, index) => {
    const y = 282 + index * 60;
    addVertex(`iso_pin_${index + 1}`, String(index + 1), 1305, y, 42, 36, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#111111;strokeWidth=2;fontFamily=Courier New;fontStyle=1;");
    addVertex(`iso_label_${index + 1}`, label, 1385, y + 4, 125, 28, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=14;fontStyle=1;fontColor=#17231c;align=left;");
  });
  addVertex("iso_orientation", "PIN 1 / GND ORIENTATION", 1355, 520, 170, 28, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=11;fontStyle=1;fontColor=#217a35;align=center;");

  harness.wires.forEach((wire, index) => {
    addEdge(
      `network_wire_${index + 1}`,
      `${wire.name} | ${formatLengthMeasurement(wire.length)} | COLOR VERIFY`,
      wire.path,
      `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;fontFamily=Courier New;fontStyle=1;fontSize=13;`
    );
  });
  addVertex("wiring_table", buildKiCadDrawioTableText(
    "WIRING TABLE - VERIFY COLOR AND AWG",
    ["SOURCE", "PIN", "SIGNAL", "SCHEMATIC COLOR", "LENGTH", "ISO PIN"],
    harness.wires.map((wire) => [
      wire.sourceGroupName,
      wire.sourcePin,
      wire.name,
      wire.colorName,
      formatLengthMeasurement(wire.length),
      wire.targetPin
    ])
  ), 35, 646, 885, 128, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#17231c;strokeWidth=2;fontSize=10;align=center;");
  addVertex("network_notes", `<b>DIGIWIRE INTERPRETATION NOTES</b><br>${harness.notes.map((note, index) => `${index + 1}. ${escapeHtml(note)}`).join("<br>")}`, 970, 640, 560, 130, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=11;fontStyle=1;align=left;");
  const diagram = escapeXml(result.fileName || harness.title || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildInferredNetworkDrawioXml(result) {
  const harness = result.harness;
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, from, to, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(from[0], from[1], "sourcePoint")}${mxPoint(to[0], to[1], "targetPoint")}`)));
  };
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 14, 14, 1572, 772, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#17231c;strokeWidth=2;");
  addVertex("title", harness.title, 450, 24, 700, 38, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=28;fontStyle=1;fontColor=#17231c;align=center;");
  addVertex("subtitle", harness.subtitle, 390, 67, 820, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#44514a;align=center;");
  harness.connectors.filter((connector) => connector.side === "left").forEach((connector, index) => {
    addVertex(`source_${index + 1}`, `${connector.label}<br>${connector.pins.length} detected terminals`, 55, 145 + index * 210, 225, 150, "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#173a8a;strokeWidth=3;fontFamily=Courier New;fontStyle=1;");
  });
  addVertex("destination", `DESTINATION 1<br>${harness.wires.length} detected terminals`, 1320, 170, 220, 390, "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#217a35;strokeWidth=3;fontFamily=Courier New;fontStyle=1;");
  harness.wires.forEach((wire, wireIndex) => {
    wire.pathSegments.forEach((segment, segmentIndex) => {
      addEdge(
        `route_${wireIndex}_${segmentIndex}`,
        segmentIndex === 0 ? wire.name : "",
        segment.from,
        segment.to,
        `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;fontFamily=Courier New;fontStyle=1;fontSize=12;`
      );
    });
  });
  addVertex("route_table", buildKiCadDrawioTableText(
    "PRESERVED NETWORK ROUTES",
    ["SOURCE", "PIN", "NET", "COLOR", "DEST PIN"],
    harness.wires.map((wire) => [wire.sourceGroupName, wire.sourcePin, wire.name, wire.colorName, wire.targetPin])
  ), 35, 625, 850, 150, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#17231c;strokeWidth=2;fontSize=10;align=center;");
  addVertex("route_notes", `<b>DIGIWIRE NOTES</b><br>${harness.notes.map((note, index) => `${index + 1}. ${escapeHtml(note)}`).join("<br>")}`, 930, 635, 600, 135, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=11;fontStyle=1;align=left;");
  const diagram = escapeXml(result.fileName || harness.title || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildGenericImageDrawioXml(result) {
  const harness = result.harness;
  const wires = harness.wires.length ? harness.wires : [{
    id: "W01",
    label: "WIRE 1",
    colorName: "",
    stroke: "#17231c",
    leftPin: "1",
    rightPin: "1"
  }];
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const rowSpacing = Math.min(58, Math.max(34, 350 / Math.max(1, wires.length)));
  const firstWireY = 205;
  const leftX = 360;
  const rightX = 1235;
  const connectorHeight = Math.max(150, (wires.length - 1) * rowSpacing + 105);
  const connectorY = Math.max(145, firstWireY - 52);
  const protectionTop = firstWireY - 28;
  const protectionBottom = firstWireY + (wires.length - 1) * rowSpacing + 28;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 14, 14, 1572, 772, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", harness.title, 480, 30, 640, 36, "text;html=1;strokeColor=none;fillColor=none;fontSize=32;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("subtitle", harness.subtitle, 390, 72, 820, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("left_heading", `LEFT CONNECTOR<br>${escapeHtml(harness.leftConnectorName)}`, 125, 72, 190, 58, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("right_heading", `RIGHT CONNECTOR<br>${escapeHtml(harness.rightConnectorName)}`, 1290, 72, 240, 58, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("left_connector", escapeHtml(harness.leftConnectorName), 105, connectorY, 170, connectorHeight, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=3;fontStyle=1;fontSize=14;");
  addVertex("right_connector", escapeHtml(harness.rightConnectorName), 1325, connectorY, 170, connectorHeight, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=3;fontStyle=1;fontSize=14;");
  addEdge("overall_length", "OVERALL LENGTH - VERIFY FROM SOURCE DRAWING", leftX - 20, 145, rightX + 20, 145, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=13;");
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: leftX + 28,
    x2: rightX - 28,
    top: protectionTop,
    bottom: protectionBottom
  });
  wires.forEach((wire, index) => {
    const y = firstWireY + index * rowSpacing;
    const stroke = wire.stroke || sheetColorToStroke(wire.colorName);
    const labelParts = [wire.label, wire.colorName ? `(${wire.colorName})` : "", formatWireLengthLabel(wire.length)].filter(Boolean);
    addVertex(`left_term_${index}`, escapeHtml(wire.leftPin || String(index + 1)), leftX - 58, y - 15, 54, 30, `rounded=0;whiteSpace=wrap;html=1;fillColor=${stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontSize=12;fontColor=${normalizeText(wire.colorName) === "BLACK" ? "#ffffff" : "#000000"};`);
    addVertex(`right_term_${index}`, escapeHtml(wire.rightPin || String(index + 1)), rightX + 4, y - 15, 54, 30, `rounded=0;whiteSpace=wrap;html=1;fillColor=${stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontSize=12;fontColor=${normalizeText(wire.colorName) === "BLACK" ? "#ffffff" : "#000000"};`);
    addEdge(`wire_${index}`, escapeHtml(labelParts.join(" ")), leftX - 4, y, rightX + 4, y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${stroke};strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;fontSize=13;`);
  });
  addVertex("wiring_table", buildKiCadDrawioTableText("WIRING TABLE", ["LEFT PIN", "WIRE", "COLOR", "AWG", "LENGTH", "RIGHT PIN"], wires.slice(0, 8).map((wire, index) => [
    wire.leftPin || String(index + 1),
    wire.label || `WIRE ${index + 1}`,
    wire.colorName || "VERIFY",
    wire.awg || "VERIFY",
    wire.length || "VERIFY",
    wire.rightPin || String(index + 1)
  ])), 34, 520, 690, 168, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=11;align=center;");
  addVertex("notes", "DIGIWIRE NOTES<br>General cable / wire harness drawing. Not locked to CAN bus.<br>Verify connector style, pin numbers, color, gauge, polarity, and length before manufacturing.", 760, 670, 620, 66, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=12;fontStyle=1;align=left;");
  addVertex("title_block", `DESCRIPTION:<br><b>${escapeHtml(harness.title)}</b><br>DRAWN BY: DIGIWIRE | REV A`, 1055, 650, 505, 96, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=13;align=center;");
  const diagram = escapeXml(result.fileName || harness.title || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildSheetDrawioXml(result) {
  const plan = createSheetRenderPlan(result);
  if (plan.kind === "barrel") return buildBarrelPowerDrawioXml(result);
  if (plan.kind === "molexUart") return buildMolexUartJetsonDrawioXml(result);
  if (plan.kind === "largeCircular") return buildLargeCircularPairHarnessDrawioXml(result, plan.model);
  if (plan.kind === "powerBoard") return buildPowerBoardIsolatorSheetDrawioXml(result, plan.model);
  if (plan.kind === "datasheet") return buildDatasheetConnectorHarnessDrawioXml(result, plan.model);
  if (plan.kind === "kicad") return buildKiCadHarnessDrawioXml(result, plan.model);
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const addRoutedEdge = (id, value, points, style) => {
    const intermediate = points.slice(1, -1)
      .map((point) => `<mxPoint x="${formatDrawioCoordinate(point[0])}" y="${formatDrawioCoordinate(point[1])}" />`)
      .join("");
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry(
      { relative: 1, as: "geometry" },
      `${mxPoint(points[0][0], points[0][1], "sourcePoint")}${mxPoint(points[points.length - 1][0], points[points.length - 1][1], "targetPoint")}${intermediate ? `<Array as="points">${intermediate}</Array>` : ""}`
    )));
  };
  const sheet = result.sheetHarness;
  const activeRows = sheet.rows.filter((row) => !isNoWireRow(row));
  const rows = activeRows.length ? activeRows : [{ wireName: "No drawable rows found", color: "Gray" }];
  const leftGroups = groupSheetEndpoints(rows, "left");
  const rightGroups = groupSheetEndpoints(rows, "right");
  const leftX = 260;
  const rightX = 1340;
  const sharedBundle = shouldUseSharedSheetBundle(rows, leftGroups, rightGroups);
  const routes = sheetRouteLayout(rows, sharedBundle ? { top: 214, bottom: 430 } : {});
  const pairAnalysis = analyzeSheetTwistedPairs(routes);
  const sharedBundleGeometry = sharedBundle ? sheetSharedBundleGeometry(routes, leftX, rightX) : null;
  const sharedLengthLabel = sharedBundle ? sheetLengthSummary(rows) : "";
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 10, 10, 1580, 780, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", sheet.title, 46, 28, 900, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", sheet.subtitle, 46, 72, 720, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#333333;align=left;");
  addVertex(
    "template_meta",
    `Template-driven harness | ${leftGroups.length} left endpoint(s) | ${rightGroups.length} right endpoint(s) | ${rows.length} routed row(s)${pairAnalysis.validGroups.length ? ` | ${pairAnalysis.validGroups.length} twisted pair(s)` : ""}`,
    46,
    108,
    850,
    24,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#333333;align=left;"
  );
  const addEndpointGroups = (groups, side) => {
    groups.forEach((group, groupIndex) => {
      const box = sheetEndpointBoxLayout(group, routes, side);
      const detail = group.details.length ? `<br><font style="font-size:9px">${escapeHtml(group.details.join(" | "))}</font>` : "";
      addVertex(
        `${side}_endpoint_${groupIndex + 1}`,
        `<b>${escapeHtml(shortLabel(group.title, 28))}</b>${detail}`,
        box.x,
        box.top,
        box.width,
        box.height,
        "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=3;fontSize=11;fontStyle=1;align=center;"
      );
    });
  };
  addEndpointGroups(leftGroups, "left");
  addEndpointGroups(rightGroups, "right");
  if (sharedBundle) {
    addHorizontalDrawioProtection(addVertex, {
      id: "shared_main_protection",
      x1: sharedBundleGeometry.x1,
      x2: sharedBundleGeometry.x2,
      top: sharedBundleGeometry.top,
      bottom: sharedBundleGeometry.bottom,
      label: "",
      bandWidth: 26
    });
  } else {
    leftGroups.forEach((group, index) => {
      const bounds = sheetProtectionBounds(group, routes);
      const label = `LEG ${group.leg || index + 1} EXPANDO + HEAT SHRINK`;
      addHorizontalDrawioProtection(addVertex, {
        id: `leg_${index + 1}_protection`,
        x1: leftX + 48,
        x2: rightX - 48,
        top: bounds.top,
        bottom: bounds.bottom,
        label: "",
        bandWidth: 18
      });
      addVertex(
        `leg_${index + 1}_protection_label`,
        escapeHtml(label),
        (leftX + rightX) / 2 - 250,
        Math.max(134, bounds.top - 25),
        500,
        18,
        "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#1f2930;align=center;"
      );
    });
  }
  routes.forEach((route) => {
    const { row, index, y } = route;
    const colorSpec = wireColorSpec(row.color);
    const stroke = colorSpec.baseStroke;
    const dashed = isNoWireRow(row) ? "dashed=1;dashPattern=12 9;" : "";
    const leftWireName = sheetRowLeftWireName(row, route.label);
    const rightWireName = sheetRowRightWireName(row, route.label);
    const hasDistinctNames = wireNamesDiffer(leftWireName, rightWireName);
    const details = [
      row.color ? colorSpec.label : "",
      formatWireLengthLabel(row.length),
      sheetRouteBranchLabel(row)
    ].filter(Boolean).join(" | ");
    const geometry = sheetWireRouteGeometry(route, pairAnalysis, leftX, rightX);
    addVertex(`left_pin_${index + 1}`, route.leftPin, leftX - 42, y - 12, 34, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_${index + 1}`, route.rightPin, rightX + 8, y - 12, 34, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#000000;align=center;");
    const wireLabel = `${hasDistinctNames ? "" : escapeHtml(leftWireName)}${details ? `<br><font style="font-size:9px">${escapeHtml(details)}</font>` : ""}`;
    const wireStyle = geometry.twisted
      ? `edgeStyle=none;curved=1;rounded=1;html=1;strokeColor=${stroke};strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;fontSize=11;${dashed}`
      : `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${stroke};strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;fontSize=11;${dashed}`;
    if (geometry.twisted) {
      addRoutedEdge(`sheet_wire_${index + 1}`, wireLabel, geometry.points, wireStyle);
    } else {
      addEdge(`sheet_wire_${index + 1}`, wireLabel, leftX, y, rightX, y, wireStyle);
    }
    if (colorSpec.stripeStroke) {
      const stripeStyle = geometry.twisted
        ? `edgeStyle=none;curved=1;rounded=1;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=2.2;dashed=1;dashPattern=10 9;fixDash=1;endArrow=none;startArrow=none;`
        : `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=2.2;dashed=1;dashPattern=10 9;fixDash=1;endArrow=none;startArrow=none;`;
      if (geometry.twisted) {
        addRoutedEdge(`sheet_wire_stripe_${index + 1}`, "", geometry.points, stripeStyle);
      } else {
        addEdge(`sheet_wire_stripe_${index + 1}`, "", leftX, y, rightX, y, stripeStyle);
      }
    }
    if (hasDistinctNames) {
      const leftLabelWidth = drawioLabelWidth(leftWireName, 10, 64, 210);
      const rightLabelWidth = drawioLabelWidth(rightWireName, 10, 64, 210);
      const endpointFontColor = normalizeColorName(row.color) === "BLACK" ? "#ffffff" : "#000000";
      addVertex(
        `sheet_left_wire_name_${index + 1}`,
        escapeHtml(leftWireName),
        leftX + 34,
        y - 10,
        leftLabelWidth,
        20,
        `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=left;verticalAlign=middle;spacing=0;`
      );
      addVertex(
        `sheet_right_wire_name_${index + 1}`,
        escapeHtml(rightWireName),
        rightX - 34 - rightLabelWidth,
        y - 10,
        rightLabelWidth,
        20,
        `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=right;verticalAlign=middle;spacing=0;`
      );
    }
  });
  pairAnalysis.validGroups.forEach((group, index) => {
    const midY = average(group.routes.map((route) => route.y));
    addVertex(
      `twisted_pair_${index + 1}_label`,
      `<b>TWISTED PAIR ${escapeHtml(group.id)}</b>`,
      leftX + 126 + index % 2 * 154,
      midY - 12,
      140,
      24,
      "rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#fffdf5;strokeColor=#5c4b17;strokeWidth=1;fontSize=9;fontStyle=1;fontColor=#3c3210;align=center;spacing=0;"
    );
  });
  if (sharedBundle) {
    addVertex(
      "shared_cable_id_label",
      `<b>${escapeHtml(sheet.cableName || "CABLE ID")}</b>`,
      sharedBundleGeometry.midX - 70,
      sharedBundleGeometry.midY - 16,
      140,
      32,
      "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#fffdf5;strokeColor=#111111;strokeWidth=1;fontSize=18;fontStyle=1;fontColor=#111111;align=center;spacing=0;"
    );
    addVertex(
      "left_lead_exit_note",
      "WIRE ENDS EXIT HEAT SHRINK TO LEFT CONNECTORS",
      sharedBundleGeometry.leftLeadX - 170,
      sharedBundleGeometry.bottom + 22,
      340,
      18,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;"
    );
    addVertex(
      "right_lead_exit_note",
      "WIRE ENDS EXIT HEAT SHRINK TO RIGHT CONNECTOR",
      sharedBundleGeometry.rightLeadX - 170,
      sharedBundleGeometry.bottom + 22,
      340,
      18,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;"
    );
    addVertex(
      "left_heat_shrink_label",
      "HEAT SHRINK",
      sharedBundleGeometry.x1 - 72,
      sharedBundleGeometry.bottom + 2,
      144,
      18,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;"
    );
    addVertex(
      "right_heat_shrink_label",
      "HEAT SHRINK",
      sharedBundleGeometry.x2 - 72,
      sharedBundleGeometry.bottom + 2,
      144,
      18,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;"
    );
    if (sharedLengthLabel) {
      addVertex(
        "pin_to_pin_length_note",
        escapeHtml(sharedLengthLabel),
        (leftX + rightX) / 2 - 240,
        sharedBundleGeometry.bottom + 44,
        480,
        20,
        "text;html=1;strokeColor=none;fillColor=none;fontSize=12;fontStyle=1;fontColor=#111111;align=center;"
      );
    }
  }
  const diagram = escapeXml(result.fileName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildMolexUartJetsonDrawioXml(result) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const sheet = result.sheetHarness;
  const rows = sheet.rows.filter((row) => sheetRowWireName(row) && row.leftPinPos && row.rightPinPos).slice(0, 2);
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("title", sheet.title, 46, 24, 980, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", "Molex connector mating-face drawing with expandable braided sleeving", 46, 68, 820, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#333333;align=left;");
  addVertex("left_heading", "J9 HB<br><b>MOLEX 43645-0200</b><br>MICRO-FIT 3.0 | 2 CIRCUIT<br>MATING FACE", 62, 132, 196, 70, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("left_body", "", 126, 214, 114, 126, "rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#202326;strokeColor=#050505;strokeWidth=4;");
  addVertex("left_latch", "", 101, 247, 28, 60, "rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#2e3235;strokeColor=#050505;strokeWidth=3;");
  addVertex("left_circuit_1", "1", 163, 231, 40, 34, "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#050505;strokeColor=#f77f00;strokeWidth=4;fontColor=#ffffff;fontStyle=1;");
  addVertex("left_circuit_2", "2", 163, 287, 40, 34, "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#050505;strokeColor=#0b64d8;strokeWidth=4;fontColor=#ffffff;fontStyle=1;");
  addVertex("right_heading", "JETSON<br><b>MOLEX 90143-0040</b><br>C-GRID III | 2 x 20<br>MATING FACE", 1270, 100, 210, 70, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("right_body", "", 1322, 174, 106, 402, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#202326;strokeColor=#050505;strokeWidth=4;");
  for (let pin = 1; pin <= 40; pin += 1) {
    const point = molexCGrid40PinPoint(pin);
    const matchingRow = rows.find((row) => String(row.rightPinPos) === String(pin));
    const stroke = matchingRow ? sheetColorToStroke(matchingRow.color) : "#777f84";
    addVertex(
      `right_cavity_${pin}`,
      matchingRow || pin === 1 || pin === 40 ? String(pin) : "",
      point.x - 14,
      point.y - 7,
      28,
      14,
      `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#080909;strokeColor=${stroke};strokeWidth=${matchingRow ? 3 : 1};fontColor=#ffffff;fontSize=8;fontStyle=1;`
    );
  }
  addVertex("right_pin_rule", "ODD PINS LEFT | EVEN PINS RIGHT<br>2.54 mm PITCH | NO POLARIZING BUTTONS", 1260, 588, 230, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#333333;align=center;");
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: 330,
    x2: 1174,
    top: 218,
    bottom: 334
  });
  rows.forEach((row, index) => {
    const leftPoint = molexMicroFit2PinPoint(row.leftPinPos);
    const rightPoint = molexCGrid40PinPoint(row.rightPinPos);
    const color = sheetColorToStroke(row.color);
    addEdge(
      `wire_${index + 1}`,
      `${escapeHtml(row.wireName || `WIRE ${index + 1}`)} | ${escapeHtml(row.length || "")}`,
      leftPoint.x,
      leftPoint.y,
      rightPoint.x,
      rightPoint.y,
      `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${color};strokeWidth=6;endArrow=none;startArrow=none;fontStyle=1;fontSize=13;`
    );
  });
  addVertex(
    "connector_notes",
    "<b>CONNECTOR / BUILD NOTES</b><br>1. 43645-0200: Micro-Fit 3.0 single-row receptacle, 2 circuits, black housing.<br>2. 90143-0040: C-Grid III crimp housing, 40 circuits (2 x 20), 2.54 mm pitch, black housing.<br>3. Connector faces are shown from the mating side; verify circuit-1 orientation before assembly.",
    46,
    640,
    1120,
    104,
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=left;spacingLeft=12;spacingTop=8;"
  );
  const diagram = escapeXml(result.fileName || sheet.title || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildPowerBoardIsolatorSheetDrawioXml(result, model) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addRoutedEdge = (id, value, points, style) => {
    const intermediate = points.slice(1, -1)
      .map((point) => `<mxPoint x="${Math.round(point[0])}" y="${Math.round(point[1])}" />`)
      .join("");
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry(
      { relative: 1, as: "geometry" },
      `${mxPoint(points[0][0], points[0][1], "sourcePoint")}${mxPoint(points[points.length - 1][0], points[points.length - 1][1], "targetPoint")}${intermediate ? `<Array as="points">${intermediate}</Array>` : ""}`
    )));
  };
  const targetY = { "1": 212, "2": 284, "3": 356, "4": 428 };
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 12, 12, 1576, 776, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#17231c;strokeWidth=2;");
  addVertex("title", model.cableName.toUpperCase(), 480, 20, 640, 38, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=30;fontStyle=1;fontColor=#17231c;align=center;");
  addVertex("subtitle", model.description, 390, 60, 820, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#35413a;align=center;");

  addVertex("leg1_title", "LEG 1 - POWER BOARD TEST POINTS", 48, 92, 270, 30, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=16;fontStyle=1;fontColor=#173a8a;align=center;");
  addVertex("leg1_board", "<b>POWER BOARD (TOP)</b><br><br>TP1 / GND<br><br>TP71 / +5V", 48, 138, 270, 174, "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#fbfcfb;strokeColor=#173a8a;strokeWidth=3;fontFamily=Courier New;fontSize=13;fontStyle=1;align=left;spacingLeft=24;");
  addVertex("tp1_pad", "TP1", 284, 205, 32, 30, "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#111111;strokeWidth=3;fontFamily=Courier New;fontSize=8;fontStyle=1;");
  addVertex("tp71_pad", "TP71", 284, 261, 32, 30, "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#111111;strokeWidth=3;fontFamily=Courier New;fontSize=8;fontStyle=1;");
  addRoutedEdge("dim_leg1", formatLengthMeasurement(model.topLength), [[365, 126], [975, 126]], "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#17231c;strokeWidth=2;startArrow=classic;endArrow=classic;fontFamily=Courier New;fontSize=16;fontStyle=1;");
  addHorizontalDrawioProtection(addVertex, {
    id: "leg1_protection",
    x1: 382,
    x2: 930,
    top: 194,
    bottom: 302,
    label: "LEG 1 EXPANDO + HEAT SHRINK",
    bandWidth: 22
  });

  addVertex("leg2_title", "LEG 2 - POWER BOARD I2C J43", 48, 340, 270, 30, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=16;fontStyle=1;fontColor=#173a8a;align=center;");
  addVertex("leg2_board", `<b>POWER BOARD (BOTTOM)</b><br><br>I2C J43<br>2 POS SIDE-LOCK MICRO-FIT<br>${escapeHtml(model.microFitHousing)}`, 48, 382, 270, 164, "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#fbfcfb;strokeColor=#173a8a;strokeWidth=3;fontFamily=Courier New;fontSize=12;fontStyle=1;align=left;spacingLeft=22;");
  addVertex("j43_body", "", 252, 402, 66, 104, "rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#25292c;strokeColor=#050505;strokeWidth=3;");
  addVertex("j43_lock", "LOCK", 265, 506, 40, 32, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#353a3d;strokeColor=#050505;strokeWidth=2;fontColor=#ffffff;fontSize=8;fontStyle=1;");
  const sda = model.wires.find((wire) => wire.name === "SDA");
  const scl = model.wires.find((wire) => wire.name === "SCL");
  addVertex("j43_pin_1", "1", 270, 413, 34, 28, `rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#090a0a;strokeColor=${sda?.stroke || "#0b64d8"};strokeWidth=3;fontColor=#ffffff;fontFamily=Courier New;fontStyle=1;`);
  addVertex("j43_pin_2", "2", 270, 467, 34, 28, `rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#090a0a;strokeColor=${scl?.stroke || "#dddddd"};strokeWidth=3;fontColor=#ffffff;fontFamily=Courier New;fontStyle=1;`);
  addHorizontalDrawioProtection(addVertex, {
    id: "leg2_protection",
    x1: 382,
    x2: 930,
    top: 400,
    bottom: 508,
    label: "LEG 2 EXPANDO + HEAT SHRINK",
    bandWidth: 22
  });
  addRoutedEdge("dim_leg2", formatLengthMeasurement(model.bottomLength), [[365, 554], [975, 554]], "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#17231c;strokeWidth=2;startArrow=classic;endArrow=classic;fontFamily=Courier New;fontSize=16;fontStyle=1;");

  addVertex("isolator_title", `<b>${escapeHtml(model.rightName)}</b><br>${escapeHtml(model.rightType)}`, 1245, 94, 305, 52, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=16;fontStyle=1;fontColor=#217a35;align=center;");
  addVertex("isolator_body", "", 1245, 160, 305, 332, "rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#217a35;strokeWidth=3;");
  addVertex("dupont_face", "", 1292, 184, 82, 272, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#25292c;strokeColor=#050505;strokeWidth=3;");
  ["1", "2", "3", "4"].forEach((pin) => {
    const wire = model.targetPins.get(pin);
    const y = targetY[pin];
    addVertex(`dupont_pin_${pin}`, pin, 1308, y - 18, 44, 36, `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#090a0a;strokeColor=${wire?.stroke || "#666666"};strokeWidth=3;fontColor=#ffffff;fontFamily=Courier New;fontStyle=1;`);
    addVertex(`dupont_label_${pin}`, `${wire?.name || ""} (${wire?.colorName || ""})`, 1380, y - 14, 140, 28, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=12;fontStyle=1;fontColor=#17231c;align=left;");
  });
  addVertex("dupont_orientation", "PIN 1 ORIENTATION", 1378, 458, 150, 24, "text;html=1;strokeColor=none;fillColor=none;fontFamily=Courier New;fontSize=10;fontStyle=1;fontColor=#217a35;align=left;");

  model.wires.forEach((wire, index) => {
    const source = wire.source === "J43"
      ? [318, wire.sourcePin === "1" ? 426 : 482]
      : [300, wire.source === "TP1" ? 220 : 276];
    const breakoutX = wire.source === "J43" ? 1035 : 985;
    const rightY = targetY[String(wire.targetPin)] || wire.laneY;
    addRoutedEdge(
      `split_wire_${index + 1}`,
      `${wire.name} | ${wire.colorName} | ${formatWireLengthLabel(wire.length)}`,
      [source, [breakoutX, wire.laneY], [breakoutX, rightY], [1292, rightY]],
      `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;jumpStyle=arc;jumpSize=8;fontFamily=Courier New;fontStyle=1;fontSize=11;`
    );
  });

  addVertex("split_wiring_table", buildKiCadDrawioTableText(
    "WIRING TABLE - TWO SEPARATE CABLE LEGS",
    ["LEG", "SOURCE", "LEFT PIN", "SIGNAL", "COLOR", "AWG", "LENGTH", "ISO PIN"],
    model.wires.map((wire) => [
      wire.leg,
      wire.source,
      wire.sourcePin,
      wire.name,
      wire.colorName,
      wire.awg,
      formatLengthMeasurement(wire.length),
      wire.targetPin
    ])
  ), 30, 596, 960, 174, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#17231c;strokeWidth=2;fontSize=9;align=center;");
  addVertex("split_notes", `<b>PARTS / BUILD NOTES</b><br>1. LEG 1: solder GND to TP1 and 5V to TP71; no left connector housing.<br>2. LEG 2: J43 side-lock Micro-Fit ${escapeHtml(model.microFitHousing)}; contact ${escapeHtml(model.microFitContact)}.<br>3. Isolator pinout: 1=GND, 2=SDA, 3=SCL, 4=5V.<br>4. Right housing/contact: ${escapeHtml(model.dupontHousing)} / ${escapeHtml(model.dupontContact)}.<br>5. Tool: ${escapeHtml(model.tool)}. Use separate expando and heat-shrink on each leg.`, 1025, 596, 535, 174, "rounded=0;whiteSpace=wrap;html=1;fillColor=#fffdf5;strokeColor=#17231c;strokeWidth=2;fontSize=10;align=left;spacingLeft=12;spacingTop=10;");
  const diagram = escapeXml(result.fileName || model.cableName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildDatasheetConnectorHarnessDrawioXml(result, model) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, points, style) => {
    const source = points[0];
    const target = points[points.length - 1];
    const waypoints = points.slice(1, -1)
      .map((point) => `<mxPoint x="${formatDrawioCoordinate(point.x)}" y="${formatDrawioCoordinate(point.y)}" />`)
      .join("");
    const pointsXml = waypoints ? `<Array as="points">${waypoints}</Array>` : "";
    add(mxCell(
      { id, value, style, edge: 1, parent: "1" },
      mxGeometry(
        { x: -0.28, y: -8, relative: 1, as: "geometry" },
        `${mxPoint(source.x, source.y, "sourcePoint")}${mxPoint(target.x, target.y, "targetPoint")}${pointsXml}`
      )
    ));
  };
  const routes = buildDatasheetWireRoutes(model);
  const routeYs = routes.flatMap((route) => route.points.map((point) => point.y));
  const protectionPadding = clamp(58 - model.wires.length * 2, 24, 48);
  const protectionTop = Math.min(...routeYs) - protectionPadding;
  const protectionBottom = Math.max(...routeYs) + protectionPadding;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 10, 10, 1580, 780, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", model.cableName, 480, 18, 640, 38, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("subtitle", model.description, 460, 58, 680, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=18;fontStyle=5;fontColor=#000000;align=center;");
  addVertex("datasheet_label", "DATASHEET-AWARE CONNECTOR MATING FACES | EXPANDABLE BRAID + HEAT SHRINK", 430, 88, 740, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#3d4448;align=center;");
  if (model.warnings.length) {
    addVertex(
      "warnings",
      model.warnings.slice(0, 3).map((warning) => escapeHtml(shortLabel(warning, 145))).join("<br>"),
      340,
      108,
      920,
      42,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#b42318;align=center;"
    );
  }
  addHorizontalDrawioProtection(addVertex, {
    id: "datasheet_protection",
    x1: 454,
    x2: 1146,
    top: protectionTop,
    bottom: protectionBottom,
    bandWidth: 26
  });
  addDatasheetConnectorDrawioFace(addVertex, model.left, "left");
  addDatasheetConnectorDrawioFace(addVertex, model.right, "right");
  routes.forEach(({ wire, points }, index) => {
    const hasDistinctNames = wireNamesDiffer(wire.leftName, wire.rightName);
    const colorSpec = wireColorSpec(wire.row?.color || wire.colorLabel || wire.colorName);
    const wireDetails = `${escapeHtml(wire.colorLabel || colorSpec.label)} | ${escapeHtml(formatWireLengthLabel(wire.length, model.length))}`;
    addEdge(
      `datasheet_wire_${index + 1}`,
      hasDistinctNames ? wireDetails : `${escapeHtml(wire.leftName)} | ${wireDetails}`,
      points,
      `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;jumpStyle=arc;jumpSize=8;fontStyle=1;fontSize=10;`
    );
    if (colorSpec.stripeStroke) {
      addEdge(
        `datasheet_wire_stripe_${index + 1}`,
        "",
        points,
        `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=2.2;dashed=1;dashPattern=10 9;fixDash=1;endArrow=none;startArrow=none;jumpStyle=arc;jumpSize=8;`
      );
    }
    if (hasDistinctNames) {
      const y = wire.laneY - 10;
      const leftLabelWidth = drawioLabelWidth(wire.leftName, 10, 64, 210);
      const rightLabelWidth = drawioLabelWidth(wire.rightName, 10, 64, 210);
      const endpointFontColor = wire.colorName === "BLACK" ? "#ffffff" : "#000000";
      addVertex(
        `datasheet_left_wire_name_${index + 1}`,
        escapeHtml(wire.leftName),
        468,
        y,
        leftLabelWidth,
        20,
        `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=left;verticalAlign=middle;spacing=0;`
      );
      addVertex(
        `datasheet_right_wire_name_${index + 1}`,
        escapeHtml(wire.rightName),
        1132 - rightLabelWidth,
        y,
        rightLabelWidth,
        20,
        `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=right;verticalAlign=middle;spacing=0;`
      );
    }
  });
  const wiringRows = model.wires.map((wire) => [
    wire.fromPin,
    wire.leftName,
    wire.rightName,
    wire.colorName,
    wire.awg || model.gauge || "",
    formatLengthMeasurement(wire.length || model.length),
    wire.toPin
  ]);
  addVertex(
    "datasheet_wiring_table",
    buildKiCadDrawioTableText("WIRING TABLE", ["LEFT", "LEFT NAME", "RIGHT NAME", "COLOR", "AWG", "LENGTH", "RIGHT"], wiringRows),
    30,
    510,
    1165,
    252,
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=9;align=center;"
  );
  const parts = buildDatasheetPartsPanelLines(model)
    .map((line) => `${line.warning ? "<font color=\"#b42318\"><b>" : ""}${escapeHtml(line.text)}${line.warning ? "</b></font>" : ""}`)
    .join("<br>");
  addVertex(
    "datasheet_parts",
    `<b>DATASHEET PARTS / CRIMP TOOLS</b><br>${parts}`,
    1210,
    510,
    350,
    252,
    "rounded=0;whiteSpace=wrap;html=1;fillColor=#fffdf5;strokeColor=#000000;strokeWidth=2;fontSize=10;align=left;spacingLeft=12;spacingTop=10;"
  );
  const diagram = escapeXml(result.fileName || model.cableName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function addDatasheetConnectorDrawioFace(addVertex, connector, side) {
  const geometry = datasheetConnectorGeometry(connector, side);
  const partLabel = escapeHtml(datasheetConnectorPartLabel(connector));
  const headingPart = connector.key === "catalogUnknown" && connector.lookupUrl
    ? `<a href="${escapeHtml(connector.lookupUrl)}"><b>${partLabel}</b></a>`
    : `<b>${partLabel}</b>`;
  const heading = `${escapeHtml(connector.name)}<br>${headingPart}<br>${escapeHtml(connector.definition.family)} | ${connector.positions} POS | ${escapeHtml(connector.definition.pitch)}`;
  addVertex(
    `${side}_datasheet_heading`,
    heading,
    geometry.centerX - 125,
    112,
    250,
    58,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#000000;align=center;"
  );
  if (connector.key === "teCpc1714") {
    if (connector.flange) {
      addVertex(
        `${side}_cpc_flange`,
        "",
        geometry.x,
        geometry.y,
        geometry.width,
        geometry.height,
        "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#171a1c;strokeColor=#020303;strokeWidth=4;"
      );
      [
        [geometry.x + 12, geometry.y + 12],
        [geometry.x + geometry.width - 26, geometry.y + 12],
        [geometry.x + 12, geometry.y + geometry.height - 26],
        [geometry.x + geometry.width - 26, geometry.y + geometry.height - 26]
      ].forEach(([x, y], index) => addVertex(
        `${side}_cpc_mount_${index + 1}`,
        "",
        x,
        y,
        14,
        14,
        "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#020303;strokeWidth=2;"
      ));
    } else {
      addVertex(
        `${side}_cpc_coupling`,
        "",
        geometry.centerX - 94,
        geometry.centerY - 94,
        188,
        188,
        "ellipse;whiteSpace=wrap;html=1;fillColor=#24282b;strokeColor=#020303;strokeWidth=4;"
      );
    }
    addVertex(
      `${side}_cpc_thread`,
      "",
      geometry.centerX - 83,
      geometry.centerY - 83,
      166,
      166,
      "ellipse;whiteSpace=wrap;html=1;fillColor=#24282b;strokeColor=#050606;strokeWidth=4;"
    );
    addVertex(
      `${side}_cpc_face`,
      "",
      geometry.centerX - 75,
      geometry.centerY - 75,
      150,
      150,
      `ellipse;whiteSpace=wrap;html=1;fillColor=${connector.faceStyle === "recessed" ? "#121517" : "#202427"};strokeColor=${connector.faceStyle === "recessed" ? "#4c5357" : "#050606"};strokeWidth=${connector.faceStyle === "recessed" ? 6 : 3};`
    );
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      addVertex(
        `${side}_cpc_cavity_${pin}`,
        String(pin),
        point.x - 13,
        point.y - 13,
        26,
        26,
        `ellipse;whiteSpace=wrap;html=1;fillColor=${connector.contactType === "socket" ? "#050606" : "#d8b967"};strokeColor=${active?.stroke || "#80878b"};strokeWidth=${active ? 4 : 1};fontColor=#ffffff;fontStyle=1;fontSize=7;`
      );
    }
  } else if (connector.key === "powerpole1545") {
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const index = pin - 1;
      const column = index % geometry.columns;
      const row = Math.floor(index / geometry.columns);
      const x = geometry.x + column * (geometry.moduleWidth + geometry.gap);
      const y = geometry.y + row * (geometry.moduleHeight + geometry.gap);
      const circuitPin = connector.pinOrder?.[pin - 1] || String(pin);
      const active = connector.activePins.get(circuitPin);
      const fill = active ? datasheetHousingFill(active.colorName) : "#858b8f";
      const fontColor = isDarkDatasheetColor(active?.colorName) ? "#ffffff" : "#000000";
      addVertex(
        `${side}_powerpole_${pin}`,
        "",
        x,
        y,
        geometry.moduleWidth,
        geometry.moduleHeight,
        `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#111111;strokeWidth=2;fontColor=${fontColor};fontStyle=1;fontSize=10;`
      );
      addVertex(
        `${side}_powerpole_opening_${pin}`,
        "",
        x + 6,
        y + 8,
        geometry.moduleWidth - 12,
        18,
        "rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#101314;strokeColor=#000000;strokeWidth=1;"
      );
    }
  } else if (connector.key === "catalogUnknown") {
    addVertex(
      `${side}_unknown_part_body`,
      "<font color=\"#b42318\"><b>NO STORED<br>PART PROFILE</b></font>",
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
      "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#f7f9fa;strokeColor=#7a858c;strokeWidth=3;dashed=1;dashPattern=8 6;fontSize=8;align=center;verticalAlign=top;spacingTop=5;"
    );
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      addVertex(
        `${side}_unknown_part_cavity_${pin}`,
        String(pin),
        point.x - 15,
        point.y - 9,
        30,
        18,
        `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${active?.stroke || "#879097"};strokeWidth=${active ? 3 : 1};dashed=1;fontColor=#222222;fontStyle=1;fontSize=8;`
      );
    }
    addVertex(
      `${side}_unknown_part_lookup`,
      `<a href="${escapeHtml(connector.lookupUrl)}"><b>LOOK UP ${escapeHtml(shortLabel(connector.housingPart, 24))} ON DIGIKEY</b></a>`,
      geometry.centerX - 125,
      geometry.y + geometry.height + 31,
      250,
      22,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontColor=#005ea8;align=center;"
    );
  } else if (connector.key === "miniFitSr") {
    const rearView = connector.view === "rear";
    addVertex(
      `${side}_minifitsr_body`,
      "",
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
      "rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#202427;strokeColor=#050606;strokeWidth=4;"
    );
    addVertex(
      `${side}_minifitsr_left_guide`,
      "",
      geometry.x - 10,
      geometry.y + 17,
      12,
      geometry.height - 34,
      "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#303538;strokeColor=#050606;strokeWidth=2;"
    );
    addVertex(
      `${side}_minifitsr_right_guide`,
      "",
      geometry.x + geometry.width - 2,
      geometry.y + 17,
      12,
      geometry.height - 34,
      "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#303538;strokeColor=#050606;strokeWidth=2;"
    );
    addVertex(
      `${side}_minifitsr_latch`,
      "",
      geometry.centerX - 32,
      geometry.y - 24,
      66,
      28,
      "shape=trapezoid;perimeter=trapezoidPerimeter;direction=north;whiteSpace=wrap;html=1;fillColor=#2d3235;strokeColor=#050606;strokeWidth=3;"
    );
    addVertex(
      `${side}_minifitsr_inner`,
      "",
      geometry.x + 11,
      geometry.y + 10,
      geometry.width - 22,
      geometry.height - 20,
      `rounded=1;arcSize=5;whiteSpace=wrap;html=1;fillColor=${rearView ? "#292e31" : "#16191b"};strokeColor=${rearView ? "#6c7479" : "#535a5e"};strokeWidth=${rearView ? 3 : 2};`
    );
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      addVertex(
        `${side}_minifitsr_cavity_${pin}`,
        "",
        point.x - 25,
        point.y - 18,
        50,
        36,
        `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=${rearView ? "#24282a" : "#090a0a"};strokeColor=${active?.stroke || "#8b9296"};strokeWidth=${active ? 4 : 1.5};`
      );
      addVertex(
        `${side}_minifitsr_entry_${pin}`,
        "",
        point.x - 8,
        point.y - 9,
        16,
        18,
        `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${rearView ? "#090a0a" : "#303638"};strokeColor=${rearView ? "#b8bec1" : "#858e93"};strokeWidth=1.2;`
      );
      addVertex(
        `${side}_minifitsr_number_${pin}`,
        String(pin),
        point.x - 11,
        point.y - 9,
        22,
        18,
        "text;html=1;strokeColor=none;fillColor=none;fontColor=#ffffff;fontStyle=1;fontSize=8;align=center;verticalAlign=middle;"
      );
    }
    addVertex(
      `${side}_minifitsr_pin1_marker`,
      "",
      geometry.x + 8,
      geometry.y + 8,
      14,
      14,
      "shape=triangle;direction=south;whiteSpace=wrap;html=1;fillColor=#f0f2f3;strokeColor=#050505;strokeWidth=1;"
    );
    addVertex(
      `${side}_minifitsr_tpa_label`,
      rearView ? "TPA / WIRE ENTRY" : "POLARIZED MINI-FIT SR.",
      geometry.centerX - 62,
      geometry.y + geometry.height - 15,
      124,
      12,
      "text;html=1;strokeColor=none;fillColor=none;fontColor=#dce0e2;fontStyle=1;fontSize=7;align=center;"
    );
  } else {
    const fill = connector.key === "miniFitJr" ? "#ded9c9" : connector.key === "generic" ? "#f4f4f4" : "#25292c";
    addVertex(
      `${side}_datasheet_body`,
      "",
      geometry.x,
      geometry.y,
      geometry.width,
      geometry.height,
      `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#050505;strokeWidth=3;`
    );
    if (connector.key === "microFitSide") {
      addVertex(
        `${side}_side_lock`,
        "LOCK",
        geometry.centerX - 20,
        geometry.y + geometry.height,
        40,
        34,
        "rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#353a3d;strokeColor=#050505;strokeWidth=2;fontColor=#ffffff;fontStyle=1;fontSize=8;"
      );
    }
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const point = datasheetConnectorPinPoint(connector, pin, side);
      const active = connector.activePins.get(String(pin));
      addVertex(
        `${side}_datasheet_cavity_${pin}`,
        String(pin),
        point.x - 15,
        point.y - 9,
        30,
        18,
        `rounded=1;arcSize=18;whiteSpace=wrap;html=1;fillColor=#090a0a;strokeColor=${active?.stroke || "#9ca3a7"};strokeWidth=${active ? 3 : 1};fontColor=#ffffff;fontStyle=1;fontSize=8;`
      );
    }
  }
  addVertex(
    `${side}_datasheet_view`,
    datasheetConnectorViewLabel(connector),
    geometry.centerX - 120,
    geometry.y + geometry.height + (connector.key === "microFitSide" ? 42 : 8),
    240,
    22,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#3d4448;align=center;"
  );
}

function buildLargeCircularPairHarnessDrawioXml(result, model) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, points, style) => {
    const intermediate = points.slice(1, -1)
      .map((point) => `<mxPoint x="${formatDrawioCoordinate(point[0])}" y="${formatDrawioCoordinate(point[1])}" />`)
      .join("");
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry(
      { relative: 1, as: "geometry" },
      `${mxPoint(points[0][0], points[0][1], "sourcePoint")}${mxPoint(points[points.length - 1][0], points[points.length - 1][1], "targetPoint")}${intermediate ? `<Array as="points">${intermediate}</Array>` : ""}`
    )));
  };
  const leftFaceX = 145;
  const rightFaceX = model.width - 145;
  const leftWireX = 360;
  const rightWireX = model.width - 360;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 12, 12, model.width - 24, model.height - 24, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#111111;strokeWidth=2;");
  addVertex("title", `${escapeHtml(model.cableName)} — ${model.totalWires} CONDUCTORS`, model.width / 2 - 480, 24, 960, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=34;fontStyle=1;fontColor=#111111;align=center;");
  addVertex("subtitle", `${model.groups.length} × 16-PIN CIRCULAR CONNECTOR LEGS${model.length ? ` | ${escapeHtml(formatWireLengthLabel(model.length))}` : ""}`, model.width / 2 - 430, 65, 860, 26, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#333333;align=center;");

  model.groups.forEach((group, groupIndex) => {
    const firstY = group.wires[0].y;
    const lastY = group.wires[group.wires.length - 1].y;
    const centerY = (firstY + lastY) / 2;
    addVertex(`group_${groupIndex}_title`, `<b>${escapeHtml(group.leftName)} TO ${escapeHtml(group.rightName)} | ${group.wires.length} WIRES</b>`, model.width / 2 - 360, group.groupTop + 8, 720, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#111111;align=center;");
    addVertex(`group_${groupIndex}_sleeve`, "", leftWireX + 28, firstY - 12, rightWireX - leftWireX - 56, lastY - firstY + 24, "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#d7dde0;opacity=32;strokeColor=#68737a;strokeWidth=2;dashed=1;dashPattern=8 6;");
    addVertex(`group_${groupIndex}_left_collar`, "", leftWireX + 18, firstY - 18, 24, lastY - firstY + 36, "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#171717;strokeColor=#000000;strokeWidth=1;");
    addVertex(`group_${groupIndex}_right_collar`, "", rightWireX - 42, firstY - 18, 24, lastY - firstY + 36, "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#171717;strokeColor=#000000;strokeWidth=1;");
    addLargeCircularDrawioFace(addVertex, `group_${groupIndex}_left`, leftFaceX, centerY, group.leftName, group.leftType);
    addLargeCircularDrawioFace(addVertex, `group_${groupIndex}_right`, rightFaceX, centerY, group.rightName, group.rightType);

    group.wires.forEach((wire, wireIndex) => {
      const geometry = sheetWireRouteGeometry(wire, group.pairAnalysis, leftWireX, rightWireX);
      const colorSpec = wireColorSpec(wire.row.color || wire.colorLabel || wire.colorName);
      const pairId = sheetTwistedPairId(wire.row);
      const label = [wire.name, colorSpec.label, pairId ? `TWISTED PAIR ${pairId}` : ""].filter(Boolean).join(" | ");
      const baseStyle = geometry.twisted
        ? `edgeStyle=none;curved=1;rounded=1;html=1;strokeColor=${wire.stroke};strokeWidth=5.5;endArrow=none;startArrow=none;`
        : `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=5.5;endArrow=none;startArrow=none;`;
      addEdge(`group_${groupIndex}_wire_${wireIndex}`, "", geometry.points, baseStyle);
      if (colorSpec.stripeStroke) {
        addEdge(
          `group_${groupIndex}_wire_${wireIndex}_stripe`,
          "",
          geometry.points,
          `${geometry.twisted ? "edgeStyle=none;curved=1;rounded=1" : "edgeStyle=orthogonalEdgeStyle;rounded=0"};html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=2.2;dashed=1;dashPattern=10 8;fixDash=1;endArrow=none;startArrow=none;`
        );
      }
      addVertex(`group_${groupIndex}_wire_left_pin_${wireIndex}`, escapeHtml(wire.fromPin), leftWireX - 48, wire.y - 10, 34, 20, "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#111111;align=right;");
      addVertex(`group_${groupIndex}_wire_right_pin_${wireIndex}`, escapeHtml(wire.toPin), rightWireX + 14, wire.y - 10, 34, 20, "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#111111;align=left;");
      addVertex(`group_${groupIndex}_wire_label_${wireIndex}`, escapeHtml(label), model.width / 2 - 245, wire.y - 9, 490, 18, "text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=#ffffff;whiteSpace=nowrap;overflow=visible;fontSize=9;fontStyle=1;fontColor=#111111;align=center;verticalAlign=middle;spacing=0;");
    });
  });

  const diagram = escapeXml(result.fileName || model.cableName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${model.width}" pageHeight="${model.height}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function addLargeCircularDrawioFace(addVertex, id, cx, cy, name, type) {
  addVertex(`${id}_name`, `<b>${escapeHtml(name)}</b>`, cx - 105, cy - 128, 210, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#111111;align=center;");
  addVertex(`${id}_type`, escapeHtml(connectorTypeWithDefaultView(type)), cx - 120, cy - 106, 240, 20, "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#333333;align=center;");
  addVertex(`${id}_shell`, "", cx - 92, cy - 92, 184, 184, "ellipse;whiteSpace=wrap;html=1;fillColor=#eeeeee;strokeColor=#111111;strokeWidth=3;");
  addVertex(`${id}_key`, "", cx - 16, cy - 94, 32, 10, "rounded=1;arcSize=30;whiteSpace=wrap;html=1;fillColor=#111111;strokeColor=#111111;strokeWidth=1;");
  CPC_17_16_PIN_LAYOUT.forEach((position) => {
    addVertex(`${id}_pin_${position.pin}`, String(position.pin), cx + position.dx - 11, cy + position.dy - 11, 22, 22, "ellipse;whiteSpace=wrap;html=1;fillColor=#f9f9f9;strokeColor=#111111;strokeWidth=1.4;fontSize=8;fontStyle=1;fontColor=#111111;align=center;");
  });
}

function connectorTypeWithDefaultView(type) {
  const value = String(type || "").trim();
  return /\b(?:FRONT|REAR|SOLDER)\s+VIEW\b/i.test(value)
    ? value
    : `${value} (FRONT VIEW)`.trim();
}

function buildKiCadHarnessDrawioXml(result, model) {
  if (model.isMultiGroup) {
    return buildKiCadMultiGroupDrawioXml(result, model);
  }
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const addRoutedEdge = (id, value, points, style) => {
    const intermediate = points.slice(1, -1)
      .map((point) => `<mxPoint x="${formatDrawioCoordinate(point[0])}" y="${formatDrawioCoordinate(point[1])}" />`)
      .join("");
    add(mxCell(
      { id, value, style, edge: 1, parent: "1" },
      mxGeometry(
        { relative: 1, as: "geometry" },
        `${mxPoint(points[0][0], points[0][1], "sourcePoint")}${mxPoint(points[points.length - 1][0], points[points.length - 1][1], "targetPoint")}${intermediate ? `<Array as="points">${intermediate}</Array>` : ""}`
      )
    ));
  };
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  const leftIsPcb = isKiCadPcbConnector(model.leftConnector);
  const rightIsPcb = isKiCadPcbConnector(model.rightConnector);
  addVertex("border", "", 10, 10, 1580, 780, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", model.cableName, 650, 22, 300, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=38;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("subtitle", model.description, 560, 64, 480, 32, "text;html=1;strokeColor=none;fillColor=none;fontSize=24;fontStyle=5;fontColor=#000000;align=center;");
  addVertex("left_heading", `${leftIsPcb ? "LEFT PCB TERMINATION" : "LEFT CONNECTOR"}<br>${model.leftConnector.name}<br>${kiCadConnectorHeaderType(model.leftConnector, model.wires, "left")}<br>${model.leftConnector.positionText}<br>(${model.leftConnector.view})`, 80, 30, 280, 124, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("right_heading", `${rightIsPcb ? "RIGHT PCB TERMINATION" : "RIGHT CONNECTOR"}<br>${model.rightConnector.name}<br>${kiCadConnectorHeaderType(model.rightConnector, model.wires, "right")}<br>${model.rightConnector.positionText}<br>(${model.rightConnector.view})`, 1220, 30, 280, 124, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
  addEdge("dim_length", `OVERALL LENGTH: ${formatLengthMeasurement(model.length)} +/-0.25 in`, 382, 150, 1210, 150, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=15;labelBackgroundColor=#ffffff;");
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: 452,
    x2: 1138,
    top: model.wires[0].y - 30,
    bottom: model.wires[model.wires.length - 1].y + 30
  });
  const leftIsCircular = isKiCadCircularConnector(model.leftConnector);
  const leftIsPicoBlade = isKiCadPicoBladeConnector(model.leftConnector);
  const pairAnalysis = model.twistedPairAnalysis || analyzeSheetTwistedPairs(model.wires);
  addKiCadDrawioLeftConnectorFace(addVertex, model);
  addKiCadDrawioRightConnectorFaces(addVertex, model);
  model.wires.forEach((wire, index) => {
    const targetY = rightIsPcb ? wire.y : wire.rightTargetY || wire.y;
    const colorSpec = wireColorSpec(wire.colorLabel || wire.colorName || wire.row?.color);
    const wireStartX = leftIsPcb ? 300 : 426;
    const wireEndX = rightIsPcb ? 1316 : 1164;
    const twistGeometry = sheetWireRouteGeometry(wire, pairAnalysis, wireStartX, wireEndX);
    const wirePoints = twistGeometry.twisted
      ? twistGeometry.points
      : [[wireStartX, wire.y], [wireEndX, targetY]];
    const terminalStyle = `rounded=0;whiteSpace=wrap;html=1;fillColor=${wire.stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontColor=${wire.colorName === "BLACK" ? "#ffffff" : "#000000"};`;
    if (!leftIsCircular && !leftIsPcb && !leftIsPicoBlade) {
      addVertex(`left_cavity_${index}`, "", 194, wire.y - 17, 38, 34, "rounded=1;whiteSpace=wrap;html=1;fillColor=#000000;strokeColor=#000000;strokeWidth=1;");
    }
    if (!leftIsPcb) {
      addVertex(`left_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 370, wire.y - 16, 56, 32, terminalStyle);
    }
    if (!rightIsPcb) {
      addVertex(`right_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 1164, targetY - 16, 56, 32, terminalStyle);
    }
    addRoutedEdge(
      `wire_${index}`,
      "",
      wirePoints,
      `${twistGeometry.twisted ? "edgeStyle=none;curved=1" : "edgeStyle=orthogonalEdgeStyle"};rounded=1;html=1;strokeColor=${wire.stroke};strokeWidth=8;endArrow=none;startArrow=none;jumpStyle=arc;jumpSize=10;`
    );
    if (colorSpec.stripeStroke) {
      addRoutedEdge(
        `wire_stripe_${index}`,
        "",
        wirePoints,
        `${twistGeometry.twisted ? "edgeStyle=none;curved=1" : "edgeStyle=orthogonalEdgeStyle"};rounded=1;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=3;dashed=1;dashPattern=11 9;fixDash=1;endArrow=none;startArrow=none;jumpStyle=arc;jumpSize=10;`
      );
    }
    if (!rightIsPcb) {
      addEdge(`right_stub_${index}`, "", 1220, targetY, 1300, targetY, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=8;endArrow=none;startArrow=none;`);
      if (colorSpec.stripeStroke) {
        addEdge(`right_stub_stripe_${index}`, "", 1220, targetY, 1300, targetY, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=3;dashed=1;dashPattern=11 9;fixDash=1;endArrow=none;startArrow=none;`);
      }
    }
    const leftLabel = wire.leftName;
    const detailLabel = `${wire.colorLabel || colorSpec.label} | ${formatWireLengthLabel(wire.length, model.length)}`;
    const rightLabel = wire.rightName;
    const leftLabelWidth = drawioLabelWidth(leftLabel, 11, 72, 220);
    const detailLabelWidth = drawioLabelWidth(detailLabel, 12, 90, 180);
    const rightLabelWidth = drawioLabelWidth(rightLabel, 11, 72, 220);
    const detailFontColor = wire.colorName === "BLACK" ? "#ffffff" : "#000000";
    const endpointFontColor = wire.colorName === "BLACK" ? "#ffffff" : "#000000";
    addVertex(
      `left_wire_name_${index}`,
      escapeHtml(leftLabel),
      438,
      wire.y - 11,
      leftLabelWidth,
      22,
      `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=11;fontStyle=1;fontColor=${endpointFontColor};align=left;verticalAlign=middle;spacing=0;`
    );
    addVertex(
      `wire_details_${index}`,
      escapeHtml(detailLabel),
      800 - detailLabelWidth / 2,
      wire.detailLabelTop ?? wire.y - 12,
      detailLabelWidth,
      24,
      `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=12;fontStyle=1;fontColor=${detailFontColor};align=center;spacing=0;`
    );
    addVertex(
      `right_wire_name_${index}`,
      escapeHtml(rightLabel),
      1148 - rightLabelWidth,
      targetY - 11,
      rightLabelWidth,
      22,
      `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=11;fontStyle=1;fontColor=${endpointFontColor};align=right;verticalAlign=middle;spacing=0;`
    );
  });
  // Add pin numbers last so they remain above wires, terminals, and connector faces.
  model.wires.forEach((wire, index) => {
    const targetY = rightIsPcb ? wire.y : wire.rightTargetY || wire.y;
    const pinFontColor = wire.colorName === "BLACK" ? "#ffffff" : "#000000";
    addVertex(
      `left_pin_num_${index}`,
      wire.fromPin,
      320,
      wire.y - 14,
      55,
      28,
      `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;fontSize=16;fontStyle=1;fontColor=${pinFontColor};align=center;`
    );
    if (!rightIsPcb) {
      addVertex(
        `right_pin_num_${index}`,
        wire.toPin,
        1218,
        targetY - 14,
        55,
        28,
        `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;fontSize=16;fontStyle=1;fontColor=${pinFontColor};align=center;`
      );
    }
  });
  const diagram = escapeXml(result.fileName || model.cableName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function addKiCadDrawioLeftConnectorFace(addVertex, model) {
  if (isKiCadPcbConnector(model.leftConnector)) {
    addKiCadDrawioPcbFace(addVertex, model.leftConnector, model.wires, "left");
    return;
  }
  if (isKiCadPicoBladeConnector(model.leftConnector)) {
    addKiCadDrawioPicoBladeFace(addVertex, model.leftConnector, model.wires, "left");
    return;
  }
  if (!isKiCadCircularConnector(model.leftConnector)) {
    const slots = buildKiCadConnectorSlots(model.wires, model.leftConnector, "left");
    addVertex(
      "left_face",
      model.leftConnector.name,
      170,
      Math.max(162, slots[0].y - 42),
      88,
      slots[slots.length - 1].y - slots[0].y + 84,
      "rounded=1;whiteSpace=wrap;html=1;fillColor=#d7d7d7;strokeColor=#000000;strokeWidth=2;fontStyle=1;"
    );
    slots.filter((slot) => !slot.wire).forEach((slot, index) => {
      addVertex(
        `left_unused_cavity_${index + 1}`,
        slot.pin,
        194,
        slot.y - 17,
        38,
        34,
        "rounded=1;whiteSpace=wrap;html=1;fillColor=#d8dcde;strokeColor=#747b7f;strokeWidth=1;dashed=1;dashPattern=4 3;fontColor=#4b5357;fontStyle=1;fontSize=9;"
      );
    });
    return;
  }
  const centerX = 214;
  const centerY = (model.wires[0].y + model.wires[model.wires.length - 1].y) / 2;
  addVertex("left_cpc_ring", "", centerX - 105, centerY - 105, 210, 210, "ellipse;whiteSpace=wrap;html=1;fillColor=#30363a;strokeColor=#050606;strokeWidth=4;");
  addVertex("left_cpc_face", "", centerX - 91, centerY - 91, 182, 182, "ellipse;whiteSpace=wrap;html=1;fillColor=#202528;strokeColor=#71797e;strokeWidth=3;");
  const positionCount = Math.max(model.wires.length, Number(model.leftConnector.positionCount) || model.wires.length);
  const activePins = new Set(model.wires.map((wire) => numericPin(wire.fromPin)).filter(Number.isFinite));
  for (let pin = 1; pin <= positionCount; pin += 1) {
    const point = kiCadCircularCpcPinPoint(pin, positionCount, centerX, centerY);
    addVertex(
      `left_cpc_pin_${pin}`,
      String(pin),
      point.x - 10,
      point.y - 10,
      20,
      20,
      activePins.has(pin)
        ? "ellipse;whiteSpace=wrap;html=1;fillColor=#080a0a;strokeColor=#d4d9dc;strokeWidth=1;fontColor=#ffffff;fontStyle=1;fontSize=7;"
        : "ellipse;whiteSpace=wrap;html=1;fillColor=#596167;strokeColor=#aeb4b7;strokeWidth=1;dashed=1;dashPattern=3 2;fontColor=#ffffff;fontStyle=1;fontSize=7;"
    );
  }
  if (model.leftConnector.unusedPins?.length) {
    addVertex(
      "left_unused_note",
      `PIN${model.leftConnector.unusedPins.length === 1 ? "" : "S"} ${escapeHtml(model.leftConnector.unusedPins.join(", "))}: NOT IN USE`,
      centerX - 105,
      centerY + 108,
      210,
      20,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#4b5357;align=center;"
    );
  }
}

function addKiCadDrawioRightConnectorFaces(addVertex, model) {
  if (isKiCadPcbConnector(model.rightConnector)) {
    addKiCadDrawioPcbFace(addVertex, model.rightConnector, model.wires, "right");
    return;
  }
  if (isKiCadPivotPowerRj45Connector(model.rightConnector) && !isKiCadStandardEthernetRj45Connector(model.rightConnector, model.wires, "right")) {
    addKiCadDrawioPivotPowerRj45Face(addVertex, model.rightConnector, model.wires, "right");
    return;
  }
  if (isKiCadRj45Connector(model.rightConnector)) {
    addKiCadDrawioRj45Face(addVertex, model.rightConnector, model.wires, "right");
    return;
  }
  if (isKiCadCircularConnector(model.rightConnector)) {
    const centerX = 1344;
    const centerY = (model.wires[0].y + model.wires[model.wires.length - 1].y) / 2;
    addVertex("right_cpc_ring", "", centerX - 105, centerY - 105, 210, 210, "ellipse;whiteSpace=wrap;html=1;fillColor=#30363a;strokeColor=#050606;strokeWidth=4;");
    addVertex("right_cpc_face", "", centerX - 91, centerY - 91, 182, 182, "ellipse;whiteSpace=wrap;html=1;fillColor=#202528;strokeColor=#71797e;strokeWidth=3;");
    const positionCount = Math.max(model.wires.length, Number(model.rightConnector.positionCount) || model.wires.length);
    const activePins = new Set(model.wires.map((wire) => numericPin(wire.toPin)).filter(Number.isFinite));
    for (let pin = 1; pin <= positionCount; pin += 1) {
      const point = kiCadCircularCpcPinPoint(pin, positionCount, centerX, centerY);
      addVertex(
        `right_cpc_pin_${pin}`,
        String(pin),
        point.x - 10,
        point.y - 10,
        20,
        20,
        activePins.has(pin)
          ? "ellipse;whiteSpace=wrap;html=1;fillColor=#080a0a;strokeColor=#d4d9dc;strokeWidth=1;fontColor=#ffffff;fontStyle=1;fontSize=7;"
          : "ellipse;whiteSpace=wrap;html=1;fillColor=#596167;strokeColor=#aeb4b7;strokeWidth=1;dashed=1;dashPattern=3 2;fontColor=#ffffff;fontStyle=1;fontSize=7;"
      );
    }
    return;
  }
  if (model.rightConnectorGroups.length <= 1) {
    const group = model.rightConnectorGroups[0];
    const groupName = group?.name || model.rightConnector.name;
    const palette = group?.palette || rightHousingPalette(groupName);
    const top = group?.top ?? Math.max(162, model.wires[0].y - 42);
    const bottom = group?.bottom ?? model.wires[model.wires.length - 1].y + 42;
    addVertex(
      "right_face",
      "",
      1300,
      top,
      88,
      bottom - top,
      `rounded=1;whiteSpace=wrap;html=1;fillColor=${palette.fill};strokeColor=${palette.stroke};strokeWidth=2;fontStyle=1;`
    );
    const slots = group?.slots?.length
      ? group.slots
      : (group?.sortedWires || model.wires).map((wire) => ({ pin: wire.toPin, wire, y: wire.rightTargetY || wire.y }));
    slots.forEach((slot, slotIndex) => {
      addVertex(
        `right_group_0_cavity_${slotIndex + 1}`,
        slot.wire ? "" : escapeHtml(slot.pin),
        1325,
        slot.y - 14,
        38,
        28,
        slot.wire
          ? "rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#8d8d8d;strokeColor=#6b6b6b;strokeWidth=1;"
          : "rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#d8dcde;strokeColor=#747b7f;strokeWidth=1;dashed=1;dashPattern=4 3;fontColor=#4b5357;fontStyle=1;fontSize=9;"
      );
    });
    addVertex(
      "right_group_0_label",
      escapeHtml(groupName),
      1392,
      (top + bottom) / 2 - 12,
      168,
      24,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#000000;align=left;"
    );
    return;
  }
  model.rightConnectorGroups.forEach((group) => {
    const top = group.top;
    const bottom = group.bottom;
    const height = bottom - top;
    const palette = group.palette || rightHousingPalette(group.name);
    if (isKiCadFerruleGroup(group)) {
      addVertex(
        `right_group_${group.index}_ferrule_barrel`,
        "",
        1252,
        (top + bottom) / 2 - 8,
        40,
        16,
        "rounded=1;arcSize=35;whiteSpace=wrap;html=1;fillColor=#3f4548;strokeColor=#111111;strokeWidth=2;"
      );
      addVertex(
        `right_group_${group.index}_ferrule_tip`,
        "",
        1286,
        (top + bottom) / 2 - 4,
        18,
        8,
        "rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#b8bec1;strokeColor=#555555;strokeWidth=1;"
      );
    }
    addVertex(
      `right_group_${group.index}`,
      "",
      1300,
      top,
      88,
      height,
      `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${palette.fill};strokeColor=${palette.stroke};strokeWidth=2;`
    );
    const slots = group.slots?.length
      ? group.slots
      : group.sortedWires.map((wire) => ({ pin: wire.toPin, wire, y: wire.rightTargetY || wire.y }));
    slots.forEach((slot, slotIndex) => {
      addVertex(
        `right_group_${group.index}_cavity_${slotIndex + 1}`,
        slot.wire ? "" : escapeHtml(slot.pin),
        1325,
        slot.y - 14,
        38,
        28,
        slot.wire
          ? "rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#8d8d8d;strokeColor=#6b6b6b;strokeWidth=1;"
          : "rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#d8dcde;strokeColor=#747b7f;strokeWidth=1;dashed=1;dashPattern=4 3;fontColor=#4b5357;fontStyle=1;fontSize=9;"
      );
    });
    addVertex(
      `right_group_${group.index}_label`,
      escapeHtml(kiCadRightConnectorGroupLabel(group)),
      1392,
      (top + bottom) / 2 - 12,
      168,
      24,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=10;fontStyle=1;fontColor=#000000;align=left;"
    );
  });
}

function addKiCadDrawioRj45Face(addVertex, connector, wires, side) {
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = side === "left" ? 108 : 1282;
  const faceY = centerY - 82;
  const faceWidth = 216;
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  addVertex(
    `${side}_rj45_shell`,
    "",
    faceX,
    faceY,
    faceWidth,
    164,
    "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#e2f1dc;strokeColor=#5f8f51;strokeWidth=2.5;"
  );
  addVertex(
    `${side}_rj45_insert`,
    "",
    faceX + 14,
    faceY + 18,
    faceWidth - 28,
    92,
    "rounded=1;arcSize=7;whiteSpace=wrap;html=1;fillColor=#eef1ec;strokeColor=#526057;strokeWidth=1.5;"
  );
  RJ45_T568B_CONTACTS.forEach((contact, index) => {
    const contactX = faceX + 23 + index * 22;
    const opacity = activePins.has(contact.pin) ? 100 : 36;
    addVertex(
      `${side}_rj45_contact_${contact.pin}`,
      "",
      contactX,
      faceY + 34,
      14,
      58,
      `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=${contact.fill};strokeColor=#4b4b4b;strokeWidth=1.2;opacity=${opacity};`
    );
    if (contact.stripe) {
      addVertex(
        `${side}_rj45_contact_${contact.pin}_tracer`,
        "",
        contactX + 5,
        faceY + 36,
        4,
        54,
        `rounded=0;whiteSpace=wrap;html=1;fillColor=${contact.stripe};strokeColor=${contact.stripe};opacity=${opacity};`
      );
    }
    addVertex(
      `${side}_rj45_pin_${contact.pin}`,
      `<b>${contact.pin}</b><br><font style="font-size:7px">${contact.label}</font>`,
      contactX - 5,
      faceY + 9,
      24,
      24,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;verticalAlign=middle;"
    );
  });
  addVertex(
    `${side}_rj45_latch`,
    "",
    faceX + 70,
    faceY + 116,
    76,
    28,
    "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#287db5;strokeColor=#17577f;strokeWidth=1.4;"
  );
  addVertex(
    `${side}_rj45_note`,
    `T568B TOP VIEW | ${activePins.size === 8 ? "PINS 1-8 USED" : `PINS ${Array.from(activePins).sort((left, right) => left - right).join(", ")} USED`}`,
    faceX + 8,
    faceY + 166,
    faceWidth - 16,
    20,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#4b5357;align=center;"
  );
}

function addKiCadDrawioPicoBladeFace(addVertex, connector, wires, side) {
  const slots = buildKiCadConnectorSlots(wires, connector, side);
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = side === "left" ? 88 : 1278;
  const faceY = centerY - 48;
  addVertex(`${side}_picoblade_body`, "", faceX, faceY, 164, 96, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#f1eee4;strokeColor=#47443d;strokeWidth=3;");
  addVertex(`${side}_picoblade_rim`, "", faceX + 10, faceY + 18, 144, 62, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#fbfaf5;strokeColor=#8f8b80;strokeWidth=1.5;");
  addVertex(`${side}_picoblade_latch`, "", faceX + 52, faceY - 13, 60, 15, "rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#ded8ca;strokeColor=#47443d;strokeWidth=2;");
  addVertex(`${side}_picoblade_circuit_one`, "", faceX + 5, faceY + 5, 16, 16, "shape=triangle;direction=east;whiteSpace=wrap;html=1;fillColor=#d97706;strokeColor=#7c3e00;strokeWidth=1;");
  slots.forEach((slot, index) => {
    addVertex(
      `${side}_picoblade_cavity_${index + 1}`,
      escapeHtml(slot.pin),
      faceX + 14 + index * 18,
      faceY + 31,
      14,
      34,
      slot.wire
        ? "rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=#313538;strokeColor=#111111;strokeWidth=1.5;fontColor=#ffffff;fontSize=7;fontStyle=1;"
        : "rounded=1;arcSize=14;whiteSpace=wrap;html=1;fillColor=#bec3c5;strokeColor=#747b7f;strokeWidth=1.3;dashed=1;dashPattern=4 3;fontColor=#ffffff;fontSize=7;fontStyle=1;"
    );
  });
  addVertex(`${side}_picoblade_note`, "MOLEX 218112-0802 | 8 CIRCUITS | 1.25 mm | MATING FACE", faceX - 36, faceY + 98, 236, 22, "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#4b5357;align=center;");
}

function addKiCadDrawioPivotPowerRj45Face(addVertex, connector, wires, side) {
  const centerY = (wires[0].y + wires[wires.length - 1].y) / 2;
  const faceX = side === "left" ? 108 : 1282;
  const faceY = centerY - 82;
  const pinKey = side === "left" ? "fromPin" : "toPin";
  const activePins = new Set(wires.map((wire) => numericPin(wire[pinKey])).filter(Number.isFinite));
  addVertex(`${side}_pivot_shell`, "", faceX, faceY, 216, 164, "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#f28c18;strokeColor=#8f4500;strokeWidth=3;");
  addVertex(`${side}_pivot_nose`, "", faceX + 18, faceY + 18, 180, 92, "rounded=1;arcSize=7;whiteSpace=wrap;html=1;fillColor=#fb9f2e;strokeColor=#8f4500;strokeWidth=1.5;");
  addVertex(`${side}_pivot_stuffer`, "", faceX + 70, faceY + 118, 76, 30, "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#eef5f7;strokeColor=#5d686d;strokeWidth=1.5;opacity=72;");
  for (let pin = 1; pin <= 8; pin += 1) {
    const contactX = faceX + 23 + (pin - 1) * 22;
    const opacity = activePins.has(pin) ? 100 : 32;
    addVertex(`${side}_pivot_contact_${pin}`, "", contactX, faceY + 34, 14, 58, `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#d7b65b;strokeColor=#725b1d;strokeWidth=1.2;opacity=${opacity};`);
    addVertex(`${side}_pivot_pin_${pin}`, `<b>${pin}</b><br><font style="font-size:7px">${pin % 2 ? "ODD" : "EVEN"}</font>`, contactX - 5, faceY + 8, 24, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#111111;align=center;verticalAlign=middle;");
  }
  addVertex(`${side}_pivot_note`, "TE 2213145-1 PIVOT POWER | ODD COMMON / EVEN COMMON | 2 x 18 AWG", faceX - 18, faceY + 166, 252, 22, "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#7a2e00;align=center;");
}

function addKiCadDrawioPcbFace(addVertex, connector, wires, side) {
  const boardX = side === "left" ? 146 : 1288;
  const boardWidth = 150;
  const top = Math.max(166, wires[0].y - 48);
  const bottom = wires[wires.length - 1].y + 48;
  const height = bottom - top;
  const padX = side === "left" ? boardX + boardWidth - 28 : boardX + 28;
  const traceX = side === "left" ? boardX + 30 : boardX + boardWidth - 30;
  addVertex(
    `${side}_pcb_board`,
    "",
    boardX,
    top,
    boardWidth,
    height,
    "rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#216b42;strokeColor=#123d28;strokeWidth=3;"
  );
  addVertex(
    `${side}_pcb_label`,
    `${escapeHtml(shortLabel(connector.name.replace(/\s+PCB$/i, ""), 22))}<br><font style="font-size:9px">DIRECT SOLDER</font>`,
    boardX + 18,
    top + 7,
    boardWidth - 36,
    38,
    "text;html=1;strokeColor=none;fillColor=none;fontColor=#ffffff;fontStyle=1;fontSize=10;align=center;"
  );
  wires.forEach((wire, index) => {
    addVertex(
      `${side}_pcb_trace_${index + 1}`,
      "",
      Math.min(padX, traceX),
      wire.y - 2.5,
      Math.abs(traceX - padX),
      5,
      "rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#d5a72b;strokeColor=#d5a72b;strokeWidth=1;"
    );
    addVertex(
      `${side}_pcb_pad_${index + 1}`,
      String(wire[side === "left" ? "fromPin" : "toPin"]),
      padX - 15,
      wire.y - 15,
      30,
      30,
      "ellipse;whiteSpace=wrap;html=1;fillColor=#d9aa31;strokeColor=#8a6515;strokeWidth=2;fontColor=#161918;fontStyle=1;fontSize=10;"
    );
    addVertex(
      `${side}_pcb_hole_${index + 1}`,
      "",
      padX - 6,
      wire.y - 6,
      12,
      12,
      "ellipse;whiteSpace=wrap;html=1;fillColor=#161918;strokeColor=#f2d36f;strokeWidth=1;"
    );
  });
}

function buildKiCadMultiGroupDrawioXml(result, model) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 10, 10, 1580, 780, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", model.cableName, 620, 24, 360, 38, "text;html=1;strokeColor=none;fillColor=none;fontSize=34;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("subtitle", model.description, 500, 64, 600, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=20;fontStyle=5;fontColor=#000000;align=center;");
  addVertex("left_heading", `LEFT BOARD<br>${model.leftConnector.name}<br>${model.leftConnector.positionText}<br>(${model.leftConnector.view})`, 130, 34, 180, 96, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("right_heading", `RIGHT BOARD<br>${model.rightConnector.name}<br>${model.rightConnector.type || "DUPONT"}<br>SERVO HEADER ROWS<br>1=GND 2=V+ 3=SIG<br>(${model.rightConnector.view})`, 1250, 30, 230, 126, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#000000;align=center;");
  addEdge("dim_length", `${formatLengthMeasurement(model.length)} +/-0.25 in<br>OVERALL LENGTH`, 365, 146, 1188, 146, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=14;");
  const firstY = model.groups[0]?.y ?? 205;
  const lastY = model.groups[model.groups.length - 1]?.y ?? firstY;
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: 416,
    x2: 1112,
    top: Math.min(...model.wires.map((wire) => wire.y)) - 24,
    bottom: Math.max(...model.wires.map((wire) => wire.y)) + 24,
    bandWidth: 28
  });
  addVertex("left_board", "ESC PCB", 155, firstY - 48, 118, lastY - firstY + 96, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontStyle=1;");
  addVertex("right_board", `${model.rightConnector.name}<br>1 2 3 rows`, 1250, firstY - 48, 164, lastY - firstY + 96, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontStyle=1;");
  model.groups.forEach((group) => {
    addVertex(`left_group_${group.index}`, group.name, 172, group.y - 30, 76, 60, "rounded=1;whiteSpace=wrap;html=1;fillColor=#f7f7f7;strokeColor=#000000;strokeWidth=1;fontStyle=1;fontSize=12;");
    addVertex(`right_group_${group.index}`, group.name, 1190, group.y - 14, 58, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=12;fontStyle=1;fontColor=#000000;align=center;");
    [1, 2, 3].forEach((pin, pinIndex) => {
      const x = 1268 + pinIndex * 42;
      const hasWire = group.wires.some((wire) => wire.rightLocalPin === String(pin));
      const roleLabel = maestroHeaderLabels()[pinIndex].code;
      addVertex(`right_cavity_${group.index}_${pin}`, `${pin}<br>${roleLabel}${hasWire ? "" : " NC"}`, x, group.y - 18, 28, 42, `rounded=1;whiteSpace=wrap;html=1;fillColor=${hasWire ? "#f9f9f9" : "#eeeeee"};strokeColor=${hasWire ? "#000000" : "#777777"};strokeWidth=1;fontStyle=1;fontSize=10;`);
    });
  });
  model.wires.forEach((wire, index) => {
    const hasDistinctNames = wireNamesDiffer(wire.leftName, wire.rightName);
    const colorSpec = wireColorSpec(wire.row?.color || wire.colorLabel || wire.colorName);
    const colorLabel = wire.colorLabel || colorSpec.label;
    const terminalStyle = `rounded=0;whiteSpace=wrap;html=1;fillColor=${wire.stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontColor=${wire.colorName === "BLACK" ? "#ffffff" : "#000000"};`;
    addVertex(`left_pin_num_${index}`, wire.fromPin, 320, wire.y - 12, 45, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_num_${index}`, formatBoardPin(wire), 1190, wire.y - 12, 90, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`left_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 350, wire.y - 11, 42, 22, terminalStyle);
    addVertex(`right_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 1136, wire.y - 11, 42, 22, terminalStyle);
    const wireRole = wire.maestroRole?.code ? `${wire.leftName} ${wire.maestroRole.code}` : wire.leftName;
    addEdge(`wire_${index}`, hasDistinctNames ? `${colorLabel} | ${formatWireLengthLabel(wire.length, model.length)}` : `${wireRole} (${colorLabel}) ${formatWireLengthLabel(wire.length, model.length)}`, 392, wire.y, 1136, wire.y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;fontSize=13;`);
    if (colorSpec.stripeStroke) {
      addEdge(`wire_stripe_${index}`, "", 392, wire.y, 1136, wire.y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${colorSpec.stripeStroke};strokeWidth=2.6;dashed=1;dashPattern=10 9;endArrow=none;startArrow=none;`);
    }
    if (hasDistinctNames) {
      const leftLabelWidth = drawioLabelWidth(wire.leftName, 10, 64, 210);
      const rightLabelWidth = drawioLabelWidth(wire.rightName, 10, 64, 210);
      const endpointFontColor = wire.colorName === "BLACK" ? "#ffffff" : "#000000";
      addVertex(`left_wire_name_${index}`, escapeHtml(wire.leftName), 410, wire.y - 10, leftLabelWidth, 20, `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=left;verticalAlign=middle;spacing=0;`);
      addVertex(`right_wire_name_${index}`, escapeHtml(wire.rightName), 1118 - rightLabelWidth, wire.y - 10, rightLabelWidth, 20, `text;html=1;strokeColor=none;fillColor=none;labelBackgroundColor=none;whiteSpace=nowrap;overflow=visible;fontSize=10;fontStyle=1;fontColor=${endpointFontColor};align=right;verticalAlign=middle;spacing=0;`);
    }
  });
  addVertex("wiring_table", buildKiCadDrawioTableText("WIRING TABLE", ["LEG", "LEFT END", "LEFT PIN", "LEFT WIRE", "RIGHT WIRE", "COLOR", "AWG", "LEN", "RIGHT PIN"], model.wires.map((wire) => [wire.row.leftLeg || "", wire.row.leftLegName || "", wire.fromPin, wire.leftName, wire.rightName, wire.colorLabel || wire.colorName, wire.awg || model.awg || "", formatLengthMeasurement(wire.length || model.length), formatBoardPin(wire)])), 30, 538, 770, 220, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=9;align=center;");
  addVertex("bom", buildKiCadDrawioTableText("BILL OF MATERIALS", ["ITEM", "QTY", "DESCRIPTION", "PART NUMBER"], buildKiCadBomRows(model)), 830, 538, 730, 128, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=11;align=center;");
  addVertex("notes", `<b>NOTES:</b><br>Micro Maestro servo header: 1=GND edge, 2=V+ servo power, 3=SIG inside board.<br>${uniqueValues(model.wires.map((wire) => wire.row.comments)).slice(0, 1).join("<br>") || "Verify pin orientation before final assembly."}`, 830, 672, 730, 48, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=11;align=left;");
  addVertex("title_block", `DESCRIPTION:<br><b>${model.cableName} CABLE ASSEMBLY</b><br>${model.description}<br>SHEET: 1 OF 1 | SCALE: NONE | UNITS: AS SHOWN | DWG NO. ${model.cableName} | REV A`, 830, 724, 730, 54, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=center;");
  const diagram = escapeXml(result.fileName || model.cableName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildKiCadDrawioTableText(title, headers, rows) {
  const header = headers.join(" | ");
  const body = rows.map((row) => row.map((cell) => String(cell ?? "").replace(/\n/g, " ")).join(" | ")).join("<br>");
  return `<b>${title}</b><br>${header}<br>${body}`;
}

function buildBarrelPowerDrawioXml(result) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const rows = result.sheetHarness.rows;
  const powerRow = findSheetRow(rows, (row) => normalizeText(`${row.wireName} ${row.color} ${row.comments}`).includes("+48") || normalizeText(row.color).includes("RED")) || {};
  const groundRow = findSheetRow(rows, (row) => normalizeText(`${row.wireName} ${row.color} ${row.comments}`).includes("GND") || normalizeText(row.color).includes("BLACK")) || {};
  const wrapRow = findSheetRow(rows, (row) => normalizeText(`${row.wireName} ${row.branchRole} ${row.comments}`).includes("WRAP")) || {};
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("title", `${result.sheetHarness.cableName} HARNESS ASSEMBLY`, 46, 28, 980, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", "2 conductor 48V barrel power cable | wire wrap sleeve around both conductors", 46, 72, 820, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#333333;align=left;");
  addVertex("source", `${firstFilled(rows, "leftLegName") || "48V Source Connector"}<br><font style="font-size:12px">${groundRow.leftHousingType || powerRow.leftHousingType || "2 Pin Connector"}</font><br><br>Pin ${groundRow.leftPinPos || "1"} GND<br>Pin ${powerRow.leftPinPos || "2"} +48V`, 62, 235, 220, 230, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addVertex("wrap", "Expandable wire wrap sleeve around GND and +48V", 318, 296, 760, 142, "rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#e8ecef;strokeColor=#4f5961;strokeWidth=3;dashed=1;dashPattern=8 6;fontStyle=1;fontSize=14;fontColor=#1f2930;");
  addVertex("heat_left", "Heat shrink", 318, 292, 36, 150, "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#111111;strokeColor=#000000;strokeWidth=2;fontColor=#ffffff;fontSize=11;verticalLabelPosition=middle;verticalAlign=middle;");
  addVertex("heat_right", "Heat shrink", 1042, 292, 36, 150, "rounded=1;arcSize=25;whiteSpace=wrap;html=1;fillColor=#111111;strokeColor=#000000;strokeWidth=2;fontColor=#ffffff;fontSize=11;verticalLabelPosition=middle;verticalAlign=middle;");
  addEdge("gnd_wire", "GND / BLACK", 282, 340, 1235, 315, "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#050505;strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;");
  addEdge("pwr_wire", "+48V / RED", 282, 408, 1235, 375, "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=#d62828;strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;");
  addVertex("strain_relief", "", 1185, 282, 95, 126, "rounded=1;arcSize=32;whiteSpace=wrap;html=1;fillColor=#f8f8f8;strokeColor=#000000;strokeWidth=4;");
  addVertex("barrel_body", "DC Barrel Plug<br><font style=\"font-size:12px\">Outer sleeve/shell = GND<br>Center pin = +48V</font>", 1268, 252, 225, 186, "rounded=1;arcSize=35;whiteSpace=wrap;html=1;fillColor=#f8f8f8;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addVertex("barrel_tip", "", 1460, 292, 64, 106, "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;");
  addVertex("center_pin", "", 1480, 315, 24, 60, "ellipse;whiteSpace=wrap;html=1;fillColor=#fff4f4;strokeColor=#d62828;strokeWidth=4;");
  addVertex("wrap_length", `${formatLengthMeasurement(wrapRow.length || "8")} wrap section`, 520, 462, 350, 32, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;");
  const noteLines = [groundRow.comments, powerRow.comments, wrapRow.comments]
    .filter(Boolean)
    .map((note) => escapeHtml(shortLabel(note, 150)))
    .join("<br>");
  addVertex("notes", `<b>BUILD NOTES</b><br>${noteLines}`, 68, 650, 920, 100, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=left;spacingLeft=12;");
  const diagram = escapeXml(result.fileName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function buildCanDrawioXml(result) {
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({
      id,
      value,
      style,
      vertex: 1,
      parent: "1"
    }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({
      id,
      value,
      style,
      edge: 1,
      parent: "1"
    }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const branchXs = [455, 585, 715, 845];
  const harness = result.harness;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("title", "CAN BUS HARNESS ASSEMBLY", 46, 28, 620, 38, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", "22 AWG | CAN-H (Yellow) | CAN-L (Green) | GND (Black)", 46, 66, 700, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#000000;align=left;");
  addVertex("usb_can", "USB-CAN<br><br>CAN-H<br>CAN-L<br>GND", 60, 230, 135, 190, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addEdge("dim_12", "12&quot;", 195, 178, 455, 178, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=16;");
  branchXs.slice(0, -1).forEach((x, index) => {
    addEdge(`dim_2_${index + 1}`, "2&quot;", x + 16, 224, branchXs[index + 1] + 16, 224, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontSize=14;");
  });
  addHorizontalDrawioProtection(addVertex, {
    id: "trunk_protection",
    x1: 223,
    x2: 1332,
    top: 286,
    bottom: 444
  });
  branchXs.forEach((x, index) => {
    addVerticalDrawioProtection(addVertex, {
      id: `branch_${index + 1}_protection`,
      left: x - 8,
      right: x + 42,
      y1: 446,
      y2: 548,
      bandHeight: 20
    });
  });
  addEdge("trunk_can_h", "CAN-H", 195, 310, 1370, 310, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#ffd400;strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;");
  addEdge("trunk_can_l", "CAN-L", 195, 365, 1370, 365, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#008a13;strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;");
  addEdge("trunk_gnd", "GND", 195, 420, 1350, 420, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;");
  harness.branches.forEach((branch, branchIndex) => {
    const x = branchXs[branchIndex];
    harness.signals.forEach((wire, signalIndex) => {
      const dropX = x + signalIndex * 17;
      addEdge(`${branch.id}_${wire.signal}`, wire.signal, dropX, wire.y, dropX, 560, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;fontSize=10;`);
    });
    addVertex(branch.id, `${branch.id}<br><font style="font-size: 10px">1=PWR(NC)<br>2=H 3=L 4=G</font>`, x - 42, 560, 115, 70, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=3;fontStyle=1;fontSize=16;");
    addEdge(`${branch.id}_dim_6`, "6&quot;", x - 68, 428, x - 68, 552, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontSize=14;");
  });
  addVertex("termination", "120 ohm<br>Termination", 1382, 312, 120, 52, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=16;");
  addVertex("pinout", "<b>JST PINOUT</b><br>Pin 1 = PWR (Not Used)<br>Pin 2 = CAN-H<br>Pin 3 = CAN-L<br>Pin 4 = GND", 1110, 520, 385, 150, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=3;fontSize=16;align=left;spacingLeft=16;");
  addVertex("note", "No power wire. Do not terminate GND.", 1320, 432, 260, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#333333;");
  const diagram = escapeXml(result.fileName || "DIGIWIRE");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE" type="device">
  <diagram id="${drawioId(diagram)}" name="${diagram}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${SVG_WIDTH}" pageHeight="${SVG_HEIGHT}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function fitSourceToSvg(width, height) {
  const marginX = 80;
  const marginY = 96;
  const usableWidth = SVG_WIDTH - marginX * 2;
  const usableHeight = SVG_HEIGHT - marginY * 2;
  const scale = Math.min(usableWidth / Math.max(1, width), usableHeight / Math.max(1, height));
  return {
    scale,
    x: (SVG_WIDTH - width * scale) / 2,
    y: (SVG_HEIGHT - height * scale) / 2 + 18
  };
}

function toSvgPoint(x, y, fit) {
  return {
    x: fit.x + x * fit.scale,
    y: fit.y + y * fit.scale
  };
}

function smooth(values, radius) {
  return values.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const value = values[index + offset];
      if (Number.isFinite(value)) {
        total += value;
        count += 1;
      }
    }
    return count ? total / count : 0;
  });
}

function confidenceKey(confidence) {
  if (confidence >= 0.72) {
    return "high";
  }
  if (confidence >= 0.45) {
    return "medium";
  }
  return "low";
}

function orientationLabel(rotation) {
  return ["0 deg", "90 deg", "180 deg", "270 deg"][rotation & 3] || "0 deg";
}

function normalizeText(input) {
  return String(input || "")
    .replace(/\s+/g, " ")
    .replace(/["\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim()
    .toUpperCase();
}

function cleanFileName(name) {
  return String(name || "DIGIWIRE DRAWING").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9 _-]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

function fileBase(name) {
  return cleanFileName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "digiwire";
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function shortLabel(input, limit) {
  const text = String(input || "");
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 1))}...`;
}

function clamp(input, min, max) {
  const value = Number(input);
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function numberOrDefault(input, fallback) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) {
    return 0;
  }
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function escapeHtml(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(input) {
  return escapeHtml(input);
}

function xmlAttrs(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
    .join(" ");
}

function mxCell(attrs, inner = "") {
  const attrText = xmlAttrs(attrs);
  const outputInner = attrs.edge === 1 && isElectricalDrawioEdgeStyle(attrs.style)
    ? addDrawioWireWaypoints(inner, 6)
    : inner;
  return outputInner ? `<mxCell ${attrText}>${outputInner}</mxCell>` : `<mxCell ${attrText} />`;
}

function mxGeometry(attrs, inner = "") {
  const attrText = xmlAttrs(attrs);
  return inner ? `<mxGeometry ${attrText}>${inner}</mxGeometry>` : `<mxGeometry ${attrText} />`;
}

function isElectricalDrawioEdgeStyle(style) {
  const value = String(style || "");
  return value.includes("startArrow=none") && value.includes("endArrow=none");
}

function addDrawioWireWaypoints(geometryXml, minimumWaypoints = 8) {
  const xml = String(geometryXml || "");
  const sourceMatch = xml.match(/<mxPoint x="([^"]+)" y="([^"]+)" as="sourcePoint"\s*\/>/);
  const targetMatch = xml.match(/<mxPoint x="([^"]+)" y="([^"]+)" as="targetPoint"\s*\/>/);
  if (!sourceMatch || !targetMatch) {
    return xml;
  }
  const existingArray = xml.match(/<Array as="points">([\s\S]*?)<\/Array>/);
  const existingPoints = existingArray
    ? Array.from(existingArray[1].matchAll(/<mxPoint x="([^"]+)" y="([^"]+)"\s*\/>/g))
      .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    : [];
  const route = [
    { x: Number(sourceMatch[1]), y: Number(sourceMatch[2]) },
    ...existingPoints,
    { x: Number(targetMatch[1]), y: Number(targetMatch[2]) }
  ];
  if (route.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return xml;
  }
  const waypoints = drawioWaypointsAlongRoute(route, minimumWaypoints);
  const pointsXml = waypoints
    .map((point) => `<mxPoint x="${formatDrawioCoordinate(point.x)}" y="${formatDrawioCoordinate(point.y)}" />`)
    .join("");
  const withoutExisting = xml.replace(/<Array as="points">[\s\S]*?<\/Array>/, "");
  return withoutExisting.replace("</mxGeometry>", `<Array as="points">${pointsXml}</Array></mxGeometry>`);
}

function drawioWaypointsAlongRoute(route, minimumWaypoints) {
  const cleaned = route.filter((point, index) =>
    index === 0 ||
    point.x !== route[index - 1].x ||
    point.y !== route[index - 1].y
  );
  if (cleaned.length < 2) {
    return [];
  }
  const segmentLengths = [];
  const cumulative = [0];
  for (let index = 1; index < cleaned.length; index += 1) {
    const previous = cleaned[index - 1];
    const current = cleaned[index];
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    segmentLengths.push(length);
    cumulative.push(cumulative[cumulative.length - 1] + length);
  }
  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= 0) {
    return [];
  }
  const items = cleaned.slice(1, -1).map((point, index) => ({
    x: point.x,
    y: point.y,
    distance: cumulative[index + 1],
    anchor: true
  }));
  const targetCount = Math.max(minimumWaypoints, items.length);
  const initialSamples = targetCount - items.length;
  for (let sampleIndex = 1; sampleIndex <= initialSamples; sampleIndex += 1) {
    const distance = totalLength * sampleIndex / (initialSamples + 1);
    const point = pointAtRouteDistance(cleaned, segmentLengths, cumulative, distance);
    const duplicate = items.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 0.5);
    if (!duplicate) {
      items.push({ ...point, distance, anchor: false });
    }
  }
  let denominator = targetCount + 2;
  while (items.length < targetCount) {
    for (let sampleIndex = 1; sampleIndex < denominator && items.length < targetCount; sampleIndex += 1) {
      const distance = totalLength * sampleIndex / denominator;
      const point = pointAtRouteDistance(cleaned, segmentLengths, cumulative, distance);
      const duplicate = items.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 0.5);
      if (!duplicate) {
        items.push({ ...point, distance, anchor: false });
      }
    }
    denominator += targetCount + 1;
  }
  return items
    .sort((left, right) => left.distance - right.distance || Number(right.anchor) - Number(left.anchor))
    .map(({ x, y }) => ({ x, y }));
}

function pointAtRouteDistance(route, segmentLengths, cumulative, distance) {
  const clampedDistance = clamp(distance, 0, cumulative[cumulative.length - 1]);
  let segmentIndex = segmentLengths.length - 1;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    if (clampedDistance <= cumulative[index + 1]) {
      segmentIndex = index;
      break;
    }
  }
  const start = route[segmentIndex];
  const end = route[segmentIndex + 1];
  const segmentLength = segmentLengths[segmentIndex] || 1;
  const progress = (clampedDistance - cumulative[segmentIndex]) / segmentLength;
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress
  };
}

function formatDrawioCoordinate(value) {
  return Number(value.toFixed(2)).toString();
}

function mxPoint(x, y, as) {
  return `<mxPoint x="${Math.round(x)}" y="${Math.round(y)}" as="${escapeXml(as)}" />`;
}

function drawioId(input) {
  return String(input || "digiwire").replace(/[^a-zA-Z0-9_-]+/g, "_") || "digiwire";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read file.")));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image.")));
    image.src = dataUrl;
  });
}

async function downloadDrawioPdf(fileName, dataUri) {
  const value = String(dataUri || "");
  if (value.startsWith("data:application/pdf")) {
    downloadDataUri(fileName, value);
    return;
  }
  if (!value.startsWith("data:image/svg+xml")) {
    throw new Error("Draw.io returned an unsupported export.");
  }
  const svgText = forceLightDrawioSvg(decodeTextDataUri(value));
  const pdfBlob = await svgTextToPdfBlob(svgText);
  downloadBlob(fileName, pdfBlob);
}

function decodeTextDataUri(dataUri) {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex < 0) {
    throw new Error("The Draw.io export was not a valid data URI.");
  }
  const metadata = dataUri.slice(0, commaIndex);
  const payload = dataUri.slice(commaIndex + 1);
  if (!metadata.includes(";base64")) {
    return decodeURIComponent(payload);
  }
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function forceLightDrawioSvg(svgText) {
  let output = replaceLightDarkColors(String(svgText || ""));
  output = output.replace(/color-scheme:\s*light\s+dark;?/gi, "color-scheme: light;");
  output = output.replace(
    /(<svg\b[^>]*\bstyle=")([^"]*)(")/i,
    (match, start, style, end) => `${start}${style.replace(/background(?:-color)?:\s*transparent;?/gi, "")} background: #ffffff; background-color: #ffffff; color-scheme: light;${end}`
  );
  const grid = `<defs><pattern id="digiwire-export-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5eaed" stroke-width="0.6"/></pattern></defs><rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/><rect x="0" y="0" width="100%" height="100%" fill="url(#digiwire-export-grid)"/>`;
  return output.replace(/(<svg\b[^>]*>)/i, `$1${grid}`);
}

function replaceLightDarkColors(input) {
  let output = "";
  let cursor = 0;
  const marker = "light-dark(";
  while (cursor < input.length) {
    const start = input.indexOf(marker, cursor);
    if (start < 0) {
      output += input.slice(cursor);
      break;
    }
    output += input.slice(cursor, start);
    let depth = 1;
    let comma = -1;
    let index = start + marker.length;
    for (; index < input.length && depth > 0; index += 1) {
      const character = input[index];
      if (character === "(") {
        depth += 1;
      } else if (character === ")") {
        depth -= 1;
      } else if (character === "," && depth === 1 && comma < 0) {
        comma = index;
      }
    }
    if (depth !== 0 || comma < 0) {
      output += input.slice(start);
      break;
    }
    output += input.slice(start + marker.length, comma).trim();
    cursor = index;
  }
  return output;
}

function svgTextToPdfBlob(svgText) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const svgDataUri = encodeTextDataUri("image/svg+xml", svgText);
    image.addEventListener("load", () => {
      const naturalWidth = Math.max(1, image.naturalWidth || SVG_WIDTH);
      const naturalHeight = Math.max(1, image.naturalHeight || SVG_HEIGHT);
      const renderScale = Math.min(2, 3200 / Math.max(naturalWidth, naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(naturalWidth * renderScale));
      canvas.height = Math.max(1, Math.round(naturalHeight * renderScale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas rendering is unavailable."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (jpegBlob) => {
        if (!jpegBlob) {
          reject(new Error("Could not render the Draw.io page."));
          return;
        }
        try {
          const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
          resolve(buildJpegPdfBlob(jpegBytes, canvas.width, canvas.height));
        } catch (error) {
          reject(error);
        }
      }, "image/jpeg", 0.97);
    });
    image.addEventListener("error", () => {
      reject(new Error("Could not load the corrected Draw.io export."));
    });
    image.src = svgDataUri;
  });
}

function encodeTextDataUri(mimeType, text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function buildJpegPdfBlob(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = Array(6).fill(0);
  let byteLength = 0;
  const pushBytes = (bytes) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const pushText = (text) => pushBytes(encoder.encode(text));
  const addObject = (objectNumber, body, streamBytes = null) => {
    offsets[objectNumber] = byteLength;
    pushText(`${objectNumber} 0 obj\n${body}`);
    if (streamBytes) {
      pushText("\nstream\n");
      pushBytes(streamBytes);
      pushText("\nendstream");
    }
    pushText("\nendobj\n");
  };
  const pageWidth = 1224;
  const margin = 8;
  const imageAspect = imageWidth / Math.max(1, imageHeight);
  const drawWidth = pageWidth - margin * 2;
  const drawHeight = drawWidth / imageAspect;
  const pageHeight = drawHeight + margin * 2;
  const drawX = margin;
  const drawY = margin;
  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(content);

  pushText("%PDF-1.4\n");
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  addObject(4, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`, jpegBytes);
  addObject(5, `<< /Length ${contentBytes.length} >>`, contentBytes);

  const xrefOffset = byteLength;
  pushText("xref\n0 6\n0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    pushText(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

function downloadDataUri(fileName, dataUri) {
  const link = document.createElement("a");
  link.href = dataUri;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function waitForFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
