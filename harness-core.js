"use strict";

(function exposeHarnessCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DigiWireCore = api;
})(typeof globalThis === "object" ? globalThis : this, function createHarnessCore() {
  const normalizedText = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  const meaningful = (value) => {
    const text = normalizedText(value);
    return Boolean(text) && !["NONE", "N/A", "NA", "TBD", "-"].includes(text);
  };
  const normalizeTerminology = (value) => String(value || "").replace(
    /\b(?:FURREL|FERRAEL)(S)?\b/gi,
    (_match, plural) => `FERRULE${plural ? "S" : ""}`
  );
  const numericPin = (value) => {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : NaN;
  };
  const isDnpRow = (row) => {
    const text = normalizedText([
      row.leftLegName,
      row.wireName,
      row.rightLegName,
      row.rightWireName,
      row.branchRole
    ].join(" "));
    return /\b(?:DNP|NOT IN USE|NOT USED|UNUSED|DO NOT POPULATE|NO WIRE|NO CONNECT(?:ION)?|N\/C|NC)\b/.test(text);
  };
  const endpointKey = (row, side) => {
    const prefix = side === "left" ? "left" : "right";
    const leg = String(row[`${prefix}Leg`] || "").trim();
    if (meaningful(leg)) return `LEG:${normalizedText(leg)}`;
    const name = row[`${prefix}LegName`] || row[`${prefix}HousingPart`] || row[`${prefix}HousingType`];
    return `NAME:${normalizedText(name) || "UNSPECIFIED"}`;
  };
  const endpointText = (rows, side) => {
    const prefix = side === "left" ? "left" : "right";
    return normalizedText(rows.map((row) => [
      row[`${prefix}LegName`],
      row[`${prefix}HousingType`],
      row[`${prefix}HousingPart`],
      row[`${prefix}PinPart`]
    ].map(normalizeTerminology).join(" ")).join(" "));
  };
  const isSinglePositionTermination = (rows, side) => {
    const text = endpointText(rows, side);
    return text.includes("FERRULE") ||
      /\b1\s*(?:POS|POSITION|PIN|CIRCUIT)\b/.test(text) ||
      text.includes("SINGLE POSITION") ||
      text.includes("SINGLE-POSITION");
  };
  const declaredPositionCount = (rows, side) => {
    const prefix = side === "left" ? "left" : "right";
    const counts = [];
    for (const row of rows) {
      const explicit = Number(row[`${prefix}ConnectorPositionCount`]) || 0;
      if (explicit >= 1 && explicit <= 64) counts.push(explicit);
      const text = normalizedText([
        row[`${prefix}LegName`],
        row[`${prefix}HousingType`],
        row[`${prefix}HousingPart`]
      ].join(" "));
      if (text.includes("RJ45")) counts.push(8);
      if (text.includes("2181120802") || text.includes("218112-0802")) counts.push(8);
      for (const match of text.matchAll(/\b(\d{1,2})\s*(?:PIN|PINS|POS|POSITION|POSITIONS)\b/g)) {
        const count = Number(match[1]);
        if (count >= 1 && count <= 64) counts.push(count);
      }
      for (const match of text.matchAll(/\b(\d{1,2})\s*(?:CIRC|CIRCUIT|CIRCUITS)\b/g)) {
        const count = Number(match[1]);
        if (count >= 1 && count <= 64) counts.push(count);
      }
    }
    return counts.length ? Math.max(...counts) : 0;
  };
  const buildEndpointRecords = (rows, side) => {
    const prefix = side === "left" ? "left" : "right";
    const grouped = new Map();
    rows.forEach((row) => {
      const pin = String(row[`${prefix}PinPos`] || "").trim();
      const hasEndpoint = meaningful(pin) || [
        row[`${prefix}Leg`], row[`${prefix}LegName`], row[`${prefix}HousingType`], row[`${prefix}HousingPart`]
      ].some(meaningful);
      if (!hasEndpoint) return;
      const key = endpointKey(row, side);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    return Array.from(grouped, ([id, endpointRows]) => {
      const activeRows = endpointRows.filter((row) => !isDnpRow(row));
      const usedPins = Array.from(new Set(activeRows.map((row) => String(row[`${prefix}PinPos`] || "").trim()).filter(Boolean)));
      const singlePosition = isSinglePositionTermination(activeRows.length ? activeRows : endpointRows, side);
      const declared = declaredPositionCount(endpointRows, side);
      const capacityRows = declared
        ? endpointRows.filter((row) => {
            const pin = numericPin(row[`${prefix}PinPos`]);
            return !isDnpRow(row) || !Number.isFinite(pin) || pin <= declared;
          })
        : endpointRows;
      const pins = capacityRows.map((row) => numericPin(row[`${prefix}PinPos`])).filter(Number.isFinite);
      const highestPin = pins.length ? Math.max(...pins) : 0;
      const positionCount = singlePosition ? 1 : Math.max(1, declared, highestPin, usedPins.length);
      const unusedPins = Array.from(new Set(endpointRows
        .filter(isDnpRow)
        .map((row) => String(row[`${prefix}PinPos`] || "").trim())
        .filter((pin) => {
          const numeric = numericPin(pin);
          return Boolean(pin) && (!Number.isFinite(numeric) || numeric <= positionCount);
        })));
      return {
        id,
        side,
        name: String(endpointRows.find((row) => meaningful(row[`${prefix}LegName`]))?.[`${prefix}LegName`] || "").trim(),
        housingType: String(endpointRows.find((row) => meaningful(row[`${prefix}HousingType`]))?.[`${prefix}HousingType`] || "").trim(),
        housingPart: String(endpointRows.find((row) => meaningful(row[`${prefix}HousingPart`]))?.[`${prefix}HousingPart`] || "").trim(),
        pinPart: String(endpointRows.find((row) => meaningful(row[`${prefix}PinPart`]))?.[`${prefix}PinPart`] || "").trim(),
        termination: singlePosition ? "single-position" : "connector",
        positionCount,
        usedPins,
        unusedPins,
        rows: endpointRows,
        activeRows
      };
    });
  };

  function validateRows(rows) {
    const diagnostics = [];
    const add = (severity, code, message, rowIndexes = []) => diagnostics.push({ severity, code, message, rowIndexes });
    if (!rows.length) {
      add("error", "NO_ROWS", "No harness rows were found.");
      return diagnostics;
    }
    const activeRows = rows.filter((row) => !isDnpRow(row));
    activeRows.forEach((row, index) => {
      if (!meaningful(row.wireName) && !meaningful(row.rightWireName)) add("error", "MISSING_WIRE_NAME", `Active row ${index + 1} has no wire name.`, [index]);
      if (!meaningful(row.leftPinPos)) add("warning", "MISSING_LEFT_PIN", `Active row ${index + 1} has no left pin position.`, [index]);
      if (!meaningful(row.rightPinPos)) add("warning", "MISSING_RIGHT_PIN", `Active row ${index + 1} has no right pin position.`, [index]);
    });
    for (const side of ["left", "right"]) {
      const prefix = side === "left" ? "left" : "right";
      for (const endpoint of buildEndpointRecords(rows, side)) {
        const seen = new Map();
        endpoint.activeRows.forEach((row) => {
          const pin = String(row[`${prefix}PinPos`] || "").trim();
          if (!pin) return;
          seen.set(pin, (seen.get(pin) || 0) + 1);
        });
        for (const [pin, count] of seen) {
          if (count > 1) add("error", "DUPLICATE_PIN", `${side.toUpperCase()} ${endpoint.name || endpoint.id} pin ${pin} is assigned to ${count} active wires.`);
        }
        if (endpoint.usedPins.some((pin) => numericPin(pin) > endpoint.positionCount)) {
          add("error", "PIN_EXCEEDS_CAPACITY", `${side.toUpperCase()} ${endpoint.name || endpoint.id} uses a pin beyond its ${endpoint.positionCount}-position capacity.`);
        }
      }
    }
    const pairs = new Map();
    activeRows.forEach((row, index) => {
      const id = normalizedText(row.twistedPairId);
      if (!id) return;
      if (!pairs.has(id)) pairs.set(id, []);
      pairs.get(id).push(index);
    });
    for (const [id, members] of pairs) {
      if (members.length !== 2) add("error", "INVALID_TWISTED_PAIR", `Twisted Pair ${id} has ${members.length} members; exactly two are required.`, members);
    }
    return diagnostics;
  }

  function planConnectorGroups(groups, options = {}) {
    const top = Number(options.top) || 160;
    const groupGap = Number(options.groupGap) || 14;
    let cursorY = top;
    return groups.map((input, groupIndex) => {
      const group = { ...input };
      const wires = [...(group.wires || [])].sort((left, right) =>
        numericPin(left.toPin) - numericPin(right.toPin) || numericPin(left.fromPin) - numericPin(right.fromPin)
      );
      const positionCount = Math.max(1, Number(group.positionCount) || wires.length || 1);
      const slotGap = positionCount > 6 ? 34 : positionCount > 1 ? 42 : 38;
      const slots = Array.from({ length: positionCount }, (_, index) => ({
        pin: String(index + 1),
        wire: wires.find((wire) => numericPin(wire.toPin) === index + 1) || null,
        y: cursorY + 18 + index * slotGap
      }));
      const assigned = new Set(slots.map((slot) => slot.wire).filter(Boolean));
      wires.filter((wire) => !assigned.has(wire)).forEach((wire) => {
        const open = slots.find((slot) => !slot.wire);
        if (open) open.wire = wire;
      });
      const bottom = cursorY + 38 + Math.max(0, positionCount - 1) * slotGap;
      const output = { ...group, index: group.index ?? groupIndex, sortedWires: wires, slots, top: cursorY, bottom, positionCount, slotGap };
      cursorY = bottom + groupGap;
      return output;
    });
  }

  function findRectangleCollisions(rectangles, padding = 2) {
    const collisions = [];
    for (let leftIndex = 0; leftIndex < rectangles.length; leftIndex += 1) {
      const left = rectangles[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < rectangles.length; rightIndex += 1) {
        const right = rectangles[rightIndex];
        const overlaps = left.x < right.x + right.width + padding &&
          left.x + left.width + padding > right.x &&
          left.y < right.y + right.height + padding &&
          left.y + left.height + padding > right.y;
        if (overlaps) collisions.push([left.id, right.id]);
      }
    }
    return collisions;
  }

  function placeLabels(rectangles, options = {}) {
    const gap = Number(options.gap) || 4;
    const minY = Number.isFinite(options.minY) ? options.minY : 0;
    const maxY = Number.isFinite(options.maxY) ? options.maxY : Infinity;
    const placed = rectangles
      .map((rectangle) => ({ ...rectangle, y: Math.max(minY, rectangle.y) }))
      .sort((left, right) => left.y - right.y);
    for (let index = 1; index < placed.length; index += 1) {
      const previous = placed[index - 1];
      const minimum = previous.y + previous.height + gap;
      if (placed[index].y < minimum) placed[index].y = minimum;
    }
    if (placed.length && Number.isFinite(maxY)) {
      const overflow = placed.at(-1).y + placed.at(-1).height - maxY;
      if (overflow > 0) {
        placed.forEach((rectangle) => { rectangle.y -= overflow; });
        if (placed[0].y < minY) {
          const correction = minY - placed[0].y;
          placed.forEach((rectangle) => { rectangle.y += correction; });
        }
      }
    }
    return placed;
  }

  return Object.freeze({
    normalizeTerminology,
    isDnpRow,
    endpointKey,
    isSinglePositionTermination,
    declaredPositionCount,
    buildEndpointRecords,
    validateRows,
    planConnectorGroups,
    placeLabels,
    findRectangleCollisions
  });
});
