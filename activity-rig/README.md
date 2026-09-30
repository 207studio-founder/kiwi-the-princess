# Kiwi activity pose renderer

`activity.js` creates four deterministic action renderers from the current R3 Kiwi art and two-bone forelimb rig. Jump has five authored samples, failed has eight, keyboard running has six, and review has six. Review reuses the accepted motion-r2 bone artwork; keyboard running uses the native keyboard asset cropped to its alpha bounds.

Run `node server.mjs` and open `http://127.0.0.1:52128/` in Aside. After `await window.kiwiActivities.ready`, call `window.kiwiActivities.sample(state,index)` to render a source-size frame and `capturePNG()` to read it. The ready promise resolves to `undefined`.

`node --test activity.test.mjs` checks sample counts, authored action phases, deterministic pose data, and forelimb reach. `node capture.mjs` captures all 25 samples through Aside and writes the transparent source PNGs under `runtime/`, the contact sheet, the capture manifest, and the full execution log and exit status.
