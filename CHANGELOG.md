# Changelog

## v1.2.94 - 2026-06-14

- Simplified splice routing so parent rows run into a vertical trunk and branch rows leave the splice with a cleaner horizontal turn.
- Tightened splice port spacing a bit so the junction reads more like the hand-drawn Y layout.

## v1.2.93 - 2026-06-14

- Flipped tap-position mapping so smaller tap distances sit near the USB end and larger tap distances sit toward the terminator, matching the hand sketch.

## v1.2.92 - 2026-06-14

- Tightened splice placement so branch junctions bias toward the trunk instead of floating midway between the trunk and the branch destination.
- Kept the connector detail panels removed so the routing view stays cleaner.

## v1.2.91 - 2026-06-14

- Removed the connector info panels from the default harness drawing so the routing and splice layout stay readable.
- Bumped the cache-busting version to keep the simplified preview loading cleanly.

## v1.2.90 - 2026-06-14

- Added a `Tap Position inches` field so splice groups can be placed along a sequential trunk instead of being inferred from endpoint averages.
- Updated the import, export, and printed instructions tables to carry the new tap-position column.
- Wired splice placement to sort and position groups by tap position when the field is present.

## v1.2.89 - 2026-06-13

- Simplified splice output to a true sideways Y: one parent input on the left and two branch outputs on the right.
- Removed the fake continuation arm that was making the splice read like a trunk chain instead of a split.
- Bumped the cache-busting version so the updated branch geometry loads immediately.

## v1.2.88 - 2026-06-13

- Chained parent splice rows across the active conductor order so the main trunk now flows from one splice to the next instead of restarting at the left connector every time.
- Changed branch rows to use the down-right leg of the splice, leaving the straight right arm for the trunk continuation.
- Drew the splice artwork as a cleaner sideways Y so the tap is easier to follow in the preview.

## v1.2.87 - 2026-06-13

- Tightened splice artwork into a smaller sideways Y junction so parent and branch wires read more like an actual splice point.
- Changed the branch leg to angle down-right instead of dropping straight under the splice body.
- Bumped the cache-busting app version so the site picks up the new splice geometry.

## v1.2.86 - 2026-06-13

- Made splice routing conductor-aware so CAN H, CAN L, and GND no longer pile into one shared splice sleeve.
- Draws one splice junction per wire lane, with one-left/two-out routing when a conductor has multiple branch outputs.
- Places splice callouts near their actual branch connector route instead of a fixed middle-board column.
- Removed the large splice in/out summary text from the drawing.

## v1.2.85 - 2026-06-13

- Routed parent and branch wires to real splice ports instead of the center of the splice symbol.
- Matched the splice artwork to the same left, right-through, and drop ports used by the wire paths.

## v1.2.84 - 2026-06-13

- Removed drawing BOM balloons and the BOM callout table from the harness preview.
- Made connector pinout/detail panels movable independently from connector housings.
- Reworked splice artwork into a smaller taped-splice symbol and made splice junctions draggable.
- Changed wire labels from translucent boxes to text that rides directly on the wire route.

## v1.2.83 - 2026-06-12

- Repaired header-based CAN imports when pasted branch rows lose the blank spacer column after `Branch`.
- Rebuilds shifted branch endpoints so Molex housing names no longer land in the pin column.

## v1.2.82 - 2026-06-12

- Made the CAN template importer tolerant of rows where the blank separator after `Branch` gets lost during copy/paste.
- Kept the same harness import format working whether the right side starts one cell later or immediately after the branch label.

## v1.2.81 - 2026-06-12

- Preserved blank spreadsheet columns during import so headerless CAN rows keep their left and right side layout.
- Added a headerless template-row parser for the CAN sheet so parent rows and branch rows import without false validation errors.

## v1.2.80 - 2026-06-12

- Added a CAN branch-row parser so rows with a blank left side and populated branch/right side import correctly from the spreadsheet template and rows-only paste.

## v1.2.79 - 2026-06-12

- Added a copy button to the harness checks dialog so you can copy all current error messages, including row numbers, in one click.

## v1.2.78 - 2026-06-12

- Relaxed splice validation for multi-conductor bus harnesses so repeated parent/branch segments do not trigger false duplicate-endpoint or "exactly one parent" errors.
- Kept the cable-name rule limited to the first active row so CAN bus sheets can repeat the harness name only once.

## v1.2.76 - 2026-06-10

- Added `MOTOR ESC` as a built-in housing/catalog category that renders with the VESC-style ESC board artwork.
- Updated ESC artwork with motor-controller details from VESC-style examples, including capacitors, MOSFETs, heatsink lines, signal pads, battery pads, and U/V/W phase outputs.
- Added `RESISTOR` as a two-terminal component that can be placed on branch rows for parallel/shunt-style harness loads.
- Updated BOM typing so Motor ESC and resistor components appear as components instead of generic housings.

## v1.2.75 - 2026-06-10

- Added a light gray shop drawing sheet with border zones, fixture pin markers, and a compact title block.
- Added connector face-view panels labeled as viewed from the mating face, with per-connector pinout tables.
- Added circled BOM callouts tied to a drawing BOM table.
- Added multi-color, shielded, and twisted-pair wire drawing support, including richer wire labels with color, AWG, length, and construction notes.
- Updated draw.io export styling for light backgrounds and multi-color/shield/twisted wire routes.

## v1.2.74 - 2026-06-10

- Added the wire route drag shortcuts to the top header so `9` add bend, `8` remove bend, and `7` straighten are visible while working.

## v1.2.73 - 2026-06-10

- Added route-drag shortcuts: `8` removes the active or most recent wire bend, and `7` clears route bends and offset for the straightest automatic path.
- Kept `9` as the bend-add shortcut so wire routing now has an add, remove, and straighten key set while dragging.

## v1.2.72 - 2026-06-10

- Opened up the default drawing layout with wider wire lanes, larger connector spacing, a centered cable title, and right-side connectors kept farther out of the wire field.
- Doubled the manual movement range for wire routes, wire labels, connectors, heatshrink labels, and the cable title.
- Replaced the single manual route bend with up to ten saved 90-degree bend points per wire; press `9` while dragging a cable to add the next bend.
- Made individual bend handles draggable and removable with a double-click.

## v1.2.71 - 2026-06-10

- Removed the duplicate Cable Name, Left leg names, and Right leg names fields above the editor.
- Made the editable table match the spreadsheet header order, starting with Cable Name, Left Leg, Left Leg Name, and Wire Name.
- Drove the drawing title from the first non-empty Cable Name cell so imports, exports, print, and draw.io use the sheet data.

## v1.2.70 - 2026-06-10

- Added a built-in VESC housing type as a board-style motor controller.
- Rendered VESC boards with ESC-specific PCB artwork, including battery pads, phase pads, signal pads, and MOSFET blocks.

## v1.2.69 - 2026-06-10

- Made Reset create a blank wiring sheet instead of restoring the W104 starter harness.
- Treated Cable Name as the drawing title without inventing a placeholder title when it is blank.
- Added AWG and length to wire labels in the live preview and draw.io export.
- Added a single bottom-right tool note to the drawing based on unique Tool used values.
- Kept imported rows that carry AWG, color, or length even when other identifying cells are sparse.

## v1.2.68 - 2026-06-09

- Fixed saved blank wire bend data being interpreted as a bend at the canvas origin, which sent routes through the upper-left corner.
- Added an app script cache-buster so browser refreshes load the corrected routing code.

## v1.2.67 - 2026-06-09

- Changed draw.io wires to visible absolute colored polylines with outline strokes so they match the live harness routes.
- Made exported connector SVG images use draw.io-safe data URIs so connector artwork comes across with the diagram.

## v1.2.66 - 2026-06-09

- Switched the draw.io export background from a covering rectangle to the page background so exported wires and connector artwork stay visible.

## v1.2.65 - 2026-06-09

- Clamped the dragged cable title so it stays inside the preview and the draw.io export canvas.

## v1.2.64 - 2026-06-08

- Added a draw.io handoff button that exports the current harness into a diagrams.net editor session.
- Preserved connector images, wire colors, wire names, splice nodes, heatshrink labels, and cable title metadata in the exported diagram.
- Saved the returned draw.io XML back into project state for later reuse.

## v1.2.63 - 2026-06-08

- Added drag handles for the purple harness title, connector housings, heatshrink labels, and wire-name tags so the whole preview can be nudged after population.
- Kept the route drag and bend-point behavior intact while broadening the same interaction model to the other preview objects.
- Added double-click resets for the new draggable preview items so you can put any piece back where the layout logic started it.

## v1.2.62 - 2026-06-08

- Added a second manual route control point so a dragged wire can pick up an extra bend and slip around crowded housings.
- Added a keyboard shortcut while dragging a wire: press `9` to drop the bend point at the current pointer location.
- Added a visible bend handle you can grab later to refine that extra elbow without moving the whole route.
- Kept the bend point in saved state and smoke-tested the route math so the extra flex stays stable after reload.

## v1.2.61 - 2026-06-08

- Added preview drag editing for routed cables so you can pull a wire into a better layout on the fly.
- Added invisible wire hit targets and double-click reset behavior for manual route tweaks.
- Kept the drag offsets in saved state so layout edits persist after reload.
- Smoke-tested 50 randomized harness layouts with manual offsets and found no route, label, or persistence regressions.

## v1.2.60 - 2026-06-08

- Gave dense lower-bundle layouts a little more room near the right-side connector stack so the bundle reads less cramped.
- Added crowd-aware compression for wire-name tags so longer names stay legible when the diagram gets busy.
- Softened the lower-bundle visual hierarchy so the main route reads more clearly without losing the bundle structure.
- Made heatshrink labels adapt a bit more to one-sided wire density so the sleeve blocks fit the layout better.
- Smoke-tested 50 randomized harness layouts and found no path-token, wire-tag, or heatshrink-bound regressions.

## v1.2.59 - 2026-06-08

- Simplified bottom-to-bottom wire routing so lower bundles no longer make a fake leftward branch before reaching the right-side connector stack.
- Kept wire-name labels aligned to the cleaner center spine for the lower bundle.
- Smoke-tested 20 randomized starter harness layouts and found no horizontal backtracking regressions in the active wire paths.
## v1.2.58 - 2026-06-08

- Prevented bottom-routed wires from doubling back when a right-side connector is shifted left in the crescent layout.
- Anchored wire-name tags to the start of their horizontal route so wires no longer poke out as loose-looking stubs before the label.

## v1.2.57 - 2026-06-08

- Changed pin-position numbers to orange with a dark outline so they stand out on the wire diagram.
- Added used pin numbers at the actual wire termination points on both left and right connector ends.

## v1.2.56 - 2026-06-08

- Shifted the harness cable tag left in the live diagram so it stays out of the crowded right-side routing.
- Moved right-side leg connector groups onto a soft crescent layout to spread terminations across the preview.

## v1.2.55 - 2026-06-08

- Replaced the old per-position Molex front/side lock dropdown entries with two scalable Micro-Fit choices.
- Added front-lock single-row and side-lock dual-row Molex Micro-Fit drawings that scale to the highest used pin on each leg.
- Mapped legacy Molex front/side lock names and part-number aliases to the new Micro-Fit catalog entries.

## v1.2.54 - 2026-06-07

- Made wire-name tag backgrounds 50% transparent while keeping the label text solid.

## v1.2.53 - 2026-06-07

- Moved heatshrink sleeves closer to each leg's termination points.
- Made the translucent heatshrink boxes darker and smaller so they read like termination sleeves without hiding the wires.

## v1.2.52 - 2026-06-07

- Added heatshrink sleeves and labels for every active left and right leg group, not just the selected wire.
- Layered heatshrink sleeves behind the wires while keeping the leg labels readable on top.

## v1.2.51 - 2026-06-07

- Made W104 the built-in starter harness for fresh loads and reset.
- Seeded the starter catalog from the W104 CPC and A Power Pole part numbers.
- Added the `16 PIN CPC` housing alias so the starter harness validates cleanly.

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
