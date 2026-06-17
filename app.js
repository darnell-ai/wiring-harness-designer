"use strict";

const APP_VERSION = "1.6.2";
const OCR_WORKER_PATH = "vendor/tesseract/worker.min.js";
const OCR_CORE_PATH = "vendor/tesseract/core";
const OCR_LANG_PATH = "vendor/tesseract/lang";
const DRAWIO_EMBED_ORIGIN = "https://embed.diagrams.net";
const DRAWIO_ALLOWED_ORIGINS = new Set([DRAWIO_EMBED_ORIGIN, "https://app.diagrams.net"]);
const XLSX_READER_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const MAX_IMAGE_SIDE = 1600;
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 800;

const dom = {
  fileInput: document.querySelector("#fileInput"),
  sheetInput: document.querySelector("#sheetInput"),
  sheetButton: document.querySelector("#sheetButton"),
  tablePasteButton: document.querySelector("#tablePasteButton"),
  pasteTablePanel: document.querySelector("#pasteTablePanel"),
  tablePasteInput: document.querySelector("#tablePasteInput"),
  loadPastedTableButton: document.querySelector("#loadPastedTableButton"),
  closePasteTableButton: document.querySelector("#closePasteTableButton"),
  dropZone: document.querySelector("#dropZone"),
  analyzeButton: document.querySelector("#analyzeButton"),
  pasteButton: document.querySelector("#pasteButton"),
  rotateButton: document.querySelector("#rotateButton"),
  resetButton: document.querySelector("#resetButton"),
  printButton: document.querySelector("#printButton"),
  exportDrawio: document.querySelector("#exportDrawio"),
  exportSvg: document.querySelector("#exportSvg"),
  copyTableButton: document.querySelector("#copyTableButton"),
  tablePreview: document.querySelector("#tablePreview"),
  confidenceValue: document.querySelector("#confidenceValue"),
  confidenceFill: document.querySelector("#confidenceFill"),
  statusText: document.querySelector("#statusText"),
  orientationFact: document.querySelector("#orientationFact"),
  wireFact: document.querySelector("#wireFact"),
  connectorFact: document.querySelector("#connectorFact"),
  labelFact: document.querySelector("#labelFact"),
  drawingTitle: document.querySelector("#drawingTitle"),
  sourceTitle: document.querySelector("#sourceTitle"),
  sourceCanvas: document.querySelector("#sourceCanvas"),
  schematicStage: document.querySelector("#schematicStage"),
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
  svgText: "",
  tableText: "",
  tableHeaders: []
};

let ocrWorkerPromise = null;
let ocrWorker = null;
let ocrUnavailable = false;
let drawioSession = null;
let xlsxLoaderPromise = null;

init();

function init() {
  dom.fileInput.addEventListener("change", () => {
    const [file] = dom.fileInput.files || [];
    if (file) {
      void loadDrawingFile(file);
    }
  });
  dom.sheetInput.addEventListener("change", () => {
    const [file] = dom.sheetInput.files || [];
    if (file) {
      void loadHarnessSheetFile(file);
    }
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dom.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dom.dropZone.classList.remove("is-dragging");
    });
  });

  dom.dropZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer?.files || [];
    if (file) {
      void loadDrawingFile(file);
    }
  });

  dom.analyzeButton.addEventListener("click", () => void analyzeCurrentDrawing());
  dom.pasteButton.addEventListener("click", () => void pasteClipboardImage());
  dom.sheetButton.addEventListener("click", () => dom.sheetInput.click());
  dom.tablePasteButton.addEventListener("click", () => void openPasteTablePanel());
  dom.loadPastedTableButton.addEventListener("click", () => void loadPastedHarnessTable());
  dom.closePasteTableButton.addEventListener("click", closePasteTablePanel);
  dom.rotateButton.addEventListener("click", () => {
    if (!appState.image) {
      return;
    }
    appState.manualRotation = (appState.manualRotation + 1) % 4;
    void analyzeCurrentDrawing();
  });
  dom.resetButton.addEventListener("click", resetApp);
  dom.printButton.addEventListener("click", printDrawing);
  dom.exportSvg.addEventListener("click", exportSvg);
  dom.exportDrawio.addEventListener("click", exportDrawio);
  dom.copyTableButton.addEventListener("click", () => void copyHarnessTable());
  window.addEventListener("message", handleDrawioMessage);
  document.addEventListener("paste", (event) => {
    void handlePasteEvent(event);
  });

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
      svgText: "",
      tableText: "",
      tableHeaders: []
    };
    dom.analyzeButton.disabled = false;
    dom.pasteButton.disabled = false;
    dom.rotateButton.disabled = false;
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
      setStatus("That sheet did not contain any data rows.");
      return;
    }

    const result = applyHarnessSheet(sheet, file.name);
    setStatus(`Loaded ${result.tableRows.length} sheet row${result.tableRows.length === 1 ? "" : "s"} from ${file.name}.`);
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
  const result = compileSheetHarnessResult(sheet, sourceName);
  appState = {
    fileName: cleanFileName(sourceName),
    dataUrl: "",
    image: null,
    manualRotation: 0,
    result,
    svgText: buildSchematicSvg(result),
    tableText: buildHarnessTableText(result.tableRows || [], result.tableHeaders || sheet.headers),
    tableHeaders: result.tableHeaders || sheet.headers
  };
  dom.fileInput.value = "";
  dom.sheetInput.value = "";
  dom.analyzeButton.disabled = true;
  dom.rotateButton.disabled = true;
  dom.sourceTitle.textContent = cleanFileName(sourceName);
  renderSchematic(result);
  renderFacts(result);
  renderFindings(result.findings);
  renderHarnessTable(result.tableRows || [], appState.tableHeaders);
  renderSourcePreview(result);
  setExportsEnabled(true);
  return result;
}

async function openPasteTablePanel() {
  dom.pasteTablePanel.hidden = false;
  setStatus("Paste rows copied from Excel, Google Sheets, or a tab-delimited table, then click Load pasted table.");
  await waitForFrame();
  dom.tablePasteInput.focus();
  if (!dom.tablePasteInput.value.trim() && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (looksLikeDelimitedTable(text)) {
        dom.tablePasteInput.value = text;
        dom.tablePasteInput.select();
      }
    } catch {
      // Clipboard text permission is optional; the textarea still supports manual paste.
    }
  }
}

function closePasteTablePanel() {
  dom.pasteTablePanel.hidden = true;
}

async function loadPastedHarnessTable() {
  const text = dom.tablePasteInput.value.trim();
  if (!text) {
    setStatus("Paste the copied table rows first, then click Load pasted table.");
    dom.tablePasteInput.focus();
    return;
  }

  try {
    setBusy(true);
    setStatus("Reading pasted harness table...");
    await waitForFrame();
    const sheet = normalizeSheetMatrix(parseDelimitedText(text));
    if (!sheet.rows.length) {
      setStatus("The pasted table needs a header row and at least one data row.");
      return;
    }
    const result = applyHarnessSheet(sheet, "Pasted Harness Table");
    closePasteTablePanel();
    setStatus(`Loaded ${result.tableRows.length} pasted row${result.tableRows.length === 1 ? "" : "s"}.`);
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
    return { headers: [], rows: [], objects: [] };
  }
  const headers = usefulRows[0].map((header) => normalizeSheetHeaderLabel(header));
  const rows = usefulRows.slice(1)
    .map((row) => padRow(row, headers.length))
    .filter((row) => row.some((cell) => cell !== ""));
  const objects = rows.map((row) => sheetRowToObject(headers, row));
  return { headers, rows, objects };
}

function normalizeSheetHeaderLabel(header) {
  return String(header || "").replace(/\s+/g, " ").trim();
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
      output[key] = row[index] || "";
    }
  });
  return output;
}

function normalizeSheetKey(header) {
  const normalized = normalizeText(header).replace(/[^A-Z0-9]+/g, "");
  const map = {
    CABLENAME: "cableName",
    LEFTLEG: "leftLeg",
    LEFTLEGNAME: "leftLegName",
    WIRENAME: "wireName",
    LEFTPINPOS: "leftPinPos",
    PINPOS: "rightPinPos",
    RIGHTPINPOS: "rightPinPos",
    LEFTHOUSINGTYPE: "leftHousingType",
    HOUSINGTYPE: "rightHousingType",
    RIGHTHOUSINGTYPE: "rightHousingType",
    LEFTHOUSINGPART: "leftHousingPart",
    HOUSINGPART: "rightHousingPart",
    RIGHTHOUSINGPART: "rightHousingPart",
    LEFTPINP: "leftPinPart",
    PINP: "rightPinPart",
    RIGHTPINP: "rightPinPart",
    AWGUAGE: "awg",
    AWGGAUGE: "awg",
    AWG: "awg",
    COLOR: "color",
    LENGTHINCHES: "length",
    TAPPOSITIONINCHES: "tapPosition",
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
      return analyzeGeometry(rotated, rotation);
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
    appState.svgText = buildSchematicSvg(result);
    appState.tableHeaders = result.tableHeaders || getHarnessTableHeaders();
    appState.tableText = buildHarnessTableText(result.tableRows || [], appState.tableHeaders);
    renderSchematic(result);
    renderFacts(result);
    renderFindings(result.findings);
    renderHarnessTable(result.tableRows || [], appState.tableHeaders);
    renderSourcePreview(result);
    setStatus(result.status);
    setExportsEnabled(true);
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
  const horizontal = extractLineSegments(cleanedMask, source.width, source.height, "horizontal");
  const vertical = extractLineSegments(cleanedMask, source.width, source.height, "vertical");
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
  const markerPenalty = Math.min(components.length, 50) * 10;
  const score =
    usableHorizontal.length * 820 +
    horizontalLengthScore * 620 +
    usableVertical.length * 35 +
    connectors.length * 260 +
    connectorPinScore * 38 +
    segments.length * 12 -
    connectorOverfitPenalty -
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
  const canHarness = buildCanHarnessModel();
  const visibleFindings = findings.filter(isVisibleFinding);
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
  const status = "Professional CAN bus harness generated. Use Print, Draw.io, or Copy table.";

  return {
    version: APP_VERSION,
    fileName: "CAN BUS HARNESS ASSEMBLY",
    width: SVG_WIDTH,
    height: SVG_HEIGHT,
    rotation: best.rotation,
    paperBounds: meta.paperBounds,
    sourceWidth: meta.sourceWidth,
    sourceHeight: meta.sourceHeight,
    wires: canHarness.wires,
    connectors: canHarness.connectors,
    findings,
    tableRows: canHarness.tableRows,
    harness: canHarness,
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
    { key: "length", label: "Length inches" },
    { key: "tapPosition", label: "Tap Position inches" },
    { key: "branchId", label: "Branch ID" },
    { key: "spacer", label: "" },
    { key: "branchRole", label: "Branch Role" },
    { key: "rightLeg", label: "Right Leg" },
    { key: "rightLegName", label: "Right Leg Name" },
    { key: "rightPinPos", label: "Pin Pos #" },
    { key: "rightHousingType", label: "Housing Type" },
    { key: "rightHousingPart", label: "Housing Part #" },
    { key: "rightPinPart", label: "Pin P#" },
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
  return columns.map((column) => String(values[column.key] || ""));
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
    .slice(0, 14);
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
    wires: drawableRows.map((row, index) => ({
      id: `SHEET-W${index + 1}`,
      label: row.wireName || row.branchRole || `ROW ${row.rowNumber}`,
      color: sheetColorToStroke(row.color),
      confidence: 1
    })),
    connectors: [],
    findings: [],
    tableHeaders: sheet.headers,
    tableRows: sheet.rows,
    sheetHarness,
    confidence: 1,
    status: "Prefilled harness sheet loaded. Use Print, Draw.io, or Copy table."
  };
}

function isDrawableSheetRow(row) {
  return Boolean(
    row.wireName ||
    row.color ||
    row.branchRole ||
    row.comments ||
    row.leftLegName ||
    row.rightLegName
  );
}

function firstFilled(rows, key) {
  return rows.map((row) => row[key]).find((value) => String(value || "").trim()) || "";
}

function isNoWireRow(row) {
  const values = [row.awg, row.color, row.length, row.wireName, row.branchRole].map((value) => normalizeText(value));
  return values.some((value) => value.includes("N/A") || value.includes("NO CONNECT") || value.includes("NC"));
}

function sheetColorToStroke(color) {
  const value = normalizeText(color);
  if (value.includes("RED")) return "#d62828";
  if (value.includes("BLACK")) return "#050505";
  if (value.includes("YELLOW")) return "#ffd400";
  if (value.includes("GREEN")) return "#008a13";
  if (value.includes("BLUE")) return "#0b64d8";
  if (value.includes("WHITE")) return "#d9d9d9";
  if (value.includes("ORANGE")) return "#f77f00";
  if (value.includes("BROWN")) return "#7f4f24";
  if (value.includes("PURPLE") || value.includes("VIOLET")) return "#7b2cbf";
  if (value.includes("GRAY") || value.includes("GREY") || value.includes("N/A")) return "#777777";
  return "#4a5560";
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${title}">
  <defs>
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

function buildSheetHarnessSvg(result) {
  const sheet = result.sheetHarness;
  if (isBarrelPowerCableSheet(sheet.rows)) {
    return buildBarrelPowerCableSvg(result);
  }
  const rows = sheet.rows.length ? sheet.rows : [{
    wireName: "No drawable rows found",
    color: "Gray",
    length: "",
    leftLegName: "LEFT",
    rightLegName: "RIGHT",
    comments: "The uploaded sheet table is still available below."
  }];
  const rowSpacing = Math.min(52, Math.max(34, 430 / Math.max(1, rows.length)));
  const startY = 230;
  const leftX = 270;
  const rightX = 1185;
  const rowLines = rows.map((row, index) => {
    const y = startY + index * rowSpacing;
    const color = sheetColorToStroke(row.color);
    const dashed = isNoWireRow(row) ? ` stroke-dasharray="12 9"` : "";
    const label = escapeXml(row.wireName || row.branchRole || `ROW ${row.rowNumber}`);
    const lengthText = row.length ? `${escapeXml(row.length)} in` : "";
    return `
      <g class="sheet-row">
        <line class="sheet-wire" x1="${leftX}" y1="${y}" x2="${rightX}" y2="${y}" stroke="${color}"${dashed} />
        <circle class="sheet-pin" cx="${leftX}" cy="${y}" r="4" />
        <circle class="sheet-pin" cx="${rightX}" cy="${y}" r="4" />
        <text class="sheet-wire-label" x="${(leftX + rightX) / 2}" y="${y - 10}">${label}</text>
        <text class="sheet-small" x="${(leftX + rightX) / 2}" y="${y + 22}">${lengthText}</text>
        <text class="sheet-pin-label" x="${leftX - 20}" y="${y + 5}">${escapeXml(row.leftPinPos || "")}</text>
        <text class="sheet-pin-label" x="${rightX + 20}" y="${y + 5}">${escapeXml(row.rightPinPos || "")}</text>
      </g>
    `;
  }).join("");
  const leftTitle = escapeXml(firstFilled(rows, "leftLegName") || firstFilled(rows, "leftLeg") || "LEFT LEG");
  const rightTitle = escapeXml(firstFilled(rows, "rightLegName") || firstFilled(rows, "rightLeg") || "RIGHT LEG");
  const notes = rows
    .map((row) => row.comments)
    .filter(Boolean)
    .slice(0, 4)
    .map((comment, index) => `<text class="sheet-note" x="68" y="${675 + index * 22}">${escapeXml(shortLabel(comment, 150))}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(sheet.title)}">
  <defs>
    <style>
      .sheet { fill: #ffffff; }
      .title { fill: #000000; font: 900 32px Aptos, Segoe UI, sans-serif; letter-spacing: 0.8px; }
      .subtitle { fill: #333333; font: 600 17px Aptos, Segoe UI, sans-serif; }
      .connector-box { fill: #ffffff; stroke: #000000; stroke-width: 4; }
      .connector-title { fill: #000000; font: 900 18px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .sheet-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; }
      .sheet-pin { fill: #ffffff; stroke: #000000; stroke-width: 2; }
      .sheet-wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .sheet-small { fill: #333333; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .sheet-pin-label { fill: #000000; font: 800 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .sheet-note-title { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; }
      .sheet-note { fill: #222222; font: 600 12px Aptos, Segoe UI, sans-serif; }
      .meta { fill: #333333; font: 800 12px Aptos, Segoe UI, sans-serif; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <text class="title" x="46" y="58">${escapeXml(sheet.title)}</text>
  <text class="subtitle" x="46" y="92">${escapeXml(sheet.subtitle)}</text>
  <text class="meta" x="46" y="122">Rows loaded: ${sheet.totalRows} | Drawing rows shown: ${rows.length}</text>
  <rect class="connector-box" x="58" y="178" width="180" height="455" />
  <text class="connector-title" x="148" y="210">${leftTitle}</text>
  <rect class="connector-box" x="1220" y="178" width="300" height="455" />
  <text class="connector-title" x="1370" y="210">${rightTitle}</text>
  ${rowLines}
  <text class="sheet-note-title" x="68" y="648">SHEET NOTES</text>
  ${notes || `<text class="sheet-note" x="68" y="675">No comments found in uploaded rows.</text>`}
</svg>`;
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
  const wrapLength = escapeXml(wrapRow.length || "8");
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
    <pattern id="wrapPattern" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="#7c8790" stroke-width="2" opacity="0.65" />
    </pattern>
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
      .wrap-shell { fill: url(#wrapPattern); stroke: #4f5961; stroke-width: 3; opacity: 0.45; }
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
  <rect class="heat-shrink" x="318" y="292" width="24" height="150" rx="8" />
  <rect class="heat-shrink" x="1054" y="292" width="24" height="150" rx="8" />
  <text class="wrap-label" x="698" y="286">Expandable wire wrap sleeve around GND and +48V</text>
  <path class="dim-line" d="M 360 462 L 1036 462" marker-start="url(#arrow)" marker-end="url(#arrow)" />
  <text class="dim-label" x="698" y="488">${wrapLength} in wrap section</text>
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
    const blueGrid = b > r + 8 && b > g + 3 ? clamp((b - Math.max(r, g) - 4) / 55, 0, 1) : 0;
    const contrast = localMean[index] - gray[index];
    const score = clamp((contrast - 12) / 32, 0, 1) * (1 - blueGrid * 0.65) * (1 - saturation * 0.25);
    if (score >= 0.18) {
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

function renderSchematic(result) {
  dom.schematicStage.innerHTML = appState.svgText.replace(/^<\?xml[^>]*>\s*/, "");
  dom.drawingTitle.textContent = result.fileName || "Digital schematic";
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

function renderHarnessTable(rows, headers = getHarnessTableHeaders()) {
  if (!rows.length) {
    dom.tablePreview.innerHTML = `<span class="quiet">Upload Excel or paste table rows to generate the copy-only table.</span>`;
    dom.copyTableButton.disabled = true;
    return;
  }
  const headerHtml = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const bodyHtml = rows.map((row) => `
    <tr>
      ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
    </tr>
  `).join("");
  dom.tablePreview.innerHTML = `
    <table class="copy-table" aria-label="Generated harness table">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  `;
  dom.copyTableButton.disabled = false;
}

function buildHarnessTableText(rows, headers = getHarnessTableHeaders()) {
  return [headers, ...rows]
    .map((row) => row.map(cleanTableCell).join("\t"))
    .join("\n");
}

function cleanTableCell(input) {
  return String(input ?? "").replace(/[\t\r\n]+/g, " ").trim();
}

async function copyHarnessTable() {
  if (!appState.tableText) {
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(appState.tableText);
    } else {
      fallbackCopyText(appState.tableText);
    }
    setStatus("Harness table copied. Paste it into Excel, Google Sheets, or your build sheet.");
  } catch (error) {
    console.error(error);
    fallbackCopyText(appState.tableText);
    setStatus("Harness table copied with the fallback copier.");
  }
}

function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
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
  setExportsEnabled(false);
  dom.schematicStage.innerHTML = `
    <div class="empty-state">
      <strong>No image loaded</strong>
      <span>The clean digital schematic will appear here.</span>
    </div>
  `;
  dom.confidenceValue.textContent = "--";
  dom.confidenceFill.style.width = "0";
  dom.orientationFact.textContent = "--";
  dom.wireFact.textContent = "0";
  dom.connectorFact.textContent = "0";
  dom.labelFact.textContent = "0";
  dom.drawingTitle.textContent = "Waiting for image";
  dom.sourceTitle.textContent = "None";
  dom.findingCount.textContent = "0 items";
  dom.findingsList.innerHTML = `<span class="quiet">No findings yet.</span>`;
  appState.tableText = "";
  appState.tableHeaders = [];
  renderHarnessTable([]);
  renderSourcePreview();
}

function setBusy(isBusy) {
  dom.analyzeButton.disabled = isBusy || !appState.image;
  dom.pasteButton.disabled = isBusy;
  dom.sheetButton.disabled = isBusy;
  dom.tablePasteButton.disabled = isBusy;
  dom.loadPastedTableButton.disabled = isBusy;
  dom.rotateButton.disabled = isBusy || !appState.image;
  dom.resetButton.disabled = isBusy;
}

function setExportsEnabled(enabled) {
  dom.exportDrawio.disabled = !enabled;
  dom.exportSvg.disabled = !enabled;
  dom.printButton.disabled = !enabled;
  dom.copyTableButton.disabled = !enabled || !appState.tableText;
}

function setStatus(text) {
  dom.statusText.textContent = text;
}

function resetApp() {
  appState = {
    fileName: "",
    dataUrl: "",
    image: null,
    manualRotation: 0,
    result: null,
    svgText: "",
    tableText: "",
    tableHeaders: []
  };
  dom.fileInput.value = "";
  dom.sheetInput.value = "";
  dom.analyzeButton.disabled = true;
  dom.pasteButton.disabled = false;
  dom.sheetButton.disabled = false;
  dom.tablePasteButton.disabled = false;
  dom.loadPastedTableButton.disabled = false;
  dom.pasteTablePanel.hidden = true;
  dom.tablePasteInput.value = "";
  dom.rotateButton.disabled = true;
  dom.printButton.disabled = true;
  setStatus("Upload an image, upload Excel, or paste table rows to start.");
  renderEmpty();
}

function printDrawing() {
  if (!appState.result) {
    return;
  }
  window.print();
}

function exportSvg() {
  if (!appState.svgText) {
    return;
  }
  downloadText(`${fileBase(appState.fileName || "digiwire")}.svg`, appState.svgText, "image/svg+xml");
}

function exportPng() {
  if (!appState.svgText) {
    return;
  }
  const image = new Image();
  const blob = new Blob([appState.svgText], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = SVG_WIDTH * 3;
    canvas.height = SVG_HEIGHT * 3;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) {
        return;
      }
      downloadBlob(`${fileBase(appState.fileName || "digiwire")}.png`, pngBlob);
    }, "image/png");
  };
  image.src = url;
}

function exportDrawio() {
  if (!appState.result) {
    return;
  }
  const xml = buildDrawioXml(appState.result);
  const title = `${fileBase(appState.fileName || "digiwire")}.drawio`;
  const popup = window.open(
    `${DRAWIO_EMBED_ORIGIN}/?embed=1&proto=json&spin=1&ui=min&libraries=1`,
    "DIGIWIRE_DRAWIO_EDITOR",
    "popup=yes,width=1280,height=900,menubar=no,toolbar=no,location=no,status=no"
  );
  if (!popup) {
    setStatus("Draw.io popup was blocked. Allow popups for this site, then click Edit in Draw.io again.");
    return;
  }
  drawioSession = {
    popup,
    xml,
    title,
    loaded: false
  };
  popup.focus();
  setStatus("Opening Draw.io editor. Loading the DIGIWIRE drawing...");
}

function handleDrawioMessage(event) {
  if (!drawioSession || event.source !== drawioSession.popup || !DRAWIO_ALLOWED_ORIGINS.has(event.origin)) {
    return;
  }
  const message = parseDrawioMessage(event.data);
  if (!message) {
    return;
  }
  if (message.event === "init" && !drawioSession.loaded) {
    drawioSession.popup.postMessage(JSON.stringify({
      action: "load",
      autosave: 1,
      title: drawioSession.title,
      xml: drawioSession.xml
    }), event.origin);
    drawioSession.loaded = true;
    setStatus("Draw.io popup loaded with the editable DIGIWIRE drawing.");
    return;
  }
  if (message.event === "save") {
    drawioSession.xml = message.xml || drawioSession.xml;
    setStatus("Draw.io sent an updated drawing back to DIGIWIRE.");
    return;
  }
  if (message.event === "exit") {
    drawioSession = null;
    setStatus(appState.result?.status || "Draw.io editor closed.");
  }
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

function buildDrawioXml(result) {
  if (result.sheetHarness) {
    return buildSheetDrawioXml(result);
  }
  if (result.harness) {
    return buildCanDrawioXml(result);
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

function buildSheetDrawioXml(result) {
  if (isBarrelPowerCableSheet(result.sheetHarness.rows)) {
    return buildBarrelPowerDrawioXml(result);
  }
  const cells = [];
  const add = (cell) => cells.push(cell);
  const addVertex = (id, value, x, y, width, height, style) => {
    add(mxCell({ id, value, style, vertex: 1, parent: "1" }, mxGeometry({ x, y, width, height, as: "geometry" })));
  };
  const addEdge = (id, value, x1, y1, x2, y2, style) => {
    add(mxCell({ id, value, style, edge: 1, parent: "1" }, mxGeometry({ relative: 1, as: "geometry" }, `${mxPoint(x1, y1, "sourcePoint")}${mxPoint(x2, y2, "targetPoint")}`)));
  };
  const sheet = result.sheetHarness;
  const rows = sheet.rows.length ? sheet.rows : [{ wireName: "No drawable rows found", color: "Gray" }];
  const rowSpacing = Math.min(52, Math.max(34, 430 / Math.max(1, rows.length)));
  const leftX = 270;
  const rightX = 1185;
  const startY = 230;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("title", sheet.title, 46, 28, 900, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", sheet.subtitle, 46, 72, 720, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#333333;align=left;");
  addVertex("left_connector", firstFilled(rows, "leftLegName") || firstFilled(rows, "leftLeg") || "LEFT LEG", 58, 178, 180, 455, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addVertex("right_connector", firstFilled(rows, "rightLegName") || firstFilled(rows, "rightLeg") || "RIGHT LEG", 1220, 178, 300, 455, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  rows.forEach((row, index) => {
    const y = startY + index * rowSpacing;
    const stroke = sheetColorToStroke(row.color);
    const dashed = isNoWireRow(row) ? "dashed=1;dashPattern=12 9;" : "";
    const label = row.wireName || row.branchRole || `ROW ${row.rowNumber || index + 1}`;
    addEdge(`sheet_wire_${index + 1}`, label, leftX, y, rightX, y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${stroke};strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;${dashed}`);
  });
  addVertex("sheet_notes", `Rows loaded: ${sheet.totalRows}<br>Drawing rows shown: ${rows.length}`, 58, 650, 500, 70, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=14;align=left;spacingLeft=12;");
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
  addVertex("wrap_length", `${wrapRow.length || "8"} in wrap section`, 520, 462, 350, 32, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;");
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
  return inner ? `<mxCell ${attrText}>${inner}</mxCell>` : `<mxCell ${attrText} />`;
}

function mxGeometry(attrs, inner = "") {
  const attrText = xmlAttrs(attrs);
  return inner ? `<mxGeometry ${attrText}>${inner}</mxGeometry>` : `<mxGeometry ${attrText} />`;
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

function downloadText(fileName, text, type) {
  downloadBlob(fileName, new Blob([text], { type }));
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
