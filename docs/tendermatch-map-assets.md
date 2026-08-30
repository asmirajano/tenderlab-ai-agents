# TenderMatch self-hosted map assets

TenderMatch renders two repository-local reference maps. Current pilot tenders use supplied country identity with deterministic visual spacing around a country anchor; this is not a precise tender coordinate. Supplier markers retain the frozen demonstration coordinates. Neither map provides live tiles, routing, distance, or current geopolitical data.

| Repository asset | Upstream source and attribution | License basis | Repository transformation |
| --- | --- | --- | --- |
| `apps/tender-apps/public/tendermatch/maps/world-map.png` | Wikimedia Commons, `File:BlankMap-World.png`; original by Vardion and subsequently adapted by the contributors named on the file page | Public domain dedication on the file page | No pixel transformation in this integration; copied byte-for-byte from TenderMatch 1 checkpoint `5423a16` (44,516 bytes; SHA-256 `adfae94603fe0b5f06e07820b1c4d6082e36a8ff6bfba546e041666cf691ef41`) |
| `apps/tender-apps/public/tendermatch/maps/china-prefectures.png` | Wikimedia Commons, `File:China blank map by prefectures.png`; AichiWikiFixer, Not logging in, 董辰兴, and original contributor ASDFGH as listed on the file page | CC BY-SA 4.0 (the file page also notes a public-domain/ineligible element); attribution, license link, and change indication are retained here | The repository copy inherited from TenderMatch 1 is a display-prepared PNG derived from the Commons file; this integration performs no further pixel transformation (561,642 bytes; SHA-256 `2ec82e057e2a5fe12dbb47c2aede7b0af9c24485bb6c1081ab45bc89f8f9bf57`) |

Source pages:

- <https://commons.wikimedia.org/wiki/File:BlankMap-World.png>
- <https://commons.wikimedia.org/wiki/File:China_blank_map_by_prefectures.png>
- CC BY-SA 4.0: <https://creativecommons.org/licenses/by-sa/4.0/>

The rendered map includes a visible Wikimedia Commons link. No external map or tile request is made during rendering; the CSS loads only the two local paths above. The China derivative remains subject to CC BY-SA 4.0. Any future pixel modification must be documented and distributed under the same or a compatible license.
