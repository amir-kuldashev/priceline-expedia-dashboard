# Priceline & Expedia Dashboard

Live dashboard of Expedia and Priceline review sentiment per check-out agent,
grouped by location and filterable by month.

## Architecture

- **`dashboard.html`** — the dashboard page (no secrets). Fetches aggregated
  JSON from the Cloudflare Worker's `/data` endpoint. Published verbatim as
  `docs/index.html` on GitHub Pages.
- **Cloudflare Worker** (`build_worker.py` → `worker.js`, deployed with
  `deploy.sh`) — serves the same page at `/` and aggregated counts at `/data`.
  It is the only place that knows the Google Sheet URL; raw sheet contents
  (complaint text, confirmation numbers) never leave the Worker. `/data`
  returns only `[source, sentiment, agent, location, month]` tuples, cached
  5 minutes.

## Not in the repo (gitignored)

- `sheet_url.txt` — the private Google Sheet CSV URL
- `worker.js` — generated; embeds the sheet URL
- `.cloudflare.env` — Cloudflare API credentials for deploys

## Updating the dashboard

1. Edit `dashboard.html`
2. `cp dashboard.html docs/index.html` and push (updates GitHub Pages)
3. `python3 build_worker.py && ./deploy.sh` (updates the Worker)
