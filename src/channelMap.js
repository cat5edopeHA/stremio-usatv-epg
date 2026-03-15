const Fuse = require('fuse.js');
const fs = require('fs');
const path = require('path');
const epg = require('./epg');

const USATV_CATALOG_URL = process.env.USATV_BASE_URL
    || 'https://848b3516657c-usatv.baby-beamup.club/catalog/tv/all.json';
const CACHE_FILE = path.join(__dirname, '..', 'channels-cache.json');

let ustvChannels = [];
let lastCatalogFetch = 0;
let channelMap = new Map();

// Manual overrides: USATV name (lowercase) -> EPG display-name substring
const MANUAL_OVERRIDES = {
    'abc': 'ABC National Feed',
    'cbs': 'CBS National Feed',
    'cw': 'CW Network',
    'fox': 'Fox National Feed',
    'nbc': 'NBC National Feed',
    'pbs': 'PBS',
    'cnn': 'CNN HD',
    'fox news': 'Fox News Channel HD',
    'fox business': 'Fox Business HD',
    'msnbc': 'MSNBC HD',
    'espn': 'ESPN HD',
    'espn 2': 'ESPN2 HD',
    'espnews': 'ESPNews HD',
    'espnu': 'ESPNU HD',
    'tbs': 'TBS HD',
    'tnt': 'TNT HD',
    'usa network': 'USA Network HD',
    'fx': 'FX HD',
    'fxx': 'FXX HD',
    'syfy': 'SYFY HD',
    'bravo': 'Bravo HD',
    'e! entertainment television': 'E! HD',
    'a&e': 'A and E HD',
    'amc': 'AMC HD',
    'bet': 'BET HD',
    'comedy central': 'Comedy Central HD',
    'discovery channel': 'Discovery Channel HD',
    'history': 'History Channel HD',
    'hbo': 'HBO East',
    'hbo 2': 'HBO 2 East',
    'showtime': 'Showtime East',
    'starz': 'Starz East',
    'national geographic': 'National Geographic HD',
    'animal planet': 'Animal Planet HD',
    'food network': 'Food Network HD',
    'hgtv': 'HGTV HD',
    'tlc': 'TLC HD',
    'cartoon network': 'Cartoon Network',
    'nickelodeon': 'Nickelodeon HD',
    'disney channel': 'Disney Channel',
    'hallmark channel': 'Hallmark Channel HD',
    'lifetime': 'Lifetime HD',
    'paramount network': 'Paramount Network HD',
    'travel channel': 'Travel Channel HD',
    'golf channel': 'Golf Channel HD',
    'nfl network': 'NFL Network HD',
    'nba tv': 'NBA TV HD',
    'mlb network': 'MLB Network HD',
    'nhl network': 'NHL Network',
    'fs1': 'FS1 HD',
    'fs2': 'FS2 HD',
    'sec network': 'SEC Network HD',
    'acc network': 'ACC Network',
    'big ten network': 'Big Ten Network HD',
    'cnbc': 'CNBC HD',
    'bloomberg tv': 'Bloomberg HD',
    'tcm': 'TCM Turner Classic Movies',
    'cinemax': 'Cinemax',
    'cooking channel': 'Cooking Channel HD',
    'freeform': 'Freeform HD',
    'mtv': 'MTV HD',
    'vh1': 'VH1 HD',
    'cmt': 'CMT HD',
    'oxygen true crime': 'Oxygen HD',
    'investigation discovery': 'Investigation Discovery HD',
    'science channel': 'Science Channel HD',
    'disney jr': 'Disney Junior',
    'disney xd': 'Disney XD',
    'nick jr': 'Nick Jr',
    'boomerang': 'Boomerang',
    'hallmark mystery': 'Hallmark Mystery',
    'ifc': 'IFC HD',
    'sundance tv': 'SundanceTV HD',
    'bbc america': 'BBC America HD',
    'bbc news': 'BBC News (North America) HD',
    'tv land': 'TV Land HD',
    'we tv': 'WE tv HD',
    'newsmax': 'Newsmax HD',
    'newsnation': 'NewsNation HD',
    'court tv': 'Court TV HD',
    'the weather channel': 'The Weather Channel HD',
    'fox weather': 'Fox Weather HD',
    'hln': 'HLN HD',
    'reelz': 'Reelz HD',
    'destination america': 'Destination America HD',
    'discovery life': 'Discovery Life HD',
    'motortrend': 'MotorTrend HD',
    'fyi': 'FYI HD',
    'crime + investigation': 'Crime and Investigation HD',
    'telemundo': 'Telemundo',
    'univision': 'Univision',
    'espn deportes': 'ESPN Deportes',
    'fox deportes': 'Fox Deportes',
    'nicktoons': 'Nicktoons HD',
    'teennick': 'TeenNick HD',
    'game show network': 'Game Show Network HD',
    'ion': 'ION Television',
    'discovery family': 'Discovery Family Channel HD',
    'universal kids': 'Universal Kids',
    'nfl redzone': 'NFL RedZone HD',
    'tennis channel': 'Tennis Channel HD',
    'sportsman channel': 'Sportsman Channel HD',
    'axs tv': 'AXS TV',
    'marquee sports network': 'Marquee Sports Network',
    'nesn': 'NESN HD',
    'yes network': 'YES Network HD',
    'msg': 'MSG HD',
    'spectrum sportsnet la': 'Spectrum SportsNet LA',
    'c-span 1': 'C-SPAN',
    'fx movie channel': 'FX Movie Channel',
    'starz cinema': 'Starz Cinema',
    'starz comedy': 'Starz Comedy',
    'hbo comedy': 'HBO Comedy',
    'hbo family': 'HBO Family',
    'hbo signature': 'HBO Signature',
    'hbo zone': 'HBO Zone',
    'showtime 2': 'Showtime 2',
    'showtime women': 'Showtime Women',
    'mgm+': 'MGM Plus HD',
    '5starmax': '5 StarMAX HD',
    'moremax': 'MoreMAX HD',
    'vice tv': 'Vice TV HD',
    'aspire': 'ASPiRE HD',
    'bet her': 'BET Her',
    'cleo tv': 'Cleo TV',
    'oprah winfrey network (own)': 'OWN HD',
    'outdoor channel': 'Outdoor Channel HD',
    'world fishing network': 'World Fishing Network',
    'outside tv': 'Outside Television',
    'grit': 'Grit TV',
    'buzzr': 'BUZZR',
    'comet': 'Comet TV',
    'bounce': 'Bounce TV',
    'laff': 'Laff TV',
    'charge!': 'Charge!',
    'metv': 'MeTV',
    'metv toons': 'MeTV Toons',
    'pbs kids': 'PBS Kids',
    'lifetime movie network': 'Lifetime Movie Network HD',
    'tv one': 'TV One HD',
    'revolt': 'Revolt TV',
    'fuse': 'Fuse HD',
};

async function fetchUSTVCatalog() {
    console.log('[ChannelMap] Fetching USATV catalog...');
    try {
        const resp = await fetch(USATV_CATALOG_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        ustvChannels = data.metas || [];
        lastCatalogFetch = Date.now();
        console.log(`[ChannelMap] Loaded ${ustvChannels.length} USATV channels`);

        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(ustvChannels), 'utf-8');
            console.log(`[ChannelMap] Saved channel cache to ${CACHE_FILE}`);
        } catch (writeErr) {
            console.warn(`[ChannelMap] Could not write cache: ${writeErr.message}`);
        }
    } catch (err) {
        console.error(`[ChannelMap] Catalog fetch error: ${err.message}`);
        if (ustvChannels.length === 0) {
            try {
                if (fs.existsSync(CACHE_FILE)) {
                    ustvChannels = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
                    console.log(`[ChannelMap] Loaded ${ustvChannels.length} channels from disk cache`);
                } else {
                    console.warn('[ChannelMap] No disk cache available. Starting with empty channel list.');
                }
            } catch (readErr) {
                console.error(`[ChannelMap] Cache read error: ${readErr.message}`);
            }
        }
    }
}

function buildChannelMap() {
    const epgChannels = epg.getEPGChannels();
    if (epgChannels.size === 0 || ustvChannels.length === 0) {
        console.log('[ChannelMap] Not enough data to build map yet');
        return;
    }

    const epgEntries = [];
    for (const [id, data] of epgChannels) {
        epgEntries.push({ id, name: data.name, nameLower: data.name.toLowerCase() });
    }

    const fuse = new Fuse(epgEntries, { keys: ['name'], threshold: 0.3, includeScore: true });

    const newMap = new Map();
    let matched = 0, manual = 0, fuzzy = 0, missed = 0;

    for (const ch of ustvChannels) {
        const ustvName = ch.name.trim();
        const ustvNameLower = ustvName.toLowerCase().trim();

        // 1. Manual override
        if (MANUAL_OVERRIDES[ustvNameLower]) {
            const target = MANUAL_OVERRIDES[ustvNameLower].toLowerCase();
            const found = epgEntries.find(e => e.nameLower.includes(target) || target.includes(e.nameLower));
            if (found) { newMap.set(ch.id, found.id); matched++; manual++; continue; }
            const fr = fuse.search(MANUAL_OVERRIDES[ustvNameLower]);
            if (fr.length > 0 && fr[0].score < 0.4) { newMap.set(ch.id, fr[0].item.id); matched++; manual++; continue; }
        }

        // 2. Exact match (case-insensitive)
        const exact = epgEntries.find(e => e.nameLower === ustvNameLower);
        if (exact) { newMap.set(ch.id, exact.id); matched++; continue; }

        // 3. Fuzzy match
        const results = fuse.search(ustvName);
        if (results.length > 0 && results[0].score < 0.35) {
            newMap.set(ch.id, results[0].item.id); matched++; fuzzy++;
        } else {
            missed++;
            console.log(`[ChannelMap] No EPG match for: "${ustvName}" (best: ${results[0]?.item?.name || 'none'} @ ${results[0]?.score?.toFixed(2) || 'N/A'})`);
        }
    }

    channelMap = newMap;
    console.log(`[ChannelMap] Mapping complete: ${matched}/${ustvChannels.length} matched (${manual} manual, ${fuzzy} fuzzy, ${missed} missed)`);
}

function getEPGChannelId(ustvId) { return channelMap.get(ustvId) || null; }
function getUSTVChannels() { return ustvChannels; }

async function initialize() {
    await fetchUSTVCatalog();
    await epg.ensureLoaded();
    buildChannelMap();
}

async function refresh() {
    await fetchUSTVCatalog();
    await epg.fetchEPG();
    buildChannelMap();
}

module.exports = { initialize, refresh, getEPGChannelId, getUSTVChannels, buildChannelMap };
