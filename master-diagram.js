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
    ["bottom", "pcbBottom"]
  ]);
  const CABLE_COLORS = Object.freeze([
    "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed", "#0891b2", "#9333ea", "#4b5563"
  ]);

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
  const firstFilled = (rows, key) => rows.map((row) => text(row[key])).find(Boolean) || "";
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
        grouped.set(key, { key, name: currentBoardName, part: "", connectors: [] });
      }
      const board = grouped.get(key);
      if (meaningful(row.pcbPart)) board.part = text(row.pcbPart);
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
      if (!grouped.has(key)) grouped.set(key, { key, name, side, leg, rowCount: 0 });
      grouped.get(key).rowCount += 1;
    });
    return Array.from(grouped.values());
  }

  function resolveProject(project) {
    const connectors = project.boards.flatMap((board) => board.connectors.map((connector) => ({
      ...connector,
      boardKey: board.key,
      boardName: board.name,
      boardPart: board.part
    })));
    const diagnostics = [];
    const harnesses = project.harnesses.map((harness) => ({
      ...harness,
      endpoints: harness.endpoints.map((endpoint) => {
        const match = matchEndpoint(endpoint, connectors);
        if (!match.connector) {
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
    return { boards: project.boards, harnesses, connectors, diagnostics };
  }

  function matchEndpoint(endpoint, connectors) {
    const endpointName = normalized(endpoint.name);
    const candidates = connectors.map((connector) => {
      const connectorName = normalized(connector.name);
      const boardName = normalized(connector.boardName);
      const composite = normalized(`${connector.boardName} ${connector.name}`);
      let score = 0;
      if (endpointName === connectorName) score = 100;
      if (endpointName === composite || endpointName === normalized(`${connector.name} ${connector.boardName}`)) score = 110;
      if (endpointName.includes(boardName) && endpointName.includes(connectorName)) score = Math.max(score, 95);
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
      boardCount: project.boards.length,
      connectorCount: project.boards.reduce((total, board) => total + board.connectors.length, 0),
      harnessCount: project.harnesses.length,
      wireCount: project.harnesses.reduce((total, harness) => total + harness.wireCount, 0),
      warningCount: graph.diagnostics.length
    };
  }

  function buildDrawioXml(project) {
    const graph = resolveProject(project);
    const layout = layoutGraph(graph);
    const cells = [
      `<mxCell id="0" />`,
      `<mxCell id="1" parent="0" />`
    ];
    const addVertex = (id, value, x, y, width, height, style) => cells.push(
      `<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" /></mxCell>`
    );
    const addEdge = (id, value, source, target, style) => cells.push(
      `<mxCell id="${escapeXml(id)}" value="${escapeXml(value)}" style="${escapeXml(style)}" edge="1" parent="1" source="${escapeXml(source)}" target="${escapeXml(target)}"><mxGeometry relative="1" as="geometry" /></mxCell>`
    );

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
        const sideColor = { left: "#dbeafe", top: "#fef3c7", right: "#dcfce7", bottom: "#f3e8ff" }[port.connector.side];
        addVertex(port.cellId, port.connector.name, port.x, port.y, port.width, port.height,
          `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${sideColor};strokeColor=#374151;strokeWidth=2;fontSize=11;fontStyle=1;`);
      });
    });

    layout.externals.forEach((external) => addVertex(external.cellId, `UNMATCHED | ${external.endpoint.name}`, external.x, external.y, 170, 58,
      "rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#fff1f2;strokeColor=#dc2626;strokeWidth=2;fontSize=11;fontStyle=1;"));

    layout.harnesses.forEach((item) => {
      const color = cableColor(item.harness.name);
      const label = harnessLabel(item.harness);
      if (item.junction) {
        addVertex(item.junction.cellId, `${item.harness.name} | ${item.harness.wireCount} WIRES`, item.junction.x, item.junction.y, 136, 54,
          `rounded=1;arcSize=16;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${color};strokeWidth=3;fontSize=11;fontStyle=1;`);
        item.endpointCells.forEach((cellId, index) => addEdge(`${item.cellId}_branch_${index + 1}`, index === 0 ? label : "", cellId, item.junction.cellId,
          cableEdgeStyle(color)));
      } else if (item.endpointCells.length === 2) {
        addEdge(item.cellId, label, item.endpointCells[0], item.endpointCells[1], cableEdgeStyle(color));
      } else if (item.endpointCells.length === 1) {
        const endpointCell = item.endpointCells[0];
        addVertex(`${item.cellId}_open`, "OPEN END", item.openX, item.openY, 110, 40,
          "rounded=1;whiteSpace=wrap;html=1;fillColor=#f9fafb;strokeColor=#6b7280;strokeWidth=2;dashed=1;fontSize=10;fontStyle=1;");
        addEdge(item.cellId, label, endpointCell, `${item.cellId}_open`, cableEdgeStyle(color));
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

  function cableEdgeStyle(color) {
    return `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${color};strokeWidth=5;startArrow=none;endArrow=none;jumpStyle=arc;jumpSize=12;fontSize=12;fontStyle=1;labelBackgroundColor=#ffffff;`;
  }

  function harnessLabel(harness) {
    return [harness.name, `${harness.wireCount} WIRE${harness.wireCount === 1 ? "" : "S"}`, harness.length].filter(Boolean).join(" | ");
  }

  function cableColor(name) {
    return CABLE_COLORS[parseInt(hash(name), 36) % CABLE_COLORS.length];
  }

  function layoutGraph(graph) {
    const layers = boardLayers(graph);
    const byLayer = new Map();
    graph.boards.forEach((board) => {
      const layer = layers.get(board.key) || 0;
      if (!byLayer.has(layer)) byLayer.set(layer, []);
      byLayer.get(layer).push(board);
    });
    byLayer.forEach((boards) => boards.sort((left, right) => left.name.localeCompare(right.name)));
    const layerNumbers = Array.from(byLayer.keys()).sort((left, right) => left - right);
    const boards = [];
    let currentX = 120;
    let pageHeight = 800;
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
        boards.push(item);
        currentY += size.height + 170;
      });
      pageHeight = Math.max(pageHeight, currentY + 80);
      currentX += layerWidth + 330;
    });
    const boardByKey = new Map(boards.map((item) => [item.board.key, item]));
    const portByKey = new Map(boards.flatMap((item) => item.ports.map((port) => [`${item.board.key}|${port.connector.key}`, port])));
    const externalStartX = Math.max(1120, currentX + 30);
    const externals = [];
    const externalByKey = new Map();
    let externalY = 160;
    const harnesses = graph.harnesses.map((harness) => {
      const endpointCells = harness.endpoints.map((endpoint) => {
        const connector = endpoint.match.connector;
        if (connector) return portByKey.get(`${connector.boardKey}|${connector.key}`)?.cellId;
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
        return externalByKey.get(externalKey).cellId;
      }).filter(Boolean);
      const connectedPoints = harness.endpoints.map((endpoint) => {
        const connector = endpoint.match.connector;
        if (!connector) return null;
        const port = portByKey.get(`${connector.boardKey}|${connector.key}`);
        return port ? { x: port.x + port.width / 2, y: port.y + port.height / 2 } : null;
      }).filter(Boolean);
      const averageX = connectedPoints.length ? connectedPoints.reduce((sum, point) => sum + point.x, 0) / connectedPoints.length : externalStartX - 180;
      const averageY = connectedPoints.length ? connectedPoints.reduce((sum, point) => sum + point.y, 0) / connectedPoints.length : externalY;
      const cellId = stableId("cable", harness.key);
      return {
        harness,
        cellId,
        endpointCells,
        junction: endpointCells.length > 2 ? { cellId: `${cellId}_junction`, x: averageX - 68, y: averageY - 27 } : null,
        openX: averageX + 180,
        openY: averageY - 20
      };
    });
    pageHeight = Math.max(pageHeight, externalY + 90);
    const pageWidth = Math.max(1600, externalStartX + (externals.length ? 260 : 80));
    const warningTop = pageHeight;
    const finalPageHeight = pageHeight + Math.max(1, graph.diagnostics.length) * 34 + 80;
    return { boards, boardByKey, externals, harnesses, pageWidth, pageHeight: finalPageHeight, warningTop };
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
    const counts = Object.fromEntries(SIDES.map(([side]) => [side, board.connectors.filter((connector) => connector.side === side).length]));
    return {
      width: Math.max(320, Math.max(counts.top, counts.bottom) * 120 + 60),
      height: Math.max(190, Math.max(counts.left, counts.right) * 42 + 90)
    };
  }

  function layoutBoardPorts(item) {
    const output = [];
    SIDES.forEach(([side]) => {
      const connectors = item.board.connectors.filter((connector) => connector.side === side);
      connectors.forEach((connector, index) => {
        const horizontal = side === "top" || side === "bottom";
        const width = horizontal ? 106 : 116;
        const height = 30;
        let x;
        let y;
        if (horizontal) {
          x = item.x + (index + 1) * item.width / (connectors.length + 1) - width / 2;
          y = side === "top" ? item.y - 18 : item.y + item.height - 12;
        } else {
          x = side === "left" ? item.x - width / 2 : item.x + item.width - width / 2;
          y = item.y + 68 + (index + 1) * Math.max(50, item.height - 96) / (connectors.length + 1) - height / 2;
        }
        output.push({
          connector,
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
