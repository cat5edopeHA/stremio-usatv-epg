// addon.js - exports addonInterface (per SDK guide structure)
// Docs: https://stremio.github.io/stremio-addon-guide/sdk-guide/step1
const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const { handleCatalog } = require('./catalogHandler');
const { handleMeta } = require('./metaHandler');

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(handleCatalog);
builder.defineMetaHandler(handleMeta);

module.exports = builder.getInterface();
