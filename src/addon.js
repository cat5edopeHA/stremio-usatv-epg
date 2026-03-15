// addon.js - exports addonInterface (per SDK guide structure)
const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const { handleCatalog } = require('./catalogHandler');
const { handleMeta } = require('./metaHandler');

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(handleCatalog);
builder.defineMetaHandler(handleMeta);

module.exports = builder.getInterface();
