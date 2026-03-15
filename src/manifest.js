// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
    id: 'community.usatv-epg',
    version: '1.0.0',
    name: 'USATV EPG Guide',
    description: 'Electronic Program Guide for USATV addon channels. Shows what\'s currently playing and upcoming programs.',
    logo: 'https://848b3516657c-usatv.baby-beamup.club/public/logo.png',

    catalogs: [
        {
            id: 'usatv-epg-all',
            type: 'tv',
            name: 'USATV Guide - All Channels',
            extra: [
                {
                    name: 'genre',
                    isRequired: false,
                    options: [
                        'Local', 'News', 'Sports', 'Entertainment',
                        'Premium', 'Lifestyle', 'Kids', 'Documentaries',
                        'Music', 'Latino'
                    ]
                },
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],

    resources: [
        'catalog',
        {
            name: 'meta',
            types: ['tv'],
            idPrefixes: ['ustv']
        }
    ],

    types: ['tv'],
    idPrefixes: ['ustv'],

    behaviorHints: {
        configurable: false,
        configurationRequired: false
    }
};

module.exports = manifest;
