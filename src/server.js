#!/usr/bin/env node
// server.js - HTTP server entry point (per SDK guide structure)
const { serveHTTP } = require('stremio-addon-sdk');
const cron = require('node-cron');
const channelMap = require('./channelMap');
const addonInterface = require('./addon');

const PORT = process.env.PORT || 7001;

async function main() {
    console.log('[USATV-EPG] Starting addon...');
    console.log('[USATV-EPG] Loading EPG data and USATV catalog (this may take a minute)...');
    await channelMap.initialize();
    console.log('[USATV-EPG] Initialization complete');

    // Refresh EPG every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('[USATV-EPG] Scheduled EPG refresh...');
        await channelMap.refresh();
    });

    serveHTTP(addonInterface, { port: PORT });
    console.log(`[USATV-EPG] Addon running at http://localhost:${PORT}`);
    console.log(`[USATV-EPG] Manifest: http://localhost:${PORT}/manifest.json`);
}

main().catch(err => {
    console.error('[USATV-EPG] Fatal error:', err);
    process.exit(1);
});
