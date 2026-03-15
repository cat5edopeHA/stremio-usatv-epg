# USATV EPG Guide — Stremio Addon

Electronic Program Guide for [USATV](https://848b3516657c-usatv.baby-beamup.club/) channels in Stremio. Shows what's currently playing and upcoming programs on each channel.

## How It Works

1. Fetches the USATV channel catalog at startup to get all 190 channel IDs
2. Downloads free XMLTV EPG data from [epg.pw](https://epg.pw) (~5400 US channels)
3. Fuzzy-matches USATV channel names to EPG channel names (with 130+ manual overrides for accuracy)
4. Serves an enriched catalog showing **Now Playing** and **Up Next** for each channel
5. When you click a channel, Stremio routes the stream request to the USATV addon via matching `ustv-*` IDs

> **Note:** The USATV addon uses the ID prefix `ustv` (not `usatv`). All channel IDs look like `ustv-1a0b178a-23c5-4c06-9217-ceabe2897343`. This addon's `idPrefixes` must match exactly or Stremio won't route stream requests to USATV.

## Prerequisites

- **USATV addon** must be installed in Stremio (this addon provides guide data only — USATV provides the streams)
- **Docker** for deployment (or Node.js 20+ for local dev)
- **4 GB RAM** minimum — the US EPG XML file is ~188 MB and needs headroom for parsing

## Quick Start

### Docker Compose (recommended)

```bash
git clone https://github.com/cat5edopeHA/stremio-usatv-epg.git
cd stremio-usatv-epg
docker compose up -d
```

Wait ~2 minutes for the initial EPG download and parsing, then verify:

```bash
curl -s http://localhost:7001/manifest.json | jq .name
# "USATV EPG Guide"

curl -s http://localhost:7001/catalog/tv/usatv-epg-all.json | jq '.metas[0].name'
# "ABC - Good Morning America"
```

### Docker Run

```bash
docker build -t usatv-epg .
docker run -d --name usatv-epg \
  --restart unless-stopped \
  -p 7001:7001 \
  -e PORT=7001 \
  -e EPG_URL=https://epg.pw/xmltv/epg_US.xml \
  -e TZ=America/New_York \
  -e NODE_OPTIONS=--max-old-space-size=3072 \
  --memory=4g \
  usatv-epg
```

### Local (no Docker)

```bash
npm install
NODE_OPTIONS=--max-old-space-size=3072 npm start
```

## Install in Stremio

1. Open Stremio
2. Go to the addon search bar or Settings → Addons
3. Paste your addon URL: `http://<your-ip>:7001/manifest.json`
4. Click Install

Make sure the **USATV addon** is also installed: `https://848b3516657c-usatv.baby-beamup.club/manifest.json`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7001` | HTTP server port |
| `EPG_URL` | `https://epg.pw/xmltv/epg_US.xml` | XMLTV EPG source URL |
| `TZ` | `America/New_York` | Timezone for schedule display |
| `NODE_OPTIONS` | — | Set `--max-old-space-size=3072` for large EPG files |
| `USATV_BASE_URL` | USATV catalog URL | Override if USATV changes their endpoint |

### Alternative EPG Sources

Any XMLTV-format URL works (gzipped or plain XML auto-detected):

| Source | URL | Notes |
|--------|-----|-------|
| epg.pw (US) | `https://epg.pw/xmltv/epg_US.xml` | Default. ~5400 channels, updated daily |
| epg.pw (custom) | `https://epg.pw/xmltv/epg_XX.xml` | Replace `XX` with country code |

## Architecture

```
src/
├── addon.js          # Exports addonInterface (builder.getInterface())
├── server.js         # HTTP server entry point (serveHTTP)
├── manifest.js       # Addon manifest: catalog + meta resources
├── epg.js            # XMLTV fetcher/parser, now-playing lookups
├── channelMap.js     # USATV catalog fetcher, fuzzy EPG matching, disk cache
├── catalogHandler.js # defineCatalogHandler (search, genre, pagination)
└── metaHandler.js    # defineMetaHandler (channel detail + day schedule)
```

**Resources provided:** `catalog`, `meta`
**Resources NOT provided:** `stream` — handled by the USATV addon

## Features

- **Live EPG data** — shows what's currently playing on each channel
- **Search** — search by channel name or current program title
- **Genre filtering** — Local, News, Sports, Entertainment, Premium, Lifestyle, Kids, Documentaries, Music, Latino
- **Day schedule** — full schedule in channel detail view
- **Self-healing** — if EPG fetch fails at startup, handlers retry automatically on next request
- **Disk cache** — USATV channel list cached to disk; survives USATV outages and container restarts
- **88% match rate** — 167/190 channels matched via manual overrides + fuzzy matching

## Caching

| Data | Refresh | Notes |
|------|---------|-------|
| EPG (XMLTV) | Every 6 hours | node-cron scheduled |
| USATV channel list | At startup | Cached to `channels-cache.json` for resilience |
| Catalog responses | 5 min | SDK `cacheMaxAge` |
| Meta responses | 5 min | SDK `cacheMaxAge` |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Channels show but no streams play | USATV addon not installed | Install USATV addon first |
| "No guide data available" on a channel | EPG fuzzy-match missed it | Add manual override in `channelMap.js` |
| Addon won't start / OOM killed | Not enough memory for XML parsing | Set `NODE_OPTIONS=--max-old-space-size=3072` and `--memory=4g` |
| Empty catalog | USATV catalog fetch failed at startup | Check network; addon will use disk cache on next restart |
| Wrong times on schedule | Timezone mismatch | Set `TZ=America/New_York` (or your timezone) |
| "Failed to fetch" when installing in Stremio web | Mixed content (HTTPS page loading HTTP addon) | Use Stremio desktop app, or put the addon behind a reverse proxy with HTTPS |

## License

MIT
