# MediaPipe assets (self-hosted)

- `blaze_face_short_range.tflite` - BlazeFace short-range face detector (float16), 229,746 bytes.
  - Source: https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite
  - sha256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`
  - License: Apache-2.0 (Google MediaPipe model; see https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector)
- `wasm/` - copied from `node_modules/@mediapipe/tasks-vision/wasm` by `scripts/copy-mediapipe-assets.mjs` on `npm install`. Gitignored. `@mediapipe/tasks-vision` 1.1.0 is Apache-2.0.

Used only by the quiz proctoring engine (`src/lib/proctoring`). No video or images leave the browser.
