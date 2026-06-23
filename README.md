# DIGIWIRE

A streamlined Excel-to-Draw.io wiring harness converter and editor.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v2.0.4**

## Use The App

Open the live app in a modern desktop browser, or run `DigiWire.exe` for the offline Windows version. No account is required.

DIGIWIRE is table-first: paste copied harness rows and it builds a clean professional electrical drawing directly inside a full embedded Draw.io editor.

The daily workflow is intentionally simple: copy the harness rows, click Paste table, and edit the generated harness immediately in Draw.io without opening a popup or switching tools. Click Save in Draw.io to download the edited drawing as a PDF, then use Clear for the next harness. Paste image and Ctrl+V remain available for automatic sketch reading.

## Features

- Reads sideways, upside-down, and normal uploads by trying all four page orientations.
- Finds page edges, crops the sheet, suppresses graph-paper blue, and isolates pencil/pen ink.
- Accepts pasted clipboard images as well as image drag-and-drop directly on the drawing area.
- Loads tab-delimited rows copied from Excel, Google Sheets, or a text table immediately when Paste table is clicked.
- Treats the first `Wire Name` column as the left-side name and a second `Wire Name` column as the right-side name, while also accepting explicit `Left Wire Name` and `Right Wire Name` headers.
- Shows separate left and right conductor labels in Draw.io when motherboard or connector net names differ; matching names remain a single clean label.
- Treats the production sheet as the universal harness definition: cable names are drawing titles, while legs, endpoint names, pins, housings, branches, taps, colors, gauges, and lengths drive the electrical layout.
- Keeps pin-defined placeholder rows drawable even when wire names and manufacturing details are still blank; a blank 16-position pin-to-pin template produces 16 editable conductors ready for design work.
- Groups arbitrary left and right leg IDs into separate endpoints and applies independent expando and heat-shrink bundles without requiring a cable-name-specific renderer.
- Generates a general cable drawing from uploaded sketches instead of assuming every image is a CAN harness.
- Preserves branched hand-drawn electrical topology instead of flattening every sketch into a left-to-right cable.
- Distinguishes orthogonal turns and T-junctions from unconnected wire crossings, and keeps segment dimensions with the applicable source pair.
- Recognizes the power-board/I2C sketch pattern with TP1 GND, TP71 +5V, a two-position side-lock Micro-Fit J43 connector, and an ISO154X four-position Dupont header.
- Recognizes the TP1/TP71/J43-to-ISO154X topology from its endpoint and pin data, regardless of the cable name.
- Uses board/test-point symbols and actual connector-face layouts for sketch networks, with compact verification tables and matching editable Draw.io waypoints.
- Applies expando and heat-shrink only to the bundled portions of branched sketch routes, leaving breakouts and crossed nets readable.
- Recognizes that production topology as two separate physical cable legs to one Isolator 154X header instead of one four-conductor cable.
- Draws the 22 inch TP1/TP71 soldered test-point leg separately from the 12 inch J43 two-position side-lock Micro-Fit leg, with independent expando and heat-shrink.
- Uses the table-defined Isolator pinout: pin 1 GND, pin 2 SDA, pin 3 SCL, and pin 4 5V.
- Uses the CAN bus template only when the sketch has CAN-specific evidence such as CAN-H/CAN-L, USB-CAN, JST branch notes, or 120 ohm termination.
- Generates a simple sheet-driven harness drawing from meaningful rows in an uploaded sheet.
- Starts Draw.io wire connections from the edge of the pin cavity instead of the cavity center so pin numbers stay readable.
- Automatically draws expandable braided sleeving around conductor bundles with heat-shrink collars at both ends on every cable drawing and Draw.io export.
- Recognizes the 43645-0200 to 90143-0040 Molex connector pair from its housing data and draws the actual Micro-Fit 3.0 two-circuit mating face plus the complete C-Grid III 2-by-20 cavity grid, with connected cavities highlighted.
- Recognizes Molex Micro-Fit 3.0 front-lock 43645 housings from 2 through 12 circuits and side-lock 43025 housings from 2 through 16 even-numbered circuits.
- Draws side-lock Micro-Fit mating faces with pin 1 above pin 2 and the lock tab centered below the housing; larger even-position housings extend sideways in the same two-row orientation.
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
- Reads handwritten labels, dimensions, connector names, and markup text with OCR when available.
- Classifies arrows and dimension notes as schematic callouts where possible.
- Converts sketch geometry into an internal hidden electrical model.
- Populates a persistent embedded Draw.io workspace with connector labels, conductor labels, dimensions, notes, and the matching cable-specific drawing style.
- Keeps reader diagnostics behind the scenes so the screen stays simple.
- Uses Draw.io as the only visible drawing workspace; no separate DIGIWIRE preview or editor popup is required.
- Automatically replaces the Draw.io canvas whenever a new table or image is converted.
- Makes Save produce a screenshot-faithful PDF of the edited Draw.io page, forcing the light drawing palette and including the Draw.io grid so the downloaded file matches the editing canvas.
- Adds at least eight evenly distributed editable Draw.io waypoints to every electrical wire, including straight runs, while preserving existing routed corners.
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
