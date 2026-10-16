"use strict";

(function exposeConnectorVisuals(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DigiWireConnectors = api;
})(typeof globalThis === "object" ? globalThis : this, function createConnectorVisuals() {
  const MOLEX = "https://www.molex.com/en-us/products/connectors/wire-to-board-connectors/";
  const profiles = Object.freeze({
    auto: { label: "Sheet connector", shape: "rectangular", note: "Resolved from the housing part number and type." },
    powerpole1545: { label: "Anderson Powerpole PP15/45", shape: "powerpole", photo: "powerpole-red.jpg", source: "https://www.andersonpower.com/product/powerpole-connector-housing-red/", note: "Genderless single-pole housing. Housing color follows its part number." },
    microFitFront: { label: "Molex Micro-Fit · single row", shape: "rectangular", rows: 1, photo: "microfit.jpg", source: MOLEX + "micro-fit-connectors", note: "43645 single-row family illustration; manufacturer photo shows the related 43025 housing." },
    microFitSide: { label: "Molex Micro-Fit · dual row", shape: "rectangular", rows: 2, photo: "microfit.jpg", source: MOLEX + "micro-fit-connectors", note: "43025 dual-row family. Circuit count follows the table." },
    miniFitSr: { label: "Molex Mini-Fit Sr.", shape: "rectangular", rows: 1, photo: "minifit-sr.jpg", source: MOLEX + "mini-fit-sr-connectors", note: "Large polarized power housing. Reference photograph: 42816-0612." },
    miniFitJr: { label: "Molex Mini-Fit Jr.", shape: "rectangular", rows: 2, photo: "minifit-jr.jpg", source: MOLEX + "mini-fit-connectors", note: "Dual-row polarized housing with latch. Reference photograph: 46992-0610; illustration uses the selected circuit count." },
    cpc: { label: "TE CPC circular", shape: "circular", photo: "cpc-reference.jpg", source: "https://www.te.com/en/product-213893-1.html", note: "Keyed circular housing. Reference photo is TE 213893-1; exact insert layout depends on the submitted part." },
    teCpc1714: { label: "TE CPC 17-14", shape: "circular", photo: "cpc-reference.jpg", source: "https://www.te.com/en/product-206043-1.html", note: "17-14 family. Use the part drawing for contact orientation and numbering." },
    subcon: { label: "Subcon / PBOF", shape: "circular", source: "https://www.te.com/en/products/connectors/circular-connectors.html", note: "Circular family illustration; a part number is required for a specific insert arrangement." },
    customCircular: { label: "Circular connector", shape: "circular", photo: "cpc-reference.jpg", source: "https://www.te.com/en/product-213893-1.html", note: "Generic keyed face; circles show count, not a physical pinout. The photo is a 10-position TE CPC reference, not identification of your unspecified connector." },
    customRectangular: { label: "Rectangular connector", shape: "rectangular", rows: 2, note: "Custom housing illustration. Verify the physical face against the part drawing." },
    terminalBlock: { label: "Terminal block", shape: "terminal", source: "https://www.phoenixcontact.com/en-us/products/pcb-terminal-blocks-and-pcb-connectors", note: "Generic screw-terminal family illustration. Verify the exact body and position count against the part drawing." },
    pcb: { label: "PCB termination", shape: "pcb", note: "Generic board pads/header illustration; not an assumed physical board layout." },
    rj45: { label: "RJ45 · 8P8C", shape: "rj45", note: "Eight contact modular interface, shown from the mating end." },
    tePivotPowerRj45: { label: "TE Pivot Power RJ45", shape: "rj45", source: "https://www.te.com/en/product-2213145-1.html", note: "Power variant: eight positions are internally grouped into two conductors." },
    picoBladePigtail: { label: "Molex PicoBlade", shape: "rectangular", rows: 1, photo: "picoblade.webp", source: MOLEX + "picoblade-connectors", note: "Small single-row housing with latch ribs. Photo shows the PicoBlade family." },
    ferrule: { label: "Wire ferrule", shape: "ferrule", note: "Insulated collar and metal wire-end sleeve." }
  });
  const escape = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const normalize = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  function resolve(rows, side, explicitFamily = "auto", explicitPositions = 0) {
    const prefix = side === "left" ? "left" : "right";
    const part = rows.find((row) => row[`${prefix}HousingPart`])?.[`${prefix}HousingPart`] || "";
    const partText = normalize(part);
    const text = normalize(rows.map((row) => [row[`${prefix}LegName`], row[`${prefix}HousingType`]].join(" ")).join(" "));
    let key = explicitFamily;
    if (!profiles[key] || key === "auto") {
      if (/1327/.test(partText) || /POWERPOLE|ANDERSON/.test(text)) key = "powerpole1545";
      else if (/218112/.test(partText) || /PICOBLADE/.test(text)) key = "picoBladePigtail";
      else if (/2213145|A116128/.test(partText)) key = "tePivotPowerRj45";
      else if (/42816|WM1927/.test(partText) || /MINIFITSR/.test(text)) key = "miniFitSr";
      else if (/3901|5557/.test(partText) || /MINIFITJR/.test(text)) key = "miniFitJr";
      else if (/43645|WM1845/.test(partText)) key = "microFitFront";
      else if (/43025/.test(partText)) key = "microFitSide";
      else if (/206043|206044/.test(partText)) key = "teCpc1714";
      else if (/CPC/.test(text)) key = "cpc";
      else if (/SUBCON|PBOF/.test(text)) key = "subcon";
      else if (/CIRC|CIRCU|CURCU|CIRCI/.test(text)) key = "customCircular";
      else if (/RJ45/.test(text)) key = "rj45";
      else if (/FERRULE|FURREL/.test(text)) key = "ferrule";
      else if (/TERMINALBLOCK/.test(text)) key = "terminalBlock";
      else if (/PCB/.test(text)) key = "pcb";
      else if (/SIDELOCK/.test(text)) key = "microFitSide";
      else if (/FRONTLOCK/.test(text)) key = "microFitFront";
      else key = "customRectangular";
    }
    const declared = rows.flatMap((row) => [...String([row[`${prefix}LegName`], row[`${prefix}HousingType`]].join(" ")).matchAll(/\b(\d{1,2})\s*(?:PIN|POS|POSITION|CIRC)/gi)].map((match) => Number(match[1])));
    const used = rows.map((row) => Number(String(row[`${prefix}PinPos`] || "").match(/\d+/)?.[0]) || 0);
    const positions = Math.min(64, Math.max(1, explicitPositions || Math.max(0, ...declared) || Math.max(0, ...used)));
    const colorParts = { "1327G6": "#24282e", "1327G7": "#f1f2ef", "1327G8": "#1977b9", "1327G5": "#218153", "1327G16": "#f0cd28", "1327G17": "#ed8a22", "1327G18": "#929ca5" };
    const colorKey = Object.keys(colorParts).sort((a,b) => b.length-a.length).find((number) => partText.includes(number));
    const housingColor = key === "powerpole1545" ? colorParts[colorKey] || (/1327(?:BK|ND|$)/.test(partText) ? "#c83235" : "#d9dfe3") : undefined;
    return { ...profiles[key], key, positions: key === "powerpole1545" ? 1 : positions, part, housingColor, photo: key === "powerpole1545" && colorKey === "1327G7" ? "powerpole-white.jpg" : profiles[key].photo };
  }

  function svg(profile, width = 220, height = 140) {
    const count = Math.max(1, Math.min(64, profile.positions || 2));
    let body = "";
    if (profile.shape === "powerpole") {
      const color = profile.housingColor || "#c83235";
      body = `<path d="M62 35 89 19h64l25 19v70l-26 17H86l-24-17Z" fill="${color}" stroke="#29333b" stroke-width="3"/><path d="m62 35 25 15h64l27-12M87 50v75M151 50v75" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="3"/><path d="M97 59h44v48H97Z" fill="#1d252c" stroke="#5b646b" stroke-width="2"/><path d="m101 96 8-15h22l7 15-4 6h-29Z" fill="#c2c8ce" stroke="#727b83"/><path d="M54 54h9v13h-9zm124 22h9v13h-9z" fill="${color}" stroke="#29333b" stroke-width="2"/><path d="M97 29h43" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`;
    } else if (profile.shape === "circular") {
      const positions = [];
      let remaining = count;
      const rings = count <= 6 ? [count] : count <= 10 ? [count - 7, 7] : [Math.max(0, count - 12), Math.min(12, count)];
      if (count === 10) rings.splice(0, rings.length, 3, 7);
      if (count > 16) rings.splice(0, rings.length, Math.ceil(count/3),Math.ceil(count/3),count-2*Math.ceil(count/3));
      rings.forEach((n, ring) => { const radius = count === 1 ? 0 : rings.length === 1 ? 32 : rings.length === 3 ? 8 + ring * 16 : 16 + ring * 20; for(let i=0;i<n && remaining>0;i++,remaining--) { const angle=-Math.PI/2+2*Math.PI*i/n; positions.push([110+Math.cos(angle)*radius,75+Math.sin(angle)*radius]); } });
      body = `<rect x="45" y="10" width="130" height="130" rx="18" fill="#c0c7cc" stroke="#45545e" stroke-width="3"/><circle cx="110" cy="75" r="59" fill="#46525d" stroke="#202c35" stroke-width="5"/><circle cx="110" cy="75" r="48" fill="#222e37" stroke="#8f9aa1" stroke-width="3"/><path d="M101 13h18v17h-18z" fill="#e2e7e8" stroke="#26343e" stroke-width="2"/>${positions.map(([x,y],i)=>`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${count>20?3:5}" fill="#cbb781" stroke="#f6e7b7" stroke-width="1.2"/>`).join("")}<circle cx="55" cy="20" r="4" fill="#fff"/><circle cx="165" cy="130" r="4" fill="#fff"/>`;
    } else if (profile.shape === "terminal") {
      const n=Math.min(count,12), w=160/n;
      body=`<rect x="30" y="38" width="160" height="70" rx="5" fill="#2a9468" stroke="#195d43" stroke-width="3"/>${Array.from({length:n},(_,i)=>`<circle cx="${30+(i+.5)*w}" cy="60" r="${Math.min(9,w*.3)}" fill="#c9ced0" stroke="#4c5b64"/><path d="M${30+(i+.5)*w-4} 60h8" stroke="#45545e" stroke-width="2"/><rect x="${32+i*w}" y="85" width="${w-4}" height="16" rx="2" fill="#163c30"/>`).join("")}`;
    } else if (profile.shape === "pcb") {
      body=`<rect x="25" y="35" width="170" height="80" rx="8" fill="#28694f" stroke="#163e30" stroke-width="3"/><rect x="46" y="53" width="128" height="35" rx="3" fill="#202c32"/>${Array.from({length:Math.min(count,16)},(_,i)=>`<rect x="${51+i*118/Math.min(count,16)}" y="62" width="4" height="17" rx="1" fill="#d7bd70"/>`).join("")}<path d="M35 100h150" stroke="#8cbba4" stroke-width="2"/>`;
    } else if (profile.shape === "rj45") {
      body=`<path d="M49 31h122v91H49Z" fill="#dce9eb" stroke="#536d77" stroke-width="3"/><path d="M65 42h90v64H65Z" fill="#293c46"/><path d="M91 106v20h38v-20" fill="#b1c3c8" stroke="#536d77" stroke-width="2"/>${Array.from({length:8},(_,i)=>`<rect x="${73+i*9}" y="52" width="5" height="34" rx="1" fill="#d6ba70"/>`).join("")}`;
    } else if (profile.shape === "ferrule") {
      body=`<rect x="39" y="51" width="70" height="45" rx="9" fill="#287ab4" stroke="#174365" stroke-width="3"/><path d="M109 59h73v29h-73" fill="#d0d7db" stroke="#606f79" stroke-width="3"/><ellipse cx="182" cy="73.5" rx="7" ry="14.5" fill="#53616c"/>`;
    } else {
      const n=count, rows=n>32 ? 4 : (profile.rows || (n>6?2:1)), columns=Math.ceil(n/rows), step=144/columns, cell=Math.min(rows>2?14:25,step-3);
      const light=profile.key === "miniFitJr" || profile.key === "picoBladePigtail";
      body=`<path d="M25 44h170v70H25Z" fill="${light?'#ede9db':'#333f48'}" stroke="#35434e" stroke-width="3"/><path d="M82 44V29h56v15" fill="${light?'#cfcbbb':'#53616c'}" stroke="#35434e" stroke-width="3"/>${Array.from({length:n},(_,i)=>{const col=i%columns, row=Math.floor(i/columns), x=38+col*step, y=52+row*(rows>2?15:28);const key=Math.min(5,cell*.25);return `<path d="M${x} ${y}h${cell-key}l${key} ${key}v${cell-key}h-${cell}Z" fill="#15212a" stroke="#738089" stroke-width="1.3"/><rect x="${x+cell*.3}" y="${y+cell*.3}" width="${cell*.4}" height="${cell*.4}" fill="#bca86f"/>`;}).join("")}`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 220 150" role="img" aria-label="${escape(profile.label)}"><title>${escape(profile.label)}</title>${body}</svg>`;
  }
  const dataUri = (profile) => `data:image/svg+xml,${encodeURIComponent(svg(profile))}`;
  const drawioImage = (profile) => `data:image/svg+xml,${encodeURIComponent(svg(profile))}`;
  return Object.freeze({ profiles, resolve, svg, dataUri, drawioImage });
});
