"use strict";

(function exposeWorkspaceSession(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DigiWireSession = api;
})(typeof globalThis === "object" ? globalThis : this, function createWorkspaceSession() {
  const FORMAT = "DIGIWIRE_WORKSPACE";
  const MAX_BYTES = 25 * 1024 * 1024;
  const object = (value) => value && typeof value === "object" && !Array.isArray(value);

  function validate(session) {
    if (!object(session) || session.format !== FORMAT || session.formatVersion !== 1) {
      throw new Error("Choose a DigiWire project file (.digiwire.json). The current drawing has been kept.");
    }
    if (!["harness", "master"].includes(session.mode) || !object(session.master) || !object(session.harness)) {
      throw new Error("The project is missing its workspace data. The current drawing has been kept.");
    }
    const project = session.master.project;
    if (!object(project) || !["boards", "harnesses", "imports"].every((key) => Array.isArray(project[key]))) {
      throw new Error("The project contains invalid master board or cable data.");
    }
    if (session.harness.sheet && (!Array.isArray(session.harness.sheet.objects) || !Array.isArray(session.harness.sheet.rows))) {
      throw new Error("The project contains an invalid harness table.");
    }
    if (session.harness.designerConfig && (!object(session.harness.designerConfig.left) || !object(session.harness.designerConfig.right))) {
      throw new Error("The project contains invalid connector settings.");
    }
    if (session.harness.result && !["wires", "connectors", "findings"].every((key) => Array.isArray(session.harness.result[key]))) {
      throw new Error("The project contains invalid harness drawing data.");
    }
    for (const drawing of [session.harness.xml, session.master.xml]) {
      if (drawing != null && (typeof drawing !== "string" || (drawing && !/<mxfile\b/.test(drawing)))) {
        throw new Error("The project contains an invalid editable drawing.");
      }
    }
    return session;
  }

  function serialize(session) {
    validate(session);
    const json = JSON.stringify(session);
    if (new TextEncoder().encode(json).byteLength > MAX_BYTES) throw new Error("This project exceeds the 25 MB project-file limit.");
    return json;
  }

  function parse(json) {
    if (typeof json !== "string" || new TextEncoder().encode(json).byteLength > MAX_BYTES) {
      throw new Error("Choose a DigiWire project file smaller than 25 MB.");
    }
    let session;
    try { session = JSON.parse(json); } catch { throw new Error("This file is not valid project JSON. The current drawing has been kept."); }
    return validate(session);
  }

  return Object.freeze({ FORMAT, MAX_BYTES, serialize, parse, validate });
});
