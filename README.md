# NJengine

NJengine is a personal game library for the web. Each visit opens with a cinematic NJ Engine startup, then reveals a horizontal carousel with the selected game highlighted and neighboring games dimmed.

## What it does

- Keeps up to 12 personal game entries in this browser, including title, description, genre, platform, year, cover, trailer URL, and a real HTTP(S) Play link.
- Provides search, genre filters, and sorting in the library view.
- Shows up to three real games at once in a horizontal carousel; keyboard, touch, and compatible gamepad controls move the selection.
- At startup, cover-like tiles assemble into `NJENGINES`, then a cinematic pullback, blackout, and flash reveal the library. Mobile browsers ask for landscape orientation; installed PWA launches landscape. The horizontal blade tabs and focused cover rail are inspired by the Xbox 360 dashboard; the intro and optional navigation sounds are included.
- Opens only links supplied in a game's own entry. It does not create sample games, destinations, or metadata.

## Web edition limits

NJengine remains a browser app deployed on Vercel. Browser security does not let this edition scan arbitrary folders for installed `.exe` files, configure local emulators, or launch desktop programs. The Play button opens a web destination that the user explicitly saved. A native Windows edition would be needed for PlayWD Games-style folder scanning and local executable launching.

Game entries and images are stored in the browser's local storage, so they do not automatically sync to another browser or device. The catalog starts empty by design.

## Reference

The library and launcher interaction patterns were informed by [PlayWD Games](https://github.com/adifreza/playwdgames). NJengine's UI and implementation are its own; no upstream code or artwork was copied.
