// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineMetaHandler.md
const epg = require('./epg');
const channelMap = require('./channelMap');

const META_CACHE_SECS = 300;
const FALLBACK_POSTER = 'https://848b3516657c-usatv.baby-beamup.club/public/logo.png';

function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: process.env.TZ || 'America/New_York'
    });
}

async function handleMeta({ type, id }) {
    if (type !== 'tv' || !id.startsWith('ustv')) return { meta: {} };

    try { await epg.ensureLoaded(); } catch (_) {}

    try {
        const channels = channelMap.getUSTVChannels();
        const ch = channels.find(c => c.id === id);
        if (!ch) return { meta: {} };

        const epgId = channelMap.getEPGChannelId(id);
        const now = epgId ? epg.getNowPlaying(epgId) : null;
        const next = epgId ? epg.getUpNext(epgId) : null;
        const schedule = epgId ? epg.getDaySchedule(epgId) : [];

        const descLines = [];
        if (now) {
            descLines.push(`\u25b6 NOW PLAYING: ${now.title}`);
            descLines.push(`  ${formatTime(now.start)} - ${now.stop ? formatTime(now.stop) : 'TBD'}`);
            if (now.desc) descLines.push(`  ${now.desc}`);
            if (now.categories && now.categories.length) descLines.push(`  Category: ${now.categories.join(', ')}`);
            descLines.push('');
        }
        if (next) {
            descLines.push(`\u23ed UP NEXT: ${next.title} (${formatTime(next.start)})`);
            if (next.desc) descLines.push(`  ${next.desc.length > 100 ? next.desc.slice(0, 97) + '...' : next.desc}`);
            descLines.push('');
        }
        if (schedule.length > 0) {
            descLines.push(`\ud83d\udcfa TODAY'S SCHEDULE (${(process.env.TZ || 'ET').replace('America/', '').replace('_', ' ')}):`); 
            descLines.push('\u2500'.repeat(30));
            for (const prog of schedule.slice(0, 20)) {
                const isNow = now && prog.start.getTime() === now.start.getTime();
                descLines.push(`${isNow ? '\u25b6 ' : '  '}${formatTime(prog.start)} ${prog.title}`);
            }
            if (schedule.length > 20) descLines.push(`  ... and ${schedule.length - 20} more programs`);
        }
        if (descLines.length === 0) {
            descLines.push('No EPG guide data available for this channel.');
            descLines.push('The channel is still playable via the USATV addon.');
        }

        return {
            meta: {
                id: ch.id, type: 'tv', name: ch.name,
                poster: ch.poster || ch.logo || FALLBACK_POSTER,
                posterShape: 'landscape',
                logo: ch.logo || '', background: ch.poster || '',
                description: descLines.join('\n'),
                genres: ch.genres || [ch.genre].filter(Boolean),
                releaseInfo: now ? now.title : undefined,
            },
            cacheMaxAge: META_CACHE_SECS
        };
    } catch (err) {
        console.error('[MetaHandler] Error:', err.message);
        return { meta: {}, cacheMaxAge: 60 };
    }
}

module.exports = { handleMeta };
