# Changelog

## v1.2.50 - 2026-06-07

- Reworked wire routing so left-side wires drop beside the source connector and right-side wires rise beside their destinations before meeting through the middle lane.
- Lowered the left connector column when the right side has a tall connector stack so the bundle meets closer to the center of the drawing.
- Removed the tall center drop created by the previous route pass.

## v1.2.49 - 2026-06-07

- Changed wire routing to leave the left connector horizontally first, then drop into the shared lane and finish with a shorter connector run.
- Raised the shared wire trunk so the preview uses the open center area instead of routing all the way down to the bottom.

## v1.2.48 - 2026-06-07

- Let imported spreadsheet rows teach the catalog stable housing metadata and part numbers for future reuse.
- Let edited housing and part fields update the catalog as you work.

## v1.2.47 - 2026-06-07

- Added a dedicated Mini-Fit Jr family renderer that scales by circuit count and follows Molex's row numbering layout.
- Added a Mini-Fit Jr pinout reference image to the built-in catalog entry.

## v1.2.46 - 2026-06-07

- Added built-in TE CPC 16-position male and female housings with a round-face pinout preview.
- Recognized CPC housings as a 16-position connector family for routing and validation.

## v1.2.45 - 2026-06-07

- Removed the selected-wire preview highlight so clicked rows do not make one harness wire stand out from the rest.

## v1.2.44 - 2026-06-07

- Added RJ45 plug and jack catalog entries with Cat 6 pinout previews and 8-position routing support.
- Recognized RJ45 / 8P8C housings as 8-position connectors in the preview and checks.

## v1.2.43 - 2026-06-07

- Made the Upload button read clipboard text and auto-import it without opening the paste dialog.

## v1.2.42 - 2026-06-07

- Removed the housing line from the heatshrink labels and kept just the leg number and leg name.

## v1.2.41 - 2026-06-07

- Drew the wire line over the heatshrink boxes so routing stays visible.
- Kept the heatshrink text above the wire line.

## v1.2.40 - 2026-06-07

- Removed the white preview container and left the purple cable-name badge on its own.

## v1.2.39 - 2026-06-07

- Made the heatshrink endpoint boxes translucent so the wire routing stays visible underneath.

## v1.2.38 - 2026-06-07

- Removed the selected wire detail text from the white preview box and kept only the wire name badge.

## v1.2.37 - 2026-06-07

- Moved the purple cable-name label into the white wire detail box above the preview.

## v1.2.36 - 2026-06-07

- Moved the purple cable-name label above the wire bundle and kept it from getting buried.

## v1.2.35 - 2026-06-07

- Displayed every active wire name on its routed wire line, not only the selected wire.
- Centered wire-name labels directly on the lines they identify.

## v1.2.34 - 2026-06-07

- Added black heatshrink-style labels at selected wire endpoints for left/right leg details.
- Added a purple cable-name label on the selected harness route.
- Removed the old floating connector callouts from the preview.

## v1.2.33 - 2026-06-07

- Moved the selected wire name out of the preview header and onto the wire route.

## v1.2.32 - 2026-06-07

- Removed the JSON Save toolbar button.
- Removed the Wire colors side panel and expanded the live preview into that space.

## v1.2.31 - 2026-06-07

- Renamed the Picture toolbar action to Upload.
- Removed screenshot upload and browser OCR controls from row import.
- Kept pasted spreadsheet row translation as the import workflow.

## v1.2.30 - 2026-06-07

- Removed the selected-wire summary panel from the preview area.
- Removed the editable-table search and active-only filter controls.
- Expanded the live preview into the freed layout space.

## v1.2.29 - 2026-06-07

- Moved the cable name input into the editor bar between left and right leg-name fields.
- Sized the three editor-bar name inputs consistently.

## v1.2.28 - 2026-06-07

- Matched the production table order to the latest sheet layout and hid Do Not Place columns from exported/visible tables.
- Reordered right-side columns to Pin Pos #, Housing Type, Housing Part #, Pin P#.

## v1.2.27 - 2026-06-07

- Renamed both terminal part-number table headers from Pin # to Pin P#.

## v1.2.26 - 2026-06-07

- Added separate Left Leg Name and Right Leg Name columns while keeping left/right leg values as numbers.
- Updated Excel/picture import and CSV/printable exports for the new production sheet format.

## v1.2.25 - 2026-06-06

- Added the harness title to the browser print/PDF drawing header.

## v1.2.24 - 2026-06-06

- Bound preview callout labels to their physical connector side so left information stays with the left housing and right information stays with the right housing.

## v1.2.23 - 2026-06-06

- Kept preview connector label callouts on the same side as their housings while leaving clear space from the housing drawings.

## v1.2.22 - 2026-06-06

- Moved preview connector label blocks farther into the open canvas so they do not sit on top of the housing drawings.

## v1.2.21 - 2026-06-06

- Moved connector, leg, and housing labels beside preview housings and enlarged the label text for readability.

## v1.2.20 - 2026-06-06

- Accepted the new production sheet import format with Cable Name, Wire Name, and labeled left/right leg cells.

## v1.2.19 - 2026-06-06

- Rendered plain Dupont headers with bottom horizontal pin positions instead of the generic vertical connector layout.

## v1.2.18 - 2026-06-05

- Added left and right leg-name inputs above the editable table.
- Displayed saved leg names in the selected-wire summary and live harness connector labels.

## v1.2.17 - 2026-06-05

- Moved Dupont housing wire landing points to the bottom edge of the connector.
- Updated Dupont pin labels and route ports to match the bottom-exit wiring style used by PCB housings.

## v1.2.16 - 2026-06-05

- Changed browser printing to a one-page landscape drawing layout.
- Hid the editable table during print so the Print button focuses on the onscreen harness preview.

## v1.2.15 - 2026-06-05

- Restored the top toolbar Print button for printing the onscreen harness drawing.

## v1.2.14 - 2026-06-05

- Treat blank pin rows as automatic DNP rows so leg/pin numbers alone do not create live wires.
- Show inferred DNP status in the table, search, CSV export, import preview, and generated instructions.

## v1.2.13 - 2026-06-05

- Increased wire lane spacing so paths stay visually separated in the live harness preview.
- Spread connector fan-out bends farther apart and slimmed the selected wire highlight so nearby wires remain visible.

## v1.2.12 - 2026-06-05

- Moved PCB housing wire landing points to the bottom edge of the board.
- Updated the PCB board trace drawing so routed wires no longer appear to terminate from the top pin stack.

## v1.2.11 - 2026-06-05

- Added a draggable horizontal splitter between the live preview and editable table.
- Saved the preview/table split height in browser storage so the adjusted layout persists after refresh.

## v1.2.10 - 2026-06-05

- Reduced top toolbar clutter by hiding Add, Copy, Delete, BOM, CSV, Drawing, Guide, Print, and Import buttons.
- Kept Undo, Reset, Checks, Catalog, Picture, and Save visible for the main workflow.

## v1.2.9 - 2026-06-05

- Made active-wire detection side-aware so left-side DNP no longer hides a row that still has wire data and a right endpoint.
- Updated the preview, active counts, active-only filter, and selected-wire status to use the same active-wire rule.

## v1.2.8 - 2026-06-05

- Added a top toolbar Undo button for reverting the last project edit.
- Captured undo history for row edits, table changes, imports, catalog updates, BOM allowance, and column resizing.

## v1.2.7 - 2026-06-05

- Changed barrel connector pin 1 to terminate at the center positive contact.
- Changed barrel connector pin 2 to terminate on the outside sleeve/negative contact.
- Added distinct barrel contact markers so positive and negative are easier to tell apart.

## v1.2.6 - 2026-06-05

- Moved 2-pin front Molex wire endpoints onto the two lower terminal locations.
- Changed barrel connections to two-conductor housings with separate lower lead termination points.
- Made imported Molex names such as `2 PIN MOLEX FRONT` use the Molex drawing/routing family.

## v1.2.5 - 2026-06-05

- Added `BARREL CONNECTION` to the built-in housing catalog.
- Added a barrel plug/jack style preview drawing for barrel connection housings.

## v1.2.4 - 2026-06-05

- Changed selected wire start markers to the left-side table blue.
- Changed selected wire destination markers to the right-side table orange.
- Applied the same start/end colors to selected connector pins and cable exit leads.

## v1.2.3 - 2026-06-05

- Made Excel/picture import read the production sheet column names before translating rows.
- Fixed OCR cases where housing part numbers were merged into the Housing Type cell.
- Preserved separate left/right Housing Type, Housing Part #, and Pin # fields during import.

## v1.2.2 - 2026-06-05

- Added draggable spreadsheet-style resize handles to the wiring table headers.
- Saved custom column widths with the browser project state and project JSON.
- Added double-click reset on each column resize handle.

## v1.2.1 - 2026-06-05

- Updated the editable wiring table, import preview, CSV export, and printable guide to match the production spreadsheet column order.
- Added left/right housing part numbers, terminal pin part numbers, right-side DNP, tool used, and comments fields to saved rows.
- Replaced visible splice ID/role columns with one Branch column while preserving parent-and-branch splice behavior.
- Added forgiving Molex housing-name matching and seeded the Molex 2-position part/contact numbers from the example sheet.

## v1.2.0 - 2026-06-04

- Added a continuous electrical error checker with direct row highlighting and actionable issue navigation.
- Added an editable connector and terminal catalog that drives housing choices, drawing families, pin capacity, and component metadata.
- Added automatic wire-material totals, purchasing allowance, component BOM, grouped cut list, CSV export, and production-guide sections.

## v1.1.10 - 2026-06-04

- Routed every connector wire from a visible bottom cable port.
- Replaced overlapping curves with separated schematic lanes and 90-degree bends.
- Increased background-wire contrast and removed the 18-wire preview limit.

## v1.1.9 - 2026-06-04

- Arranged Molex and Dupont housing pin cavities horizontally from left to right.
- Moved pin numbers below horizontal housing cavities for clearer wire landing points.
- Kept Powerpole bottom exits and Subconn circular layouts unchanged.

## v1.1.8 - 2026-06-04

- Added shared window-splice IDs with explicit parent and branch wire roles.
- Added automatic branch creation when copying a parent or existing branch row.
- Rendered one labeled splice node with parent and branch segments fanning to separate destinations.
- Added splice fields to CSV, JSON, picture-import previews, and printable instructions.

## v1.1.7 - 2026-06-04

- Routed Powerpole wires from bottom-center cable ports instead of across the connector faces.
- Added short separated vertical drop lanes before Powerpole wires curve toward their destinations.
- Moved Powerpole housing labels above the modules and removed redundant endpoint text from bottom-exit wires.

## v1.1.6 - 2026-06-04

- Replaced the giant A/B Powerpole preview body with individual single-position housing modules.
- Colored each Powerpole module from its wire color and ordered modules by pin number.
- Arranged Powerpole modules side-by-side in groups of up to four, with additional positions wrapping below.

## v1.1.5 - 2026-06-03

- Hid DNP pin contacts and pin numbers from the live harness preview.
- Ensured DNP-only legs and housings do not appear in the preview.
- Hardened DNP handling for imported and older saved project values.

## v1.1.4 - 2026-06-03

- Made every leftmost row number a clear-row control.
- Clearing a row preserves its left leg and pin location, resets its wiring fields, and marks it DNP for reuse.
- Cleared and DNP rows no longer appear as selected wires in the live preview.

## v1.1.3 - 2026-06-03

- Added SubConn 2, 4, 6, 8, 10, 12, 14, and 16-pin male and female housing choices.
- Added recognizable offline vector illustrations for SubConn, Molex, Dupont, PCB, Power Pole, ring terminal, and splice housings.
- Made SubConn previews circular with keyed faces, radial contacts, and distinct male pins/female sockets.

## v1.1.2 - 2026-06-03

- Removed `CPC 1`, `CPC 2`, `DTM06`, `DEUTSCH DT`, and generic `DUPONT` from new housing choices.
- Added Molex 1-8 position front-lock and side-lock housing choices.
- Added Dupont 1-12 position front-lock housing choices.
- Made position-specific housings display their actual number of connector positions in the preview.

## v1.1.1 - 2026-06-03

- Added `PCB` and `DUPONT` housing types.

## v1.1 - 2026-06-03

- Added a real Windows `WiringHarnessDesigner.exe`.
- Added an offline native launcher with embedded fallback application files.
- Added a repeatable `Build EXE.cmd` update process.
- Preserved the editable program-file structure for easy updates.
- Hardened copied EXE launches so a Desktop EXE finds the main Documents app folder and existing saved data.

## v1.0 - 2026-06-03

- Created the offline Wiring Harness Designer desktop-style app.
- Added editable Excel-style harness rows.
- Added live wire and connector preview.
- Added vertically stacked left and right legs.
- Added project JSON save/import and CSV export.
- Added picture import review and row translation.
- Added SVG drawing, printable guide, and print output.
- Added Windows launcher and Desktop shortcut.

## Next

The next release will be v1.2.
