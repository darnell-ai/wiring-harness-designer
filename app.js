"use strict";

const APP_VERSION = "1.4.3";
const OCR_WORKER_PATH = "vendor/tesseract/worker.min.js";
const OCR_CORE_PATH = "vendor/tesseract/core";
const OCR_LANG_PATH = "vendor/tesseract/lang";
const DRAWIO_EMBED_ORIGIN = "https://embed.diagrams.net";
const MAX_IMAGE_SIDE = 1600;
const SVG_WIDTH = 1200;
const SVG_HEIGHT = 800;

const dom = {
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  analyzeButton: document.querySelector("#analyzeButton"),
  pasteButton: document.querySelector("#pasteButton"),
  rotateButton: document.querySelector("#rotateButton"),
  resetButton: document.querySelector("#resetButton"),
  printButton: document.querySelector("#printButton"),
  exportDrawio: document.querySelector("#exportDrawio"),
  exportSvg: document.querySelector("#exportSvg"),
  exportPng: document.querySelector("#exportPng"),
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
  svgText: ""
};

let ocrWorkerPromise = null;
let ocrWorker = null;
let ocrUnavailable = false;

init();

function init() {
  dom.fileInput.addEventListener("change", () => {
    const [file] = dom.fileInput.files || [];
    if (file) {
      void loadDrawingFile(file);
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
  dom.exportPng.addEventListener("click", exportPng);
  dom.exportDrawio.addEventListener("click", exportDrawio);
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
      svgText: ""
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
    renderSchematic(result);
    renderFacts(result);
    renderFindings(result.findings);
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
  const segments = mergeSegments([...horizontal, ...vertical], source.width, source.height);
  const connectors = inferConnectors(segments, source.width, source.height);
  const components = inferMarkupComponents(cleanedMask, source.width, source.height);
  const longHorizontal = horizontal.filter((segment) => segment.length >= source.width * 0.14).length;
  const longVertical = vertical.filter((segment) => segment.length >= source.height * 0.16).length;
  const connectorBonus = connectors.length * 260;
  const markBonus = components.length * 30;
  const score = longHorizontal * 540 + longVertical * 160 + segments.length * 24 + connectorBonus + markBonus;

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
    .filter((segment) => segment.kind === "horizontal" && segment.length >= best.width * 0.08)
    .sort((left, right) => left.y1 - right.y1 || left.x1 - right.x1);
  const connectors = attachConnectorLabels(best.connectors, ocr.findings, best.width, best.height);
  const findings = classifyFindings(ocr.findings, best.components, best.width, best.height);
  const model = buildInternalModel(wireSegments, connectors, findings, best.width, best.height);
  const geometryConfidence = Math.min(1, wireSegments.length / 8);
  const connectorConfidence = Math.min(1, connectors.length / 4);
  const ocrConfidence = findings.length ? average(findings.map((finding) => finding.confidence)) : 0;
  const confidence = clamp(0.18 + geometryConfidence * 0.42 + connectorConfidence * 0.2 + ocrConfidence * 0.2, 0, 1);
  const status = confidence >= 0.74
    ? "High confidence read. Review the output, then export."
    : confidence >= 0.48
      ? "Medium confidence read. Review highlighted labels and endpoints."
      : "Low confidence read. Use a flatter photo with darker lines for production work.";

  return {
    version: APP_VERSION,
    fileName: meta.fileName,
    width: best.width,
    height: best.height,
    rotation: best.rotation,
    paperBounds: meta.paperBounds,
    sourceWidth: meta.sourceWidth,
    sourceHeight: meta.sourceHeight,
    wires: model.wires,
    connectors: model.connectors,
    findings,
    confidence,
    status
  };
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
  const fit = fitSourceToSvg(result.width, result.height);
  const grid = buildSvgGrid();
  const wires = result.wires.map((wire) => {
    const start = toSvgPoint(wire.x1, wire.y1, fit);
    const end = toSvgPoint(wire.x2, wire.y2, fit);
    const confidence = confidenceKey(wire.confidence);
    return `
      <g class="wire" data-confidence="${confidence}">
        <path d="M ${start.x.toFixed(1)} ${start.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}" />
        <circle cx="${start.x.toFixed(1)}" cy="${start.y.toFixed(1)}" r="3.5" />
        <circle cx="${end.x.toFixed(1)}" cy="${end.y.toFixed(1)}" r="3.5" />
        <text x="${((start.x + end.x) / 2).toFixed(1)}" y="${(start.y - 8).toFixed(1)}">${escapeXml(shortLabel(wire.label, 26))}</text>
      </g>
    `;
  }).join("");

  const connectors = result.connectors.map((connector) => {
    const topLeft = toSvgPoint(connector.x, connector.y, fit);
    const bottomRight = toSvgPoint(connector.x + connector.width, connector.y + connector.height, fit);
    const width = Math.max(42, bottomRight.x - topLeft.x);
    const height = Math.max(44, bottomRight.y - topLeft.y);
    const pins = connector.pins.map((pin, index) => {
      const py = topLeft.y + Math.min(height - 10, Math.max(10, (index + 1) * height / (connector.pins.length + 1)));
      const px = connector.side === "right" ? topLeft.x + 8 : topLeft.x + width - 8;
      return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.3" />`;
    }).join("");
    return `
      <g class="connector">
        <rect x="${topLeft.x.toFixed(1)}" y="${topLeft.y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" rx="4" />
        ${pins}
        <text x="${(topLeft.x + width / 2).toFixed(1)}" y="${(topLeft.y - 9).toFixed(1)}">${escapeXml(shortLabel(connector.label, 18))}</text>
      </g>
    `;
  }).join("");

  const findings = result.findings.map((finding) => {
    const point = toSvgPoint(finding.x, finding.y, fit);
    const confidence = confidenceKey(finding.confidence);
    if (finding.kind === "dimension") {
      const x2 = clamp(point.x + 90, 80, SVG_WIDTH - 80);
      return `
        <g class="dimension" data-confidence="${confidence}">
          <path d="M ${point.x.toFixed(1)} ${point.y.toFixed(1)} L ${x2.toFixed(1)} ${point.y.toFixed(1)}" marker-start="url(#arrow)" marker-end="url(#arrow)" />
          <text x="${((point.x + x2) / 2).toFixed(1)}" y="${(point.y - 8).toFixed(1)}">${escapeXml(shortLabel(finding.text, 20))}</text>
        </g>
      `;
    }
    return `
      <g class="label" data-confidence="${confidence}">
        <rect x="${(point.x - 4).toFixed(1)}" y="${(point.y - 15).toFixed(1)}" width="${Math.max(52, finding.text.length * 7).toFixed(1)}" height="22" rx="4" />
        <text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}">${escapeXml(shortLabel(finding.text, 28))}</text>
      </g>
    `;
  }).join("");

  const title = escapeXml(result.fileName || "DIGIWIRE SCHEMATIC");
  const percent = Math.round(result.confidence * 100);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${title}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#39463f" />
    </marker>
    <style>
      .sheet { fill: #fbfcf7; }
      .grid-minor { stroke: rgba(71, 91, 80, 0.09); stroke-width: 1; }
      .grid-major { stroke: rgba(71, 91, 80, 0.16); stroke-width: 1.2; }
      .border { fill: none; stroke: #9aa79f; stroke-width: 2; }
      .title { fill: #151b18; font: 800 18px Aptos, Segoe UI, sans-serif; }
      .meta { fill: #66736d; font: 800 12px Aptos, Segoe UI, sans-serif; }
      .wire path { fill: none; stroke: #17231c; stroke-width: 3.2; stroke-linecap: round; }
      .wire circle { fill: #17231c; stroke: #fbfcf7; stroke-width: 1.6; }
      .wire text { fill: #243128; font: 800 12px Aptos, Segoe UI, sans-serif; paint-order: stroke; stroke: #fbfcf7; stroke-width: 4; }
      .connector rect { fill: #eef4ee; stroke: #17231c; stroke-width: 2; }
      .connector circle { fill: #17231c; }
      .connector text { fill: #243128; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; }
      .label rect { fill: rgba(255, 255, 255, 0.72); stroke: #8d9b93; stroke-width: 1; }
      .label text { fill: #26322c; font: 800 12px Aptos, Segoe UI, sans-serif; }
      .dimension path { fill: none; stroke: #39463f; stroke-width: 1.8; stroke-dasharray: 7 5; }
      .dimension text { fill: #39463f; font: 900 12px Aptos, Segoe UI, sans-serif; text-anchor: middle; paint-order: stroke; stroke: #fbfcf7; stroke-width: 4; }
      [data-confidence="low"] { opacity: 0.55; }
      [data-confidence="medium"] { opacity: 0.78; }
    </style>
  </defs>
  <rect class="sheet" x="0" y="0" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" />
  ${grid}
  <rect class="border" x="28" y="28" width="${SVG_WIDTH - 56}" height="${SVG_HEIGHT - 56}" rx="6" />
  <text class="title" x="48" y="56">${title}</text>
  <text class="meta" x="48" y="76">DIGIWIRE v${APP_VERSION} | confidence ${percent}% | rotation ${orientationLabel(result.rotation)}</text>
  ${connectors}
  ${wires}
  ${findings}
</svg>`;
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
  const counts = new Array(axisLength).fill(0);
  const minCross = new Array(axisLength).fill(crossLength);
  const maxCross = new Array(axisLength).fill(-1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) {
        continue;
      }
      const axis = orientation === "horizontal" ? y : x;
      const cross = orientation === "horizontal" ? x : y;
      counts[axis] += 1;
      minCross[axis] = Math.min(minCross[axis], cross);
      maxCross[axis] = Math.max(maxCross[axis], cross);
    }
  }

  const smoothed = smooth(counts, 2);
  const peak = smoothed.reduce((max, count) => Math.max(max, count), 0);
  const threshold = Math.max(5, peak * 0.34);
  const clusters = [];
  let start = -1;
  for (let index = 0; index < axisLength; index += 1) {
    if (smoothed[index] >= threshold) {
      if (start < 0) {
        start = index;
      }
    } else if (start >= 0) {
      clusters.push({ start, end: index - 1 });
      start = -1;
    }
  }
  if (start >= 0) {
    clusters.push({ start, end: axisLength - 1 });
  }

  return clusters.map((cluster) => {
    let low = crossLength;
    let high = -1;
    let peakCount = 0;
    for (let index = cluster.start; index <= cluster.end; index += 1) {
      peakCount = Math.max(peakCount, counts[index]);
      low = Math.min(low, minCross[index]);
      high = Math.max(high, maxCross[index]);
    }
    const axis = (cluster.start + cluster.end) / 2;
    const thickness = cluster.end - cluster.start + 1;
    const length = high - low + 1;
    if (high <= low || length < crossLength * 0.045 || thickness > axisLength * 0.22) {
      return null;
    }
    const confidence = clamp(length / crossLength * 0.75 + peakCount / crossLength * 0.25, 0, 1);
    return orientation === "horizontal"
      ? { id: makeId("H"), kind: "horizontal", x1: low, y1: axis, x2: high, y2: axis, length, thickness, confidence }
      : { id: makeId("V"), kind: "vertical", x1: axis, y1: low, x2: axis, y2: high, length, thickness, confidence };
  }).filter(Boolean);
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
  dom.confidenceFill.style.background = result.confidence >= 0.74 ? "var(--green)" : result.confidence >= 0.48 ? "var(--amber)" : "var(--red)";
  dom.orientationFact.textContent = orientationLabel(result.rotation);
  dom.wireFact.textContent = String(result.wires.length);
  dom.connectorFact.textContent = String(result.connectors.length);
  dom.labelFact.textContent = String(result.findings.filter((finding) => finding.kind !== "marker").length);
}

function renderFindings(findings) {
  dom.findingCount.textContent = `${findings.length} item${findings.length === 1 ? "" : "s"}`;
  if (!findings.length) {
    dom.findingsList.innerHTML = `<span class="quiet">No labels or markups were read.</span>`;
    return;
  }
  dom.findingsList.innerHTML = findings.slice(0, 40).map((finding) => {
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
  renderSourcePreview();
}

function setBusy(isBusy) {
  dom.analyzeButton.disabled = isBusy || !appState.image;
  dom.pasteButton.disabled = isBusy;
  dom.rotateButton.disabled = isBusy || !appState.image;
  dom.resetButton.disabled = isBusy;
}

function setExportsEnabled(enabled) {
  dom.exportDrawio.disabled = !enabled;
  dom.exportSvg.disabled = !enabled;
  dom.exportPng.disabled = !enabled;
  dom.printButton.disabled = !enabled;
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
    svgText: ""
  };
  dom.fileInput.value = "";
  dom.analyzeButton.disabled = true;
  dom.pasteButton.disabled = false;
  dom.rotateButton.disabled = true;
  dom.printButton.disabled = true;
  setStatus("Upload or paste an image to start.");
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
    canvas.width = SVG_WIDTH * 2;
    canvas.height = SVG_HEIGHT * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fbfcf7";
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
  downloadText(`${fileBase(appState.fileName || "digiwire")}.drawio`, xml, "application/xml");
}

function buildDrawioXml(result) {
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
  result.findings.forEach((finding, index) => {
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
