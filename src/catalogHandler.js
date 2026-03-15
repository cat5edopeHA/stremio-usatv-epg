// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineCatalogHandler.md
const epg = require('./epg');
const channelMap = require('./channelMap');

const PAGE_SIZE = 100;
const CATALOG_CACHE_SECS = 300;
const FALLBACK_POSTER = 'https://848b3516657c-usatv.baby-beamup.club/public/logo.png';

function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: process.env.TZ || 'America/New_York'
    });
}

function formatTimeRange(start, stop) {
    const s = formatTime(start);
    const e = stop ? formatTime(stop) : '';
    return e ? `${s} - ${e}` : s;
}

function buildDescription(ustvChannel) {
    const epgId = channelMap.getEPGChannelId(ustvChannel.id);
    if (!epgId) return ustvChannel.name;
    const now = epg.getNowPlaying(epgId);
    const next = epg.getUpNext(epgId);
    const lines = [];
    if (now) {
        lines.push(`\u25b6 NOW: ${now.title}`);
        lines.push(`  ${formatTimeRange(now.start, now.stop)}`);
        if (now.desc) {
            const shortDesc = now.desc.length > 120 ? now.desc.slice(0, 117) + '...' : now.desc;
            lines.push(`  ${shortDesc}`);
        }
    }
    if (next) lines.push(`\u23ed NEXT: ${next.title} (${formatTime(next.start)})`);
    if (lines.length === 0) lines.push('No guide data available');
    return lines.join('\n');
}

function buildCatalogName(ustvChannel) {
    const epgId = channelMap.getEPGChannelId(ustvChannel.id);
    if (!epgId) return ustvChannel.name;
    const now = epg.getNowPlaying(epgId);
    return now ? `${ustvChannel.name} - ${now.title}` : ustvChannel.name;
}

async function handleCatalog({ type, id, extra }) {
    if (type !== 'tv' || id !== 'usatv-epg-all') return { metas: [] };

    try { await epg.ensureLoaded(); } catch (_) {}

    try {
        const channels = channelMap.getUSTVChannels();
        let filtered = [...channels];

        if (extra && extra.search) {
            const query = extra.search.toLowerCase();
            filtered = filtered.filter(ch => {
                if (ch.name.toLowerCase().includes(query)) return true;
                const epgId = channelMap.getEPGChannelId(ch.id);
                if (epgId) {
                    const now = epg.getNowPlaying(epgId);
                    if (now && now.title.toLowerCase().includes(query)) return true;
                }
                return false;
            });
        } else if (extra && extra.genre) {
            filtered = filtered.filter(ch => {
                const genres = ch.genres || [ch.genre];
                return genres.some(g => g && g.toLowerCase() === extra.genre.toLowerCase());
            });
        }

        const skip = (extra && extra.skip) ? parseInt(extra.skip, 10) : 0;
        const page = filtered.slice(skip, skip + PAGE_SIZE);

        const metas = page.map(ch => ({
            id: ch.id,
            type: 'tv',
            name: buildCatalogName(ch),
            poster: ch.poster || ch.logo || FALLBACK_POSTER,
            posterShape: 'landscape',
            description: buildDescription(ch),
            genres: ch.genres || [ch.genre].filter(Boolean),
            logo: ch.logo || '',
            background: ch.poster || ''
        }));

        return { metas, cacheMaxAge: CATALOG_CACHE_SECS };
    } catch (err) {
        console.error('[CatalogHandler] Error:', err.message);
        return { metas: [], cacheMaxAge: 60 };
    }
}

module.exports = { handleCatalog };
