# Kiwi front sitting rig

`rig.js` exports `createFrontSit` and `createRig`. Pass `{ THREE, assetsBase }` or `{ THREE, assetBase }`, await `ready`, add `group` to an orthographic scene with Y up, and call `setTime(seconds)` for deterministic random access. The stage is 520 × 590 pixels, centered at the group origin, with a 3.2-second loop. Call `dispose()` when finished.

`body-native.png`, `tail-native.png`, and `tail-angle-native.png` are source artwork. Run `python3 source/prepare_front_sit.py` from the R4 directory to regenerate the registered textures and `tail-profiles.js`. Registration uses one uniform affine scale per complete view and premultiplied-alpha resampling. `registration.json` records source and output hashes, placement, and alpha bounds. `tail.png` retains the original upright tail as a registered baseline; the live rig uses `tail-left.png`, `tail-center.png`, and `tail-right.png`.

The tail uses one continuous ribbon mesh. Each view samples its own texture with UV coordinates aligned to the row-wise alpha silhouette. The projected row width, painted view, and small depth twist vary with the wag angle. The root stays behind the body at stage (260, 480); the tip follows with an 8° lag. The body mesh breathes laterally by at most 1.15 px in the chest; the head and paw region stay fixed.

The source rig was checked for native artwork hashes, registration clipping, loop timing, root and paw anchors, breathing amplitude, angle contours, stage bounds, and mesh orientation. Preview notes and image evidence refer to the original local QA workspace and are not included in this standalone repository.
The checks cover native hashes, registration clipping, the exact loop, root and paw anchors, breathing amplitude, angle contours, stage bounds, and mesh orientation. A local WebGL preview was inspected at nine front-sitting times from 0 to 3.2 seconds. That preview evidence is not included in this repository.
