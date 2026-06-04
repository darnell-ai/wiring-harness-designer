"use strict";

const APP_VERSION = "1.1.10";
const STORAGE_KEY = "wiring-harness-designer-state-v1";
const subconPinCounts = [2, 4, 6, 8, 10, 12, 14, 16];
const WIRE_LANE_GAP = 20;

const colorMap = {
  BLACK: "#050505",
  RED: "#db2b2b",
  WHITE: "#f8f8ed",
  GREEN: "#16a05d",
  BLUE: "#2c70d7",
  YELLOW: "#f4c531",
  ORANGE: "#eb7d2c",
  BROWN: "#76513a",
  VIOLET: "#8054c8",
  GRAY: "#8a928d"
};

const options = {
  legs: ["", "1", "2", "3", "4", "MAIN", "AUX", "PANEL", "MOTOR"],
  pins: ["", ...Array.from({ length: 32 }, (_, index) => String(index + 1))],
  dnp: ["", "DNP"],
  housings: [
    "",
    "A POWER POLE",
    "B POWER POLE",
    "PCB",
    ...subconPinCounts.flatMap((pinCount) => [
      `SUBCONN ${pinCount} PIN MALE`,
      `SUBCONN ${pinCount} PIN FEMALE`
    ]),
    ...Array.from({ length: 8 }, (_, index) => `MOLEX ${index + 1} POS FRONT LOCK`),
    ...Array.from({ length: 8 }, (_, index) => `MOLEX ${index + 1} POS SIDE LOCK`),
    ...Array.from({ length: 12 }, (_, index) => `DUPONT ${index + 1} POS FRONT LOCK`),
    "MOLEX MINI-FIT",
    "RING TERMINAL",
    "SPLICE"
  ],
  gauges: ["", "10", "12", "14", "16", "18", "20", "22", "24"],
  colors: ["", ...Object.keys(colorMap)],
  spliceIds: ["", ...Array.from({ length: 12 }, (_, index) => `S${index + 1}`)],
  spliceRoles: ["", "PARENT", "BRANCH"]
};

const dom = {
  harnessName: document.querySelector("#harnessName"),
  selectedTitle: document.querySelector("#selectedTitle"),
  summaryStatus: document.querySelector("#summaryStatus"),
  summaryGauge: document.querySelector("#summaryGauge"),
  summaryColor: document.querySelector("#summaryColor"),
  summaryColorSwatch: document.querySelector("#summaryColorSwatch"),
  summaryLength: document.querySelector("#summaryLength"),
  summaryLeft: document.querySelector("#summaryLeft"),
  summaryRight: document.querySelector("#summaryRight"),
  summaryHousing: document.querySelector("#summaryHousing"),
  previewName: document.querySelector("#previewName"),
  activeCount: document.querySelector("#activeCount"),
  dnpCount: document.querySelector("#dnpCount"),
  totalLength: document.querySelector("#totalLength"),
  colorLegend: document.querySelector("#colorLegend"),
  wirePreview: document.querySelector("#wirePreview"),
  wireRows: document.querySelector("#wireRows"),
  searchRows: document.querySelector("#searchRows"),
  activeOnly: document.querySelector("#activeOnly"),
  toast: document.querySelector("#toast"),
  importJson: document.querySelector("#importJson"),
  importJsonButton: document.querySelector("#importJsonButton"),
  imageImportButton: document.querySelector("#imageImportButton"),
  imageUpload: document.querySelector("#imageUpload"),
  imageDialog: document.querySelector("#imageDialog"),
  closeImageDialog: document.querySelector("#closeImageDialog"),
  chooseImageButton: document.querySelector("#chooseImageButton"),
  readImageButton: document.querySelector("#readImageButton"),
  translateImageText: document.querySelector("#translateImageText"),
  applyImageRows: document.querySelector("#applyImageRows"),
  importImagePreview: document.querySelector("#importImagePreview"),
  imageStatus: document.querySelector("#imageStatus"),
  importText: document.querySelector("#importText"),
  importPreviewCount: document.querySelector("#importPreviewCount"),
  importPreviewRows: document.querySelector("#importPreviewRows"),
  addRow: document.querySelector("#addRow"),
  duplicateRow: document.querySelector("#duplicateRow"),
  deleteRow: document.querySelector("#deleteRow"),
  resetSample: document.querySelector("#resetSample"),
  exportJson: document.querySelector("#exportJson"),
  exportCsv: document.querySelector("#exportCsv"),
  exportDrawing: document.querySelector("#exportDrawing"),
  exportInstructions: document.querySelector("#exportInstructions"),
  printButton: document.querySelector("#printButton")
};

let state = loadState();
let toastTimer = 0;
let pendingImportRows = [];
let currentImageFile = null;

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `wire-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStarterRows() {
  const rows = [];

  for (let pin = 1; pin <= 16; pin += 1) {
    const active = pin <= 4;
    rows.push({
      id: makeId(),
      leftLeg: "1",
      name: pin === 1 ? "CPC 1 POWER" : "",
      leftPin: String(pin),
      dnp: !active,
      housing: active ? "A POWER POLE" : "",
      awg: active ? "16" : "",
      color: active ? (pin === 1 ? "BLACK" : "RED") : "",
      length: active ? "8" : "",
      spliceId: "",
      spliceRole: "",
      rightLeg: "",
      rightPin: "",
      rightHousing: ""
    });
  }

  for (let pin = 1; pin <= 16; pin += 1) {
    rows.push({
      id: makeId(),
      leftLeg: "2",
      name: "",
      leftPin: String(pin),
      dnp: true,
      housing: "",
      awg: "",
      color: "",
      length: "",
      spliceId: "",
      spliceRole: "",
      rightLeg: "",
      rightPin: "",
      rightHousing: ""
    });
  }

  return rows;
}

function starterState() {
  const rows = createStarterRows();
  return {
    harnessName: "CPC Power Harness",
    selectedId: rows[0]?.id || "",
    rows
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return starterState();
    }

    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.rows)) {
      return starterState();
    }

    return normalizeState(parsed);
  } catch (error) {
    return starterState();
  }
}

function normalizeState(incoming) {
  const rows = incoming.rows.map((row) => ({
    id: row.id || makeId(),
    leftLeg: value(row.leftLeg),
    name: value(row.name),
    leftPin: value(row.leftPin),
    dnp: isDnp(row.dnp),
    housing: value(row.housing),
    awg: value(row.awg),
    color: value(row.color).toUpperCase(),
    length: value(row.length),
    spliceId: value(row.spliceId).trim().toUpperCase(),
    spliceRole: normalizedSpliceRole(row),
    rightLeg: value(row.rightLeg),
    rightPin: value(row.rightPin),
    rightHousing: value(row.rightHousing)
  }));

  return {
    harnessName: value(incoming.harnessName) || "Untitled Harness",
    selectedId: rows.some((row) => row.id === incoming.selectedId) ? incoming.selectedId : rows[0]?.id || "",
    rows
  };
}

function value(input) {
  return input === null || input === undefined ? "" : String(input);
}

function normalizedSpliceRole(row) {
  const role = value(row?.spliceRole).trim().toUpperCase();
  return role === "PARENT" || role === "BRANCH" ? role : "";
}

function normalizedSpliceId(row) {
  return value(row?.spliceId).trim().toUpperCase();
}

function isSpliceRow(row) {
  return Boolean(normalizedSpliceId(row) && normalizedSpliceRole(row));
}

function rowUsesSide(row, side) {
  const role = normalizedSpliceRole(row);
  if (role === "PARENT") {
    return side === "left";
  }
  if (role === "BRANCH") {
    return side === "right";
  }
  return true;
}

function nextSpliceId() {
  const used = new Set(state.rows.map(normalizedSpliceId).filter(Boolean));
  return options.spliceIds.find((spliceId) => spliceId && !used.has(spliceId)) || "S1";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function selectedRow() {
  return state.rows.find((row) => row.id === state.selectedId) || state.rows[0] || null;
}

function activeRows() {
  return state.rows.filter((row) => !isDnp(row.dnp));
}

function render() {
  dom.harnessName.value = state.harnessName;
  renderSummary();
  renderPreview();
  renderLegend();
  renderTable();
  updateActionState();
}

function renderSummary() {
  const row = selectedRow();
  if (!row) {
    dom.selectedTitle.textContent = "No row";
    dom.summaryStatus.textContent = "Empty";
    dom.summaryGauge.textContent = "-";
    dom.summaryColor.textContent = "-";
    dom.summaryLength.textContent = "-";
    dom.summaryLeft.textContent = "-";
    dom.summaryRight.textContent = "-";
    dom.summaryHousing.textContent = "-";
    dom.summaryColorSwatch.style.setProperty("--swatch", "#d9dfd7");
    return;
  }

  const color = row.color || "UNSET";
  const spliceId = normalizedSpliceId(row);
  const spliceRole = normalizedSpliceRole(row);
  const selectedPin = spliceRole === "BRANCH" ? row.rightPin : row.leftPin;
  dom.selectedTitle.textContent = `${row.name || "Wire"} / Pin ${selectedPin || "-"}`;
  dom.summaryStatus.textContent = isDnp(row.dnp) ? "DNP" : "Active";
  dom.summaryGauge.textContent = row.awg ? `${row.awg} AWG` : "Not set";
  dom.summaryColor.textContent = color;
  dom.summaryColorSwatch.style.setProperty("--swatch", colorMap[row.color] || "#d9dfd7");
  dom.summaryLength.textContent = row.length ? `${row.length} in` : "Not set";
  dom.summaryLeft.textContent = spliceRole === "BRANCH"
    ? `Splice ${spliceId || "-"}`
    : `Leg ${row.leftLeg || "-"} / Pin ${row.leftPin || "-"}`;
  dom.summaryRight.textContent = spliceRole === "PARENT"
    ? `Splice ${spliceId || "-"}`
    : row.rightLeg || row.rightPin || row.rightHousing
      ? `Leg ${row.rightLeg || "-"} / Pin ${row.rightPin || "-"}`
      : "Not assigned";
  dom.summaryHousing.textContent = spliceRole === "BRANCH"
    ? row.rightHousing || "Not set"
    : row.housing || "Not set";
}

function renderPreview() {
  const row = selectedRow();
  const active = activeRows();
  const dnp = state.rows.length - active.length;
  const total = active.reduce((sum, item) => sum + parseFloat(item.length || 0), 0);
  const selected = row && !isDnp(row.dnp) ? row : {};
  const hasSelectedWire = Boolean(selected.id);

  dom.previewName.textContent = hasSelectedWire
    ? selected.name || state.harnessName || "Harness preview"
    : active.length ? "Harness preview" : "No active wires";
  dom.activeCount.textContent = String(active.length);
  dom.dnpCount.textContent = String(dnp);
  dom.totalLength.textContent = Number.isInteger(total) ? String(total) : total.toFixed(1);

  const previewRows = active;
  const leftConnectors = buildConnectors(legKeys(previewRows, "left", selected), "left", previewRows, selected);
  const rightConnectors = buildConnectors(legKeys(previewRows, "right", selected), "right", previewRows, selected);
  const leftMap = new Map(leftConnectors.map((connector) => [connector.key, connector]));
  const rightMap = new Map(rightConnectors.map((connector) => [connector.key, connector]));
  const routeBaseY = wireRouteBase(leftConnectors, rightConnectors);
  const previewHeight = previewCanvasHeight(leftConnectors, rightConnectors, active.length);
  const selectedWireIndex = Math.max(0, previewRows.findIndex((item) => item.id === selected.id));
  const splicePoints = buildSplicePoints(previewRows, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight);
  const selectedEndpoints = wireEndpoints(
    selected,
    selectedWireIndex,
    leftMap,
    rightMap,
    leftConnectors,
    splicePoints,
    previewHeight
  );
  const selectedStart = selectedEndpoints.start;
  const selectedEnd = selectedEndpoints.end;
  const spliceSelected = isSpliceRow(selected);
  const labelX = spliceSelected ? 205 : 384;
  const labelY = spliceSelected
    ? clamp((selectedStart.exit === "splice" ? selectedStart.y : selectedEnd.y) - 140, 74, previewHeight - 112)
    : 54;
  const wireColor = colorMap[selected.color] || "#aeb8b0";

  const connectors = [
    ...leftConnectors.map((connector) => renderConnector(connector, "left", previewRows, selected)),
    ...rightConnectors.map((connector) => renderConnector(connector, "right", previewRows, selected))
  ].join("");

  const backgroundWires = active
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.id !== selected.id)
    .map(({ item, index }) => {
      const endpoints = wireEndpoints(item, index, leftMap, rightMap, leftConnectors, splicePoints, previewHeight);
      const { start, end } = endpoints;
      const color = colorMap[item.color] || "#7e8a82";
      const path = wirePath(start, end, index, routeBaseY);
      const outline = item.color === "BLACK" ? "#edf4ef" : "#07100b";
      return `
        <path d="${path}" fill="none" stroke="${outline}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.78" />
        <path d="${path}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9" />
      `;
    })
    .join("");

  const spliceNodes = renderSpliceNodes(splicePoints, selected);
  const mainPath = wirePath(selectedStart, selectedEnd, selectedWireIndex, routeBaseY);
  const endpointLabel = selectedEnd.exit === "splice"
    ? `${escapeXml(normalizedSpliceId(selected))} WINDOW SPLICE`
    : selected.rightLeg
    ? `RIGHT LEG ${escapeXml(selected.rightLeg)} / PIN ${escapeXml(selected.rightPin || "-")}`
    : "UNASSIGNED";
  const selectedName = escapeXml(selected.name || state.harnessName || "Wire");
  const lengthText = selected.length ? `${escapeXml(selected.length)} IN` : "LENGTH NOT SET";
  const gaugeText = selected.awg ? `${escapeXml(selected.awg)} AWG` : "AWG NOT SET";
  const startEndpointLabel = ["bottom", "splice"].includes(selectedStart.exit) ? "" : `
    <text x="${selectedStart.x + 18}" y="${selectedStart.y - 14}" class="wire-sub">LEFT LEG ${escapeXml(selected.leftLeg || "-")} / PIN ${escapeXml(selected.leftPin || "-")}</text>
  `;
  const endEndpointLabel = ["bottom", "splice"].includes(selectedEnd.exit) ? "" : `
    <text x="${Math.min(selectedEnd.x + 16, 820)}" y="${selectedEnd.y - 18}" class="wire-sub">${endpointLabel}</text>
  `;
  const selectedWireMarkup = hasSelectedWire ? `
    <path d="${mainPath}" fill="none" stroke="${selected.color === "BLACK" ? "#f6fbf4" : "rgba(0,0,0,0.62)"}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <path d="${mainPath}" fill="none" stroke="${wireColor}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="1" filter="url(#wireGlow)" />

    ${selectedStart.exit === "splice" ? "" : `<circle cx="${selectedStart.x}" cy="${selectedStart.y}" r="13" fill="none" stroke="#f2c84b" stroke-width="3" />`}
    ${selectedEnd.exit === "splice" ? "" : `<circle cx="${selectedEnd.x}" cy="${selectedEnd.y}" r="12" fill="#15201b" stroke="#41b883" stroke-width="3" />`}

    <rect x="${labelX}" y="${labelY}" width="236" height="76" rx="8" fill="#f8faf5" opacity="0.97" />
    <text x="${labelX + 20}" y="${labelY + 26}" class="wire-label">${selectedName}</text>
    <text x="${labelX + 20}" y="${labelY + 49}" class="wire-label">${gaugeText} / ${lengthText}</text>
    <text x="${labelX + 20}" y="${labelY + 69}" class="wire-label">${escapeXml(selected.color || "COLOR NOT SET")}</text>

    ${startEndpointLabel}
    ${endEndpointLabel}
  ` : active.length ? "" : `
    <text x="500" y="${previewHeight / 2 - 8}" class="empty-preview" text-anchor="middle">NO ACTIVE WIRES</text>
    <text x="500" y="${previewHeight / 2 + 20}" class="empty-preview-sub" text-anchor="middle">Choose a row and enter its wire settings.</text>
  `;

  dom.wirePreview.setAttribute("viewBox", `0 0 1000 ${previewHeight}`);
  dom.wirePreview.style.height = `${previewHeight}px`;
  dom.wirePreview.innerHTML = `
    <defs>
      <filter id="wireGlow" x="-20%" y="-60%" width="140%" height="220%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="boardLine" x1="0" x2="1">
        <stop offset="0" stop-color="#41b883" stop-opacity="0.42" />
        <stop offset="0.52" stop-color="#f2c84b" stop-opacity="0.35" />
        <stop offset="1" stop-color="#3d7cc9" stop-opacity="0.32" />
      </linearGradient>
      <style>
        .pin-number { fill: #c5d3c8; font: 12px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .connector-label { fill: #eff8f1; font: 14px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .tiny-label { fill: #aebeb3; font: 11px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .housing-label { fill: #aebeb3; font: 9px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .wire-label { fill: #101814; font: 13px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .wire-sub { fill: #eff8f1; font: 12px Segoe UI, Arial, sans-serif; font-weight: 750; }
        .splice-label { fill: #f7edd0; font: 11px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .splice-role { fill: #aebeb3; font: 9px Segoe UI, Arial, sans-serif; font-weight: 750; }
        .empty-preview { fill: #dbe8de; font: 18px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .empty-preview-sub { fill: #90a197; font: 12px Segoe UI, Arial, sans-serif; font-weight: 700; }
      </style>
    </defs>

    <rect x="0" y="0" width="1000" height="${previewHeight}" fill="#15201b" opacity="0.58" />
    <line x1="170" y1="34" x2="830" y2="34" stroke="url(#boardLine)" stroke-width="2" stroke-dasharray="8 8" />
    <line x1="170" y1="${previewHeight - 34}" x2="830" y2="${previewHeight - 34}" stroke="url(#boardLine)" stroke-width="2" stroke-dasharray="8 8" />
    ${connectors}
    ${backgroundWires}
    ${selectedWireMarkup}
    ${spliceNodes}
  `;
}

function buildSplicePoints(rows, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight) {
  const groups = new Map();
  rows
    .filter(isSpliceRow)
    .forEach((row) => {
      const spliceId = normalizedSpliceId(row);
      if (!groups.has(spliceId)) {
        groups.set(spliceId, []);
      }
      groups.get(spliceId).push(row);
    });

  const reservedY = [];
  return new Map([...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([spliceId, group], index) => {
      const endpointY = [];
      group.forEach((row) => {
        const role = normalizedSpliceRole(row);
        if (role === "PARENT") {
          const connector = leftMap.get(legKey(row.leftLeg)) || leftConnectors[0];
          if (connector) {
            endpointY.push(pinPoint(connector, row.leftPin, "left").y);
          }
        } else if (role === "BRANCH" && row.rightLeg) {
          const connector = rightMap.get(legKey(row.rightLeg)) || rightConnectors[0];
          if (connector) {
            endpointY.push(pinPoint(connector, row.rightPin, "right").y);
          }
        }
      });

      const averageY = endpointY.length
        ? endpointY.reduce((sum, y) => sum + y, 0) / endpointY.length
        : 118 + index * 72;
      let y = clamp(averageY, 92, previewHeight - 74);
      while (reservedY.some((usedY) => Math.abs(usedY - y) < 62)) {
        y = clamp(y + 68, 92, previewHeight - 74);
        if (reservedY.some((usedY) => Math.abs(usedY - y) < 62) && y >= previewHeight - 74) {
          y = clamp(92 + index * 68, 92, previewHeight - 74);
          break;
        }
      }
      reservedY.push(y);

      const parentCount = group.filter((row) => normalizedSpliceRole(row) === "PARENT").length;
      const branchCount = group.filter((row) => normalizedSpliceRole(row) === "BRANCH").length;
      return [spliceId, {
        x: 500 + (index % 2 === 0 ? -18 : 18),
        y,
        exit: "splice",
        spliceId,
        parentCount,
        branchCount
      }];
    }));
}

function wireEndpoints(item, index, leftMap, rightMap, leftConnectors, splicePoints, previewHeight) {
  const role = normalizedSpliceRole(item);
  const spliceId = normalizedSpliceId(item);
  const splice = splicePoints.get(spliceId) || {
    x: 500,
    y: clamp(105 + Math.max(0, index) * 26, 88, previewHeight - 70),
    exit: "splice",
    spliceId
  };

  if (role === "PARENT") {
    return {
      start: pinPoint(leftMap.get(legKey(item.leftLeg)) || leftConnectors[0], item.leftPin, "left"),
      end: splice
    };
  }

  if (role === "BRANCH") {
    return {
      start: splice,
      end: item.rightLeg && rightMap.has(legKey(item.rightLeg))
        ? pinPoint(rightMap.get(legKey(item.rightLeg)), item.rightPin || "1", "right")
        : unassignedPoint(index, previewHeight)
    };
  }

  return {
    start: pinPoint(leftMap.get(legKey(item.leftLeg)) || leftConnectors[0], item.leftPin, "left"),
    end: item.rightLeg && rightMap.has(legKey(item.rightLeg))
      ? pinPoint(rightMap.get(legKey(item.rightLeg)), item.rightPin || item.leftPin, "right")
      : unassignedPoint(index, previewHeight)
  };
}

function renderSpliceNodes(splicePoints, selected) {
  const selectedSpliceId = normalizedSpliceId(selected);
  return [...splicePoints.values()].map((point) => {
    const isSelected = selectedSpliceId === point.spliceId;
    const stroke = isSelected ? "#f2c84b" : "#8fa198";
    return `
      <g aria-label="${escapeXml(point.spliceId)} window splice">
        <text x="${point.x}" y="${point.y - 22}" class="splice-label" text-anchor="middle">${escapeXml(point.spliceId)} WINDOW SPLICE</text>
        <path d="M ${point.x - 31} ${point.y - 10} H ${point.x - 22} L ${point.x - 14} ${point.y - 15} H ${point.x + 14} L ${point.x + 22} ${point.y - 10} H ${point.x + 31} V ${point.y + 10} H ${point.x + 22} L ${point.x + 14} ${point.y + 15} H ${point.x - 14} L ${point.x - 22} ${point.y + 10} H ${point.x - 31} Z"
          fill="#a8b6ae" stroke="${stroke}" stroke-width="${isSelected ? 4 : 3}" />
        <rect x="${point.x - 15}" y="${point.y - 11}" width="30" height="22" rx="4" fill="#d7dfda" stroke="#66776e" stroke-width="2" />
        <line x1="${point.x - 8}" y1="${point.y}" x2="${point.x + 8}" y2="${point.y}" stroke="#6f7e76" stroke-width="3" />
        <text x="${point.x}" y="${point.y + 31}" class="splice-role" text-anchor="middle">${point.parentCount} PARENT / ${point.branchCount} BRANCH</text>
      </g>
    `;
  }).join("");
}

function buildConnectors(keys, side, rows, selected) {
  if (!keys.length) {
    return [];
  }

  const gap = 90;
  const top = 54;
  let y = top;

  return keys.map((key) => {
    const housing = connectorHousing(key, side, rows, selected);
    const pinCount = housingPositionCount(housing);
    const family = housingFamily(housing);
    const positionData = connectorPositionData(key, side, rows);
    const dimensions = connectorDimensions(family, pinCount, positionData.length);
    const x = side === "left" ? 38 : 1000 - 38 - dimensions.width;
    const connector = {
      key,
      side,
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
      housing,
      pinCount,
      positionData,
      family,
      gender: housingGender(housing)
    };
    y += dimensions.height + gap;
    return connector;
  });
}

function housingPositionCount(housing) {
  const match = value(housing).toUpperCase().match(/\b(\d{1,2})\s+(?:POS|PIN)\b/);
  if (match) {
    return Math.max(1, Math.min(32, Number(match[1])));
  }

  if (value(housing).toUpperCase() === "RING TERMINAL") {
    return 1;
  }

  return 16;
}

function housingFamily(housing) {
  const text = value(housing).trim().toUpperCase();
  if (text.startsWith("SUBCONN ")) {
    return "subconn";
  }
  if (text.startsWith("MOLEX ")) {
    return "molex";
  }
  if (text.startsWith("DUPONT ")) {
    return "dupont";
  }
  if (text.includes("POWER POLE")) {
    return "powerpole";
  }
  if (text === "PCB") {
    return "pcb";
  }
  if (text === "RING TERMINAL") {
    return "ring";
  }
  if (text === "SPLICE") {
    return "splice";
  }
  return "generic";
}

function housingGender(housing) {
  const text = value(housing).trim().toUpperCase();
  if (text.endsWith(" FEMALE")) {
    return "female";
  }
  if (text.endsWith(" MALE")) {
    return "male";
  }
  return "";
}

function connectorDimensions(family, pinCount, positionCount) {
  if (family === "subconn") {
    return { width: 176, height: 176 };
  }
  if (family === "powerpole") {
    const count = Math.max(1, positionCount || 1);
    const columns = Math.min(4, count);
    const rows = Math.ceil(count / 4);
    return {
      width: 12 + columns * 44 + Math.max(0, columns - 1) * 3,
      height: 12 + rows * 78 + Math.max(0, rows - 1) * 5
    };
  }
  if (family === "ring") {
    return { width: 132, height: 104 };
  }
  if (family === "splice") {
    return { width: 164, height: 88 };
  }
  if (family === "molex") {
    return {
      width: clamp(72 + Math.max(0, pinCount - 1) * 34, 124, 360),
      height: 112
    };
  }
  if (family === "dupont") {
    return {
      width: clamp(60 + Math.max(0, pinCount - 1) * 24, 100, 360),
      height: 88
    };
  }
  return {
    width: family === "pcb" ? 164 : 148,
    height: connectorHeight(pinCount)
  };
}

function connectorHeight(pinCount) {
  if (pinCount <= 1) {
    return 82;
  }

  return Math.max(104, Math.min(276, 52 + pinCount * 14));
}

function connectorBottom(leftConnectors, rightConnectors) {
  const allConnectors = [...leftConnectors, ...rightConnectors];
  if (!allConnectors.length) {
    return 180;
  }

  return Math.ceil(Math.max(...allConnectors.map((connector) => connector.y + connector.height)));
}

function wireRouteBase(leftConnectors, rightConnectors) {
  return connectorBottom(leftConnectors, rightConnectors) + 74;
}

function previewCanvasHeight(leftConnectors, rightConnectors, wireCount = 0) {
  const routeBaseY = wireRouteBase(leftConnectors, rightConnectors);
  return Math.max(
    360,
    routeBaseY + Math.max(1, wireCount) * WIRE_LANE_GAP + 54
  );
}

function legKeys(rows, side, selected) {
  const keys = [];
  const add = (key) => {
    const clean = legKey(key);
    if (clean && !keys.includes(clean)) {
      keys.push(clean);
    }
  };

  rows.filter((item) => !isDnp(item.dnp)).forEach((item) => {
    if (!rowUsesSide(item, side)) {
      return;
    }
    if (side === "left") {
      add(item.leftLeg);
      return;
    }

    if (item.rightLeg) {
      add(item.rightLeg);
    }
  });

  if (side === "left" && selected?.leftLeg && rowUsesSide(selected, side)) {
    add(selected.leftLeg);
  }

  if (side === "right" && selected?.rightLeg && rowUsesSide(selected, side)) {
    add(selected.rightLeg);
  }

  return keys;
}

function legKey(leg) {
  return value(leg).trim() || "-";
}

function connectorPositionData(key, side, rows) {
  const positions = new Map();
  rows
    .filter((row) => !isDnp(row.dnp))
    .filter((row) => rowUsesSide(row, side))
    .filter((row) => side === "left" ? legKey(row.leftLeg) === key : legKey(row.rightLeg) === key)
    .forEach((row) => {
      const position = numberOrDefault(side === "left" ? row.leftPin : row.rightPin, 0);
      if (position && !positions.has(position)) {
        positions.set(position, {
          position,
          color: row.color || "UNSET",
          name: row.name || ""
        });
      }
    });

  return [...positions.values()].sort((left, right) => left.position - right.position);
}

function powerpoleModuleRect(connector, pin) {
  const position = numberOrDefault(pin, 0);
  const index = Math.max(0, connector.positionData.findIndex((item) => item.position === position));
  const column = index % 4;
  const row = Math.floor(index / 4);
  const moduleWidth = 44;
  const moduleHeight = 78;
  const gapX = 3;
  const gapY = 5;
  return {
    x: connector.x + 6 + column * (moduleWidth + gapX),
    y: connector.y + 6 + row * (moduleHeight + gapY),
    width: moduleWidth,
    height: moduleHeight,
    index,
    color: connector.positionData[index]?.color || "UNSET",
    position
  };
}

function renderConnector(connector, side, rows, selected) {
  const usedPins = new Set(rows
    .filter((row) => !isDnp(row.dnp))
    .filter((row) => rowUsesSide(row, side))
    .filter((row) => side === "left" ? legKey(row.leftLeg) === connector.key : legKey(row.rightLeg) === connector.key)
    .map((row) => side === "left" ? row.leftPin : row.rightPin)
    .filter(Boolean)
    .map((pin) => numberOrDefault(pin, 0))
    .filter(Boolean));
  const selectedPin = side === "left" && rowUsesSide(selected, side) && legKey(selected.leftLeg) === connector.key
    ? selected.leftPin
    : side === "right" && rowUsesSide(selected, side) && selected.rightLeg && legKey(selected.rightLeg) === connector.key
      ? selected.rightPin
      : "";
  const selectedPosition = numberOrDefault(selectedPin, 0);
  const housing = connector.housing || connectorHousing(connector.key, side, rows, selected);
  const visiblePositions = [...usedPins].sort((left, right) => left - right);
  if (selectedPosition && !visiblePositions.includes(selectedPosition)) {
    visiblePositions.push(selectedPosition);
    visiblePositions.sort((left, right) => left - right);
  }
  const pins = visiblePositions.map((position) => {
    const pin = String(position);
    const point = connectorContactPoint(connector, pin, side);
    const port = pinPoint(connector, pin, side);
    const isSelected = selectedPosition === position;
    const isUsed = usedPins.has(position);
    return `
      ${renderConnectorLead(connector, point, port, isSelected, isUsed, side)}
      ${renderConnectorPin(connector, point, pin, isSelected, isUsed, side)}
    `;
  }).join("");
  const labelX = connector.x + connector.width / 2;
  const housingLabelY = connector.y - 11;
  const housingLines = housingLabelLines(housing);
  const housingLabel = housingLines.map((line, index) => `
    <tspan x="${labelX}" dy="${index === 0 ? 0 : 11}">${escapeXml(line)}</tspan>
  `).join("");

  return `
    <text x="${labelX}" y="${connector.y - 28}" class="connector-label" text-anchor="middle">${side === "left" ? "LEFT" : "RIGHT"} ${escapeXml(connector.key)}</text>
    ${renderConnectorBody(connector)}
    ${pins}
    <text x="${labelX}" y="${housingLabelY}" class="housing-label" text-anchor="middle">${housingLabel}</text>
  `;
}

function renderConnectorLead(connector, contact, port, isSelected, isUsed, side) {
  if (connector.family === "powerpole" || (!isUsed && !isSelected)) {
    return "";
  }

  const selectedColor = side === "left" ? "#f2c84b" : "#41b883";
  const bendY = connector.y + connector.height - 12;
  const stroke = isSelected ? selectedColor : "#87958c";
  return `
    <path d="M ${contact.x} ${contact.y} V ${bendY} H ${port.x} V ${port.y}" fill="none" stroke="${stroke}" stroke-width="${isSelected ? 2.5 : 1.7}" stroke-linecap="round" stroke-linejoin="round" opacity="${isSelected ? 0.95 : 0.72}" />
    <circle cx="${port.x}" cy="${port.y}" r="${isSelected ? 5.5 : 4.5}" fill="#dce3de" stroke="${stroke}" stroke-width="2" />
  `;
}

function renderConnectorBody(connector) {
  const { x, y, width, height, family, side } = connector;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  if (family === "subconn") {
    const radius = Math.min(width, height) / 2 - 12;
    const tailX = side === "left" ? x - 18 : x + width - 18;
    const collarX = side === "left" ? x + 9 : x + width - 31;
    return `
      <rect x="${tailX}" y="${centerY - 22}" width="36" height="44" rx="12" fill="#111815" stroke="#596860" stroke-width="3" />
      <rect x="${collarX}" y="${centerY - 35}" width="22" height="70" rx="8" fill="#202b26" stroke="#7b8980" stroke-width="2" />
      <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#101713" stroke="#8b9790" stroke-width="4" />
      <circle cx="${centerX}" cy="${centerY}" r="${radius - 10}" fill="#24332c" stroke="#050806" stroke-width="3" />
      <path d="M ${centerX - 13} ${y + 14} L ${centerX} ${y + 28} L ${centerX + 13} ${y + 14}" fill="#0a0e0c" stroke="#9aa69f" stroke-width="2" />
      <circle cx="${centerX}" cy="${centerY}" r="12" fill="#111815" stroke="#65736b" stroke-width="2" />
    `;
  }

  if (family === "molex") {
    const lock = value(connector.housing).toUpperCase().includes("SIDE LOCK");
    const lockX = side === "left" ? x + width - 7 : x - 9;
    return `
      <path d="M ${x + 10} ${y + 6} H ${x + width - 10} L ${x + width} ${y + 18} V ${y + height - 10} L ${x + width - 10} ${y + height} H ${x + 10} L ${x} ${y + height - 10} V ${y + 18} Z" fill="#d7d6ca" stroke="#81857d" stroke-width="3" />
      <rect x="${x + 13}" y="${y + 18}" width="${width - 26}" height="${height - 31}" rx="3" fill="#b8baaf" stroke="#f4f3e9" stroke-width="2" />
      ${lock
        ? `<path d="M ${lockX} ${centerY - 23} H ${lockX + 16} V ${centerY + 23} H ${lockX} Z" fill="#e7e6dc" stroke="#858980" stroke-width="2" />`
        : `<path d="M ${centerX - 30} ${y + 2} L ${centerX - 21} ${y - 13} H ${centerX + 21} L ${centerX + 30} ${y + 2} Z" fill="#e7e6dc" stroke="#858980" stroke-width="2" />`}
      <line x1="${x + 14}" y1="${y + height - 17}" x2="${x + width - 14}" y2="${y + height - 17}" stroke="#777d75" stroke-width="3" />
    `;
  }

  if (family === "dupont") {
    return `
      <rect x="${x + 5}" y="${y + 2}" width="${width - 10}" height="${height - 4}" rx="4" fill="#101512" stroke="#626d66" stroke-width="3" />
      <rect x="${x + 14}" y="${y + 12}" width="${width - 28}" height="${height - 24}" rx="2" fill="#242b27" stroke="#050806" stroke-width="2" />
      <path d="M ${centerX - 22} ${y + 2} L ${centerX - 14} ${y - 8} H ${centerX + 14} L ${centerX + 22} ${y + 2}" fill="#161d19" stroke="#66726b" stroke-width="2" />
    `;
  }

  if (family === "pcb") {
    return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" fill="#165f42" stroke="#6ebd91" stroke-width="3" />
      <rect x="${x + 11}" y="${y + 11}" width="${width - 22}" height="${height - 22}" rx="3" fill="#194e39" stroke="#0b3525" stroke-width="2" />
      <path d="M ${x + 18} ${y + 27} H ${centerX} V ${y + height - 27} H ${x + width - 18}" fill="none" stroke="#d7aa42" stroke-width="3" opacity="0.75" />
      <circle cx="${centerX}" cy="${centerY}" r="13" fill="#143d2d" stroke="#d7aa42" stroke-width="3" />
    `;
  }

  if (family === "powerpole") {
    return connector.positionData.map((item) => renderPowerpoleModule(connector, item)).join("");
  }

  if (family === "ring") {
    return `
      <path d="M ${x + 9} ${centerY - 15} H ${centerX - 22} A 37 37 0 1 1 ${centerX - 22} ${centerY + 15} H ${x + 9} Z" fill="#aeb6b1" stroke="#e5ebe6" stroke-width="3" />
      <circle cx="${centerX + 14}" cy="${centerY}" r="21" fill="#15201b" stroke="#68766e" stroke-width="4" />
      <line x1="${x + 12}" y1="${centerY}" x2="${centerX - 20}" y2="${centerY}" stroke="#737f78" stroke-width="5" />
    `;
  }

  if (family === "splice") {
    return `
      <path d="M ${x + 8} ${centerY - 22} H ${x + 33} L ${x + 47} ${centerY - 30} H ${x + width - 47} L ${x + width - 33} ${centerY - 22} H ${x + width - 8} V ${centerY + 22} H ${x + width - 33} L ${x + width - 47} ${centerY + 30} H ${x + 47} L ${x + 33} ${centerY + 22} H ${x + 8} Z" fill="#49796b" stroke="#93ad9f" stroke-width="3" />
      <rect x="${centerX - 30}" y="${centerY - 24}" width="60" height="48" rx="7" fill="#b8c6bd" stroke="#e7eee9" stroke-width="2" opacity="0.82" />
    `;
  }

  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#26352e" stroke="#607168" stroke-width="2" />`;
}

function renderPowerpoleModule(connector, item) {
  const module = powerpoleModuleRect(connector, item.position);
  const fill = colorMap[item.color] || "#65736b";
  const isDark = item.color === "BLACK" || item.color === "BROWN" || item.color === "VIOLET";
  const edge = isDark ? "#87948d" : "#f0f5ee";
  const centerX = module.x + module.width / 2;
  const openingY = module.y + 15;
  const dovetail = module.x + module.width;

  return `
    <path d="M ${module.x + 6} ${module.y}
      H ${module.x + module.width - 6}
      L ${module.x + module.width} ${module.y + 8}
      V ${module.y + module.height - 7}
      L ${module.x + module.width - 6} ${module.y + module.height}
      H ${module.x + 6}
      L ${module.x} ${module.y + module.height - 7}
      V ${module.y + 8} Z"
      fill="${fill}" stroke="${edge}" stroke-width="2" />
    <path d="M ${dovetail - 1} ${module.y + 27} l 5 6 l -5 6 Z" fill="${fill}" stroke="${edge}" stroke-width="1.4" />
    <rect x="${module.x + 7}" y="${openingY}" width="${module.width - 14}" height="31" rx="4" fill="#131915" stroke="#050706" stroke-width="2" />
    <path d="M ${module.x + 12} ${openingY + 21} H ${module.x + module.width - 12} L ${module.x + module.width - 16} ${openingY + 13} H ${module.x + 16} Z" fill="#c7cec9" stroke="#f2f5f1" stroke-width="1.4" />
    <circle cx="${centerX}" cy="${module.y + 58}" r="3.5" fill="#17201b" stroke="${edge}" stroke-width="1.5" />
    <path d="M ${centerX - 7} ${module.y + module.height - 3} H ${centerX + 7} V ${module.y + module.height + 5} H ${centerX - 7} Z" fill="#1a211d" stroke="${edge}" stroke-width="1.4" />
  `;
}

function renderConnectorPin(connector, point, pin, isSelected, isUsed, side) {
  const selectedColor = side === "left" ? "#f2c84b" : "#41b883";
  const centerX = connector.x + connector.width / 2;
  const isSubconn = connector.family === "subconn";
  const isHorizontalHousing = ["molex", "dupont"].includes(connector.family);
  let contact = "";

  if (connector.family === "powerpole") {
    const module = powerpoleModuleRect(connector, pin);
    return `
      ${isSelected ? `<circle cx="${point.x}" cy="${point.y}" r="12" fill="none" stroke="${selectedColor}" stroke-width="3" />` : ""}
      <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#dce3de" stroke="${isSelected ? selectedColor : "#65736b"}" stroke-width="2" />
      <text x="${module.x + module.width / 2}" y="${module.y + module.height - 8}" class="pin-number" text-anchor="middle">${pin}</text>
    `;
  } else if (isSubconn && connector.gender === "female") {
    contact = `
      <circle cx="${point.x}" cy="${point.y}" r="${isSelected ? 8 : 6.5}" fill="#111512" stroke="${isSelected ? selectedColor : isUsed ? "#d0aa54" : "#8c794b"}" stroke-width="${isSelected ? 3 : 2}" />
      <circle cx="${point.x}" cy="${point.y}" r="2.6" fill="#020302" />
    `;
  } else if (isSubconn) {
    contact = `
      <circle cx="${point.x}" cy="${point.y}" r="${isSelected ? 8 : 6.5}" fill="${isSelected ? selectedColor : "#d7b25f"}" stroke="${isUsed ? "#f6d986" : "#7d6636"}" stroke-width="${isSelected ? 3 : 2}" />
      <circle cx="${point.x - 1.5}" cy="${point.y - 1.5}" r="1.7" fill="#fff1b7" opacity="0.8" />
    `;
  } else if (connector.family === "dupont") {
    contact = `<rect x="${point.x - 6}" y="${point.y - 6}" width="12" height="12" rx="2" fill="${isSelected ? selectedColor : isUsed ? "#d8efe2" : "#171d19"}" stroke="${isSelected ? selectedColor : isUsed ? "#41b883" : "#77847c"}" stroke-width="2" />`;
  } else if (connector.family === "molex") {
    contact = `<rect x="${point.x - 6.5}" y="${point.y - 6.5}" width="13" height="13" rx="3" fill="${isSelected ? selectedColor : isUsed ? "#e5f0e9" : "#6f756e"}" stroke="${isSelected ? selectedColor : "#f5f4eb"}" stroke-width="2" />`;
  } else {
    const fill = isSelected ? selectedColor : isUsed ? "#d8efe2" : "#f6fbf4";
    const stroke = isSelected ? fill : isUsed ? "#41b883" : "#9fac9f";
    contact = `<circle cx="${point.x}" cy="${point.y}" r="${isSelected ? 7 : 5.5}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
  }

  const radialSide = point.x >= centerX;
  const textX = isHorizontalHousing
    ? point.x
    : isSubconn
    ? point.x + (radialSide ? 12 : -12)
    : side === "left" ? point.x - 31 : point.x + 18;
  const textY = isHorizontalHousing ? point.y + 24 : point.y + 4;
  const anchor = isHorizontalHousing ? "middle" : isSubconn ? (radialSide ? "start" : "end") : "start";

  return `
    ${contact}
    <text x="${textX}" y="${textY}" class="pin-number" text-anchor="${anchor}">${pin}</text>
  `;
}

function housingLabelLines(housing) {
  const text = value(housing).trim();
  const lockMatch = text.match(/^(.*)\s+(FRONT|SIDE)\s+LOCK$/i);
  if (lockMatch) {
    return [lockMatch[1], `${lockMatch[2].toUpperCase()} LOCK`];
  }

  const subconMatch = text.match(/^(SUBCONN\s+\d+\s+PIN)\s+(MALE|FEMALE)$/i);
  if (subconMatch) {
    return [subconMatch[1].toUpperCase(), subconMatch[2].toUpperCase()];
  }

  return [text];
}

function connectorHousing(key, side, rows, selected) {
  const candidates = [selected, ...rows].filter((row) => row && !isDnp(row.dnp) && rowUsesSide(row, side));
  const match = candidates.find((row) => {
    if (side === "left") {
      return legKey(row.leftLeg) === key && row.housing;
    }

    return legKey(row.rightLeg) === key && row.rightHousing;
  });

  return side === "left"
    ? match?.housing || "Housing not set"
    : match?.rightHousing || "Right housing not set";
}

function connectorContactPoint(connector, pin, side) {
  if (!connector) {
    return { x: side === "left" ? 150 : 850, y: 180 };
  }

  const pinCount = connector.pinCount || 16;
  const safePin = Math.max(1, Math.min(pinCount, numberOrDefault(pin, 1)));
  if (connector.family === "powerpole") {
    const module = powerpoleModuleRect(connector, safePin);
    return {
      x: module.x + module.width / 2,
      y: module.y + module.height + 5,
      exit: "bottom",
      lane: module.index,
      side,
      edgeX: side === "left" ? connector.x + connector.width + 26 : connector.x - 26
    };
  }

  if (connector.family === "subconn") {
    const centerX = connector.x + connector.width / 2;
    const centerY = connector.y + connector.height / 2;
    const radius = Math.min(connector.width, connector.height) * 0.29;
    const angle = -Math.PI / 2 + ((safePin - 1) / pinCount) * Math.PI * 2;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
  }

  if (["molex", "dupont"].includes(connector.family)) {
    const x = pinCount === 1
      ? connector.x + connector.width / 2
      : connector.x + 32 + (safePin - 1) * ((connector.width - 64) / (pinCount - 1));
    return {
      x,
      y: connector.y + connector.height / 2
    };
  }

  const y = pinCount === 1
    ? connector.y + connector.height / 2
    : connector.y + 18 + (safePin - 1) * ((connector.height - 36) / (pinCount - 1));
  const x = side === "left" ? connector.x + connector.width - 36 : connector.x + 36;
  return { x, y };
}

function pinPoint(connector, pin, side) {
  const contact = connectorContactPoint(connector, pin, side);
  if (!connector || connector.family === "powerpole") {
    return contact;
  }

  const safePin = Math.max(1, Math.min(connector.pinCount || 16, numberOrDefault(pin, 1)));
  const usedIndex = connector.positionData.findIndex((item) => item.position === safePin);
  const lane = usedIndex >= 0 ? usedIndex : Math.max(0, safePin - 1);
  const portCount = Math.max(1, connector.positionData.length);
  const x = ["molex", "dupont"].includes(connector.family)
    ? contact.x
    : portCount === 1
      ? connector.x + connector.width / 2
      : connector.x + 20 + lane * ((connector.width - 40) / (portCount - 1));

  return {
    x,
    y: connector.y + connector.height + 6,
    exit: "bottom",
    lane,
    side,
    edgeX: side === "left" ? connector.x + connector.width + 26 : connector.x - 26
  };
}

function unassignedPoint(index, previewHeight) {
  const safeIndex = Math.max(0, index);
  return {
    x: 755,
    y: Math.min(previewHeight - 80, 88 + (safeIndex % 12) * 28)
  };
}

function clamp(input, min, max) {
  return Math.max(min, Math.min(max, input));
}

function wirePath(start, end, index, routeBaseY) {
  if (start.exit === "bottom" && end.exit === "bottom") {
    const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP;
    const startDropY = bottomDropY(start, index);
    const endDropY = bottomDropY(end, index);
    const startBusX = bottomBusX(start, index);
    const endBusX = bottomBusX(end, index);
    return `M ${start.x} ${start.y}
      V ${startDropY}
      H ${startBusX}
      V ${laneY}
      H ${endBusX}
      V ${endDropY}
      H ${end.x}
      V ${end.y}`;
  }

  if (start.exit === "bottom") {
    return bottomExitWirePath(start, end, index, routeBaseY);
  }

  if (end.exit === "bottom") {
    return bottomExitWirePath(end, start, index, routeBaseY);
  }

  const middleX = 500 + ((Math.max(0, index) % 7) - 3) * 12;
  return `M ${start.x} ${start.y} H ${middleX} V ${end.y} H ${end.x}`;
}

function bottomDropY(point, index) {
  const localLane = Number.isFinite(point.lane) ? point.lane : Math.max(0, index);
  return point.y + 20 + (localLane % 5) * 6;
}

function bottomBusX(point, index) {
  const nudge = (Math.max(0, index) % 6) * 4;
  if (point.side === "left") {
    return point.edgeX + nudge;
  }
  if (point.side === "right") {
    return point.edgeX - nudge;
  }
  return point.x;
}

function bottomExitWirePath(bottom, other, index, routeBaseY) {
  const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP;
  const dropY = bottomDropY(bottom, index);
  const busX = bottomBusX(bottom, index);
  return `M ${bottom.x} ${bottom.y}
    V ${dropY}
    H ${busX}
    V ${laneY}
    H ${other.x}
    V ${other.y}`;
}

function numberOrDefault(input, fallback) {
  const direct = Number(input);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const match = value(input).match(/\d+/);
  const parsed = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function renderLegend() {
  const counts = activeRows().reduce((acc, row) => {
    const color = row.color || "UNSET";
    acc[color] = (acc[color] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    dom.colorLegend.innerHTML = `<div class="legend-item"><span class="swatch" style="--swatch:#d9dfd7"></span><span>No active wires</span><span class="legend-count">0</span></div>`;
    return;
  }

  dom.colorLegend.innerHTML = entries.map(([color, count]) => `
    <div class="legend-item">
      <span class="swatch" style="--swatch:${colorMap[color] || "#d9dfd7"}"></span>
      <span>${escapeHtml(color)}</span>
      <span class="legend-count">${count}</span>
    </div>
  `).join("");
}

function renderTable() {
  const query = dom.searchRows.value.trim().toLowerCase();
  const onlyActive = dom.activeOnly.checked;
  let previousLeg = "";

  const rows = state.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (onlyActive && isDnp(row.dnp)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        row.leftLeg,
        row.name,
        row.leftPin,
        isDnp(row.dnp) ? "DNP" : "",
        row.housing,
        row.awg,
        row.color,
        row.length,
        row.spliceId,
        row.spliceRole,
        row.rightLeg,
        row.rightPin,
        row.rightHousing
      ].join(" ").toLowerCase().includes(query);
    });

  dom.wireRows.innerHTML = rows.map(({ row, index }) => {
    const groupStart = previousLeg && previousLeg !== row.leftLeg;
    previousLeg = row.leftLeg;
    const classes = [
      row.id === state.selectedId ? "selected-row" : "",
      isDnp(row.dnp) ? "dnp-row" : "",
      groupStart ? "group-start" : ""
    ].filter(Boolean).join(" ");

    return `
      <tr class="${classes}" data-id="${row.id}">
        <td class="row-index">
          <button class="clear-row-button" type="button" data-action="clear-row" title="Clear row ${index + 1} and remove its wire" aria-label="Clear row ${index + 1}">${index + 1}</button>
        </td>
        <td>${selectField(row, "leftLeg", options.legs, "Left leg")}</td>
        <td class="field-name"><input data-field="name" list="nameChoices" value="${escapeHtml(row.name)}" aria-label="Name"></td>
        <td>${selectField(row, "leftPin", options.pins, "Left pin")}</td>
        <td>${selectField(row, "dnp", options.dnp, "Do not place", isDnp(row.dnp) ? "DNP" : "")}</td>
        <td class="field-housing">${selectField(row, "housing", options.housings, "Housing type")}</td>
        <td>${selectField(row, "awg", options.gauges, "AW gauge")}</td>
        <td class="field-color">
          <div class="color-cell">
            <span class="swatch" style="--swatch:${colorMap[row.color] || "#d9dfd7"}"></span>
            ${selectField(row, "color", options.colors, "Color")}
          </div>
        </td>
        <td><input data-field="length" type="number" min="0" step="0.25" value="${escapeHtml(row.length)}" aria-label="Length inches"></td>
        <td class="field-splice">${selectField(row, "spliceId", options.spliceIds, "Splice ID")}</td>
        <td class="field-splice-role">${selectField(row, "spliceRole", options.spliceRoles, "Splice role")}</td>
        <td class="divider-cell"></td>
        <td>${selectField(row, "rightLeg", options.legs, "Right leg")}</td>
        <td>${selectField(row, "rightPin", options.pins, "Right pin")}</td>
        <td class="field-right-housing">${selectField(row, "rightHousing", options.housings, "Right housing type")}</td>
      </tr>
    `;
  }).join("");
}

function selectField(row, field, choices, label, overrideValue) {
  const selected = overrideValue !== undefined ? overrideValue : value(row[field]);
  const allChoices = choices.includes(selected) ? choices : [selected, ...choices];
  const optionsHtml = allChoices.map((choice) => {
    const selectedAttr = choice === selected ? " selected" : "";
    const labelText = choice || "-";
    return `<option value="${escapeHtml(choice)}"${selectedAttr}>${escapeHtml(labelText)}</option>`;
  }).join("");

  return `<select data-field="${field}" aria-label="${label}">${optionsHtml}</select>`;
}

function updateActionState() {
  const hasRow = Boolean(selectedRow());
  dom.duplicateRow.disabled = !hasRow;
  dom.deleteRow.disabled = !hasRow;
}

function syncSelectedRowClass() {
  dom.wireRows.querySelectorAll("tr[data-id]").forEach((tableRow) => {
    tableRow.classList.toggle("selected-row", tableRow.dataset.id === state.selectedId);
  });
}

function handleCellChange(target, shouldRenderTable) {
  const tableRow = target.closest("tr[data-id]");
  if (!tableRow) {
    return;
  }

  const row = state.rows.find((item) => item.id === tableRow.dataset.id);
  if (!row) {
    return;
  }

  state.selectedId = row.id;
  const field = target.dataset.field;
  if (!field) {
    return;
  }

  if (field === "dnp") {
    row.dnp = target.value === "DNP";
  } else if (field === "color") {
    row[field] = target.value.toUpperCase();
  } else if (field === "spliceRole") {
    row.spliceRole = target.value.toUpperCase();
    if (row.spliceRole && !normalizedSpliceId(row)) {
      row.spliceId = nextSpliceId();
    }
  } else if (field === "spliceId") {
    row.spliceId = target.value.toUpperCase();
  } else {
    row[field] = target.value;
  }

  saveState();
  if (shouldRenderTable) {
    render();
  } else {
    renderSummary();
    renderPreview();
    renderLegend();
    updateActionState();
  }
}

function addRow() {
  const current = selectedRow();
  const index = current ? state.rows.findIndex((row) => row.id === current.id) + 1 : state.rows.length;
  const nextPin = current ? String(Math.min(numberOrDefault(current.leftPin, 0) + 1, 32)) : "1";
  const row = {
    id: makeId(),
    leftLeg: current?.leftLeg || "1",
    name: current?.name || "",
    leftPin: nextPin,
    dnp: false,
    housing: current?.housing || "A POWER POLE",
    awg: current?.awg || "16",
    color: current?.color || "RED",
    length: current?.length || "8",
    spliceId: "",
    spliceRole: "",
    rightLeg: current?.rightLeg || "",
    rightPin: "",
    rightHousing: current?.rightHousing || ""
  };

  state.rows.splice(index, 0, row);
  state.selectedId = row.id;
  saveState();
  render();
  showToast("Added a new wire row.");
}

function duplicateRow() {
  const current = selectedRow();
  if (!current) {
    return;
  }

  const index = state.rows.findIndex((row) => row.id === current.id) + 1;
  const role = normalizedSpliceRole(current);
  const spliceId = normalizedSpliceId(current);
  const copy = { ...current, id: makeId() };
  let message = "Duplicated the selected wire.";

  if (role === "PARENT" && spliceId) {
    Object.assign(copy, {
      leftLeg: "",
      leftPin: "",
      housing: "",
      spliceRole: "BRANCH",
      rightPin: "",
      name: current.name ? `${current.name} BRANCH` : `${spliceId} BRANCH`
    });
    message = `Created ${spliceId} branch row.`;
  } else if (role === "BRANCH" && spliceId) {
    Object.assign(copy, {
      rightPin: "",
      name: current.name ? `${current.name} COPY` : `${spliceId} BRANCH`
    });
    message = `Created another ${spliceId} branch row.`;
  } else {
    copy.name = current.name ? `${current.name} COPY` : "";
  }

  state.rows.splice(index, 0, copy);
  state.selectedId = copy.id;
  saveState();
  render();
  showToast(message);
}

function deleteSelectedRow() {
  const current = selectedRow();
  if (!current) {
    return;
  }

  const index = state.rows.findIndex((row) => row.id === current.id);
  state.rows.splice(index, 1);
  state.selectedId = state.rows[Math.min(index, state.rows.length - 1)]?.id || "";
  saveState();
  render();
  showToast("Deleted the selected wire.");
}

function clearRow(rowId) {
  const row = state.rows.find((item) => item.id === rowId);
  if (!row) {
    return;
  }

  const rowNumber = state.rows.findIndex((item) => item.id === rowId) + 1;
  Object.assign(row, {
    name: "",
    dnp: true,
    housing: "",
    awg: "",
    color: "",
    length: "",
    spliceId: "",
    spliceRole: "",
    rightLeg: "",
    rightPin: "",
    rightHousing: ""
  });

  state.selectedId = state.rows.find((item) => !isDnp(item.dnp))?.id || row.id;
  saveState();
  render();
  showToast(`Cleared row ${rowNumber} and removed its wire.`);
}

function resetSample() {
  if (!window.confirm("Reset this harness to the starter layout?")) {
    return;
  }

  state = starterState();
  saveState();
  dom.searchRows.value = "";
  dom.activeOnly.checked = false;
  render();
  showToast("Starter layout restored.");
}

function exportJson() {
  const fileName = `${fileSafeName(state.harnessName)}.json`;
  downloadText(fileName, JSON.stringify({ appVersion: APP_VERSION, ...state }, null, 2), "application/json");
  showToast("Project saved as JSON.");
}

function exportCsv() {
  const headers = ["Left Leg", "Name", "Pin #", "Do Not Place", "Housing Type", "AWGauge", "Color", "Length inches", "Splice ID", "Splice Role", "Right Leg", "Pin #", "Housing Type"];
  const lines = [
    headers,
    ...state.rows.map((row) => [
      row.leftLeg,
      row.name,
      row.leftPin,
      isDnp(row.dnp) ? "DNP" : "",
      row.housing,
      row.awg,
      row.color,
      row.length,
      row.spliceId,
      row.spliceRole,
      row.rightLeg,
      row.rightPin,
      row.rightHousing
    ])
  ];

  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  downloadText(`${fileSafeName(state.harnessName)}.csv`, csv, "text/csv");
  showToast("CSV table exported.");
}

function openImageImport() {
  renderImportPreview([]);
  if (typeof dom.imageDialog.showModal === "function") {
    dom.imageDialog.showModal();
  } else {
    dom.imageDialog.setAttribute("open", "");
  }
}

function closeImageImport() {
  dom.imageDialog.close();
}

function chooseImage() {
  dom.imageUpload.click();
}

function loadImageFile(file) {
  currentImageFile = file;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    dom.importImagePreview.src = reader.result;
    dom.imageStatus.textContent = `${file.name} loaded.`;
    openImageImport();
  });
  reader.readAsDataURL(file);
}

async function readImageText() {
  if (!currentImageFile) {
    dom.imageStatus.textContent = "Upload a picture first.";
    return;
  }

  if (!("TextDetector" in window)) {
    dom.imageStatus.textContent = "Automatic picture reading is not available in this browser. Paste OCR text or copied Excel rows, then press Translate.";
    return;
  }

  try {
    dom.imageStatus.textContent = "Reading picture...";
    const bitmap = await createImageBitmap(currentImageFile);
    const detector = new TextDetector();
    const detections = await detector.detect(bitmap);
    const detectedText = detections.map((item) => item.rawValue).filter(Boolean).join("\n");
    dom.importText.value = detectedText;
    const rows = rowsFromDetectedText(detections, bitmap.width);
    setPendingImportRows(rows.length ? rows : parseImportText(detectedText));
    dom.imageStatus.textContent = `${pendingImportRows.length} row(s) translated from the picture.`;
  } catch (error) {
    dom.imageStatus.textContent = "The picture could not be read automatically. Paste OCR text or copied Excel rows, then press Translate.";
  }
}

function translateImageText() {
  const rows = parseImportText(dom.importText.value);
  setPendingImportRows(rows);
  dom.imageStatus.textContent = rows.length
    ? `${rows.length} row(s) translated and ready.`
    : "No wiring rows were found in that text.";
}

function setPendingImportRows(rows) {
  pendingImportRows = rows.map((row) => cleanImportedRow(row)).filter(isUsefulRow);
  renderImportPreview(pendingImportRows);
}

function applyImportedRows() {
  if (!pendingImportRows.length) {
    dom.imageStatus.textContent = "Translate rows before applying.";
    return;
  }

  const ok = window.confirm(`Replace the current table with ${pendingImportRows.length} imported row(s)?`);
  if (!ok) {
    return;
  }

  state = normalizeState({
    harnessName: state.harnessName || "Imported Harness",
    selectedId: pendingImportRows[0].id,
    rows: pendingImportRows
  });
  saveState();
  dom.searchRows.value = "";
  dom.activeOnly.checked = false;
  render();
  closeImageImport();
  showToast("Imported rows applied.");
}

function renderImportPreview(rows) {
  pendingImportRows = rows;
  dom.importPreviewCount.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} ready`;
  if (!rows.length) {
    dom.importPreviewRows.innerHTML = `<tr><td colspan="13">No rows ready.</td></tr>`;
    return;
  }

  dom.importPreviewRows.innerHTML = rows.slice(0, 80).map((row) => `
    <tr>
      <td>${escapeHtml(row.leftLeg)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.leftPin)}</td>
      <td>${isDnp(row.dnp) ? "DNP" : ""}</td>
      <td>${escapeHtml(row.housing)}</td>
      <td>${escapeHtml(row.awg)}</td>
      <td>${escapeHtml(row.color)}</td>
      <td>${escapeHtml(row.length)}</td>
      <td>${escapeHtml(row.spliceId)}</td>
      <td>${escapeHtml(row.spliceRole)}</td>
      <td>${escapeHtml(row.rightLeg)}</td>
      <td>${escapeHtml(row.rightPin)}</td>
      <td>${escapeHtml(row.rightHousing)}</td>
    </tr>
  `).join("");
}

function rowsFromDetectedText(detections, imageWidth) {
  const items = detections
    .map((item) => ({
      text: value(item.rawValue).trim(),
      x: item.boundingBox?.x || 0,
      width: item.boundingBox?.width || 0,
      y: item.boundingBox?.y || 0,
      height: item.boundingBox?.height || 16
    }))
    .filter((item) => item.text);

  items.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  items.forEach((item) => {
    const lastLine = lines[lines.length - 1];
    const threshold = Math.max(10, item.height * 0.9);
    if (lastLine && Math.abs(lastLine.y - item.y) <= threshold) {
      lastLine.items.push(item);
      lastLine.y = (lastLine.y + item.y) / 2;
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  });

  const columnCenters = [0.07, 0.15, 0.215, 0.27, 0.35, 0.43, 0.51, 0.59, 0.675, 0.75, 0.835, 0.925];
  const text = lines.map((line) => {
    const cells = Array.from({ length: 12 }, () => []);
    line.items
      .sort((a, b) => a.x - b.x)
      .forEach((item) => {
        const center = (item.x + item.width / 2) / Math.max(1, imageWidth || 1);
        const column = nearestColumn(center, columnCenters);
        cells[column].push(item.text);
      });
    return cells.map((cell) => cell.join(" ").trim()).join("\t");
  }).join("\n");

  return parseImportText(text);
}

function nearestColumn(center, columns) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  columns.forEach((columnCenter, index) => {
    const distance = Math.abs(center - columnCenter);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return bestIndex;
}

function parseImportText(text) {
  const rows = [];
  const lines = value(text)
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const row = parseImportLine(line);
    if (row && isUsefulRow(row)) {
      rows.push(cleanImportedRow(row));
    }
  });

  return rows;
}

function parseImportLine(line) {
  if (isHeaderLine(line)) {
    return null;
  }

  if (line.includes("\t")) {
    return rowFromCells(line.split("\t"));
  }

  if (line.includes(",")) {
    const cells = parseCsvLine(line);
    if (cells.length > 5) {
      return rowFromCells(cells);
    }
  }

  const cells = line.split(/\s{2,}/);
  if (cells.length > 5) {
    return rowFromCells(cells);
  }

  return rowFromLooseLine(line);
}

function rowFromCells(cells) {
  const clean = cells.map((cell) => value(cell).trim());
  if (isHeaderLine(clean.join(" "))) {
    return null;
  }

  const hasSpliceColumns = clean.length >= 13;
  const hasDivider = hasSpliceColumns ? clean.length >= 14 : clean.length >= 12;
  const rightOffset = hasSpliceColumns
    ? hasDivider ? 11 : 10
    : hasDivider ? 9 : 8;
  const row = {
    leftLeg: clean[0] || "",
    name: clean[1] || "",
    leftPin: clean[2] || "",
    dnp: isDnp(clean[3]),
    housing: clean[4] || "",
    awg: clean[5] || "",
    color: clean[6] || "",
    length: clean[7] || "",
    spliceId: hasSpliceColumns ? clean[8] || "" : "",
    spliceRole: hasSpliceColumns ? clean[9] || "" : "",
    rightLeg: clean[rightOffset] || "",
    rightPin: clean[rightOffset + 1] || "",
    rightHousing: clean[rightOffset + 2] || ""
  };

  if (!row.leftPin && /^\d+$/.test(row.name)) {
    row.leftPin = row.name;
    row.name = "";
  }

  return row;
}

function rowFromLooseLine(line) {
  const tokens = line.replace(/\s+/g, " ").trim().split(" ");
  if (!tokens.length || !/^[A-Za-z0-9#-]+$/.test(tokens[0])) {
    return null;
  }

  const leftLeg = tokens.shift();
  const leftPinIndex = tokens.findIndex((token) => /^\d{1,2}$/.test(token));
  if (leftPinIndex < 0) {
    return null;
  }

  const name = tokens.slice(0, leftPinIndex).join(" ");
  const leftPin = tokens[leftPinIndex];
  const rest = tokens.slice(leftPinIndex + 1);
  let dnp = false;
  if (rest[0]?.toUpperCase() === "DNP") {
    dnp = true;
    rest.shift();
  }

  if (dnp && !rest.length) {
    return { leftLeg, name, leftPin, dnp };
  }

  const gaugeIndex = rest.findIndex(isGaugeToken);
  if (gaugeIndex < 0) {
    return { leftLeg, name, leftPin, dnp };
  }

  const housing = rest.slice(0, gaugeIndex).join(" ");
  const awg = rest[gaugeIndex];
  const colorIndex = rest.findIndex((token, index) => index > gaugeIndex && Boolean(matchColor(token)));
  const color = colorIndex >= 0 ? rest[colorIndex] : "";
  const length = colorIndex >= 0 ? rest[colorIndex + 1] || "" : "";
  const trailing = colorIndex >= 0 ? rest.slice(colorIndex + 2) : [];
  const right = extractRightFields(trailing);

  return {
    leftLeg,
    name,
    leftPin,
    dnp,
    housing,
    awg,
    color,
    length,
    spliceId: "",
    spliceRole: "",
    rightLeg: right.rightLeg,
    rightPin: right.rightPin,
    rightHousing: right.rightHousing
  };
}

function extractRightFields(tokens) {
  const result = { rightLeg: "", rightPin: "", rightHousing: "" };
  if (!tokens.length) {
    return result;
  }

  const housing = extractHousingFromEnd(tokens);
  result.rightHousing = housing.housing;
  const remaining = housing.remaining;
  if (remaining.length > 1 && /^\d+$/.test(remaining[0]) && !remaining[1].startsWith("#")) {
    result.rightLeg = remaining.shift();
  }
  result.rightPin = remaining.join(" ");
  return result;
}

function extractHousingFromEnd(tokens) {
  const upperTokens = tokens.map((token) => token.toUpperCase());
  const housings = options.housings
    .filter(Boolean)
    .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length);

  for (const housing of housings) {
    const parts = housing.toUpperCase().split(/\s+/);
    const tail = upperTokens.slice(-parts.length);
    if (tail.join(" ") === parts.join(" ")) {
      return {
        housing,
        remaining: tokens.slice(0, -parts.length)
      };
    }
  }

  return { housing: "", remaining: [...tokens] };
}

function cleanImportedRow(row) {
  return {
    id: row.id || makeId(),
    leftLeg: cleanCell(row.leftLeg),
    name: cleanCell(row.name),
    leftPin: cleanCell(row.leftPin),
    dnp: isDnp(row.dnp),
    housing: matchHousing(row.housing) || cleanCell(row.housing).toUpperCase(),
    awg: cleanGauge(row.awg),
    color: matchColor(row.color) || cleanCell(row.color).toUpperCase(),
    length: cleanLength(row.length),
    spliceId: cleanCell(row.spliceId).toUpperCase(),
    spliceRole: normalizedSpliceRole(row),
    rightLeg: cleanCell(row.rightLeg),
    rightPin: cleanCell(row.rightPin),
    rightHousing: matchHousing(row.rightHousing) || cleanCell(row.rightHousing).toUpperCase()
  };
}

function isUsefulRow(row) {
  return Boolean(row.leftLeg || row.leftPin || row.name || row.housing || row.spliceId || row.spliceRole || row.rightLeg || row.rightPin || row.rightHousing);
}

function isHeaderLine(line) {
  const text = value(line).toLowerCase();
  return text.includes("left leg") && text.includes("pin") && text.includes("housing");
}

function isDnp(input) {
  if (input === true || input === 1) {
    return true;
  }

  return ["DNP", "TRUE", "YES", "Y", "1"].includes(value(input).trim().toUpperCase());
}

function isGaugeToken(token) {
  return /^(10|12|14|16|18|20|22|24)$/.test(value(token));
}

function cleanGauge(input) {
  const match = value(input).match(/\b(10|12|14|16|18|20|22|24)\b/);
  return match ? match[1] : cleanCell(input);
}

function cleanLength(input) {
  const match = value(input).match(/\d+(?:\.\d+)?/);
  return match ? match[0] : cleanCell(input);
}

function cleanCell(input) {
  return value(input).trim().replace(/\s+/g, " ");
}

function matchColor(input) {
  const color = cleanCell(input).toUpperCase();
  return options.colors.find((choice) => choice && choice.toUpperCase() === color) || "";
}

function matchHousing(input) {
  const housing = cleanCell(input).toUpperCase();
  return options.housings.find((choice) => choice && choice.toUpperCase() === housing) || "";
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function exportDrawingSvg() {
  renderPreview();
  const svg = dom.wirePreview.cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "1600");
  svg.setAttribute("height", String(Math.round(1600 * (dom.wirePreview.viewBox.baseVal.height / 1000))));
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
  downloadText(`${fileSafeName(state.harnessName)}-drawing.svg`, content, "image/svg+xml");
  showToast("Drawing SVG downloaded.");
}

function exportInstructions() {
  renderPreview();
  const svg = new XMLSerializer().serializeToString(dom.wirePreview);
  const rows = activeRows();
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(state.harnessName)} Drawing and Instructions</title>
  <style>
    body { color: #101814; font-family: Segoe UI, Arial, sans-serif; margin: 24px; }
    h1 { font-size: 26px; margin: 0 0 6px; }
    h2 { font-size: 18px; margin: 22px 0 10px; }
    .meta { color: #5f6b64; margin-bottom: 18px; }
    .drawing { border: 1px solid #9aa69c; margin: 12px 0 20px; overflow: auto; padding: 8px; }
    svg { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #bfc8c0; padding: 6px 7px; text-align: left; }
    th { background: #edf3ec; }
    @media print { body { margin: 12mm; } .drawing { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(state.harnessName)}</h1>
  <div class="meta">Wiring Harness Designer v${APP_VERSION} | ${rows.length} active wire(s), ${state.rows.length - rows.length} DNP row(s), ${escapeHtml(dom.totalLength.textContent)} total inches</div>
  <h2>Drawing</h2>
  <div class="drawing">${svg}</div>
  <h2>Wire Instructions</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Left Leg</th><th>Left Pin</th><th>Name</th><th>Housing</th><th>AWG</th><th>Color</th><th>Length</th><th>Splice ID</th><th>Role</th><th>Right Leg</th><th>Right Pin</th><th>Right Housing</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.leftLeg)}</td>
          <td>${escapeHtml(row.leftPin)}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.housing)}</td>
          <td>${escapeHtml(row.awg)}</td>
          <td>${escapeHtml(row.color)}</td>
          <td>${escapeHtml(row.length)}</td>
          <td>${escapeHtml(row.spliceId)}</td>
          <td>${escapeHtml(row.spliceRole)}</td>
          <td>${escapeHtml(row.rightLeg)}</td>
          <td>${escapeHtml(row.rightPin)}</td>
          <td>${escapeHtml(row.rightHousing)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

  downloadText(`${fileSafeName(state.harnessName)}-drawing-instructions.html`, html, "text/html");
  showToast("Printable guide downloaded.");
}

function printHarness() {
  renderPreview();
  window.print();
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = normalizeState(parsed);
      saveState();
      dom.searchRows.value = "";
      dom.activeOnly.checked = false;
      render();
      showToast("Project JSON imported.");
    } catch (error) {
      showToast("That JSON file could not be imported.");
    }
  });
  reader.readAsText(file);
}

function downloadText(fileName, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(input) {
  const text = value(input);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

function fileSafeName(input) {
  return (input || "wiring-harness")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "wiring-harness";
}

function escapeHtml(input) {
  return value(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(input) {
  return escapeHtml(input).replace(/'/g, "&apos;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 2200);
}

dom.harnessName.addEventListener("input", () => {
  state.harnessName = dom.harnessName.value;
  saveState();
  renderPreview();
});

dom.wireRows.addEventListener("click", (event) => {
  const clearButton = event.target.closest("button[data-action='clear-row']");
  if (clearButton) {
    const clearButtonRow = clearButton.closest("tr[data-id]");
    if (clearButtonRow) {
      clearRow(clearButtonRow.dataset.id);
    }
    return;
  }

  const row = event.target.closest("tr[data-id]");
  if (!row || state.selectedId === row.dataset.id) {
    return;
  }

  state.selectedId = row.dataset.id;
  saveState();
  if (event.target.closest("input, select")) {
    syncSelectedRowClass();
    renderSummary();
    renderPreview();
    updateActionState();
    return;
  }

  render();
});

dom.wireRows.addEventListener("input", (event) => {
  if (event.target.matches("input[data-field]")) {
    handleCellChange(event.target, false);
  }
});

dom.wireRows.addEventListener("change", (event) => {
  if (event.target.matches("select[data-field], input[data-field]")) {
    handleCellChange(event.target, true);
  }
});

dom.searchRows.addEventListener("input", renderTable);
dom.activeOnly.addEventListener("change", renderTable);
dom.addRow.addEventListener("click", addRow);
dom.duplicateRow.addEventListener("click", duplicateRow);
dom.deleteRow.addEventListener("click", deleteSelectedRow);
dom.resetSample.addEventListener("click", resetSample);
dom.imageImportButton.addEventListener("click", openImageImport);
dom.closeImageDialog.addEventListener("click", closeImageImport);
dom.chooseImageButton.addEventListener("click", chooseImage);
dom.readImageButton.addEventListener("click", readImageText);
dom.translateImageText.addEventListener("click", translateImageText);
dom.applyImageRows.addEventListener("click", applyImportedRows);
dom.exportJson.addEventListener("click", exportJson);
dom.exportCsv.addEventListener("click", exportCsv);
dom.exportDrawing.addEventListener("click", exportDrawingSvg);
dom.exportInstructions.addEventListener("click", exportInstructions);
dom.printButton.addEventListener("click", printHarness);
dom.importJsonButton.addEventListener("click", () => dom.importJson.click());
dom.importJson.addEventListener("change", () => {
  const [file] = dom.importJson.files;
  if (file) {
    importJson(file);
  }
  dom.importJson.value = "";
});
dom.imageUpload.addEventListener("change", () => {
  const [file] = dom.imageUpload.files;
  if (file) {
    loadImageFile(file);
  }
  dom.imageUpload.value = "";
});
dom.importText.addEventListener("input", () => {
  if (dom.importText.value.trim()) {
    dom.imageStatus.textContent = "Text changed. Press Translate to preview rows.";
  }
});

render();
