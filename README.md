# NJENGINE

The site is published as one standalone `index.html`. It includes the NJENGINE console intro, horizontal game catalog, and a browser-local library. Drifin Slot (`https://car-pend.vercel.app/`) is listed in **Jogos** with its own cover art; selecting **Enviar para biblioteca** stores it in the local library, where **Jogar** opens the original game edge-to-edge inside NJENGINE. A small floating back button returns to the console without a header taking up game space. The game itself is hosted separately and is not modified by this repository.

Library membership is saved in this browser's local storage, so it is per browser/device and requires browser storage to be enabled. Playing the remote game requires an internet connection. The PWA uses `public/__grok/manifest.webmanifest`, the NJENGINE icons, and `sw.js`. `scripts/build-static.mjs` publishes only the HTML page and the files required for the PWA.

The startup sequence uses its own original audio asset at `public/sounds/njengine-boot.mp3`, played after the first user gesture to comply with browser autoplay rules. The menu's existing navigation and selection tones remain separate, and the boot audio is included in the static build and PWA cache.
