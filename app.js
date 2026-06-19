"use strict";

const APP_VERSION = "1.6.9";
const OCR_WORKER_PATH = "vendor/tesseract/worker.min.js";
const OCR_CORE_PATH = "vendor/tesseract/core";
const OCR_LANG_PATH = "vendor/tesseract/lang";
const DRAWIO_EMBED_ORIGIN = "https://embed.diagrams.net";
const DRAWIO_ALLOWED_ORIGINS = new Set([DRAWIO_EMBED_ORIGIN, "https://app.diagrams.net"]);
const XLSX_READER_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const MAX_IMAGE_SIDE = 1600;
const SVG_WIDTH = 1600;
const SVG_HEIGHT = 800;

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
  })
});

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
  const visibleFindings = findings.filter(isVisibleFinding);
  const internalModel = buildInternalModel(wireSegments, connectors, visibleFindings, best.width, best.height);
  const harness = shouldUseCanHarnessTemplate(visibleFindings, wireSegments, connectors)
    ? buildCanHarnessModel()
    : buildGenericImageHarnessModel(internalModel, meta);
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
    .slice(0, 32);
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
  if (isRepeatedHeaderSheetRow(row)) {
    return false;
  }
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
    const labelParts = [wire.label, wire.colorName ? `(${wire.colorName})` : "", wire.awg ? `${wire.awg} AWG` : ""].filter(Boolean);
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

function buildSheetHarnessSvg(result) {
  const sheet = result.sheetHarness;
  if (isBarrelPowerCableSheet(sheet.rows)) {
    return buildBarrelPowerCableSvg(result);
  }
  if (isMolexUartJetsonSheet(sheet.rows)) {
    return buildMolexUartJetsonSvg(result);
  }
  const datasheetModel = buildDatasheetConnectorHarnessModel(sheet);
  if (datasheetModel) {
    return buildDatasheetConnectorHarnessSvg(result, datasheetModel);
  }
  const kicadModel = buildKiCadHarnessModel(sheet);
  if (kicadModel) {
    return buildKiCadHarnessSvg(result, kicadModel);
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
  const protectionTop = startY - 28;
  const protectionBottom = startY + (rows.length - 1) * rowSpacing + 28;
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
    ${buildBraidPatternDefs()}
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
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
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
  ${buildHorizontalProtectionSvg({
    x1: leftX + 34,
    x2: rightX - 34,
    top: protectionTop,
    bottom: protectionBottom,
    labelY: protectionTop - 10,
    endLabelY: protectionBottom + 18
  })}
  ${rowLines}
  <text class="sheet-note-title" x="68" y="648">SHEET NOTES</text>
  ${notes || `<text class="sheet-note" x="68" y="675">No comments found in uploaded rows.</text>`}
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
  const rows = sheet.rows.filter((row) => row.wireName && row.leftPinPos && row.rightPinPos).slice(0, 2);
  const wireYs = [248, 304];
  const wireSvg = rows.map((row, index) => {
    const leftPoint = molexMicroFit2PinPoint(row.leftPinPos);
    const rightPoint = molexCGrid40PinPoint(row.rightPinPos);
    const wireY = wireYs[index] ?? 248 + index * 56;
    const color = sheetColorToStroke(row.color);
    const label = row.wireName || `WIRE ${index + 1}`;
    const length = row.length ? `${row.length} in`.replace(/\s+inches?\s+in$/i, " inches") : "";
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

function buildDatasheetConnectorHarnessModel(sheet) {
  const sourceRows = getKiCadWireRows(sheet.rows);
  if (!sourceRows.length) {
    return null;
  }
  const leftResolved = resolveDatasheetConnector(sourceRows, "left");
  const rightResolved = resolveDatasheetConnector(sourceRows, "right");
  if (!leftResolved && !rightResolved) {
    return null;
  }
  const rows = sourceRows.slice(0, 16);
  const gauge = dominantSheetValue(rows, "awg") || firstFilled(rows, "awg") || "";
  const left = leftResolved || buildGenericDatasheetConnector(rows, "left");
  const right = rightResolved || buildGenericDatasheetConnector(rows, "right");
  const laneTop = 166;
  const laneBottom = 466;
  const laneGap = rows.length > 1 ? (laneBottom - laneTop) / (rows.length - 1) : 0;
  const wires = rows.map((row, index) => ({
    row,
    name: row.wireName || `WIRE ${index + 1}`,
    colorName: normalizeColorName(row.color),
    stroke: sheetColorToStroke(row.color),
    awg: row.awg || gauge,
    length: row.length || dominantSheetValue(rows, "length") || "",
    fromPin: String(row.leftPinPos || index + 1),
    toPin: String(row.rightPinPos || index + 1),
    laneY: laneTop + index * laneGap
  }));
  left.activePins = buildDatasheetActivePinMap(wires, "left");
  right.activePins = buildDatasheetActivePinMap(wires, "right");
  const warnings = uniqueValues([
    ...left.warnings,
    ...right.warnings,
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
  const text = normalizeText(rows.map((row) => [
    row[`${prefix}LegName`],
    row[`${prefix}HousingType`],
    row[`${prefix}HousingPart`],
    row[`${prefix}PinPart`]
  ].join(" ")).join(" "));
  const key = datasheetConnectorKey(text);
  if (!key) {
    return null;
  }
  const definition = DATASHEET_CONNECTOR_LIBRARY[key];
  const inferred = inferDatasheetConnectorPositions(rows, side, text, definition);
  const gauge = Number(String(dominantSheetValue(rows, "awg") || firstFilled(rows, "awg")).match(/\d+/)?.[0]);
  const termination = datasheetTerminationForGauge(key, gauge);
  const name = cleanConnectorName(
    firstFilled(rows, `${prefix}LegName`) ||
    firstFilled(rows, `${prefix}HousingType`) ||
    `${definition.manufacturer} ${definition.family}`
  );
  const warnings = [...inferred.warnings, ...termination.warnings];
  const powerpoleParts = key === "powerpole1545"
    ? powerpoleHousingPartsForRows(rows, side)
    : [];
  return {
    key,
    definition,
    name,
    type: firstFilled(rows, `${prefix}HousingType`) || definition.style,
    positions: inferred.positions,
    requestedPositions: inferred.requestedPositions,
    housingPart: key === "powerpole1545"
      ? powerpoleParts.map((item) => `${item.color} ${item.part}`).join(", ") || definition.housingPart(inferred.positions)
      : definition.housingPart(inferred.positions),
    engineeringPart: definition.engineeringPart ? definition.engineeringPart(inferred.positions) : "",
    contactPart: termination.contactPart,
    contactDescription: termination.contactDescription,
    toolPart: termination.toolPart,
    gauge,
    powerpoleParts,
    warnings,
    recognized: true,
    side
  };
}

function datasheetConnectorKey(text) {
  if (text.includes("POWERPOLE") || text.includes("POWER POLE") || text.includes("ANDERSON") || /\b1327G?\d*\b/.test(text)) {
    return "powerpole1545";
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

function inferDatasheetConnectorPositions(rows, side, text, definition) {
  const prefix = side === "left" ? "left" : "right";
  const pins = rows
    .map((row) => numericPin(row[`${prefix}PinPos`]))
    .filter(Number.isFinite);
  const highestPin = pins.length ? Math.max(...pins) : rows.length;
  const compact = text.replace(/[^A-Z0-9]+/g, "");
  let requestedPositions = 0;
  if (definition.key === "microFitFront") {
    requestedPositions = Number(compact.match(/43645(\d{2})\d{2}/)?.[1] || 0);
  } else if (definition.key === "microFitSide") {
    requestedPositions = Number(compact.match(/43025(\d{2})\d{2}/)?.[1] || 0);
  } else if (definition.key === "miniFitJr") {
    const skuSuffix = Number(compact.match(/39012(\d{3})/)?.[1] || 0);
    requestedPositions = skuSuffix ? skuSuffix / 10 : 0;
  }
  if (!requestedPositions) {
    const positionMatch = text.match(/\b(\d{1,2})\s*(?:POS|POSITION|PIN|CIRCUIT)\b/);
    requestedPositions = Number(positionMatch?.[1] || highestPin || definition.minPositions);
  }
  requestedPositions = Math.max(requestedPositions, highestPin, definition.minPositions);
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

function datasheetTerminationForGauge(key, gauge) {
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
  return {
    contactPart: "VERIFY",
    contactDescription: "Connector family is not in the datasheet library.",
    toolPart: "VERIFY",
    warnings
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

function buildDatasheetActivePinMap(wires, side) {
  return new Map(wires.map((wire) => [
    side === "left" ? wire.fromPin : wire.toPin,
    { stroke: wire.stroke, colorName: wire.colorName }
  ]));
}

function datasheetConnectorGeometry(connector, side) {
  const centerX = side === "left" ? 220 : 1380;
  const top = 154;
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
  const numeric = clamp(numericPin(pin), 1, connector.positions);
  if (connector.key === "powerpole1545") {
    const index = numeric - 1;
    const column = index % geometry.columns;
    const row = Math.floor(index / geometry.columns);
    return {
      x: geometry.x + column * (geometry.moduleWidth + geometry.gap) + geometry.moduleWidth / 2,
      y: geometry.y + row * (geometry.moduleHeight + geometry.gap) + geometry.moduleHeight / 2
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

function buildDatasheetConnectorFaceSvg(connector, side) {
  const geometry = datasheetConnectorGeometry(connector, side);
  const heading = `${connector.definition.manufacturer} ${connector.definition.family}`.trim();
  const partLabel = connector.engineeringPart
    ? `${connector.housingPart} / ${connector.engineeringPart}`
    : connector.key === "powerpole1545"
      ? "1327 COLOR HOUSING SERIES"
      : connector.housingPart;
  const output = [
    `<g aria-label="${escapeXml(heading)} ${connector.positions} position mating face">`,
    `<text class="ds-connector-name" x="${geometry.centerX}" y="122">${escapeXml(connector.name)}</text>`,
    `<text class="ds-connector-part" x="${geometry.centerX}" y="141">${escapeXml(shortLabel(partLabel, 40))}</text>`,
    `<text class="ds-connector-detail" x="${geometry.centerX}" y="158">${escapeXml(`${heading} | ${connector.positions} POS | ${connector.definition.pitch}`)}</text>`
  ];
  if (connector.key === "powerpole1545") {
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const index = pin - 1;
      const column = index % geometry.columns;
      const row = Math.floor(index / geometry.columns);
      const x = geometry.x + column * (geometry.moduleWidth + geometry.gap);
      const y = geometry.y + row * (geometry.moduleHeight + geometry.gap);
      const active = connector.activePins.get(String(pin));
      const fill = active ? datasheetHousingFill(active.colorName) : "#6d7578";
      const textFill = isDarkDatasheetColor(active?.colorName) ? "#ffffff" : "#000000";
      output.push(`
        <path class="powerpole-module" d="M ${x + 5} ${y} H ${x + geometry.moduleWidth - 5} L ${x + geometry.moduleWidth} ${y + 6} V ${y + geometry.moduleHeight - 6} L ${x + geometry.moduleWidth - 5} ${y + geometry.moduleHeight} H ${x + 5} L ${x} ${y + geometry.moduleHeight - 6} V ${y + 6} Z" fill="${fill}" />
        <rect class="powerpole-opening" x="${x + 6}" y="${y + 8}" width="${geometry.moduleWidth - 12}" height="18" rx="3" />
        <path class="powerpole-contact" d="M ${x + 9} ${y + 22} H ${x + geometry.moduleWidth - 9} L ${x + geometry.moduleWidth - 12} ${y + 16} H ${x + 12} Z" />
        <text class="ds-cavity-number" x="${x + geometry.moduleWidth / 2}" y="${y + geometry.moduleHeight - 8}" fill="${textFill}">${pin}</text>`);
    }
  } else {
    const bodyClass = connector.key === "miniFitJr" ? "minifit-body" : "microfit-body";
    output.push(`<rect class="${bodyClass}" x="${geometry.x}" y="${geometry.y}" width="${geometry.width}" height="${geometry.height}" rx="9" />`);
    if (connector.key === "microFitFront") {
      output.push(`<path class="microfit-lock" d="M ${geometry.x + 24} ${geometry.y} L ${geometry.x + 36} ${geometry.y - 18} H ${geometry.x + geometry.width - 20} L ${geometry.x + geometry.width - 10} ${geometry.y} Z" />`);
    } else if (connector.key === "microFitSide") {
      const latchX = side === "left" ? geometry.x - 20 : geometry.x + geometry.width;
      output.push(`<rect class="microfit-lock" x="${latchX}" y="${geometry.y + 22}" width="20" height="${Math.min(72, geometry.height - 44)}" rx="4" />`);
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
  output.push(`<text class="ds-connector-detail" x="${geometry.centerX}" y="${geometry.y + geometry.height + 22}">MATING FACE - CIRCUIT 1 MARKED</text>`);
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
  const wireSvg = model.wires.map((wire) => {
    const leftPoint = datasheetConnectorPinPoint(model.left, wire.fromPin, "left");
    const rightPoint = datasheetConnectorPinPoint(model.right, wire.toPin, "right");
    return `
      <path class="ds-wire" d="M ${leftPoint.x} ${leftPoint.y} L 396 ${leftPoint.y} L 438 ${wire.laneY} L 1162 ${wire.laneY} L 1204 ${rightPoint.y} L ${rightPoint.x} ${rightPoint.y}" stroke="${wire.stroke}" />
      <circle class="ds-terminal" cx="${leftPoint.x}" cy="${leftPoint.y}" r="4.5" />
      <circle class="ds-terminal" cx="${rightPoint.x}" cy="${rightPoint.y}" r="4.5" />
      <text class="ds-wire-label" x="800" y="${wire.laneY - 5}">${escapeXml(`${wire.name} | ${wire.colorName} | ${wire.awg || "?"} AWG`)}</text>`;
  }).join("");
  const firstHalf = model.wires.slice(0, 8);
  const secondHalf = model.wires.slice(8, 16);
  const tableRows = (wires) => wires.map((wire) => [
    wire.fromPin,
    wire.name,
    wire.colorName,
    wire.awg || model.gauge || "",
    formatLengthInches(wire.length || model.length),
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
      .microfit-body { fill: #25292c; stroke: #050505; stroke-width: 3; }
      .minifit-body { fill: #ded9c9; stroke: #111111; stroke-width: 3; }
      .microfit-lock { fill: #353a3d; stroke: #050505; stroke-width: 2.5; }
      .minifit-latch { fill: #c8c1ad; stroke: #111111; stroke-width: 2.5; }
      .ds-cavity { fill: #090a0a; }
      .ds-cavity-hole { fill: #313638; stroke: #d9dddf; stroke-width: 0.8; }
      .ds-cavity-number { fill: #ffffff; font: 900 8px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .circuit-one-marker { fill: #f0f2f3; stroke: #050505; stroke-width: 1; }
      .powerpole-module { stroke: #111111; stroke-width: 2; }
      .powerpole-opening { fill: #101314; stroke: #000000; stroke-width: 1.5; }
      .powerpole-contact { fill: #c7cccf; stroke: #f4f5f5; stroke-width: 1; }
      .ds-wire { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
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
    top: model.wires[0].laneY - 16,
    bottom: model.wires[model.wires.length - 1].laneY + 16,
    labelY: model.wires[0].laneY - 25,
    endLabelY: model.wires[model.wires.length - 1].laneY + 37,
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
  [
    ["LEFT", model.left],
    ["RIGHT", model.right]
  ].forEach(([label, connector]) => {
    const signature = [
      connector.key,
      connector.positions,
      connector.housingPart,
      connector.contactPart,
      connector.toolPart
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
    lines.push({ text: `${label}: ${connector.definition.family} ${connector.positions} POS` });
    if (connector.key === "powerpole1545" && connector.powerpoleParts.length) {
      for (let index = 0; index < connector.powerpoleParts.length; index += 2) {
        const parts = connector.powerpoleParts.slice(index, index + 2)
          .map((item) => `${item.color} ${item.part} x${item.quantity}`)
          .join(" | ");
        lines.push({ text: `Housing: ${parts}` });
      }
    } else {
      lines.push({ text: `Housing: ${connector.housingPart}` });
    }
    lines.push({ text: `Contact: ${connector.contactPart}` });
    lines.push({ text: `Tool: ${connector.toolPart}` });
  });
  model.warnings.slice(0, 3).forEach((warning) => lines.push({ text: `WARNING: ${warning}`, warning: true }));
  return lines.slice(0, 11);
}

function buildKiCadHarnessModel(sheet) {
  const rows = getKiCadWireRows(sheet.rows);
  if (rows.length < 2) {
    return null;
  }
  const cableName = firstFilled(rows, "cableName") || sheet.cableName || "WIRE HARNESS";
  const leftName = cleanConnectorName(firstFilled(rows, "leftLegName") || firstFilled(rows, "leftHousingType") || "LEFT CONNECTOR");
  const leftType = firstFilled(rows, "leftHousingType");
  const rightName = cleanConnectorName(connectorSideName(rows, "right") || "RIGHT CONNECTOR");
  const rightType = firstFilled(rows, "rightHousingType");
  const length = dominantSheetValue(rows, "length") || firstFilled(rows, "length") || "";
  const awg = dominantSheetValue(rows, "awg") || firstFilled(rows, "awg") || "";
  const groups = buildKiCadWireGroups(rows);
  const isMultiGroup = groups.length >= 2 && rows.length > 4;
  const groupNames = groups.map((group) => group.name).filter(Boolean);
  const description = isMultiGroup
    ? `${shortListLabel(groupNames, 4)} TO ${rightName}`.replace(/\s+/g, " ").trim()
    : `${leftName} TO ${rightName}`.replace(/\s+/g, " ").trim();
  const wireStartY = isMultiGroup ? 205 : 208;
  const wireGap = rows.length <= 4 ? 66 : 52;
  const wires = rows.map((row, index) => ({
    row,
    name: row.wireName || `WIRE ${index + 1}`,
    colorName: normalizeColorName(row.color),
    stroke: sheetColorToStroke(row.color),
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
  }));
  groups.forEach((group) => {
    group.wires = wires.filter((wire) => wire.groupKey === group.key);
  });

  return {
    cableName,
    description,
    length,
    awg,
    wires,
    groups,
    isMultiGroup,
    leftConnector: {
      name: isMultiGroup ? "ESC PCB" : leftName,
      type: leftType && normalizeText(leftType) !== normalizeText(leftName) ? leftType : "",
      positionText: isMultiGroup ? `${groups.length} x 3 POSITION` : `${rows.length} POSITION`,
      view: "FRONT VIEW"
    },
    rightConnector: {
      name: rightName,
      type: rightType && !normalizeText(rightName).includes(normalizeText(rightType)) ? rightType : "",
      positionText: isMultiGroup ? `${groups.length} x 3 POSITION` : `${rows.length} POSITION`,
      view: "FRONT VIEW"
    }
  };
}

function getKiCadWireRows(rows) {
  return rows.filter((row) => {
    const wireName = normalizeText(row.wireName);
    const leftPin = normalizeText(row.leftPinPos);
    const rightPin = normalizeText(row.rightPinPos);
    const branchRole = normalizeText(row.branchRole);
    const rowText = normalizeText([
      row.wireName,
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
    labels.includes("LENGTH INCHES");
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
  const leftFace = buildKiCadConnectorFaceSvg(170, model.wires, model.leftConnector, "left");
  const rightFace = buildKiCadConnectorFaceSvg(1300, model.wires, model.rightConnector, "right");
  const wireSvg = model.wires.map((wire) => buildKiCadWireSvg(wire)).join("");
  const protectionTop = model.wires[0].y - 30;
  const protectionBottom = model.wires[model.wires.length - 1].y + 30;
  const wiringRows = model.wires.map((wire) => [
    wire.fromPin,
    wire.name,
    { text: wire.colorName, className: wire.colorName === "RED" ? "table-red" : "table-text" },
    wire.awg || model.awg || "",
    formatLengthInches(wire.length || model.length),
    wire.toPin
  ]);
  const bomRows = buildKiCadBomRows(model);
  const notes = buildKiCadNotes(model)
    .map((note, index) => `<text class="note" x="36" y="${696 + index * 18}">${index + 1}. ${escapeXml(note)}</text>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(model.cableName)} KiCad style harness drawing">
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
      .cavity { fill: #f9f9f9; stroke: #000000; stroke-width: 1.5; }
      .cavity-hole { fill: #000000; stroke: #000000; stroke-width: 1; }
      .pin-label { fill: #000000; font: 900 16px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .pin-side { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .wire-line { fill: none; stroke-width: 8; stroke-linecap: square; }
      .terminal { stroke: #000000; stroke-width: 1.8; }
      .terminal-mark { stroke: #000000; stroke-width: 1.2; fill: none; }
      .wire-label { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .dimension { fill: none; stroke: #000000; stroke-width: 1.8; marker-start: url(#kicadArrow); marker-end: url(#kicadArrow); }
      .dim-ext { stroke: #000000; stroke-width: 1.2; }
      .dim-text { fill: #000000; font: 900 15px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
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
      .protection-label { fill: #1f2930; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 5; }
      .protection-end-label { fill: #111111; font: 900 10px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #ffffff; stroke-width: 4; }
    </style>
  </defs>
  <rect class="page" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  <rect class="border" x="10" y="10" width="1580" height="780" />

  <text class="title" x="800" y="52">${escapeXml(model.cableName)}</text>
  <text class="subtitle" x="800" y="84">${escapeXml(model.description)}</text>

  <text class="connector-heading" x="220" y="46">LEFT CONNECTOR</text>
  <text class="connector-sub" x="220" y="72">${escapeXml(model.leftConnector.name)}</text>
  ${model.leftConnector.type ? `<text class="connector-sub" x="220" y="96">${escapeXml(model.leftConnector.type)}</text>` : ""}
  <text class="connector-sub" x="220" y="120">${escapeXml(model.leftConnector.positionText)}</text>
  <text class="connector-view" x="220" y="144">(${escapeXml(model.leftConnector.view)})</text>

  <text class="connector-heading" x="1360" y="46">RIGHT CONNECTOR</text>
  <text class="connector-sub" x="1360" y="72">${escapeXml(model.rightConnector.name)}</text>
  ${model.rightConnector.type ? `<text class="connector-sub" x="1360" y="96">${escapeXml(model.rightConnector.type)}</text>` : ""}
  <text class="connector-sub" x="1360" y="120">${escapeXml(model.rightConnector.positionText)}</text>
  <text class="connector-view" x="1360" y="144">(${escapeXml(model.rightConnector.view)})</text>

  <line class="dim-ext" x1="372" y1="138" x2="372" y2="186" />
  <line class="dim-ext" x1="1220" y1="138" x2="1220" y2="186" />
  <line class="dimension" x1="382" y1="150" x2="1210" y2="150" />
  <text class="dim-text" x="796" y="132">${escapeXml(formatLengthInches(model.length))} in +/-0.25</text>
  <text class="dim-text" x="796" y="154" dy="22">OVERALL LENGTH</text>

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

  ${buildSvgTable({
    x: 30,
    y: 498,
    width: 560,
    title: "WIRING TABLE",
    headers: ["LEFT PIN", "SIGNAL NAME", "COLOR", "AWG", "LENGTH\n(in)", "RIGHT\nPIN"],
    rows: wiringRows,
    colWidths: [92, 142, 84, 62, 82, 98],
    rowHeight: 33
  })}

  ${buildKiCadSpecsSvg(620, 498, 340, 166, model)}

  ${buildSvgTable({
    x: 990,
    y: 498,
    width: 570,
    title: "BILL OF MATERIALS",
    headers: ["ITEM", "QTY", "DESCRIPTION", "PART NUMBER"],
    rows: bomRows,
    colWidths: [60, 60, 250, 200],
    rowHeight: 30
  })}

  <text class="note-title" x="36" y="680">NOTES:</text>
  ${notes}

  ${buildWireLegendSvg(548, 680, 260, 82, model)}
  ${buildKiCadTitleBlockSvg(840, 674, 720, 106, model)}
</svg>`;
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
    { text: wire.colorName, className: wire.colorName === "RED" ? "table-red" : "table-text" },
    wire.awg || model.awg || "",
    formatLengthInches(wire.length || model.length),
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
  <text class="dim-text" x="776" y="128">${escapeXml(formatLengthInches(model.length))} in +/-0.25</text>
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
  const textColorClass = wire.colorName === "RED" ? "table-red" : "table-text";
  const wireRole = wire.maestroRole?.code ? `${wire.name} ${wire.maestroRole.code}` : wire.name;
  return `
  <rect class="terminal" x="350" y="${wire.y - 11}" width="42" height="22" fill="${color}" />
  <rect class="terminal" x="1136" y="${wire.y - 11}" width="42" height="22" fill="${color}" />
  <line class="wire-line" x1="392" y1="${wire.y}" x2="1136" y2="${wire.y}" stroke="${color}" />
  <path class="terminal-mark" d="M 371 ${wire.y - 5} L 371 ${wire.y + 5} M 366 ${wire.y} L 376 ${wire.y}" />
  <path class="terminal-mark" d="M 1157 ${wire.y - 5} L 1157 ${wire.y + 5} M 1152 ${wire.y} L 1162 ${wire.y}" />
  <text class="wire-label" x="760" y="${wire.y - 10}">${escapeXml(wireRole)} (${escapeXml(wire.colorName)}) ${escapeXml(wire.awg || "")} AWG</text>
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
  <text class="title-block-label" x="${x + 278}" y="${y + 52}">UNITS: INCH</text>
  <text class="title-block-label" x="${midX + 12}" y="${y + 52}">DWG NO.</text>
  <text class="title-block-small" x="${midX + 160}" y="${y + 54}">${escapeXml(model.cableName)}</text>`;
}

function buildKiCadConnectorFaceSvg(x, wires, connector, side) {
  const top = Math.max(162, wires[0].y - 42);
  const bottom = wires[wires.length - 1].y + 42;
  const height = bottom - top;
  const bodyClass = side === "left" ? "connector-body-left" : "connector-body-right";
  const body = [
    `<rect class="${bodyClass}" x="${x}" y="${top}" width="88" height="${height}" rx="5" />`,
    `<rect class="connector-shadow" x="${side === "left" ? x + 70 : x - 10}" y="${top + 8}" width="18" height="${height - 16}" rx="4" opacity="${side === "left" ? "0.9" : "0.18"}" />`,
    `<rect class="${bodyClass}" x="${x + 14}" y="${top - 14}" width="28" height="16" rx="3" />`,
    `<rect class="${bodyClass}" x="${x + 14}" y="${bottom - 2}" width="28" height="16" rx="3" />`
  ];
  wires.forEach((wire) => {
    body.push(`<rect class="cavity" x="${x + 16}" y="${wire.y - 24}" width="50" height="48" rx="4" />`);
    body.push(`<rect class="cavity" x="${x + 24}" y="${wire.y - 16}" width="34" height="32" rx="5" />`);
    body.push(`<rect class="cavity-hole" x="${x + 35}" y="${wire.y - 9}" width="14" height="18" rx="3" />`);
    if (side === "left") {
      body.push(`<text class="pin-side" x="96" y="${wire.y + 5}">PIN ${escapeXml(wire.fromPin)}</text>`);
      body.push(`<text class="pin-label" x="348" y="${wire.y + 5}">${escapeXml(wire.fromPin)}</text>`);
    } else {
      body.push(`<text class="pin-label" x="1238" y="${wire.y + 5}">${escapeXml(wire.toPin)}</text>`);
      body.push(`<text class="pin-side" x="1464" y="${wire.y + 5}">PIN ${escapeXml(wire.toPin)}</text>`);
    }
  });
  return body.join("");
}

function buildKiCadWireSvg(wire) {
  const color = wire.stroke;
  const textColorClass = wire.colorName === "RED" ? "table-red" : "table-text";
  return `
  <rect class="terminal" x="370" y="${wire.y - 16}" width="56" height="32" fill="${color}" />
  <rect class="terminal" x="1164" y="${wire.y - 16}" width="56" height="32" fill="${color}" />
  <line class="wire-line" x1="426" y1="${wire.y}" x2="1164" y2="${wire.y}" stroke="${color}" />
  <path class="terminal-mark" d="M 393 ${wire.y - 7} L 393 ${wire.y + 7} M 386 ${wire.y} L 400 ${wire.y}" />
  <path class="terminal-mark" d="M 1192 ${wire.y - 7} L 1192 ${wire.y + 7} M 1185 ${wire.y} L 1199 ${wire.y}" />
  <text class="wire-label" x="796" y="${wire.y - 14}">${escapeXml(wire.name)} (${escapeXml(wire.colorName)}) ${escapeXml(wire.awg || "")} AWG</text>
  <text class="${textColorClass}" x="398" y="${wire.y + 5}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>
  <text class="${textColorClass}" x="1192" y="${wire.y + 5}">${escapeXml(wire.colorName === "BLACK" ? "-" : "+")}</text>`;
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
  rows.push([String(rows.length + 1), "1", `${model.rightConnector.name} CONNECTOR\n${model.rightConnector.positionText}`, rightPart]);
  return rows.slice(0, 4);
}

function buildKiCadNotes(model) {
  const comments = model.wires.map((wire) => wire.row.comments).filter(Boolean);
  if (comments.length) {
    return comments.slice(0, 5).map((comment) => shortLabel(comment, 90));
  }
  return [
    `ALL WIRES TO BE ${model.awg || "SPECIFIED"} AWG, PVC INSULATED.`,
    `CRIMP CONTACTS USING APPROPRIATE ${model.leftConnector.type || model.leftConnector.name} CRIMP TOOL.`,
    "VERIFY CONTINUITY AND CORRECT PIN ORIENTATION.",
    `ALL WIRES TO BE CUT TO ${formatLengthInches(model.length)} +/-0.25 in.`,
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
  const rows = colors.slice(0, 2).map((color, index) => {
    const rowY = y + 36 + index * 34;
    return `
      <line class="legend-line" x1="${x + 28}" y1="${rowY}" x2="${x + 78}" y2="${rowY}" stroke="${color.stroke}" />
      <text class="table-text" x="${x + 118}" y="${rowY + 4}">${escapeXml(color.name)}</text>
      <text class="table-text" x="${x + 154}" y="${rowY + 4}">=</text>
      <text class="table-text" x="${x + 205}" y="${rowY + 4}">${escapeXml(color.meaning)}</text>`;
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
  const value = normalizeText(color);
  if (value.includes("RED")) return "RED";
  if (value.includes("BLACK")) return "BLACK";
  if (value.includes("YELLOW")) return "YELLOW";
  if (value.includes("GREEN")) return "GREEN";
  if (value.includes("BLUE")) return "BLUE";
  if (value.includes("WHITE")) return "WHITE";
  if (value.includes("ORANGE")) return "ORANGE";
  if (value.includes("BROWN")) return "BROWN";
  if (value.includes("PURPLE") || value.includes("VIOLET")) return "VIOLET";
  return color ? value : "WIRE";
}

function formatLengthInches(length) {
  const value = Number(String(length || "").replace(/[^0-9.]+/g, ""));
  if (!Number.isFinite(value)) {
    return String(length || "TBD");
  }
  return value.toFixed(2);
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
  if (result.harness?.type === "can") {
    return buildCanDrawioXml(result);
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
    const labelParts = [wire.label, wire.colorName ? `(${wire.colorName})` : "", wire.awg ? `${wire.awg} AWG` : ""].filter(Boolean);
    addVertex(`left_pin_${index}`, `PIN ${escapeHtml(wire.leftPin || String(index + 1))}`, leftX - 140, y - 14, 90, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_${index}`, `PIN ${escapeHtml(wire.rightPin || String(index + 1))}`, rightX + 55, y - 14, 90, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
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
  if (isBarrelPowerCableSheet(result.sheetHarness.rows)) {
    return buildBarrelPowerDrawioXml(result);
  }
  if (isMolexUartJetsonSheet(result.sheetHarness.rows)) {
    return buildMolexUartJetsonDrawioXml(result);
  }
  const datasheetModel = buildDatasheetConnectorHarnessModel(result.sheetHarness);
  if (datasheetModel) {
    return buildDatasheetConnectorHarnessDrawioXml(result, datasheetModel);
  }
  const kicadModel = buildKiCadHarnessModel(result.sheetHarness);
  if (kicadModel) {
    return buildKiCadHarnessDrawioXml(result, kicadModel);
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
  const protectionTop = startY - 28;
  const protectionBottom = startY + (rows.length - 1) * rowSpacing + 28;
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("title", sheet.title, 46, 28, 900, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=30;fontStyle=1;fontColor=#000000;align=left;");
  addVertex("subtitle", sheet.subtitle, 46, 72, 720, 30, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontColor=#333333;align=left;");
  addVertex("left_connector", firstFilled(rows, "leftLegName") || firstFilled(rows, "leftLeg") || "LEFT LEG", 58, 178, 180, 455, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addVertex("right_connector", firstFilled(rows, "rightLegName") || firstFilled(rows, "rightLeg") || "RIGHT LEG", 1220, 178, 300, 455, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=4;fontStyle=1;fontSize=16;");
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: leftX + 34,
    x2: rightX - 34,
    top: protectionTop,
    bottom: protectionBottom
  });
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
  const rows = sheet.rows.filter((row) => row.wireName && row.leftPinPos && row.rightPinPos).slice(0, 2);
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

function buildDatasheetConnectorHarnessDrawioXml(result, model) {
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
    top: model.wires[0].laneY - 16,
    bottom: model.wires[model.wires.length - 1].laneY + 16,
    bandWidth: 26
  });
  addDatasheetConnectorDrawioFace(addVertex, model.left, "left");
  addDatasheetConnectorDrawioFace(addVertex, model.right, "right");
  model.wires.forEach((wire, index) => {
    const leftPoint = datasheetConnectorPinPoint(model.left, wire.fromPin, "left");
    const rightPoint = datasheetConnectorPinPoint(model.right, wire.toPin, "right");
    addEdge(
      `datasheet_wire_${index + 1}`,
      `${escapeHtml(wire.name)} | ${escapeHtml(wire.colorName)} | ${escapeHtml(wire.awg || "?")} AWG`,
      leftPoint.x,
      leftPoint.y,
      rightPoint.x,
      rightPoint.y,
      `edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;strokeColor=${wire.stroke};strokeWidth=5;endArrow=none;startArrow=none;fontStyle=1;fontSize=10;`
    );
  });
  const wiringRows = model.wires.map((wire) => [
    wire.fromPin,
    wire.name,
    wire.colorName,
    wire.awg || model.gauge || "",
    formatLengthInches(wire.length || model.length),
    wire.toPin
  ]);
  addVertex(
    "datasheet_wiring_table",
    buildKiCadDrawioTableText("WIRING TABLE", ["LEFT", "SIGNAL", "COLOR", "AWG", "LENGTH", "RIGHT"], wiringRows),
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
  const heading = `${connector.name}<br><b>${connector.housingPart}</b><br>${connector.definition.family} | ${connector.positions} POS | ${connector.definition.pitch}`;
  addVertex(
    `${side}_datasheet_heading`,
    heading,
    geometry.centerX - 125,
    112,
    250,
    58,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=11;fontStyle=1;fontColor=#000000;align=center;"
  );
  if (connector.key === "powerpole1545") {
    for (let pin = 1; pin <= connector.positions; pin += 1) {
      const index = pin - 1;
      const column = index % geometry.columns;
      const row = Math.floor(index / geometry.columns);
      const x = geometry.x + column * (geometry.moduleWidth + geometry.gap);
      const y = geometry.y + row * (geometry.moduleHeight + geometry.gap);
      const active = connector.activePins.get(String(pin));
      const fill = active ? datasheetHousingFill(active.colorName) : "#858b8f";
      const fontColor = isDarkDatasheetColor(active?.colorName) ? "#ffffff" : "#000000";
      addVertex(
        `${side}_powerpole_${pin}`,
        String(pin),
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
    "MATING FACE - CIRCUIT 1 MARKED",
    geometry.centerX - 120,
    geometry.y + geometry.height + 8,
    240,
    22,
    "text;html=1;strokeColor=none;fillColor=none;fontSize=9;fontStyle=1;fontColor=#3d4448;align=center;"
  );
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
  add(mxCell({ id: "0" }));
  add(mxCell({ id: "1", parent: "0" }));
  addVertex("border", "", 10, 10, 1580, 780, "shape=rectangle;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#000000;strokeWidth=2;");
  addVertex("title", model.cableName, 650, 22, 300, 42, "text;html=1;strokeColor=none;fillColor=none;fontSize=38;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("subtitle", model.description, 560, 64, 480, 32, "text;html=1;strokeColor=none;fillColor=none;fontSize=24;fontStyle=5;fontColor=#000000;align=center;");
  addVertex("left_heading", `LEFT CONNECTOR<br>${model.leftConnector.name}<br>${model.leftConnector.type || ""}<br>${model.leftConnector.positionText}<br>(${model.leftConnector.view})`, 130, 30, 180, 124, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
  addVertex("right_heading", `RIGHT CONNECTOR<br>${model.rightConnector.name}<br>${model.rightConnector.type || ""}<br>${model.rightConnector.positionText}<br>(${model.rightConnector.view})`, 1270, 30, 190, 124, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
  addEdge("dim_length", `${formatLengthInches(model.length)} in +/-0.25<br>OVERALL LENGTH`, 382, 150, 1210, 150, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=15;");
  addHorizontalDrawioProtection(addVertex, {
    id: "main_protection",
    x1: 452,
    x2: 1138,
    top: model.wires[0].y - 30,
    bottom: model.wires[model.wires.length - 1].y + 30
  });
  addVertex("left_face", model.leftConnector.name, 170, Math.max(162, model.wires[0].y - 42), 88, model.wires[model.wires.length - 1].y - model.wires[0].y + 84, "rounded=1;whiteSpace=wrap;html=1;fillColor=#d7d7d7;strokeColor=#000000;strokeWidth=2;fontStyle=1;");
  addVertex("right_face", model.rightConnector.name, 1300, Math.max(162, model.wires[0].y - 42), 88, model.wires[model.wires.length - 1].y - model.wires[0].y + 84, "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontStyle=1;");
  model.wires.forEach((wire, index) => {
    const terminalStyle = `rounded=0;whiteSpace=wrap;html=1;fillColor=${wire.stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontColor=${wire.colorName === "BLACK" ? "#ffffff" : "#000000"};`;
    addVertex(`left_pin_${index}`, `PIN ${wire.fromPin}`, 45, wire.y - 14, 100, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`left_pin_num_${index}`, wire.fromPin, 320, wire.y - 14, 55, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_num_${index}`, wire.toPin, 1218, wire.y - 14, 55, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=16;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_${index}`, `PIN ${wire.toPin}`, 1412, wire.y - 14, 105, 28, "text;html=1;strokeColor=none;fillColor=none;fontSize=15;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`left_cavity_${index}`, "", 194, wire.y - 17, 38, 34, "rounded=1;whiteSpace=wrap;html=1;fillColor=#000000;strokeColor=#000000;strokeWidth=1;");
    addVertex(`right_cavity_${index}`, "", 1324, wire.y - 17, 38, 34, "rounded=1;whiteSpace=wrap;html=1;fillColor=#000000;strokeColor=#000000;strokeWidth=1;");
    addVertex(`left_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 370, wire.y - 16, 56, 32, terminalStyle);
    addVertex(`right_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 1164, wire.y - 16, 56, 32, terminalStyle);
    addEdge(`wire_${index}`, `${wire.name} (${wire.colorName}) ${wire.awg || ""} AWG`, 426, wire.y, 1164, wire.y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=8;endArrow=none;startArrow=none;fontStyle=1;fontSize=15;`);
  });
  addVertex("wiring_table", buildKiCadDrawioTableText("WIRING TABLE", ["LEFT PIN", "SIGNAL", "COLOR", "AWG", "LENGTH", "RIGHT PIN"], model.wires.map((wire) => [wire.fromPin, wire.name, wire.colorName, wire.awg || model.awg || "", `${formatLengthInches(wire.length || model.length)} in`, wire.toPin])), 30, 498, 560, 160, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=center;");
  addVertex("specs", buildKiCadDrawioTableText("SPECIFICATIONS", ["FIELD", "VALUE"], [
    ["WIRE GAUGE", `${model.awg || "TBD"} AWG`],
    ["LENGTH TOLERANCE", "+/-0.25 in"],
    ["BRANCHES", "NONE"],
    ["TAP POSITION", "NONE"]
  ]), 620, 498, 340, 166, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=left;spacingLeft=10;");
  addVertex("bom", buildKiCadDrawioTableText("BILL OF MATERIALS", ["ITEM", "QTY", "DESCRIPTION", "PART NUMBER"], buildKiCadBomRows(model)), 990, 498, 570, 160, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=center;");
  addVertex("notes", `<b>NOTES:</b><br>${buildKiCadNotes(model).map((note, index) => `${index + 1}. ${note}`).join("<br>")}`, 30, 674, 500, 106, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=12;align=left;");
  addVertex("legend", "WIRE COLOR LEGEND<br>RED = POWER<br>BLACK = GROUND", 548, 680, 260, 82, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=13;fontStyle=1;align=center;");
  addVertex("title_block", `DESCRIPTION:<br><b>${model.cableName} CABLE ASSEMBLY</b><br>${model.description}<br><br>SHEET: 1 OF 1 | SCALE: NONE | UNITS: INCH | DWG NO. ${model.cableName} | REV A`, 840, 674, 720, 106, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=13;align=center;");
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
  addEdge("dim_length", `${formatLengthInches(model.length)} in +/-0.25<br>OVERALL LENGTH`, 365, 146, 1188, 146, "edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#000000;strokeWidth=2;startArrow=classic;endArrow=classic;fontStyle=1;fontSize=14;");
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
    const terminalStyle = `rounded=0;whiteSpace=wrap;html=1;fillColor=${wire.stroke};strokeColor=#000000;strokeWidth=2;fontStyle=1;fontColor=${wire.colorName === "BLACK" ? "#ffffff" : "#000000"};`;
    addVertex(`left_pin_${index}`, `PIN ${wire.fromPin}`, 45, wire.y - 12, 92, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=right;");
    addVertex(`left_pin_num_${index}`, wire.fromPin, 320, wire.y - 12, 45, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=14;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`right_pin_num_${index}`, formatBoardPin(wire), 1190, wire.y - 12, 90, 24, "text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontStyle=1;fontColor=#000000;align=center;");
    addVertex(`left_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 350, wire.y - 11, 42, 22, terminalStyle);
    addVertex(`right_term_${index}`, wire.colorName === "BLACK" ? "-" : "+", 1136, wire.y - 11, 42, 22, terminalStyle);
    const wireRole = wire.maestroRole?.code ? `${wire.name} ${wire.maestroRole.code}` : wire.name;
    addEdge(`wire_${index}`, `${wireRole} (${wire.colorName}) ${wire.awg || ""} AWG`, 392, wire.y, 1136, wire.y, `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${wire.stroke};strokeWidth=7;endArrow=none;startArrow=none;fontStyle=1;fontSize=13;`);
  });
  addVertex("wiring_table", buildKiCadDrawioTableText("WIRING TABLE", ["LEG", "LEFT NAME", "LEFT PIN", "WIRE", "COLOR", "AWG", "LEN", "MAESTRO ROLE"], model.wires.map((wire) => [wire.row.leftLeg || "", wire.row.leftLegName || "", wire.fromPin, wire.name, wire.colorName, wire.awg || model.awg || "", `${formatLengthInches(wire.length || model.length)} in`, formatBoardPin(wire)])), 30, 538, 770, 220, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=10;align=center;");
  addVertex("bom", buildKiCadDrawioTableText("BILL OF MATERIALS", ["ITEM", "QTY", "DESCRIPTION", "PART NUMBER"], buildKiCadBomRows(model)), 830, 538, 730, 128, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=11;align=center;");
  addVertex("notes", `<b>NOTES:</b><br>Micro Maestro servo header: 1=GND edge, 2=V+ servo power, 3=SIG inside board.<br>${uniqueValues(model.wires.map((wire) => wire.row.comments)).slice(0, 1).join("<br>") || "Verify pin orientation before final assembly."}`, 830, 672, 730, 48, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;fontSize=11;align=left;");
  addVertex("title_block", `DESCRIPTION:<br><b>${model.cableName} CABLE ASSEMBLY</b><br>${model.description}<br>SHEET: 1 OF 1 | SCALE: NONE | UNITS: INCH | DWG NO. ${model.cableName} | REV A`, 830, 724, 730, 54, "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;fontSize=12;align=center;");
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
