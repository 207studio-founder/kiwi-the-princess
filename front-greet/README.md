# Kiwi tongue-and-tail greeting

The `waving` native row uses the approved front-sit body and existing connected tail. `rig.js` maps the central mouth/tongue pixels from a GPT-authored transparent `mouth.png` into the original lower muzzle with a feathered shader boundary. The initial full-muzzle oval read as an attached piece and was rejected during live rendering. The final patch changes only the mouth region while the tail completes one wag in 700 ms.

`capture.js` saved six actual Aside WebGL frames, including loop endpoints and the four midpoint poses used by the native timing `[140,140,140,280]` ms. `qa.py` places the source captures into contract cells through `prepare_cell`, writes `native/contact.png` and `native/native-timing.gif`, and records source hashes and measured checks in `native/qa.json`. The endpoint is pixel-exact; head and paws are unchanged across the row. Source border alpha does not exceed 1/255. The current tongue remains visible throughout the loop; only its tip sways. Current capture and visual review evidence is recorded in `execution.json` and `review.json`. Prior browser GIF playback evidence is archived under `before-held-tongue/`.

The contract marks only this source row export-ready. The full pet atlas and installed Codex player still require the other rows and final acceptance checks.
