# NJengine

NJengine is a personal game library for the web: manage real games you add yourself, browse them in a desktop cover grid, or open the immersive 3D carousel.

## What it does

- Keeps up to 12 personal game entries in this browser, including title, description, genre, platform, year, cover, trailer URL, and a real HTTP(S) Play link.
- Provides search, genre filters, and sorting in the library view.
- Offers a full-window immersive carousel with keyboard, touch, and gamepad navigation where supported.
- Opens only links supplied in a game's own entry. It does not create sample games, destinations, or metadata.

## Web edition limits

NJengine remains a browser app deployed on Vercel. Browser security does not let this edition scan arbitrary folders for installed `.exe` files, configure local emulators, or launch desktop programs. The Play button opens a web destination that the user explicitly saved. A native Windows edition would be needed for PlayWD Games-style folder scanning and local executable launching.

Game entries and images are stored in the browser's local storage, so they do not automatically sync to another browser or device. The catalog starts empty by design.

## Reference

The desktop-library / immersive-mode direction was informed by the interaction patterns described in [PlayWD Games](https://github.com/adifreza/playwdgames). NJengine's UI and implementation are its own; no upstream code or artwork was copied.
