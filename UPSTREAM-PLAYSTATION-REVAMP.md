# Playstation-Revamp integration

The post-intro experience is ported from [Manav-Sonawane/Playstation-Revamp](https://github.com/Manav-Sonawane/Playstation-Revamp). The upstream project has no published license file. The NJengines owner confirmed permission to copy this project for personal use. This notice records provenance; it does not grant or assert rights on behalf of the upstream author.

The copied interface includes source mock data and demo interaction flows. In particular, sample games, profiles, friends, achievements, wallet balances, subscriptions, and checkout are not connected to PlayStation or payment services. Checkout is explicitly labeled as a demo and does not process payments or create purchases/subscriptions.

Cross-device remote control uses `P2PRoom` WebRTC data channels with a database-backed signaling endpoint at `/api/rtc`; it does not depend on the upstream Express WebSocket relay. QR/session links use a cryptographically random, high-entropy token; prior short session codes are rotated, so open QR links must be rescanned after the update. Successful pairing still depends on browser WebRTC support, a working deployed database/signaling endpoint, and compatible NAT/firewall paths. No TURN server is configured by default, so some network pairs may fail to connect.
