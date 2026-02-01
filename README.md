# JS Music Player POC

Proof-of-concept for MusicXML playback in the browser using Salamander piano samples.

## What it demonstrates
- Plays MusicXML via a simple parser and Tone.js sampler
- Per-part volume, pan, and mute controls
- Tempo control (rebuilds the schedule when changed)

## Run
```bash
npm install
npm run dev
```

Open the Vite URL and press Play to start audio.

## Assets
- MusicXML: `public/score.musicxml` (copied from `/tmp/Færðu mér ljósið.musicxml`)
- Salamander samples: `public/salamander/samples/` (copied from `/Users/johanngj/code/hello-expo/assets/salamander/samples`)

## Notes
- The parser is intentionally minimal and focuses on note durations/pitches for this POC.
- Tempo changes restart playback to apply new scheduling.
