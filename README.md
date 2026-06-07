# Wiring Harness Designer

An open-source, browser-based wiring harness diagram editor.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v1.2.40**

## Use The App

Open the live app in a modern desktop browser. No installation or account is required.

Harness edits are stored locally in the browser. The app can print the current harness drawing for production review.

Data saved by the former Windows desktop version does not automatically move to the website because browsers keep storage separate for each address.

## Features

- Live harness drawing driven by editable wiring rows.
- All active wire names displayed directly on their routed wire lines.
- Heatshrink-style endpoint labels for left/right leg names and connector housing details.
- Excel-style production table with wire name, numbered left/right legs, left/right leg names, pin positions, DNP, housing type, housing part number, terminal pin part number, AWG, color, length, branch, tool, and comments.
- Resizable wiring-table columns that stay saved in the browser.
- Parent-and-branch window splices with shared splice IDs.
- Vertically stacked left and right connector legs.
- Illustrated Powerpole, SubConn, Molex, Dupont, PCB, barrel connection, ring terminal, and splice housings.
- DNP filtering that removes unused wires, contacts, pins, and connector housings from the drawing.
- Pasted Excel/CSV/TSV row import, including separate housing type, housing part, and terminal pin part fields.
- CSV, SVG drawing, printable guide, and browser print exports.
- Local browser storage and no server-side project database.
- Continuous electrical checks for duplicate endpoints, housing conflicts, pin capacity, incomplete splices, and missing wire details.
- Editable connector and terminal catalog with manufacturer, part number, gender, terminal, seal, notes, and image metadata.
- Automatic wire-material totals, purchasing allowance, component BOM, and grouped wire cut list.

## Run Locally

The web app has no build step. Open `index.html` directly or serve the folder with any static web server.

The application source is:

- `index.html`: user interface.
- `styles.css`: layout, appearance, responsive behavior, and print styles.
- `app.js`: harness data model, editor behavior, drawing logic, imports, and exports.

The older optional Windows launcher remains in `desktop/` and can be rebuilt with `Build EXE.cmd`, but the GitHub Pages website is the primary version.

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
