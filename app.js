"use strict";

const APP_VERSION = "1.2.93";
const DRAWIO_EMBED_ORIGIN = "https://embed.diagrams.net";
const STORAGE_KEY = "wiring-harness-designer-state-v1";
const subconPinCounts = [2, 4, 6, 8, 10, 12, 14, 16];
const BLANK_ROW_COUNT = 24;
const WIRE_LANE_GAP = 40;
const WIRE_EXIT_GAP = 18;
const WIRE_BUS_GAP = 22;
const WIRE_ROUTE_DRAG_LIMIT_X = 480;
const WIRE_ROUTE_DRAG_LIMIT_Y = 280;
const WIRE_BEND_HANDLE_SIZE = 12;
const MAX_WIRE_ROUTE_BENDS = 10;
const MIN_COLUMN_WIDTH = 42;
const MAX_COLUMN_WIDTH = 620;
const UNDO_LIMIT = 50;
const MIN_PREVIEW_PANE_WIDTH = 420;
const MIN_EDITOR_PANE_WIDTH = 420;
const WORKSPACE_HORIZONTAL_PADDING = 36;
const LAYOUT_SPLITTER_WIDTH = 16;
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

const colorAliases = {
  BK: "BLACK",
  BLK: "BLACK",
  WH: "WHITE",
  WHT: "WHITE",
  GN: "GREEN",
  GRN: "GREEN",
  BU: "BLUE",
  BLU: "BLUE",
  YE: "YELLOW",
  YEL: "YELLOW",
  YLW: "YELLOW",
  OG: "ORANGE",
  ORG: "ORANGE",
  BN: "BROWN",
  BRN: "BROWN",
  GY: "GRAY",
  GRY: "GRAY",
  GREY: "GRAY",
  VT: "VIOLET",
  VIO: "VIOLET",
  PUR: "VIOLET",
  PU: "VIOLET",
  RD: "RED"
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

const RJ45_PINOUTS = {
  T568B: [
    { pin: 1, label: "WHT / ORG", fill: "#fff4dc", accent: "#f09a33" },
    { pin: 2, label: "ORG", fill: "#f9b25b", accent: "#f09a33" },
    { pin: 3, label: "WHT / GRN", fill: "#e8f5e4", accent: "#39a85f" },
    { pin: 4, label: "BLU", fill: "#84a8e8", accent: "#4e79d4" },
    { pin: 5, label: "WHT / BLU", fill: "#eef2ff", accent: "#4e79d4" },
    { pin: 6, label: "GRN", fill: "#74c88a", accent: "#39a85f" },
    { pin: 7, label: "WHT / BRN", fill: "#efe1d3", accent: "#8f6341" },
    { pin: 8, label: "BRN", fill: "#b07a52", accent: "#8f6341" }
  ],
  T568A: [
    { pin: 1, label: "WHT / GRN", fill: "#e8f5e4", accent: "#39a85f" },
    { pin: 2, label: "GRN", fill: "#74c88a", accent: "#39a85f" },
    { pin: 3, label: "WHT / ORG", fill: "#fff4dc", accent: "#f09a33" },
    { pin: 4, label: "BLU", fill: "#84a8e8", accent: "#4e79d4" },
    { pin: 5, label: "WHT / BLU", fill: "#eef2ff", accent: "#4e79d4" },
    { pin: 6, label: "ORG", fill: "#f9b25b", accent: "#f09a33" },
    { pin: 7, label: "WHT / BRN", fill: "#efe1d3", accent: "#8f6341" },
    { pin: 8, label: "BRN", fill: "#b07a52", accent: "#8f6341" }
  ]
};

function buildRJ45PinoutImage(title, scheme) {
  const rows = RJ45_PINOUTS[scheme] || RJ45_PINOUTS.T568B;
  const contactMarks = rows.map((item, index) => {
    const x = 40 + index * 28;
    return `
      <g>
        <text x="${x + 10}" y="114" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" fill="#dce4de">${item.pin}</text>
        <rect x="${x}" y="122" width="20" height="12" rx="3" fill="${item.accent}" stroke="#f4e5b0" stroke-width="1.5" />
      </g>
    `;
  }).join("");

  const rowsList = rows.map((item, index) => `
    <g transform="translate(0 ${index * 34})">
      <rect x="0" y="0" width="360" height="28" rx="8" fill="#f8fbf7" stroke="#d8e1d6" stroke-width="1.4" />
      <rect x="11" y="7" width="58" height="14" rx="7" fill="${item.fill}" stroke="${item.accent}" stroke-width="2" />
      <text x="86" y="19" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="850" fill="#1f2621">Pin ${item.pin}</text>
      <text x="155" y="19" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="#52605a">${item.label}</text>
    </g>
  `).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420" role="img" aria-label="${title} ${scheme} pinout">
      <rect width="900" height="420" rx="28" fill="#eef4ef" />
      <text x="54" y="58" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" fill="#1f2722">${title}</text>
      <text x="54" y="88" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#5d6a64">CAT 6 / 8P8C / ${scheme}</text>
      <g transform="translate(54 116)">
        <rect x="0" y="0" width="286" height="186" rx="18" fill="#223129" stroke="#718078" stroke-width="4" />
        <path d="M 116 0 H 170 L 184 22 H 102 Z" fill="#dbe0db" stroke="#8f9891" stroke-width="4" />
        <rect x="22" y="26" width="242" height="104" rx="10" fill="#101712" stroke="#4f5d55" stroke-width="3" />
        <rect x="40" y="48" width="206" height="36" rx="8" fill="#151e19" stroke="#060807" stroke-width="2" />
        ${contactMarks}
        <text x="143" y="162" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="850" fill="#dfe7e1">CONTACT FACE</text>
      </g>
      <g transform="translate(394 116)">
        ${rowsList}
      </g>
      <text x="54" y="382" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="750" fill="#4d5a54">Use the same scheme on both ends for straight-through patch cords.</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const RJ45_PLUG_IMAGE = buildRJ45PinoutImage("RJ45 PLUG", "T568B");
const RJ45_JACK_IMAGE = buildRJ45PinoutImage("RJ45 JACK", "T568B");

function buildMiniFitPinoutImage(title, circuitCount, rowMode = "dual") {
  const pinCount = Math.max(1, Math.min(24, numberOrDefault(circuitCount, 1)));
  const dualRow = rowMode !== "single" && pinCount > 1;
  const bottomCount = dualRow ? Math.ceil(pinCount / 2) : pinCount;
  const topCount = dualRow ? pinCount - bottomCount : 0;
  const columns = dualRow ? Math.max(bottomCount, topCount || 1) : pinCount;
  const slotW = 34;
  const slotH = 28;
  const gapX = 8;
  const bodyWidth = columns * slotW + Math.max(0, columns - 1) * gapX + 44;
  const bodyHeight = dualRow ? 132 : 102;
  const bodyX = Math.round((900 - bodyWidth) / 2);
  const bodyY = 118;
  const topY = bodyY + 28;
  const bottomY = dualRow ? bodyY + 68 : bodyY + 40;
  const pinRows = dualRow
    ? [
        Array.from({ length: topCount }, (_, index) => pinCount - index),
        Array.from({ length: bottomCount }, (_, index) => bottomCount - index)
      ]
    : [Array.from({ length: pinCount }, (_, index) => pinCount - index)];
  const rowYs = dualRow ? [topY, bottomY] : [bottomY];

  const slots = pinRows.map((pins, rowIndex) => pins.map((pin, colIndex) => {
    const x = bodyX + 22 + colIndex * (slotW + gapX);
    const y = rowYs[rowIndex];
    return `
      <path d="M ${x} ${y}
        H ${x + slotW}
        V ${y + slotH - 4}
        L ${x + slotW / 2} ${y + slotH}
        L ${x} ${y + slotH - 4}
        Z" fill="#f8faf5" stroke="#8f9891" stroke-width="1.7" />
      <text x="${x + slotW / 2}" y="${y + 19}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="900" fill="#1f2722">${pin}</text>
    `;
  }).join("")).join("");

  const note = dualRow
    ? "Pin 1 is bottom-right; numbering proceeds right-to-left on each row."
    : "Pin 1 is rightmost; numbering proceeds right-to-left.";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420" role="img" aria-label="${title} ${pinCount} circuit pinout">
      <rect width="900" height="420" rx="28" fill="#eef4ef" />
      <text x="54" y="56" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" fill="#1f2722">${title}</text>
      <text x="54" y="86" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#5d6a64">${dualRow ? "DUAL ROW" : "SINGLE ROW"} / ${pinCount} CIRCUITS / 4.20 MM PITCH</text>
      <g>
        <path d="M ${bodyX + 10} ${bodyY + 6} H ${bodyX + bodyWidth - 10} L ${bodyX + bodyWidth} ${bodyY + 18} V ${bodyY + bodyHeight - 12} L ${bodyX + bodyWidth - 10} ${bodyY + bodyHeight} H ${bodyX + 10} L ${bodyX} ${bodyY + bodyHeight - 12} V ${bodyY + 18} Z" fill="#d8d7cb" stroke="#7f857c" stroke-width="3" />
        <rect x="${bodyX + 12}" y="${bodyY + 18}" width="${bodyWidth - 24}" height="${bodyHeight - 28}" rx="6" fill="#b9bbb0" stroke="#f2f4ee" stroke-width="2" />
        <path d="M ${bodyX + bodyWidth / 2 - 24} ${bodyY + 4} L ${bodyX + bodyWidth / 2 - 14} ${bodyY - 10} H ${bodyX + bodyWidth / 2 + 14} L ${bodyX + bodyWidth / 2 + 24} ${bodyY + 4}" fill="#e5e4dc" stroke="#8d9590" stroke-width="2" />
        ${slots}
      </g>
      <text x="450" y="388" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="750" fill="#4d5a54">${note}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const MINI_FIT_PINOUT_IMAGE = buildMiniFitPinoutImage("MINI-FIT JR", 20, "dual");

function buildMolexMicroFitPinoutImage(title, circuitCount, rowMode = "single", lockStyle = "front") {
  const pinCount = Math.max(1, Math.min(20, numberOrDefault(circuitCount, 2)));
  const dualRow = rowMode === "dual" && pinCount > 1;
  const rows = dualRow ? 2 : 1;
  const columns = dualRow ? Math.ceil(pinCount / 2) : pinCount;
  const pitch = 38;
  const slotW = 28;
  const slotH = 24;
  const bodyWidth = columns * slotW + Math.max(0, columns - 1) * (pitch - slotW) + 60;
  const bodyHeight = dualRow ? 132 : 96;
  const bodyX = Math.round((900 - bodyWidth) / 2);
  const bodyY = 124;
  const topY = dualRow ? bodyY + 34 : bodyY + 46;
  const bottomY = dualRow ? bodyY + 72 : topY;
  const pinRows = Array.from({ length: rows }, (_, rowIndex) => {
    return Array.from({ length: columns }, (_, columnIndex) => {
      const pin = dualRow ? columnIndex * 2 + rowIndex + 1 : columnIndex + 1;
      return pin <= pinCount ? pin : 0;
    }).filter(Boolean);
  });

  const slots = pinRows.map((pins, rowIndex) => pins.map((pin, colIndex) => {
    const x = bodyX + 30 + colIndex * pitch;
    const y = rowIndex === 0 ? topY : bottomY;
    return `
      <rect x="${x}" y="${y}" width="${slotW}" height="${slotH}" rx="5" fill="#0c1110" stroke="#e6ede8" stroke-width="2" />
      <text x="${x + slotW / 2}" y="${y + slotH + 17}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="900" fill="#dce4de">${pin}</text>
    `;
  }).join("")).join("");

  const legend = dualRow
    ? "Dual-row side-lock layout: odd pins top, even pins bottom."
    : "Single-row front-lock layout: pin 1 at the left.";
  const lockLabel = lockStyle === "side" ? "SIDE LOCK / 43025 FAMILY" : "FRONT LOCK / 43645 FAMILY";
  const lockMarkup = lockStyle === "side"
    ? `<path d="M ${bodyX + bodyWidth - 10} ${bodyY + 32} H ${bodyX + bodyWidth + 24} V ${bodyY + bodyHeight - 24} H ${bodyX + bodyWidth - 10} Z" fill="#121817" stroke="#7f8983" stroke-width="3" />`
    : `<path d="M ${bodyX + bodyWidth / 2 - 48} ${bodyY + 3} L ${bodyX + bodyWidth / 2 - 34} ${bodyY - 18} H ${bodyX + bodyWidth / 2 + 34} L ${bodyX + bodyWidth / 2 + 48} ${bodyY + 3} Z" fill="#121817" stroke="#7f8983" stroke-width="3" />`;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420" role="img" aria-label="${title} pinout">
      <rect width="900" height="420" rx="28" fill="#eef4ef" />
      <text x="54" y="58" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" fill="#1f2722">${title}</text>
      <text x="54" y="88" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#5d6a64">MOLEX MICRO-FIT 3.0 / ${lockLabel}</text>
      <g>
        ${lockMarkup}
        <path d="M ${bodyX + 12} ${bodyY + 6} H ${bodyX + bodyWidth - 12} L ${bodyX + bodyWidth} ${bodyY + 20} V ${bodyY + bodyHeight - 12} L ${bodyX + bodyWidth - 12} ${bodyY + bodyHeight} H ${bodyX + 12} L ${bodyX} ${bodyY + bodyHeight - 12} V ${bodyY + 20} Z" fill="#171d1b" stroke="#8b948e" stroke-width="4" />
        <rect x="${bodyX + 18}" y="${bodyY + 22}" width="${bodyWidth - 36}" height="${bodyHeight - 38}" rx="8" fill="#070908" stroke="#3d4641" stroke-width="3" />
        ${slots}
      </g>
      <text x="450" y="374" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" fill="#4d5a54">${legend}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const MOLEX_MICRO_FIT_FRONT_IMAGE = buildMolexMicroFitPinoutImage("MOLEX MICRO-FIT FRONT LOCK", 20, "single", "front");
const MOLEX_MICRO_FIT_SIDE_IMAGE = buildMolexMicroFitPinoutImage("MOLEX MICRO-FIT SIDE LOCK", 20, "dual", "side");

const CPC_CONTACT_LAYOUT = [
  { pin: 2, dx: -16, dy: -38 },
  { pin: 1, dx: 16, dy: -38 },
  { pin: 6, dx: -36, dy: -18 },
  { pin: 5, dx: -12, dy: -18 },
  { pin: 4, dx: 12, dy: -18 },
  { pin: 3, dx: 36, dy: -18 },
  { pin: 10, dx: -36, dy: 2 },
  { pin: 9, dx: -12, dy: 2 },
  { pin: 8, dx: 12, dy: 2 },
  { pin: 7, dx: 36, dy: 2 },
  { pin: 14, dx: -36, dy: 22 },
  { pin: 13, dx: -12, dy: 22 },
  { pin: 12, dx: 12, dy: 22 },
  { pin: 11, dx: 36, dy: 22 },
  { pin: 16, dx: -16, dy: 42 },
  { pin: 15, dx: 16, dy: 42 }
];

const CPC_CONTACT_LOOKUP = new Map(CPC_CONTACT_LAYOUT.map((item) => [item.pin, item]));

function buildCpcPinoutImage(title, variant) {
  const isFemale = variant === "female";
  const shellLabel = isFemale ? "PLUG / SOCKET" : "RECEPTACLE / PIN";
  const faceFill = isFemale ? "#131b17" : "#171f1b";
  const faceStroke = isFemale ? "#6ac49d" : "#7f8d85";
  const contactFill = isFemale ? "#0b0f0d" : "#d8dfda";
  const contactStroke = isFemale ? "#7bd0aa" : "#909c95";
  const contactInner = isFemale ? "#2f8f6d" : "#2d3933";
  const rowBlocks = [
    { pins: [2, 1], y: 52 },
    { pins: [6, 5, 4, 3], y: 72 },
    { pins: [10, 9, 8, 7], y: 92 },
    { pins: [14, 13, 12, 11], y: 112 },
    { pins: [16, 15], y: 132 }
  ];

  const contacts = CPC_CONTACT_LAYOUT.map((item) => `
    <g transform="translate(${170 + item.dx * 1.35} ${152 + item.dy * 1.15})">
      <circle cx="0" cy="0" r="10" fill="${contactFill}" stroke="${contactStroke}" stroke-width="2.2" />
      ${isFemale
        ? `<circle cx="0" cy="0" r="3.8" fill="#040605" opacity="0.9" />`
        : `<path d="M -5 0 H 5 M 0 -5 V 5" stroke="${contactInner}" stroke-width="1.9" stroke-linecap="round" />`}
      <text x="0" y="${item.dy < 0 ? -16 : 20}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="11" font-weight="900" fill="#dde6e0">${item.pin}</text>
    </g>
  `).join("");

  const rowLegend = rowBlocks.map((row) => {
    const rowLabel = row.pins.join("  ");
    return `
      <g transform="translate(0 ${row.y})">
        <rect x="0" y="0" width="320" height="26" rx="8" fill="#f6faf6" stroke="#d7dfd7" stroke-width="1.4" />
        <text x="16" y="18" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="850" fill="#1e2621">Row</text>
        <text x="60" y="18" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="750" fill="#4f5c56">${rowLabel}</text>
      </g>
    `;
  }).join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 420" role="img" aria-label="${title} pinout">
      <rect width="900" height="420" rx="28" fill="#eef4ef" />
      <text x="54" y="58" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="900" fill="#1f2722">${title}</text>
      <text x="54" y="88" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#5d6a64">TE CPC SERIES 1 / 17-16 / 16 POS</text>
      <g transform="translate(54 112)">
        <rect x="0" y="0" width="304" height="194" rx="22" fill="#202c25" stroke="#718078" stroke-width="4" />
        <circle cx="152" cy="92" r="74" fill="${faceFill}" stroke="${faceStroke}" stroke-width="4" />
        <circle cx="152" cy="92" r="60" fill="#24312a" stroke="#0a0f0d" stroke-width="3" />
        <path d="M 132 12 H 172 L 182 28 H 122 Z" fill="#dbe0db" stroke="#8f9891" stroke-width="3" />
        <rect x="26" y="32" width="252" height="126" rx="12" fill="none" stroke="#0f1714" stroke-width="2" opacity="0.65" />
        <circle cx="46" cy="34" r="5" fill="#e8ede8" stroke="#8e9790" stroke-width="2" />
        <circle cx="258" cy="34" r="5" fill="#e8ede8" stroke="#8e9790" stroke-width="2" />
        <circle cx="46" cy="160" r="5" fill="#e8ede8" stroke="#8e9790" stroke-width="2" />
        <circle cx="258" cy="160" r="5" fill="#e8ede8" stroke="#8e9790" stroke-width="2" />
        ${contacts}
        <text x="152" y="178" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="850" fill="#dfe7e1">${shellLabel}</text>
      </g>
      <g transform="translate(398 112)">
        ${rowLegend}
        <rect x="0" y="292" width="320" height="46" rx="10" fill="#f6faf6" stroke="#d7dfd7" stroke-width="1.4" />
        <text x="16" y="320" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" fill="#4f5c56">${isFemale ? "Female / plug uses socket contacts." : "Male / receptacle uses pin contacts."}</text>
      </g>
      <text x="54" y="382" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="750" fill="#4d5a54">The face follows the TE 17-16 arrangement used on the 16-position CPC shell.</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const CPC_MALE_IMAGE = buildCpcPinoutImage("CPC 16 PIN MALE", "male");
const CPC_FEMALE_IMAGE = buildCpcPinoutImage("CPC 16 PIN FEMALE", "female");

const TABLE_LAYOUT_VERSION = 3;

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
  "Tap Position inches",
  "Branch ID",
  "",
  "Branch Role",
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
  190,
  100,
  260,
  170,
  155,
  115,
  150,
  170,
  145,
  160,
  34,
  130,
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
  editorShell: document.querySelector(".editor-shell"),
  layoutSplitter: document.querySelector("#layoutSplitter"),
  toggleTableButton: document.querySelector("#toggleTableButton"),
  toggleTableLabel: document.querySelector("#toggleTableLabel"),
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
  wirePreview: document.querySelector("#wirePreview"),
  harnessTable: document.querySelector("#harnessTable"),
  tableColumnGroup: document.querySelector("#tableColumnGroup"),
  wireRows: document.querySelector("#wireRows"),
  searchRows: document.querySelector("#searchRows"),
  activeOnly: document.querySelector("#activeOnly"),
  toast: document.querySelector("#toast"),
  importJson: document.querySelector("#importJson"),
  importJsonButton: document.querySelector("#importJsonButton"),
  imageImportButton: document.querySelector("#imageImportButton"),
  drawIoButton: document.querySelector("#drawIoButton"),
  imageDialog: document.querySelector("#imageDialog"),
  closeImageDialog: document.querySelector("#closeImageDialog"),
  translateImageText: document.querySelector("#translateImageText"),
  applyImageRows: document.querySelector("#applyImageRows"),
  imageStatus: document.querySelector("#imageStatus"),
  importText: document.querySelector("#importText"),
  importPreviewCount: document.querySelector("#importPreviewCount"),
  importPreviewRows: document.querySelector("#importPreviewRows"),
  undoButton: document.querySelector("#undoButton"),
  addRow: document.querySelector("#addRow"),
  duplicateRow: document.querySelector("#duplicateRow"),
  deleteRow: document.querySelector("#deleteRow"),
  resetSample: document.querySelector("#resetSample"),
  exportCsv: document.querySelector("#exportCsv"),
  exportDrawing: document.querySelector("#exportDrawing"),
  exportInstructions: document.querySelector("#exportInstructions"),
  printButton: document.querySelector("#printButton")
};

Object.assign(dom, {
  qualityButton: document.querySelector("#qualityButton"),
  qualityCount: document.querySelector("#qualityCount"),
  qualityDialog: document.querySelector("#qualityDialog"),
  copyQualityIssues: document.querySelector("#copyQualityIssues"),
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
let wireDragState = null;
let drawIoWindow = null;
let drawIoMessageHandler = null;
let drawIoReady = false;
let drawIoPendingXml = "";
let pendingImportRows = [];
let pendingImportContext = { harnessName: "", legNames: { left: {}, right: {} } };
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

function isMotorEscHousingText(input) {
  const text = cleanCell(input).toUpperCase();
  if (!text) {
    return false;
  }
  return /\b(?:VESC|FSESC|ESC)\b/.test(text)
    || text.includes("MOTOR CONTROLLER")
    || text.includes("SPEED CONTROLLER");
}

function isResistorHousingText(input) {
  const text = cleanCell(input).toUpperCase();
  return /\b(?:RESISTOR|RESISTANCE|SHUNT)\b/.test(text);
}

function defaultCatalog() {
  return [
    catalogEntry("A POWER POLE", "Connector", "powerpole", 16, { manufacturer: "Anderson Power Products", terminalType: "Powerpole crimp contact" }),
    catalogEntry("B POWER POLE", "Connector", "powerpole", 16, { manufacturer: "Anderson Power Products", terminalType: "Powerpole crimp contact" }),
    catalogEntry("PCB", "Board", "pcb", 32, { terminalType: "PCB connection" }),
    catalogEntry("VESC", "Motor ESC", "pcb", 12, {
      manufacturer: "VESC",
      terminalType: "Motor controller terminal",
      notes: "Generic VESC-style electronic speed controller board for battery, phase, sensor, and control wiring."
    }),
    catalogEntry("MOTOR ESC", "Motor ESC", "pcb", 12, {
      manufacturer: "Generic",
      terminalType: "Motor controller terminal",
      notes: "Generic motor electronic speed controller. Drawn as a VESC-style controller with battery +/-, three motor phase terminals, signal pads, capacitors, MOSFETs, and heatsink details."
    }),
    catalogEntry("RJ45 PLUG", "Connector", "rj45", 8, {
      manufacturer: "Generic",
      gender: "Male",
      terminalType: "Cat 6 RJ45 crimp contact",
      notes: "8P8C plug. T568B pinout shown in the image; T568A swaps the green and orange pairs.",
      imageUrl: RJ45_PLUG_IMAGE
    }),
    catalogEntry("RJ45 JACK", "Connector", "rj45", 8, {
      manufacturer: "Generic",
      gender: "Female",
      terminalType: "Cat 6 RJ45 jack contact",
      notes: "8P8C jack. Use the same scheme on both ends for straight-through patch cords.",
      imageUrl: RJ45_JACK_IMAGE
    }),
    catalogEntry("CPC 16 PIN MALE", "Connector", "cpc", 16, {
      manufacturer: "TE Connectivity",
      partNumber: "206036-1",
      gender: "Male",
      terminalType: "CPC size 17-16 pin contact",
      notes: "TE receptacle housing, size 17 shell, 16 positions, pin contacts.",
      imageUrl: CPC_MALE_IMAGE
    }),
    catalogEntry("16 PIN CPC", "Connector", "cpc", 16, {
      manufacturer: "TE Connectivity",
      partNumber: "A1305-ND",
      gender: "Male",
      terminalType: "CPC size 17-16 pin contact",
      terminalPart: "1003-T2P20MC1SZCT-ND",
      notes: "Starter W104 CPC housing alias for the 16-position CPC connector.",
      imageUrl: CPC_MALE_IMAGE
    }),
    catalogEntry("CPC 16 SOCKET FEMALE", "Connector", "cpc", 16, {
      manufacturer: "TE Connectivity",
      partNumber: "206037-1",
      gender: "Female",
      terminalType: "CPC size 17-16 socket contact",
      notes: "TE plug assembly, size 17 shell, 16 positions, socket contacts.",
      imageUrl: CPC_FEMALE_IMAGE
    }),
    ...subconPinCounts.flatMap((positions) => [
      catalogEntry(`SUBCONN ${positions} PIN MALE`, "Connector", "subconn", positions, { manufacturer: "SubConn", gender: "Male", terminalType: "Subsea connector contact" }),
      catalogEntry(`SUBCONN ${positions} PIN FEMALE`, "Connector", "subconn", positions, { manufacturer: "SubConn", gender: "Female", terminalType: "Subsea connector contact" })
    ]),
    catalogEntry("MOLEX MICRO-FIT FRONT LOCK", "Connector", "molex", 20, {
      manufacturer: "Molex",
      partNumber: "0436450200",
      gender: "Female",
      terminalType: "Micro-Fit 3.0 crimp terminal",
      notes: "43645 front-lock/single-row Micro-Fit 3.0 receptacle family. The preview scales to the highest pin used on that leg.",
      imageUrl: MOLEX_MICRO_FIT_FRONT_IMAGE
    }),
    catalogEntry("MOLEX MICRO-FIT SIDE LOCK", "Connector", "molex", 20, {
      manufacturer: "Molex",
      partNumber: "0430250210",
      gender: "Female",
      terminalType: "Micro-Fit 3.0 crimp terminal",
      notes: "43025 side-lock/dual-row Micro-Fit 3.0 receptacle family. The preview scales to the highest pin used on that leg.",
      imageUrl: MOLEX_MICRO_FIT_SIDE_IMAGE
    }),
    ...Array.from({ length: 12 }, (_, index) => catalogEntry(`DUPONT ${index + 1} POS FRONT LOCK`, "Connector", "dupont", index + 1, { manufacturer: "Generic", terminalType: "Dupont crimp terminal" })),
    catalogEntry("MOLEX MINI-FIT", "Connector", "minifit", 20, { manufacturer: "Molex", terminalType: "Mini-Fit Jr crimp terminal", notes: "Mini-Fit Jr dual-row family; the preview scales with circuit count.", imageUrl: MINI_FIT_PINOUT_IMAGE }),
    catalogEntry("BARREL CONNECTION", "Connector", "barrel", 2, { terminalType: "Barrel connector lead", notes: "DC barrel plug or jack pigtail connection" }),
    catalogEntry("RING TERMINAL", "Terminal", "ring", 1, { terminalType: "Ring terminal" }),
    catalogEntry("RESISTOR", "Component", "resistor", 2, { manufacturer: "Generic", notes: "Two-terminal resistor component. Use on a branch row for shunt, pull-up, pull-down, precharge, or other parallel branch loads." }),
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
    .filter((entry) => !isDeprecatedMolexSizedEntry(entry))
    .filter((entry) => entry.name && !names.has(entry.name) && names.add(entry.name));
  defaults.forEach((entry) => {
    if (!names.has(entry.name)) {
      names.add(entry.name);
      entries.push(entry);
    }
  });
  return entries;
}

function isDeprecatedMolexSizedEntry(entry) {
  const name = value(entry?.name).trim().toUpperCase();
  return /^MOLEX\s+\d{1,2}\s+POS\s+(?:FRONT|SIDE)\s+LOCK$/.test(name);
}

function learnCatalogFromRows(rows, catalog) {
  const learnedCatalog = Array.isArray(catalog) ? catalog.map((entry) => ({ ...entry })) : [];
  const catalogByName = new Map();
  const statsByName = new Map();
  const defaultNames = new Set(defaultCatalog().map((entry) => entry.name));
  let changed = false;

  learnedCatalog.forEach((entry) => {
    const name = value(entry?.name).trim().toUpperCase();
    if (name) {
      catalogByName.set(name, entry);
    }
  });

  const recordSide = (row, side) => {
    const housing = value(side === "left" ? row.housing : row.rightHousing).trim().toUpperCase();
    if (!housing) {
      return;
    }

    let stats = statsByName.get(housing);
    if (!stats) {
      stats = {
        maxPin: 0,
        housingParts: new Set(),
        terminalParts: new Set()
      };
      statsByName.set(housing, stats);
    }

    const pin = numberOrDefault(side === "left" ? row.leftPin : row.rightPin, 0);
    if (pin > stats.maxPin) {
      stats.maxPin = pin;
    }

    const housingPart = value(side === "left" ? row.leftHousingPart : row.rightHousingPart).trim();
    const terminalPart = value(side === "left" ? row.leftTerminalPart : row.rightTerminalPart).trim();
    if (housingPart) {
      stats.housingParts.add(housingPart);
    }
    if (terminalPart) {
      stats.terminalParts.add(terminalPart);
    }
  };

  rows.forEach((row) => {
    recordSide(row, "left");
    recordSide(row, "right");
  });

  statsByName.forEach((stats, name) => {
    const family = inferCatalogFamily(name);
    const gender = inferCatalogGender(name, family);
    const category = inferCatalogCategory(family, name);
    const positions = inferCatalogPositions(name, family, stats.maxPin);
    const manufacturer = inferCatalogManufacturer(family);
    const terminalType = inferCatalogTerminalType(name, family, gender);
    const housingParts = [...stats.housingParts];
    const terminalParts = [...stats.terminalParts];
    let entry = catalogByName.get(name);

    if (!entry) {
      entry = catalogEntry(name, category, family, positions, {
        manufacturer,
        gender,
        terminalType,
        partNumber: housingParts[0] || "",
        terminalPart: terminalParts[0] || "",
        builtIn: defaultNames.has(name)
      });
      if (!defaultNames.has(name)) {
        entry.builtIn = false;
      }
      if (housingParts.length > 1) {
        housingParts.slice(1).forEach((partNumber) => {
          entry.notes = appendCatalogNote(entry.notes, `Also seen with housing part # ${partNumber}`);
        });
      }
      if (terminalParts.length > 1) {
        terminalParts.slice(1).forEach((partNumber) => {
          entry.notes = appendCatalogNote(entry.notes, `Also seen with terminal part # ${partNumber}`);
        });
      }
      learnedCatalog.push(entry);
      catalogByName.set(name, entry);
      changed = true;
      return;
    }

    let entryChanged = false;
    if (!entry.category) {
      entry.category = category;
      entryChanged = true;
    }
    if (!entry.family) {
      entry.family = family;
      entryChanged = true;
    }
    const nextPositions = Math.max(numberOrDefault(entry.positions, 1), positions, stats.maxPin || 0);
    if (nextPositions !== numberOrDefault(entry.positions, 1)) {
      entry.positions = nextPositions;
      entryChanged = true;
    }
    if (!entry.manufacturer) {
      entry.manufacturer = manufacturer;
      entryChanged = true;
    }
    if (!entry.gender) {
      entry.gender = gender;
      entryChanged = true;
    }
    if (!entry.terminalType) {
      entry.terminalType = terminalType;
      entryChanged = true;
    }
    if (!entry.partNumber && housingParts[0]) {
      entry.partNumber = housingParts[0];
      entryChanged = true;
    }
    if (!entry.terminalPart && terminalParts[0]) {
      entry.terminalPart = terminalParts[0];
      entryChanged = true;
    }

    housingParts.slice(1).forEach((partNumber) => {
      if (partNumber && partNumber !== entry.partNumber) {
        const nextNotes = appendCatalogNote(entry.notes, `Also seen with housing part # ${partNumber}`);
        if (nextNotes !== entry.notes) {
          entry.notes = nextNotes;
          entryChanged = true;
        }
      }
    });
    terminalParts.slice(1).forEach((partNumber) => {
      if (partNumber && partNumber !== entry.terminalPart) {
        const nextNotes = appendCatalogNote(entry.notes, `Also seen with terminal part # ${partNumber}`);
        if (nextNotes !== entry.notes) {
          entry.notes = nextNotes;
          entryChanged = true;
        }
      }
    });

    if (entryChanged) {
      changed = true;
    }
  });

  return {
    catalog: learnedCatalog,
    changed
  };
}

function inferCatalogFamily(housing) {
  const text = value(housing).trim().toUpperCase();
  if (!text) {
    return "generic";
  }
  if (text.startsWith("SUBCONN ")) {
    return "subconn";
  }
  if (text.includes("CPC")) {
    return "cpc";
  }
  if (text.includes("MINI-FIT")) {
    return "minifit";
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
  if (isMotorEscHousingText(text) || text === "PCB") {
    return "pcb";
  }
  if (text.includes("RJ45") || text.includes("8P8C")) {
    return "rj45";
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
  if (isResistorHousingText(text)) {
    return "resistor";
  }
  return "generic";
}

function inferCatalogCategory(family, housing = "") {
  if (family === "resistor") {
    return "Component";
  }
  if (family === "pcb" && isMotorEscHousingText(housing)) {
    return "Motor ESC";
  }
  if (family === "pcb") {
    return "Board";
  }
  if (family === "ring") {
    return "Terminal";
  }
  if (family === "splice") {
    return "Splice";
  }
  return "Connector";
}

function inferCatalogManufacturer(family) {
  if (family === "powerpole") {
    return "Anderson Power Products";
  }
  if (family === "cpc") {
    return "TE Connectivity";
  }
  if (family === "subconn") {
    return "SubConn";
  }
  if (family === "molex" || family === "minifit") {
    return "Molex";
  }
  if (family === "rj45" || family === "dupont") {
    return "Generic";
  }
  if (family === "resistor") {
    return "Generic";
  }
  return "";
}

function inferCatalogGender(housing, family) {
  const text = value(housing).trim().toUpperCase();
  if (text.endsWith(" FEMALE")) {
    return "Female";
  }
  if (text.endsWith(" MALE")) {
    return "Male";
  }
  if (family === "cpc") {
    if (text.includes("SOCKET")) {
      return "Female";
    }
    if (text.includes("PIN")) {
      return "Male";
    }
  }
  if (family === "rj45") {
    if (text.includes("JACK")) {
      return "Female";
    }
    if (text.includes("PLUG")) {
      return "Male";
    }
  }
  return "";
}

function inferCatalogPositions(housing, family, pinsFromRows = 0) {
  const text = value(housing).trim().toUpperCase();
  const explicitMatch = text.match(/\b(\d{1,2})\s+(?:POS|POSITION|PIN)\b/);
  const explicit = explicitMatch ? Number(explicitMatch[1]) : 0;
  if (family === "barrel") {
    return 2;
  }
  if (family === "cpc") {
    return 16;
  }
  if (family === "rj45") {
    return 8;
  }
  if (family === "ring") {
    return 1;
  }
  if (family === "resistor") {
    return 2;
  }
  if (family === "splice") {
    return 1;
  }
  if (family === "pcb" && isMotorEscHousingText(text)) {
    return Math.max(12, explicit || pinsFromRows || 12);
  }
  if (family === "minifit") {
    return 20;
  }
  return Math.max(1, explicit || pinsFromRows || 16);
}

function inferCatalogTerminalType(housing, family, gender) {
  const text = value(housing).trim().toUpperCase();
  if (family === "powerpole") {
    return "Powerpole crimp contact";
  }
  if (family === "cpc") {
    return gender === "Female" ? "CPC size 17-16 socket contact" : "CPC size 17-16 pin contact";
  }
  if (family === "subconn") {
    return "Subsea connector contact";
  }
  if (family === "molex") {
    if (text.includes("MINI-FIT")) {
      return "Mini-Fit Jr crimp terminal";
    }
    if (text.includes("MICRO-FIT") || text.includes("FRONT LOCK") || text.includes("SIDE LOCK")) {
      return "Micro-Fit 3.0 crimp terminal";
    }
    return "Molex crimp terminal";
  }
  if (family === "dupont") {
    return "Dupont crimp terminal";
  }
  if (family === "rj45") {
    return gender === "Female" ? "Cat 6 RJ45 jack contact" : "Cat 6 RJ45 crimp contact";
  }
  if (family === "barrel") {
    return "Barrel connector lead";
  }
  if (family === "ring") {
    return "Ring terminal";
  }
  if (family === "resistor") {
    return "";
  }
  if (family === "splice") {
    return "Window splice";
  }
  if (family === "pcb") {
    return isMotorEscHousingText(text) ? "Motor controller terminal" : "PCB connection";
  }
  return "";
}

function canonicalHousingName(input) {
  const text = cleanCell(input).toUpperCase();
  if (!text) {
    return "";
  }

  if (isResistorHousingText(text)) {
    return "RESISTOR";
  }

  if (isMotorEscHousingText(text)) {
    return text.includes("VESC") ? "VESC" : "MOTOR ESC";
  }

  if (text.includes("MINI-FIT")) {
    return "";
  }

  const compact = text.replace(/[^A-Z0-9]+/g, "");
  const looksMicroFit = text.includes("MOLEX")
    || text.includes("MICRO-FIT")
    || compact.includes("043025")
    || compact.includes("43025")
    || compact.includes("043645")
    || compact.includes("43645")
    || text.includes("WM1845");
  if (!looksMicroFit) {
    return "";
  }

  if (text.includes("SIDE") || compact.includes("043025") || compact.includes("43025")) {
    return "MOLEX MICRO-FIT SIDE LOCK";
  }

  if (text.includes("FRONT") || compact.includes("043645") || compact.includes("43645") || text.includes("WM1845")) {
    return "MOLEX MICRO-FIT FRONT LOCK";
  }

  return "";
}

function appendCatalogNote(existingNotes, note) {
  const current = value(existingNotes).trim();
  const addition = value(note).trim();
  if (!addition) {
    return current;
  }
  if (!current) {
    return addition;
  }
  const lines = current.split(/\n+/);
  if (lines.includes(addition)) {
    return current;
  }
  return `${current}\n${addition}`;
}

function mergeDefaultCatalogDetails(entry, defaultEntry) {
  if (!entry.builtIn || !defaultEntry) {
    return entry;
  }

  const defaultPositionUpdate = entry.name === "BARREL CONNECTION" && defaultEntry.positions === 2;
  const miniFitUpdate = entry.name === "MOLEX MINI-FIT";
  const motorEscUpdate = entry.name === "VESC" || entry.name === "MOTOR ESC";
  const resistorUpdate = entry.name === "RESISTOR";
  return {
    ...entry,
    category: motorEscUpdate || resistorUpdate ? defaultEntry.category : entry.category || defaultEntry.category,
    family: miniFitUpdate ? defaultEntry.family : entry.family || defaultEntry.family,
    positions: defaultPositionUpdate || miniFitUpdate || resistorUpdate ? defaultEntry.positions : entry.positions || defaultEntry.positions,
    manufacturer: entry.manufacturer || defaultEntry.manufacturer,
    partNumber: entry.partNumber || defaultEntry.partNumber,
    gender: entry.gender || defaultEntry.gender,
    terminalType: entry.terminalType || defaultEntry.terminalType,
    terminalPart: entry.terminalPart || defaultEntry.terminalPart,
    sealPart: entry.sealPart || defaultEntry.sealPart,
    imageUrl: miniFitUpdate ? defaultEntry.imageUrl : entry.imageUrl || defaultEntry.imageUrl,
    notes: miniFitUpdate || motorEscUpdate || resistorUpdate ? defaultEntry.notes : entry.notes || defaultEntry.notes
  };
}

function housingChoices() {
  return ["", ...state.catalog
    .filter((entry) => !isDeprecatedMolexSizedEntry(entry))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))];
}

function catalogEntryByName(name) {
  const target = value(name).trim().toUpperCase();
  const exact = state.catalog.find((entry) => entry.name === target);
  if (exact) {
    return exact;
  }

  const canonical = canonicalHousingName(target);
  return canonical ? state.catalog.find((entry) => entry.name === canonical) || null : null;
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

function blankWireFields() {
  return {
    cableName: "",
    leftLeg: "",
    name: "",
    leftPin: "",
    dnp: false,
    housing: "",
    leftHousingPart: "",
    leftTerminalPart: "",
    awg: "",
    color: "",
    length: "",
    tapPosition: "",
    spliceId: "",
    spliceRole: "",
    rightLeg: "",
    rightPin: "",
    rightDnp: false,
    rightHousing: "",
    rightHousingPart: "",
    rightTerminalPart: "",
    toolUsed: "",
    comments: "",
    routeOffsetX: 0,
    routeOffsetY: 0,
    routeBends: [],
    routeBendX: null,
    routeBendY: null,
    wireLabelOffsetX: 0,
    wireLabelOffsetY: 0
  };
}

function createBlankRow(overrides = {}) {
  return {
    id: makeId(),
    ...blankWireFields(),
    ...overrides
  };
}

function blankState(rowCount = BLANK_ROW_COUNT) {
  const rows = Array.from({ length: rowCount }, () => createBlankRow());
  return {
    tableLayoutVersion: TABLE_LAYOUT_VERSION,
    harnessName: "",
    selectedId: rows[0]?.id || "",
    rows,
    catalog: defaultCatalog(),
    bomAllowance: 10,
    tableColumnWidths: [...DEFAULT_COLUMN_WIDTHS],
    previewPaneWidth: defaultPreviewPaneWidth(),
    tableHidden: false,
    previewLayout: defaultPreviewLayout(),
    drawioXml: "",
    legNames: { left: {}, right: {} }
  };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return blankState();
    }

    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.rows)) {
      return blankState();
    }

    return normalizeState(parsed);
  } catch (error) {
    return blankState();
  }
}

function normalizeState(incoming) {
  const incomingHarnessName = value(incoming.harnessName);
  const layoutVersion = Number(incoming.tableLayoutVersion) || 1;
  const rows = incoming.rows.map((row, index) => {
    const routeBends = normalizedRouteBends(row);
    const routeBend = routeBends[0] || { x: null, y: null };
    const branchState = {
      spliceId: value(row.spliceId).trim().toUpperCase(),
      spliceRole: normalizedSpliceRole(row)
    };
    if (row.branch) {
      const parsedBranch = { spliceId: "", spliceRole: "" };
      applyBranchValue(parsedBranch, row.branch);
      if (!branchState.spliceId) {
        branchState.spliceId = parsedBranch.spliceId;
      }
      if (!branchState.spliceRole) {
        branchState.spliceRole = parsedBranch.spliceRole;
      }
    }
    return {
      id: row.id || makeId(),
      cableName: value(row.cableName || row.harnessName || (index === 0 ? incomingHarnessName : "")),
      leftLeg: value(row.leftLeg),
      name: value(row.name),
      leftPin: value(row.leftPin),
      dnp: isDnp(row.dnp),
      housing: canonicalHousingName(row.housing) || value(row.housing),
      leftHousingPart: value(row.leftHousingPart || row.housingPart),
      leftTerminalPart: value(row.leftTerminalPart || row.pinPart || row.terminalPart),
      awg: value(row.awg),
      color: value(row.color).toUpperCase(),
      length: value(row.length),
      tapPosition: value(row.tapPosition),
      spliceId: branchState.spliceId,
      spliceRole: branchState.spliceRole,
      rightLeg: value(row.rightLeg),
      rightPin: value(row.rightPin),
      rightDnp: row.rightDnp === undefined ? isDnp(row.dnp) : isDnp(row.rightDnp),
      rightHousing: canonicalHousingName(row.rightHousing) || value(row.rightHousing),
      rightHousingPart: value(row.rightHousingPart),
      rightTerminalPart: value(row.rightTerminalPart || row.rightPinPart || row.rightTerminal),
      toolUsed: value(row.toolUsed),
      comments: value(row.comments),
      routeOffsetX: Number.isFinite(Number(row.routeOffsetX)) ? Number(row.routeOffsetX) : 0,
      routeOffsetY: Number.isFinite(Number(row.routeOffsetY)) ? Number(row.routeOffsetY) : 0,
      routeBends,
      routeBendX: routeBend.x,
      routeBendY: routeBend.y,
      wireLabelOffsetX: Number.isFinite(Number(row.wireLabelOffsetX)) ? Number(row.wireLabelOffsetX) : 0,
      wireLabelOffsetY: Number.isFinite(Number(row.wireLabelOffsetY)) ? Number(row.wireLabelOffsetY) : 0
    };
  });
  const learnedCatalog = learnCatalogFromRows(rows, incoming.catalog);
  const harnessName = cableNameFromRows(rows) || incomingHarnessName;

  const incomingAllowance = Number(incoming.bomAllowance);
  return {
    harnessName,
    selectedId: rows.some((row) => row.id === incoming.selectedId) ? incoming.selectedId : rows[0]?.id || "",
    rows,
    catalog: normalizeCatalog(learnedCatalog.catalog),
    bomAllowance: Number.isFinite(incomingAllowance) ? Math.max(0, Math.min(100, incomingAllowance)) : 10,
    tableColumnWidths: normalizeColumnWidths(incoming.tableColumnWidths, layoutVersion),
    previewPaneWidth: normalizePreviewPaneWidth(
      incoming.previewPaneWidth ?? incoming.previewPaneHeight
    ),
    tableHidden: Boolean(incoming.tableHidden),
    previewLayout: normalizePreviewLayout(incoming.previewLayout),
    drawioXml: value(incoming.drawioXml || incoming.drawIoXml),
    legNames: normalizeLegNames(incoming.legNames),
    tableLayoutVersion: TABLE_LAYOUT_VERSION
  };
}

function cableNameFromRows(rows) {
  const namedRow = rows.find((row) => cleanCell(row.cableName));
  return namedRow ? cleanCell(namedRow.cableName) : "";
}

function syncHarnessNameFromRows() {
  state.harnessName = cableNameFromRows(state.rows);
  return state.harnessName;
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

function defaultPreviewLayout() {
  return {
    title: { x: 0, y: 0 },
    connectors: { left: {}, right: {} },
    connectorDetails: { left: {}, right: {} },
    heatshrink: { left: {}, right: {} },
    splices: {}
  };
}

function normalizePreviewLayout(input = {}) {
  const normalizePoint = (point) => ({
    x: Number.isFinite(Number(point?.x)) ? Number(point.x) : 0,
    y: Number.isFinite(Number(point?.y)) ? Number(point.y) : 0
  });

  const normalizeOffsetMap = (map) => Object.entries(map || {}).reduce((acc, [key, point]) => {
    acc[legKey(key)] = normalizePoint(point);
    return acc;
  }, {});

  const next = defaultPreviewLayout();
  next.title = normalizePoint(input.title || input.cableTitle || {});
  next.connectors.left = normalizeOffsetMap(input.connectors?.left || input.leftConnectors || input.left || {});
  next.connectors.right = normalizeOffsetMap(input.connectors?.right || input.rightConnectors || input.right || {});
  next.connectorDetails.left = normalizeOffsetMap(input.connectorDetails?.left || input.detailPanels?.left || {});
  next.connectorDetails.right = normalizeOffsetMap(input.connectorDetails?.right || input.detailPanels?.right || {});
  next.heatshrink.left = normalizeOffsetMap(input.heatshrink?.left || input.leftHeatshrink || {});
  next.heatshrink.right = normalizeOffsetMap(input.heatshrink?.right || input.rightHeatshrink || {});
  next.splices = normalizeOffsetMap(input.splices || {});
  return next;
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

function defaultPreviewPaneWidth() {
  const viewportWidth = window.innerWidth || 1440;
  return normalizePreviewPaneWidth(Math.round(viewportWidth * 0.58));
}

function previewPaneMaxWidth() {
  const viewportWidth = window.innerWidth || 1440;
  const reserved = WORKSPACE_HORIZONTAL_PADDING + LAYOUT_SPLITTER_WIDTH + MIN_EDITOR_PANE_WIDTH;
  return Math.max(MIN_PREVIEW_PANE_WIDTH, Math.floor(viewportWidth - reserved));
}

function normalizePreviewPaneWidth(width) {
  const parsed = Number(width);
  const fallback = Math.round((window.innerWidth || 1440) * 0.58);
  const nextWidth = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(Math.round(nextWidth), MIN_PREVIEW_PANE_WIDTH, previewPaneMaxWidth());
}

function normalizeColumnWidths(widths, layoutVersion = 1) {
  let incoming = Array.isArray(widths) ? widths : [];
  if (layoutVersion < TABLE_LAYOUT_VERSION && incoming.length === 23) {
    incoming = [
      ...incoming.slice(0, 5),
      ...incoming.slice(6, 17),
      incoming[20],
      incoming[18],
      incoming[19],
      ...incoming.slice(21)
    ];
  } else if (layoutVersion < TABLE_LAYOUT_VERSION && incoming.length === 19) {
    incoming = [
      ...incoming.slice(0, 3),
      180,
      ...incoming.slice(3, 14),
      180,
      ...incoming.slice(14)
    ];
  }
  if (layoutVersion < TABLE_LAYOUT_VERSION && incoming.length === 21) {
    incoming = [
      incoming[0],
      DEFAULT_COLUMN_WIDTHS[1],
      incoming[2],
      incoming[3],
      incoming[1],
      ...incoming.slice(4)
    ];
  }
  if (layoutVersion < TABLE_LAYOUT_VERSION && incoming.length === 22) {
    incoming = [
      ...incoming.slice(0, 14),
      DEFAULT_COLUMN_WIDTHS[14],
      ...incoming.slice(14)
    ];
  }
  if (layoutVersion < TABLE_LAYOUT_VERSION && incoming.length === 23) {
    incoming = [
      ...incoming.slice(0, 12),
      DEFAULT_COLUMN_WIDTHS[12],
      ...incoming.slice(12)
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
  if (index === 14) {
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

function branchIdDisplay(row) {
  return normalizedSpliceId(row) || "None";
}

function branchRoleDisplay(row) {
  const role = normalizedSpliceRole(row);
  if (!role) {
    return "None";
  }
  return role === "PARENT" ? "Parent" : "Branch";
}

function branchIdSelectValue(row) {
  return normalizedSpliceId(row) || "None";
}

function branchRoleSelectValue(row) {
  return branchRoleDisplay(row);
}

function branchIdChoices() {
  return ["None", ...options.spliceIds.filter(Boolean)];
}

function branchRoleChoices() {
  return ["None", "Parent", "Branch"];
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
    syncHarnessNameFromRows();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateUndoButtonState();
    return true;
  } catch (error) {
    showToast("Browser storage is full. Remove large catalog images or unused rows.");
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
  applyWorkspaceLayout();
  applyColumnWidths();
  renderSummary();
  renderPreview();
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

function applyWorkspaceLayout() {
  if (!dom.appShell) {
    return;
  }

  const tableHidden = Boolean(state.tableHidden);
  dom.appShell.classList.toggle("table-hidden", tableHidden);
  if (dom.editorShell) {
    dom.editorShell.hidden = tableHidden;
  }
  if (dom.layoutSplitter) {
    dom.layoutSplitter.hidden = tableHidden;
  }

  if (dom.toggleTableButton) {
    dom.toggleTableButton.setAttribute("aria-pressed", tableHidden ? "true" : "false");
    dom.toggleTableButton.title = tableHidden ? "Show the editable table" : "Hide the editable table";
  }
  if (dom.toggleTableLabel) {
    dom.toggleTableLabel.textContent = tableHidden ? "Show table" : "Hide table";
  }

  if (tableHidden) {
    dom.appShell.style.removeProperty("--preview-pane-width");
    return;
  }

  const width = normalizePreviewPaneWidth(state.previewPaneWidth);
  state.previewPaneWidth = width;
  dom.appShell.style.setProperty("--preview-pane-width", `${width}px`);
  if (dom.layoutSplitter) {
    dom.layoutSplitter.setAttribute("aria-valuemin", String(MIN_PREVIEW_PANE_WIDTH));
    dom.layoutSplitter.setAttribute("aria-valuemax", String(previewPaneMaxWidth()));
    dom.layoutSplitter.setAttribute("aria-valuenow", String(width));
    dom.layoutSplitter.setAttribute("aria-valuetext", `Preview width ${width} pixels`);
  }
}

function setupLayoutSplitter() {
  if (!dom.layoutSplitter) {
    return;
  }

  dom.layoutSplitter.addEventListener("pointerdown", startLayoutResize);
  dom.layoutSplitter.addEventListener("keydown", handleLayoutSplitterKeydown);
  window.addEventListener("resize", () => {
    const previousWidth = state.previewPaneWidth;
    applyWorkspaceLayout();
    if (!state.tableHidden && state.previewPaneWidth !== previousWidth) {
      saveState();
    }
  });
}

function startLayoutResize(event) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (state.tableHidden) {
    return;
  }

  const startX = event.clientX;
  const startWidth = normalizePreviewPaneWidth(state.previewPaneWidth);
  dom.layoutSplitter.setPointerCapture?.(event.pointerId);
  document.body.classList.add("is-resizing-layout");
  rememberUndo();

  const resize = (moveEvent) => {
    state.previewPaneWidth = normalizePreviewPaneWidth(startWidth + moveEvent.clientX - startX);
    applyWorkspaceLayout();
  };

  const stop = () => {
    document.removeEventListener("pointermove", resize);
    document.removeEventListener("pointerup", stop);
    document.removeEventListener("pointercancel", stop);
    document.body.classList.remove("is-resizing-layout");
    saveState();
  };

  document.addEventListener("pointermove", resize);
  document.addEventListener("pointerup", stop, { once: true });
  document.addEventListener("pointercancel", stop, { once: true });
}

function handleLayoutSplitterKeydown(event) {
  const step = event.shiftKey ? 50 : 20;
  let nextWidth = state.previewPaneWidth;
  if (event.key === "ArrowLeft") {
    nextWidth -= step;
  } else if (event.key === "ArrowRight") {
    nextWidth += step;
  } else if (event.key === "Home") {
    nextWidth = MIN_PREVIEW_PANE_WIDTH;
  } else if (event.key === "End") {
    nextWidth = previewPaneMaxWidth();
  } else {
    return;
  }

  event.preventDefault();
  rememberUndo();
  state.previewPaneWidth = normalizePreviewPaneWidth(nextWidth);
  applyWorkspaceLayout();
  saveState();
}

function toggleTableVisibility() {
  rememberUndo();
  state.tableHidden = !state.tableHidden;
  applyWorkspaceLayout();
  saveState();
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
    applyColorSwatch(dom.summaryColorSwatch, "");
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
  applyColorSwatch(dom.summaryColorSwatch, row.color);
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

  dom.previewName.textContent = active.length ? "" : "No active wires";
  dom.printHarnessTitle.textContent = state.harnessName;
  dom.activeCount.textContent = String(active.length);
  dom.dnpCount.textContent = String(dnp);
  dom.totalLength.textContent = Number.isInteger(total) ? String(total) : total.toFixed(1);

  const previewRows = active;
  const leftConnectors = buildConnectors(legKeys(previewRows, "left", selected), "left", previewRows, selected);
  const rightConnectors = buildConnectors(legKeys(previewRows, "right", selected), "right", previewRows, selected);
  balanceConnectorColumns(leftConnectors, rightConnectors);
  const leftMap = new Map(leftConnectors.map((connector) => [connector.key, connector]));
  const rightMap = new Map(rightConnectors.map((connector) => [connector.key, connector]));
  const routeBaseY = wireRouteBase(leftConnectors, rightConnectors, active.length);
  const previewHeight = previewCanvasHeight(leftConnectors, rightConnectors, active.length);
  const selectedWireIndex = Math.max(0, previewRows.findIndex((item) => item.id === selected.id));
  const splicePoints = buildSplicePoints(previewRows, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight);
  const routedWires = active.map((item, index) => ({
    item,
    index,
    endpoints: wireEndpoints(item, index, leftMap, rightMap, leftConnectors, splicePoints, previewHeight)
  }));
  const selectedRoute = routedWires.find((route) => route.item.id === selected.id);
  const selectedEndpoints = selectedRoute?.endpoints || wireEndpoints(
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
  const labelY = spliceSelected
    ? clamp((selectedStart.exit === "splice" ? selectedStart.y : selectedEnd.y) - 140, 74, previewHeight - 112)
    : 54;
  const connectors = [
    ...leftConnectors.map((connector) => renderConnector(connector, "left", previewRows, selected)),
    ...rightConnectors.map((connector) => renderConnector(connector, "right", previewRows, selected))
  ].join("");
  const allConnectors = [...leftConnectors, ...rightConnectors];

  const backgroundWires = routedWires
    .map(({ item, index, endpoints }) => {
      const { start, end } = endpoints;
      const wireStyle = wireDrawingStyle(item);
      const path = wirePath(start, end, index, routeBaseY, routedWires.length, item);
      const crowd = crowdingFactor(routedWires.length, 10, 6);
      const lowerBundle = start.exit === "bottom" && end.exit === "bottom";
      const outlineOpacity = lowerBundle ? 0.66 - crowd * 0.06 : 0.8;
      const fillOpacity = lowerBundle ? 0.84 - crowd * 0.06 : 0.9;
      const outlineWidth = lowerBundle ? 6.4 : 7;
      const fillWidth = lowerBundle ? 4.2 : 4.5;
      const shieldMarkup = wireStyle.shielded
        ? `<path d="${path}" fill="none" stroke="#6f7771" stroke-width="${outlineWidth + 5}" stroke-linecap="round" stroke-linejoin="round" opacity="0.34" stroke-dasharray="18 12" />`
        : "";
      const stripeMarkup = wireStyle.stripe
        ? `<path d="${path}" fill="none" stroke="${wireStyle.stripe}" stroke-width="${Math.max(1.8, fillWidth * 0.48)}" stroke-linecap="butt" stroke-linejoin="round" opacity="0.92" stroke-dasharray="14 10" />`
        : "";
      const twistMarkup = wireStyle.twisted
        ? `<path d="${path}" fill="none" stroke="#f8faf5" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="0.82" stroke-dasharray="2 9" />`
        : "";
      return `
        <g class="wire-route" data-drag-kind="wire-route" data-wire-id="${escapeXml(item.id)}" aria-label="Wire ${escapeXml(item.name || "")}">
          <path class="wire-route-hit" d="${path}" />
          ${shieldMarkup}
          <path d="${path}" fill="none" stroke="${wireStyle.outline}" stroke-width="${outlineWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${outlineOpacity}" />
          <path d="${path}" fill="none" stroke="${wireStyle.base}" stroke-width="${fillWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${fillOpacity}" />
          ${stripeMarkup}
          ${twistMarkup}
        </g>
      `;
    })
    .join("");

  const spliceNodes = renderSpliceNodes(splicePoints, selected);
  const heatshrinkSleeves = [
    renderHeatshrinkGroupLabels("left", routedWires, routeBaseY, previewHeight, "sleeve"),
    renderHeatshrinkGroupLabels("right", routedWires, routeBaseY, previewHeight, "sleeve")
  ].join("");
  const heatshrinkText = [
    renderHeatshrinkGroupLabels("left", routedWires, routeBaseY, previewHeight, "text"),
    renderHeatshrinkGroupLabels("right", routedWires, routeBaseY, previewHeight, "text")
  ].join("");
  const wireNameTags = routedWires
    .map(({ item, index, endpoints }) => {
      return renderWireNameTag(
        item,
        endpoints.start,
        endpoints.end,
        index,
        routeBaseY,
        previewHeight,
        routedWires.length
      );
    })
    .join("");
  const bendHandles = routedWires
    .map(({ item }) => renderWireBendHandles(item, previewHeight))
    .join("");
  const sheetBackdrop = renderSheetBackdrop(previewHeight);
  const formboardPins = renderFormboardFixturePins(routedWires, allConnectors, splicePoints, routeBaseY, previewHeight);
  const shopTitleBlock = renderShopTitleBlock(previewRows, previewHeight);
  const toolNote = renderDrawingToolNote(routedWires.map((route) => route.item), previewHeight);
  const selectedWireMarkup = active.length ? "" : `
    <text x="500" y="${previewHeight / 2 - 8}" class="empty-preview" text-anchor="middle">NO ACTIVE WIRES</text>
    <text x="500" y="${previewHeight / 2 + 20}" class="empty-preview-sub" text-anchor="middle">Choose a row and enter its wire settings.</text>
  `;

  const cableNameText = shortLabel(state.harnessName || "", 14);
  const cableNameWidth = state.harnessName ? clamp(cableNameText.length * 10 + 40, 94, 176) : 0;
  const titleOffset = previewLayoutPoint("title");
  const cableNameCenterX = 500 + titleOffset.x;
  const cableNameY = clamp(labelY + 15 + titleOffset.y, 8, previewHeight - 54);
  const cableNameMarkup = state.harnessName ? `
    <g class="cable-name-tag" data-drag-kind="cable-title" aria-label="Cable name ${escapeXml(state.harnessName)}">
      <rect x="${cableNameCenterX - cableNameWidth / 2}" y="${cableNameY}" width="${cableNameWidth}" height="46" rx="4" />
      <text x="${cableNameCenterX}" y="${cableNameY + 29}" text-anchor="middle">${escapeXml(cableNameText)}</text>
    </g>
  ` : "";

  const selectedInfoBoxMarkup = state.harnessName ? cableNameMarkup : "";

  dom.wirePreview.setAttribute("viewBox", `0 0 1000 ${previewHeight}`);
  dom.wirePreview.style.height = `${previewHeight}px`;
  dom.wirePreview.style.touchAction = "none";
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
        .pin-number { fill: #f6a623; font: 10px Segoe UI, Arial, sans-serif; font-weight: 900; paint-order: stroke fill; stroke: rgba(8, 12, 10, 0.68); stroke-width: 2.2; }
        .wire-pin-number { fill: #f6a623; font: 10px Segoe UI, Arial, sans-serif; font-weight: 950; paint-order: stroke fill; stroke: rgba(8, 12, 10, 0.82); stroke-width: 2.8; }
        .tiny-label { fill: #38443d; font: 11px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .shop-grid-line { stroke: rgba(94, 105, 97, 0.16); stroke-width: 1; }
        .shop-zone-line { stroke: rgba(82, 91, 85, 0.32); stroke-width: 1.1; }
        .shop-zone-label { fill: #58635c; font: 10px Segoe UI, Arial, sans-serif; font-weight: 900; }
        .wire-route-hit { fill: none; stroke: rgba(0, 0, 0, 0); stroke-width: 24; pointer-events: stroke; cursor: grab; }
        .wire-route-hit:active { cursor: grabbing; }
        .wire-route, .wire-bend-handle, .wire-route:hover .wire-route-hit, .wire-name-tag, .connector-group, .splice-node, .heatshrink-label, .cable-name-tag { cursor: grab; }
        .wire-name-hit, .connector-detail-hit, .splice-hit { fill: rgba(0, 0, 0, 0); stroke: rgba(0, 0, 0, 0); pointer-events: all; }
        .wire-inline-label { fill: #101814; font-family: Segoe UI, Arial, sans-serif; font-weight: 950; paint-order: stroke fill; stroke: rgba(238, 240, 237, 0.92); stroke-width: 4.4; stroke-linejoin: round; }
        .connector-hit { fill: rgba(0, 0, 0, 0); stroke: rgba(0, 0, 0, 0); pointer-events: all; }
        .connector-group:active .connector-hit { cursor: grabbing; }
        .heatshrink-hit { fill: rgba(0, 0, 0, 0); stroke: rgba(0, 0, 0, 0); pointer-events: all; }
        .heatshrink-label:active .heatshrink-hit { cursor: grabbing; }
        .wire-bend-hit { fill: rgba(0, 0, 0, 0); stroke: rgba(0, 0, 0, 0); pointer-events: all; cursor: grab; }
        .wire-bend-handle:active .wire-bend-hit { cursor: grabbing; }
        .wire-bend-core { fill: rgba(7, 10, 9, 0.88); stroke: rgba(242, 200, 75, 0.96); stroke-width: 1.8; pointer-events: none; }
        .wire-bend-handle:hover .wire-bend-core { fill: rgba(7, 10, 9, 0.98); }
        .wire-bend-index { fill: #f8fbf7; font: 8px Segoe UI, Arial, sans-serif; font-weight: 900; pointer-events: none; }
        .heatshrink-sleeve { fill: rgba(0, 0, 0, 0.22); stroke: rgba(9, 12, 10, 0.78); stroke-width: 2; }
        .heatshrink-title { fill: #f8fbf7; font: 12px Segoe UI, Arial, sans-serif; font-weight: 900; }
        .heatshrink-name { fill: #f2c84b; font: 11px Segoe UI, Arial, sans-serif; font-weight: 900; }
        .cable-name-tag rect { fill: #6d128c; stroke: #a83ad1; stroke-width: 2; opacity: 0.96; }
        .cable-name-tag text { fill: #fff5ff; font: 15px Segoe UI, Arial, sans-serif; font-weight: 900; }
        .tool-note rect { fill: rgba(248, 250, 245, 0.62); stroke: rgba(217, 223, 215, 0.78); stroke-width: 1.4; }
        .tool-note text { fill: #101814; font: 11px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .splice-label { fill: #27332d; font: 11px Segoe UI, Arial, sans-serif; font-weight: 950; paint-order: stroke fill; stroke: rgba(238, 240, 237, 0.86); stroke-width: 3.6; }
        .splice-role { fill: #526158; font: 9px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .splice-port-lead { fill: none; stroke: #6f7972; stroke-width: 5.2; stroke-linecap: round; stroke-linejoin: round; }
        .splice-twist { fill: none; stroke: #2c332f; stroke-width: 2.1; stroke-linecap: round; }
        .splice-tape { fill: rgba(22, 28, 25, 0.88); }
        .splice-tape-band { fill: none; stroke: rgba(230, 236, 231, 0.34); stroke-width: 2; stroke-linecap: round; }
        .empty-preview { fill: #344138; font: 18px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .empty-preview-sub { fill: #637168; font: 12px Segoe UI, Arial, sans-serif; font-weight: 700; }
        .connector-detail-bg { fill: rgba(248, 250, 247, 0.88); stroke: rgba(93, 104, 96, 0.62); stroke-width: 1.4; }
        .splice-node:active .splice-hit { cursor: grabbing; }
        .connector-face-box { fill: #d7ddd8; stroke: #738078; stroke-width: 1.3; }
        .connector-face-key { fill: #eff2ee; stroke: #738078; stroke-width: 1.2; }
        .connector-face-pin { fill: #1d2821; font: 7.5px Segoe UI, Arial, sans-serif; font-weight: 900; }
        .connector-detail-title { fill: #172019; font: 12px Segoe UI, Arial, sans-serif; font-weight: 950; }
        .connector-detail-sub, .connector-detail-muted { fill: #526159; font: 8.5px Segoe UI, Arial, sans-serif; font-weight: 800; }
        .connector-table-head { fill: #2e3932; font: 8.5px Segoe UI, Arial, sans-serif; font-weight: 950; }
        .connector-table-pin { fill: #172019; font: 9px Segoe UI, Arial, sans-serif; font-weight: 950; }
        .connector-table-text { fill: #2d3831; font: 9px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .shop-title-block rect { fill: rgba(248, 250, 247, 0.9); stroke: rgba(82, 91, 85, 0.72); stroke-width: 1.5; }
        .shop-title-primary { fill: #141d17; font: 12px Segoe UI, Arial, sans-serif; font-weight: 950; }
        .shop-title-block text { fill: #1f2a24; font: 9.5px Segoe UI, Arial, sans-serif; font-weight: 850; }
        .shop-title-block line { stroke: rgba(82, 91, 85, 0.55); stroke-width: 1; }
        .formboard-pin circle { fill: rgba(246, 248, 244, 0.9); stroke: rgba(64, 72, 67, 0.72); stroke-width: 1.4; }
        .formboard-pin path { stroke: rgba(64, 72, 67, 0.58); stroke-width: 1.2; stroke-linecap: round; }
        .formboard-pin text { fill: #536158; font: 8.5px Segoe UI, Arial, sans-serif; font-weight: 850; }
      </style>
    </defs>

    ${sheetBackdrop}
    ${formboardPins}
    ${connectors}
    ${heatshrinkSleeves}
    ${backgroundWires}
    ${selectedWireMarkup}
    ${heatshrinkText}
    ${spliceNodes}
    ${wireNameTags}
    ${bendHandles}
    ${shopTitleBlock}
    ${toolNote}
    ${selectedInfoBoxMarkup}
  `;
}

function buildPreviewScene() {
  const row = selectedRow();
  const active = activeRows();
  const dnp = state.rows.length - active.length;
  const total = active.reduce((sum, item) => sum + parseFloat(item.length || 0), 0);
  const selected = row && isActiveWireRow(row) ? row : {};
  const previewRows = active;
  const leftConnectors = buildConnectors(legKeys(previewRows, "left", selected), "left", previewRows, selected);
  const rightConnectors = buildConnectors(legKeys(previewRows, "right", selected), "right", previewRows, selected);
  balanceConnectorColumns(leftConnectors, rightConnectors);
  const leftMap = new Map(leftConnectors.map((connector) => [connector.key, connector]));
  const rightMap = new Map(rightConnectors.map((connector) => [connector.key, connector]));
  const routeBaseY = wireRouteBase(leftConnectors, rightConnectors, active.length);
  const previewHeight = previewCanvasHeight(leftConnectors, rightConnectors, active.length);
  const selectedWireIndex = Math.max(0, previewRows.findIndex((item) => item.id === selected.id));
  const splicePoints = buildSplicePoints(previewRows, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight);
  const routedWires = active.map((item, index) => ({
    item,
    index,
    endpoints: wireEndpoints(item, index, leftMap, rightMap, leftConnectors, splicePoints, previewHeight)
  }));
  const selectedRoute = routedWires.find((route) => route.item.id === selected.id);
  const selectedEndpoints = selectedRoute?.endpoints || wireEndpoints(
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
  const labelY = spliceSelected
    ? clamp((selectedStart.exit === "splice" ? selectedStart.y : selectedEnd.y) - 140, 74, previewHeight - 112)
    : 54;
  const cableNameText = shortLabel(state.harnessName || "", 14);
  const cableNameWidth = state.harnessName ? clamp(cableNameText.length * 10 + 40, 94, 176) : 0;
  const titleOffset = previewLayoutPoint("title");
  const cableNameCenterX = 500 + titleOffset.x;
  const cableNameY = clamp(labelY + 15 + titleOffset.y, 8, previewHeight - 54);
  return {
    row,
    active,
    dnp,
    total,
    selected,
    previewRows,
    leftConnectors,
    rightConnectors,
    leftMap,
    rightMap,
    routeBaseY,
    previewHeight,
    selectedWireIndex,
    splicePoints,
    routedWires,
    selectedRoute,
    selectedEndpoints,
    selectedStart,
    selectedEnd,
    spliceSelected,
    labelY,
    cableNameText,
    cableNameWidth,
    titleOffset,
    cableNameCenterX,
    cableNameY
  };
}

function wirePreviewPoint(event) {
  if (!dom.wirePreview) {
    return { x: 0, y: 0 };
  }

  const rect = dom.wirePreview.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return { x: 0, y: 0 };
  }

  const viewBox = value(dom.wirePreview.getAttribute("viewBox")).split(/\s+/).map(Number);
  const viewBoxWidth = Number.isFinite(viewBox[2]) ? viewBox[2] : 1000;
  const viewBoxHeight = Number.isFinite(viewBox[3]) ? viewBox[3] : 600;
  return {
    x: clamp((event.clientX - rect.left) * viewBoxWidth / rect.width, 0, viewBoxWidth),
    y: clamp((event.clientY - rect.top) * viewBoxHeight / rect.height, 0, viewBoxHeight)
  };
}

function wireRowById(rowId) {
  return state.rows.find((row) => row.id === rowId) || null;
}

function dragTargetFromEvent(event) {
  return event.target?.closest?.("[data-drag-kind], [data-wire-bend-id], [data-wire-id]") || null;
}

function dragKindForTarget(target) {
  const kind = value(target?.dataset?.dragKind);
  if (kind) {
    return kind;
  }
  if (target?.dataset?.wireBendId) {
    return "wire-bend";
  }
  if (target?.dataset?.wireId) {
    return "wire-route";
  }
  return "";
}

function dragToastForKind(kind) {
  switch (kind) {
    case "wire-route":
    case "wire-bend":
      return "Cable route updated.";
    case "wire-label":
      return "Wire name moved.";
    case "connector":
      return "Connector moved.";
    case "connector-detail":
      return "Connector info moved.";
    case "splice":
      return "Splice moved.";
    case "heatshrink":
      return "Heatshrink moved.";
    case "cable-title":
      return "Cable title moved.";
    default:
      return "Layout updated.";
  }
}

function resetDragForTarget(target) {
  const dragKind = dragKindForTarget(target);
  const row = wireRowById(target?.dataset?.wireBendId || target?.dataset?.wireId || "");
  if (dragKind === "wire-route" || dragKind === "wire-bend") {
    if (!row || !isActiveWireRow(row)) {
      return false;
    }
    rememberUndo();
    if (dragKind === "wire-bend" && target?.dataset?.wireBendIndex !== undefined) {
      removeWireRouteBend(row, target.dataset.wireBendIndex);
    } else {
      resetWireRouteOffset(row);
      resetWireRouteBend(row);
    }
    saveState();
    renderPreview();
    showToast(dragKind === "wire-bend" ? "Cable bend removed." : "Cable route reset.");
    return true;
  }

  if (dragKind === "wire-label") {
    if (!row || !isActiveWireRow(row)) {
      return false;
    }
    rememberUndo();
    resetWireLabelOffset(row);
    saveState();
    renderPreview();
    showToast("Wire name reset.");
    return true;
  }

  if (dragKind === "connector") {
    const side = value(target?.dataset?.connectorSide);
    const key = value(target?.dataset?.connectorKey);
    if (!side || !key) {
      return false;
    }
    rememberUndo();
    resetPreviewLayoutPoint("connector", side, key);
    saveState();
    renderPreview();
    showToast("Connector reset.");
    return true;
  }

  if (dragKind === "connector-detail") {
    const side = value(target?.dataset?.connectorSide);
    const key = value(target?.dataset?.connectorKey);
    if (!side || !key) {
      return false;
    }
    rememberUndo();
    resetPreviewLayoutPoint("connector-detail", side, key);
    saveState();
    renderPreview();
    showToast("Connector info reset.");
    return true;
  }

  if (dragKind === "splice") {
    const key = value(target?.dataset?.spliceKey);
    if (!key) {
      return false;
    }
    rememberUndo();
    resetPreviewLayoutPoint("splice", "", key);
    saveState();
    renderPreview();
    showToast("Splice reset.");
    return true;
  }

  if (dragKind === "heatshrink") {
    const side = value(target?.dataset?.heatshrinkSide);
    const key = value(target?.dataset?.heatshrinkKey);
    if (!side || !key) {
      return false;
    }
    rememberUndo();
    resetPreviewLayoutPoint("heatshrink", side, key);
    saveState();
    renderPreview();
    showToast("Heatshrink reset.");
    return true;
  }

  if (dragKind === "cable-title") {
    rememberUndo();
    resetPreviewLayoutPoint("title");
    saveState();
    renderPreview();
    showToast("Cable title reset.");
    return true;
  }

  return false;
}

function startWireDrag(event) {
  if (!dom.wirePreview || (event.button !== undefined && event.button !== 0)) {
    return;
  }

  const target = dragTargetFromEvent(event);
  if (!target) {
    return;
  }

  const dragKind = dragKindForTarget(target);
  const rowId = target.dataset.wireBendId || target.dataset.wireId;
  const row = rowId ? wireRowById(rowId) : null;
  const bendIndex = dragKind === "wire-bend" ? clamp(Math.round(Number(target.dataset.wireBendIndex) || 0), 0, MAX_WIRE_ROUTE_BENDS - 1) : 0;
  const bendStart = row ? wireRouteBends(row)[bendIndex] || { x: 0, y: 0 } : { x: 0, y: 0 };
  const side = value(target?.dataset?.connectorSide || target?.dataset?.heatshrinkSide);
  const key = value(target?.dataset?.connectorKey || target?.dataset?.heatshrinkKey || target?.dataset?.spliceKey);
  const hasWire = dragKind === "wire-route" || dragKind === "wire-bend" || dragKind === "wire-label";
  const hasPreviewPoint = dragKind === "connector" || dragKind === "connector-detail" || dragKind === "heatshrink" || dragKind === "splice";
  const hasTitle = dragKind === "cable-title";

  if (hasWire && (!row || !isActiveWireRow(row))) {
    return;
  }
  if (dragKind === "connector" && (!side || !key)) {
    return;
  }
  if (dragKind === "connector-detail" && (!side || !key)) {
    return;
  }
  if (dragKind === "heatshrink" && (!side || !key)) {
    return;
  }
  if (dragKind === "splice" && !key) {
    return;
  }
  if (!hasWire && !hasPreviewPoint && !hasTitle) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (row && state.selectedId !== row.id) {
    state.selectedId = row.id;
    saveState();
    syncSelectedRowClass();
    renderSummary();
    updateActionState();
    renderPreview();
  }

  const point = wirePreviewPoint(event);
  const labelOffset = row ? wireLabelOffset(row) : { x: 0, y: 0 };
  const previewPoint = (dragKind === "connector" || dragKind === "connector-detail" || dragKind === "heatshrink" || dragKind === "splice")
    ? previewLayoutPoint(dragKind, side, key)
    : dragKind === "cable-title"
      ? previewLayoutPoint("title")
      : null;
  wireDragState = {
    pointerId: event.pointerId,
    kind: dragKind,
    rowId: row?.id || "",
    side,
    key,
    mode: dragKind === "wire-bend" ? "bend" : (dragKind === "wire-route" ? "route" : "move"),
    bendIndex,
    startPoint: point,
    startOffsetX: row ? numberOrZero(row.routeOffsetX) : numberOrZero(previewPoint?.x ?? 0),
    startOffsetY: row ? numberOrZero(row.routeOffsetY) : numberOrZero(previewPoint?.y ?? 0),
    startBendX: bendStart.x,
    startBendY: bendStart.y,
    startLabelOffsetX: labelOffset.x,
    startLabelOffsetY: labelOffset.y,
    lastPoint: point,
    dragging: false,
    savedUndo: false
  };
  dom.wirePreview.style.cursor = "grabbing";
  document.addEventListener("pointermove", moveWireDrag);
  document.addEventListener("pointerup", endWireDrag);
  document.addEventListener("pointercancel", endWireDrag);
}

function moveWireDrag(event) {
  if (!wireDragState || event.pointerId !== wireDragState.pointerId) {
    return;
  }

  const row = wireDragState.rowId ? wireRowById(wireDragState.rowId) : null;
  if (wireDragState.rowId && !row) {
    return;
  }

  const point = wirePreviewPoint(event);
  wireDragState.lastPoint = point;
  const dx = point.x - wireDragState.startPoint.x;
  const dy = point.y - wireDragState.startPoint.y;
  const distance = Math.hypot(dx, dy);
  if (!wireDragState.dragging && distance < 3) {
    return;
  }

  if (!wireDragState.dragging) {
    wireDragState.dragging = true;
    if (!wireDragState.savedUndo) {
      rememberUndo();
      wireDragState.savedUndo = true;
    }
  }

  switch (wireDragState.kind) {
    case "wire-route":
      if (wireDragState.mode === "bend") {
        setWireRouteBend(row, wireDragState.startBendX + dx, wireDragState.startBendY + dy, wireDragState.bendIndex);
      } else {
        setWireRouteOffset(row, wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      }
      break;
    case "wire-bend":
      setWireRouteBend(row, wireDragState.startBendX + dx, wireDragState.startBendY + dy, wireDragState.bendIndex);
      break;
    case "wire-label":
      setWireLabelOffset(row, wireDragState.startLabelOffsetX + dx, wireDragState.startLabelOffsetY + dy);
      break;
    case "connector":
      setPreviewLayoutPoint("connector", wireDragState.side, wireDragState.key, wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      break;
    case "connector-detail":
      setPreviewLayoutPoint("connector-detail", wireDragState.side, wireDragState.key, wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      break;
    case "splice":
      setPreviewLayoutPoint("splice", "", wireDragState.key, wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      break;
    case "heatshrink":
      setPreviewLayoutPoint("heatshrink", wireDragState.side, wireDragState.key, wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      break;
    case "cable-title":
      setPreviewLayoutPoint("title", "", "", wireDragState.startOffsetX + dx, wireDragState.startOffsetY + dy);
      break;
    default:
      return;
  }
  saveState();
  renderPreview();
}

function endWireDrag(event) {
  if (!wireDragState || (event.pointerId !== undefined && event.pointerId !== wireDragState.pointerId)) {
    return;
  }

  const didDrag = wireDragState.dragging;
  const dragKind = wireDragState.kind;
  document.removeEventListener("pointermove", moveWireDrag);
  document.removeEventListener("pointerup", endWireDrag);
  document.removeEventListener("pointercancel", endWireDrag);
  wireDragState = null;
  dom.wirePreview.style.cursor = "";
  saveState();
  if (didDrag && event.type === "pointerup") {
    showToast(dragToastForKind(dragKind));
  }
}

function resetWireDrag(event) {
  const target = dragTargetFromEvent(event);
  if (!target) {
    return;
  }

  event.preventDefault();
  resetDragForTarget(target);
}

function routeShortcutDigit(event) {
  if (event.repeat) {
    return "";
  }

  if (event.code === "Digit9" || event.code === "Numpad9" || event.key === "9") {
    return "9";
  }
  if (event.code === "Digit8" || event.code === "Numpad8" || event.key === "8") {
    return "8";
  }
  if (event.code === "Digit7" || event.code === "Numpad7" || event.key === "7") {
    return "7";
  }

  return "";
}

function handleWireRouteShortcut(event) {
  const digit = routeShortcutDigit(event);
  if (!digit) {
    return;
  }

  const target = event.target;
  const tagName = value(target?.tagName).toLowerCase();
  if (target?.isContentEditable || ["input", "textarea", "select"].includes(tagName)) {
    return;
  }

  if (!wireDragState || !["wire-route", "wire-bend"].includes(wireDragState.kind)) {
    return;
  }

  const row = wireRowById(wireDragState.rowId);
  if (!row || !isActiveWireRow(row)) {
    return;
  }

  event.preventDefault();
  if (!wireDragState.savedUndo) {
    rememberUndo();
    wireDragState.savedUndo = true;
  }

  if (digit === "7") {
    resetWireRouteOffset(row);
    resetWireRouteBend(row);
    wireDragState.mode = "route";
    wireDragState.bendIndex = 0;
    wireDragState.startPoint = wireDragState.lastPoint || wireDragState.startPoint;
    wireDragState.startOffsetX = 0;
    wireDragState.startOffsetY = 0;
    wireDragState.startBendX = 0;
    wireDragState.startBendY = 0;
    saveState();
    renderPreview();
    showToast("Cable route straightened.");
    return;
  }

  if (digit === "8") {
    const bends = wireRouteBends(row);
    if (!bends.length) {
      showToast("This wire has no bend points to remove.");
      return;
    }

    const removeIndex = wireDragState.kind === "wire-bend"
      ? wireDragState.bendIndex
      : bends.length - 1;
    const nextIndex = removeWireRouteBend(row, removeIndex);
    const nextBend = nextIndex >= 0 ? wireRouteBends(row)[nextIndex] : null;
    wireDragState.mode = nextBend ? "bend" : "route";
    wireDragState.bendIndex = Math.max(0, nextIndex);
    wireDragState.startPoint = wireDragState.lastPoint || wireDragState.startPoint;
    wireDragState.startOffsetX = numberOrZero(row.routeOffsetX);
    wireDragState.startOffsetY = numberOrZero(row.routeOffsetY);
    wireDragState.startBendX = nextBend ? nextBend.x : 0;
    wireDragState.startBendY = nextBend ? nextBend.y : 0;
    saveState();
    renderPreview();
    showToast("Removed a bend point.");
    return;
  }

  const point = wireDragState.lastPoint || wireDragState.startPoint;
  if (!point) {
    return;
  }

  const bendIndex = addWireRouteBend(row, point.x, point.y);
  if (bendIndex < 0) {
    showToast(`This wire already has ${MAX_WIRE_ROUTE_BENDS} bend points.`);
    return;
  }
  wireDragState.mode = "bend";
  wireDragState.bendIndex = bendIndex;
  wireDragState.startPoint = point;
  wireDragState.startBendX = point.x;
  wireDragState.startBendY = point.y;
  saveState();
  renderPreview();
  showToast("Added a bend point.");
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

  const entries = [...groups.entries()].map(([spliceId, group]) => ({
    spliceId,
    group,
    tapPosition: spliceGroupTapPosition(group)
  }));
  const tapPositions = entries
    .map((entry) => entry.tapPosition)
    .filter((position) => Number.isFinite(position));
  const tapBounds = tapPositions.length
    ? { min: Math.min(...tapPositions), max: Math.max(...tapPositions) }
    : null;
  const reservedY = [];
  return new Map(entries
    .sort((left, right) => {
      const leftTap = Number.isFinite(left.tapPosition) ? left.tapPosition : null;
      const rightTap = Number.isFinite(right.tapPosition) ? right.tapPosition : null;
      if (leftTap !== null && rightTap !== null && leftTap !== rightTap) {
        return leftTap - rightTap;
      }
      if (leftTap !== null) {
        return -1;
      }
      if (rightTap !== null) {
        return 1;
      }
      return left.spliceId.localeCompare(right.spliceId, undefined, { numeric: true });
    })
    .map((entry, index) => {
      const { spliceId, group, tapPosition } = entry;
      const parentRows = group.filter((row) => normalizedSpliceRole(row) === "PARENT").map((row) => row.id);
      const branchRows = group.filter((row) => normalizedSpliceRole(row) === "BRANCH").map((row) => row.id);
      const lanes = spliceConductorLanes(group);
      const placement = splicePlacementForGroup(group, index, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight, tapBounds, tapPosition);
      let y = placement.y;
      while (reservedY.some((usedY) => Math.abs(usedY - y) < 36)) {
        y = clamp(y + 40, 92, previewHeight - 74);
        if (reservedY.some((usedY) => Math.abs(usedY - y) < 36) && y >= previewHeight - 74) {
          y = placement.y;
          break;
        }
      }
      reservedY.push(y);
      const offset = previewLayoutPoint("splice", "", spliceId);
      return [spliceId, {
        x: clamp(placement.x + offset.x, 64, 936),
        y: clamp(y + offset.y, 64, previewHeight - 64),
        exit: "splice",
        spliceId,
        tapPosition,
        parentCount: parentRows.length,
        branchCount: branchRows.length,
        parentRows,
        branchRows,
        lanes
      }];
    }));
}

function averageCoordinate(points, key, fallback) {
  if (!points.length) {
    return fallback;
  }
  return points.reduce((sum, point) => sum + numberOrZero(point?.[key]), 0) / points.length;
}

function spliceTapPositionForRow(row) {
  return numberOrDefault(row?.tapPosition, NaN);
}

function spliceGroupTapPosition(group) {
  const positions = group
    .map((row) => spliceTapPositionForRow(row))
    .filter((position) => Number.isFinite(position));
  if (!positions.length) {
    return NaN;
  }
  return positions.reduce((sum, position) => sum + position, 0) / positions.length;
}

function tapPositionToPreviewY(tapPosition, bounds, previewHeight) {
  const top = 92;
  const bottom = previewHeight - 74;
  const min = Number.isFinite(bounds?.min) ? bounds.min : tapPosition;
  const max = Number.isFinite(bounds?.max) ? bounds.max : tapPosition;
  if (!Number.isFinite(tapPosition) || max <= min) {
    return clamp((top + bottom) / 2, top, bottom);
  }
  const ratio = (tapPosition - min) / (max - min);
  return clamp(bottom - ratio * (bottom - top), top, bottom);
}

function spliceEndpointPoint(row, role, leftMap, rightMap, leftConnectors, rightConnectors) {
  if (role === "PARENT") {
    const connector = leftMap.get(legKey(row.leftLeg)) || leftConnectors[0];
    return connector ? pinPoint(connector, row.leftPin, "left") : null;
  }

  if (role === "BRANCH" && row.rightLeg) {
    const connector = rightMap.get(legKey(row.rightLeg)) || rightConnectors[0];
    return connector ? pinPoint(connector, row.rightPin || "1", "right") : null;
  }

  return null;
}

function splicePlacementForGroup(group, index, leftMap, rightMap, leftConnectors, rightConnectors, previewHeight, tapBounds = null, tapPosition = NaN) {
  const parentPoints = [];
  const branchPoints = [];
  group.forEach((row) => {
    const role = normalizedSpliceRole(row);
    const point = spliceEndpointPoint(row, role, leftMap, rightMap, leftConnectors, rightConnectors);
    if (!point) {
      return;
    }
    if (role === "PARENT") {
      parentPoints.push(point);
    } else if (role === "BRANCH") {
      branchPoints.push(point);
    }
  });

  const fallbackX = 500 + (index % 2 === 0 ? -18 : 18);
  const fallbackY = 118 + index * 72;
  const parentX = averageCoordinate(parentPoints, "x", fallbackX - 180);
  const branchX = averageCoordinate(branchPoints, "x", fallbackX + 180);
  const yPoints = branchPoints.length ? branchPoints : parentPoints;
  const inferredY = clamp(averageCoordinate(yPoints, "y", fallbackY), 92, previewHeight - 74);
  const y = Number.isFinite(tapPosition)
    ? tapPositionToPreviewY(tapPosition, tapBounds, previewHeight)
    : inferredY;

  if (parentPoints.length && branchPoints.length) {
    const span = Math.max(1, Math.abs(branchX - parentX));
    const branchOffset = clamp(span * 0.12, 72, 130);
    const x = branchX >= parentX
      ? parentX + branchOffset
      : parentX - branchOffset;
    return { x: clamp(x, 96, 904), y };
  }

  if (parentPoints.length) {
    const x = parentX + (leftConnectors.length ? 260 : 0) + (index % 2 === 0 ? -18 : 18);
    return { x: clamp(x, 96, 904), y };
  }

  if (branchPoints.length) {
    const x = branchX + (rightConnectors.length ? -160 : 0) + (index % 2 === 0 ? -18 : 18);
    return { x: clamp(x, 96, 904), y };
  }

  return { x: clamp(fallbackX, 96, 904), y };
}

function spliceWireKey(row) {
  const name = cleanCell(row?.name).toUpperCase();
  if (name) {
    return `NAME|${name}`;
  }
  const color = cleanCell(row?.color).toUpperCase();
  if (color) {
    return `COLOR|${color}`;
  }
  return `ROW|${row?.id || ""}`;
}

function spliceLaneLabel(key) {
  return key.replace(/^(?:NAME|COLOR|ROW)\|/, "");
}

function spliceConductorLanes(rows) {
  const lanes = new Map();
  rows.forEach((row) => {
    const key = spliceWireKey(row);
    if (!lanes.has(key)) {
      lanes.set(key, {
        key,
        label: spliceLaneLabel(key),
        parentRows: [],
        branchRows: []
      });
    }
    const lane = lanes.get(key);
    if (normalizedSpliceRole(row) === "PARENT") {
      lane.parentRows.push(row.id);
    } else {
      lane.branchRows.push(row.id);
    }
  });
  return [...lanes.values()].sort((left, right) => {
    const leftFirst = left.parentRows[0] || left.branchRows[0] || "";
    const rightFirst = right.parentRows[0] || right.branchRows[0] || "";
    const leftIndex = rows.findIndex((row) => row.id === leftFirst);
    const rightIndex = rows.findIndex((row) => row.id === rightFirst);
    return leftIndex - rightIndex || left.label.localeCompare(right.label, undefined, { numeric: true });
  });
}

function spliceSpreadOffset(index, count, gap = 7) {
  if (count <= 1) {
    return 0;
  }
  return Math.round((index - (count - 1) / 2) * gap);
}

function spliceLaneY(point, laneIndex = 0) {
  const laneCount = Math.max(1, point.lanes?.length || 1);
  return point.y + spliceSpreadOffset(laneIndex, laneCount, 18);
}

function splicePortForIndex(point, role, index, count, laneIndex = 0) {
  const safeIndex = Math.max(0, index);
  const safeCount = Math.max(1, count);
  const y = spliceLaneY(point, laneIndex);
  if (role === "parent") {
    return {
      x: point.x - 62,
      y: y + spliceSpreadOffset(safeIndex, safeCount, 3),
      exit: "splice-left",
      side: "splice",
      edgeX: point.x - 88,
      spliceId: point.spliceId
    };
  }

  const armOffset = spliceSpreadOffset(safeIndex, safeCount, 12);
  return {
    x: point.x + 62,
    y: y + armOffset,
    exit: "splice-right",
    side: "splice",
    edgeX: point.x + 88,
    spliceId: point.spliceId
  };
}

function spliceLaneForRow(point, row) {
  const lanes = point.lanes || [];
  const rowId = row?.id || "";
  const index = lanes.findIndex((lane) => lane.parentRows.includes(rowId) || lane.branchRows.includes(rowId));
  if (index >= 0) {
    return { lane: lanes[index], index };
  }

  const key = spliceWireKey(row);
  const keyIndex = lanes.findIndex((lane) => lane.key === key);
  if (keyIndex >= 0) {
    return { lane: lanes[keyIndex], index: keyIndex };
  }

  return {
    lane: {
      key,
      label: spliceLaneLabel(key),
      parentRows: [],
      branchRows: []
    },
    index: 0
  };
}

function splicePortForRow(point, row, role) {
  const { lane, index: laneIndex } = spliceLaneForRow(point, row);
  const rows = role === "parent" ? lane.parentRows || [] : lane.branchRows || [];
  const index = Math.max(0, rows.indexOf(row?.id || ""));
  const count = Math.max(1, rows.length);
  return splicePortForIndex(point, role, index, count, laneIndex);
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
      end: splicePortForRow(splice, item, "parent")
    };
  }

  if (role === "BRANCH") {
    return {
      start: splicePortForRow(splice, item, "branch"),
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
    const stroke = isSelected ? "#f2c84b" : "#596861";
    const lanes = point.lanes?.length ? point.lanes : [{
      key: `${point.spliceId}|default`,
      label: point.spliceId,
      parentRows: point.parentRows || [],
      branchRows: point.branchRows || []
    }];
    const laneMarkup = lanes.map((lane, laneIndex) => {
      const laneY = spliceLaneY(point, laneIndex);
      const parentPorts = Array.from({ length: lane.parentRows.length }, (_, index) => splicePortForIndex(point, "parent", index, lane.parentRows.length, laneIndex));
      const branchPorts = Array.from({ length: lane.branchRows.length }, (_, index) => splicePortForIndex(point, "branch", index, lane.branchRows.length, laneIndex));
      const parentPortMarkup = parentPorts.map((port) => `
        <path class="splice-port-lead" d="M ${port.x} ${port.y} H ${point.x}" />
      `).join("");
      const branchPortMarkup = branchPorts.map((port) => {
        return `<path class="splice-port-lead" d="M ${point.x} ${laneY} C ${point.x + 18} ${laneY}, ${point.x + 32} ${port.y}, ${port.x} ${port.y}" />`;
      }).join("");
      return `
        <g class="splice-lane">
          ${parentPortMarkup}
          ${branchPortMarkup}
          <circle cx="${point.x}" cy="${laneY}" r="6" fill="${isSelected ? "#263028" : "#1b221e"}" stroke="${stroke}" stroke-width="${isSelected ? 2.4 : 1.6}" />
        </g>
      `;
    }).join("");
    const topY = Math.min(...lanes.map((_, laneIndex) => spliceLaneY(point, laneIndex))) - 20;
    const bottomY = Math.max(...lanes.map((_, laneIndex) => spliceLaneY(point, laneIndex))) + 20;
    const tapLabel = Number.isFinite(point.tapPosition) ? ` @ ${point.tapPosition} in` : "";
    return `
      <g class="splice-node" data-drag-kind="splice" data-splice-key="${escapeXml(point.spliceId)}" aria-label="${escapeXml(`${point.spliceId} splice junction`)}">
        <title>${escapeXml(`${point.spliceId}: ${point.parentCount} parent / ${point.branchCount} branch${tapLabel}`)}</title>
        <rect class="splice-hit" x="${point.x - 70}" y="${topY}" width="140" height="${bottomY - topY}" rx="8" />
        ${laneMarkup}
      </g>
    `;
  }).join("");
}

function renderSheetBackdrop(previewHeight) {
  const margin = 28;
  const width = 1000;
  const innerWidth = width - margin * 2;
  const innerHeight = previewHeight - margin * 2;
  const columnCount = 6;
  const rowCount = Math.max(3, Math.ceil(innerHeight / 170));
  const gridLines = [];

  for (let x = margin; x <= width - margin + 0.1; x += 40) {
    gridLines.push(`<line x1="${Math.round(x)}" y1="${margin}" x2="${Math.round(x)}" y2="${previewHeight - margin}" class="shop-grid-line" />`);
  }
  for (let y = margin; y <= previewHeight - margin + 0.1; y += 40) {
    gridLines.push(`<line x1="${margin}" y1="${Math.round(y)}" x2="${width - margin}" y2="${Math.round(y)}" class="shop-grid-line" />`);
  }

  const zoneLines = [];
  const columnLabels = Array.from({ length: columnCount }, (_, index) => String.fromCharCode(65 + index));
  columnLabels.forEach((label, index) => {
    const x = margin + index * innerWidth / columnCount;
    const nextX = margin + (index + 1) * innerWidth / columnCount;
    const centerX = (x + nextX) / 2;
    zoneLines.push(`<line x1="${Math.round(x)}" y1="${margin}" x2="${Math.round(x)}" y2="${previewHeight - margin}" class="shop-zone-line" />`);
    zoneLines.push(`<text x="${Math.round(centerX)}" y="21" text-anchor="middle" class="shop-zone-label">${label}</text>`);
    zoneLines.push(`<text x="${Math.round(centerX)}" y="${previewHeight - 10}" text-anchor="middle" class="shop-zone-label">${label}</text>`);
  });
  zoneLines.push(`<line x1="${width - margin}" y1="${margin}" x2="${width - margin}" y2="${previewHeight - margin}" class="shop-zone-line" />`);

  Array.from({ length: rowCount }, (_, index) => index + 1).forEach((label, index) => {
    const y = margin + index * innerHeight / rowCount;
    const nextY = margin + (index + 1) * innerHeight / rowCount;
    const centerY = (y + nextY) / 2 + 4;
    zoneLines.push(`<line x1="${margin}" y1="${Math.round(y)}" x2="${width - margin}" y2="${Math.round(y)}" class="shop-zone-line" />`);
    zoneLines.push(`<text x="14" y="${Math.round(centerY)}" text-anchor="middle" class="shop-zone-label">${label}</text>`);
    zoneLines.push(`<text x="${width - 14}" y="${Math.round(centerY)}" text-anchor="middle" class="shop-zone-label">${label}</text>`);
  });
  zoneLines.push(`<line x1="${margin}" y1="${previewHeight - margin}" x2="${width - margin}" y2="${previewHeight - margin}" class="shop-zone-line" />`);

  return `
    <rect x="0" y="0" width="${width}" height="${previewHeight}" fill="#d9ddda" />
    <rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" fill="#eef0ed" stroke="#6f7871" stroke-width="2.2" class="shop-sheet-border" />
    ${gridLines.join("")}
    ${zoneLines.join("")}
  `;
}

function renderShopTitleBlock(rows, previewHeight) {
  const total = rows.reduce((sum, row) => sum + parseFloat(row.length || 0), 0);
  const totalText = Number.isFinite(total) && total > 0
    ? `${Number.isInteger(total) ? total : total.toFixed(1)} in`
    : "-";
  const x = 704;
  const y = Math.max(38, previewHeight - 132);
  const date = new Date().toLocaleDateString();
  return `
    <g class="shop-title-block">
      <rect x="${x}" y="${y}" width="260" height="86" rx="3" />
      <line x1="${x}" y1="${y + 28}" x2="${x + 260}" y2="${y + 28}" />
      <line x1="${x + 128}" y1="${y + 28}" x2="${x + 128}" y2="${y + 86}" />
      <line x1="${x}" y1="${y + 57}" x2="${x + 260}" y2="${y + 57}" />
      <text x="${x + 12}" y="${y + 19}" class="shop-title-primary">${escapeXml(shortLabel(state.harnessName || "UNTITLED HARNESS", 27))}</text>
      <text x="${x + 10}" y="${y + 45}">WIRES: ${rows.length}</text>
      <text x="${x + 138}" y="${y + 45}">TOTAL: ${escapeXml(totalText)}</text>
      <text x="${x + 10}" y="${y + 74}">REV: ${APP_VERSION}</text>
      <text x="${x + 138}" y="${y + 74}">DATE: ${escapeXml(date)}</text>
    </g>
  `;
}

function connectorRowsForSide(connector, rows) {
  return rows
    .filter(isActiveWireRow)
    .filter((row) => rowUsesSide(row, connector.side))
    .filter((row) => connector.side === "left"
      ? legKey(row.leftLeg) === connector.key
      : legKey(row.rightLeg) === connector.key);
}

function connectorPinoutRows(connector, routedWires) {
  const rows = connectorRowsForSide(connector, routedWires.map((route) => route.item));
  return rows.map((row) => ({
    row,
    pin: numberOrDefault(connector.side === "left" ? row.leftPin : row.rightPin, 0),
    wire: value(row.name).trim() || "-",
    color: wireColorNotation(row) || "UNSET",
    awg: wireAwgLabel(row) || "-"
  })).sort((left, right) => left.pin - right.pin || left.wire.localeCompare(right.wire));
}

function renderConnectorFacePins(connector, pinoutRows, x, y, width, height) {
  const usedPins = new Set(pinoutRows.map((item) => item.pin).filter(Boolean));
  const explicitPins = connector.positionData.map((item) => item.position).filter(Boolean);
  const basePins = Array.from({ length: Math.min(16, Math.max(1, connector.pinCount || 1)) }, (_, index) => index + 1);
  const pins = [...new Set([...explicitPins, ...usedPins, ...basePins])]
    .filter(Boolean)
    .sort((left, right) => left - right);
  const visiblePins = pins.slice(0, 16);
  const columns = visiblePins.length <= 2 ? Math.max(1, visiblePins.length) : visiblePins.length <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(visiblePins.length / columns));
  const stepX = width / columns;
  const stepY = height / rows;
  const pinMarkup = visiblePins.map((pin, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cx = x + stepX * col + stepX / 2;
    const cy = y + stepY * row + stepY / 2;
    const used = usedPins.has(pin);
    return `
      <circle cx="${cx}" cy="${cy}" r="${used ? 6.2 : 5.2}" fill="${used ? "#f7fbf5" : "#c9d1ca"}" stroke="${used ? "#2f8e6e" : "#7c8780"}" stroke-width="1.7" />
      <text x="${cx}" y="${cy + 3.4}" text-anchor="middle" class="connector-face-pin">${pin}</text>
    `;
  }).join("");
  const more = pins.length > visiblePins.length
    ? `<text x="${x + width}" y="${y + height + 12}" text-anchor="end" class="connector-detail-muted">+${pins.length - visiblePins.length}</text>`
    : "";

  return `
    <rect x="${x - 5}" y="${y - 7}" width="${width + 10}" height="${height + 13}" rx="6" class="connector-face-box" />
    <path d="M ${x + width / 2 - 13} ${y - 7} L ${x + width / 2} ${y - 19} L ${x + width / 2 + 13} ${y - 7}" class="connector-face-key" />
    ${pinMarkup}
    ${more}
  `;
}

function renderConnectorDetailPanel(connector, routedWires, previewHeight) {
  const rows = connectorPinoutRows(connector, routedWires);
  const visibleRows = rows.slice(0, 5);
  const panelWidth = 174;
  const panelHeight = 128 + visibleRows.length * 15 + (rows.length > visibleRows.length ? 14 : 0);
  const desiredX = connector.side === "left"
    ? connector.x + connector.width + 18
    : connector.x - panelWidth - 18;
  const offset = previewLayoutPoint("connector-detail", connector.side, connector.key);
  const x = clamp(desiredX + offset.x, 36, 1000 - panelWidth - 36);
  const y = clamp(connector.y - 8 + offset.y, 38, Math.max(38, previewHeight - panelHeight - 38));
  const tableX = x + 78;
  const tableY = y + 56;
  const rowMarkup = visibleRows.map((item, index) => {
    const rowY = tableY + 18 + index * 15;
    return `
      <g>
        <text x="${tableX}" y="${rowY}" class="connector-table-pin">P${item.pin || "-"}</text>
        <rect x="${tableX + 27}" y="${rowY - 9}" width="10" height="8" rx="2" fill="${wireBaseColor(item.row)}" stroke="#59645d" stroke-width="0.8" />
        <text x="${tableX + 43}" y="${rowY}" class="connector-table-text">${escapeXml(shortLabel(item.wire, 9))}</text>
      </g>
    `;
  }).join("");
  const moreRows = rows.length > visibleRows.length
    ? `<text x="${tableX}" y="${tableY + 18 + visibleRows.length * 15}" class="connector-detail-muted">+${rows.length - visibleRows.length} more pins</text>`
    : "";

  return `
    <g class="connector-detail-panel connector-face-panel connector-pinout-table" data-drag-kind="connector-detail" data-connector-side="${escapeXml(connector.side)}" data-connector-key="${escapeXml(connector.key)}" aria-label="Connector info ${escapeXml(connector.key)}">
      <rect class="connector-detail-hit" x="${x - 8}" y="${y - 8}" width="${panelWidth + 16}" height="${panelHeight + 16}" rx="8" />
      <rect class="connector-detail-bg" x="${x}" y="${y}" width="${panelWidth}" height="${panelHeight}" rx="5" />
      <text x="${x + 10}" y="${y + 19}" class="connector-detail-title">${escapeXml(shortLabel(`CONN ${connector.key}`, 17))}</text>
      <text x="${x + 10}" y="${y + 35}" class="connector-detail-sub">${escapeXml(shortLabel(connector.housing || "Housing", 23))}</text>
      ${renderConnectorFacePins(connector, rows, x + 13, y + 61, 50, 46)}
      <text x="${x + 10}" y="${y + 124}" class="connector-detail-muted">VIEWED FROM MATING FACE</text>
      <text x="${tableX}" y="${tableY}" class="connector-table-head">PIN</text>
      <text x="${tableX + 43}" y="${tableY}" class="connector-table-head">WIRE</text>
      ${rowMarkup}
      ${moreRows}
    </g>
  `;
}

function renderConnectorDetailPanels(connectors, routedWires, previewHeight) {
  return connectors
    .map((connector) => renderConnectorDetailPanel(connector, routedWires, previewHeight))
    .join("");
}

function renderFormboardFixturePins(routedWires, connectors, splicePoints, routeBaseY, previewHeight) {
  const points = [];
  const addPoint = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }
    const clamped = {
      x: clamp(Math.round(x), 40, 960),
      y: clamp(Math.round(y), 40, previewHeight - 40)
    };
    const nearExisting = points.some((point) => Math.hypot(point.x - clamped.x, point.y - clamped.y) < 34);
    if (!nearExisting) {
      points.push(clamped);
    }
  };

  connectors.forEach((connector) => {
    addPoint(connector.x + connector.width / 2, connector.y + connector.height + 16);
  });
  [...splicePoints.values()].forEach((point) => addPoint(point.x, point.y + 34));
  routedWires.forEach(({ item, index, endpoints }) => {
    const pathPoints = wireRoutePoints(endpoints.start, endpoints.end, index, routeBaseY, routedWires.length, item);
    pathPoints.slice(1, -1).forEach((point) => addPoint(point.x, point.y));
  });

  return points.slice(0, 28).map((point, index) => `
    <g class="formboard-pin">
      <circle cx="${point.x}" cy="${point.y}" r="6" />
      <path d="M ${point.x - 9} ${point.y} H ${point.x + 9} M ${point.x} ${point.y - 9} V ${point.y + 9}" />
      <text x="${point.x + 10}" y="${point.y - 8}">FB${index + 1}</text>
    </g>
  `).join("");
}

function buildConnectors(keys, side, rows, selected) {
  if (!keys.length) {
    return [];
  }

  const gap = 112;
  const top = 72;
  let y = top;

  return keys.map((key, index) => {
    const housing = connectorHousing(key, side, rows, selected);
    const pinCount = housingPositionCount(housing);
    const family = housingFamily(housing);
    const positionData = connectorPositionData(key, side, rows);
    const hasExplicitCount = housingHasExplicitPositionCount(housing);
    const maxUsedPosition = positionData.reduce((max, item) => Math.max(max, item.position), 0);
    const scalableMolex = family === "molex" && isMicroFitMolexHousing(housing);
    const connectorPinCount = scalableMolex
      ? Math.max(1, Math.min(20, Math.max(maxUsedPosition, positionData.length, 2)))
      : family === "dupont" && !hasExplicitCount
      ? Math.max(pinCount, maxUsedPosition)
      : pinCount;
    const dimensionPinCount = scalableMolex
      ? connectorPinCount
      : family === "dupont" && !hasExplicitCount
      ? Math.max(1, positionData.length || connectorPinCount)
      : connectorPinCount;
    const rowMode = family === "minifit"
      ? minifitRowMode(housing, connectorPinCount)
      : family === "molex"
        ? molexMicroFitRowMode(housing, connectorPinCount)
        : "";
    const dimensions = connectorDimensions(family, dimensionPinCount, positionData.length, rowMode);
    const baseX = side === "left" ? 38 : 1000 - 38 - dimensions.width;
    const x = side === "right"
      ? rightConnectorCrescentX(baseX, index, keys.length, dimensions.width)
      : baseX;
    const offset = previewLayoutPoint("connector", side, key);
    const connector = {
      key,
      side,
      x: x + offset.x,
      y: y + offset.y,
      width: dimensions.width,
      height: dimensions.height,
      housing,
      pinCount: connectorPinCount,
      positionData,
      family,
      rowMode,
      gender: housingGender(housing)
    };
    y += dimensions.height + gap;
    return connector;
  });
}

function rightConnectorCrescentX(baseX, index, count, width) {
  if (count <= 1) {
    return baseX;
  }

  const progress = count <= 1 ? 0 : index / Math.max(1, count - 1);
  const outerShift = count >= 4 ? 118 : count === 3 ? 82 : 46;
  const middleRelief = count >= 4 ? 44 : count === 3 ? 28 : 0;
  const shift = outerShift - middleRelief * Math.sin(progress * Math.PI);
  return Math.round(clamp(baseX - shift, 590, 1000 - width - 24));
}

function balanceConnectorColumns(leftConnectors, rightConnectors) {
  if (!leftConnectors.length || !rightConnectors.length) {
    return;
  }

  const leftTop = connectorTop(leftConnectors, []);
  const leftBottom = connectorBottom(leftConnectors, []);
  const rightTop = connectorTop([], rightConnectors);
  const rightBottom = connectorBottom([], rightConnectors);
  const rightHeight = rightBottom - rightTop;
  const leftHeight = leftBottom - leftTop;
  if (rightHeight <= leftHeight + 160) {
    return;
  }

  const targetTop = Math.round(rightTop + Math.min(160, rightHeight * 0.14));
  const shift = Math.max(0, targetTop - leftTop);
  leftConnectors.forEach((connector) => {
    connector.y += shift;
  });
}

function housingPositionCount(housing) {
  const housingText = value(housing).toUpperCase();
  if (housingText.includes("BARREL")) {
    return 2;
  }
  if (housingText.includes("CPC")) {
    return 16;
  }
  if (housingText.includes("RJ45") || housingText.includes("8P8C")) {
    return 8;
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
    || housingText.includes("CPC")
    || housingText.includes("RJ45")
    || housingText.includes("8P8C")
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
  if (text.includes("CPC")) {
    return "cpc";
  }
  if (text.includes("MINI-FIT")) {
    return "minifit";
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
  if (isMotorEscHousingText(text) || text === "PCB") {
    return "pcb";
  }
  if (text.includes("RJ45") || text.includes("8P8C")) {
    return "rj45";
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
  if (isResistorHousingText(text)) {
    return "resistor";
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

function minifitRowMode(housing, pinCount) {
  const text = value(housing).trim().toUpperCase();
  if (text.includes("SINGLE ROW")) {
    return "single";
  }
  if (text.includes("DUAL ROW")) {
    return "dual";
  }
  return pinCount === 1 ? "single" : "dual";
}

function isMicroFitMolexHousing(housing) {
  const text = value(housing).trim().toUpperCase();
  return housingFamily(housing) === "molex"
    && !text.includes("MINI-FIT")
    && (text.includes("MICRO-FIT") || text.includes("FRONT LOCK") || text.includes("SIDE LOCK"));
}

function molexMicroFitRowMode(housing, pinCount) {
  const text = value(housing).trim().toUpperCase();
  if (text.includes("SIDE")) {
    return pinCount > 1 ? "dual" : "single";
  }
  return "single";
}

function connectorDimensions(family, pinCount, positionCount, rowMode = "") {
  if (family === "subconn") {
    return { width: 176, height: 176 };
  }
  if (family === "cpc") {
    return { width: 176, height: 176 };
  }
  if (family === "minifit") {
    const count = Math.max(1, pinCount || 1);
    const dualRow = rowMode !== "single" && count > 1;
    const columns = dualRow ? Math.max(1, Math.ceil(count / 2)) : count;
    return {
      width: clamp(76 + Math.max(0, columns - 1) * 30, 120, 368),
      height: dualRow ? 128 : 94
    };
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
  if (family === "rj45") {
    return { width: 196, height: 132 };
  }
  if (family === "barrel") {
    return { width: 156, height: 86 };
  }
  if (family === "splice") {
    return { width: 164, height: 88 };
  }
  if (family === "resistor") {
    return { width: 150, height: 72 };
  }
  if (family === "molex") {
    const count = Math.max(1, Math.min(20, pinCount || 1));
    const dualRow = rowMode === "dual" && count > 1;
    const columns = dualRow ? Math.ceil(count / 2) : count;
    return {
      width: clamp(82 + Math.max(0, columns - 1) * 28, 96, 360),
      height: dualRow ? 106 : 84
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

function connectorTop(leftConnectors, rightConnectors) {
  const allConnectors = [...leftConnectors, ...rightConnectors];
  if (!allConnectors.length) {
    return 54;
  }

  return Math.floor(Math.min(...allConnectors.map((connector) => connector.y)));
}

function wireRouteBase(leftConnectors, rightConnectors, wireCount = 0) {
  const top = connectorTop(leftConnectors, rightConnectors);
  const bottom = connectorBottom(leftConnectors, rightConnectors);
  const leftBottom = leftConnectors.length ? connectorBottom(leftConnectors, []) : bottom;
  const routeSpan = Math.max(0, Math.max(1, wireCount) - 1) * WIRE_LANE_GAP;
  const centeredBase = (top + bottom) / 2 - routeSpan / 2;
  const sourceDropBase = leftBottom + 92;
  const lowerBound = Math.max(240, sourceDropBase);
  const upperBound = Math.max(lowerBound, bottom - routeSpan - 140);
  return Math.round(clamp(Math.max(centeredBase, sourceDropBase), lowerBound, upperBound));
}

function previewCanvasHeight(leftConnectors, rightConnectors, wireCount = 0) {
  const routeBaseY = wireRouteBase(leftConnectors, rightConnectors, wireCount);
  return Math.max(
    360,
    connectorBottom(leftConnectors, rightConnectors) + 92,
    routeBaseY + Math.max(1, wireCount) * WIRE_LANE_GAP + 72
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

function cpcContactPoint(connector, pin) {
  const safePin = Math.max(1, Math.min(16, numberOrDefault(pin, 1)));
  const layout = CPC_CONTACT_LOOKUP.get(safePin) || CPC_CONTACT_LAYOUT[0];
  const faceCenterX = connector.x + connector.width / 2;
  const faceCenterY = connector.y + 80;
  return {
    x: faceCenterX + layout.dx,
    y: faceCenterY + layout.dy
  };
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

function barrelTerminalPoint(connector, pin, side) {
  const safePin = Math.max(1, Math.min(2, numberOrDefault(pin, 1)));
  const barrel = barrelGeometry(connector);
  return safePin === 1 ? barrel.positive : barrel.negative;
}

function resistorTerminalPoint(connector, pin) {
  const safePin = Math.max(1, Math.min(2, numberOrDefault(pin, 1)));
  return {
    x: safePin === 1 ? connector.x + 30 : connector.x + connector.width - 30,
    y: connector.y + connector.height - 14
  };
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
  if (connector.family === "cpc") {
    for (let position = 1; position <= 16; position += 1) {
      if (!visiblePositions.includes(position)) {
        visiblePositions.push(position);
      }
    }
    visiblePositions.sort((left, right) => left - right);
  }
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
      ${renderConnectorPin(connector, point, port, pin, isSelected, isUsed, side)}
    `;
  }).join("");
  return `
    <g class="connector-group" data-drag-kind="connector" data-connector-side="${side}" data-connector-key="${escapeXml(connector.key)}" aria-label="Connector ${escapeXml(side)} ${escapeXml(connector.key)}">
      <rect class="connector-hit" x="${connector.x - 14}" y="${connector.y - 14}" width="${connector.width + 28}" height="${connector.height + 28}" rx="18" />
      ${renderConnectorBody(connector)}
      ${pins}
    </g>
  `;
}

function renderConnectorLead(connector, contact, port, isSelected, isUsed, side) {
  if (connector.family === "powerpole" || connector.family === "barrel" || !isUsed) {
    return "";
  }

  const bendY = connector.y + connector.height - 12;
  return `
    <path d="M ${contact.x} ${contact.y} V ${bendY} H ${port.x} V ${port.y}" fill="none" stroke="#87958c" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity="0.72" />
    <circle cx="${port.x}" cy="${port.y}" r="4.5" fill="#dce3de" stroke="#87958c" stroke-width="2" />
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

  if (family === "cpc") {
    const isFemale = value(connector.gender).toUpperCase() === "FEMALE";
    const bodyFill = isFemale ? "#173328" : "#101614";
    const bodyStroke = isFemale ? "#6bc7a0" : "#808e87";
    const faceFill = isFemale ? "#0d1713" : "#18211d";
    const faceStroke = isFemale ? "#2f8e6e" : "#6d7a73";
    const faceY = y + 80;
    return `
      <rect x="${x + 10}" y="${y + 10}" width="${width - 20}" height="${height - 12}" rx="18" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="3" />
      <circle cx="${centerX}" cy="${faceY}" r="66" fill="${faceFill}" stroke="${faceStroke}" stroke-width="4" />
      <circle cx="${centerX}" cy="${faceY}" r="52" fill="#24312a" stroke="#0a0f0d" stroke-width="3" />
      <path d="M ${centerX - 20} ${y + 18} H ${centerX + 20} L ${centerX + 28} ${y + 6} H ${centerX - 28} Z" fill="#dfe5de" stroke="#8f9891" stroke-width="2" />
      <circle cx="${x + 28}" cy="${y + 28}" r="5" fill="#eef2ec" stroke="#8d9690" stroke-width="2" />
      <circle cx="${x + width - 28}" cy="${y + 28}" r="5" fill="#eef2ec" stroke="#8d9690" stroke-width="2" />
      <circle cx="${x + 28}" cy="${y + height - 32}" r="5" fill="#eef2ec" stroke="#8d9690" stroke-width="2" />
      <circle cx="${x + width - 28}" cy="${y + height - 32}" r="5" fill="#eef2ec" stroke="#8d9690" stroke-width="2" />
      <rect x="${x + width - 18}" y="${faceY - 13}" width="10" height="26" rx="4" fill="#0f1512" stroke="${bodyStroke}" stroke-width="1.5" />
    `;
  }

  if (family === "minifit") {
    const metrics = minifitContactMetrics(connector);
    const outerFill = "#d9d8cb";
    const outerStroke = "#7f857c";
    const innerFill = "#b8b9ad";
    const innerStroke = "#f2f4ee";
    const latchFill = "#e5e5dc";
    const latchStroke = "#89908a";
    const slotFill = "#f6f7f1";
    const slotStroke = "#8c948e";
    const slots = Array.from({ length: metrics.pinCount }, (_, index) => {
      const pin = index + 1;
      const point = minifitContactPoint(connector, pin);
      const slotX = point.x - metrics.slotWidth / 2;
      const slotY = point.y - metrics.slotHeight / 2;
      return `
        <path d="M ${slotX} ${slotY}
          H ${slotX + metrics.slotWidth}
          V ${slotY + metrics.slotHeight - 4}
          L ${point.x} ${slotY + metrics.slotHeight}
          L ${slotX} ${slotY + metrics.slotHeight - 4}
          Z" fill="${slotFill}" stroke="${slotStroke}" stroke-width="1.6" />
        <text x="${point.x}" y="${point.y + 5}" class="pin-number" text-anchor="middle">${pin}</text>
      `;
    }).join("");
    return `
      <path d="M ${x + 10} ${y + 6} H ${x + width - 10} L ${x + width} ${y + 18} V ${y + height - 10} L ${x + width - 10} ${y + height} H ${x + 10} L ${x} ${y + height - 10} V ${y + 18} Z" fill="${outerFill}" stroke="${outerStroke}" stroke-width="3" />
      <rect x="${x + 13}" y="${y + 18}" width="${width - 26}" height="${height - 28}" rx="4" fill="${innerFill}" stroke="${innerStroke}" stroke-width="2" />
      <path d="M ${centerX - 26} ${y + 3} L ${centerX - 16} ${y - 11} H ${centerX + 16} L ${centerX + 26} ${y + 3}" fill="${latchFill}" stroke="${latchStroke}" stroke-width="2" />
      <path d="M ${x + 16} ${y + height - 18} H ${x + width - 16}" stroke="#737b74" stroke-width="3" opacity="0.75" />
      ${slots}
    `;
  }

  if (family === "molex") {
    const metrics = molexMicroFitContactMetrics(connector);
    const sideLock = metrics.lockStyle === "side";
    const lockX = side === "left" ? x + width - 10 : x - 16;
    const slotFontSize = metrics.pinCount > 14 ? 8 : metrics.pinCount > 10 ? 9 : 11;
    const slots = Array.from({ length: metrics.pinCount }, (_, index) => {
      const pin = index + 1;
      const point = molexMicroFitContactPoint(connector, pin);
      const slotX = point.x - metrics.slotWidth / 2;
      const slotY = point.y - metrics.slotHeight / 2;
      return `
        <rect x="${slotX}" y="${slotY}" width="${metrics.slotWidth}" height="${metrics.slotHeight}" rx="4" fill="#070908" stroke="#edf3ee" stroke-width="1.8" />
        <text x="${point.x}" y="${slotY + metrics.slotHeight + 12}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${slotFontSize}" font-weight="900" fill="#f6a623" paint-order="stroke fill" stroke="rgba(8, 12, 10, 0.68)" stroke-width="2">${pin}</text>
      `;
    }).join("");
    return `
      <path d="M ${x + 10} ${y + 6} H ${x + width - 10} L ${x + width} ${y + 18} V ${y + height - 10} L ${x + width - 10} ${y + height} H ${x + 10} L ${x} ${y + height - 10} V ${y + 18} Z" fill="#171d1b" stroke="#8b948e" stroke-width="3" />
      <rect x="${x + 13}" y="${y + 18}" width="${width - 26}" height="${height - 30}" rx="5" fill="#050706" stroke="#3b4540" stroke-width="2.2" />
      ${sideLock
        ? `<path d="M ${lockX} ${centerY - 23} H ${lockX + 18} V ${centerY + 23} H ${lockX} Z" fill="#121817" stroke="#858f88" stroke-width="2.2" />`
        : `<path d="M ${centerX - 30} ${y + 3} L ${centerX - 20} ${y - 12} H ${centerX + 20} L ${centerX + 30} ${y + 3} Z" fill="#121817" stroke="#858f88" stroke-width="2.2" />`}
      ${slots}
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
    if (isMotorEscHousingText(connector.housing)) {
      return renderVescBoard(connector);
    }

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

  if (family === "resistor") {
    return renderResistorBody(connector);
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

  if (family === "rj45") {
    const housingText = value(connector.housing).toUpperCase();
    const isJack = housingText.includes("JACK");
    const bodyFill = isJack ? "#173328" : "#24312a";
    const bodyStroke = isJack ? "#6dc39d" : "#829089";
    const innerFill = isJack ? "#0e1713" : "#0f1512";
    const innerStroke = isJack ? "#2f8e6e" : "#46534c";
    return `
      <path d="M ${x + 9} ${y + 6} H ${x + width - 9} L ${x + width - 1} ${y + 18} V ${y + height - 11} L ${x + width - 9} ${y + height} H ${x + 9} L ${x + 1} ${y + height - 11} V ${y + 18} Z" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="3" />
      <path d="M ${centerX - 24} ${y + 1} H ${centerX - 10} L ${centerX - 2} ${y - 9} H ${centerX + 2} L ${centerX + 10} ${y + 1} H ${centerX + 24}" fill="#dfe4df" stroke="#909991" stroke-width="3" />
      <rect x="${x + 18}" y="${y + 24}" width="${width - 36}" height="${height - 54}" rx="10" fill="${innerFill}" stroke="${innerStroke}" stroke-width="2.5" />
      <rect x="${x + 26}" y="${y + height - 34}" width="${width - 52}" height="14" rx="4" fill="#161d19" stroke="${bodyStroke}" stroke-width="1.6" opacity="0.95" />
      <rect x="${x + width / 2 - 12}" y="${y + 18}" width="24" height="18" rx="4" fill="#f1f4ee" stroke="#97a29c" stroke-width="1.6" />
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

function renderVescBoard(connector) {
  const { x, y, width, height } = connector;
  const centerX = x + width / 2;
  const title = value(connector.housing).toUpperCase().includes("VESC") ? "VESC" : "ESC";
  const innerX = x + 11;
  const innerY = y + 11;
  const innerWidth = width - 22;
  const innerHeight = height - 22;
  const phaseY = y + height - 31;
  const phaseXs = [centerX - 38, centerX, centerX + 38];
  const mosfetY = y + 112;
  const mosfets = Array.from({ length: 6 }, (_, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const fetX = centerX - 49 + col * 34;
    const fetY = mosfetY + row * 27;
    return `
      <rect x="${fetX}" y="${fetY}" width="24" height="17" rx="3" fill="#1b2220" stroke="#d7d4c4" stroke-width="1.4" />
      <line x1="${fetX + 5}" y1="${fetY + 4}" x2="${fetX + 19}" y2="${fetY + 4}" stroke="#6d776f" stroke-width="1" />
    `;
  }).join("");

  const signalPads = Array.from({ length: 6 }, (_, index) => {
    const padX = x + 21 + index * Math.max(12, (width - 42) / 5);
    return `<circle cx="${padX}" cy="${y + 24}" r="3.4" fill="#d7aa42" stroke="#f5e4a7" stroke-width="1.2" />`;
  }).join("");
  const caps = [centerX - 32, centerX, centerX + 32].map((capX) => `
    <g>
      <ellipse cx="${capX}" cy="${y + 42}" rx="10" ry="4" fill="#6f7e1d" stroke="#d6df6b" stroke-width="1.3" />
      <rect x="${capX - 10}" y="${y + 42}" width="20" height="28" rx="4" fill="#9ca528" stroke="#dce37c" stroke-width="1.2" />
      <ellipse cx="${capX}" cy="${y + 70}" rx="10" ry="4" fill="#6f7e1d" stroke="#d6df6b" stroke-width="1.3" />
    </g>
  `).join("");
  const heatFins = Array.from({ length: 5 }, (_, index) => {
    const finY = y + 24 + index * 6;
    return `<line x1="${x + 18}" y1="${finY}" x2="${x + width - 18}" y2="${finY}" stroke="#54615a" stroke-width="2" opacity="0.48" />`;
  }).join("");

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="9" fill="#2b1745" stroke="#a878d5" stroke-width="3" />
    <rect x="${innerX}" y="${innerY}" width="${innerWidth}" height="${innerHeight}" rx="5" fill="#1b2530" stroke="#0a1017" stroke-width="2.2" />
    ${heatFins}
    <text x="${centerX}" y="${y + 22}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="14" font-weight="900" fill="#f3f7ef" paint-order="stroke fill" stroke="#07110d" stroke-width="2">${title}</text>
    ${caps}
    <rect x="${x + 18}" y="${y + height - 48}" width="${width - 36}" height="30" rx="5" fill="#101713" stroke="#617268" stroke-width="1.7" />
    ${phaseXs.map((phaseX, index) => `
      <circle cx="${phaseX}" cy="${phaseY}" r="8.5" fill="#c9a24a" stroke="#f6e1a0" stroke-width="2" />
      <text x="${phaseX}" y="${phaseY + 4}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="900" fill="#18211d">${["U", "V", "W"][index]}</text>
    `).join("")}
    <rect x="${x + 18}" y="${y + 76}" width="26" height="24" rx="4" fill="#2b2f2b" stroke="#d7d4c4" stroke-width="1.5" />
    <rect x="${x + width - 44}" y="${y + 76}" width="26" height="24" rx="4" fill="#2b2f2b" stroke="#d7d4c4" stroke-width="1.5" />
    <text x="${x + 31}" y="${y + 91}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="900" fill="#f5f4eb">B+</text>
    <text x="${x + width - 31}" y="${y + 91}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" font-weight="900" fill="#f5f4eb">B-</text>
    ${mosfets}
    ${signalPads}
    <path d="M ${x + 24} ${phaseY - 18} H ${phaseXs[0]} V ${phaseY - 9} M ${centerX} ${y + 84} V ${phaseY - 9} M ${x + width - 24} ${phaseY - 18} H ${phaseXs[2]} V ${phaseY - 9}" fill="none" stroke="#d7aa42" stroke-width="2.2" opacity="0.82" />
    <circle cx="${x + 22}" cy="${y + height - 20}" r="4" fill="#0b1510" stroke="#d9e3dc" stroke-width="1.5" />
    <circle cx="${x + width - 22}" cy="${y + height - 20}" r="4" fill="#0b1510" stroke="#d9e3dc" stroke-width="1.5" />
  `;
}

function renderResistorBody(connector) {
  const { x, y, width, height } = connector;
  const centerY = y + height / 2;
  const leadY = y + height - 14;
  const bodyX = x + 42;
  const bodyWidth = width - 84;
  const zigzagStart = bodyX + 7;
  const zigzagEnd = bodyX + bodyWidth - 7;
  const step = (zigzagEnd - zigzagStart) / 6;
  const zigzag = Array.from({ length: 7 }, (_, index) => {
    const px = zigzagStart + index * step;
    const py = centerY + (index % 2 === 0 ? -10 : 10);
    return `${index === 0 ? "M" : "L"} ${px} ${py}`;
  }).join(" ");

  return `
    <line x1="${x + 18}" y1="${leadY}" x2="${bodyX}" y2="${centerY}" stroke="#cfd6d0" stroke-width="5" stroke-linecap="round" />
    <line x1="${x + width - 18}" y1="${leadY}" x2="${bodyX + bodyWidth}" y2="${centerY}" stroke="#cfd6d0" stroke-width="5" stroke-linecap="round" />
    <rect x="${bodyX}" y="${centerY - 18}" width="${bodyWidth}" height="36" rx="8" fill="#d7c58d" stroke="#7f7050" stroke-width="2.4" />
    <path d="${zigzag}" fill="none" stroke="#2d2518" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="${x + width / 2}" y="${y + 18}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="900" fill="#1d261f" paint-order="stroke fill" stroke="#eef0ed" stroke-width="2">RESISTOR</text>
    <circle cx="${x + 30}" cy="${leadY}" r="5" fill="#f5f7f2" stroke="#6f7b73" stroke-width="2" />
    <circle cx="${x + width - 30}" cy="${leadY}" r="5" fill="#f5f7f2" stroke="#6f7b73" stroke-width="2" />
  `;
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

function renderConnectorPin(connector, point, port, pin, isSelected, isUsed, side) {
  const isSubconn = connector.family === "subconn";
  const isCpc = connector.family === "cpc";
  const numericPin = numberOrDefault(pin, 0);
  let contact = "";

  if (connector.family === "powerpole") {
    return `
      <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#dce3de" stroke="#65736b" stroke-width="2" />
      ${renderWireEndPinNumber(connector, point, port, pin, isUsed, side)}
    `;
  } else if (isSubconn && connector.gender === "female") {
    contact = `
      <circle cx="${point.x}" cy="${point.y}" r="6.5" fill="#111512" stroke="${isUsed ? "#d0aa54" : "#8c794b"}" stroke-width="2" />
      <circle cx="${point.x}" cy="${point.y}" r="2.6" fill="#020302" />
    `;
  } else if (isSubconn) {
    contact = `
      <circle cx="${point.x}" cy="${point.y}" r="6.5" fill="#d7b25f" stroke="${isUsed ? "#f6d986" : "#7d6636"}" stroke-width="2" />
      <circle cx="${point.x - 1.5}" cy="${point.y - 1.5}" r="1.7" fill="#fff1b7" opacity="0.8" />
    `;
  } else if (connector.family === "dupont") {
    contact = `<rect x="${point.x - 6}" y="${point.y - 6}" width="12" height="12" rx="2" fill="${isUsed ? "#d8efe2" : "#171d19"}" stroke="${isUsed ? "#41b883" : "#77847c"}" stroke-width="2" />`;
  } else if (connector.family === "minifit") {
    const metrics = minifitContactMetrics(connector);
    const markerX = point.x - metrics.slotWidth / 2 + 5;
    const markerY = point.y - metrics.slotHeight / 2 + 5;
    contact = `<rect x="${markerX}" y="${markerY}" width="8" height="8" rx="2" fill="${isUsed ? "#2f8e6e" : "#202823"}" stroke="${isUsed ? "#cdeedf" : "#8a938d"}" stroke-width="1.4" opacity="${isUsed ? "0.95" : "0.75"}" />`;
  } else if (connector.family === "rj45") {
    contact = `<rect x="${point.x - 5.5}" y="${point.y - 4}" width="11" height="8" rx="2.5" fill="${isUsed ? "#e1bb68" : "#151d18"}" stroke="${isUsed ? "#f7e0a2" : "#6d776f"}" stroke-width="1.8" />`;
  } else if (connector.family === "molex") {
    contact = `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${isUsed ? "#41b883" : "#6f756e"}" stroke="${isUsed ? "#d9f4e6" : "#f5f4eb"}" stroke-width="1.8" opacity="${isUsed ? "0.96" : "0.72"}" />`;
  } else if (isCpc) {
    const isFemale = value(connector.gender).toUpperCase() === "FEMALE";
    contact = isFemale
      ? `<circle cx="${point.x}" cy="${point.y}" r="7.2" fill="${isUsed ? "#101613" : "#151d18"}" stroke="${isUsed ? "#7bd0aa" : "#77847c"}" stroke-width="2.2" /><circle cx="${point.x}" cy="${point.y}" r="2.7" fill="${isUsed ? "#7bd0aa" : "#8b958f"}" opacity="${isUsed ? "0.8" : "0.45"}" />`
      : `<circle cx="${point.x}" cy="${point.y}" r="6.8" fill="${isUsed ? "#ecf2ed" : "#6b756f"}" stroke="${isUsed ? "#f2c84b" : "#a0a9a3"}" stroke-width="2.2" /><path d="M ${point.x - 4} ${point.y} H ${point.x + 4} M ${point.x} ${point.y - 4} V ${point.y + 4}" stroke="${isUsed ? "#2d3933" : "#eef3ed"}" stroke-width="1.7" stroke-linecap="round" />`;
  } else if (connector.family === "barrel") {
    const isPositive = numericPin === 1;
    contact = isPositive
      ? `<circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#f6fbf4" stroke="#d93a36" stroke-width="2.5" />`
      : `<circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#101613" stroke="#f6fbf4" stroke-width="2.5" />`;
  } else if (connector.family === "resistor") {
    contact = `<circle cx="${point.x}" cy="${point.y}" r="5.5" fill="${isUsed ? "#f8faf5" : "#d9dfd7"}" stroke="${isUsed ? "#7f7050" : "#8d9890"}" stroke-width="2.2" />`;
  } else {
    const fill = isUsed ? "#d8efe2" : "#f6fbf4";
    const stroke = isUsed ? "#41b883" : "#9fac9f";
    contact = `<circle cx="${point.x}" cy="${point.y}" r="5.5" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;
  }

  if (connector.family === "minifit" || connector.family === "molex") {
    return `
      ${contact}
      ${renderWireEndPinNumber(connector, point, port, pin, isUsed, side)}
    `;
  }

  return `
    ${contact}
    ${renderWireEndPinNumber(connector, point, port, pin, isUsed, side)}
  `;
}

function renderWireEndPinNumber(connector, contact, port, pin, isUsed, side) {
  if (!isUsed || !pin) {
    return "";
  }

  const label = wireEndPinNumberPosition(connector, contact, port, pin, side);
  return `<text x="${label.x}" y="${label.y}" class="wire-pin-number" text-anchor="${label.anchor}" dominant-baseline="central">${escapeXml(pin)}</text>`;
}

function wireEndPinNumberPosition(connector, contact, port, pin, side) {
  if (connector.family === "cpc") {
    const layout = CPC_CONTACT_LOOKUP.get(numberOrDefault(pin, 0)) || CPC_CONTACT_LAYOUT[0];
    const labelLeft = layout.dx < 0;
    const highContact = layout.dy < 0;
    return {
      x: contact.x + (labelLeft ? -11 : 11),
      y: contact.y + (highContact ? -8 : 8),
      anchor: labelLeft ? "end" : "start"
    };
  }

  if (port?.exit === "bottom") {
    const lift = connector.family === "powerpole" ? 15 : 12;
    return {
      x: port.x,
      y: port.y - lift,
      anchor: "middle"
    };
  }

  if (connector.family === "barrel") {
    const polarityLift = port?.polarity === "negative" ? -10 : 14;
    return {
      x: contact.x,
      y: contact.y + polarityLift,
      anchor: "middle"
    };
  }

  return {
    x: contact.x + (side === "left" ? -14 : 14),
    y: contact.y,
    anchor: side === "left" ? "end" : "start"
  };
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

function minifitContactMetrics(connector) {
  const pinCount = Math.max(1, connector?.pinCount || 1);
  const rowMode = connector?.rowMode || minifitRowMode(connector?.housing, pinCount);
  const dualRow = rowMode !== "single" && pinCount > 1;
  const bottomCount = dualRow ? Math.ceil(pinCount / 2) : pinCount;
  const topCount = dualRow ? pinCount - bottomCount : 0;
  const columns = dualRow ? Math.max(bottomCount, topCount || 1) : pinCount;
  const padX = columns === 1 ? 22 : 18;
  const pitch = columns > 1 ? (connector.width - padX * 2) / (columns - 1) : 0;
  const topY = dualRow ? connector.y + 46 : connector.y + connector.height / 2;
  const bottomY = dualRow ? connector.y + 76 : topY;
  const slotWidth = columns > 1 ? Math.max(18, Math.min(26, pitch * 0.7)) : 22;
  const slotHeight = dualRow ? 28 : 30;

  return {
    pinCount,
    rowMode,
    dualRow,
    bottomCount,
    topCount,
    columns,
    padX,
    pitch,
    topY,
    bottomY,
    slotWidth,
    slotHeight
  };
}

function minifitContactPoint(connector, pin) {
  const metrics = minifitContactMetrics(connector);
  const safePin = Math.max(1, Math.min(metrics.pinCount, numberOrDefault(pin, 1)));
  let rowIndex = 0;
  let colIndex = 0;

  if (!metrics.dualRow) {
    colIndex = metrics.pinCount - safePin;
  } else if (safePin <= metrics.bottomCount) {
    rowIndex = 1;
    colIndex = metrics.bottomCount - safePin;
  } else {
    rowIndex = 0;
    colIndex = metrics.pinCount - safePin;
  }

  return {
    x: connector.x + metrics.padX + (metrics.columns > 1 ? colIndex * metrics.pitch : 0),
    y: rowIndex === 0 ? metrics.topY : metrics.bottomY,
    rowIndex,
    colIndex
  };
}

function molexMicroFitContactMetrics(connector) {
  const pinCount = Math.max(1, Math.min(20, connector?.pinCount || 2));
  const rowMode = connector?.rowMode || molexMicroFitRowMode(connector?.housing, pinCount);
  const dualRow = rowMode === "dual" && pinCount > 1;
  const columns = dualRow ? Math.ceil(pinCount / 2) : pinCount;
  const padX = columns === 1 ? connector.width / 2 : 28;
  const pitch = columns > 1 ? (connector.width - padX * 2) / (columns - 1) : 0;
  const slotWidth = columns > 1 ? Math.max(13, Math.min(24, pitch * 0.72)) : 24;
  const slotHeight = dualRow ? 21 : 24;
  const topY = dualRow ? connector.y + 38 : connector.y + connector.height / 2 - 2;
  const bottomY = dualRow ? connector.y + 66 : topY;

  return {
    pinCount,
    rowMode,
    dualRow,
    columns,
    padX,
    pitch,
    slotWidth,
    slotHeight,
    topY,
    bottomY,
    lockStyle: rowMode === "dual" ? "side" : "front"
  };
}

function molexMicroFitContactPoint(connector, pin) {
  const metrics = molexMicroFitContactMetrics(connector);
  const safePin = Math.max(1, Math.min(metrics.pinCount, numberOrDefault(pin, 1)));
  const colIndex = metrics.dualRow ? Math.floor((safePin - 1) / 2) : safePin - 1;
  const rowIndex = metrics.dualRow ? (safePin - 1) % 2 : 0;

  return {
    x: connector.x + metrics.padX + (metrics.columns > 1 ? colIndex * metrics.pitch : 0),
    y: rowIndex === 0 ? metrics.topY : metrics.bottomY,
    rowIndex,
    colIndex
  };
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

  if (connector.family === "cpc") {
    return cpcContactPoint(connector, safePin);
  }

  if (connector.family === "minifit") {
    return minifitContactPoint(connector, safePin);
  }

  if (connector.family === "pcb") {
    return pcbTerminalPoint(connector, safePin);
  }

  if (connector.family === "dupont") {
    return dupontTerminalPoint(connector, safePin);
  }

  if (connector.family === "rj45") {
    const positionCount = Math.max(1, connector.pinCount || 8);
    const index = connectorPositionIndex(connector, safePin);
    const leftPadX = connector.x + 18;
    const rightPadX = connector.x + connector.width - 18;
    return {
      x: positionCount === 1
        ? connector.x + connector.width / 2
        : leftPadX + index * ((rightPadX - leftPadX) / Math.max(1, positionCount - 1)),
      y: connector.y + connector.height - 28
    };
  }

  if (connector.family === "molex") {
    return molexMicroFitContactPoint(connector, safePin);
  }

  if (connector.family === "barrel") {
    return barrelTerminalPoint(connector, safePin, side);
  }

  if (connector.family === "resistor") {
    return resistorTerminalPoint(connector, safePin);
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
  const lane = connector.family === "cpc"
    ? safePin - 1
    : usedIndex >= 0 ? usedIndex : Math.max(0, safePin - 1);
  if (connector.family === "barrel" || connector.family === "pcb" || connector.family === "dupont" || connector.family === "rj45" || connector.family === "cpc" || connector.family === "minifit" || connector.family === "resistor") {
    return {
      x: contact.x,
      y: ["pcb", "dupont", "resistor"].includes(connector.family) || connector.family === "rj45" || connector.family === "cpc" || connector.family === "minifit" ? connector.y + connector.height + 6 : contact.y,
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

function numberOrZero(input) {
  const numeric = Number(input);
  return Number.isFinite(numeric) ? numeric : 0;
}

function optionalFiniteNumber(input) {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  const numeric = Number(input);
  return Number.isFinite(numeric) ? numeric : null;
}

function legacyRouteBend(row) {
  const x = optionalFiniteNumber(row?.routeBendX);
  const y = optionalFiniteNumber(row?.routeBendY);
  if (x === null || y === null || (x === 0 && y === 0)) {
    return { x: null, y: null };
  }

  return { x: Math.round(x), y: Math.round(y) };
}

function cleanRouteBend(point) {
  const x = optionalFiniteNumber(point?.x);
  const y = optionalFiniteNumber(point?.y);
  if (x === null || y === null || (x === 0 && y === 0)) {
    return null;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

function normalizedRouteBends(row) {
  const bends = Array.isArray(row?.routeBends)
    ? row.routeBends.map(cleanRouteBend).filter(Boolean)
    : [];
  if (!bends.length) {
    const legacy = legacyRouteBend(row);
    if (legacy.x !== null && legacy.y !== null) {
      bends.push(legacy);
    }
  }

  return bends.slice(0, MAX_WIRE_ROUTE_BENDS);
}

function normalizedRouteBend(row) {
  const bend = normalizedRouteBends(row)[0];
  return bend || { x: null, y: null };
}

function wireRouteOffset(row) {
  return {
    x: numberOrZero(row?.routeOffsetX),
    y: numberOrZero(row?.routeOffsetY)
  };
}

function wireLabelOffset(row) {
  return {
    x: numberOrZero(row?.wireLabelOffsetX),
    y: numberOrZero(row?.wireLabelOffsetY)
  };
}

function wireRouteBend(row) {
  return wireRouteBends(row)[0] || null;
}

function wireRouteBends(row) {
  return normalizedRouteBends(row);
}

function setWireRouteOffset(row, x, y) {
  if (!row) {
    return;
  }

  row.routeOffsetX = Math.round(clamp(Number(x) || 0, -WIRE_ROUTE_DRAG_LIMIT_X, WIRE_ROUTE_DRAG_LIMIT_X));
  row.routeOffsetY = Math.round(clamp(Number(y) || 0, -WIRE_ROUTE_DRAG_LIMIT_Y, WIRE_ROUTE_DRAG_LIMIT_Y));
}

function resetWireRouteOffset(row) {
  if (!row) {
    return;
  }

  row.routeOffsetX = 0;
  row.routeOffsetY = 0;
}

function setWireLabelOffset(row, x, y) {
  if (!row) {
    return;
  }

  row.wireLabelOffsetX = Math.round(clamp(Number(x) || 0, -WIRE_ROUTE_DRAG_LIMIT_X, WIRE_ROUTE_DRAG_LIMIT_X));
  row.wireLabelOffsetY = Math.round(clamp(Number(y) || 0, -WIRE_ROUTE_DRAG_LIMIT_Y, WIRE_ROUTE_DRAG_LIMIT_Y));
}

function resetWireLabelOffset(row) {
  if (!row) {
    return;
  }

  row.wireLabelOffsetX = 0;
  row.wireLabelOffsetY = 0;
}

function syncLegacyWireRouteBend(row) {
  if (!row) {
    return;
  }

  const bend = normalizedRouteBends(row)[0] || null;
  row.routeBendX = bend ? bend.x : null;
  row.routeBendY = bend ? bend.y : null;
}

function setWireRouteBend(row, x, y, index = 0) {
  if (!row) {
    return;
  }

  const bends = normalizedRouteBends(row);
  const bendIndex = clamp(Math.round(Number(index) || 0), 0, MAX_WIRE_ROUTE_BENDS - 1);
  while (bends.length <= bendIndex) {
    bends.push({ x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0) });
  }
  bends[bendIndex] = { x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0) };
  row.routeBends = bends.slice(0, MAX_WIRE_ROUTE_BENDS);
  syncLegacyWireRouteBend(row);
}

function addWireRouteBend(row, x, y) {
  if (!row) {
    return -1;
  }

  const bends = normalizedRouteBends(row);
  if (bends.length >= MAX_WIRE_ROUTE_BENDS) {
    return -1;
  }

  bends.push({ x: Math.round(Number(x) || 0), y: Math.round(Number(y) || 0) });
  row.routeBends = bends;
  syncLegacyWireRouteBend(row);
  return bends.length - 1;
}

function removeWireRouteBend(row, index) {
  if (!row) {
    return -1;
  }

  const bends = normalizedRouteBends(row);
  if (!bends.length) {
    return -1;
  }

  const bendIndex = clamp(Math.round(Number(index) || 0), 0, Math.max(0, bends.length - 1));
  bends.splice(bendIndex, 1);
  row.routeBends = bends;
  syncLegacyWireRouteBend(row);
  return Math.min(bendIndex, bends.length - 1);
}

function resetWireRouteBend(row) {
  if (!row) {
    return;
  }

  row.routeBends = [];
  row.routeBendX = null;
  row.routeBendY = null;
}

function previewLayoutPoint(kind, side = "", key = "") {
  const layout = state.previewLayout || defaultPreviewLayout();
  if (kind === "title") {
    return {
      x: numberOrZero(layout.title?.x),
      y: numberOrZero(layout.title?.y)
    };
  }

  if (kind === "splice") {
    const point = layout.splices?.[legKey(key)] || {};
    return {
      x: numberOrZero(point.x),
      y: numberOrZero(point.y)
    };
  }

  const sideBucket = kind === "connector"
    ? layout.connectors?.[side] || {}
    : kind === "connector-detail"
      ? layout.connectorDetails?.[side] || {}
      : layout.heatshrink?.[side] || {};
  const point = sideBucket[legKey(key)] || {};
  return {
    x: numberOrZero(point.x),
    y: numberOrZero(point.y)
  };
}

function setPreviewLayoutPoint(kind, side, key, x, y) {
  if (!state.previewLayout) {
    state.previewLayout = defaultPreviewLayout();
  }

  if (kind === "title") {
    state.previewLayout.title = {
      x: Math.round(clamp(Number(x) || 0, -WIRE_ROUTE_DRAG_LIMIT_X, WIRE_ROUTE_DRAG_LIMIT_X)),
      y: Math.round(clamp(Number(y) || 0, -WIRE_ROUTE_DRAG_LIMIT_Y, WIRE_ROUTE_DRAG_LIMIT_Y))
    };
    return;
  }

  if (kind === "splice") {
    if (!state.previewLayout.splices) {
      state.previewLayout.splices = {};
    }
    state.previewLayout.splices[legKey(key)] = {
      x: Math.round(clamp(Number(x) || 0, -WIRE_ROUTE_DRAG_LIMIT_X, WIRE_ROUTE_DRAG_LIMIT_X)),
      y: Math.round(clamp(Number(y) || 0, -WIRE_ROUTE_DRAG_LIMIT_Y, WIRE_ROUTE_DRAG_LIMIT_Y))
    };
    return;
  }

  const bucketName = kind === "connector" ? "connectors" : kind === "connector-detail" ? "connectorDetails" : "heatshrink";
  if (!state.previewLayout[bucketName]) {
    state.previewLayout[bucketName] = { left: {}, right: {} };
  }
  if (!state.previewLayout[bucketName][side]) {
    state.previewLayout[bucketName][side] = {};
  }
  state.previewLayout[bucketName][side][legKey(key)] = {
    x: Math.round(clamp(Number(x) || 0, -WIRE_ROUTE_DRAG_LIMIT_X, WIRE_ROUTE_DRAG_LIMIT_X)),
    y: Math.round(clamp(Number(y) || 0, -WIRE_ROUTE_DRAG_LIMIT_Y, WIRE_ROUTE_DRAG_LIMIT_Y))
  };
}

function resetPreviewLayoutPoint(kind, side, key) {
  if (!state.previewLayout) {
    return;
  }

  if (kind === "title") {
    state.previewLayout.title = { x: 0, y: 0 };
    return;
  }

  if (kind === "splice") {
    delete state.previewLayout.splices?.[legKey(key)];
    return;
  }

  const bucketName = kind === "connector" ? "connectors" : kind === "connector-detail" ? "connectorDetails" : "heatshrink";
  const bucket = state.previewLayout[bucketName]?.[side];
  if (bucket) {
    delete bucket[legKey(key)];
  }
}

function crowdingFactor(count, start = 8, span = 8) {
  return clamp((Math.max(0, count) - start) / Math.max(1, span), 0, 1);
}

function routeControlX(controlX, startX, endX, padding = 22) {
  const min = Math.min(startX, endX) + padding;
  const max = Math.max(startX, endX) - padding;
  if (min >= max) {
    return Math.round((startX + endX) / 2);
  }

  return Math.round(clamp(controlX, min, max));
}

function pushOrthogonalPoint(points, pushPoint, x, y, preference = "vh") {
  const last = points[points.length - 1];
  const target = { x: Math.round(x), y: Math.round(y) };
  if (!last || last.x === target.x || last.y === target.y) {
    pushPoint(target.x, target.y);
    return;
  }

  if (preference === "hv") {
    pushPoint(target.x, last.y);
  } else {
    pushPoint(last.x, target.y);
  }
  pushPoint(target.x, target.y);
}

function pushManualBends(points, pushPoint, bends, startPreference = "vh") {
  bends.forEach((bend, index) => {
    const preference = index % 2 === 0 ? startPreference : startPreference === "vh" ? "hv" : "vh";
    pushOrthogonalPoint(points, pushPoint, bend.x, bend.y, preference);
  });
}

function wirePath(start, end, index, routeBaseY, wireCount = 0, row = null) {
  return pointsToOrthogonalPath(wireRoutePoints(start, end, index, routeBaseY, wireCount, row));
}

function isSplicePort(point) {
  return value(point?.exit).startsWith("splice-");
}

function spliceApproachPoint(point) {
  if (point.exit === "splice-left") {
    return { x: point.x - 34, y: point.y };
  }
  if (point.exit === "splice-right") {
    return { x: point.x + 34, y: point.y };
  }
  if (point.exit === "splice-drop") {
    return { x: point.x + 34, y: point.y + 18 };
  }
  return { x: point.x, y: point.y };
}

function wireRoutePoints(start, end, index, routeBaseY, wireCount = 0, row = null) {
  const offset = wireRouteOffset(row);
  const bends = wireRouteBends(row);
  const points = [];
  const pushPoint = (x, y) => {
    const point = { x: Math.round(x), y: Math.round(y) };
    const last = points[points.length - 1];
    if (!last || last.x !== point.x || last.y !== point.y) {
      points.push(point);
    }
  };

  if (start.exit === "bottom" && end.exit === "bottom") {
    const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP + offset.y;
    const startDropY = bottomDropY(start, index, laneY);
    const routeBusX = routeControlX(bottomRouteCenterX(start, end, index, wireCount) + offset.x, start.x, end.x);
    pushPoint(start.x, start.y);
    pushPoint(start.x, startDropY);
    pushPoint(routeBusX, startDropY);
    if (bends.length) {
      pushManualBends(points, pushPoint, bends, "vh");
      pushOrthogonalPoint(points, pushPoint, end.x, laneY, "hv");
    } else {
      pushPoint(routeBusX, laneY);
      pushPoint(end.x, laneY);
    }
    pushPoint(end.x, end.y);
    return points;
  }

  if (start.exit === "bottom" && isSplicePort(end)) {
    const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP + offset.y;
    const dropY = bottomDropY(start, index, laneY);
    const approach = spliceApproachPoint(end);
    const busX = routeControlX(bottomBusX(start, index, wireCount) + offset.x, start.x, approach.x);
    pushPoint(start.x, start.y);
    pushPoint(start.x, dropY);
    pushPoint(busX, dropY);
    if (bends.length) {
      pushManualBends(points, pushPoint, bends, "vh");
      pushOrthogonalPoint(points, pushPoint, approach.x, approach.y, "hv");
    } else {
      pushPoint(busX, laneY);
      pushPoint(approach.x, laneY);
      pushPoint(approach.x, approach.y);
    }
    pushPoint(end.x, end.y);
    return points;
  }

  if (start.exit === "bottom") {
    const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP + offset.y;
    const dropY = bottomDropY(start, index, laneY);
    const busX = routeControlX(bottomBusX(start, index, wireCount) + offset.x, start.x, end.x);
    pushPoint(start.x, start.y);
    pushPoint(start.x, dropY);
    pushPoint(busX, dropY);
    if (bends.length) {
      pushManualBends(points, pushPoint, bends, "vh");
      pushOrthogonalPoint(points, pushPoint, end.x, laneY, "hv");
    } else {
      pushPoint(busX, laneY);
      pushPoint(end.x, laneY);
    }
    pushPoint(end.x, end.y);
    return points;
  }

  if (end.exit === "bottom") {
    return wireRoutePoints(end, start, index, routeBaseY, wireCount, row).slice().reverse();
  }

  if (isSplicePort(start) && isSplicePort(end)) {
    const startApproach = spliceApproachPoint(start);
    const endApproach = spliceApproachPoint(end);
    pushPoint(start.x, start.y);
    pushPoint(startApproach.x, startApproach.y);
    pushPoint(endApproach.x, endApproach.y);
    pushPoint(end.x, end.y);
    return points;
  }

  const middleX = routeControlX(500 + ((Math.max(0, index) % 7) - 3) * 12 + offset.x, start.x, end.x);
  pushPoint(start.x, start.y);
  pushPoint(middleX, start.y);
  if (bends.length) {
    pushManualBends(points, pushPoint, bends, "vh");
    pushOrthogonalPoint(points, pushPoint, end.x, end.y, "hv");
  } else if (offset.y) {
    const middleY = Math.round((start.y + end.y) / 2 + offset.y);
    pushPoint(middleX, middleY);
    pushPoint(end.x, middleY);
    pushPoint(end.x, end.y);
  } else {
    pushPoint(middleX, end.y);
    pushPoint(end.x, end.y);
  }
  return points;
}

function pointsToOrthogonalPath(points) {
  if (!points.length) {
    return "";
  }

  const [first, ...rest] = points;
  return [
    `M ${Math.round(first.x)} ${Math.round(first.y)}`,
    ...rest.map((point, index) => {
      const prev = points[index];
      if (point.x === prev.x) {
        return `V ${Math.round(point.y)}`;
      }
      if (point.y === prev.y) {
        return `H ${Math.round(point.x)}`;
      }
      return `L ${Math.round(point.x)} ${Math.round(point.y)}`;
    })
  ].join(" ");
}

function bottomDropY(point, index, laneY = point.y) {
  const routeIndex = Math.max(0, index);
  const offset = 26 + routeIndex * WIRE_EXIT_GAP;
  if (point.y > laneY) {
    return Math.max(laneY, point.y - offset);
  }

  return Math.min(laneY, point.y + offset);
}

function bottomBusX(point, index, wireCount = 0) {
  const nudge = Math.max(0, index) * WIRE_BUS_GAP;
  const crowd = crowdingFactor(wireCount, 10, 6);
  if (point.side === "left") {
    return point.edgeX + nudge;
  }
  if (point.side === "right") {
    return point.edgeX - nudge - Math.round(crowd * 14);
  }
  return point.x;
}

function bottomBusPair(start, end, index, wireCount = 0) {
  const startBusX = bottomBusX(start, index, wireCount);
  let endBusX = bottomBusX(end, index, wireCount);
  const minSpan = 48 + Math.round(crowdingFactor(wireCount, 10, 6) * 12);

  if (start.side === "left" && end.side === "right" && endBusX < startBusX + minSpan) {
    endBusX = startBusX + minSpan;
  } else if (start.side === "right" && end.side === "left" && endBusX > startBusX - minSpan) {
    endBusX = startBusX - minSpan;
  }

  return { startBusX, endBusX };
}

function bottomRouteCenterX(start, end, index, wireCount = 0) {
  const { startBusX, endBusX } = bottomBusPair(start, end, index, wireCount);
  const midpoint = (startBusX + endBusX) / 2;
  const crowd = crowdingFactor(wireCount, 10, 6);
  const flow = start.side === "left" && end.side === "right"
    ? -1
    : start.side === "right" && end.side === "left"
      ? 1
      : 0;
  const extraPull = flow * (8 + crowd * 12 + Math.min(6, Math.max(0, index)) * 1.5);
  return Math.round(clamp(midpoint + extraPull, Math.min(startBusX, endBusX) + 22, Math.max(startBusX, endBusX) - 22));
}

function bottomExitWirePath(bottom, other, index, routeBaseY, wireCount = 0, row = null) {
  return pointsToOrthogonalPath(wireRoutePoints(bottom, other, index, routeBaseY, wireCount, row));
}

function wireAwgLabel(row) {
  const awg = value(row?.awg).trim();
  if (!awg) {
    return "";
  }
  return /\bAWG\b/i.test(awg) ? awg.toUpperCase() : `${awg} AWG`;
}

function wireLengthLabel(row) {
  const length = value(row?.length).trim();
  if (!length) {
    return "";
  }
  return /\b(in|inch|inches|ft|feet|mm|cm|m)\b/i.test(length) ? length : `${length} in`;
}

function normalizeWireColorName(input) {
  const text = cleanCell(input).toUpperCase();
  return colorMap[text] ? text : colorAliases[text] || text;
}

function wireColorParts(input) {
  const text = cleanCell(input).toUpperCase();
  if (!text) {
    return [];
  }

  const pieces = text
    .replace(/\bWITH\b/g, "/")
    .replace(/\bW\/\b/g, "/")
    .split(/[/,+]|\s+-\s+|\s+STRIPE\s+|\s+TRACER\s+/)
    .map(normalizeWireColorName)
    .filter((part) => Boolean(part && colorMap[part]));

  return pieces.filter((part, index) => pieces.indexOf(part) === index);
}

function wireBaseColor(row) {
  const parts = wireColorParts(row?.color);
  const color = parts[0] || normalizeWireColorName(row?.color);
  return colorMap[color] || "#7e8a82";
}

function wireStripeColor(row) {
  const parts = wireColorParts(row?.color);
  return parts.length > 1 ? colorMap[parts[1]] : "";
}

function colorSwatchStyle(input) {
  const parts = wireColorParts(input);
  if (parts.length > 1) {
    const base = colorMap[parts[0]];
    const stripe = colorMap[parts[1]];
    return `background: linear-gradient(135deg, ${base} 0 42%, ${stripe} 42% 58%, ${base} 58% 100%);`;
  }

  const color = colorMap[parts[0]] || colorMap[normalizeWireColorName(input)] || "#d9dfd7";
  return `--swatch:${color};`;
}

function applyColorSwatch(element, input) {
  if (!element) {
    return;
  }
  element.style.removeProperty("background");
  const style = colorSwatchStyle(input);
  if (style.startsWith("background:")) {
    element.style.removeProperty("--swatch");
    element.style.background = style.replace(/^background:\s*/, "").replace(/;$/, "");
  } else {
    element.style.setProperty("--swatch", style.replace(/^--swatch:\s*/, "").replace(/;$/, ""));
  }
}

function wireColorNotation(row) {
  const text = cleanCell(row?.color).toUpperCase();
  return text && text !== "UNSET" ? text : "";
}

function wireConstructionFlags(row) {
  const text = [
    row?.name,
    branchLabel(row || {}),
    row?.toolUsed,
    row?.comments
  ].map((item) => cleanCell(item).toUpperCase()).join(" ");
  return {
    shielded: /\b(SHIELD|SHIELDED|SCREEN|DRAIN|FOIL|BRAID|STP|F\/UTP|S\/FTP|U\/FTP)\b/.test(text),
    twisted: /\b(TWIST|TWISTED|TW\s?PAIR|TWP|TP|PAIR)\b/.test(text)
  };
}

function wireConstructionLabel(row) {
  const flags = wireConstructionFlags(row);
  if (flags.shielded && flags.twisted) {
    return "TWIST + SHIELD";
  }
  if (flags.shielded) {
    return "SHIELD";
  }
  if (flags.twisted) {
    return "TWIST";
  }
  return "";
}

function wireOutlineColor(row) {
  const color = normalizeWireColorName(row?.color);
  return color === "BLACK" || color === "BROWN" || color === "VIOLET" ? "#edf2ec" : "#172019";
}

function wireDrawingStyle(row) {
  const flags = wireConstructionFlags(row);
  return {
    base: wireBaseColor(row),
    stripe: wireStripeColor(row),
    outline: wireOutlineColor(row),
    shielded: flags.shielded,
    twisted: flags.twisted
  };
}

function wireDrawingLabel(row, wireCount = 0) {
  const name = value(row?.name).trim();
  const detail = [
    wireAwgLabel(row),
    wireColorNotation(row),
    wireLengthLabel(row),
    wireConstructionLabel(row)
  ].filter(Boolean).join(" | ");
  const rawLines = [name, detail].filter(Boolean);
  if (!rawLines.length) {
    return null;
  }

  const compact = crowdingFactor(wireCount, 8, 8) > 0.36;
  const inlineText = rawLines.join("   ");
  const line = shortLabel(inlineText, compact ? 42 : 58);
  const tagWidth = clamp(
    line.length * (compact ? 6.8 : 7.5) + 18,
    compact ? 118 : 132,
    compact ? 310 : 430
  );
  return {
    rawLines,
    lines: [line],
    fullText: rawLines.join("\n"),
    tagWidth,
    tagHeight: compact ? 18 : 20,
    compact
  };
}

function drawingToolNames(rows = activeRows()) {
  const names = [];
  rows.forEach((row) => {
    const tool = cleanCell(row.toolUsed);
    if (tool && !names.some((name) => name.toUpperCase() === tool.toUpperCase())) {
      names.push(tool);
    }
  });
  return names;
}

function drawingToolSummary(rows = activeRows()) {
  const names = drawingToolNames(rows);
  if (!names.length) {
    return "";
  }

  return `${names.length === 1 ? "TOOL" : "TOOLS"}: ${names.join(", ")}`;
}

function wireNameTagPosition(start, end, index, routeBaseY, previewHeight, tagWidth, wireCount = 0, row = null) {
  const routeIndex = Math.max(0, index);
  const sideMargin = tagWidth / 2 + 16;
  const crowd = crowdingFactor(wireCount, 8, 8);
  const offset = wireRouteOffset(row);
  const labelOffset = wireLabelOffset(row);

  if (start.exit === "bottom" && end.exit === "bottom") {
    const laneY = routeBaseY + routeIndex * WIRE_LANE_GAP + offset.y;
    const routeBusX = routeControlX(bottomRouteCenterX(start, end, index, wireCount) + offset.x, start.x, end.x);
    const position = wireLaneLabelPosition(routeBusX, laneY, previewHeight, sideMargin);
    return {
      x: position.x + labelOffset.x,
      y: position.y + labelOffset.y
    };
  }

  if (start.exit === "bottom" || end.exit === "bottom") {
    const bottom = start.exit === "bottom" ? start : end;
    const other = start.exit === "bottom" ? end : start;
    const laneY = routeBaseY + routeIndex * WIRE_LANE_GAP + offset.y;
    const busX = routeControlX(bottomBusX(bottom, index, wireCount) + offset.x, bottom.x, other.x);
    const labelX = wireLaneLabelX(busX, other.x, tagWidth);
    const position = wireLaneLabelPosition(labelX - (start.side === "right" || end.side === "right" ? Math.round(crowd * 8) : 0), laneY, previewHeight, sideMargin);
    return {
      x: position.x + labelOffset.x,
      y: position.y + labelOffset.y
    };
  }

  const x = (start.x + end.x) / 2 + offset.x;
  const y = (start.y + end.y) / 2 + offset.y;
  return {
    x: clamp(x + labelOffset.x, sideMargin, 1000 - sideMargin),
    y: clamp(y + labelOffset.y, 48, previewHeight - 24)
  };
}

function renderWireNameTag(row, start, end, index, routeBaseY, previewHeight, wireCount = 0) {
  const label = wireDrawingLabel(row, wireCount);
  if (!label) {
    return "";
  }

  const tag = wireNameTagPosition(start, end, index, routeBaseY, previewHeight, label.tagWidth, wireCount, row);
  const fontSize = label.compact ? 11 : 12;
  const primary = escapeXml(label.lines[0]);

  return `
    <g class="wire-name-tag" data-drag-kind="wire-label" data-wire-id="${escapeXml(row?.id || "")}" aria-label="Wire label ${escapeXml(label.fullText)}">
      <title>${escapeXml(label.fullText)}</title>
      <rect class="wire-name-hit" x="${tag.x - label.tagWidth / 2}" y="${tag.y - 13}" width="${label.tagWidth}" height="26" rx="5" />
      <text class="wire-inline-label" x="${tag.x}" y="${tag.y + 4}" text-anchor="middle" font-size="${fontSize}">${primary}</text>
    </g>
  `;
}

function renderDrawingToolNote(rows, previewHeight) {
  const label = drawingToolSummary(rows);
  if (!label) {
    return "";
  }

  const width = clamp(label.length * 7.2 + 26, 120, 360);
  const x = 982 - width;
  const y = Math.max(12, previewHeight - 42);
  return `
    <g class="tool-note" aria-label="${escapeXml(label)}">
      <rect x="${x}" y="${y}" width="${width}" height="26" rx="4" />
      <text x="${x + width - 13}" y="${y + 18}" text-anchor="end">${escapeXml(label)}</text>
    </g>
  `;
}

function renderWireBendHandles(row, previewHeight) {
  const bends = wireRouteBends(row);
  if (!bends.length) {
    return "";
  }

  const half = WIRE_BEND_HANDLE_SIZE / 2;
  return bends.map((bend, index) => {
    const x = Math.round(clamp(bend.x, 12, 988));
    const y = Math.round(clamp(bend.y, 12, Math.max(12, previewHeight - 12)));
    return `
      <g class="wire-bend-handle" data-drag-kind="wire-bend" data-wire-id="${escapeXml(row?.id || "")}" data-wire-bend-id="${escapeXml(row?.id || "")}" data-wire-bend-index="${index}" aria-label="Route bend ${index + 1} for ${escapeXml(value(row?.name) || "wire")}">
        <rect class="wire-bend-hit" x="${x - 13}" y="${y - 13}" width="26" height="26" rx="6" />
        <rect class="wire-bend-core" x="${x - half}" y="${y - half}" width="${WIRE_BEND_HANDLE_SIZE}" height="${WIRE_BEND_HANDLE_SIZE}" rx="2" />
        <text class="wire-bend-index" x="${x}" y="${y + 3}" text-anchor="middle">${index + 1}</text>
      </g>
    `;
  }).join("");
}

function renderHeatshrinkGroupLabels(side, routedWires, routeBaseY, previewHeight, part = "full") {
  return collectHeatshrinkGroups(side, routedWires)
    .map((group) => renderHeatshrinkGroupLabel(side, group, routeBaseY, previewHeight, part))
    .join("");
}

function collectHeatshrinkGroups(side, routedWires) {
  const groups = new Map();

  routedWires.forEach((route) => {
    const row = route.item;
    if (!rowUsesSide(row, side)) {
      return;
    }

    const leg = side === "left" ? row.leftLeg : row.rightLeg;
    if (!leg) {
      return;
    }

    const point = side === "left" ? route.endpoints.start : route.endpoints.end;
    if (!point || point.exit === "splice") {
      return;
    }

    const key = legKey(leg);
    if (!groups.has(key)) {
      groups.set(key, {
        leg,
        routes: []
      });
    }
    groups.get(key).routes.push({
      index: route.index,
      point,
      row: route.item
    });
  });

  return [...groups.values()];
}

function renderHeatshrinkGroupLabel(side, group, routeBaseY, previewHeight, part = "full") {
  if (!group?.routes?.length) {
    return "";
  }

  const crowd = crowdingFactor(group.routes.length, 3, 5);
  const legName = legNameFor(side, group.leg);
  const label = `${side === "left" ? "LEFT" : "RIGHT"} ${group.leg}`;
  const lines = [
    escapeXml(shortLabel(String(group.leg), crowd > 0.35 ? 11 : 13)),
    escapeXml(shortLabel(legName || "Leg name", crowd > 0.35 ? 13 : 15))
  ];
  const box = heatshrinkGroupBox(group, side, routeBaseY, previewHeight, crowd);
  const sleeveMarkup = `
      <rect class="heatshrink-sleeve" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="4" />
  `;
  const textMarkup = `
      <text x="${box.cx}" y="${box.cy - 8}" class="heatshrink-title" text-anchor="middle">${lines[0]}</text>
      <text x="${box.cx}" y="${box.cy + 14}" class="heatshrink-name" text-anchor="middle">${lines[1]}</text>
  `;

  if (part === "sleeve") {
    return `
    <g class="heatshrink-label" data-drag-kind="heatshrink" data-heatshrink-side="${side}" data-heatshrink-key="${escapeXml(group.leg)}" aria-label="${escapeXml(`${label} ${legName}`)}">
      <rect class="heatshrink-hit" x="${box.x - 6}" y="${box.y - 6}" width="${box.width + 12}" height="${box.height + 12}" rx="6" />
      ${sleeveMarkup}
    </g>
  `;
  }

  if (part === "text") {
    return `
    <g class="heatshrink-label" data-drag-kind="heatshrink" data-heatshrink-side="${side}" data-heatshrink-key="${escapeXml(group.leg)}" aria-label="${escapeXml(`${label} ${legName}`)}">
      ${textMarkup}
    </g>
  `;
  }

  return `
    <g class="heatshrink-label" data-drag-kind="heatshrink" data-heatshrink-side="${side}" data-heatshrink-key="${escapeXml(group.leg)}" aria-label="${escapeXml(`${label} ${legName}`)}">
      <rect class="heatshrink-hit" x="${box.x - 6}" y="${box.y - 6}" width="${box.width + 12}" height="${box.height + 12}" rx="6" />
      ${sleeveMarkup}
      ${textMarkup}
    </g>
  `;
}

function heatshrinkGroupBox(group, side, routeBaseY, previewHeight, crowd = 0) {
  const routes = group.routes || [];
  const terminalRuns = routes.map(({ index, point }) => {
    if (point.exit === "bottom") {
      const laneY = routeBaseY + Math.max(0, index) * WIRE_LANE_GAP;
      const dropY = bottomDropY(point, index, laneY);
      return {
        index,
        point,
        laneY,
        dropY,
        busX: bottomBusX(point, index, routes.length)
      };
    }

    return {
      index,
      point,
      laneY: point.y,
      dropY: point.y,
      busX: point.x
    };
  });

  const pointXs = terminalRuns.map((item) => item.point.x);
  const pointYs = terminalRuns.map((item) => item.point.y);
  const minX = Math.min(...pointXs);
  const maxX = Math.max(...pointXs);
  const minY = Math.min(...pointYs);
  const maxY = Math.max(...pointYs);
  const laneY = terminalRuns.reduce((sum, item) => sum + item.laneY, 0) / terminalRuns.length;
  const terminalY = pointYs.reduce((sum, y) => sum + y, 0) / pointYs.length;
  const towardLane = terminalY <= laneY ? 1 : -1;
  const routeOffset = routes.reduce((sum, item) => {
    const offset = wireRouteOffset(item.row);
    return {
      x: sum.x + offset.x,
      y: sum.y + offset.y
    };
  }, { x: 0, y: 0 });
  const offsetX = routes.length ? routeOffset.x / routes.length : 0;
  const offsetY = routes.length ? routeOffset.y / routes.length : 0;
  const groupOffset = previewLayoutPoint("heatshrink", side, group.leg);
  const horizontal = (maxX - minX) >= (maxY - minY);
  const width = horizontal
    ? clamp(maxX - minX + 44 + crowd * 14, 88, 180)
    : 54;
  const height = horizontal
    ? clamp(50 + crowd * 6, 50, 60)
    : clamp(maxY - minY + 44 + crowd * 14, 88, 180);
  const centerX = horizontal
    ? (minX + maxX) / 2 + offsetX * 0.24 + groupOffset.x
    : terminalRuns.reduce((sum, item) => sum + item.busX, 0) / terminalRuns.length + offsetX * 0.18 + groupOffset.x;
  const centerY = horizontal
    ? terminalY + towardLane * (32 - crowd * 10) + offsetY * 0.24 + groupOffset.y
    : (minY + maxY) / 2 + towardLane * (14 - crowd * 4) + offsetY * 0.2 + groupOffset.y;
  const left = clamp(centerX - width / 2, 18, 1000 - width - 18);
  const top = clamp(centerY - height / 2, 44, previewHeight - height - 14);
  return {
    x: left,
    y: top,
    cx: left + width / 2,
    cy: top + height / 2,
    width,
    height
  };
}

function renderHeatshrinkLabel(side, row, point, index, routeBaseY, previewHeight, part = "full") {
  if (!row || point.exit === "splice") {
    return "";
  }

  const left = side === "left";
  const leg = left ? row.leftLeg : row.rightLeg;
  if (!leg) {
    return "";
  }

  const legName = legNameFor(side, leg);
  const label = `${left ? "LEFT" : "RIGHT"} ${leg}`;
  const lines = [
    escapeXml(shortLabel(String(leg), 13)),
    escapeXml(shortLabel(legName || "Leg name", 15)),
  ];
  const box = heatshrinkBox(point, index, routeBaseY, previewHeight, crowdingFactor(index + 1, 4, 6));
  const sleeveMarkup = `
      <rect class="heatshrink-sleeve" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="4" />
  `;
  const textMarkup = `
      <text x="${box.cx}" y="${box.y + 31}" class="heatshrink-title" text-anchor="middle">${lines[0]}</text>
      <text x="${box.cx}" y="${box.y + 55}" class="heatshrink-name" text-anchor="middle">${lines[1]}</text>
  `;

  if (part === "sleeve") {
    return `
    <g class="heatshrink-label" aria-label="${escapeXml(`${label} ${legName}`)}">
      ${sleeveMarkup}
    </g>
  `;
  }

  if (part === "text") {
    return `
    <g class="heatshrink-label" aria-label="${escapeXml(`${label} ${legName}`)}">
      ${textMarkup}
    </g>
  `;
  }

  return `
    <g class="heatshrink-label" aria-label="${escapeXml(`${label} ${legName}`)}">
      ${sleeveMarkup}
      ${textMarkup}
    </g>
  `;
}

function heatshrinkBox(point, index, routeBaseY, previewHeight, crowd = 0) {
  const width = Math.round(clamp(118 - crowd * 16, 94, 118));
  const height = Math.round(clamp(84 - crowd * 10, 72, 84));
  const routeIndex = Math.max(0, index);
  let x = point.x;
  let y = point.y;

  if (point.exit === "bottom") {
    const laneY = routeBaseY + routeIndex * WIRE_LANE_GAP;
    const dropY = bottomDropY(point, index, laneY);
    x = bottomBusX(point, index, crowd > 0 ? 4 : 0);
    y = (dropY + laneY) / 2;
  } else {
    const nudge = Math.round(74 - crowd * 16);
    x = point.x + (point.side === "right" ? -nudge : nudge);
    y = point.y + 28 - Math.round(crowd * 4);
  }

  const left = clamp(x - width / 2, 18, 1000 - width - 18);
  const top = clamp(y - height / 2, 44, previewHeight - height - 14);
  return {
    x: left,
    y: top,
    cx: left + width / 2,
    cy: top + height / 2,
    width,
    height
  };
}

function wireLaneLabelPosition(x, laneY, previewHeight, sideMargin) {
  return {
    x: clamp(x, sideMargin, 1000 - sideMargin),
    y: clamp(laneY, 48, previewHeight - 24)
  };
}

function wireLaneLabelX(leftX, rightX, tagWidth) {
  const minX = Math.min(leftX, rightX);
  const maxX = Math.max(leftX, rightX);
  if (maxX - minX <= tagWidth + 24) {
    return (leftX + rightX) / 2;
  }

  const desired = minX + tagWidth / 2 + 8;
  return clamp(desired, minX + tagWidth / 2 + 8, maxX - tagWidth / 2 - 8);
}

function shortLabel(input, maxLength) {
  const text = value(input).trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(1, maxLength - 3))}...`;
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

  const firstActiveRow = active[0];
  if (firstActiveRow && !cleanCell(firstActiveRow.cableName)) {
    add(firstActiveRow, "warning", "missing-cable-name", "Enter the cable name on the first active row; later rows may stay blank.");
  }

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
        const spliceId = normalizedSpliceId(row);
        const key = spliceId ? `${leg}|${pin}|${spliceId}` : `${leg}|${pin}`;
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
    if (parentCount < 1) {
      rows.forEach((row) => add(row, "error", `splice-parent-${spliceId}`, `${spliceId} requires at least one parent wire.`));
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

  if (dom.copyQualityIssues) {
    const canCopyErrors = errors > 0;
    dom.copyQualityIssues.disabled = !canCopyErrors;
    dom.copyQualityIssues.title = canCopyErrors
      ? `Copy ${errors} error${errors === 1 ? "" : "s"} to clipboard`
      : "No errors to copy";
    dom.copyQualityIssues.setAttribute("aria-disabled", canCopyErrors ? "false" : "true");
  }
}

function qualityIssuesClipboardText(issues) {
  const harnessLabel = value(state.harnessName) || "Untitled harness";
  const lines = issues.map((issue) => {
    const rowNumber = state.rows.findIndex((row) => row.id === issue.rowId) + 1;
    const prefix = rowNumber ? `Row ${rowNumber}` : "Harness";
    return `${prefix}: ${issue.message}`;
  });

  return [`Harness errors: ${harnessLabel}`, "", ...lines].join("\n").trimEnd();
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fall through to the legacy clipboard path below.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
  return true;
}

async function copyQualityErrors() {
  const errorIssues = validateHarness().filter((issue) => issue.severity === "error");
  if (!errorIssues.length) {
    showToast("No errors to copy.");
    return;
  }

  try {
    await copyTextToClipboard(qualityIssuesClipboardText(errorIssues));
    showToast(`Copied ${errorIssues.length} error${errorIssues.length === 1 ? "" : "s"}.`);
  } catch (error) {
    showToast("Could not copy errors to the clipboard.");
  }
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
    entry.family,
    entry.manufacturer,
    entry.partNumber,
    entry.terminalType,
    entry.terminalPart,
    entry.notes
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
        <td><input data-field="cableName" value="${escapeHtml(row.cableName)}" aria-label="Cable name"></td>
        <td>${selectField(row, "leftLeg", options.legs, "Left leg")}</td>
        <td><input data-field="leftLegName" value="${escapeHtml(legNameFor("left", row.leftLeg))}" aria-label="Left leg name"></td>
        <td class="field-name"><input data-field="name" list="nameChoices" value="${escapeHtml(row.name)}" aria-label="Wire name"></td>
        <td>${selectField(row, "leftPin", options.pins, "Left pin")}</td>
        <td class="field-housing">${selectField(row, "housing", housingChoices(), "Housing type")}</td>
        <td><input data-field="leftHousingPart" value="${escapeHtml(row.leftHousingPart)}" aria-label="Left housing part number"></td>
        <td><input data-field="leftTerminalPart" value="${escapeHtml(row.leftTerminalPart)}" aria-label="Left terminal pin part number"></td>
        <td>${selectField(row, "awg", options.gauges, "AW gauge")}</td>
        <td class="field-color">
          <div class="color-cell">
            <span class="swatch" style="${colorSwatchStyle(row.color)}"></span>
            <input data-field="color" list="colorChoices" value="${escapeHtml(row.color)}" aria-label="Color" title="Use shop notation like RED, RED/BLK, WHT/ORG, or BLU/WHT">
          </div>
        </td>
        <td><input data-field="length" value="${escapeHtml(row.length)}" aria-label="Length inches"></td>
        <td><input data-field="tapPosition" value="${escapeHtml(row.tapPosition)}" aria-label="Tap position inches"></td>
        <td class="field-branch-id">${selectField(row, "spliceId", branchIdChoices(), "Branch ID", branchIdSelectValue(row))}</td>
        <td class="divider-cell"></td>
        <td class="field-branch-role">${selectField(row, "spliceRole", branchRoleChoices(), "Branch Role", branchRoleSelectValue(row))}</td>
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
    const text = cleanCell(input);
    return text === "NONE" || text === "-" ? "" : text.toUpperCase();
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
  } else if (field === "spliceId") {
    const nextId = target.value === "None" ? "" : target.value.toUpperCase();
    if (!nextId) {
      row.spliceId = "";
      row.spliceRole = "";
    } else {
      row.spliceId = nextId;
    }
  } else if (field === "spliceRole") {
    const nextRole = target.value === "None" ? "" : target.value.toUpperCase();
    row.spliceRole = nextRole;
    if (nextRole && !normalizedSpliceId(row)) {
      row.spliceId = nextSpliceId();
    }
  } else if (field === "housing") {
    row.housing = target.value;
    applyCatalogParts(row, "left");
  } else if (field === "rightHousing") {
    row.rightHousing = target.value;
    applyCatalogParts(row, "right");
  } else if (field === "leftLegName") {
    setLegNameFor("left", row.leftLeg, target.value);
  } else if (field === "rightLegName") {
    setLegNameFor("right", row.rightLeg, target.value);
  } else {
    row[field] = target.value;
  }

  if (["housing", "leftHousingPart", "leftTerminalPart", "rightHousing", "rightHousingPart", "rightTerminalPart"].includes(field)) {
    state.catalog = normalizeCatalog(learnCatalogFromRows([row], state.catalog).catalog);
  }
  syncHarnessNameFromRows();
  saveState();
  if (shouldRenderTable) {
    render();
  } else {
    renderSummary();
    renderPreview();
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
  const row = createBlankRow();

  rememberUndo();
  state.rows.splice(index, 0, row);
  state.selectedId = row.id;
  saveState();
  render();
  showToast("Added a blank wire row.");
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
  Object.assign(row, blankWireFields());

  state.selectedId = state.rows.find(isActiveWireRow)?.id || row.id;
  saveState();
  render();
  showToast(`Cleared row ${rowNumber} and removed its wire.`);
}

function resetSample() {
  if (!window.confirm("Reset this harness to a blank wiring sheet?")) {
    return;
  }

  const previousCatalog = state.catalog;
  const bomAllowance = state.bomAllowance;
  const tableColumnWidths = state.tableColumnWidths;
  const previewPaneWidth = state.previewPaneWidth;
  const tableHidden = state.tableHidden;
  rememberUndo();
  state = blankState();
  state.catalog = normalizeCatalog(previousCatalog);
  state.bomAllowance = bomAllowance;
  state.tableColumnWidths = tableColumnWidths;
  state.previewPaneWidth = previewPaneWidth;
  state.tableHidden = tableHidden;
  saveState();
  if (dom.searchRows) {
    dom.searchRows.value = "";
  }
  if (dom.activeOnly) {
    dom.activeOnly.checked = false;
  }
  render();
  showToast("Blank wiring sheet ready.");
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

      const perEndpointHousing = ["powerpole", "ring", "resistor"].includes(item.family) || item.category === "Terminal" || item.category === "Component";
      const housingKey = perEndpointHousing
        ? `${side}|${leg}|${pin}|${item.name}`
        : `${side}|${leg}|${item.name}`;
      if (!housingInstances.has(housingKey)) {
        housingInstances.add(housingKey);
        const componentType = item.category === "Terminal"
          ? "Terminal"
          : item.category === "Component" || item.category === "Motor ESC"
            ? item.category
            : "Housing";
        addComponent(componentType, item.name, item.manufacturer, housingPart || item.partNumber, 1);
      }

      if (!["Terminal", "Component"].includes(item.category) && item.terminalType) {
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

function exportCsv() {
  syncHarnessNameFromRows();
  const lines = [
    EXPORT_HEADERS,
    ...state.rows.map((row, index) => [
      row.cableName || (index === 0 ? state.harnessName : ""),
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
      row.tapPosition,
      normalizedSpliceId(row),
      "",
      branchRoleDisplay(row) === "None" ? "" : branchRoleDisplay(row),
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

async function openImageImport() {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const rows = parseImportText(clipboardText);
    if (!rows.length) {
      showToast("No wiring rows were found on the clipboard.");
      return;
    }

    setPendingImportRows(rows);
    applyImportedRows({ confirmReplace: false });
  } catch (error) {
    showToast("Copy the spreadsheet rows first, then click Upload.");
    return;
  }
}

function closeImageImport() {
  if (dom.imageDialog && typeof dom.imageDialog.close === "function" && dom.imageDialog.open) {
    dom.imageDialog.close();
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

function applyImportedRows(options = {}) {
  const confirmReplace = options.confirmReplace !== false;
  if (!pendingImportRows.length) {
    dom.imageStatus.textContent = "Translate pasted rows before applying.";
    return;
  }

  if (confirmReplace) {
    const ok = window.confirm(`Replace the current table with ${pendingImportRows.length} imported row(s)?`);
    if (!ok) {
      return;
    }
  }

  rememberUndo();
  const importLegNames = pendingImportContext.legNames || { left: {}, right: {} };
  const hasImportLegNames = Boolean(
    Object.keys(importLegNames.left || {}).length
    || Object.keys(importLegNames.right || {}).length
  );
  state = normalizeState({
    harnessName: pendingImportContext.harnessName || state.harnessName,
    selectedId: pendingImportRows[0].id,
    rows: pendingImportRows,
    catalog: state.catalog,
    bomAllowance: state.bomAllowance,
    tableColumnWidths: state.tableColumnWidths,
    tableLayoutVersion: state.tableLayoutVersion,
    previewPaneWidth: state.previewPaneWidth,
    tableHidden: state.tableHidden,
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
  showToast("Imported rows applied and catalog updated.");
}

function renderImportPreview(rows) {
  pendingImportRows = rows;
  dom.importPreviewCount.textContent = `${rows.length} row${rows.length === 1 ? "" : "s"} ready`;
  if (!rows.length) {
    dom.importPreviewRows.innerHTML = `<tr><td colspan="${EXPORT_HEADERS.length}">No rows ready.</td></tr>`;
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
      <td>${escapeHtml(row.tapPosition)}</td>
      <td>${escapeHtml(normalizedSpliceId(row))}</td>
      <td></td>
      <td>${escapeHtml(branchRoleDisplay(row) === "None" ? "" : branchRoleDisplay(row))}</td>
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

function parseImportText(text) {
  const rows = [];
  const lines = value(text)
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
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

  if (looksLikeTemplateSheetRow(clean)) {
    return rowFromTemplateSheetRow(clean);
  }

  if (looksLikeBranchOnlyTemplateRow(clean)) {
    return rowFromTemplateSheetRow(clean);
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
  const clean = cells.map((cell) => value(cell).trim());
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
    tapPosition: mappedCell(cells, map, "tapPosition"),
    branch: mappedCell(cells, map, "branch"),
    spliceId: mappedCell(cells, map, "spliceId"),
    spliceRole: mappedCell(cells, map, "spliceRole"),
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
  const branchValue = mappedCell(cells, map, "branch");
  if (branchValue) {
    applyBranchValue(row, branchValue);
  }
  const mappedSpliceId = mappedCell(cells, map, "spliceId");
  if (mappedSpliceId) {
    row.spliceId = mappedSpliceId.toUpperCase();
  }
  const mappedSpliceRole = normalizedSpliceRole({ spliceRole: mappedCell(cells, map, "spliceRole") });
  if (mappedSpliceRole) {
    row.spliceRole = mappedSpliceRole;
  }
  if (row.spliceRole && !normalizedSpliceId(row)) {
    row.spliceId = nextSpliceId();
  }
  repairMappedBranchRightSide(row, clean, map);
  return row;
}

function mappedCell(cells, map, key) {
  const index = map[key];
  return Number.isInteger(index) ? cells[index] || "" : "";
}

function repairMappedBranchRightSide(row, clean, map) {
  if (normalizedSpliceRole(row) !== "BRANCH") {
    return;
  }

  const pinLooksWrong = Boolean(row.rightPin && !/^\d{1,2}$/.test(cleanCell(row.rightPin)));
  const needsRepair = pinLooksWrong || !cleanCell(row.rightHousing);
  if (!needsRepair) {
    return;
  }

  const rightStart = findMappedTemplateRightStart(clean, map);
  if (rightStart < 0) {
    return;
  }

  row.rightLeg = clean[rightStart] || "";
  row.rightLegName = clean[rightStart + 1] || "";
  row.rightPin = clean[rightStart + 2] || "";
  row.rightHousing = clean[rightStart + 3] || "";
  row.rightHousingPart = clean[rightStart + 4] || "";
  row.rightTerminalPart = clean[rightStart + 5] || "";
  row.toolUsed = clean[rightStart + 6] || "";
  row.comments = clean.slice(rightStart + 7).join(" ").trim() || row.comments;
}

function findMappedTemplateRightStart(clean, map) {
  const mappedStart = Number.isInteger(map.rightLeg) ? map.rightLeg : 13;
  const first = Math.max(0, mappedStart - 2);
  const last = Math.min(clean.length - 4, mappedStart + 2);
  for (let index = first; index <= last; index += 1) {
    if (looksLikeTemplateRightSideAt(clean, index)) {
      return index;
    }
  }
  return -1;
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

    if (key === "cableName" || key === "name" || key === "branch" || key === "tapPosition" || key === "spliceId" || key === "spliceRole" || key === "toolUsed" || key === "comments" || key === "awg" || key === "color" || key === "length") {
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
  if (text.includes("tap position") || text.includes("splice position") || text.includes("trunk position")) {
    return "tapPosition";
  }
  if (text === "branch id" || text === "branch number" || text === "splice id" || text === "splice number") {
    return "spliceId";
  }
  if ((text.includes("branch") || text.includes("splice")) && (text.includes("role") || text.includes("type"))) {
    return "spliceRole";
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

function looksLikeTapPositionCell(input) {
  const text = cleanCell(input);
  if (!text) {
    return false;
  }
  return /^\d+(?:\.\d+)?(?:\s*(?:in|inch|inches))?$/i.test(text);
}

function looksLikeTemplateSpliceIdCell(input) {
  return /^S\d+$/i.test(cleanCell(input));
}

function templateSheetLayout(clean) {
  const hasNewLayout = looksLikeTapPositionCell(clean[11]) || looksLikeTemplateSpliceIdCell(clean[12]) || normalizedSpliceRole({ spliceRole: clean[14] });
  return {
    hasTapPosition: looksLikeTapPositionCell(clean[11]),
    branchIndex: hasNewLayout ? 12 : 11,
    roleIndex: hasNewLayout ? 14 : 13
  };
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

function looksLikeBranchOnlyTemplateRow(clean) {
  return !clean[0] && !clean[1] && !clean[2] && Boolean(clean[3]);
}

function looksLikeTemplateSheetRow(clean) {
  const hasWireName = Boolean(clean[3]);
  const awgLooksValid = /^\d{1,2}$/.test(clean[8] || "");
  const lengthLooksValid = Boolean(clean[10]);
  const layout = templateSheetLayout(clean);
  const branchLooksValid = Boolean(clean[layout.branchIndex]);
  const hasLeftSide = Boolean(clean[1] && /^[A-Za-z0-9#-]+$/.test(clean[1]) && /^\d{1,2}$/.test(clean[4] || ""));
  const hasRightSide = findTemplateRightStart(clean) >= 0;
  return hasWireName && awgLooksValid && lengthLooksValid && branchLooksValid && (hasLeftSide || hasRightSide);
}

function rowFromTemplateSheetRow(clean) {
  const layout = templateSheetLayout(clean);
  const rightStart = findTemplateRightStart(clean);
  const branchValue = clean[layout.branchIndex] || "";
  const splitBranchRole = normalizedSpliceRole({ spliceRole: clean[layout.roleIndex] });
  const row = {
    cableName: clean[0] || "",
    leftLeg: clean[1] || "",
    leftLegName: clean[2] || "",
    name: clean[3] || "",
    leftPin: clean[4] || "",
    dnp: isDnp(clean[5]),
    housing: clean[5] || "",
    leftHousingPart: clean[6] || "",
    leftTerminalPart: clean[7] || "",
    awg: clean[8] || "",
    color: clean[9] || "",
    length: clean[10] || "",
    tapPosition: layout.hasTapPosition ? clean[11] || "" : "",
    branch: branchValue,
    spliceId: branchValue,
    spliceRole: splitBranchRole,
    rightLeg: rightStart >= 0 ? clean[rightStart] || "" : "",
    rightLegName: rightStart >= 0 ? clean[rightStart + 1] || "" : "",
    rightPin: rightStart >= 0 ? clean[rightStart + 2] || "" : "",
    rightHousing: rightStart >= 0 ? clean[rightStart + 3] || "" : "",
    rightHousingPart: rightStart >= 0 ? clean[rightStart + 4] || "" : "",
    rightTerminalPart: rightStart >= 0 ? clean[rightStart + 5] || "" : "",
    toolUsed: rightStart >= 0 ? clean[rightStart + 6] || "" : "",
    comments: rightStart >= 0 ? clean.slice(rightStart + 7).join(" ").trim() : ""
  };

  if (branchValue) {
    applyBranchValue(row, branchValue);
  }
  if (splitBranchRole) {
    row.spliceRole = splitBranchRole;
  }
  if (row.spliceRole && !normalizedSpliceId(row)) {
    row.spliceId = nextSpliceId();
  }
  return row;
}

function findTemplateRightStart(clean) {
  for (let index = 12; index <= 15; index += 1) {
    if (looksLikeTemplateRightSideAt(clean, index)) {
      return index;
    }
  }
  return -1;
}

function looksLikeTemplateRightSideAt(clean, index) {
  return Boolean(
    isTemplateRightLegToken(clean[index])
    && /^\d{1,2}$/.test(clean[index + 2] || "")
    && clean[index + 3]
  );
}

function isTemplateRightLegToken(input) {
  const text = cleanCell(input).trim().toUpperCase();
  if (!text) {
    return false;
  }
  if (/^\d{1,2}$/.test(text)) {
    return true;
  }
  if (text === "AUX" || text === "MAIN") {
    return true;
  }
  return options.legs.some((leg) => leg && leg.toUpperCase() === text);
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
  if (prepared.branch) {
    const parsedBranch = { spliceId: "", spliceRole: "" };
    applyBranchValue(parsedBranch, prepared.branch);
    if (!prepared.spliceId && parsedBranch.spliceId) {
      prepared.spliceId = parsedBranch.spliceId;
    }
    if (!prepared.spliceRole && parsedBranch.spliceRole) {
      prepared.spliceRole = parsedBranch.spliceRole;
    }
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
    tapPosition: cleanLength(prepared.tapPosition),
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
    row.cableName ||
    row.leftLeg ||
    row.leftPin ||
    row.name ||
    row.housing ||
    row.leftHousingPart ||
    row.leftTerminalPart ||
    row.awg ||
    row.color ||
    row.length ||
    row.tapPosition ||
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
  const canonical = canonicalHousingName(housing);
  if (canonical) {
    return canonical;
  }

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
        <th>#</th><th>Cable Name</th><th>Left Leg</th><th>Left Leg Name</th><th>Wire Name</th><th>Pin Pos #</th><th>Housing Type</th><th>Housing Part #</th><th>Pin P#</th><th>AWGuage</th><th>Color</th><th>Length inches</th><th>Tap Position inches</th><th>Branch ID</th><th></th><th>Branch Role</th><th>Right Leg</th><th>Right Leg Name</th><th>Pin Pos #</th><th>Housing Type</th><th>Housing Part #</th><th>Pin P#</th><th>Tool used</th><th>Comments</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.cableName)}</td>
          <td>${escapeHtml(row.leftLeg)}</td>
          <td>${escapeHtml(legNameFor("left", row.leftLeg))}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.leftPin)}</td>
          <td>${escapeHtml(row.housing)}</td>
          <td>${escapeHtml(row.leftHousingPart)}</td>
          <td>${escapeHtml(row.leftTerminalPart)}</td>
          <td>${escapeHtml(row.awg)}</td>
          <td>${escapeHtml(row.color)}</td>
          <td>${escapeHtml(row.length)}</td>
          <td>${escapeHtml(row.tapPosition)}</td>
          <td>${escapeHtml(normalizedSpliceId(row))}</td>
          <td></td>
          <td>${escapeHtml(branchRoleDisplay(row) === "None" ? "" : branchRoleDisplay(row))}</td>
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

function xmlAttrs(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([name, value]) => `${name}="${escapeXml(String(value)).replace(/\r?\n/g, "&#xa;")}"`)
    .join(" ");
}

function xmlTag(name, attrs = {}, inner = "") {
  const attrText = xmlAttrs(attrs);
  if (inner) {
    return `<${name}${attrText ? ` ${attrText}` : ""}>${inner}</${name}>`;
  }

  return `<${name}${attrText ? ` ${attrText}` : ""} />`;
}

function mxTextValue(input) {
  return value(input);
}

function mxPointXml(x, y, as = "") {
  return xmlTag("mxPoint", {
    x: Math.round(x),
    y: Math.round(y),
    as
  });
}

function mxArrayXml(attrs = {}, inner = "") {
  return xmlTag("Array", attrs, inner);
}

function mxGeometryXml(attrs = {}, inner = "") {
  return xmlTag("mxGeometry", attrs, inner);
}

function mxCellXml(attrs = {}, inner = "") {
  return xmlTag("mxCell", attrs, inner);
}

function drawIoSafeId(input) {
  return value(input)
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildDrawIoXml(scene = buildPreviewScene()) {
  const pageWidth = 1000;
  const pageHeight = scene.previewHeight;
  const connectorPadX = 26;
  const connectorPadTop = 20;
  const connectorPadBottom = 58;
  const cells = [];
  const addCell = (cell) => cells.push(cell);

  const connectorAsset = (connector, side) => {
    const assetWidth = Math.max(1, Math.ceil(connector.width + connectorPadX * 2));
    const assetHeight = Math.max(1, Math.ceil(connector.height + connectorPadTop + connectorPadBottom));
    const translateX = connectorPadX - connector.x;
    const translateY = connectorPadTop - connector.y;
    const assetSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${assetWidth}" height="${assetHeight}" viewBox="0 0 ${assetWidth} ${assetHeight}" overflow="visible">
        <style>
          .pin-number { fill: #f6a623; font: 10px Segoe UI, Arial, sans-serif; font-weight: 900; paint-order: stroke fill; stroke: rgba(8, 12, 10, 0.68); stroke-width: 2.2; }
          .wire-pin-number { fill: #f6a623; font: 10px Segoe UI, Arial, sans-serif; font-weight: 950; paint-order: stroke fill; stroke: rgba(8, 12, 10, 0.82); stroke-width: 2.8; }
        </style>
        <g transform="translate(${translateX}, ${translateY})">
          ${renderConnector(connector, side, scene.previewRows, scene.selected)}
        </g>
      </svg>
    `;
    return svgDataUri(assetSvg);
  };

  const makeConnectorCell = (connector, side) => {
    const connectorId = `conn_${side}_${drawIoSafeId(connector.key)}`;
    const groupX = Math.round(connector.x - connectorPadX);
    const groupY = Math.round(connector.y - connectorPadTop);
    const groupWidth = Math.round(connector.width + connectorPadX * 2);
    const groupHeight = Math.round(connector.height + connectorPadTop + connectorPadBottom);
    const imageWidth = Math.round(connector.width);
    const imageHeight = Math.round(connector.height);
    const imageUri = connectorAsset(connector, side);
    const ports = Array.from({ length: Math.max(1, connector.pinCount || 1) }, (_, index) => {
      const pin = String(index + 1);
      const point = pinPoint(connector, pin, side);
      const portId = `${connectorId}_pin_${pin}`;
      const portX = Math.round(point.x - groupX - 3);
      const portY = Math.round(point.y - groupY - 3);
      return mxCellXml({
        id: portId,
        value: "",
        style: "ellipse;opacity=0;fillOpacity=0;strokeOpacity=0;connectable=1;movable=0;resizable=0;deletable=0;editable=0;noLabel=1;",
        vertex: 1,
        connectable: 1,
        parent: connectorId
      }, mxGeometryXml({
        x: portX,
        y: portY,
        width: 6,
        height: 6,
        as: "geometry"
      }));
    }).join("");

    return `
      ${mxCellXml({
        id: connectorId,
        value: "",
        style: "group;html=1;movable=1;resizable=0;rotatable=0;editable=0;deletable=1;connectable=0;strokeColor=none;fillColor=none;",
        vertex: 1,
        parent: "1",
        [`data-type`]: "connector",
        [`data-side`]: side,
        [`data-key`]: connector.key,
        [`data-housing`]: connector.housing || "",
        [`data-family`]: connector.family || "",
        [`data-pin-count`]: connector.pinCount || 0
      }, `
        ${mxGeometryXml({
          x: groupX,
          y: groupY,
          width: groupWidth,
          height: groupHeight,
          as: "geometry"
        })}
        ${mxCellXml({
          id: `${connectorId}_image`,
          value: "",
          style: `shape=image;image=${imageUri};aspect=fixed;imageAspect=0;movable=0;resizable=0;rotatable=0;editable=0;deletable=0;connectable=0;noLabel=1;`,
          vertex: 1,
          parent: connectorId
        }, mxGeometryXml({
          x: connectorPadX,
          y: connectorPadTop,
          width: imageWidth,
          height: imageHeight,
          as: "geometry"
        }))}
        ${ports}
      `)}
    `;
  };

  const makeWireGeometry = (points) => {
    const [sourcePoint] = points;
    const targetPoint = points[points.length - 1];
    const waypoints = points.slice(1, -1).map((point) => mxPointXml(point.x, point.y)).join("");
    return mxGeometryXml({
      relative: 1,
      as: "geometry"
    }, `
      ${mxPointXml(sourcePoint.x, sourcePoint.y, "sourcePoint")}
      ${mxPointXml(targetPoint.x, targetPoint.y, "targetPoint")}
      ${waypoints ? mxArrayXml({ as: "points" }, waypoints) : ""}
    `);
  };

  const makeSpliceCell = (point) => {
    const spliceId = `splice_${drawIoSafeId(point.spliceId || "splice")}`;
    return mxCellXml({
      id: spliceId,
      value: "",
      style: "ellipse;whiteSpace=wrap;html=1;aspect=fixed=1;fillColor=#1c241f;strokeColor=#596861;strokeWidth=2;fontColor=#f8fbf7;fontSize=10;fontStyle=1;align=center;verticalAlign=middle;movable=1;resizable=0;rotatable=0;editable=1;deletable=1;",
      vertex: 1,
      parent: "1",
      [`data-type`]: "splice",
      [`data-splice-id`]: point.spliceId || ""
    }, mxGeometryXml({
      x: Math.round(point.x - 9),
      y: Math.round(point.y - 9),
      width: 18,
      height: 18,
      as: "geometry"
    }));
  };

  const makeWireLabelCell = (row, start, end, index) => {
    const label = wireDrawingLabel(row, scene.routedWires.length);
    if (!label) {
      return "";
    }

    const tag = wireNameTagPosition(start, end, index, scene.routeBaseY, scene.previewHeight, label.tagWidth, scene.routedWires.length, row);
    return mxCellXml({
      id: `wire_label_${drawIoSafeId(row.id)}`,
      value: mxTextValue(label.lines[0]),
      style: `text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontColor=#101814;fontSize=${label.compact ? 11 : 12};fontStyle=1;align=center;verticalAlign=middle;spacing=2;movable=1;resizable=0;rotatable=0;editable=1;deletable=1;`,
      vertex: 1,
      parent: "1",
      [`data-type`]: "wire-label",
      [`data-row-id`]: row.id || "",
      [`data-wire-name`]: value(row?.name).trim(),
      [`data-awg`]: row.awg || "",
      [`data-length`]: row.length || ""
    }, mxGeometryXml({
      x: Math.round(tag.x - label.tagWidth / 2),
      y: Math.round(tag.y - label.tagHeight / 2),
      width: Math.round(label.tagWidth),
      height: Math.round(label.tagHeight),
      as: "geometry"
    }));
  };

  const makeHeatshrinkCell = (side, group, routeBaseY, previewHeight) => {
    const crowd = crowdingFactor(group.routes.length, 3, 5);
    const legName = legNameFor(side, group.leg);
    const box = heatshrinkGroupBox(group, side, routeBaseY, previewHeight, crowd);
    const text = `${side === "left" ? "LEFT" : "RIGHT"} ${group.leg}\n${legName || "Leg name"}\n${group.routes[0]?.row?.housing || "Housing"}`;
    return mxCellXml({
      id: `heat_${side}_${drawIoSafeId(group.leg)}`,
      value: mxTextValue(text),
      style: `rounded=1;whiteSpace=wrap;html=1;fillColor=#000000;fillOpacity=${Math.max(22, 30 - Math.round(crowd * 8))};strokeColor=#0f1110;strokeOpacity=${Math.max(48, 62 - Math.round(crowd * 10))};strokeWidth=1.5;fontColor=#f8fbf7;align=center;verticalAlign=middle;movable=1;resizable=1;rotatable=0;editable=1;deletable=1;`,
      vertex: 1,
      parent: "1",
      [`data-type`]: "heatshrink",
      [`data-side`]: side,
      [`data-leg`]: group.leg || "",
      [`data-leg-name`]: legName || ""
    }, mxGeometryXml({
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
      as: "geometry"
    }));
  };

  const makeTitleCell = () => {
    if (!state.harnessName) {
      return "";
    }

    const width = scene.cableNameWidth || 120;
    const height = 46;
    return mxCellXml({
      id: "harness_title",
      value: mxTextValue(scene.cableNameText || state.harnessName),
      style: "rounded=1;whiteSpace=wrap;html=1;fillColor=#6d128c;strokeColor=#a83ad1;strokeWidth=2;fontColor=#fff5ff;align=center;verticalAlign=middle;movable=1;resizable=0;rotatable=0;editable=1;deletable=1;",
      vertex: 1,
      parent: "1",
      [`data-type`]: "title"
    }, mxGeometryXml({
      x: Math.round(scene.cableNameCenterX - width / 2),
      y: Math.round(scene.cableNameY),
      width: Math.round(width),
      height,
      as: "geometry"
    }));
  };

  const makeToolNoteCell = () => {
    const label = drawingToolSummary(scene.routedWires.map((route) => route.item));
    if (!label) {
      return "";
    }

    const width = clamp(label.length * 7.2 + 26, 120, 360);
    const height = 26;
    return mxCellXml({
      id: "tool_note",
      value: mxTextValue(label),
      style: "rounded=1;whiteSpace=wrap;html=1;fillColor=#f8faf5;fillOpacity=62;strokeColor=#d9dfd7;strokeOpacity=78;strokeWidth=1.4;fontColor=#101814;fontSize=11;fontStyle=1;align=right;verticalAlign=middle;spacingRight=10;movable=1;resizable=0;rotatable=0;editable=1;deletable=1;",
      vertex: 1,
      parent: "1",
      [`data-type`]: "tool-note"
    }, mxGeometryXml({
      x: Math.round(pageWidth - width - 18),
      y: Math.round(pageHeight - height - 16),
      width: Math.round(width),
      height,
      as: "geometry"
    }));
  };

  scene.routedWires.forEach(({ item, index, endpoints }) => {
    const { start, end } = endpoints;
    const wireStyle = wireDrawingStyle(item);
    const pathPoints = wireRoutePoints(start, end, index, scene.routeBaseY, scene.routedWires.length, item);
    const isDark = wireStyle.outline === "#edf2ec";

    if (wireStyle.shielded) {
      addCell(mxCellXml({
        id: `wire_shield_${drawIoSafeId(item.id)}`,
        value: "",
        style: "edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=auto;orthogonalLoop=1;html=1;strokeColor=#6f7771;strokeWidth=11;strokeOpacity=36;dashed=1;dashPattern=18 12;endArrow=none;startArrow=none;movable=1;editable=0;resizable=0;",
        edge: 1,
        parent: "1",
        [`data-type`]: "wire-shield",
        [`data-row-id`]: item.id || ""
      }, makeWireGeometry(pathPoints)));
    }

    addCell(mxCellXml({
      id: `wire_outline_${drawIoSafeId(item.id)}`,
      value: "",
      style: `edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=auto;orthogonalLoop=1;html=1;strokeColor=${wireStyle.outline};strokeWidth=${isDark ? 7 : 6};strokeOpacity=82;endArrow=none;startArrow=none;movable=1;editable=0;resizable=0;`,
      edge: 1,
      parent: "1",
      [`data-type`]: "wire-outline",
      [`data-row-id`]: item.id || ""
    }, makeWireGeometry(pathPoints)));

    addCell(mxCellXml({
      id: `wire_${drawIoSafeId(item.id)}`,
      value: "",
      style: `edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=auto;orthogonalLoop=1;html=1;strokeColor=${wireStyle.base};strokeWidth=${isDark ? 4 : 3};endArrow=none;startArrow=none;movable=1;editable=0;resizable=0;`,
      edge: 1,
      parent: "1",
      [`data-type`]: "wire",
      [`data-row-id`]: item.id || "",
      [`data-wire-name`]: item.name || "",
      [`data-color`]: item.color || "",
      [`data-length`]: item.length || ""
    }, makeWireGeometry(pathPoints)));

    if (wireStyle.stripe) {
      addCell(mxCellXml({
        id: `wire_stripe_${drawIoSafeId(item.id)}`,
        value: "",
        style: `edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=auto;orthogonalLoop=1;html=1;strokeColor=${wireStyle.stripe};strokeWidth=2;dashed=1;dashPattern=14 10;endArrow=none;startArrow=none;movable=1;editable=0;resizable=0;`,
        edge: 1,
        parent: "1",
        [`data-type`]: "wire-stripe",
        [`data-row-id`]: item.id || ""
      }, makeWireGeometry(pathPoints)));
    }

    if (wireStyle.twisted) {
      addCell(mxCellXml({
        id: `wire_twist_${drawIoSafeId(item.id)}`,
        value: "",
        style: "edgeStyle=orthogonalEdgeStyle;rounded=0;jettySize=auto;orthogonalLoop=1;html=1;strokeColor=#f8faf5;strokeWidth=1;strokeOpacity=82;dashed=1;dashPattern=2 9;endArrow=none;startArrow=none;movable=1;editable=0;resizable=0;",
        edge: 1,
        parent: "1",
        [`data-type`]: "wire-twist",
        [`data-row-id`]: item.id || ""
      }, makeWireGeometry(pathPoints)));
    }

    addCell(makeWireLabelCell(item, start, end, index));
  });

  scene.leftConnectors.forEach((connector) => addCell(makeConnectorCell(connector, "left")));
  scene.rightConnectors.forEach((connector) => addCell(makeConnectorCell(connector, "right")));

  scene.splicePoints.forEach((point) => addCell(makeSpliceCell(point)));

  collectHeatshrinkGroups("left", scene.routedWires).forEach((group) => {
    addCell(makeHeatshrinkCell("left", group, scene.routeBaseY, scene.previewHeight));
  });
  collectHeatshrinkGroups("right", scene.routedWires).forEach((group) => {
    addCell(makeHeatshrinkCell("right", group, scene.routeBaseY, scene.previewHeight));
  });

  addCell(makeTitleCell());
  addCell(makeToolNoteCell());

  const diagramName = escapeXml(state.harnessName || "Harness");
  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Wiring Harness Designer" type="device">
  <diagram id="${drawIoSafeId(state.harnessName || "harness")}" name="${diagramName}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="#d9ddda" math="0" shadow="0">
      <root>
        ${mxCellXml({ id: "0" })}
        ${mxCellXml({ id: "1", parent: "0" })}
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function postDrawIoMessage(message) {
  if (!drawIoWindow || drawIoWindow.closed) {
    return false;
  }

  drawIoWindow.postMessage(JSON.stringify(message), DRAWIO_EMBED_ORIGIN);
  return true;
}

function openDrawIoEditor() {
  const xml = buildDrawIoXml();
  state.drawioXml = xml;
  saveState();

  const width = Math.min(1600, Math.max(1120, Math.round(window.innerWidth * 0.9)));
  const height = Math.min(1100, Math.max(820, Math.round(window.innerHeight * 0.88)));
  const url = `${DRAWIO_EMBED_ORIGIN}/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1`;
  if (!drawIoWindow || drawIoWindow.closed) {
    drawIoReady = false;
    drawIoPendingXml = xml;
    drawIoWindow = window.open(url, "wiringHarnessDrawIo", `popup=yes,width=${width},height=${height}`);
  } else {
    drawIoPendingXml = xml;
    if (drawIoReady) {
      postDrawIoMessage({
        action: "load",
        xml,
        title: state.harnessName || "Harness"
      });
    } else {
      drawIoWindow.focus();
    }
  }

  if (!drawIoWindow) {
    downloadText(`${fileSafeName(state.harnessName)}.drawio`, xml, "application/xml");
    showToast("Popup blocked. Downloaded a .drawio file instead.");
    return;
  }

  drawIoWindow.focus();
  showToast("Opening draw.io...");
}

function handleDrawIoMessage(event) {
  if (event.origin !== DRAWIO_EMBED_ORIGIN) {
    return;
  }

  let message = event.data;
  if (typeof message === "string") {
    try {
      message = JSON.parse(message);
    } catch (error) {
      return;
    }
  }

  if (!message || typeof message !== "object") {
    return;
  }

  if (message.event === "init") {
    drawIoReady = true;
    const xml = drawIoPendingXml || buildDrawIoXml();
    drawIoPendingXml = "";
    postDrawIoMessage({
      action: "load",
      xml,
      title: state.harnessName || "Harness"
    });
    return;
  }

  if (message.event === "save" || message.event === "exit") {
    if (message.xml) {
      state.drawioXml = message.xml;
      saveState();
    }
    showToast(message.event === "exit" ? "draw.io export closed." : "draw.io diagram saved.");
    if (message.event === "exit" && drawIoWindow && !drawIoWindow.closed) {
      drawIoWindow.close();
    }
    if (message.event === "exit") {
      drawIoReady = false;
      drawIoWindow = null;
      drawIoPendingXml = "";
    }
  }
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
dom.undoButton.addEventListener("click", undoLastChange);
dom.addRow.addEventListener("click", addRow);
dom.duplicateRow.addEventListener("click", duplicateRow);
dom.deleteRow.addEventListener("click", deleteSelectedRow);
dom.resetSample.addEventListener("click", resetSample);
dom.toggleTableButton.addEventListener("click", toggleTableVisibility);
dom.qualityButton.addEventListener("click", () => {
  renderQualityDialog();
  dom.qualityDialog.showModal();
});
dom.copyQualityIssues.addEventListener("click", () => {
  void copyQualityErrors();
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
dom.translateImageText.addEventListener("click", translateImageText);
dom.applyImageRows.addEventListener("click", applyImportedRows);
dom.exportCsv.addEventListener("click", exportCsv);
dom.exportDrawing.addEventListener("click", exportDrawingSvg);
dom.exportInstructions.addEventListener("click", exportInstructions);
dom.drawIoButton.addEventListener("click", openDrawIoEditor);
dom.printButton.addEventListener("click", printHarness);
dom.importJsonButton.addEventListener("click", () => dom.importJson.click());
dom.importJson.addEventListener("change", () => {
  const [file] = dom.importJson.files;
  if (file) {
    importJson(file);
  }
  dom.importJson.value = "";
});
dom.importText.addEventListener("input", () => {
  if (dom.importText.value.trim()) {
    dom.imageStatus.textContent = "Text changed. Press Translate to preview rows.";
  }
});
dom.wirePreview.addEventListener("pointerdown", startWireDrag);
dom.wirePreview.addEventListener("dblclick", resetWireDrag);
document.addEventListener("keydown", handleWireRouteShortcut);
drawIoMessageHandler = handleDrawIoMessage;
window.addEventListener("message", drawIoMessageHandler);

setupColumnResizers();
setupLayoutSplitter();
render();
