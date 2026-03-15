const { XMLParser } = require('fast-xml-parser');
const { gunzipSync } = require('zlib');

const EPG_URL = process.env.EPG_URL || 'https://epg.pw/xmltv/epg_US.xml';
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let channels = new Map();
let programmes = new Map();
let lastFetch = 0;
let fetching = false;

function parseDateTime(str) {
    // XMLTV format: "20260315080003 +0000" or "20260315170000 -0400"
    if (!str) return null;
    const trimmed = str.trim();
    const digits = trimmed.substring(0, 14).padEnd(14, '0');
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const h = digits.slice(8, 10);
    const min = digits.slice(10, 12);
    const s = digits.slice(12, 14);

    // Extract TZ offset if present, otherwise assume UTC
    const tzMatch = trimmed.substring(14).trim().match(/^([+-]\d{2})(\d{2})$/);
    const tz = tzMatch ? `${tzMatch[1]}:${tzMatch[2]}` : '+00:00';

    const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}${tz}`);
    return isNaN(date.getTime()) ? null : date;
}

async function fetchEPG() {
    if (fetching) return;
    fetching = true;
    console.log(`[EPG] Fetching EPG data from ${EPG_URL}...`);

    try {
        const response = await fetch(EPG_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let xmlText;
        const contentType = response.headers.get('content-type') || '';
        const buf = Buffer.from(await response.arrayBuffer());

        if (EPG_URL.endsWith('.gz') || contentType.includes('gzip')) {
            xmlText = gunzipSync(buf).toString('utf-8');
        } else {
            xmlText = buf.toString('utf-8');
        }

        console.log(`[EPG] Parsing XML (${(xmlText.length / 1024 / 1024).toFixed(1)} MB)...`);

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            isArray: (name) => name === 'channel' || name === 'programme' || name === 'category',
            textNodeName: '#text'
        });
        const parsed = parser.parse(xmlText);
        xmlText = null; // Free the raw XML string to reduce memory spike
        const tv = parsed.tv || parsed.TV;
        if (!tv) throw new Error('No <tv> root element found');

        const newChannels = new Map();
        for (const ch of (tv.channel || [])) {
            const id = ch['@_id'];
            const nameNode = ch['display-name'];
            let name = '';
            if (typeof nameNode === 'string') name = nameNode;
            else if (nameNode && typeof nameNode === 'object') name = nameNode['#text'] || nameNode.toString();
            const icon = ch.icon ? (ch.icon['@_src'] || '') : '';
            newChannels.set(id, { name: name.trim(), icon });
        }

        const newProgrammes = new Map();
        for (const prog of (tv.programme || [])) {
            const chId = prog['@_channel'];
            const start = parseDateTime(prog['@_start']);
            const stop = parseDateTime(prog['@_stop']);
            if (!start || !chId) continue;

            let title = '';
            const titleNode = prog.title;
            if (typeof titleNode === 'string') title = titleNode;
            else if (titleNode && typeof titleNode === 'object') title = titleNode['#text'] || '';

            let desc = '';
            const descNode = prog.desc;
            if (typeof descNode === 'string') desc = descNode;
            else if (descNode && typeof descNode === 'object') desc = descNode['#text'] || '';

            let categories = [];
            if (prog.category) {
                const cats = Array.isArray(prog.category) ? prog.category : [prog.category];
                categories = cats.map(c => typeof c === 'string' ? c : (c['#text'] || '')).filter(Boolean);
            }

            let icon = '';
            if (prog.icon) icon = prog.icon['@_src'] || '';

            if (!newProgrammes.has(chId)) newProgrammes.set(chId, []);
            newProgrammes.get(chId).push({ start, stop, title, desc, categories, icon });
        }

        for (const [, progs] of newProgrammes) {
            progs.sort((a, b) => a.start - b.start);
        }

        channels = newChannels;
        programmes = newProgrammes;
        lastFetch = Date.now();
        console.log(`[EPG] Loaded ${newChannels.size} channels, ${newProgrammes.size} with programmes`);
    } catch (err) {
        console.error(`[EPG] Fetch error: ${err.message}`);
    } finally {
        fetching = false;
    }
}

function getNowPlaying(epgChannelId) {
    const progs = programmes.get(epgChannelId);
    if (!progs) return null;
    const now = new Date();
    return progs.find(p => p.start <= now && (!p.stop || p.stop > now)) || null;
}

function getUpNext(epgChannelId) {
    const progs = programmes.get(epgChannelId);
    if (!progs) return null;
    const now = new Date();
    return progs.find(p => p.start > now) || null;
}

function getDaySchedule(epgChannelId) {
    const progs = programmes.get(epgChannelId);
    if (!progs) return [];
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return progs.filter(p => p.start <= endOfDay && (!p.stop || p.stop > now));
}

function getEPGChannels() { return channels; }
function isStale() { return Date.now() - lastFetch > REFRESH_INTERVAL_MS; }

async function ensureLoaded() {
    if (channels.size === 0 || isStale()) await fetchEPG();
}

module.exports = { fetchEPG, getNowPlaying, getUpNext, getDaySchedule, getEPGChannels, ensureLoaded };
