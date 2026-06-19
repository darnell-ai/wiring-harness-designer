# DIGIWIRE

A standalone sketch-to-schematic wiring harness reader.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v1.6.12**

## Use The App

Open the live app in a modern desktop browser, or run `DigiWire.exe` for the offline Windows version. No account is required.

DIGIWIRE is upload-first: drop in a photo, scan, pasted screenshot, Excel sheet, or copied table for a cable or wire harness and it builds a clean professional electrical drawing. The row data is kept copy-only so the operator can paste it into a build sheet without editing spreadsheet cells inside this app.

The user-facing flow is intentionally simple: upload an image, paste a copied screenshot, upload a prefilled Excel/CSV/TSV sheet, or paste copied table rows, then generate the clean electrical drawing, print, open the editable drawing in Draw.io, or copy the generated table rows.

## Features

- Reads sideways, upside-down, and normal uploads by trying all four page orientations.
- Finds page edges, crops the sheet, suppresses graph-paper blue, and isolates pencil/pen ink.
- Accepts pasted clipboard images as well as file uploads and drag-and-drop.
- Accepts prefilled `.xlsx`, `.xls`, `.csv`, `.tsv`, and `.txt` harness sheets through the Upload Excel button.
- Accepts pasted tab-delimited rows copied from Excel, Google Sheets, or a text table through the Paste table button.
- Preserves uploaded sheet headers and rows in the copy-only table.
- Generates a general cable drawing from uploaded sketches instead of assuming every image is a CAN harness.
- Preserves branched hand-drawn electrical topology instead of flattening every sketch into a left-to-right cable.
- Distinguishes orthogonal turns and T-junctions from unconnected wire crossings, and keeps segment dimensions with the applicable source pair.
- Recognizes the power-board/I2C sketch pattern with TP1 GND, TP71 +5V, a two-position side-lock Micro-Fit J43 connector, and an ISO154X four-position Dupont header.
- Uses the W114 production pinout for both photo and table imports: TP1 GND to pin 1, J43 pin 1 SDA to pin 2, J43 pin 2 SCL to pin 3, and TP71 5V to pin 4.
- Uses board/test-point symbols and actual connector-face layouts for sketch networks, with compact verification tables and matching editable Draw.io waypoints.
- Applies expando and heat-shrink only to the bundled portions of branched sketch routes, leaving breakouts and crossed nets readable.
- Recognizes W114 production tables as two separate physical cable legs to one Isolator 154X header instead of one four-conductor cable.
- Draws the 22 inch TP1/TP71 soldered test-point leg separately from the 12 inch J43 two-position side-lock Micro-Fit leg, with independent expando and heat-shrink.
- Uses the authoritative W114 table pinout: Isolator pin 1 GND, pin 2 SDA, pin 3 SCL, and pin 4 5V.
- Uses the CAN bus template only when the sketch has CAN-specific evidence such as CAN-H/CAN-L, USB-CAN, JST branch notes, or 120 ohm termination.
- Generates a simple sheet-driven harness drawing from meaningful rows in an uploaded sheet.
- Automatically draws expandable braided sleeving around conductor bundles with heat-shrink collars at both ends on every cable drawing and Draw.io export.
- Recognizes W115-style Molex connector pairs and draws the actual 43645-0200 Micro-Fit 3.0 two-circuit mating face plus the complete 90143-0040 C-Grid III 2-by-20 cavity grid, with connected cavities highlighted.
- Recognizes Molex Micro-Fit 3.0 front-lock 43645 housings from 2 through 12 circuits and side-lock 43025 housings from 2 through 16 even-numbered circuits.
- Recognizes Molex Mini-Fit Jr. 5557 dual-row housings from 2 through 16 even-numbered circuits, including the dedicated 16 AWG and 24-18 AWG female terminal/tool selections.
- Recognizes Anderson Powerpole PP15/45 modular assemblies through 16 poles, colors each housing from the wire color, and lists the related housing, contact, and crimp-tool part numbers.
- Recognizes the TE Connectivity CPC Series 1 shell-size 17-14 reverse-sex pair: `206043-1` square-flange socket receptacle and mating `206044-1` pin plug.
- Draws the exact 14-cavity circular arrangement with the socket mating face mirrored from TE's published pin-face numbering, plus keyed/threaded housing details and mounting flange.
- Selects active Type III+ gold contacts and tooling for 22 AWG (`66105-3` socket / `66103-3` pin) and 16 AWG (`66101-3` socket / `66099-3` pin), including insulation-diameter limits.
- Warns when CPC contact sexes will not mate or when the non-sealed bare 17-14 housings are treated as IP rated.
- Validates wire gauge against official contact ranges. Unsupported combinations such as 16 AWG Micro-Fit or 22 AWG PP15/45 are shown as red manufacturing warnings instead of being assigned an unsafe crimp contact.
- Recognizes DC barrel power cable sheets and draws the barrel plug, center pin, outer sleeve/shell, heat-shrink ends, and wire-wrap sleeve around the conductors.
- Recognizes straight connector-to-connector cable sheets and renders KiCad-style manufacturing drawings with connector face views, pin numbers, wire labels, wiring table, BOM, notes, and title block.
- Recognizes multi-leg board-to-Dupont sheets and draws compact board harnesses with horizontal 1-2-3 Maestro/Dupont pin rows.
- Applies Micro Maestro servo-header roles so Maestro/Dupont drawings label pin 1 as GND, pin 2 as V+ servo power, and pin 3 as SIG.
- Supports the original CAN bus sketch style with CAN-H, CAN-L, GND, JST drops, no-connect PWR pins, and 120 ohm termination when detected.
- Includes a copy-only harness table using the production column order.
- Reads handwritten labels, dimensions, connector names, and markup text with OCR when available.
- Classifies arrows and dimension notes as schematic callouts where possible.
- Converts sketch geometry into an internal hidden electrical model.
- Renders a clean digital schematic with connector labels, conductor labels, dimensions, notes, and the matching cable-specific drawing style.
- Keeps reader diagnostics behind the scenes so the screen stays simple.
- Prints the generated digital electrical drawing.
- Opens a Draw.io popup and loads the editable diagram for follow-up editing.
- Runs as static browser files with no server-side project database.

## Run Locally

The web app has no build step. Open `index.html` directly or serve the folder with any static web server.

The application source is:

- `index.html`: user interface.
- `styles.css`: layout, appearance, responsive behavior, and schematic styles.
- `app.js`: sketch reader, OCR pipeline, hidden model builder, schematic renderer, and exports.

The optional Windows launcher remains in `desktop/` and can be rebuilt with `Build EXE.cmd`.

## GitHub Pages

Pushes to `main` automatically deploy the browser app through `.github/workflows/pages.yml`.

For a new repository, an administrator must select **GitHub Actions** as the Pages source once under:

`Settings > Pages > Build and deployment > Source`

The expected project URL is:

https://darnell-ai.github.io/wiring-harness-designer/

## Contributing

Issues and pull requests are welcome. See `CONTRIBUTING.md` for the basic workflow.

## License

Released under the MIT License. See `LICENSE`.
