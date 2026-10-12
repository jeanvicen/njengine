# NJENGINE

NJENGINE is a personal game-library launcher for the web, built around Jean's console-interface prototype. It opens with the gold cinematic boot, then presents three hubs and a horizontal, 3D-perspective cover selector.

## What it does

- The Juegos hub shows real games saved by the user; the Library hub shows the 12 personal bays, including empty cards reserved for future games.
- Selecting an empty bay opens its game ficha. Entries support title, description, genre, platform, year, cover, trailer, and an HTTP(S) Play link.
- The System hub reports the browser's actual online status, locally saved game count, local storage behavior, and sound control.
- Keyboard, touch gestures, and compatible gamepads navigate the hubs and cover rail. Only the saved Play link can be opened.
- On phones, the interface requests landscape orientation. The installed PWA manifest also requests landscape.
- No demo game names, fake Play links, or invented user profiles are included. Saved entries stay in this browser and do not automatically sync to other devices.

## Interface references

The visual style and opening are adapted from the user-provided NJENGINE HTML prototype. The horizontal navigation and focused cover rail take inspiration from the Xbox 360 Blades/NXE dashboard family; no Xbox artwork or game data is bundled.
