"use strict";

(function exposeMasterDiagram(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DigiWireMaster = api;
})(typeof globalThis === "object" ? globalThis : this, function createMasterDiagramApi() {
  const SIDES = Object.freeze([
    ["left", "pcbLeft"],
    ["top", "pcbTop"],
    ["right", "pcbRight"],
    ["bottom", "pcbBottom"],
    ["corner-left-top", "pcbCornerLeftTop"],
    ["corner-top-right", "pcbCornerTopRight"],
    ["corner-right-bottom", "pcbCornerRightBottom"],
    ["corner-bottom-left", "pcbCornerBottomLeft"],
    ["center", "pcbCenter"]
  ]);
  const CABLE_COLORS = Object.freeze([
    "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#0891b2", "#9333ea", "#4b5563"
  ]);
  const MASTER_BOARD_SIZE = 560;
  const MASTER_BOARD_GAP = 320;
  const MASTER_CENTER_X = 1600;
  const MASTER_TOP_Y = 140;
  const ROUTE_BOARD_CLEARANCE = 54;

  const text = (value) => String(value ?? "").trim();
  const normalized = (value) => text(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  const meaningful = (value) => Boolean(text(value)) && !["NONE", "N/A", "NA", "TBD", "-"].includes(normalized(value));
  const escapeXml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const slug = (value) => normalized(value).replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 44) || "ITEM";
  const hash = (value) => {
    let output = 2166136261;
    for (const char of String(value || "")) {
      output ^= char.charCodeAt(0);
      output = Math.imul(output, 16777619);
    }
    return (output >>> 0).toString(36);
  };
  const stableId = (prefix, value) => `${prefix}_${slug(value)}_${hash(value)}`;
  const isCpcConnector = (connector) => /^CPC\s*\d+$/i.test(text(connector?.name));
  const isPowerPoleConnector = (connector) => /^POWERPOLE\d*$/.test(normalized(connector?.name).replace(/\s+/g, ""));
  const connectorIdentity = (value) => {
    const name = normalized(value);
    const compact = name.replace(/\s+/g, "");
    return /^(?:POWERPOLE\d*|CPC\d+)$/.test(compact) ? compact : name;
  };
  const isFloatingEndpointName = (value) => normalized(value) === "FLOATING";
  const firstFilled = (rows, key) => rows.map((row) => text(row[key])).find(Boolean) || "";
  const normalizeBoardArrangement = (value) => {
    const key = normalized(value);
    if (["MIDDLE", "CENTER", "CENTRE"].includes(key)) return "middle";
    if (key === "TOP") return "top";
    if (key === "LEFT") return "left";
    if (key === "RIGHT") return "right";
    if (["BOTTOM", "BOTTEM"].includes(key)) return "bottom";
    return "";
  };
  const isDnp = (row) => /\b(?:DNP|NOT IN USE|NOT USED|UNUSED|DO NOT POPULATE|NO WIRE|NO CONNECT(?:ION)?|N\/?C)\b/.test(normalized([
    row.leftLegName, row.wireName, row.rightLegName, row.rightWireName, row.branchRole
  ].join(" ")));

  function createProject() {
    return {
      version: 1,
      boards: [],
      harnesses: [],
      imports: []
    };
  }

  function addSheet(project, sheet, sourceName = "Pasted table") {
    const target = project || createProject();
    const boardRecords = extractBoards(sheet?.objects || []);
    const harnessRecords = extractHarnesses(sheet?.objects || [], sourceName);
    boardRecords.forEach((board) => upsert(target.boards, board));
    harnessRecords.forEach((harness) => upsert(target.harnesses, harness));
    target.imports.push({
      sourceName,
      boardCount: boardRecords.length,
      harnessCount: harnessRecords.length,
      rowCount: sheet?.objects?.length || 0
    });
    return {
      project: target,
      addedBoards: boardRecords.length,
      addedHarnesses: harnessRecords.length,
      graph: resolveProject(target)
    };
  }

  function upsert(items, record) {
    const index = items.findIndex((item) => item.key === record.key);
    if (index >= 0) items.splice(index, 1, record);
    else items.push(record);
  }

  function extractBoards(rows) {
    const grouped = new Map();
    let currentBoardName = "";
    rows.forEach((row) => {
      if (meaningful(row.pcbName)) currentBoardName = text(row.pcbName);
      if (!currentBoardName) return;
      const key = normalized(currentBoardName);
      if (!grouped.has(key)) {
        grouped.set(key, { key, name: currentBoardName, part: "", arrangement: "", arrangementSource: "", connectors: [] });
      }
      const board = grouped.get(key);
      if (meaningful(row.pcbPart)) board.part = text(row.pcbPart);
      if (meaningful(row.pcbArrangement)) {
        board.arrangementSource = text(row.pcbArrangement);
        board.arrangement = normalizeBoardArrangement(row.pcbArrangement);
      }
      SIDES.forEach(([side, field]) => {
        splitConnectorNames(row[field]).forEach((name) => {
          const connectorKey = `${side}:${normalized(name)}`;
          if (!board.connectors.some((connector) => connector.key === connectorKey)) {
            board.connectors.push({ key: connectorKey, name, side });
          }
        });
      });
    });
    return Array.from(grouped.values()).filter((board) => board.name);
  }

  function splitConnectorNames(value) {
    return text(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .split(/[,;|\r\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function extractHarnesses(rows, sourceName) {
    const grouped = new Map();
    let currentCableName = "";
    rows.forEach((row) => {
      if (meaningful(row.cableName)) currentCableName = text(row.cableName);
      if (!currentCableName) return;
      const hasRouteEvidence = meaningful(row.wireName) || meaningful(row.rightWireName) ||
        meaningful(row.leftLegName) || meaningful(row.rightLegName);
      if (!hasRouteEvidence) return;
      const key = normalized(currentCableName);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ ...row, cableName: currentCableName });
    });
    return Array.from(grouped, ([key, cableRows]) => {
      const activeRows = cableRows.filter((row) => !isDnp(row));
      const leftEndpoints = extractEndpoints(activeRows, "left");
      const rightEndpoints = extractEndpoints(activeRows, "right");
      const lengths = Array.from(new Set(activeRows.map((row) => text(row.length)).filter(Boolean)));
      return {
        key,
        name: firstFilled(cableRows, "cableName") || text(sourceName).replace(/\.[^.]+$/, "") || "CABLE",
        sourceName,
        wireCount: activeRows.length,
        length: lengths.length === 1 ? lengths[0] : lengths.length > 1 ? "VARIOUS" : "",
        endpoints: [...leftEndpoints, ...rightEndpoints]
      };
    }).filter((harness) => harness.wireCount > 0 && harness.endpoints.length > 0);
  }

  function extractEndpoints(rows, side) {
    const prefix = side === "left" ? "left" : "right";
    const grouped = new Map();
    rows.forEach((row) => {
      const leg = text(row[`${prefix}Leg`]);
      const name = text(row[`${prefix}LegName`]) || text(row[`${prefix}HousingPart`]) ||
        text(row[`${prefix}HousingType`]) || (leg ? `${side.toUpperCase()} LEG ${leg}` : "");
      if (!name) return;
      const key = leg ? `LEG:${normalized(leg)}` : `NAME:${normalized(name)}`;
      if (!grouped.has(key)) grouped.set(key, { key, name, side, leg, floating: isFloatingEndpointName(name), rowCount: 0 });
      grouped.get(key).rowCount += 1;
    });
    return Array.from(grouped.values());
  }

  function resolveProject(project) {
    const boards = project.boards.map((board) => ({
      ...board,
      connectors: board.connectors.map((connector) => ({ ...connector }))
    }));
    const connectors = boards.flatMap((board) => board.connectors.map((connector) => ({
      ...connector,
      boardKey: board.key,
      boardName: board.name,
      boardPart: board.part
    })));
    const diagnostics = [];
    boards.forEach((board) => {
      if (board.arrangementSource && !board.arrangement) {
        diagnostics.push({
          severity: "warning",
          code: "INVALID_BOARD_ARRANGEMENT",
          message: `${board.name} arrangement ${board.arrangementSource} is not recognized. Use MIDDLE, TOP, LEFT, RIGHT, or BOTTEM.`
        });
      }
    });
    const harnesses = project.harnesses.map((harness) => ({
      ...harness,
      endpoints: harness.endpoints.map((endpoint) => {
        const match = endpoint.floating
          ? { connector: null, floating: true, ambiguous: false, candidates: [] }
          : matchEndpoint(endpoint, connectors, boards);
        if (match.inferred) {
          const board = boards.find((item) => item.key === match.connector.boardKey);
          const connector = {
            key: match.connector.key,
            name: match.connector.name,
            side: match.connector.side,
            inferred: true
          };
          if (board && !board.connectors.some((item) => item.key === connector.key)) board.connectors.push(connector);
          if (!connectors.some((item) => item.boardKey === match.connector.boardKey && item.key === connector.key)) connectors.push(match.connector);
        }
        if (!match.connector && !match.floating) {
          diagnostics.push({
            severity: "warning",
            code: match.ambiguous ? "AMBIGUOUS_MASTER_CONNECTOR" : "UNMATCHED_MASTER_CONNECTOR",
            message: match.ambiguous
              ? `${harness.name} ${endpoint.side} endpoint ${endpoint.name} matches more than one PCB connector.`
              : `${harness.name} ${endpoint.side} endpoint ${endpoint.name} is not assigned to a PCB connector.`
          });
        }
        return { ...endpoint, match };
      })
    }));
    return { boards, harnesses, connectors, diagnostics };
  }

  function boardAliases(board) {
    const full = normalized(board.name);
    const short = full.replace(/\s+(?:BOARD|PCB)$/, "").trim();
    return Array.from(new Set([full, short].filter(Boolean))).sort((left, right) => right.length - left.length);
  }

  function namedBoard(endpointName, boards) {
    const matches = [];
    boards.forEach((board) => boardAliases(board).forEach((alias) => {
      if (endpointName === alias || endpointName.startsWith(`${alias} `) || endpointName.endsWith(` ${alias}`)) {
        matches.push({ board, alias });
      }
    }));
    if (!matches.length) return null;
    matches.sort((left, right) => right.alias.length - left.alias.length);
    const longest = matches[0].alias.length;
    const best = matches.filter((item) => item.alias.length === longest);
    return new Set(best.map((item) => item.board.key)).size === 1 ? best[0] : null;
  }

  function inferredConnectorSide(board, endpointSide) {
    if (board.arrangement === "left") return "right";
    if (board.arrangement === "right") return "left";
    if (board.arrangement === "top") return "bottom";
    if (board.arrangement === "bottom") return "top";
    return endpointSide === "left" ? "right" : "left";
  }

  function matchEndpoint(endpoint, connectors, boards) {
    const endpointName = normalized(endpoint.name);
    const boardMatch = namedBoard(endpointName, boards);
    if (boardMatch) {
      const connectorName = normalized(endpointName.replace(new RegExp(`^${boardMatch.alias}(?:\\s+|$)|(?:\\s+|^)${boardMatch.alias}$`, "i"), " "));
      const boardConnectors = connectors.filter((connector) => connector.boardKey === boardMatch.board.key);
      const fullExact = boardConnectors.filter((connector) => connectorIdentity(connector.name) === connectorIdentity(endpointName));
      if (fullExact.length === 1) return { connector: fullExact[0], ambiguous: false, candidates: fullExact, boardMatched: true };
      if (fullExact.length > 1) return { connector: null, ambiguous: true, candidates: fullExact, boardMatched: true };
      const exact = boardConnectors.filter((connector) => connectorIdentity(connector.name) === connectorIdentity(connectorName));
      if (exact.length === 1) return { connector: exact[0], ambiguous: false, candidates: exact, boardMatched: true };
      if (exact.length > 1) return { connector: null, ambiguous: true, candidates: exact, boardMatched: true };
      if (connectorName && /^J?[A-Z0-9][A-Z0-9._/-]*$/.test(connectorName.replace(/\s+/g, ""))) {
        const displayName = text(endpoint.name)
          .replace(new RegExp(`^${boardMatch.alias}(?:\\s+|$)`, "i"), "")
          .trim() || connectorName;
        const side = inferredConnectorSide(boardMatch.board, endpoint.side);
        const existing = boardConnectors.find((connector) => connector.inferred && normalized(connector.name) === normalized(displayName));
        const connector = existing || {
          key: `inferred:${side}:${normalized(displayName)}`,
          name: displayName,
          side,
          inferred: true,
          boardKey: boardMatch.board.key,
          boardName: boardMatch.board.name,
          boardPart: boardMatch.board.part
        };
        return { connector, ambiguous: false, candidates: [connector], boardMatched: true, inferred: !existing };
      }
      return { connector: null, ambiguous: false, candidates: [], boardMatched: true };
    }
    const candidates = connectors.map((connector) => {
      const connectorName = normalized(connector.name);
      const endpointIdentity = connectorIdentity(endpointName);
      const connectorExactIdentity = connectorIdentity(connectorName);
      let score = 0;
      if (endpointIdentity === connectorExactIdentity) score = 100;
      if (connectorName.length >= 2 && (endpointName.endsWith(` ${connectorName}`) || endpointName.startsWith(`${connectorName} `))) score = Math.max(score, 75);
      if (endpointName.length >= 3 && connectorName.includes(endpointName)) score = Math.max(score, 60);
      return { connector, score };
    }).filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score);
    if (!candidates.length) return { connector: null, ambiguous: false, candidates: [] };
    const bestScore = candidates[0].score;
    const best = candidates.filter((candidate) => candidate.score === bestScore);
    return best.length === 1
      ? { connector: best[0].connector, ambiguous: false, candidates: best.map((item) => item.connector) }
      : { connector: null, ambiguous: true, candidates: best.map((item) => item.connector) };
  }

  function projectSummary(project) {
    const graph = resolveProject(project);
    return {
      boardCount: graph.boards.length,
      connectorCount: graph.connectors.length,
      harnessCount: project.harnesses.length,
      wireCount: project.harnesses.reduce((total, harness) => total + harness.wireCount, 0),
      warningCount: graph.diagnostics.length
    };
  }

  function buildDrawioXml(project, options = {}) {
    const graph = resolveProject(project);
    const layout = layoutGraph(graph, options);
    const cells = [
      `<mxCell id="0" />`,
      `<mxCell id="1" parent="0" />`
    ];
    const addVertex = (id, value, x, y, width, height, style) => cells.push(
      `<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" /></mxCell>`
    );
    const addEdge = (id, value, source, target, style, points = []) => {
      const waypointXml = points.length
        ? `<Array as="points">${points.map((point) => `<mxPoint x="${Math.round(point.x)}" y="${Math.round(point.y)}" />`).join("")}</Array>`
        : "";
      cells.push(`<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" edge="1" parent="1" source="${escapeXml(source)}" target="${escapeXml(target)}"><mxGeometry relative="1" as="geometry">${waypointXml}</mxGeometry></mxCell>`);
    };

    addVertex("master_title", "DIGIWIRE MASTER WIRE ROUTING", 40, 24, Math.max(780, layout.pageWidth - 80), 42,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=28;fontStyle=1;fontColor=#111827;align=left;");
    const summary = projectSummary(project);
    addVertex("master_summary", `${summary.boardCount} PCB BOARDS | ${summary.connectorCount} CONNECTORS | ${summary.harnessCount} CABLES | ${summary.wireCount} CONDUCTORS`, 40, 66, Math.max(780, layout.pageWidth - 80), 26,
      "text;html=1;strokeColor=none;fillColor=none;fontSize=12;fontStyle=1;fontColor=#4b5563;align=left;");

    layout.boards.forEach((item) => {
      const board = item.board;
      addVertex(item.cellId, `${board.name}${board.part ? ` | ${board.part}` : ""}`, item.x, item.y, item.width, item.height,
        "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#f8fafc;strokeColor=#1f4f3a;strokeWidth=3;fontSize=18;fontStyle=1;verticalAlign=top;spacingTop=18;");
      item.ports.forEach((port) => {
        const cpc = isCpcConnector(port.connector);
        const powerPole = isPowerPoleConnector(port.connector);
        const sideColor = {
          left: "#dbeafe", top: "#fef3c7", right: "#dcfce7", bottom: "#f3e8ff",
          "corner-left-top": "#e0f2fe", "corner-top-right": "#e0f2fe",
          "corner-right-bottom": "#e0f2fe", "corner-bottom-left": "#e0f2fe", center: "#fce7f3"
        }[port.connector.side];
        const label = cpc
          ? `<b>${port.connector.name}</b><br><font style=\"font-size:9px\">16 POS</font>`
          : powerPole
            ? `<b>${port.connector.name}</b><br><font style=\"font-size:9px\">CONNECTOR</font>`
            : port.connector.name;
        addVertex(port.cellId, label, port.x, port.y, port.width, port.height,
          cpc
            ? `ellipse;aspect=fixed;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#0f4c5c;strokeWidth=3;fontSize=12;fontStyle=1;`
            : powerPole
              ? `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#dc2626;gradientColor=#111827;gradientDirection=east;fontColor=#ffffff;strokeColor=#111827;strokeWidth=3;fontSize=11;fontStyle=1;`
            : `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${sideColor};strokeColor=#374151;strokeWidth=2;fontSize=11;fontStyle=1;`);
      });
    });

    layout.externals.forEach((external) => addVertex(external.cellId, `UNMATCHED | ${external.endpoint.name}`, external.x, external.y, 170, 58,
      "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#fff1f2;strokeColor=#dc2626;strokeWidth=2;fontSize=11;fontStyle=1;"));

    layout.floatingCaps.forEach((cap) => addVertex(cap.cellId, "CAP", cap.x, cap.y, cap.width, cap.height,
      "rounded=1;arcSize=50;whiteSpace=wrap;html=1;fillColor=#f59e0b;gradientColor=#fef3c7;gradientDirection=south;strokeColor=#78350f;strokeWidth=3;fontColor=#111827;fontSize=9;fontStyle=1;"));

    layout.harnesses.forEach((item) => {
      const color = cableColor(item.harness.name);
      const label = harnessLabel(item.harness);
      if (item.junction) {
        addVertex(item.junction.cellId, item.harness.name, item.junction.x, item.junction.y, 136, 54,
          `rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${color};strokeWidth=3;fontSize=11;fontStyle=1;`);
        item.endpointRoutes.forEach((route, index) => addEdge(`${item.cellId}_branch_${index + 1}`, index === 0 ? label : "", route.cellId, item.junction.cellId,
          cableEdgeStyle(color, route.port), item.branchWaypoints[index]));
      } else if (item.endpointCells.length === 2) {
        addEdge(item.cellId, label, item.endpointCells[0], item.endpointCells[1], cableEdgeStyle(color, item.endpointRoutes[0].port, item.endpointRoutes[1].port), item.waypoints);
      } else if (item.endpointCells.length === 1) {
        const endpointCell = item.endpointCells[0];
        addVertex(`${item.cellId}_open`, "OPEN END", item.openX, item.openY, 110, 40,
          "rounded=1;whiteSpace=wrap;html=1;fillColor=#f9fafb;strokeColor=#6b7280;strokeWidth=2;dashed=1;fontSize=10;fontStyle=1;");
        addEdge(item.cellId, label, endpointCell, `${item.cellId}_open`, cableEdgeStyle(color, item.endpointRoutes[0].port), item.waypoints);
      }
    });

    graph.diagnostics.slice(0, 20).forEach((diagnostic, index) => addVertex(`master_warning_${index + 1}`, `WARNING: ${diagnostic.message}`, 40, layout.warningTop + index * 34, Math.max(760, layout.pageWidth - 80), 28,
      "rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#d97706;strokeWidth=1;fontSize=10;fontStyle=1;align=left;spacingLeft=10;"));

    const diagramName = "MASTER WIRE ROUTING";
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="DIGIWIRE MASTER" type="device">
  <diagram id="digiwire_master" name="${diagramName}">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${layout.pageWidth}" pageHeight="${layout.pageHeight}" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  }

  function terminalConstraint(port, prefix) {
    if (!port) return "";
    const direction = portDirection(port);
    const point = {
      left: { x: 0, y: 0.5 },
      right: { x: 1, y: 0.5 },
      top: { x: 0.5, y: 0 },
      bottom: { x: 0.5, y: 1 }
    }[direction];
    return point ? `${prefix}X=${point.x};${prefix}Y=${point.y};${prefix}Dx=0;${prefix}Dy=0;` : "";
  }

  function cableEdgeStyle(color, sourcePort, targetPort) {
    return `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=18;html=1;strokeColor=${color};strokeWidth=4;startArrow=none;endArrow=none;jumpStyle=arc;jumpSize=12;fontSize=12;fontStyle=1;labelBackgroundColor=#ffffff;labelBorderColor=#d1d5db;spacing=6;${terminalConstraint(sourcePort, "exit")}${terminalConstraint(targetPort, "entry")}`;
  }

  function harnessLabel(harness) {
    return harness.name;
  }

  function cableColor(name) {
    return CABLE_COLORS[parseInt(hash(name), 36) % CABLE_COLORS.length];
  }

  function portCenter(port) {
    return { x: port.x + port.width / 2, y: port.y + port.height / 2 };
  }

  function portDirection(port) {
    const direction = port.exitSide || port.connector.side || "left";
    if (["left", "right", "top", "bottom"].includes(direction)) return direction;
    const corner = direction.match(/^corner-(left|right|top|bottom)/);
    if (corner) return corner[1];
    return ["left", "right", "top", "bottom"].find((side) => direction.includes(side)) || "left";
  }

  function portStub(port, distance = 130) {
    const point = portCenter(port);
    const direction = portDirection(port);
    if (direction === "left") point.x -= distance;
    if (direction === "right") point.x += distance;
    if (direction === "top") point.y -= distance;
    if (direction === "bottom") point.y += distance;
    if (port.boardRect) {
      const horizontalEscape = Math.max(ROUTE_BOARD_CLEARANCE, port.width / 2 + 36);
      const verticalEscape = Math.max(ROUTE_BOARD_CLEARANCE, port.height / 2 + 36);
      if (direction === "left") point.x = port.boardRect.x - horizontalEscape;
      if (direction === "right") point.x = port.boardRect.x + port.boardRect.width + horizontalEscape;
      if (direction === "top") point.y = port.boardRect.y - verticalEscape;
      if (direction === "bottom") point.y = port.boardRect.y + port.boardRect.height + verticalEscape;
    }
    return point;
  }

  function compactWaypoints(points) {
    return points.filter((point, index) => !index || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
  }

  function expandedBoardRect(board, clearance) {
    return {
      left: board.x - clearance,
      top: board.y - clearance,
      right: board.x + board.width + clearance,
      bottom: board.y + board.height + clearance
    };
  }

  function pointInsideRect(point, rect) {
    return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
  }

  function segmentIntersectsRect(first, second, rect) {
    if (first.x === second.x) {
      return first.x > rect.left && first.x < rect.right &&
        Math.max(Math.min(first.y, second.y), rect.top) < Math.min(Math.max(first.y, second.y), rect.bottom);
    }
    if (first.y === second.y) {
      return first.y > rect.top && first.y < rect.bottom &&
        Math.max(Math.min(first.x, second.x), rect.left) < Math.min(Math.max(first.x, second.x), rect.right);
    }
    return true;
  }

  function pathIntersectsBoards(points, boards, clearance = ROUTE_BOARD_CLEARANCE) {
    const rects = boards.map((board) => expandedBoardRect(board, clearance));
    return points.slice(1).some((point, index) => rects.some((rect) => segmentIntersectsRect(points[index], point, rect)));
  }

  function obstacleAwareWaypoints(start, end, boards, laneIndex = 0) {
    const clearance = ROUTE_BOARD_CLEARANCE + (laneIndex % 4) * 14;
    const rects = boards.map((board) => expandedBoardRect(board, clearance));
    const xs = Array.from(new Set([start.x, end.x, ...rects.flatMap((rect) => [rect.left, rect.right])])).sort((a, b) => a - b);
    const ys = Array.from(new Set([start.y, end.y, ...rects.flatMap((rect) => [rect.top, rect.bottom])])).sort((a, b) => a - b);
    const nodes = [];
    const nodeByCoordinate = new Map();
    xs.forEach((x) => ys.forEach((y) => {
      const point = { x, y };
      if (rects.some((rect) => pointInsideRect(point, rect))) return;
      const index = nodes.length;
      nodes.push(point);
      nodeByCoordinate.set(`${x}|${y}`, index);
    }));
    const startIndex = nodeByCoordinate.get(`${start.x}|${start.y}`);
    const endIndex = nodeByCoordinate.get(`${end.x}|${end.y}`);
    if (startIndex === undefined || endIndex === undefined) return [start, end];

    const neighbors = nodes.map(() => []);
    const connectLine = (indexes, direction) => {
      indexes.sort((left, right) => direction === "h" ? nodes[left].x - nodes[right].x : nodes[left].y - nodes[right].y);
      indexes.slice(1).forEach((index, offset) => {
        const previous = indexes[offset];
        if (rects.some((rect) => segmentIntersectsRect(nodes[previous], nodes[index], rect))) return;
        const distance = Math.abs(nodes[previous].x - nodes[index].x) + Math.abs(nodes[previous].y - nodes[index].y);
        neighbors[previous].push({ index, direction, distance });
        neighbors[index].push({ index: previous, direction, distance });
      });
    };
    ys.forEach((y) => connectLine(nodes.map((point, index) => point.y === y ? index : -1).filter((index) => index >= 0), "h"));
    xs.forEach((x) => connectLine(nodes.map((point, index) => point.x === x ? index : -1).filter((index) => index >= 0), "v"));

    const states = new Map([[`${startIndex}|n`, { node: startIndex, direction: "n", cost: 0, previous: null }]]);
    const pending = new Set(states.keys());
    let winner = null;
    while (pending.size) {
      let currentKey = null;
      pending.forEach((key) => {
        if (currentKey === null || states.get(key).cost < states.get(currentKey).cost) currentKey = key;
      });
      pending.delete(currentKey);
      const current = states.get(currentKey);
      if (current.node === endIndex) {
        winner = currentKey;
        break;
      }
      neighbors[current.node].forEach((edge) => {
        const bendCost = current.direction !== "n" && current.direction !== edge.direction ? 38 : 0;
        const nextKey = `${edge.index}|${edge.direction}`;
        const nextCost = current.cost + edge.distance + bendCost;
        if (!states.has(nextKey) || nextCost < states.get(nextKey).cost) {
          states.set(nextKey, { node: edge.index, direction: edge.direction, cost: nextCost, previous: currentKey });
          pending.add(nextKey);
        }
      });
    }
    if (!winner) return [start, end];
    const routed = [];
    while (winner) {
      const state = states.get(winner);
      routed.unshift(nodes[state.node]);
      winner = state.previous;
    }
    return compactWaypoints(routed.filter((point, index, points) => {
      if (!index || index === points.length - 1) return true;
      const previous = points[index - 1];
      const next = points[index + 1];
      return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
    }));
  }

  function keepRouteOutsideBoards(points, boards, laneIndex = 0) {
    const compact = compactWaypoints(points);
    return pathIntersectsBoards(compact, boards)
      ? obstacleAwareWaypoints(compact[0], compact[compact.length - 1], boards, laneIndex)
      : compact;
  }

  function routeSegments(points) {
    return points.slice(1).map((point, index) => ({ first: points[index], second: point }));
  }

  function orderedRange(first, second) {
    return [Math.min(first, second), Math.max(first, second)];
  }

  function segmentRelationship(left, right) {
    const leftHorizontal = left.first.y === left.second.y;
    const rightHorizontal = right.first.y === right.second.y;
    if (leftHorizontal !== rightHorizontal) {
      const horizontal = leftHorizontal ? left : right;
      const vertical = leftHorizontal ? right : left;
      const [horizontalStart, horizontalEnd] = orderedRange(horizontal.first.x, horizontal.second.x);
      const [verticalStart, verticalEnd] = orderedRange(vertical.first.y, vertical.second.y);
      const crosses = vertical.first.x > horizontalStart && vertical.first.x < horizontalEnd &&
        horizontal.first.y > verticalStart && horizontal.first.y < verticalEnd;
      return { crossing: crosses, overlap: 0 };
    }
    if (leftHorizontal) {
      if (left.first.y !== right.first.y) return { crossing: false, overlap: 0 };
      const [leftStart, leftEnd] = orderedRange(left.first.x, left.second.x);
      const [rightStart, rightEnd] = orderedRange(right.first.x, right.second.x);
      return { crossing: false, overlap: Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart)) };
    }
    if (left.first.x !== right.first.x) return { crossing: false, overlap: 0 };
    const [leftStart, leftEnd] = orderedRange(left.first.y, left.second.y);
    const [rightStart, rightEnd] = orderedRange(right.first.y, right.second.y);
    return { crossing: false, overlap: Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart)) };
  }

  function optimizedRouteScore(points, routedPaths) {
    const segments = routeSegments(points);
    const length = segments.reduce((total, segment) => total + Math.abs(segment.first.x - segment.second.x) + Math.abs(segment.first.y - segment.second.y), 0);
    const bends = Math.max(0, points.length - 2);
    let crossings = 0;
    let overlap = 0;
    routedPaths.flatMap(routeSegments).forEach((existing) => segments.forEach((candidate) => {
      const relationship = segmentRelationship(candidate, existing);
      if (relationship.crossing) crossings += 1;
      overlap += relationship.overlap;
    }));
    return length + bends * 22 + crossings * 260 + overlap * 3;
  }

  function chooseOptimizedRoute(candidates, routedPaths, boards) {
    const unique = new Map();
    candidates.forEach((points) => unique.set(points.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(";"), points));
    const legal = Array.from(unique.values()).filter((points) => !pathIntersectsBoards(points, boards));
    return legal.sort((left, right) => optimizedRouteScore(left, routedPaths) - optimizedRouteScore(right, routedPaths))[0] ||
      obstacleAwareWaypoints(candidates[0][0], candidates[0][candidates[0].length - 1], boards, candidates.length);
  }

  function optimizedCableWaypoints(first, second, boards, routedPaths) {
    const start = portStub(first.port);
    const end = portStub(second.port);
    const candidates = [
      keepRouteOutsideBoards([start, { x: end.x, y: start.y }, end], boards),
      keepRouteOutsideBoards([start, { x: start.x, y: end.y }, end], boards)
    ];
    for (let laneIndex = 0; laneIndex < 8; laneIndex += 1) candidates.push(cableWaypoints(first, second, laneIndex, boards));
    return chooseOptimizedRoute(candidates, routedPaths, boards);
  }

  function optimizedEndpointWaypoints(route, target, boards, routedPaths) {
    const start = portStub(route.port);
    const candidates = [
      keepRouteOutsideBoards([start, { x: target.x, y: start.y }, target], boards),
      keepRouteOutsideBoards([start, { x: start.x, y: target.y }, target], boards)
    ];
    for (let laneIndex = 0; laneIndex < 8; laneIndex += 1) candidates.push(routeWaypoints(route, target, laneIndex, boards));
    return chooseOptimizedRoute(candidates, routedPaths, boards);
  }

  function cableWaypoints(first, second, laneIndex = 0, boards = []) {
    const firstStub = portStub(first.port);
    const secondStub = portStub(second.port);
    const lane = (laneIndex % 8) * 42;
    const horizontal = Math.abs(firstStub.x - secondStub.x) >= Math.abs(firstStub.y - secondStub.y);
    if (horizontal) {
      let channelY;
      if ([portDirection(first.port), portDirection(second.port)].some((side) => side.includes("bottom"))) {
        channelY = Math.max(firstStub.y, secondStub.y) + 70 + lane;
      } else if ([portDirection(first.port), portDirection(second.port)].some((side) => side.includes("top"))) {
        channelY = Math.min(firstStub.y, secondStub.y) - 70 - lane;
      } else {
        channelY = (firstStub.y + secondStub.y) / 2 + (laneIndex % 2 ? lane : -lane);
      }
      return keepRouteOutsideBoards([
        firstStub,
        { x: firstStub.x, y: channelY },
        { x: secondStub.x, y: channelY },
        secondStub
      ], boards, laneIndex);
    }
    let channelX;
    if ([portDirection(first.port), portDirection(second.port)].some((side) => side.includes("right"))) {
      channelX = Math.max(firstStub.x, secondStub.x) + 70 + lane;
    } else if ([portDirection(first.port), portDirection(second.port)].some((side) => side.includes("left"))) {
      channelX = Math.min(firstStub.x, secondStub.x) - 70 - lane;
    } else {
      channelX = (firstStub.x + secondStub.x) / 2 + (laneIndex % 2 ? lane : -lane);
    }
    return keepRouteOutsideBoards([
      firstStub,
      { x: channelX, y: firstStub.y },
      { x: channelX, y: secondStub.y },
      secondStub
    ], boards, laneIndex);
  }

  function routeWaypoints(route, target, laneIndex = 0, boards = []) {
    const stub = portStub(route.port);
    const lane = (laneIndex % 8) * 36;
    if (Math.abs(stub.x - target.x) >= Math.abs(stub.y - target.y)) {
      const channelX = (stub.x + target.x) / 2 + lane;
      return keepRouteOutsideBoards([stub, { x: channelX, y: stub.y }, { x: channelX, y: target.y }, target], boards, laneIndex);
    }
    const channelY = (stub.y + target.y) / 2 + lane;
    return keepRouteOutsideBoards([stub, { x: stub.x, y: channelY }, { x: target.x, y: channelY }, target], boards, laneIndex);
  }

  function oppositeSide(side) {
    return { left: "right", right: "left", top: "bottom", bottom: "top" }[side] || "left";
  }

  function floatingCapRoute(endpoint, anchorRoute, harnessKey, harnessIndex, fallbackX, fallbackY) {
    const anchorPort = anchorRoute?.port;
    const direction = anchorPort ? portDirection(anchorPort) : "right";
    const center = anchorPort ? portStub(anchorPort, 190 + (harnessIndex % 3) * 22) : { x: fallbackX, y: fallbackY };
    const horizontal = direction.includes("left") || direction.includes("right");
    const width = horizontal ? 34 : 48;
    const height = horizontal ? 24 : 22;
    const cap = {
      cellId: stableId("floating_cap", `${harnessKey}|${endpoint.side}|${endpoint.key}`),
      x: Math.round(center.x - width / 2),
      y: Math.round(center.y - height / 2),
      width,
      height
    };
    return {
      cap,
      route: {
        cellId: cap.cellId,
        endpoint,
        floating: true,
        port: {
          x: cap.x,
          y: cap.y,
          width,
          height,
          exitSide: oppositeSide(direction),
          connector: { side: oppositeSide(direction) }
        }
      }
    };
  }

  function branchJunction(endpointRoutes, cellId, fallbackX, fallbackY) {
    const hub = endpointRoutes.slice().sort((left, right) => {
      const cpcDifference = Number(isCpcConnector(right.port.connector)) - Number(isCpcConnector(left.port.connector));
      return cpcDifference || (right.endpoint.rowCount || 0) - (left.endpoint.rowCount || 0);
    })[0];
    const point = hub ? portStub(hub.port, 185) : { x: fallbackX, y: fallbackY };
    return { cellId: `${cellId}_junction`, x: Math.round(point.x - 68), y: Math.round(point.y - 27) };
  }

  function layoutGraph(graph, options = {}) {
    const boards = graph.boards.some((board) => board.arrangement)
      ? layoutBoardsByCompass(graph.boards)
      : layoutBoardsByTopology(graph);
    let pageHeight = Math.max(800, ...boards.map((item) => item.y + item.height + 120));
    let currentX = Math.max(120, ...boards.map((item) => item.x + item.width + 220));
    const boardByKey = new Map(boards.map((item) => [item.board.key, item]));
    const portByKey = new Map(boards.flatMap((item) => item.ports.map((port) => [`${item.board.key}|${port.connector.key}`, port])));
    const externalStartX = Math.max(1120, currentX + 30);
    const externals = [];
    const floatingCaps = [];
    const externalByKey = new Map();
    let externalY = 160;
    const routedPaths = [];
    const harnesses = graph.harnesses.map((harness, harnessIndex) => {
      const floatingEndpoints = [];
      const endpointRoutes = harness.endpoints.map((endpoint) => {
        const connector = endpoint.match.connector;
        if (connector) {
          const port = portByKey.get(`${connector.boardKey}|${connector.key}`);
          return port ? { cellId: port.cellId, port, endpoint } : null;
        }
        if (endpoint.match.floating) {
          floatingEndpoints.push(endpoint);
          return null;
        }
        const externalKey = `${harness.key}|${endpoint.side}|${endpoint.key}|${endpoint.name}`;
        if (!externalByKey.has(externalKey)) {
          const external = {
            key: externalKey,
            endpoint,
            cellId: stableId("external", externalKey),
            x: externalStartX,
            y: externalY
          };
          externalByKey.set(externalKey, external);
          externals.push(external);
          externalY += 90;
        }
        const external = externalByKey.get(externalKey);
        return {
          cellId: external.cellId,
          endpoint,
          port: {
            x: external.x,
            y: external.y,
            width: 170,
            height: 58,
            connector: { side: endpoint.side === "left" ? "right" : "left" }
          }
        };
      }).filter(Boolean);
      floatingEndpoints.forEach((endpoint) => {
        const floating = floatingCapRoute(endpoint, endpointRoutes[0], harness.key, harnessIndex, externalStartX - 180, externalY);
        floatingCaps.push(floating.cap);
        endpointRoutes.push(floating.route);
      });
      const endpointCells = endpointRoutes.map((route) => route.cellId);
      const connectedPoints = endpointRoutes.map((route) => portCenter(route.port));
      const averageX = connectedPoints.length ? connectedPoints.reduce((sum, point) => sum + point.x, 0) / connectedPoints.length : externalStartX - 180;
      const averageY = connectedPoints.length ? connectedPoints.reduce((sum, point) => sum + point.y, 0) / connectedPoints.length : externalY;
      const cellId = stableId("cable", harness.key);
      const junction = endpointCells.length > 2 ? branchJunction(endpointRoutes, cellId, averageX, averageY) : null;
      let waypoints = endpointRoutes.length === 2
        ? endpointRoutes.some((route) => route.floating)
          ? [portStub(endpointRoutes.find((route) => !route.floating)?.port || endpointRoutes[0].port, 70)]
          : options.optimizeRoutes
            ? optimizedCableWaypoints(endpointRoutes[0], endpointRoutes[1], boards, routedPaths)
            : cableWaypoints(endpointRoutes[0], endpointRoutes[1], harnessIndex, boards)
        : endpointRoutes.length === 1
          ? options.optimizeRoutes
            ? optimizedEndpointWaypoints(endpointRoutes[0], { x: averageX + 235, y: averageY }, boards, routedPaths)
            : routeWaypoints(endpointRoutes[0], { x: averageX + 235, y: averageY }, harnessIndex, boards)
          : [];
      if (waypoints.length > 1) routedPaths.push(waypoints);
      const junctionTarget = junction ? { x: junction.x + 68, y: junction.y + 27 } : null;
      const branchWaypoints = junction ? endpointRoutes.map((route, index) => {
        const points = options.optimizeRoutes
          ? optimizedEndpointWaypoints(route, junctionTarget, boards, routedPaths)
          : routeWaypoints(route, junctionTarget, index, boards);
        if (points.length > 1) routedPaths.push(points);
        return points;
      }) : [];
      return {
        harness,
        cellId,
        endpointCells,
        endpointRoutes,
        waypoints,
        branchWaypoints,
        junction,
        openX: averageX + 180,
        openY: averageY - 20
      };
    });
    pageHeight = Math.max(pageHeight, externalY + 90);
    const pageWidth = Math.max(1600, externalStartX + (externals.length ? 260 : 80));
    const warningTop = pageHeight;
    const finalPageHeight = pageHeight + Math.max(1, graph.diagnostics.length) * 34 + 80;
    return { boards, boardByKey, externals, floatingCaps, harnesses, pageWidth, pageHeight: finalPageHeight, warningTop };
  }

  function layoutBoardsByTopology(graph) {
    const layers = boardLayers(graph);
    const byLayer = new Map();
    graph.boards.forEach((board) => {
      const layer = layers.get(board.key) || 0;
      if (!byLayer.has(layer)) byLayer.set(layer, []);
      byLayer.get(layer).push(board);
    });
    byLayer.forEach((boards) => boards.sort((left, right) => left.name.localeCompare(right.name)));
    const layerNumbers = Array.from(byLayer.keys()).sort((left, right) => left - right);
    const output = [];
    let currentX = 120;
    layerNumbers.forEach((layer) => {
      const layerBoards = byLayer.get(layer);
      const layerWidth = Math.max(320, ...layerBoards.map((board) => boardSize(board).width));
      let currentY = 140;
      layerBoards.forEach((board) => {
        const size = boardSize(board);
        const item = {
          board,
          cellId: stableId("board", board.key),
          x: currentX,
          y: currentY,
          width: size.width,
          height: size.height
        };
        item.ports = layoutBoardPorts(item);
        output.push(item);
        currentY += size.height + 170;
      });
      currentX += layerWidth + 330;
    });
    return output;
  }

  function layoutBoardsByCompass(sourceBoards) {
    const groups = { top: [], left: [], middle: [], right: [], bottom: [] };
    sourceBoards.forEach((board) => groups[board.arrangement || "middle"].push(board));
    Object.values(groups).forEach((items) => items.sort((left, right) => left.name.localeCompare(right.name)));
    const output = [];
    const place = (board, x, y) => {
      const size = boardSize(board);
      const item = { board, cellId: stableId("board", board.key), x: Math.round(x), y: Math.round(y), width: size.width, height: size.height };
      item.ports = layoutBoardPorts(item);
      output.push(item);
      return item;
    };
    const placeHorizontal = (items, centerX, y) => {
      const widths = items.map((board) => boardSize(board).width);
      const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, items.length - 1) * 140;
      let x = centerX - total / 2;
      items.forEach((board, index) => {
        place(board, x, y);
        x += widths[index] + 140;
      });
    };
    const placeVertical = (items, x, centerY) => {
      const heights = items.map((board) => boardSize(board).height);
      const total = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, items.length - 1) * 140;
      let y = centerY - total / 2;
      items.forEach((board, index) => {
        place(board, x, y);
        y += heights[index] + 140;
      });
    };
    const middleY = MASTER_TOP_Y + MASTER_BOARD_SIZE + MASTER_BOARD_GAP;
    const bottomY = middleY + MASTER_BOARD_SIZE + MASTER_BOARD_GAP;
    const middleCenterY = middleY + MASTER_BOARD_SIZE / 2;
    placeHorizontal(groups.top, MASTER_CENTER_X, MASTER_TOP_Y);
    placeVertical(groups.left, 120, middleCenterY);
    placeHorizontal(groups.middle, MASTER_CENTER_X, middleY);
    placeVertical(groups.right, 2680, middleCenterY);
    placeHorizontal(groups.bottom, MASTER_CENTER_X, bottomY);
    const minX = Math.min(80, ...output.map((item) => item.x - 70));
    const minY = Math.min(100, ...output.map((item) => item.y - 40));
    if (minX < 80 || minY < 100) {
      const shiftX = Math.max(0, 80 - minX);
      const shiftY = Math.max(0, 100 - minY);
      output.forEach((item) => {
        item.x += shiftX;
        item.y += shiftY;
        item.ports = layoutBoardPorts(item);
      });
    }
    return output;
  }

  function boardLayers(graph) {
    const outgoing = new Map(graph.boards.map((board) => [board.key, new Set()]));
    const incoming = new Map(graph.boards.map((board) => [board.key, 0]));
    graph.harnesses.forEach((harness) => {
      const leftBoards = Array.from(new Set(harness.endpoints.filter((endpoint) => endpoint.side === "left" && endpoint.match.connector).map((endpoint) => endpoint.match.connector.boardKey)));
      const rightBoards = Array.from(new Set(harness.endpoints.filter((endpoint) => endpoint.side === "right" && endpoint.match.connector).map((endpoint) => endpoint.match.connector.boardKey)));
      leftBoards.forEach((left) => rightBoards.forEach((right) => {
        if (left === right || outgoing.get(left)?.has(right)) return;
        outgoing.get(left)?.add(right);
        incoming.set(right, (incoming.get(right) || 0) + 1);
      }));
    });
    const layers = new Map();
    const queue = graph.boards.filter((board) => (incoming.get(board.key) || 0) === 0).map((board) => board.key);
    if (!queue.length && graph.boards.length) queue.push(graph.boards[0].key);
    queue.forEach((key) => layers.set(key, 0));
    while (queue.length) {
      const key = queue.shift();
      const layer = layers.get(key) || 0;
      outgoing.get(key)?.forEach((next) => {
        if (layers.has(next)) return;
        layers.set(next, layer + 1);
        queue.push(next);
      });
    }
    graph.boards.forEach((board) => { if (!layers.has(board.key)) layers.set(board.key, 0); });
    return layers;
  }

  function boardSize(board) {
    return {
      width: MASTER_BOARD_SIZE,
      height: MASTER_BOARD_SIZE
    };
  }

  function centerGridColumns(count, exitSide) {
    if (!count) return 0;
    if (count <= 4 && (exitSide === "top" || exitSide === "bottom")) return count;
    if (count <= 4 && (exitSide === "left" || exitSide === "right")) return 1;
    return Math.min(4, Math.ceil(Math.sqrt(count)));
  }

  function layoutBoardPorts(item) {
    const output = [];
    SIDES.forEach(([side]) => {
      const connectors = item.board.connectors.filter((connector) => connector.side === side);
      connectors.forEach((connector, index) => {
        const corner = side.startsWith("corner-");
        const center = side === "center";
        const cpc = isCpcConnector(connector);
        const powerPole = isPowerPoleConnector(connector);
        const horizontal = side === "top" || side === "bottom";
        const centerExitSide = center
          ? ({ top: "bottom", bottom: "top", left: "right", right: "left" }[item.board.arrangement] || "bottom")
          : null;
        const width = cpc ? 76 : powerPole ? 132 : center ? 104 : horizontal ? 106 : 116;
        const height = cpc ? 76 : powerPole ? 48 : center ? 32 : 30;
        let x;
        let y;
        if (center) {
          const columns = centerGridColumns(connectors.length, centerExitSide);
          const rows = Math.ceil(connectors.length / columns);
          const column = index % columns;
          const row = Math.floor(index / columns);
          x = item.x + (column + 1) * item.width / (columns + 1) - width / 2;
          y = item.y + item.height / 2 - ((rows - 1) * 50) / 2 + row * 50 - height / 2;
        } else if (corner) {
          x = side.includes("left") ? item.x - width / 2 : item.x + item.width - width / 2;
          y = side.includes("top") ? item.y - height / 2 : item.y + item.height - height / 2;
          if (connectors.length > 1) {
            const offset = index * (cpc ? 84 : 124);
            x += side.includes("left") ? -offset : offset;
          }
        } else if (horizontal) {
          x = item.x + (index + 1) * item.width / (connectors.length + 1) - width / 2;
          y = side === "top" ? item.y - 18 : item.y + item.height - 12;
        } else {
          x = side === "left" ? item.x - width / 2 : item.x + item.width - width / 2;
          y = item.y + 68 + (index + 1) * Math.max(50, item.height - 96) / (connectors.length + 1) - height / 2;
        }
        output.push({
          connector,
          boardRect: { x: item.x, y: item.y, width: item.width, height: item.height },
          exitSide: center ? centerExitSide : side,
          cellId: stableId("port", `${item.board.key}|${connector.key}`),
          x: Math.round(x),
          y: Math.round(y),
          width,
          height
        });
      });
    });
    return output;
  }

  return Object.freeze({
    createProject,
    addSheet,
    extractBoards,
    extractHarnesses,
    resolveProject,
    projectSummary,
    buildDrawioXml
  });
});
