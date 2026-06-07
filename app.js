"use strict";

const APP_VERSION = "1.2.30";
const STORAGE_KEY = "wiring-harness-designer-state-v1";
const subconPinCounts = [2, 4, 6, 8, 10, 12, 14, 16];
const WIRE_LANE_GAP = 32;
const WIRE_EXIT_GAP = 14;
const WIRE_BUS_GAP = 18;
const MIN_COLUMN_WIDTH = 42;
const MAX_COLUMN_WIDTH = 620;
const UNDO_LIMIT = 50;
const MIN_PREVIEW_PANE_HEIGHT = 220;
const MIN_EDITOR_PANE_HEIGHT = 260;
const LAYOUT_SPLITTER_HEIGHT = 16;
const SELECTED_START_COLOR = "#d6e8fb";
const SELECTED_END_COLOR = "#f6bd75";

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
  gauges: ["", "10", "12", "14", "16", "18", "20", "22", "24"],
  colors: ["", ...Object.keys(colorMap)],
  spliceIds: ["", ...Array.from({ length: 12 }, (_, index) => `S${index + 1}`)],
  spliceRoles: ["", "PARENT", "BRANCH"]
};

const EXPORT_HEADERS = [
  "Cable Name",
  "Left Leg",
  "Left Leg Name",
  "Wire Name",
  "Pin Pos #",
  "Housing Type",
  "Housing Part #",
  "Pin P#",
  "AWGuage",
  "Color",
  "Length inches",
  "Branch",
  "",
  "Right Leg",
  "Right Leg Name",
  "Pin Pos #",
  "Housing Type",
  "Housing Part #",
  "Pin P#",
  "Tool used",
  "Comments"
];

const DEFAULT_COLUMN_WIDTHS = [
  46,
  190,
  115,
  180,
  100,
  260,
  170,
  155,
  115,
  150,
  170,
  160,
  34,
  115,
  180,
  100,
  260,
  170,
  155,
  180,
  280
];

const dom = {
  appShell: document.querySelector(".app-shell"),
  topbar: document.querySelector(".topbar"),
  layoutSplitter: document.querySelector("#layoutSplitter"),
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
  printHarnessTitle: document.querySelector("#printHarnessTitle"),
  previewName: document.querySelector("#previewName"),
  activeCount: document.querySelector("#activeCount"),
  dnpCount: document.querySelector("#dnpCount"),
  totalLength: document.querySelector("#totalLength"),
  colorLegend: document.querySelector("#colorLegend"),
  wirePreview: document.querySelector("#wirePreview"),
  harnessTable: document.querySelector("#harnessTable"),
  tableColumnGroup: document.querySelector("#tableColumnGroup"),
  wireRows: document.querySelector("#wireRows"),
  leftLegNames: document.querySelector("#leftLegNames"),
  rightLegNames: document.querySelector("#rightLegNames"),
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
  undoButton: document.querySelector("#undoButton"),
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

Object.assign(dom, {
  qualityButton: document.querySelector("#qualityButton"),
  qualityCount: document.querySelector("#qualityCount"),
  qualityDialog: document.querySelector("#qualityDialog"),
  closeQualityDialog: document.querySelector("#closeQualityDialog"),
  qualitySummary: document.querySelector("#qualitySummary"),
  qualityIssues: document.querySelector("#qualityIssues"),
  catalogButton: document.querySelector("#catalogButton"),
  catalogDialog: document.querySelector("#catalogDialog"),
  closeCatalogDialog: document.querySelector("#closeCatalogDialog"),
  newCatalogItem: document.querySelector("#newCatalogItem"),
  resetCatalog: document.querySelector("#resetCatalog"),
  catalogSearch: document.querySelector("#catalogSearch"),
  catalogRows: document.querySelector("#catalogRows"),
  catalogForm: document.querySelector("#catalogForm"),
  catalogId: document.querySelector("#catalogId"),
  catalogName: document.querySelector("#catalogName"),
  catalogCategory: document.querySelector("#catalogCategory"),
  catalogFamily: document.querySelector("#catalogFamily"),
  catalogPositions: document.querySelector("#catalogPositions"),
  catalogGender: document.querySelector("#catalogGender"),
  catalogManufacturer: document.querySelector("#catalogManufacturer"),
  catalogPartNumber: document.querySelector("#catalogPartNumber"),
  catalogTerminalType: document.querySelector("#catalogTerminalType"),
  catalogTerminalPart: document.querySelector("#catalogTerminalPart"),
  catalogSealPart: document.querySelector("#catalogSealPart"),
  catalogImageUrl: document.querySelector("#catalogImageUrl"),
  catalogImageUploadButton: document.querySelector("#catalogImageUploadButton"),
  catalogImageUpload: document.querySelector("#catalogImageUpload"),
  catalogNotes: document.querySelector("#catalogNotes"),
  catalogImagePreview: document.querySelector("#catalogImagePreview"),
  deleteCatalogItem: document.querySelector("#deleteCatalogItem"),
  bomButton: document.querySelector("#bomButton"),
  bomDialog: document.querySelector("#bomDialog"),
  closeBomDialog: document.querySelector("#closeBomDialog"),
  bomAllowance: document.querySelector("#bomAllowance"),
  bomSummary: document.querySelector("#bomSummary"),
  wireMaterialRows: document.querySelector("#wireMaterialRows"),
  cutListRows: document.querySelector("#cutListRows"),
  componentBomRows: document.querySelector("#componentBomRows"),
  exportBom: document.querySelector("#exportBom")
});

let state = loadState();
let undoStack = [];
let toastTimer = 0;
let pendingImportRows = [];
let pendingImportContext = { harnessName: "", legNames: { left: {}, right: {} } };
let currentImageFile = null;
let selectedCatalogId = "";

function catalogIdFor(name) {
  return `catalog-${value(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function catalogEntry(name, category, family, positions, details = {}) {
  return {
    id: details.id || catalogIdFor(name),
    name,
    category,
    family,
    positions,
    manufacturer: details.manufacturer || "",
    partNumber: details.partNumber || "",
    gender: details.gender || "",
    terminalType: details.terminalType || "",
    terminalPart: details.terminalPart || "",
    sealPart: details.sealPart || "",
    imageUrl: details.imageUrl || "",
    notes: details.notes || "",
    builtIn: details.builtIn !== false
  };
}

function defaultCatalog() {
  return [
    catalogEntry("A POWER POLE", "Connector", "powerpole", 16, { manufacturer: "Anderson Power Products", terminalType: "Powerpole crimp contact" }),
    catalogEntry("B POWER POLE", "Connector", "powerpole", 16, { manufacturer: "Anderson Power Products", terminalType: "Powerpole crimp contact" }),
    catalogEntry("PCB", "Board", "pcb", 32, { terminalType: "PCB connection" }),
    ...subconPinCounts.flatMap((positions) => [
      catalogEntry(`SUBCONN ${positions} PIN MALE`, "Connector", "subconn", positions, { manufacturer: "SubConn", gender: "Male", terminalType: "Subsea connector contact" }),
      catalogEntry(`SUBCONN ${positions} PIN FEMALE`, "Connector", "subconn", positions, { manufacturer: "SubConn", gender: "Female", terminalType: "Subsea connector contact" })
    ]),
    ...Array.from({ length: 8 }, (_, index) => {
      const positions = index + 1;
      return catalogEntry(`MOLEX ${positions} POS FRONT LOCK`, "Connector", "molex", positions, {
        manufacturer: "Molex",
        partNumber: positions === 2 ? "428160212" : "",
        terminalType: "Molex crimp terminal",
        terminalPart: positions === 2 ? "428150114" : "",
        notes: "Front-lock housing"
      });
    }),
    ...Array.from({ length: 8 }, (_, index) => {
      const positions = index + 1;
      return catalogEntry(`MOLEX ${positions} POS SIDE LOCK`, "Connector", "molex", positions, {
        manufacturer: "Molex",
        partNumber: positions === 2 ? "428160212" : "",
        terminalType: "Molex crimp terminal",
        terminalPart: positions === 2 ? "428150114" : "",
        notes: "Side-lock housing"
      });
    }),
    ...Array.from({ length: 12 }, (_, index) => catalogEntry(`DUPONT ${index + 1} POS FRONT LOCK`, "Connector", "dupont", index + 1, { manufacturer: "Generic", terminalType: "Dupont crimp terminal" })),
    catalogEntry("MOLEX MINI-FIT", "Connector", "molex", 16, { manufacturer: "Molex", terminalType: "Mini-Fit Jr crimp terminal" }),
    catalogEntry("BARREL CONNECTION", "Connector", "barrel", 2, { terminalType: "Barrel connector lead", notes: "DC barrel plug or jack pigtail connection" }),
    catalogEntry("RING TERMINAL", "Terminal", "ring", 1, { terminalType: "Ring terminal" }),
    catalogEntry("SPLICE", "Splice", "splice", 1, { terminalType: "Window splice" })
  ];
}

function normalizeCatalogEntry(entry) {
  const name = cleanCell(entry?.name).toUpperCase();
  return {
    id: value(entry?.id) || catalogIdFor(name || makeId()),
    name,
    category: cleanCell(entry?.category) || "Connector",
    family: cleanCell(entry?.family).toLowerCase() || "generic",
    positions: Math.max(1, Math.min(64, numberOrDefault(entry?.positions, 1))),
    manufacturer: cleanCell(entry?.manufacturer),
    partNumber: cleanCell(entry?.partNumber),
    gender: cleanCell(entry?.gender),
    terminalType: cleanCell(entry?.terminalType),
    terminalPart: cleanCell(entry?.terminalPart),
    sealPart: cleanCell(entry?.sealPart),
    imageUrl: cleanCell(entry?.imageUrl),
    notes: cleanCell(entry?.notes),
    builtIn: Boolean(entry?.builtIn)
  };
}

function normalizeCatalog(catalog) {
  const source = Array.isArray(catalog) && catalog.length ? catalog : defaultCatalog();
  const defaults = defaultCatalog().map(normalizeCatalogEntry);
  const defaultsByName = new Map(defaults.map((entry) => [entry.name, entry]));
  const names = new Set();
  const entries = source
    .map((item) => mergeDefaultCatalogDetails(normalizeCatalogEntry(item), defaultsByName.get(cleanCell(item?.name).toUpperCase())))
    .filter((entry) => entry.name && !names.has(entry.name) && names.add(entry.name));
  defaults.forEach((entry) => {
    if (!names.has(entry.name)) {
      names.add(entry.name);
      entries.push(entry);
    }
  });
  return entries;
}

function mergeDefaultCatalogDetails(entry, defaultEntry) {
  if (!entry.builtIn || !defaultEntry) {
    return entry;
  }

  const defaultPositionUpdate = entry.name === "BARREL CONNECTION" && defaultEntry.positions === 2;
  return {
    ...entry,
    category: entry.category || defaultEntry.category,
    family: entry.family || defaultEntry.family,
    positions: defaultPositionUpdate ? defaultEntry.positions : entry.positions || defaultEntry.positions,
    manufacturer: entry.manufacturer || defaultEntry.manufacturer,
    partNumber: entry.partNumber || defaultEntry.partNumber,
    gender: entry.gender || defaultEntry.gender,
    terminalType: entry.terminalType || defaultEntry.terminalType,
    terminalPart: entry.terminalPart || defaultEntry.terminalPart,
    sealPart: entry.sealPart || defaultEntry.sealPart,
    imageUrl: entry.imageUrl || defaultEntry.imageUrl,
    notes: entry.notes || defaultEntry.notes
  };
}

function housingChoices() {
  return ["", ...state.catalog.map((entry) => entry.name).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))];
}

function catalogEntryByName(name) {
  const target = value(name).trim().toUpperCase();
  return state.catalog.find((entry) => entry.name === target) || null;
}

function catalogPartFor(housing, field) {
  const item = catalogEntryByName(housing);
  return item ? value(item[field]) : "";
}

function applyCatalogParts(row, side, overwrite = false) {
  const left = side === "left";
  const housing = left ? row.housing : row.rightHousing;
  const housingPartField = left ? "leftHousingPart" : "rightHousingPart";
  const terminalPartField = left ? "leftTerminalPart" : "rightTerminalPart";
  const housingPart = catalogPartFor(housing, "partNumber");
  const terminalPart = catalogPartFor(housing, "terminalPart");
  if (housingPart && (overwrite || !row[housingPartField])) {
    row[housingPartField] = housingPart;
  }
  if (terminalPart && (overwrite || !row[terminalPartField])) {
    row[terminalPartField] = terminalPart;
  }
}

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
      leftHousingPart: "",
      leftTerminalPart: "",
      awg: active ? "16" : "",
      color: active ? (pin === 1 ? "BLACK" : "RED") : "",
      length: active ? "8" : "",
      spliceId: "",
      spliceRole: "",
      rightLeg: "",
      rightPin: "",
      rightDnp: !active,
      rightHousing: "",
      rightHousingPart: "",
      rightTerminalPart: "",
      toolUsed: "",
      comments: ""
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
      leftHousingPart: "",
      leftTerminalPart: "",
      awg: "",
      color: "",
      length: "",
      spliceId: "",
      spliceRole: "",
      rightLeg: "",
      rightPin: "",
      rightDnp: true,
      rightHousing: "",
      rightHousingPart: "",
      rightTerminalPart: "",
      toolUsed: "",
      comments: ""
    });
  }

  return rows;
}

function starterState() {
  const rows = createStarterRows();
  return {
    harnessName: "CPC Power Harness",
    selectedId: rows[0]?.id || "",
    rows,
    catalog: defaultCatalog(),
    bomAllowance: 10,
    tableColumnWidths: [...DEFAULT_COLUMN_WIDTHS],
    previewPaneHeight: defaultPreviewPaneHeight(),
    legNames: { left: {}, right: {} }
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
    leftHousingPart: value(row.leftHousingPart || row.housingPart),
    leftTerminalPart: value(row.leftTerminalPart || row.pinPart || row.terminalPart),
    awg: value(row.awg),
    color: value(row.color).toUpperCase(),
    length: value(row.length),
    spliceId: value(row.spliceId).trim().toUpperCase(),
    spliceRole: normalizedSpliceRole(row),
    rightLeg: value(row.rightLeg),
    rightPin: value(row.rightPin),
    rightDnp: row.rightDnp === undefined ? isDnp(row.dnp) : isDnp(row.rightDnp),
    rightHousing: value(row.rightHousing),
    rightHousingPart: value(row.rightHousingPart),
    rightTerminalPart: value(row.rightTerminalPart || row.rightPinPart || row.rightTerminal),
    toolUsed: value(row.toolUsed),
    comments: value(row.comments)
  }));

  const incomingAllowance = Number(incoming.bomAllowance);
  return {
    harnessName: value(incoming.harnessName) || "Untitled Harness",
    selectedId: rows.some((row) => row.id === incoming.selectedId) ? incoming.selectedId : rows[0]?.id || "",
    rows,
    catalog: normalizeCatalog(incoming.catalog),
    bomAllowance: Number.isFinite(incomingAllowance) ? Math.max(0, Math.min(100, incomingAllowance)) : 10,
    tableColumnWidths: normalizeColumnWidths(incoming.tableColumnWidths),
    previewPaneHeight: normalizePreviewPaneHeight(incoming.previewPaneHeight),
    legNames: normalizeLegNames(incoming.legNames)
  };
}

function normalizeLegNames(input = {}) {
  return {
    left: normalizeLegNameMap(input.left || input.leftLegNames || {}),
    right: normalizeLegNameMap(input.right || input.rightLegNames || {})
  };
}

function normalizeLegNameMap(input) {
  if (typeof input === "string") {
    return parseLegNameInput(input);
  }

  return Object.entries(input || {}).reduce((names, [key, name]) => {
    const cleanKey = legKey(key);
    const cleanName = cleanLegName(name);
    if (cleanKey && cleanName) {
      names[cleanKey] = cleanName;
    }
    return names;
  }, {});
}

function parseLegNameInput(input) {
  const entries = value(input)
    .split(/[;,\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  let nextLeg = 1;
  return entries.reduce((names, entry) => {
    const match = entry.match(/^(\d+)\s*(?:=|:|-|\s)\s*(.+)$/);
    const key = match ? match[1] : String(nextLeg);
    const name = cleanLegName(match ? match[2] : entry);
    if (name) {
      names[legKey(key)] = name;
    }
    nextLeg += 1;
    return names;
  }, {});
}

function cleanLegName(input) {
  return cleanCell(input).slice(0, 36);
}

function legNameInputValue(side) {
  const names = state.legNames?.[side] || {};
  return Object.keys(names)
    .sort((left, right) => Number(left) - Number(right) || left.localeCompare(right))
    .map((key) => `${key}=${names[key]}`)
    .join(", ");
}

function legNameFor(side, leg) {
  const key = legKey(leg);
  return state.legNames?.[side]?.[key] || "";
}

function setLegNameFor(side, leg, name) {
  const key = legKey(leg);
  if (!key) {
    return;
  }

  const cleanName = cleanLegName(name);
  state.legNames = {
    left: { ...(state.legNames?.left || {}) },
    right: { ...(state.legNames?.right || {}) }
  };

  if (cleanName) {
    state.legNames[side][key] = cleanName;
  } else {
    delete state.legNames[side][key];
  }
}

function legDisplay(side, leg) {
  const key = legKey(leg);
  const name = legNameFor(side, key);
  return name ? `Leg ${key} (${name})` : `Leg ${key}`;
}

function defaultPreviewPaneHeight() {
  const viewportHeight = window.innerHeight || 900;
  return normalizePreviewPaneHeight(Math.round(viewportHeight * 0.46));
}

function previewPaneMaxHeight() {
  const viewportHeight = window.innerHeight || 900;
  const topbarHeight = dom.topbar?.getBoundingClientRect().height || 96;
  const reserved = topbarHeight + LAYOUT_SPLITTER_HEIGHT + MIN_EDITOR_PANE_HEIGHT + 18;
  return Math.max(MIN_PREVIEW_PANE_HEIGHT, Math.floor(viewportHeight - reserved));
}

function normalizePreviewPaneHeight(height) {
  const parsed = Number(height);
  const fallback = Math.round((window.innerHeight || 900) * 0.46);
  const nextHeight = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(Math.round(nextHeight), MIN_PREVIEW_PANE_HEIGHT, previewPaneMaxHeight());
}

function normalizeColumnWidths(widths) {
  let incoming = Array.isArray(widths) ? widths : [];
  if (incoming.length === 23) {
    incoming = [
      ...incoming.slice(0, 5),
      ...incoming.slice(6, 17),
      incoming[20],
      incoming[18],
      incoming[19],
      ...incoming.slice(21)
    ];
  } else if (incoming.length === DEFAULT_COLUMN_WIDTHS.length - 2) {
    incoming = [
      ...incoming.slice(0, 3),
      DEFAULT_COLUMN_WIDTHS[3],
      ...incoming.slice(3, 14),
      DEFAULT_COLUMN_WIDTHS[15],
      ...incoming.slice(14)
    ];
  }
  return DEFAULT_COLUMN_WIDTHS.map((defaultWidth, index) => {
    const parsed = Number(incoming[index]);
    if (!Number.isFinite(parsed)) {
      return defaultWidth;
    }
    return clamp(Math.round(parsed), minColumnWidth(index), MAX_COLUMN_WIDTH);
  });
}

function minColumnWidth(index) {
  if (index === 0) {
    return 42;
  }
  if (index === 12) {
    return 24;
  }
  return MIN_COLUMN_WIDTH;
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

function branchLabel(row) {
  const spliceId = normalizedSpliceId(row);
  const role = normalizedSpliceRole(row);
  if (!spliceId && !role) {
    return "None";
  }
  if (spliceId && role) {
    return `${spliceId} ${role === "PARENT" ? "Parent" : "Branch"}`;
  }
  return spliceId || (role === "PARENT" ? "Parent" : "Branch");
}

function branchChoices() {
  return [
    "None",
    ...options.spliceIds
      .filter(Boolean)
      .flatMap((spliceId) => [`${spliceId} Parent`, `${spliceId} Branch`])
  ];
}

function applyBranchValue(row, input) {
  const text = cleanCell(input).toUpperCase();
  if (!text || text === "NONE" || text === "-") {
    row.spliceId = "";
    row.spliceRole = "";
    return;
  }

  const role = text.includes("PARENT")
    ? "PARENT"
    : text.includes("BRANCH")
      ? "BRANCH"
      : "";
  const idMatch = text.match(/\bS\d+\b/);
  row.spliceRole = role;
  row.spliceId = idMatch ? idMatch[0] : role ? normalizedSpliceId(row) || nextSpliceId() : text;
}

function isSpliceRow(row) {
  return Boolean(normalizedSpliceId(row) && normalizedSpliceRole(row));
}

function sideHasPlacedDetails(row, side) {
  if (side === "left") {
    return Boolean(row.housing || row.leftHousingPart || row.leftTerminalPart);
  }

  return Boolean(row.rightHousing || row.rightHousingPart || row.rightTerminalPart);
}

function rowHasWirePayload(row) {
  return Boolean(
    row.name ||
    row.housing ||
    row.leftHousingPart ||
    row.leftTerminalPart ||
    row.awg ||
    row.color ||
    row.length ||
    normalizedSpliceId(row) ||
    normalizedSpliceRole(row) ||
    row.rightHousing ||
    row.rightHousingPart ||
    row.rightTerminalPart ||
    row.toolUsed ||
    row.comments
  );
}

function isImplicitDnp(row) {
  return !rowHasWirePayload(row);
}

function isEffectiveDnp(row, side = "left") {
  const explicitDnp = side === "right" ? isDnp(row?.rightDnp) : isDnp(row?.dnp);
  return explicitDnp || isImplicitDnp(row);
}

function dnpLabel(row, side = "left") {
  return isEffectiveDnp(row, side) ? "DNP" : "";
}

function isActiveWireRow(row) {
  if (!row) {
    return false;
  }
  if (!rowHasWirePayload(row)) {
    return false;
  }
  if (isDnp(row.dnp) && isDnp(row.rightDnp)) {
    return false;
  }

  return true;
}

function rowUsesSide(row, side) {
  if (!isActiveWireRow(row)) {
    return false;
  }

  const role = normalizedSpliceRole(row);
  if (role === "PARENT") {
    return side === "left" && (!isDnp(row.dnp) || sideHasPlacedDetails(row, side));
  }
  if (role === "BRANCH") {
    return side === "right" && (!isDnp(row.rightDnp) || sideHasPlacedDetails(row, side));
  }

  if (side === "left" && isDnp(row.dnp)) {
    return sideHasPlacedDetails(row, side);
  }
  if (side === "right" && isDnp(row.rightDnp)) {
    return sideHasPlacedDetails(row, side);
  }
  return true;
}

function nextSpliceId() {
  const used = new Set(state.rows.map(normalizedSpliceId).filter(Boolean));
  return options.spliceIds.find((spliceId) => spliceId && !used.has(spliceId)) || "S1";
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateUndoButtonState();
    return true;
  } catch (error) {
    showToast("Browser storage is full. Export the project JSON, then remove large catalog images.");
    return false;
  }
}

function stateSnapshot() {
  return JSON.stringify(state);
}

function rememberUndo() {
  const snapshot = stateSnapshot();
  if (undoStack[undoStack.length - 1] === snapshot) {
    return;
  }
  undoStack.push(snapshot);
  if (undoStack.length > UNDO_LIMIT) {
    undoStack = undoStack.slice(-UNDO_LIMIT);
  }
  updateUndoButtonState();
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) {
    updateUndoButtonState();
    return;
  }

  try {
    state = normalizeState(JSON.parse(snapshot));
    saveState();
    render();
    showToast("Undid last change.");
  } catch (error) {
    updateUndoButtonState();
    showToast("Undo history could not be restored.");
  }
}

function updateUndoButtonState() {
  if (dom.undoButton) {
    dom.undoButton.disabled = undoStack.length === 0;
  }
}

function selectedRow() {
  return state.rows.find((row) => row.id === state.selectedId) || state.rows[0] || null;
}

function activeRows() {
  return state.rows.filter(isActiveWireRow);
}

function render() {
  dom.harnessName.value = state.harnessName;
  dom.leftLegNames.value = legNameInputValue("left");
  dom.rightLegNames.value = legNameInputValue("right");
  applyPreviewPaneHeight();
  applyColumnWidths();
  renderSummary();
  renderPreview();
  renderLegend();
  renderQualityBadge();
  renderTable();
  updateActionState();
  if (dom.qualityDialog.open) {
    renderQualityDialog();
  }
  if (dom.catalogDialog.open) {
    renderCatalog();
  }
  if (dom.bomDialog.open) {
    renderBom();
  }
}

function applyPreviewPaneHeight() {
  if (!dom.appShell || !dom.layoutSplitter) {
    return;
  }

  const height = normalizePreviewPaneHeight(state.previewPaneHeight);
  state.previewPaneHeight = height;
  dom.appShell.style.setProperty("--preview-pane-height", `${height}px`);
  dom.layoutSplitter.setAttribute("aria-valuemin", String(MIN_PREVIEW_PANE_HEIGHT));
  dom.layoutSplitter.setAttribute("aria-valuemax", String(previewPaneMaxHeight()));
  dom.layoutSplitter.setAttribute("aria-valuenow", String(height));
  dom.layoutSplitter.setAttribute("aria-valuetext", `Preview height ${height} pixels`);
}

function setupLayoutSplitter() {
  if (!dom.layoutSplitter) {
    return;
  }

  dom.layoutSplitter.addEventListener("pointerdown", startLayoutResize);
  dom.layoutSplitter.addEventListener("keydown", handleLayoutSplitterKeydown);
  window.addEventListener("resize", () => {
    const previousHeight = state.previewPaneHeight;
    applyPreviewPaneHeight();
    if (state.previewPaneHeight !== previousHeight) {
      saveState();
      renderPreview();
    }
  });
}

function startLayoutResize(event) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const startY = event.clientY;
  const startHeight = normalizePreviewPaneHeight(state.previewPaneHeight);
  dom.layoutSplitter.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-resizing-layout");
  rememberUndo();

  const resize = (moveEvent) => {
    state.previewPaneHeight = normalizePreviewPaneHeight(startHeight + moveEvent.clientY - startY);
    applyPreviewPaneHeight();
  };

  const stop = () => {
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
    document.body.classList.remove("is-resizing-layout");
    saveState();
    renderPreview();
  };

  document.addEventListener("pointermove", resize);
  document.addEventListener("pointerup", stop, { once: true });
  document.addEventListener("pointercancel", stop, { once: true });
}

function handleLayoutSplitterKeydown(event) {
  const step = event.shiftKey ? 50 : 20;
  let nextHeight = state.previewPaneHeight;
  if (event.key === "ArrowUp") {
    nextHeight -= step;
  } else if (event.key === "ArrowDown") {
    nextHeight += step;
  } else if (event.key === "Home") {
    nextHeight = MIN_PREVIEW_PANE_HEIGHT;
  } else if (event.key === "End") {
    nextHeight = previewPaneMaxHeight();
  } else {
    return;
  }

  event.preventDefault();
  rememberUndo();
  state.previewPaneHeight = normalizePreviewPaneHeight(nextHeight);
  applyPreviewPaneHeight();
  saveState();
  renderPreview();
}

function applyColumnWidths() {
  if (!dom.harnessTable || !dom.tableColumnGroup) {
    return;
  }

  const widths = normalizeColumnWidths(state.tableColumnWidths);
  state.tableColumnWidths = widths;
  dom.tableColumnGroup.innerHTML = widths
    .map((width, index) => `<col data-column-index="${index}" style="width:${width}px; min-width:${width}px;">`)
    .join("");

  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  dom.harnessTable.style.width = `${tableWidth}px`;
  dom.harnessTable.style.minWidth = `${tableWidth}px`;
  dom.harnessTable.style.setProperty("--table-total-width", `${tableWidth}px`);
}

function setupColumnResizers() {
  const headers = dom.harnessTable?.querySelectorAll("thead th") || [];
  headers.forEach((header, index) => {
    if (header.querySelector(".column-resizer")) {
      return;
    }

    header.dataset.columnIndex = String(index);
    const handle = document.createElement("span");
    handle.className = "column-resizer";
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "vertical");
    handle.title = "Drag to resize this column. Double-click to reset.";
    handle.addEventListener("pointerdown", (event) => startColumnResize(event, index));
    handle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      rememberUndo();
      state.tableColumnWidths[index] = DEFAULT_COLUMN_WIDTHS[index];
      applyColumnWidths();
      saveState();
      showToast("Column width reset.");
    });
    header.appendChild(handle);
  });
}

function startColumnResize(event, index) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startWidth = state.tableColumnWidths[index] || DEFAULT_COLUMN_WIDTHS[index] || 100;
  const handle = event.currentTarget;
  handle.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-resizing-column");
  rememberUndo();

  const resize = (moveEvent) => {
    const nextWidth = clamp(Math.round(startWidth + moveEvent.clientX - startX), minColumnWidth(index), MAX_COLUMN_WIDTH);
    state.tableColumnWidths[index] = nextWidth;
    applyColumnWidths();
  };

  const stop = () => {
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
    document.body.classList.remove("is-resizing-column");
    saveState();
  };

  document.addEventListener("pointermove", resize);
  document.addEventListener("pointerup", stop, { once: true });
  document.addEventListener("pointercancel", stop, { once: true });
}

function renderSummary() {
  if (!dom.selectedTitle) {
    return;
  }

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
  dom.summaryStatus.textContent = isActiveWireRow(row) ? "Active" : "DNP";
  dom.summaryGauge.textContent = row.awg ? `${row.awg} AWG` : "Not set";
  dom.summaryColor.textContent = color;
  dom.summaryColorSwatch.style.setProperty("--swatch", colorMap[row.color] || "#d9dfd7");
  dom.summaryLength.textContent = row.length
    ? /\b(in|inch|inches)\b/i.test(row.length)
      ? row.length
      : `${row.length} in`
    : "Not set";
  dom.summaryLeft.textContent = spliceRole === "BRANCH"
    ? `Splice ${spliceId || "-"}`
    : `${legDisplay("left", row.leftLeg || "-")} / Pin ${row.leftPin || "-"}`;
  dom.summaryRight.textContent = spliceRole === "PARENT"
    ? `Splice ${spliceId || "-"}`
    : row.rightLeg || row.rightPin || row.rightHousing
      ? `${legDisplay("right", row.rightLeg || "-")} / Pin ${row.rightPin || "-"}`
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
  const selected = row && isActiveWireRow(row) ? row : {};
  const hasSelectedWire = Boolean(selected.id);

  dom.previewName.textContent = hasSelectedWire
    ? selected.name || state.harnessName || "Harness preview"
    : active.length ? "Harness preview" : "No active wires";
  dom.printHarnessTitle.textContent = state.harnessName || "Untitled Harness";
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
        <path d="${path}" fill="none" stroke="${outline}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
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
  const lengthText = selected.length
    ? /\b(in|inch|inches)\b/i.test(selected.length)
      ? escapeXml(selected.length).toUpperCase()
      : `${escapeXml(selected.length)} IN`
    : "LENGTH NOT SET";
  const gaugeText = selected.awg ? `${escapeXml(selected.awg)} AWG` : "AWG NOT SET";
  const startEndpointLabel = ["bottom", "splice"].includes(selectedStart.exit) ? "" : `
    <text x="${selectedStart.x + 18}" y="${selectedStart.y - 14}" class="wire-sub">LEFT LEG ${escapeXml(selected.leftLeg || "-")} / PIN ${escapeXml(selected.leftPin || "-")}</text>
  `;
  const endEndpointLabel = ["bottom", "splice"].includes(selectedEnd.exit) ? "" : `
    <text x="${Math.min(selectedEnd.x + 16, 820)}" y="${selectedEnd.y - 18}" class="wire-sub">${endpointLabel}</text>
  `;
  const selectedWireMarkup = hasSelectedWire ? `
    <path d="${mainPath}" fill="none" stroke="${selected.color === "BLACK" ? "#f6fbf4" : "rgba(0,0,0,0.62)"}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
    <path d="${mainPath}" fill="none" stroke="${wireColor}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" opacity="1" filter="url(#wireGlow)" />

    ${selectedStart.exit === "splice" ? "" : `<circle cx="${selectedStart.x}" cy="${selectedStart.y}" r="13" fill="none" stroke="${SELECTED_START_COLOR}" stroke-width="3" />`}
    ${selectedEnd.exit === "splice" ? "" : `<circle cx="${selectedEnd.x}" cy="${selectedEnd.y}" r="12" fill="${selectedEnd.polarity ? "none" : "#15201b"}" stroke="${SELECTED_END_COLOR}" stroke-width="3" />`}

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
        .connector-label { fill: #eff8f1; font: 16px Segoe UI, Arial, sans-serif; font-weight: 850; paint-order: stroke; stroke: #15201b; stroke-width: 3px; }
        .leg-name-label { fill: #f2c84b; font: 14px Segoe UI, Arial, sans-serif; font-weight: 850; paint-order: stroke; stroke: #15201b; stroke-width: 3px; }
        .tiny-label { fill: #aebeb3; font: 11px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .housing-label { fill: #d6ded8; font: 12px Segoe UI, Arial, sans-serif; font-weight: 850; paint-order: stroke; stroke: #15201b; stroke-width: 3px; }
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
      end: !isDnp(item.rightDnp) && item.rightLeg && rightMap.has(legKey(item.rightLeg))
        ? pinPoint(rightMap.get(legKey(item.rightLeg)), item.rightPin || "1", "right")
        : unassignedPoint(index, previewHeight)
    };
  }

  return {
    start: pinPoint(leftMap.get(legKey(item.leftLeg)) || leftConnectors[0], item.leftPin, "left"),
    end: !isDnp(item.rightDnp) && item.rightLeg && rightMap.has(legKey(item.rightLeg))
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
    const hasExplicitCount = housingHasExplicitPositionCount(housing);
    const maxUsedPosition = positionData.reduce((max, item) => Math.max(max, item.position), 0);
    const connectorPinCount = family === "dupont" && !hasExplicitCount
      ? Math.max(pinCount, maxUsedPosition)
      : pinCount;
    const dimensionPinCount = family === "dupont" && !hasExplicitCount
      ? Math.max(1, positionData.length || connectorPinCount)
      : connectorPinCount;
    const dimensions = connectorDimensions(family, dimensionPinCount, positionData.length);
    const x = side === "left" ? 38 : 1000 - 38 - dimensions.width;
    const connector = {
      key,
      side,
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
      housing,
      pinCount: connectorPinCount,
      positionData,
      family,
      gender: housingGender(housing)
    };
    y += dimensions.height + gap;
    return connector;
  });
}

function housingPositionCount(housing) {
  const housingText = value(housing).toUpperCase();
  if (housingText.includes("BARREL")) {
    return 2;
  }

  const catalogItem = catalogEntryByName(housing);
  if (catalogItem) {
    return catalogItem.positions;
  }

  const match = housingText.match(/\b(\d{1,2})\s+(?:POS|POSITION|PIN)\b/);
  if (match) {
    return Math.max(1, Math.min(32, Number(match[1])));
  }

  if (housingText === "RING TERMINAL") {
    return 1;
  }

  return 16;
}

function housingHasExplicitPositionCount(housing) {
  const housingText = value(housing).toUpperCase();
  return Boolean(
    catalogEntryByName(housing)
    || housingText.includes("BARREL")
    || housingText === "RING TERMINAL"
    || /\b\d{1,2}\s+(?:POS|POSITION|PIN)\b/.test(housingText)
  );
}

function housingFamily(housing) {
  const text = value(housing).trim().toUpperCase();
  const catalogItem = catalogEntryByName(text);
  if (catalogItem) {
    return catalogItem.family;
  }
  if (text.startsWith("SUBCONN ")) {
    return "subconn";
  }
  if (text.includes("MOLEX")) {
    return "molex";
  }
  if (text.includes("DUPONT")) {
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
  if (text.includes("BARREL")) {
    return "barrel";
  }
  if (text === "SPLICE") {
    return "splice";
  }
  return "generic";
}

function housingGender(housing) {
  const text = value(housing).trim().toUpperCase();
  const catalogItem = catalogEntryByName(text);
  if (catalogItem?.gender) {
    return catalogItem.gender.toLowerCase();
  }
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
  if (family === "barrel") {
    return { width: 156, height: 86 };
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

  rows.filter(isActiveWireRow).forEach((item) => {
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
    .filter(isActiveWireRow)
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
  const index = connectorPositionIndex(connector, position);
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

function connectorPositionIndex(connector, pin) {
  const position = numberOrDefault(pin, 0);
  const index = connector.positionData.findIndex((item) => item.position === position);
  return index >= 0 ? index : Math.max(0, position - 1);
}

function pcbTerminalPoint(connector, pin) {
  return bottomEdgeTerminalPoint(connector, pin, 28, 16);
}

function dupontTerminalPoint(connector, pin) {
  return bottomEdgeTerminalPoint(connector, pin, 26, 16);
}

function bottomEdgeTerminalPoint(connector, pin, inset, bottomOffset) {
  const pinCount = connector.pinCount || 32;
  const safePin = Math.max(1, Math.min(pinCount, numberOrDefault(pin, 1)));
  const index = connectorPositionIndex(connector, safePin);
  const positionCount = Math.max(1, connector.positionData.length || pinCount);
  const leftPadX = connector.x + inset;
  const rightPadX = connector.x + connector.width - inset;
  return {
    x: positionCount === 1
      ? connector.x + connector.width / 2
      : leftPadX + index * ((rightPadX - leftPadX) / Math.max(1, positionCount - 1)),
    y: connector.y + connector.height - bottomOffset
  };
}

function isTwoPinFrontMolex(connector) {
  const text = value(connector?.housing).toUpperCase();
  return connector?.family === "molex"
    && connector.pinCount === 2
    && text.includes("FRONT")
    && !text.includes("SIDE");
}

function twoPinFrontMolexTerminalPoint(connector, pin) {
  const safePin = Math.max(1, Math.min(2, numberOrDefault(pin, 1)));
  return {
    x: connector.x + (safePin === 1 ? connector.width * 0.31 : connector.width * 0.69),
    y: connector.y + connector.height * 0.6
  };
}

function barrelTerminalPoint(connector, pin, side) {
  const safePin = Math.max(1, Math.min(2, numberOrDefault(pin, 1)));
  const barrel = barrelGeometry(connector);
  return safePin === 1 ? barrel.positive : barrel.negative;
}

function barrelGeometry(connector) {
  const { x, y, width, height, side } = connector;
  const centerY = y + height / 2;
  const tipX = side === "left" ? x + width - 12 : x + 12;
  const tailX = side === "left" ? x + 18 : x + width - 18;
  const strainX = side === "left" ? x + 48 : x + width - 66;
  const shellX = side === "left" ? x + 78 : x + 28;
  const tipStart = side === "left" ? tipX - 28 : tipX;
  return {
    centerY,
    tipX,
    tailX,
    strainX,
    shellX,
    tipStart,
    positive: { x: tipX, y: centerY, polarity: "positive" },
    negative: {
      x: side === "left" ? tipStart + 10 : tipStart + 22,
      y: centerY + 12,
      polarity: "negative"
    }
  };
}

function renderConnector(connector, side, rows, selected) {
  const usedPins = new Set(rows
    .filter(isActiveWireRow)
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
  const legName = legNameFor(side, connector.key);
  const labelBlock = connectorSideLabelBlock(connector, legName);
  const labelX = labelBlock.x;
  const anchor = labelBlock.anchor;
  const legNameLabel = legName ? `
    <text x="${labelX}" y="${labelBlock.legNameY}" class="leg-name-label" text-anchor="${anchor}">${escapeXml(legName)}</text>
  ` : "";
  const housingLines = housingLabelLines(housing);
  const housingLabel = housingLines.map((line, index) => `
    <tspan x="${labelX}" dy="${index === 0 ? 0 : 14}">${escapeXml(line)}</tspan>
  `).join("");

  return `
    <text x="${labelX}" y="${labelBlock.connectorY}" class="connector-label" text-anchor="${anchor}">${side === "left" ? "LEFT" : "RIGHT"} ${escapeXml(connector.key)}</text>
    ${legNameLabel}
    ${renderConnectorBody(connector)}
    ${pins}
    <text x="${labelX}" y="${labelBlock.housingY}" class="housing-label" text-anchor="${anchor}">${housingLabel}</text>
  `;
}

function connectorSideLabelBlock(connector, legName) {
  const physicalSide = connector.x < 500 ? "left" : "right";
  const towardCenter = physicalSide === "left" ? 1 : -1;
  const labelGap = 88;
  const x = physicalSide === "left"
    ? connector.x + connector.width + labelGap
    : connector.x - labelGap;
  const lineGap = 18;
  return {
    x: clamp(x, 24, 976),
    anchor: towardCenter > 0 ? "start" : "end",
    connectorY: connector.y + 18,
    legNameY: connector.y + 18 + lineGap,
    housingY: connector.y + 18 + (legName ? lineGap * 2 : lineGap)
  };
}

function renderConnectorLead(connector, contact, port, isSelected, isUsed, side) {
  if (connector.family === "powerpole" || connector.family === "barrel" || isTwoPinFrontMolex(connector) || (!isUsed && !isSelected)) {
    return "";
  }

  const selectedColor = side === "left" ? SELECTED_START_COLOR : SELECTED_END_COLOR;
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
      <path d="M ${x + 24} ${y + height - 28} H ${centerX} V ${centerY} H ${x + width - 22}" fill="none" stroke="#d7aa42" stroke-width="3" opacity="0.75" />
      <path d="M ${x + 28} ${y + height - 16} H ${x + width - 28}" fill="none" stroke="#d7aa42" stroke-width="2.5" opacity="0.52" />
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

  if (family === "barrel") {
    const barrel = barrelGeometry(connector);
    return `
      <path d="M ${barrel.tailX} ${barrel.centerY} C ${side === "left" ? barrel.tailX + 18 : barrel.tailX - 18} ${barrel.centerY - 17}, ${side === "left" ? barrel.tailX + 42 : barrel.tailX - 42} ${barrel.centerY + 17}, ${barrel.strainX} ${barrel.centerY}" fill="none" stroke="#101613" stroke-width="9" stroke-linecap="round" />
      <rect x="${Math.min(barrel.strainX, barrel.shellX) - 2}" y="${barrel.centerY - 17}" width="${Math.abs(barrel.shellX - barrel.strainX) + 20}" height="34" rx="11" fill="#151d19" stroke="#495851" stroke-width="3" />
      <rect x="${barrel.shellX}" y="${barrel.centerY - 20}" width="50" height="40" rx="13" fill="#1e2823" stroke="#68766e" stroke-width="3" />
      <rect x="${barrel.tipStart}" y="${barrel.centerY - 8}" width="32" height="16" rx="5" fill="#cfd4cf" stroke="#f4f6f1" stroke-width="2" />
      <rect x="${barrel.tipStart + 3}" y="${barrel.centerY - 5}" width="23" height="10" rx="3" fill="#8b948e" />
      <path d="M ${barrel.negative.x - 8} ${barrel.negative.y} H ${barrel.negative.x + 8}" stroke="#202823" stroke-width="4" stroke-linecap="round" opacity="0.85" />
      <circle cx="${barrel.positive.x}" cy="${barrel.positive.y}" r="4" fill="#202823" stroke="#f3f6f1" stroke-width="1.5" />
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
  const selectedColor = side === "left" ? SELECTED_START_COLOR : SELECTED_END_COLOR;
  const centerX = connector.x + connector.width / 2;
  const isSubconn = connector.family === "subconn";
  const isHorizontalHousing = connector.family === "molex";
  const isBottomTerminalHousing = isTwoPinFrontMolex(connector) || connector.family === "barrel" || connector.family === "pcb" || connector.family === "dupont";
  const numericPin = numberOrDefault(pin, 0);
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
  } else if (connector.family === "barrel") {
    const isPositive = numericPin === 1;
    contact = isPositive
      ? `${isSelected ? `<circle cx="${point.x}" cy="${point.y}" r="8.5" fill="none" stroke="${selectedColor}" stroke-width="2.5" />` : ""}
        <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#f6fbf4" stroke="#d93a36" stroke-width="2.5" />`
      : `${isSelected ? `<circle cx="${point.x}" cy="${point.y}" r="8.5" fill="none" stroke="${selectedColor}" stroke-width="2.5" />` : ""}
        <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#101613" stroke="#f6fbf4" stroke-width="2.5" />`;
  } else {
    const fill = isSelected ? selectedColor : isUsed ? "#d8efe2" : "#f6fbf4";
    const stroke = isSelected ? fill : isUsed ? "#41b883" : "#9fac9f";
    contact = `<circle cx="${point.x}" cy="${point.y}" r="${isSelected ? 7 : 5.5}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
  }

  const radialSide = point.x >= centerX;
  const textX = connector.family === "barrel" && numericPin === 2
    ? point.x + (side === "left" ? -13 : 13)
    : isBottomTerminalHousing
    ? point.x
    : isHorizontalHousing
    ? point.x
    : isSubconn
    ? point.x + (radialSide ? 12 : -12)
    : side === "left" ? point.x - 31 : point.x + 18;
  const textY = connector.family === "barrel"
    ? point.y + (numericPin === 1 ? 22 : -8)
    : isBottomTerminalHousing ? point.y - 14 : isHorizontalHousing ? point.y + 24 : point.y + 4;
  const anchor = connector.family === "barrel" && numericPin === 2
    ? side === "left" ? "end" : "start"
    : isBottomTerminalHousing || isHorizontalHousing ? "middle" : isSubconn ? (radialSide ? "start" : "end") : "start";

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
  const candidates = [selected, ...rows].filter((row) => row && isActiveWireRow(row) && rowUsesSide(row, side));
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

  if (connector.family === "pcb") {
    return pcbTerminalPoint(connector, safePin);
  }

  if (connector.family === "dupont") {
    return dupontTerminalPoint(connector, safePin);
  }

  if (connector.family === "molex") {
    if (isTwoPinFrontMolex(connector)) {
      return twoPinFrontMolexTerminalPoint(connector, safePin);
    }

    const x = pinCount === 1
      ? connector.x + connector.width / 2
      : connector.x + 32 + (safePin - 1) * ((connector.width - 64) / (pinCount - 1));
    return {
      x,
      y: connector.y + connector.height / 2
    };
  }

  if (connector.family === "barrel") {
    return barrelTerminalPoint(connector, safePin, side);
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
  if (isTwoPinFrontMolex(connector) || connector.family === "barrel" || connector.family === "pcb" || connector.family === "dupont") {
    return {
      x: contact.x,
      y: ["pcb", "dupont"].includes(connector.family) ? connector.y + connector.height + 6 : contact.y,
      exit: "bottom",
      lane,
      side,
      edgeX: side === "left" ? connector.x + connector.width + 26 : connector.x - 26,
      polarity: contact.polarity || ""
    };
  }

  const portCount = Math.max(1, connector.positionData.length);
  const x = connector.family === "molex"
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
  const routeIndex = Math.max(0, index);
  return point.y + 26 + routeIndex * WIRE_EXIT_GAP;
}

function bottomBusX(point, index) {
  const nudge = Math.max(0, index) * WIRE_BUS_GAP;
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

function validateHarness() {
  const issues = [];
  const active = activeRows();
  const add = (row, severity, code, message) => {
    issues.push({
      id: `${code}-${row?.id || issues.length}`,
      rowId: row?.id || "",
      severity,
      code,
      message
    });
  };

  active.forEach((row) => {
    const role = normalizedSpliceRole(row);
    const spliceId = normalizedSpliceId(row);
    const needsLeft = role !== "BRANCH";
    const needsRight = role !== "PARENT";

    if (needsLeft) {
      validateEndpoint(row, "left", add);
    }

    const rightIsDnp = isDnp(row.rightDnp);
    const hasAnyRight = Boolean(row.rightLeg || row.rightPin || row.rightHousing || row.rightHousingPart || row.rightTerminalPart || rightIsDnp);
    if (needsRight && !rightIsDnp && (role === "BRANCH" || hasAnyRight)) {
      validateEndpoint(row, "right", add);
    } else if (!role && !hasAnyRight) {
      add(row, "warning", "missing-destination", "Active wire has no right-side destination.");
    }

    if (!row.name) {
      add(row, "warning", "missing-name", "Active wire has no wire name or identifier.");
    }
    if (!row.awg) {
      add(row, "warning", "missing-awg", "Active wire has no AWG value.");
    }
    if (!row.color) {
      add(row, "warning", "missing-color", "Active wire has no color.");
    }
    if (!(numberOrDefault(row.length, 0) > 0)) {
      add(row, "warning", "missing-length", "Active wire needs a positive cut length.");
    }
    if (role && !spliceId) {
      add(row, "error", "missing-splice-id", `${role} row has no splice ID.`);
    }
    if (spliceId && !role) {
      add(row, "warning", "missing-splice-role", `${spliceId} has no parent or branch role.`);
    }
  });

  ["left", "right"].forEach((side) => {
    const endpointRows = new Map();
    const legRows = new Map();

    active.filter((row) => rowUsesSide(row, side)).forEach((row) => {
      const leg = cleanCell(side === "left" ? row.leftLeg : row.rightLeg).toUpperCase();
      const pin = cleanCell(side === "left" ? row.leftPin : row.rightPin).toUpperCase();
      const housing = cleanCell(side === "left" ? row.housing : row.rightHousing).toUpperCase();
      if (leg && pin) {
        const key = `${leg}|${pin}`;
        if (!endpointRows.has(key)) {
          endpointRows.set(key, []);
        }
        endpointRows.get(key).push(row);
      }
      if (leg && housing) {
        if (!legRows.has(leg)) {
          legRows.set(leg, []);
        }
        legRows.get(leg).push({ row, housing });
      }
    });

    endpointRows.forEach((rows, endpoint) => {
      if (rows.length > 1) {
        rows.forEach((row) => add(row, "error", `duplicate-${side}-${endpoint}`, `Duplicate ${side} endpoint ${endpoint.replace("|", " / pin ")}.`));
      }
    });

    legRows.forEach((entries, leg) => {
      const housings = new Set(entries.map((entry) => entry.housing));
      if (housings.size > 1) {
        entries.forEach(({ row }) => add(row, "error", `housing-conflict-${side}-${leg}`, `${side === "left" ? "Left" : "Right"} leg ${leg} uses conflicting housing types.`));
      }
    });
  });

  const spliceGroups = new Map();
  active.filter((row) => normalizedSpliceId(row)).forEach((row) => {
    const id = normalizedSpliceId(row);
    if (!spliceGroups.has(id)) {
      spliceGroups.set(id, []);
    }
    spliceGroups.get(id).push(row);
  });
  spliceGroups.forEach((rows, spliceId) => {
    const parentCount = rows.filter((row) => normalizedSpliceRole(row) === "PARENT").length;
    const branchCount = rows.filter((row) => normalizedSpliceRole(row) === "BRANCH").length;
    if (parentCount !== 1) {
      rows.forEach((row) => add(row, "error", `splice-parent-${spliceId}`, `${spliceId} requires exactly one parent wire; found ${parentCount}.`));
    }
    if (branchCount < 1) {
      rows.forEach((row) => add(row, "error", `splice-branch-${spliceId}`, `${spliceId} requires at least one branch wire.`));
    }
  });

  const rowOrder = new Map(state.rows.map((row, index) => [row.id, index]));
  return issues.sort((left, right) => {
    const severity = (left.severity === "error" ? 0 : 1) - (right.severity === "error" ? 0 : 1);
    return severity || (rowOrder.get(left.rowId) || 0) - (rowOrder.get(right.rowId) || 0);
  });
}

function validateEndpoint(row, side, add) {
  const left = side === "left";
  const label = left ? "Left" : "Right";
  const leg = left ? row.leftLeg : row.rightLeg;
  const pin = left ? row.leftPin : row.rightPin;
  const housing = left ? row.housing : row.rightHousing;
  if (!leg) {
    add(row, "error", `missing-${side}-leg`, `${label} endpoint has no leg.`);
  }
  if (!pin) {
    add(row, "error", `missing-${side}-pin`, `${label} endpoint has no pin.`);
  }
  if (!housing) {
    add(row, "error", `missing-${side}-housing`, `${label} endpoint has no housing.`);
    return;
  }

  const catalogItem = catalogEntryByName(housing);
  if (!catalogItem) {
    add(row, "warning", `uncataloged-${side}-housing`, `${label} housing "${housing}" is not in the catalog.`);
    return;
  }

  const pinNumber = numberOrDefault(pin, 0);
  if (pinNumber > catalogItem.positions) {
    add(row, "error", `pin-overflow-${side}`, `${label} pin ${pinNumber} exceeds the ${catalogItem.positions}-position ${catalogItem.name} housing.`);
  }
}

function qualityIssuesByRow(issues = validateHarness()) {
  return issues.reduce((map, issue) => {
    if (issue.rowId) {
      if (!map.has(issue.rowId)) {
        map.set(issue.rowId, []);
      }
      map.get(issue.rowId).push(issue);
    }
    return map;
  }, new Map());
}

function renderQualityBadge() {
  const issues = validateHarness();
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  dom.qualityCount.textContent = String(issues.length);
  dom.qualityButton.classList.toggle("has-errors", errors > 0);
  dom.qualityButton.classList.toggle("has-warnings", warnings > 0);
  dom.qualityButton.title = issues.length
    ? `${errors} error(s), ${warnings} warning(s)`
    : "No electrical issues found";
}

function renderQualityDialog() {
  const issues = validateHarness();
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  dom.qualitySummary.innerHTML = `
    ${summaryMetric("Active wires", activeRows().length)}
    ${summaryMetric("Errors", errors, "error")}
    ${summaryMetric("Warnings", warnings, "warning")}
    ${summaryMetric("Status", errors ? "Fix errors" : warnings ? "Review warnings" : "Ready")}
  `;
  dom.qualityIssues.innerHTML = issues.length
    ? issues.map((issue) => {
      const rowNumber = state.rows.findIndex((row) => row.id === issue.rowId) + 1;
      return `
        <button class="issue-item ${issue.severity}" type="button" data-row-id="${escapeHtml(issue.rowId)}">
          <span class="issue-severity">${issue.severity}</span>
          <strong>${escapeHtml(issue.message)}</strong>
          <span class="issue-row">${rowNumber ? `Row ${rowNumber}` : "Harness"}</span>
        </button>
      `;
    }).join("")
    : `<div class="empty-workspace"><strong>No electrical issues found.</strong><br>The active harness passes the current checks.</div>`;
}

function summaryMetric(label, valueText, className = "") {
  return `<div class="summary-metric ${className}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(valueText)}</strong></div>`;
}

function focusIssueRow(rowId) {
  if (!state.rows.some((row) => row.id === rowId)) {
    return;
  }
  state.selectedId = rowId;
  if (dom.searchRows) {
    dom.searchRows.value = "";
  }
  if (dom.activeOnly) {
    dom.activeOnly.checked = false;
  }
  saveState();
  render();
  const row = dom.wireRows.querySelector(`tr[data-id="${CSS.escape(rowId)}"]`);
  row?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function safeImageUrl(input) {
  const url = cleanCell(input);
  return /^(https?:\/\/|data:image\/)/i.test(url) ? url : "";
}

function openCatalog() {
  const selected = selectedRow();
  const matching = catalogEntryByName(selected?.housing) || catalogEntryByName(selected?.rightHousing);
  selectedCatalogId = matching?.id || state.catalog[0]?.id || "";
  dom.catalogSearch.value = "";
  renderCatalog();
  dom.catalogDialog.showModal();
}

function renderCatalog() {
  const query = dom.catalogSearch.value.trim().toLowerCase();
  const rows = state.catalog.filter((entry) => [
    entry.name,
    entry.category,
    entry.manufacturer,
    entry.partNumber,
    entry.terminalType,
    entry.terminalPart
  ].join(" ").toLowerCase().includes(query));
  dom.catalogRows.innerHTML = rows.length
    ? rows.map((entry) => `
      <tr class="catalog-row ${entry.id === selectedCatalogId ? "selected" : ""}" data-catalog-id="${escapeHtml(entry.id)}">
        <td><strong>${escapeHtml(entry.name)}</strong><br><span class="catalog-kind">${entry.builtIn ? "Built in" : "Custom"}</span></td>
        <td>${escapeHtml(entry.category)}</td>
        <td>${entry.positions}</td>
        <td>${escapeHtml(entry.partNumber || "-")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty-workspace">No catalog items found.</td></tr>`;

  const selected = state.catalog.find((entry) => entry.id === selectedCatalogId);
  if (selected) {
    populateCatalogForm(selected);
  } else if (!dom.catalogId.value) {
    clearCatalogForm();
  }
}

function populateCatalogForm(entry) {
  selectedCatalogId = entry.id;
  dom.catalogId.value = entry.id;
  dom.catalogName.value = entry.name;
  dom.catalogCategory.value = entry.category;
  dom.catalogFamily.value = entry.family;
  dom.catalogPositions.value = entry.positions;
  dom.catalogGender.value = entry.gender;
  dom.catalogManufacturer.value = entry.manufacturer;
  dom.catalogPartNumber.value = entry.partNumber;
  dom.catalogTerminalType.value = entry.terminalType;
  dom.catalogTerminalPart.value = entry.terminalPart;
  dom.catalogSealPart.value = entry.sealPart;
  dom.catalogImageUrl.value = entry.imageUrl;
  dom.catalogNotes.value = entry.notes;
  dom.deleteCatalogItem.disabled = entry.builtIn;
  renderCatalogImage(entry.imageUrl);
}

function clearCatalogForm() {
  selectedCatalogId = "";
  dom.catalogForm.reset();
  dom.catalogId.value = "";
  dom.catalogPositions.value = "1";
  dom.catalogCategory.value = "Connector";
  dom.catalogFamily.value = "generic";
  dom.deleteCatalogItem.disabled = true;
  renderCatalogImage("");
  dom.catalogName.focus();
}

function renderCatalogImage(imageUrl) {
  const safeUrl = safeImageUrl(imageUrl);
  dom.catalogImagePreview.innerHTML = safeUrl
    ? `<img src="${escapeHtml(safeUrl)}" alt="Catalog connector image">`
    : `<span>No image</span>`;
  const image = dom.catalogImagePreview.querySelector("img");
  if (image) {
    image.addEventListener("error", () => {
      dom.catalogImagePreview.innerHTML = `<span>Image could not be loaded</span>`;
    }, { once: true });
  }
}

function compactCatalogImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const scale = Math.min(1, 640 / image.naturalWidth, 420 / image.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      }, { once: true });
      image.src = reader.result;
    }, { once: true });
    reader.readAsDataURL(file);
  });
}

function saveCatalogItem(event) {
  event.preventDefault();
  const name = cleanCell(dom.catalogName.value).toUpperCase();
  if (!name) {
    showToast("Catalog item needs a name.");
    return;
  }

  const existingId = dom.catalogId.value;
  const existing = state.catalog.find((entry) => entry.id === existingId);
  const duplicate = state.catalog.find((entry) => entry.name === name && entry.id !== existingId);
  if (duplicate) {
    showToast("A catalog item with that name already exists.");
    return;
  }

  const entry = normalizeCatalogEntry({
    id: existingId || `${catalogIdFor(name)}-${Date.now().toString(36)}`,
    name,
    category: dom.catalogCategory.value,
    family: dom.catalogFamily.value,
    positions: dom.catalogPositions.value,
    gender: dom.catalogGender.value,
    manufacturer: dom.catalogManufacturer.value,
    partNumber: dom.catalogPartNumber.value,
    terminalType: dom.catalogTerminalType.value,
    terminalPart: dom.catalogTerminalPart.value,
    sealPart: dom.catalogSealPart.value,
    imageUrl: safeImageUrl(dom.catalogImageUrl.value),
    notes: dom.catalogNotes.value,
    builtIn: existing?.builtIn || false
  });

  rememberUndo();
  if (existing) {
    const oldName = existing.name;
    Object.assign(existing, entry);
    if (oldName !== entry.name) {
      state.rows.forEach((row) => {
        if (row.housing === oldName) {
          row.housing = entry.name;
        }
        if (row.rightHousing === oldName) {
          row.rightHousing = entry.name;
        }
      });
    }
  } else {
    state.catalog.push(entry);
  }
  selectedCatalogId = entry.id;
  saveState();
  render();
  renderCatalog();
  showToast(existing ? "Catalog item updated." : "Custom catalog item added.");
}

function deleteCatalogItem() {
  const entry = state.catalog.find((item) => item.id === dom.catalogId.value);
  if (!entry || entry.builtIn) {
    return;
  }
  const used = state.rows.some((row) => row.housing === entry.name || row.rightHousing === entry.name);
  if (used) {
    showToast("This catalog item is used by the harness and cannot be deleted.");
    return;
  }
  rememberUndo();
  state.catalog = state.catalog.filter((item) => item.id !== entry.id);
  selectedCatalogId = state.catalog[0]?.id || "";
  saveState();
  render();
  renderCatalog();
  showToast("Custom catalog item deleted.");
}

function resetCatalogDefaults() {
  if (!window.confirm("Restore the built-in catalog and remove custom catalog items?")) {
    return;
  }
  rememberUndo();
  state.catalog = defaultCatalog();
  selectedCatalogId = state.catalog[0]?.id || "";
  saveState();
  render();
  renderCatalog();
  showToast("Catalog defaults restored.");
}

function renderTable() {
  const issuesByRow = qualityIssuesByRow();
  let previousLeg = "";

  const rows = state.rows.map((row, index) => ({ row, index }));

  dom.wireRows.innerHTML = rows.map(({ row, index }) => {
    const groupStart = previousLeg && previousLeg !== row.leftLeg;
    previousLeg = row.leftLeg;
    const rowIssues = issuesByRow.get(row.id) || [];
    const hasError = rowIssues.some((issue) => issue.severity === "error");
    const classes = [
      row.id === state.selectedId ? "selected-row" : "",
      !isActiveWireRow(row) ? "dnp-row" : "",
      groupStart ? "group-start" : "",
      hasError ? "issue-error" : rowIssues.length ? "issue-warning" : ""
    ].filter(Boolean).join(" ");
    const issueTitle = rowIssues.map((issue) => issue.message).join(" ");
    const issueCount = rowIssues.length ? `<span class="row-issue-count" title="${escapeHtml(issueTitle)}">${rowIssues.length}</span>` : "";

    return `
      <tr class="${classes}" data-id="${row.id}">
        <td class="row-index">
          <button class="clear-row-button" type="button" data-action="clear-row" title="Clear row ${index + 1} and remove its wire" aria-label="Clear row ${index + 1}">${index + 1}</button>
          ${issueCount}
        </td>
        <td class="field-name"><input data-field="name" list="nameChoices" value="${escapeHtml(row.name)}" aria-label="Wire name"></td>
        <td>${selectField(row, "leftLeg", options.legs, "Left leg")}</td>
        <td><input data-field="leftLegName" value="${escapeHtml(legNameFor("left", row.leftLeg))}" aria-label="Left leg name"></td>
        <td>${selectField(row, "leftPin", options.pins, "Left pin")}</td>
        <td class="field-housing">${selectField(row, "housing", housingChoices(), "Housing type")}</td>
        <td><input data-field="leftHousingPart" value="${escapeHtml(row.leftHousingPart)}" aria-label="Left housing part number"></td>
        <td><input data-field="leftTerminalPart" value="${escapeHtml(row.leftTerminalPart)}" aria-label="Left terminal pin part number"></td>
        <td>${selectField(row, "awg", options.gauges, "AW gauge")}</td>
        <td class="field-color">
          <div class="color-cell">
            <span class="swatch" style="--swatch:${colorMap[row.color] || "#d9dfd7"}"></span>
            ${selectField(row, "color", options.colors, "Color")}
          </div>
        </td>
        <td><input data-field="length" value="${escapeHtml(row.length)}" aria-label="Length inches"></td>
        <td class="field-branch">${selectField(row, "branch", branchChoices(), "Branch", branchLabel(row))}</td>
        <td class="divider-cell"></td>
        <td>${selectField(row, "rightLeg", options.legs, "Right leg")}</td>
        <td><input data-field="rightLegName" value="${escapeHtml(legNameFor("right", row.rightLeg))}" aria-label="Right leg name"></td>
        <td>${selectField(row, "rightPin", options.pins, "Right pin")}</td>
        <td class="field-right-housing">${selectField(row, "rightHousing", housingChoices(), "Right housing type")}</td>
        <td><input data-field="rightHousingPart" value="${escapeHtml(row.rightHousingPart)}" aria-label="Right housing part number"></td>
        <td><input data-field="rightTerminalPart" value="${escapeHtml(row.rightTerminalPart)}" aria-label="Right terminal pin part number"></td>
        <td><input data-field="toolUsed" value="${escapeHtml(row.toolUsed)}" aria-label="Tool used"></td>
        <td><input data-field="comments" value="${escapeHtml(row.comments)}" aria-label="Comments"></td>
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
  updateUndoButtonState();
}

function syncSelectedRowClass() {
  dom.wireRows.querySelectorAll("tr[data-id]").forEach((tableRow) => {
    tableRow.classList.toggle("selected-row", tableRow.dataset.id === state.selectedId);
  });
}

function comparableFieldValue(row, field) {
  if (field === "leftLegName") {
    return legNameFor("left", row.leftLeg);
  }
  if (field === "rightLegName") {
    return legNameFor("right", row.rightLeg);
  }
  if (field === "dnp") {
    return dnpLabel(row, "left");
  }
  if (field === "rightDnp") {
    return dnpLabel(row, "right");
  }
  if (field === "color" || field === "spliceRole" || field === "spliceId") {
    return value(row[field]).toUpperCase();
  }
  if (field === "branch") {
    return branchLabel(row);
  }
  return value(row[field]);
}

function comparableInputValue(field, input) {
  if (field === "leftLegName" || field === "rightLegName") {
    return cleanLegName(input);
  }
  if (field === "dnp" || field === "rightDnp") {
    return input === "DNP" ? "DNP" : "";
  }
  if (field === "color" || field === "spliceRole" || field === "spliceId") {
    return value(input).toUpperCase();
  }
  if (field === "branch") {
    return cleanCell(input) || "None";
  }
  return value(input);
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

  const previousValue = comparableFieldValue(row, field);
  const nextValue = comparableInputValue(field, target.value);
  if (previousValue === nextValue) {
    saveState();
    return;
  }

  rememberUndo();
  if (field === "dnp") {
    row.dnp = target.value === "DNP";
    if (row.dnp) {
      row.rightDnp = true;
    }
  } else if (field === "rightDnp") {
    row.rightDnp = target.value === "DNP";
  } else if (field === "color") {
    row[field] = target.value.toUpperCase();
  } else if (field === "branch") {
    applyBranchValue(row, target.value);
  } else if (field === "housing") {
    row.housing = target.value;
    applyCatalogParts(row, "left");
  } else if (field === "rightHousing") {
    row.rightHousing = target.value;
    applyCatalogParts(row, "right");
  } else if (field === "leftLegName") {
    setLegNameFor("left", row.leftLeg, target.value);
    dom.leftLegNames.value = legNameInputValue("left");
  } else if (field === "rightLegName") {
    setLegNameFor("right", row.rightLeg, target.value);
    dom.rightLegNames.value = legNameInputValue("right");
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
    renderQualityBadge();
    if (dom.qualityDialog.open) {
      renderQualityDialog();
    }
    if (dom.bomDialog.open) {
      renderBom();
    }
    updateActionState();
  }
}

function updateLegNames(side, inputValue) {
  const nextNames = parseLegNameInput(inputValue);
  const currentNames = state.legNames?.[side] || {};
  if (JSON.stringify(nextNames) === JSON.stringify(currentNames)) {
    return;
  }

  rememberUndo();
  state.legNames = {
    left: { ...(state.legNames?.left || {}) },
    right: { ...(state.legNames?.right || {}) },
    [side]: nextNames
  };
  saveState();
  render();
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
    leftHousingPart: current?.leftHousingPart || "",
    leftTerminalPart: current?.leftTerminalPart || "",
    awg: current?.awg || "16",
    color: current?.color || "RED",
    length: current?.length || "8",
    spliceId: "",
    spliceRole: "",
    rightLeg: current?.rightLeg || "",
    rightPin: "",
    rightDnp: false,
    rightHousing: current?.rightHousing || "",
    rightHousingPart: current?.rightHousingPart || "",
    rightTerminalPart: current?.rightTerminalPart || "",
    toolUsed: current?.toolUsed || "",
    comments: ""
  };

  rememberUndo();
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
      leftHousingPart: "",
      leftTerminalPart: "",
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

  rememberUndo();
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
  rememberUndo();
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
  rememberUndo();
  Object.assign(row, {
    name: "",
    dnp: true,
    housing: "",
    leftHousingPart: "",
    leftTerminalPart: "",
    awg: "",
    color: "",
    length: "",
    spliceId: "",
    spliceRole: "",
    rightLeg: "",
    rightPin: "",
    rightDnp: true,
    rightHousing: "",
    rightHousingPart: "",
    rightTerminalPart: "",
    toolUsed: "",
    comments: ""
  });

  state.selectedId = state.rows.find(isActiveWireRow)?.id || row.id;
  saveState();
  render();
  showToast(`Cleared row ${rowNumber} and removed its wire.`);
}

function resetSample() {
  if (!window.confirm("Reset this harness to the starter layout?")) {
    return;
  }

  const catalog = state.catalog;
  const bomAllowance = state.bomAllowance;
  const tableColumnWidths = state.tableColumnWidths;
  const previewPaneHeight = state.previewPaneHeight;
  const legNames = state.legNames;
  rememberUndo();
  state = starterState();
  state.catalog = catalog;
  state.bomAllowance = bomAllowance;
  state.tableColumnWidths = tableColumnWidths;
  state.previewPaneHeight = previewPaneHeight;
  state.legNames = legNames;
  saveState();
  if (dom.searchRows) {
    dom.searchRows.value = "";
  }
  if (dom.activeOnly) {
    dom.activeOnly.checked = false;
  }
  render();
  showToast("Starter layout restored.");
}

function calculateBom() {
  const wires = activeRows();
  const allowance = Math.max(0, Math.min(100, Number(state.bomAllowance) || 0));
  const wireMaterials = new Map();
  const cutList = new Map();
  const components = new Map();
  const housingInstances = new Set();
  const spliceIds = new Set();

  const addComponent = (type, item, manufacturer = "", partNumber = "", quantity = 1) => {
    if (!item || quantity <= 0) {
      return;
    }
    const key = [type, item, manufacturer, partNumber].join("|");
    if (!components.has(key)) {
      components.set(key, { type, item, manufacturer, partNumber, quantity: 0 });
    }
    components.get(key).quantity += quantity;
  };

  wires.forEach((row) => {
    const length = Math.max(0, numberOrDefault(row.length, 0));
    const awg = row.awg || "UNSET";
    const color = row.color || "UNSET";
    const materialKey = `${awg}|${color}`;
    if (!wireMaterials.has(materialKey)) {
      wireMaterials.set(materialKey, { awg, color, wires: 0, exactInches: 0, purchaseInches: 0 });
    }
    const material = wireMaterials.get(materialKey);
    material.wires += 1;
    material.exactInches += length;
    material.purchaseInches += length * (1 + allowance / 100);

    const cutKey = `${awg}|${color}|${length}`;
    if (!cutList.has(cutKey)) {
      cutList.set(cutKey, { awg, color, length, quantity: 0, totalInches: 0 });
    }
    const cut = cutList.get(cutKey);
    cut.quantity += 1;
    cut.totalInches += length;

    ["left", "right"].forEach((side) => {
      if (!rowUsesSide(row, side)) {
        return;
      }
      const leg = side === "left" ? row.leftLeg : row.rightLeg;
      const pin = side === "left" ? row.leftPin : row.rightPin;
      const housing = side === "left" ? row.housing : row.rightHousing;
      const housingPart = side === "left" ? row.leftHousingPart : row.rightHousingPart;
      const terminalPart = side === "left" ? row.leftTerminalPart : row.rightTerminalPart;
      if (!housing || !leg || !pin) {
        return;
      }
      const item = catalogEntryByName(housing);
      if (!item) {
        addComponent("Uncataloged", housing, "", "", 1);
        return;
      }

      const perEndpointHousing = ["powerpole", "ring"].includes(item.family) || item.category === "Terminal";
      const housingKey = perEndpointHousing
        ? `${side}|${leg}|${pin}|${item.name}`
        : `${side}|${leg}|${item.name}`;
      if (!housingInstances.has(housingKey)) {
        housingInstances.add(housingKey);
        addComponent(item.category === "Terminal" ? "Terminal" : "Housing", item.name, item.manufacturer, housingPart || item.partNumber, 1);
      }

      if (item.category !== "Terminal" && item.terminalType) {
        addComponent("Terminal", item.terminalType, item.manufacturer, terminalPart || item.terminalPart, 1);
      }
      if (item.sealPart) {
        addComponent("Seal", `${item.name} seal`, item.manufacturer, item.sealPart, 1);
      }
    });

    const spliceId = normalizedSpliceId(row);
    if (spliceId) {
      spliceIds.add(spliceId);
    }
  });

  const spliceCatalog = catalogEntryByName("SPLICE");
  spliceIds.forEach((spliceId) => addComponent("Splice", spliceId, spliceCatalog?.manufacturer || "", spliceCatalog?.partNumber || "", 1));

  const sortedWireMaterials = [...wireMaterials.values()].sort((left, right) => numberOrDefault(left.awg, 99) - numberOrDefault(right.awg, 99) || left.color.localeCompare(right.color));
  const sortedCutList = [...cutList.values()].sort((left, right) => numberOrDefault(left.awg, 99) - numberOrDefault(right.awg, 99) || left.color.localeCompare(right.color) || left.length - right.length);
  const sortedComponents = [...components.values()].sort((left, right) => left.type.localeCompare(right.type) || left.item.localeCompare(right.item, undefined, { numeric: true }));
  return {
    allowance,
    wireMaterials: sortedWireMaterials,
    cutList: sortedCutList,
    components: sortedComponents,
    exactInches: sortedWireMaterials.reduce((sum, item) => sum + item.exactInches, 0),
    purchaseInches: sortedWireMaterials.reduce((sum, item) => sum + item.purchaseInches, 0),
    componentQuantity: sortedComponents.reduce((sum, item) => sum + item.quantity, 0)
  };
}

function formatLength(inches) {
  const clean = Number(inches) || 0;
  return `${Number.isInteger(clean) ? clean : clean.toFixed(2)} in / ${(clean / 12).toFixed(2)} ft`;
}

function openBom() {
  dom.bomAllowance.value = state.bomAllowance;
  renderBom();
  dom.bomDialog.showModal();
}

function renderBom() {
  const bom = calculateBom();
  dom.bomAllowance.value = bom.allowance;
  dom.bomSummary.innerHTML = `
    ${summaryMetric("Active wires", activeRows().length)}
    ${summaryMetric("Exact wire", formatLength(bom.exactInches))}
    ${summaryMetric("Purchase wire", formatLength(bom.purchaseInches))}
    ${summaryMetric("Component pieces", bom.componentQuantity)}
  `;
  dom.wireMaterialRows.innerHTML = bom.wireMaterials.length
    ? bom.wireMaterials.map((item) => `<tr><td>${escapeHtml(item.awg)}</td><td>${escapeHtml(item.color)}</td><td>${item.wires}</td><td>${formatLength(item.exactInches)}</td><td>${formatLength(item.purchaseInches)}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty-workspace">No active wire material.</td></tr>`;
  dom.cutListRows.innerHTML = bom.cutList.length
    ? bom.cutList.map((item) => `<tr><td>${escapeHtml(item.awg)}</td><td>${escapeHtml(item.color)}</td><td>${formatLength(item.length)}</td><td>${item.quantity}</td><td>${formatLength(item.totalInches)}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty-workspace">No active wire cuts.</td></tr>`;
  dom.componentBomRows.innerHTML = bom.components.length
    ? bom.components.map((item) => `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.manufacturer || "-")}</td><td>${escapeHtml(item.partNumber || "-")}</td><td>${item.quantity}</td></tr>`).join("")
    : `<tr><td colspan="5" class="empty-workspace">No components calculated.</td></tr>`;
}

function exportBomCsv() {
  const bom = calculateBom();
  const lines = [
    ["WIRE MATERIAL"],
    ["AWG", "Color", "Wire count", "Exact inches", `Purchase inches (${bom.allowance}% allowance)`],
    ...bom.wireMaterials.map((item) => [item.awg, item.color, item.wires, item.exactInches.toFixed(2), item.purchaseInches.toFixed(2)]),
    [],
    ["WIRE CUT LIST"],
    ["AWG", "Color", "Cut length inches", "Quantity", "Total inches"],
    ...bom.cutList.map((item) => [item.awg, item.color, item.length.toFixed(2), item.quantity, item.totalInches.toFixed(2)]),
    [],
    ["COMPONENTS"],
    ["Type", "Item", "Manufacturer", "Part number", "Quantity"],
    ...bom.components.map((item) => [item.type, item.item, item.manufacturer, item.partNumber, item.quantity])
  ];
  const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
  downloadText(`${fileSafeName(state.harnessName)}-bom-cut-list.csv`, csv, "text/csv");
  showToast("BOM and cut list exported.");
}

function exportJson() {
  const fileName = `${fileSafeName(state.harnessName)}.json`;
  downloadText(fileName, JSON.stringify({ appVersion: APP_VERSION, ...state }, null, 2), "application/json");
  showToast("Project saved as JSON.");
}

function exportCsv() {
  const lines = [
    EXPORT_HEADERS,
    ...state.rows.map((row, index) => [
      index === 0 ? state.harnessName : "",
      row.leftLeg,
      legNameFor("left", row.leftLeg),
      row.name,
      row.leftPin,
      row.housing,
      row.leftHousingPart,
      row.leftTerminalPart,
      row.awg,
      row.color,
      row.length,
      branchLabel(row),
      "",
      row.rightLeg,
      legNameFor("right", row.rightLeg),
      row.rightPin,
      row.rightHousing,
      row.rightHousingPart,
      row.rightTerminalPart,
      row.toolUsed,
      row.comments
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
  pendingImportContext = importContextFromRows(rows);
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

  rememberUndo();
  const importLegNames = pendingImportContext.legNames || { left: {}, right: {} };
  const hasImportLegNames = Boolean(
    Object.keys(importLegNames.left || {}).length
    || Object.keys(importLegNames.right || {}).length
  );
  state = normalizeState({
    harnessName: pendingImportContext.harnessName || state.harnessName || "Imported Harness",
    selectedId: pendingImportRows[0].id,
    rows: pendingImportRows,
    catalog: state.catalog,
    bomAllowance: state.bomAllowance,
    tableColumnWidths: state.tableColumnWidths,
    previewPaneHeight: state.previewPaneHeight,
    legNames: hasImportLegNames ? importLegNames : state.legNames
  });
  saveState();
  if (dom.searchRows) {
    dom.searchRows.value = "";
  }
  if (dom.activeOnly) {
    dom.activeOnly.checked = false;
  }
  render();
  closeImageImport();
  showToast("Imported rows applied.");
}

function renderImportPreview(rows) {
  pendingImportRows = rows;
  dom.importPreviewCount.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} ready`;
  if (!rows.length) {
    dom.importPreviewRows.innerHTML = `<tr><td colspan="21">No rows ready.</td></tr>`;
    return;
  }

  dom.importPreviewRows.innerHTML = rows.slice(0, 80).map((row) => `
    <tr>
      <td>${escapeHtml(row.cableName)}</td>
      <td>${escapeHtml(row.leftLeg)}</td>
      <td>${escapeHtml(row.leftLegName)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.leftPin)}</td>
      <td>${escapeHtml(row.housing)}</td>
      <td>${escapeHtml(row.leftHousingPart)}</td>
      <td>${escapeHtml(row.leftTerminalPart)}</td>
      <td>${escapeHtml(row.awg)}</td>
      <td>${escapeHtml(row.color)}</td>
      <td>${escapeHtml(row.length)}</td>
      <td>${escapeHtml(branchLabel(row))}</td>
      <td></td>
      <td>${escapeHtml(row.rightLeg)}</td>
      <td>${escapeHtml(row.rightLegName)}</td>
      <td>${escapeHtml(row.rightPin)}</td>
      <td>${escapeHtml(row.rightHousing)}</td>
      <td>${escapeHtml(row.rightHousingPart)}</td>
      <td>${escapeHtml(row.rightTerminalPart)}</td>
      <td>${escapeHtml(row.toolUsed)}</td>
      <td>${escapeHtml(row.comments)}</td>
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

  const columnCenters = [
    0.028,
    0.086,
    0.146,
    0.197,
    0.239,
    0.284,
    0.343,
    0.394,
    0.44,
    0.481,
    0.528,
    0.567,
    0.595,
    0.624,
    0.667,
    0.716,
    0.769,
    0.822,
    0.884,
    0.952,
    0.987
  ];
  const text = lines.map((line) => {
    const cells = Array.from({ length: columnCenters.length }, () => []);
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
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim());
  let columnMap = null;

  lines.forEach((line) => {
    const cells = cellsFromImportLine(line);
    if (cells && looksLikeHeaderCells(cells)) {
      columnMap = importColumnMap(cells);
      return;
    }

    const row = parseImportLine(line, columnMap, cells);
    if (row && isUsefulRow(row)) {
      rows.push(row);
    }
  });

  return rows;
}

function parseImportLine(line, columnMap = null, knownCells = null) {
  if (isHeaderLine(line)) {
    return null;
  }

  const cells = knownCells || cellsFromImportLine(line);
  if (cells && cells.length > 5) {
    return rowFromCells(cells, columnMap);
  }

  return rowFromLooseLine(line);
}

function cellsFromImportLine(line) {
  if (line.includes("\t")) {
    return line.split("\t");
  }

  if (line.includes(",")) {
    const cells = parseCsvLine(line);
    if (cells.length > 5) {
      return cells;
    }
  }

  const cells = line.split(/\s{2,}/);
  return cells.length > 5 ? cells : null;
}

function rowFromCells(cells, columnMap = null) {
  const clean = cells.map((cell) => value(cell).trim());
  if (looksLikeHeaderCells(clean)) {
    return null;
  }

  if (columnMap) {
    return rowFromMappedCells(clean, columnMap);
  }

  if (looksLikeNamedLegShopRow(clean)) {
    const hasLeftDnp = isDnp(clean[5]) || looksLikeNamedLegDnpLayout(clean);
    const leftOffset = hasLeftDnp ? 1 : 0;
    const rightStart = clean[12 + leftOffset] === "" ? 13 + leftOffset : 12 + leftOffset;
    const hasRightDnp = hasLeftDnp || isDnp(clean[rightStart + 3]);
    const rightDnpOffset = hasRightDnp ? 1 : 0;
    const rightHousingFirst = !hasRightDnp && looksLikeHousingFirstRightSide(clean, rightStart);
    const row = {
      cableName: clean[0] || "",
      leftLeg: clean[1] || "",
      leftLegName: clean[2] || "",
      name: clean[3] || "",
      leftPin: clean[4] || "",
      dnp: hasLeftDnp ? isDnp(clean[5]) : false,
      housing: clean[5 + leftOffset] || "",
      leftHousingPart: clean[6 + leftOffset] || "",
      leftTerminalPart: clean[7 + leftOffset] || "",
      awg: clean[8 + leftOffset] || "",
      color: clean[9 + leftOffset] || "",
      length: clean[10 + leftOffset] || "",
      rightLeg: clean[rightStart] || "",
      rightLegName: clean[rightStart + 1] || "",
      rightPin: clean[rightStart + 2] || "",
      rightDnp: hasRightDnp ? isDnp(clean[rightStart + 3]) : false,
      rightHousing: rightHousingFirst ? clean[rightStart + 3] || "" : clean[rightStart + 5 + rightDnpOffset] || "",
      rightHousingPart: rightHousingFirst ? clean[rightStart + 4] || "" : clean[rightStart + 3 + rightDnpOffset] || "",
      rightTerminalPart: rightHousingFirst ? clean[rightStart + 5] || "" : clean[rightStart + 4 + rightDnpOffset] || "",
      toolUsed: clean[rightStart + 6 + rightDnpOffset] || "",
      comments: clean.slice(rightStart + 7 + rightDnpOffset).join(" ").trim()
    };
    applyBranchValue(row, clean[11 + leftOffset] || "");
    return row;
  }

  if (looksLikeShopRow(clean)) {
    const rightOffset = clean[11] === "" ? 12 : 11;
    const row = {
      name: clean[0] || "",
      leftLeg: clean[1] || "",
      leftPin: clean[2] || "",
      dnp: isDnp(clean[3]),
      housing: clean[4] || "",
      leftHousingPart: clean[5] || "",
      leftTerminalPart: clean[6] || "",
      awg: clean[7] || "",
      color: clean[8] || "",
      length: clean[9] || "",
      rightLeg: clean[rightOffset] || "",
      rightPin: clean[rightOffset + 1] || "",
      rightDnp: isDnp(clean[rightOffset + 2]),
      rightHousingPart: clean[rightOffset + 3] || "",
      rightTerminalPart: clean[rightOffset + 4] || "",
      rightHousing: clean[rightOffset + 5] || "",
      toolUsed: clean[rightOffset + 6] || "",
      comments: clean.slice(rightOffset + 7).join(" ").trim()
    };
    applyBranchValue(row, clean[10] || "");
    return row;
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

function rowFromMappedCells(cells, map) {
  const row = {
    cableName: mappedCell(cells, map, "cableName"),
    name: mappedCell(cells, map, "name"),
    leftLeg: mappedCell(cells, map, "leftLeg"),
    leftLegName: mappedCell(cells, map, "leftLegName"),
    leftPin: mappedCell(cells, map, "leftPin"),
    dnp: isDnp(mappedCell(cells, map, "dnp")),
    housing: mappedCell(cells, map, "housing"),
    leftHousingPart: mappedCell(cells, map, "leftHousingPart"),
    leftTerminalPart: mappedCell(cells, map, "leftTerminalPart"),
    awg: mappedCell(cells, map, "awg"),
    color: mappedCell(cells, map, "color"),
    length: mappedCell(cells, map, "length"),
    rightLeg: mappedCell(cells, map, "rightLeg"),
    rightLegName: mappedCell(cells, map, "rightLegName"),
    rightPin: mappedCell(cells, map, "rightPin"),
    rightDnp: isDnp(mappedCell(cells, map, "rightDnp")),
    rightHousingPart: mappedCell(cells, map, "rightHousingPart"),
    rightTerminalPart: mappedCell(cells, map, "rightTerminalPart"),
    rightHousing: mappedCell(cells, map, "rightHousing"),
    toolUsed: mappedCell(cells, map, "toolUsed"),
    comments: mappedCell(cells, map, "comments")
  };
  applyBranchValue(row, mappedCell(cells, map, "branch") || "");
  return row;
}

function mappedCell(cells, map, key) {
  const index = map[key];
  return Number.isInteger(index) ? cells[index] || "" : "";
}

function looksLikeHeaderCells(cells) {
  const mapped = importColumnMap(cells);
  return ["name", "leftLeg", "leftPin", "housing", "leftHousingPart", "rightLeg", "rightHousing"].filter((key) => Number.isInteger(mapped[key])).length >= 5;
}

function importColumnMap(cells) {
  const map = {};
  let side = "left";
  cells.forEach((cell, index) => {
    const key = headerKey(cell);
    if (!key) {
      return;
    }

    if (key === "rightLeg") {
      map.rightLeg = index;
      side = "right";
      return;
    }

    if (key === "leftLegName" || key === "rightLegName") {
      map[key] = index;
      return;
    }

    if (key === "cableName" || key === "name" || key === "branch" || key === "toolUsed" || key === "comments" || key === "awg" || key === "color" || key === "length") {
      map[key] = index;
      return;
    }

    if (side === "right") {
      if (key === "pinPos") {
        map.rightPin = index;
      } else if (key === "dnp") {
        map.rightDnp = index;
      } else if (key === "housingPart") {
        map.rightHousingPart = index;
      } else if (key === "terminalPart") {
        map.rightTerminalPart = index;
      } else if (key === "housing") {
        map.rightHousing = index;
      }
      return;
    }

    if (key === "leftLeg") {
      map.leftLeg = index;
    } else if (key === "pinPos") {
      map.leftPin = index;
    } else if (key === "dnp") {
      map.dnp = index;
    } else if (key === "housing") {
      map.housing = index;
    } else if (key === "housingPart") {
      map.leftHousingPart = index;
    } else if (key === "terminalPart") {
      map.leftTerminalPart = index;
    }
  });
  return map;
}

function headerKey(input) {
  const text = cleanCell(input).toLowerCase().replace(/[#]/g, "number").replace(/[^a-z0-9]+/g, " ").trim();
  if (!text) {
    return "";
  }
  if (text === "cable name" || text === "cabel name" || text === "harness name") {
    return "cableName";
  }
  if (text === "left leg name" || text === "left connector name") {
    return "leftLegName";
  }
  if (text === "right leg name" || text === "right connector name") {
    return "rightLegName";
  }
  if (text === "name" || text === "wire name") {
    return "name";
  }
  if (text === "left leg" || text === "left") {
    return "leftLeg";
  }
  if (text === "right leg" || text === "right") {
    return "rightLeg";
  }
  if (text.includes("pin pos")) {
    return "pinPos";
  }
  if (text.includes("do not place") || text === "dnp") {
    return "dnp";
  }
  if (text.includes("housing part")) {
    return "housingPart";
  }
  if (text === "pin number" || text === "pin no" || text === "pin pnumber" || text === "pin p number" || text === "pin p" || text === "pin") {
    return "terminalPart";
  }
  if (text.includes("housing type") || text === "housing") {
    return "housing";
  }
  if (text.includes("awg")) {
    return "awg";
  }
  if (text === "color" || text === "colour") {
    return "color";
  }
  if (text.includes("length")) {
    return "length";
  }
  if (text === "branch" || text.includes("splice")) {
    return "branch";
  }
  if (text.includes("tool used") || text === "tool") {
    return "toolUsed";
  }
  if (text.includes("comment")) {
    return "comments";
  }
  return "";
}

function looksLikeShopRow(clean) {
  if (clean.length < 15) {
    return false;
  }

  const headerText = clean.join(" ").toLowerCase();
  if (headerText.includes("pin pos") || headerText.includes("tool used")) {
    return true;
  }

  const secondIsLeg = Boolean(clean[1] && /^[A-Za-z0-9#-]+$/.test(clean[1]));
  const thirdIsPinPosition = /^\d{1,2}$/.test(clean[2] || "");
  const hasBranchColumn = clean[10] !== undefined;
  return secondIsLeg && thirdIsPinPosition && hasBranchColumn;
}

function looksLikeNamedLegShopRow(clean) {
  if (clean.length < 19) {
    return false;
  }

  const secondIsLeg = Boolean(clean[1] && /^[A-Za-z0-9#-]+$/.test(clean[1]));
  const fifthIsPinPosition = /^\d{1,2}$/.test(clean[4] || "");
  const hasLeftDnp = isDnp(clean[5]) || looksLikeNamedLegDnpLayout(clean);
  const dividerIndex = hasLeftDnp ? 13 : 12;
  const rightLegIndex = clean[dividerIndex] === "" ? dividerIndex + 1 : dividerIndex;
  const rightLegLooksValid = Boolean(clean[rightLegIndex] && /^[A-Za-z0-9#-]+$/.test(clean[rightLegIndex]));
  const rightPinLooksValid = /^\d{1,2}$/.test(clean[rightLegIndex + 2] || "");
  return secondIsLeg && fifthIsPinPosition && rightLegLooksValid && rightPinLooksValid;
}

function looksLikeNamedLegDnpLayout(clean) {
  return Boolean(
    clean[13] === ""
    && clean[14]
    && /^[A-Za-z0-9#-]+$/.test(clean[14])
    && /^\d{1,2}$/.test(clean[16] || "")
  );
}

function looksLikeHousingFirstRightSide(clean, rightStart) {
  const rightHousing = clean[rightStart + 3] || "";
  const rightHousingPart = clean[rightStart + 4] || "";
  const rightTerminalPart = clean[rightStart + 5] || "";
  return Boolean(
    rightHousing
    && (
      matchHousing(rightHousing)
      || /[A-Za-z]/.test(rightHousing)
      || (!isPartNumberToken(rightHousing) && isPartNumberToken(rightHousingPart) && isPartNumberToken(rightTerminalPart))
    )
  );
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
  const housings = housingChoices()
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

function importContextFromRows(rows) {
  return rows.reduce((context, row) => {
    const cableName = cleanCell(row?.cableName || row?.harnessName);
    if (!context.harnessName && cableName) {
      context.harnessName = cableName;
    }

    addImportedLegName(context.legNames.left, row?.leftLeg, row?.leftLegName);
    addImportedLegName(context.legNames.right, row?.rightLeg, row?.rightLegName);
    return context;
  }, { harnessName: "", legNames: { left: {}, right: {} } });
}

function addImportedLegName(names, input, explicitName = "") {
  const key = legKey(input);
  const name = cleanLegName(explicitName);
  if (key && name && !names[key]) {
    names[key] = name;
    return;
  }

  const leg = splitLabeledLeg(input);
  if (leg.key && leg.name && !names[leg.key]) {
    names[leg.key] = leg.name;
  }
}

function splitLabeledLeg(input) {
  const text = cleanCell(input);
  if (!text) {
    return { key: "", name: "" };
  }

  const match = text.match(/^([A-Za-z0-9#-]+)\s+(.+)$/);
  if (!match) {
    return { key: text, name: "" };
  }

  const key = legKey(match[1]);
  if (!isLabelableLegKey(key)) {
    return { key: text, name: "" };
  }

  return {
    key,
    name: cleanLegName(match[2])
  };
}

function isLabelableLegKey(key) {
  const text = value(key).toUpperCase();
  return Boolean(
    text
    && (
      /^\d+$/.test(text)
      || /^[A-Z]*\d+[A-Z#-]*$/.test(text)
      || options.legs.some((leg) => leg && leg.toUpperCase() === text)
    )
  );
}

function cleanImportedRow(row) {
  const prepared = { ...row };
  if (prepared.branch && !prepared.spliceId && !prepared.spliceRole) {
    applyBranchValue(prepared, prepared.branch);
  }
  repairImportedPartFields(prepared);

  const cleanHousing = matchHousing(prepared.housing) || cleanCell(prepared.housing).toUpperCase();
  const cleanRightHousing = matchHousing(prepared.rightHousing) || cleanCell(prepared.rightHousing).toUpperCase();
  const leftLeg = splitLabeledLeg(prepared.leftLeg);
  const rightLeg = splitLabeledLeg(prepared.rightLeg);
  const leftLegName = cleanLegName(prepared.leftLegName) || leftLeg.name;
  const rightLegName = cleanLegName(prepared.rightLegName) || rightLeg.name;

  return {
    id: prepared.id || makeId(),
    cableName: cleanCell(prepared.cableName || prepared.harnessName),
    leftLeg: leftLeg.key,
    leftLegName,
    name: cleanCell(prepared.name),
    leftPin: cleanCell(prepared.leftPin),
    dnp: isDnp(prepared.dnp),
    housing: cleanHousing,
    leftHousingPart: cleanCell(prepared.leftHousingPart || prepared.housingPart),
    leftTerminalPart: cleanCell(prepared.leftTerminalPart || prepared.pinPart || prepared.terminalPart),
    awg: cleanGauge(prepared.awg),
    color: matchColor(prepared.color) || cleanCell(prepared.color).toUpperCase(),
    length: cleanLength(prepared.length),
    spliceId: cleanCell(prepared.spliceId).toUpperCase(),
    spliceRole: normalizedSpliceRole(prepared),
    rightLeg: rightLeg.key,
    rightLegName,
    rightPin: cleanCell(prepared.rightPin),
    rightDnp: prepared.rightDnp === undefined ? isDnp(prepared.dnp) : isDnp(prepared.rightDnp),
    rightHousingPart: cleanCell(prepared.rightHousingPart),
    rightTerminalPart: cleanCell(prepared.rightTerminalPart || prepared.rightPinPart || prepared.rightTerminal),
    rightHousing: cleanRightHousing,
    toolUsed: cleanCell(prepared.toolUsed),
    comments: cleanCell(prepared.comments)
  };
}

function repairImportedPartFields(row) {
  repairImportedSideParts(row, "housing", "leftHousingPart", "leftTerminalPart");
  repairImportedSideParts(row, "rightHousing", "rightHousingPart", "rightTerminalPart");
  splitMergedPartCell(row, "leftHousingPart", "leftTerminalPart");
  splitMergedPartCell(row, "rightHousingPart", "rightTerminalPart");
}

function repairImportedSideParts(row, housingField, housingPartField, terminalPartField) {
  const split = splitTrailingPartNumbers(row[housingField]);
  if (!split.parts.length) {
    return;
  }

  row[housingField] = split.text;
  if (!cleanCell(row[housingPartField]) && split.parts[0]) {
    row[housingPartField] = split.parts[0];
  }
  if (!cleanCell(row[terminalPartField]) && split.parts[1]) {
    row[terminalPartField] = split.parts[1];
  }
}

function splitMergedPartCell(row, housingPartField, terminalPartField) {
  const tokens = cleanCell(row[housingPartField]).split(/\s+/).filter(Boolean);
  const partTokens = tokens.filter(isPartNumberToken);
  if (partTokens.length < 2) {
    return;
  }

  row[housingPartField] = partTokens[0];
  if (!cleanCell(row[terminalPartField])) {
    row[terminalPartField] = partTokens[1];
  }
}

function splitTrailingPartNumbers(input) {
  const tokens = cleanCell(input).split(/\s+/).filter(Boolean);
  const parts = [];
  while (tokens.length && isPartNumberToken(tokens[tokens.length - 1])) {
    parts.unshift(tokens.pop());
  }
  return {
    text: tokens.join(" "),
    parts
  };
}

function isPartNumberToken(input) {
  const token = cleanCell(input).replace(/[,:;]+$/g, "").toUpperCase();
  return /^(?=.*\d)[A-Z0-9-]{6,}$/.test(token);
}

function isUsefulRow(row) {
  return Boolean(
    row.leftLeg ||
    row.leftPin ||
    row.name ||
    row.housing ||
    row.leftHousingPart ||
    row.leftTerminalPart ||
    row.spliceId ||
    row.spliceRole ||
    row.rightLeg ||
    row.rightPin ||
    row.rightHousing ||
    row.rightHousingPart ||
    row.rightTerminalPart ||
    row.toolUsed ||
    row.comments
  );
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
  const cleaned = cleanCell(input);
  if (/\b(in|inch|inches)\b/i.test(cleaned)) {
    return cleaned;
  }

  const match = value(input).match(/\d+(?:\.\d+)?/);
  return match ? match[0] : cleaned;
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
  const choices = housingChoices();
  const exact = choices.find((choice) => choice && choice.toUpperCase() === housing);
  if (exact) {
    return exact;
  }

  const loose = looseHousingKey(housing);
  const looseExact = choices.find((choice) => choice && looseHousingKey(choice) === loose);
  if (looseExact) {
    return looseExact;
  }

  return choices.find((choice) => {
    if (!choice || loose.length < 8) {
      return false;
    }
    const candidate = looseHousingKey(choice);
    return candidate.startsWith(loose) || loose.startsWith(candidate);
  }) || "";
}

function looseHousingKey(input) {
  return cleanCell(input)
    .toUpperCase()
    .replace(/\bLOCK\b/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
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
  const issues = validateHarness();
  const bom = calculateBom();
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
  <h2>Electrical Check Report</h2>
  <div class="meta">${issues.filter((issue) => issue.severity === "error").length} error(s), ${issues.filter((issue) => issue.severity === "warning").length} warning(s)</div>
  <table>
    <thead><tr><th>Severity</th><th>Row</th><th>Issue</th></tr></thead>
    <tbody>
      ${issues.length ? issues.map((issue) => `
        <tr><td>${escapeHtml(issue.severity)}</td><td>${state.rows.findIndex((row) => row.id === issue.rowId) + 1 || "-"}</td><td>${escapeHtml(issue.message)}</td></tr>
      `).join("") : `<tr><td colspan="3">No electrical issues found.</td></tr>`}
    </tbody>
  </table>
  <h2>Wire Instructions</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Wire Name</th><th>Left Leg</th><th>Left Leg Name</th><th>Pin Pos #</th><th>Housing Type</th><th>Housing Part #</th><th>Pin P#</th><th>AWGuage</th><th>Color</th><th>Length inches</th><th>Branch</th><th>Right Leg</th><th>Right Leg Name</th><th>Pin Pos #</th><th>Housing Type</th><th>Housing Part #</th><th>Pin P#</th><th>Tool used</th><th>Comments</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.leftLeg)}</td>
          <td>${escapeHtml(legNameFor("left", row.leftLeg))}</td>
          <td>${escapeHtml(row.leftPin)}</td>
          <td>${escapeHtml(row.housing)}</td>
          <td>${escapeHtml(row.leftHousingPart)}</td>
          <td>${escapeHtml(row.leftTerminalPart)}</td>
          <td>${escapeHtml(row.awg)}</td>
          <td>${escapeHtml(row.color)}</td>
          <td>${escapeHtml(row.length)}</td>
          <td>${escapeHtml(branchLabel(row))}</td>
          <td>${escapeHtml(row.rightLeg)}</td>
          <td>${escapeHtml(legNameFor("right", row.rightLeg))}</td>
          <td>${escapeHtml(row.rightPin)}</td>
          <td>${escapeHtml(row.rightHousing)}</td>
          <td>${escapeHtml(row.rightHousingPart)}</td>
          <td>${escapeHtml(row.rightTerminalPart)}</td>
          <td>${escapeHtml(row.toolUsed)}</td>
          <td>${escapeHtml(row.comments)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
  <h2>Wire Cut List</h2>
  <table>
    <thead><tr><th>AWG</th><th>Color</th><th>Cut Length</th><th>Quantity</th><th>Total</th></tr></thead>
    <tbody>
      ${bom.cutList.map((item) => `<tr><td>${escapeHtml(item.awg)}</td><td>${escapeHtml(item.color)}</td><td>${formatLength(item.length)}</td><td>${item.quantity}</td><td>${formatLength(item.totalInches)}</td></tr>`).join("")}
    </tbody>
  </table>
  <h2>Bill of Materials</h2>
  <div class="meta">Wire purchasing totals include ${bom.allowance}% allowance.</div>
  <table>
    <thead><tr><th>Type</th><th>Item</th><th>Manufacturer</th><th>Part #</th><th>Quantity</th></tr></thead>
    <tbody>
      ${bom.components.map((item) => `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.manufacturer)}</td><td>${escapeHtml(item.partNumber)}</td><td>${item.quantity}</td></tr>`).join("")}
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
      rememberUndo();
      state = normalizeState(parsed);
      saveState();
      if (dom.searchRows) {
        dom.searchRows.value = "";
      }
      if (dom.activeOnly) {
        dom.activeOnly.checked = false;
      }
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
  rememberUndo();
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

dom.searchRows?.addEventListener("input", renderTable);
dom.activeOnly?.addEventListener("change", renderTable);
dom.leftLegNames.addEventListener("change", () => updateLegNames("left", dom.leftLegNames.value));
dom.rightLegNames.addEventListener("change", () => updateLegNames("right", dom.rightLegNames.value));
dom.undoButton.addEventListener("click", undoLastChange);
dom.addRow.addEventListener("click", addRow);
dom.duplicateRow.addEventListener("click", duplicateRow);
dom.deleteRow.addEventListener("click", deleteSelectedRow);
dom.resetSample.addEventListener("click", resetSample);
dom.qualityButton.addEventListener("click", () => {
  renderQualityDialog();
  dom.qualityDialog.showModal();
});
dom.closeQualityDialog.addEventListener("click", () => dom.qualityDialog.close());
dom.qualityIssues.addEventListener("click", (event) => {
  const issue = event.target.closest("[data-row-id]");
  if (issue) {
    dom.qualityDialog.close();
    focusIssueRow(issue.dataset.rowId);
  }
});
dom.catalogButton.addEventListener("click", openCatalog);
dom.closeCatalogDialog.addEventListener("click", () => dom.catalogDialog.close());
dom.newCatalogItem.addEventListener("click", clearCatalogForm);
dom.resetCatalog.addEventListener("click", resetCatalogDefaults);
dom.catalogSearch.addEventListener("input", renderCatalog);
dom.catalogRows.addEventListener("click", (event) => {
  const row = event.target.closest("[data-catalog-id]");
  if (!row) {
    return;
  }
  selectedCatalogId = row.dataset.catalogId;
  renderCatalog();
});
dom.catalogForm.addEventListener("submit", saveCatalogItem);
dom.deleteCatalogItem.addEventListener("click", deleteCatalogItem);
dom.catalogImageUrl.addEventListener("input", () => renderCatalogImage(dom.catalogImageUrl.value));
dom.catalogImageUploadButton.addEventListener("click", () => dom.catalogImageUpload.click());
dom.catalogImageUpload.addEventListener("change", async () => {
  const [file] = dom.catalogImageUpload.files;
  if (!file) {
    return;
  }
  try {
    const imageData = await compactCatalogImage(file);
    dom.catalogImageUrl.value = imageData;
    renderCatalogImage(imageData);
    showToast("Connector image added to the catalog form.");
  } catch (error) {
    showToast("That connector image could not be loaded.");
  }
  dom.catalogImageUpload.value = "";
});
dom.bomButton.addEventListener("click", openBom);
dom.closeBomDialog.addEventListener("click", () => dom.bomDialog.close());
dom.bomAllowance.addEventListener("change", () => {
  rememberUndo();
  state.bomAllowance = Math.max(0, Math.min(100, Number(dom.bomAllowance.value) || 0));
  saveState();
  renderBom();
});
dom.exportBom.addEventListener("click", exportBomCsv);
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

setupColumnResizers();
setupLayoutSplitter();
render();
