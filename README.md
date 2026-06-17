# DIGIWIRE

A standalone sketch-to-schematic wiring harness reader.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v1.6.0**

## Use The App

Open the live app in a modern desktop browser, or run `DigiWire.exe` for the offline Windows version. No account is required.

DIGIWIRE is upload-first: drop in a photo or scan of the CAN bus wire-harness sketch and it builds a clean professional CAN harness drawing. The row data is kept copy-only so the operator can paste it into a build sheet without editing spreadsheet cells inside this app.

The user-facing flow is intentionally simple: upload an image, paste a copied screenshot, or upload a prefilled Excel/CSV/TSV sheet, then generate the clean electrical drawing, print, open the editable drawing in Draw.io, or copy the generated table rows.

## Features

- Reads sideways, upside-down, and normal uploads by trying all four page orientations.
- Finds page edges, crops the sheet, suppresses graph-paper blue, and isolates pencil/pen ink.
- Accepts pasted clipboard images as well as file uploads and drag-and-drop.
- Accepts prefilled `.xlsx`, `.xls`, `.csv`, `.tsv`, and `.txt` harness sheets through the Upload Excel button.
- Preserves uploaded sheet headers and rows in the copy-only table.
- Generates a simple sheet-driven harness drawing from meaningful rows in an uploaded sheet.
- Renders the CAN-H, CAN-L, and GND trunk as yellow, green, and black 22 AWG conductors.
- Draws four 4-pin JST branch drops with 12 inch first-branch spacing, 2 inch branch spacing, and 6 inch drops.
- Marks JST pin 1 as `PWR(NC)` without drawing a power wire.
- Draws a 120 ohm termination between CAN-H and CAN-L only.
- Includes a copy-only harness table using the production column order.
- Reads handwritten labels, dimensions, connector names, and markup text with OCR when available.
- Classifies arrows and dimension notes as schematic callouts where possible.
- Converts sketch geometry into an internal hidden electrical model.
- Renders a clean digital schematic with connector labels, branch dimensions, a resistor symbol, and a JST pinout box.
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
