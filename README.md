# NJENGINE

The site is published as one standalone `index.html`, using the latest HTML prototype provided for NJENGINE. It includes the console intro, horizontal library, local browser storage, and the supplied demonstration catalog and simulated library-add animation; those demo actions do not contact a game server.

The PWA uses `public/__grok/manifest.webmanifest`, the NJENGINE icons, and `sw.js`. `scripts/build-static.mjs` publishes only the HTML page and the files required for the PWA.
