# DIGIWIRE

A standalone sketch-to-schematic wiring harness reader.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v1.4.4**

## Use The App

Open the live app in a modern desktop browser, or run `DigiWire.exe` for the offline Windows version. No account is required.

DIGIWIRE is upload-first: drop in a photo or scan of a paper wire-harness sketch and it builds a clean digital schematic. The recognition model is kept behind the scenes so the operator does not have to edit a spreadsheet-style table.

The user-facing flow is intentionally simple: upload an image, paste a copied screenshot, let DIGIWIRE interpret it, print the clean electrical drawing, or export a Draw.io file for Google Drive / diagrams.net editing.

## Features

- Reads sideways, upside-down, and normal uploads by trying all four page orientations.
- Finds page edges, crops the sheet, suppresses graph-paper blue, and isolates pencil/pen ink.
- Accepts pasted clipboard images as well as file uploads and drag-and-drop.
- Detects long horizontal and vertical conductors from hand-drawn wire lines.
- Infers connector groups from repeated wire endpoints instead of asking the user for a table.
- Reads handwritten labels, dimensions, connector names, and markup text with OCR when available.
- Classifies arrows and dimension notes as schematic callouts where possible.
- Converts sketch geometry into an internal hidden electrical model.
- Renders a clean digital schematic with connectors, pins, junction dots, wire routes, labels, and confidence metadata.
- Keeps reader diagnostics behind the scenes so the screen stays simple.
- Prints the generated digital electrical drawing.
- Exports editable Draw.io `.drawio` files for follow-up editing.
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
