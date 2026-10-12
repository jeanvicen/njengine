# NJENGINE

NJENGINE is a personal game-library launcher for the web, based on Jean's latest console-interface prototype. It opens with the gold cinematic boot, then presents three hubs and a horizontal, 3D-perspective cover selector.

## What it does

- The Jogos hub shows the 12 personal bays. Empty cards are reserved for games Jean will add; filled cards are marked as saved in the library.
- The Biblioteca hub lists only real games saved by the user. When empty, it explains how to add a game from the Jogos hub.
- Selecting a free bay opens its game ficha. Entries support title, description, genre, platform, year, cover, trailer, and an HTTP(S) Play link.
- The Sistema hub reports the browser's actual online status, local game count, local-storage behavior, and sound control.
- Keyboard, touch gestures, and compatible gamepads navigate the hubs and cover rail. Only a saved Play link can be opened.
- Phones are prompted to use landscape orientation; the installed PWA manifest also requests landscape.
- No demo game names, fake Play links, invented users, or simulated server uploads are included. Saved entries stay in this browser and do not automatically sync to other devices.

## Interface references

The visual style and opening are adapted from the latest user-provided NJENGINE HTML prototype. The horizontal navigation and focused cover rail take inspiration from the Xbox 360 Blades/NXE dashboard family; no Xbox artwork or game data is bundled.
