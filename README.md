# DIGIWIRE

A streamlined Excel-to-Draw.io wiring harness converter and editor.

**Live app:** https://darnell-ai.github.io/wiring-harness-designer/

Current release: **v2.5.6**

DigiWire 2.5.6 adds table-import undo. Use **Undo table** after a mistaken paste or file import to restore the complete diagram from immediately before that import; repeat it to step backward through earlier tables.

Connector housings are resolved from the left/right housing part-number columns before descriptive housing text. Known Molex and TE part-number families select their matching connector-face profile. An unknown part number is shown as an explicit unverified profile with an exact DigiKey lookup link instead of being guessed from a label such as `3 POS FRONT LOCK`.

The approved W323 regression fixture is stored at `examples/W323-approved.csv`, with generated SVG, PNG, and editable Draw.io outputs under `examples/generated/`. It verifies separate one-position GND/PWR ferrule housings, one eight-position BOT BLOX Ethernet housing, TP1/TP2 routing, and the DPBOF13F 13-pin SUBCON face.

## Use The App

Open the live app in a modern desktop browser, or run `DigiWire.exe` for the offline Windows version. No account is required.

DIGIWIRE is table-first: paste copied harness rows and it builds a clean professional electrical drawing directly inside a full embedded Draw.io editor.

The daily workflow is intentionally simple: copy the harness rows, click Paste table, and edit the generated harness immediately in Draw.io without opening a popup or switching tools. Click Save in Draw.io to download the edited drawing as a PDF, then use Clear for the next harness. Paste image and Ctrl+V remain available for automatic sketch reading.

## Master Block Diagram Mode

Select **Master block** in the Drawing mode control. Paste or add as many board-placement and harness sheets as needed; new imports accumulate instead of replacing the drawing. Excel workbooks may contain multiple sheets, and multiple Excel/CSV/TSV files can be selected together.

Each successfully pasted or uploaded sheet creates an undo step. Click **Undo table**, or press Ctrl+Z while focus is outside an editing field, to remove the latest import and restore replaced boards, connectors, and cable records exactly as they were. Up to 50 import steps are retained during the current session.

| PCB NAME | ARRANGEMENT | LEFT SIDE | TOP SIDE | RIGHT SIDE | BOTTOM | CORNER LEFT AND TOP | CORNER TOP AND RIGHT | CORNER RIGHT AND BOTTOM | CORNER BOTTEM AND LEFT | CENTER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BATTERY | MIDDLE | J48, J38 | J46, J28 | | J50, J49 | | CPC3 | CPC2 | CPC1 | POWER POLE |
| ESC | BOTTEM | J2, J14 | J8 | J13, J19 | J12, J11 | | | | | ESC SH, ESC SV, ESC PV, ESC PH |

`BOTTEM` is accepted exactly as shown in the production template, along with `BOTTOM` and `BOTTOM SIDE`. Separate multiple connector names with semicolons, vertical bars, or line breaks. A PCB name can appear once above several placement rows because DigiWire carries it forward.

`ARRANGEMENT` controls the position of the whole PCB block and accepts `MIDDLE`, `TOP`, `LEFT`, `RIGHT`, and `BOTTEM`. `ORIENTATION` is also accepted, and the older misspelled `ORANGMENT` remains supported for existing sheets. If the column is absent, DigiWire keeps using its automatic connection-topology layout.

All PCB bodies use the same spacious 560-by-560 square footprint so boards with fewer connectors do not look compressed or visually less important. At least 300 pixels of clear vertical corridor and 500 pixels of clear horizontal corridor separate the compass-positioned boards for readable wire routing. Connector positions continue to follow their requested sides, corners, and center locations.

The four corner columns position connectors directly on the corresponding PCB corner. Connector names `CPC1`, `CPC2`, `CPC3`, and other `CPC` plus number names render as distinct 16-position circular connectors. The same CPC may be referenced by several cable sheets, or by one cable with several right-leg numbers, to create a shared branch to multiple destination connectors without duplicating the CPC.

`CENTER` and `CENTRE` place connectors inside the PCB body. Four center connectors use a spacious 2-by-2 grid; larger groups expand into additional centered rows. `POWER POLE` and `POWERPOLE` render as a distinct red-and-black connector profile. Board-prefixed names such as `BATTERY POWER POLE` and `ESC SH` remain intact when a harness endpoint uses that same combined name.

Harness sheets continue to use the normal DigiWire columns. Master mode reduces each cable to its endpoint names and conductor count, then matches the board first and its connector second: `BATTERY J49` maps to `J49` on `BATTERY BOARD`, while `SENS J1` can never fall through to an identically named connector on `HB`. If the named PCB exists but the connector is missing from its placement row, DigiWire uses the explicit wire-leg name to add that connector normally on the correct PCB. DNP/unused rows do not count as conductors. Missing board assignments and genuinely ambiguous connector-only names remain visible as red unmatched endpoints and warning badges.

Use `FLOATING` as a left or right leg name when that end intentionally does not terminate at a connector. DigiWire draws a short free wire tail with an insulated `CAP`, and does not create an unmatched-connector warning for that endpoint.

Master cable routes leave every connector on a straight stub before turning into a spaced routing lane. Opaque bordered labels and thinner cable paths keep connector names and nearby wires readable.

## Length Units

The `Length (in or ft)` column accepts both inches and feet. Enter an explicit unit whenever the cable is measured in feet:

- `15 FT`, `15 ft`, or `15 feet` displays as `15.00 ft`.
- `180 IN`, `180 in`, or `180 inches` displays as `180.00 in`.
- A number without a unit, such as `9`, continues to default to inches for compatibility with existing sheets.

The existing `Length inches` header remains supported, and it can still contain an explicit feet value such as `15 FT`. Tap positions accept the same formats.

## Define Twisted Pairs

Add a `Twisted Pair ID` column anywhere in the sheet. Enter the same ID on exactly two conductor rows and leave the column blank for ordinary wires. Keep the two paired rows next to each other when practical so the drawing stays easy to read.

| Wire Name | Left Pin Pos # | Right Pin Pos # | Color | Twisted Pair ID |
| --- | ---: | ---: | --- | --- |
| S_Horz A | 1 | 1 | BLUE | TP1 |
| S_Horz B | 2 | 2 | WHITE | TP1 |
| S_Horz C | 3 | 3 | GREEN | |

DIGIWIRE draws valid pairs as crossing, intertwined conductors in both the preview and editable Draw.io file. An ID used on fewer or more than two rows produces a template note instead of a false twisted-pair drawing. The crossings are schematic; put the required manufacturing lay or twist rate in `Comments`, for example `TWIST 1 TURN PER INCH`.

## Features

- Reads sideways, upside-down, and normal uploads by trying all four page orientations.
- Finds page edges, crops the sheet, suppresses graph-paper blue, and isolates pencil/pen ink.
- Accepts pasted clipboard images as well as image drag-and-drop directly on the drawing area.
- Loads tab-delimited rows copied from Excel, Google Sheets, or a text table immediately when Paste table is clicked.
- Builds cumulative editable master block diagrams from repeated board-placement and harness-sheet imports.
- Recovers headerless DIGIWIRE rows, skips repeated header rows, tolerates notes above the header, and realigns common one-column paste shifts while reporting each repair.
- Treats an explicitly pasted header as authoritative and only pads missing trailing cells, preventing short Excel rows from being shifted into the wrong harness fields.
- Provides a connector editor for left and right endpoint labels, connector families, 1-64 positions, front/rear view, plug/receptacle sex, and key orientation.
- Detects simple, multi-leg, large circular, and twisted-pair layouts automatically, with a Configure control for manually choosing the drawing style.
- Treats the first `Wire Name` column as the left-side name and a second `Wire Name` column as the right-side name, while also accepting explicit `Left Wire Name` and `Right Wire Name` headers.
- Shows separate left and right conductor labels in Draw.io when motherboard or connector net names differ; matching names remain a single clean label.
- Treats the production sheet as the universal harness definition: cable names are drawing titles, while legs, endpoint names, pins, housings, branches, taps, colors, gauges, and lengths drive the electrical layout.
- Accepts inch and foot length values throughout the sheet and preserves the entered unit on wire labels, dimensions, tables, and editable Draw.io exports; unitless values default to inches.
- Keeps pin-defined placeholder rows drawable even when wire names and manufacturing details are still blank; a blank 16-position pin-to-pin template produces 16 editable conductors ready for design work.
- Treats `Not in use` (along with DNP/no-wire equivalents) as a physical connector-position placeholder: the cavity remains in the connector face and position count, but no conductor, terminal, right-side leg, or contact is generated.
- Treats `DNP` in either `Left Leg Name` or `Right Leg Name` as a no-wire row, so placeholder rows never inflate routed-conductor totals or create gray wires.
- Accepts `Pin Pos`, `Pin Position`, `Pin Position Number`, and equivalent left/right header variants without losing pin assignments.
- Uses the `Color` column for the rendered conductor; a recognized right-side RJ45 wire name is only a fallback when the physical color is blank.
- Draws complete eight-pin color mappings as a standard T568B 8P8C face and omits redundant `TWISTED PAIR` text while preserving the intertwined geometry.
- Preserves submitted twisted-pair IDs exactly and warns when a stated T568B termination does not pair pins 1-2, 3-6, 4-5, and 7-8.
- Places the two members of each valid submitted pair on adjacent drawing lanes, eliminating long diagonal pair crossovers without renumbering connector pins.
- Resolves `900-2181120802-ND` as the eight-circuit, single-row Molex PicoBlade 218112-0802 pigtail and `A116128-ND` as TE 2213145-1 Pivot Power RJ45, with part-specific connector faces and compatibility diagnostics.
- Draws Subcon/PBOF connector names as circular mating faces and identifies unused pin positions separately from the active conductors.
- Draws 13-pin PBOF mating faces in the physical 3-4-4-2 cavity arrangement and ignores out-of-housing DNP rows above the declared 13-position capacity.
- Recognizes RJ45 endpoints as eight-position T568B top views, showing all eight contact colors while highlighting the populated pins.
- Automatically twists the orange/white-orange and green/white-green Ethernet pairs as TP1 and TP2 when an RJ45 endpoint is present, even if the pair IDs were left blank.
- Renders two-color wire descriptions in order as striped conductors; for example, `green / white` is a green wire with a repeating white tracer stripe, while `orange / white` is orange with a white tracer.
- Accepts a `Twisted Pair ID` column and renders every valid two-row pair as editable intertwined conductors in SVG and Draw.io, with validation notes for incomplete or overfilled pair IDs.
- Gives large multi-leg circular harnesses a dedicated full-page drawing: all conductors remain visible, each 16-pin Subcon/CPC mating face is drawn, and documentation tables are omitted to maximize routing space.
- Keeps all newly generated Draw.io harnesses drawing-only by omitting wiring tables, bills of materials, datasheet-parts/crimp-tool panels, and split-harness parts blocks.
- Keeps every declared position in grouped right-side housings; an 8-pin front-lock connector with four active wires displays unused filler cavities for pins 5 through 8.
- Groups arbitrary left and right leg IDs into separate endpoints and applies independent expando and heat-shrink bundles without requiring a cable-name-specific renderer.
- Keeps generic template drawings readable with larger single-row endpoint boxes, separated expando labels, template notes, and a title block.
- Draws actual-build shared sleeves when multiple left connectors feed one right connector, including sleeve ID labels, heat-shrink exits, exposed lead callouts, and pin-to-pin length callouts.
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
- Recognizes DigiKey `WM1927-ND` as Molex Mini-Fit Sr. `42816-0212`, draws its black 10 mm-pitch housing with vertically stacked square cavities, top latch, guide ribs, and TPA, and supports separate mating-face and rear wire-entry views.
- Recognizes `WM11904TR-ND` as the matching Mini-Fit Sr. `42815-0114` silver female socket for 10-12 AWG wire instead of applying Micro-Fit gauge warnings.
- Recognizes Molex Mini-Fit Jr. 5557 dual-row housings from 2 through 16 even-numbered circuits, including the dedicated 16 AWG and 24-18 AWG female terminal/tool selections.
- Recognizes Anderson Powerpole PP15/45 modular assemblies through 16 poles, colors each housing from the wire color, and lists the related housing, contact, and crimp-tool part numbers.
- Recognizes the TE Connectivity CPC Series 1 shell-size 17-14 reverse-sex pair: `206043-1` square-flange socket receptacle and mating `206044-1` pin plug.
- Draws the exact 14-cavity circular arrangement with the socket mating face mirrored from TE's published pin-face numbering, plus keyed/threaded housing details and mounting flange.
- Selects active Type III+ gold contacts and tooling for 22 AWG (`66105-3` socket / `66103-3` pin) and 16 AWG (`66101-3` socket / `66099-3` pin), including insulation-diameter limits.
- Warns when CPC contact sexes will not mate or when the non-sealed bare 17-14 housings are treated as IP rated.
- Validates wire gauge against official contact ranges. Unsupported combinations such as 16 AWG Micro-Fit or 22 AWG PP15/45 are shown as red manufacturing warnings instead of being assigned an unsafe crimp contact.
- Recognizes DC barrel power cable sheets and draws the barrel plug, center pin, outer sleeve/shell, heat-shrink ends, and wire-wrap sleeve around the conductors.
- Recognizes straight connector-to-connector cable sheets and renders KiCad-style manufacturing drawings with connector face views, pin numbers, wire labels, and a clean drawing-only layout.
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
- `master-diagram.js`: cumulative board/cable project model, connector matching, layout, and Draw.io export.
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
