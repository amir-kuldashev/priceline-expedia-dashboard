# Priceline & Expedia Dashboard

Live dashboard of Expedia and Priceline review sentiment per check-out agent,
grouped by location, filterable by any date range and by one or several locations.

## Architecture

- **`dashboard.html`** — the dashboard page (no secrets). Fetches aggregated
  JSON from the Cloudflare Worker's `/data` endpoint. Published verbatim as
  `docs/index.html` on GitHub Pages.
- **Cloudflare Worker** (`build_worker.py` → `worker.js`, deployed with
  `deploy.sh`) — serves the same page at `/` and aggregated counts at `/data`.
  It is the only place that knows the Google Sheet URL; raw sheet contents
  (complaint text, confirmation numbers) never leave the Worker. `/data`
  returns only `[source, sentiment, agent, location, date]` tuples, cached
  5 minutes. `/data?v=2` (used by the current page) carries full `YYYY-MM-DD`
  dates built from the sheet's "Date of Complaint" + "YEAR" columns; the
  legacy `/data` keeps returning `YYYY-MM` month keys for older copies of the page.
- Design follows the Drivo brand palette (Navy `#091365`, Baby Blue `#0D1CA4`,
  Yellow `#F3BB04`, White `#FBFBFB`, Black `#121212`). Sentiment colours:
  positive = Baby Blue, neutral = cool grey `#AEB4CF`, negative = red `#D94452`
  (Yellow and Black are reserved for accents and text).

## Not in the repo (gitignored)

- `sheet_url.txt` — the private Google Sheet CSV URL
- `worker.js` — generated; embeds the sheet URL
- `.cloudflare.env` — Cloudflare API credentials for deploys

## Updating the dashboard

1. Edit `dashboard.html`
2. `cp dashboard.html docs/index.html` and push (updates GitHub Pages)
3. `python3 build_worker.py && ./deploy.sh` (updates the Worker)
