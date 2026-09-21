/* ---------- CSV parsing ---------- */

// Sticky-regex tokenizer: one native match per field instead of a JS loop per
// character. Rows are handed to `onRow` one at a time and never kept, so an
// 8+ MB sheet stays inside the Worker's CPU and memory budget.
function forEachCSVRow(text, onRow) {
  const re = /("(?:[^"]|"")*"|[^,\r\n]*)(,|\r\n|\r|\n|$)/y;
  let row = [], m, idx = 0;
  while (re.lastIndex < text.length && (m = re.exec(text))) {
    let f = m[1];
    if (f.charCodeAt(0) === 34) f = f.slice(1, -1).replace(/""/g, '"');
    row.push(f);
    if (m[2] !== ",") { onRow(row, idx++); row = []; }
    else if (re.lastIndex >= text.length) row.push(""); // file ends right after a comma
    if (m[2] === "") break;
  }
  if (row.length) onRow(row, idx);
}

function parseCSV(text) {
  const rows = [];
  forEachCSVRow(text, r => rows.push(r));
  return rows;
}

const MON3 = Object.fromEntries(Object.keys(MONTH_NUM).map(k => [k.slice(0, 3), MONTH_NUM[k]]));

function buildRows(csvText) {
  let iSrc = -1, iStars = -1, iAgent = -1, iLoc = -1, iMonth = -1, iYear = -1, iDate = -1;
  const out = [];
  const pad = n => String(n).padStart(2, "0");
  forEachCSVRow(csvText, (cells, idx) => {
    if (idx === 0) {
      const headers = cells.map(h => h.trim().toUpperCase());
      iSrc = headers.indexOf("SOURCE");
      iStars = headers.indexOf("STARS");
      iAgent = headers.indexOf("AGENT OUT");
      iLoc = headers.indexOf("LOCATION");
      iMonth = headers.indexOf("MONTH");
      iYear = headers.indexOf("YEAR");
      iDate = headers.indexOf("DATE OF COMPLAINT");
      if (iSrc < 0 || iStars < 0 || iAgent < 0)
        throw new Error("Couldn't find the Source / Stars / Agent out columns");
      return;
    }
    const src = (cells[iSrc] || "").trim().toUpperCase();
    if (src !== "EXPEDIA" && src !== "PRICELINE") return;
    const stars = parseInt((cells[iStars] || "").trim(), 10);
    if (!(stars >= 1 && stars <= 5)) return;
    const agent = (cells[iAgent] || "").trim().toUpperCase().replace(/\s+/g, " ") || UNASSIGNED;
    const loc = iLoc >= 0 ? (cells[iLoc] || "").trim() : "";
    if (!loc || /^unknown$/i.test(loc)) return; // skip reviews with no usable location
    let mn = iMonth >= 0 ? MONTH_NUM[(cells[iMonth] || "").trim().toUpperCase()] : null;
    const yr = iYear >= 0 ? parseInt((cells[iYear] || "").trim(), 10) : null;
    // "Date of Complaint" is day-month ("14-Mar"); the year lives in its own column.
    let day = null;
    const dm = iDate >= 0 ? /^(\d{1,2})[-\/ ]([A-Za-z]{3})/.exec((cells[iDate] || "").trim()) : null;
    if (dm) {
      const dmMonth = MON3[dm[2].toUpperCase()];
      if (dmMonth) { mn = mn || dmMonth; day = parseInt(dm[1], 10); }
    }
    const dKey = (mn && yr) ? yr + "-" + pad(mn) + "-" + pad(day >= 1 && day <= 31 ? day : 1) : "0000-00-00";
    out.push([src === "EXPEDIA" ? 0 : 1, stars >= 4 ? 0 : (stars === 3 ? 1 : 2), agent, loc, dKey]);
  });
  if (iSrc < 0) throw new Error("Sheet returned no data rows");
  if (!out.length) throw new Error("No Expedia or Priceline reviews found");
  return out;
}
