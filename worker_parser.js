/* ---------- CSV parsing ---------- */

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function buildRows(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) throw new Error("Sheet returned no data rows");
  const headers = rows[0].map(h => h.trim().toUpperCase());
  const iSrc = headers.indexOf("SOURCE");
  const iStars = headers.indexOf("STARS");
  const iAgent = headers.indexOf("AGENT OUT");
  const iLoc = headers.indexOf("LOCATION");
  const iMonth = headers.indexOf("MONTH");
  const iYear = headers.indexOf("YEAR");
  if (iSrc < 0 || iStars < 0 || iAgent < 0)
    throw new Error("Couldn't find the Source / Stars / Agent out columns");
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const src = (cells[iSrc] || "").trim().toUpperCase();
    if (src !== "EXPEDIA" && src !== "PRICELINE") continue;
    const stars = parseInt((cells[iStars] || "").trim(), 10);
    if (!(stars >= 1 && stars <= 5)) continue;
    const agent = (cells[iAgent] || "").trim().toUpperCase().replace(/\s+/g, " ") || UNASSIGNED;
    const loc = iLoc >= 0 ? (cells[iLoc] || "").trim() : "";
    if (!loc || /^unknown$/i.test(loc)) continue; // skip reviews with no usable location
    const mn = iMonth >= 0 ? MONTH_NUM[(cells[iMonth] || "").trim().toUpperCase()] : null;
    const yr = iYear >= 0 ? parseInt((cells[iYear] || "").trim(), 10) : null;
    const mKey = (mn && yr) ? yr + "-" + String(mn).padStart(2, "0") : "0000-00";
    out.push([src === "EXPEDIA" ? 0 : 1, stars >= 4 ? 0 : (stars === 3 ? 1 : 2), agent, loc, mKey]);
  }
  if (!out.length) throw new Error("No Expedia or Priceline reviews found");
  return out;
}

