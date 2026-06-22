# Changelog

## v2.0.1 - 2026-06-22

- Forced Draw.io's exported artwork to use its light palette before PDF rendering.
- Added the Draw.io grid to the exported page so the PDF matches the editing canvas.
- Fixed washed-out colors and black documentation panels caused by Draw.io's `light-dark(...)` SVG styles following the browser's dark-mode preference.
- Increased the screenshot-quality PDF render to preserve clear text, wires, connector faces, and page spacing.

## v2.0.0 - 2026-06-22

- Rebuilt DIGIWIRE as a streamlined Excel-to-Draw.io conversion workspace.
- Embedded the full Draw.io editor permanently in the center of the app instead of opening a popup.
- Removed the separate internal drawing preview plus the Print and Edit in Draw.io buttons.
- Automatically loads every pasted table or interpreted image into the embedded Draw.io canvas.
- Keeps a queued diagram ready when table conversion finishes before Draw.io has fully initialized.
- Preserves Save-to-PDF behavior inside Draw.io and keeps the editor open for continued cleanup.
- Clears and reloads a blank Draw.io canvas without leaving DIGIWIRE.

## v1.6.24 - 2026-06-21

- Rendered `PCB` housing endpoints as green circuit boards with numbered plated solder pads and traces instead of connector housings.
- Routed wires directly to PCB solder pads and removed fake crimp-terminal blocks at PCB endpoints.
- Changed PCB endpoint orientation text to `SOLDER SIDE` in both the program preview and Draw.io output.
- Consolidated the overall-length annotation into one white-backed line above the sleeve so it no longer overlaps the expando label.

## v1.6.23 - 2026-06-21

- Replaced the generic vertical 16-position CPC block with a circular 16-cavity mating face numbered 1 through 16.
- Split repeated right-side pin sequences into separate connector housings instead of drawing one oversized combined connector.
- Applied the W104 grouping as four 3-position connectors plus one 4-position connector, labeled SH, SV, PV, PH, and BW.
- Added the same circular CPC and split-connector artwork to generated Draw.io files.

## v1.6.22 - 2026-06-21

- Added an automatic high-density page layout for straight harnesses with more than eight conductors.
- Compressed wire pitch, terminals, labels, and connector cavities into a clean upper drawing zone without overlap.
- Moved the wiring list, notes, specifications, title block, legend, and bill of materials into a dedicated lower documentation band matching the cleaner Draw.io composition.
- Prioritized red power and black ground in the compact wire-color legend.

## v1.6.21 - 2026-06-21

- Changed Paste table into a one-click action that reads the clipboard and generates the harness immediately.
- Removed the extra Load pasted table button.
- Kept a clipboard-permission fallback box where Ctrl+V automatically loads the pasted table without another click.

## v1.6.20 - 2026-06-21

- Removed the large image-upload card and secondary reader controls from the main workspace.
- Moved Paste image, Paste table, and Clear into the drawing header for the everyday table-first workflow.
- Kept clipboard image reading automatic and retained image drag-and-drop directly on the drawing area.
- Expanded the drawing to the full workspace width and moved live status text beneath the drawing title.

## v1.6.19 - 2026-06-21

- Kept datasheet-aware harness wires on separate horizontal lanes aligned with their connector cavities.
- Moved pin-order changes into a compact, staggered center crossover instead of funneling every conductor together beside the right connector.
- Added rounded SVG crossover corners and explicit editable Draw.io route points while preserving the automatic eight-waypoint rule.
- Moved wire labels onto the uncluttered left-hand straight section and sized the expando around the actual routed conductors.

## v1.6.18 - 2026-06-21

- Moved Draw.io wire anchors to the edge of each pin cavity so pin numbers stay visible inside the connector face.
- Applied the same cavity-edge anchor to the SVG preview so the preview and Draw.io export stay aligned.

## v1.6.17 - 2026-06-21

- Added a `Right Wire Name` field to the universal harness sheet so the right-hand endpoint label can be stored separately from the shared `Wire Name`.
- Preserved the new column through pasted table import, Excel import, generated copy tables, and sheet-to-table exports.
- Defaulted generated rows to reuse `Wire Name` in the new right-side column so older workflows still render cleanly.

## v1.6.16 - 2026-06-19

- Changed embedded Draw.io Save from downloading the editable `.drawio` source to exporting and downloading a PDF.
- Save requests Draw.io's supported SVG export, converts it locally into a landscape PDF, and names the file from the harness drawing.
- Added a clear failure status when Draw.io does not return PDF data.
- Clarified that browser security controls the physical download folder; setting the browser's download location to Desktop makes Save land there directly.

## v1.6.15 - 2026-06-19

- Changed embedded Draw.io Save into an immediate `.drawio` browser download of the edited drawing.
- Disabled Draw.io autosave callbacks so downloads happen from the operator's explicit Save action.
- Corrected reusable Micro-Fit side-lock mating faces to place the lock tab centered below the housing.
- Rotated side-lock pin-pair geometry so pin 1 is above pin 2 on two-position housings, matching the shop reference; larger even-position housings extend sideways in the same two-row orientation.
- Updated the dedicated J43 side-lock SVG and Draw.io artwork to use the same bottom-lock convention.

## v1.6.14 - 2026-06-19

- Made the uploaded production sheet the universal harness definition instead of treating cable names such as W114 or W115 as product types.
- Preserved rows that contain leg or pin data even when wire names, colors, gauges, lengths, housings, and contacts are still blank.
- Added a template-driven fallback that draws arbitrary left/right endpoint groups, pin-to-pin conductors, branch/tap labels, and a separate expando/heat-shrink bundle for each left leg.
- A blank 16-position pin-to-pin template now creates 16 editable wires labeled WIRE 1 through WIRE 16.
- Made all right-side production headers explicit (`Right Pin Pos #`, `Right Housing Type`, `Right Housing Part #`, and `Right Pin P#`) while continuing to import the older shortened labels.
- Restricted the Maestro multi-group layout to sheets with Maestro, servo-header, or ESC signal evidence so unrelated multi-leg harnesses use the universal renderer.
- Kept datasheet-aware connector faces and manufacturing validation reusable by housing family and part number, independent of the cable name.

## v1.6.13 - 2026-06-19

- Added a permanent minimum of eight editable Draw.io waypoints to every electrical wire in every drawing family.
- Straight wires receive eight evenly spaced points so bends can be added by dragging without using context-menu commands.
- Existing orthogonal corners are preserved and the remaining points are distributed across the full routed path.
- Dimension arrows and decorative lines are excluded from the waypoint rule.
- Validated the behavior on W114 split legs, generic cable drawings, and CAN trunks and branch drops.

## v1.6.12 - 2026-06-19

- Added a dedicated W114 sheet renderer that preserves two independent physical cable legs to the shared Isolator 154X header.
- Leg 1 now originates at separate solder pads TP1 and TP71, carries GND and 5V for 22 inches, and has its own expando and heat-shrink.
- Leg 2 now originates at the J43 two-position side-lock Micro-Fit connector, carries SDA and SCL for 12 inches, and has its own expando and heat-shrink.
- Corrected the authoritative table mapping to Isolator pin 1 GND, pin 2 SDA, pin 3 SCL, and pin 4 5V.
- Removed the false Micro-Fit housing from the soldered test-point leg and removed the generic/unrecognized warning from the four-position Dupont destination.
- Added crossover gaps in SVG and wire-jump styling in Draw.io so crossed conductors cannot be mistaken for splices.
- Added W114-specific wiring, parts, source, length, and build-note tables to both SVG and Draw.io exports.

## v1.6.11 - 2026-06-19

- Replaced the straight-cable fallback for branched hand sketches with a topology-aware electrical network renderer.
- Added neutral-ink route tracing that suppresses pale blue graph paper while retaining light pencil conductors.
- Added orthogonal route reconstruction that keeps turns and endpoint junctions connected without joining simple wire crossings.
- Added recognition for the power-board-to-ISO154X I2C sketch, including TP1 GND, TP71 +5V, the J43 two-position side-lock Micro-Fit connector, and the four-position Dupont header.
- Added an initial inferred pin mapping from the hand sketch; v1.6.12 supersedes it with the authoritative W114 production table.
- Applies the 22 inch dimension to the top-board power pair and the 12 inch dimension to the J43 I2C pair.
- Added board/test-point symbols, Micro-Fit latch geometry, Dupont pin-1 orientation, verification notes, compact wiring tables, and matching editable Draw.io routes.
- Limits expando and heat-shrink rendering to actual bundled route sections instead of covering an entire branched schematic.
- Improved notebook-photo orientation selection and validated both the cropped and full-page source photos.

## v1.6.10 - 2026-06-19

- Added datasheet-backed TE Connectivity CPC Series 1 support for the shell-size 17-14 reverse-sex connector pair.
- Recognizes `206043-1` as the square-flange, flush-face socket receptacle and `206044-1` as its recessed-face pin plug mate.
- Draws the exact 14-cavity arrangement and mirrors socket-face numbering from the published pin mating face.
- Added Type III+ gold contact selection for 22 AWG (`66105-3` socket / `66103-3` pin) and 16 AWG (`66101-3` socket / `66099-3` pin).
- Added `91515-1` and `91505-1` crimp tooling plus `91002-1` insertion and `305183` extraction tooling callouts.
- Added 600 V, 13 A/contact maximum, insulation diameter, key A, 15/16-20 UNEF, temperature, UL94 V-0, and non-sealed housing notes.
- Added manufacturing warnings for non-mating CPC contact sexes and invalid IP claims on the bare 17-14 housings.
- Added matching editable CPC connector faces and cavity layouts to Draw.io exports.

## v1.6.9 - 2026-06-19

- Added a reusable datasheet-backed connector library for Molex Micro-Fit 3.0, Molex Mini-Fit Jr., and Anderson Powerpole PP15/45.
- Added scalable mating-face drawings for Micro-Fit 43645 front-lock housings from 2-12 circuits and 43025 side-lock housings from 2-16 even-numbered circuits.
- Added Mini-Fit Jr. 5557 dual-row mating faces from 2-16 even-numbered circuits with 39-00-0039 and 39-00-0078 terminal/tool selection by wire gauge.
- Added color-coded Powerpole PP15/45 modular housing drawings, official 1327-series color part numbers, 1331/1332/269-series contact choices, and 1309G8 tooling.
- Added explicit manufacturing warnings for unsupported combinations, including 16 AWG Micro-Fit and 22 AWG PP15/45.
- Added compact split wiring tables for harnesses with up to 16 routed conductors and matching editable Draw.io exports.

## v1.6.8 - 2026-06-19

- Added a datasheet-aware W115 connector drawing for Molex 43645-0200 and 90143-0040 housings.
- Draws the Micro-Fit 3.0 two-circuit latch, circuit-1 identifier, and active cavities 1 and 2.
- Draws the complete C-Grid III 40-circuit 2-by-20 mating face with odd/even numbering and active cavities 8 and 10 highlighted.
- Routes TX and RX into their actual connector cavities and includes Molex series, pitch, circuit-count, orientation, and keying notes.
- Added matching editable connector bodies, cavity grids, and metadata to Draw.io exports.

## v1.6.7 - 2026-06-18

- Added automatic expandable braided sleeving (expando) around conductor bundles on every cable drawing.
- Added short heat-shrink collars that overlap and retain both ends of each sleeve while leaving connector leads visible.
- Kept wire colors, wire names, pin labels, and dimensions above the translucent braid for drawing readability.
- Added matching sleeving and heat-shrink shapes to editable Draw.io exports, including CAN trunk and branch protection.

## v1.6.6 - 2026-06-17

- Changed uploaded sketch handling from CAN-first to multi-cable-first.
- Added a generic cable / wire harness drawing path for non-CAN sketches with straight conductors, left/right connectors, verification notes, copy table rows, and Draw.io export.
- Kept the professional CAN bus template, but only when CAN-specific evidence is detected in the sketch.
- Updated the app label and documentation so DIGIWIRE is presented as a general cable reader, not a CAN-only harness generator.

## v1.6.5 - 2026-06-17

- Added Micro Maestro servo-header intelligence for board-to-Dupont harness drawings.
- Labels Maestro/Dupont rows as pin 1 GND, pin 2 V+ servo power, and pin 3 SIG based on the Pololu Micro Maestro manual.
- Normalizes pasted `Meastro`/`mistro` text to `Maestro` in generated drawings and Draw.io exports.

## v1.6.4 - 2026-06-17

- Added a compact multi-leg board harness layout for sheets like W116.
- Draws Maestro/Dupont connector faces as repeated horizontal 1-2-3 pin rows instead of one cluttered vertical connector.
- Skips repeated pasted header rows and moves compact wiring/BOM/title blocks below the drawing area so the harness stays visible.

## v1.6.3 - 2026-06-17

- Added a KiCad-style manufacturing drawing renderer for pasted/uploaded connector-to-connector cable sheets.
- Draws front-view connector faces, pin numbers, straight horizontal conductors, overall length dimension, wiring table, BOM, notes, legend, and title block.
- Added matching Draw.io export support for the KiCad-style harness drawing.

## v1.6.2 - 2026-06-17

- Added a dedicated DC barrel power cable renderer for pasted/uploaded barrel connector sheets.
- Draws wire wrap as a sleeve around GND and power conductors with heat-shrink bands at both ends.
- Draws the barrel plug as a cylindrical connector with center pin for power and outer sleeve/shell for ground, including Draw.io export support.

## v1.6.1 - 2026-06-17

- Added a Paste table button for loading copied Excel/Sheets rows without saving a file.
- Reused the sheet drawing, Draw.io, and copy-only table flow for pasted tab-delimited rows.
- Added support for the explicit right-side table headers used by barrel cable sheets.

## v1.6.0 - 2026-06-17

- Added an Upload Excel button for prefilled `.xlsx`, `.xls`, `.csv`, `.tsv`, and `.txt` harness sheets.
- Preserved uploaded sheet headers and rows in the copy-only table so they can be copied back out.
- Added a sheet-driven drawing mode and Draw.io export for uploaded table rows.

## v1.5.1 - 2026-06-15

- Removed the visible PNG button from the simple DIGIWIRE action bar.
- Changed the Draw.io action to open a popup editor and load the current editable drawing automatically.
- Updated the app cache-busting version so GitHub Pages serves the Draw.io popup flow.

## v1.5.0 - 2026-06-14

- Reworked DIGIWIRE output into a professional CAN bus harness assembly drawing with CAN-H, CAN-L, GND, four JST drops, dimensions, pinout, and 120 ohm termination.
- Added a visible PNG export button for a 4800 x 2400 drawing download.
- Added a copy-only generated harness table with the production column headers and a one-click copy button.

## v1.4.4 - 2026-06-14

- Replaced row/column span detection with contiguous ink-run tracing so scattered marks cannot become fake full-page wires.
- Updated rotation scoring to prefer the orientation with real harness-like horizontal runs and connector endpoint groups.
- Made confidence scoring stricter and stopped generic MARK detections from cluttering the schematic or Draw.io export.

## v1.4.3 - 2026-06-14

- Reworked the ink reader to use local contrast against the nearby paper instead of a global darkness threshold.
- Pruned tiny noise blobs instead of blurring the entire sheet into one blob, which restores the wire rows in the sample sketch.
- Bumped the cache-busting version so the repaired reader loads cleanly in the browser.

## v1.4.2 - 2026-06-14

- Changed the visible DIGIWIRE text/buttons to a black-on-light treatment so the interface is easier to read.
- Added a clipboard-image paste button and clipboard paste handling so copied screenshots can be loaded directly.
- Updated the visible upload hint to call out pasted screenshots alongside normal file uploads.

## v1.4.1 - 2026-06-14

- Simplified the DIGIWIRE interface to the core shop flow: upload image, read drawing, print, and edit in Draw.io.
- Hid visible reader diagnostics, source-preview panels, and extra SVG/PNG export buttons from the main app screen.
- Added a dedicated Print button that prints the generated digital electrical drawing without the upload controls.

## v1.4.0 - 2026-06-14

- Rebuilt DIGIWIRE as a separate upload-first sketch reader instead of another visible table-based harness editor.
- Added a hidden internal schematic model so users upload a drawing and receive a clean output without seeing or editing row data.
- Added four-way orientation analysis, page cropping, graph-paper suppression, ink cleanup, line extraction, connector inference, OCR-backed findings, and confidence scoring.
- Added a new DIGIWIRE interface focused on the uploaded sheet, generated schematic, reader findings, and SVG, PNG, and Draw.io export buttons.

## v1.3.0 - 2026-06-14

- Rebranded the app as DIGIWIRE across the browser UI, docs, and desktop launcher.
- Added paper-sketch upload that traces long pencil line bands into editable draft rows.
- Added OCR-backed page cropping, label readback, and confidence overlays to the sketch reader.
- Added sketch trace overlays to the preview and Draw.io export path so the converted drawing can be edited downstream.

## v1.2.96 - 2026-06-14

- Switched the preview to a sketch-first layout with notebook-style graph paper and no board grid labels.
- Pinned splice taps to a single trunk line so branch groups read more like the hand-drawn Y layout.
- Hid the edit-only fixture pin clutter in sketch mode and tightened the wire styling for cleaner routing.

## v1.2.95 - 2026-06-14

- Cleaned up the harness canvas by removing title and label boxes from the drawing/export and shrinking splice taps to simple junction markers.
- Tightened splice placement so branch points stay on the trunk instead of drifting into floating layout.

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
