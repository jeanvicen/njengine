# Playstation-Revamp integration

The post-intro reference interface was ported from [Manav-Sonawane/Playstation-Revamp](https://github.com/Manav-Sonawane/Playstation-Revamp). The upstream project has no published license file. The NJengines owner confirmed permission to copy this project for personal use. This notice records provenance; it does not grant or assert rights on behalf of the upstream author.

The NJengines experience now uses its own black, silver, and restrained gold visual identity. Fictional game listings, covers, recommendations, play history, profiles, friends, achievements, store offers, subscription plans, accessories, media samples, and checkout demos have been removed from the visible experience. Only games saved by the user in NJengines' existing local Studio bays appear in the library; the Store, Media, Profile, subscriptions, and accessory areas show honest empty or unavailable states until real data exists.

The existing controller showcase and remote-control route are retained. Cross-device remote control depends on P2PRoom/WebRTC and database signaling and can fail through restrictive NATs or firewalls; no TURN server is configured. The connection UI discloses that cross-device control is not guaranteed in this deployment.
