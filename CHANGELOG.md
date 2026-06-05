# Changelog

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
