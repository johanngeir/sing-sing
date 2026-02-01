# Learnings - Per-Voice Instrument Selection

## 2026-02-01 Session: ses_3e4990f28ffeccoN2pdX1e5Ich

### Architecture Patterns

1. **Voice state object structure** - Each voice in `state.voices` has:
   - `sampler`: Tone.Sampler instance
   - `gain`, `panner`: Audio chain components
   - `volume`, `pan`, `muted`: User settings
   - `name`, `shortName`: Display info
   - `instrument`: NEW - instrumentKey string (piano, violin, etc.)

2. **Instrument change pattern** - When changing a voice's instrument:
   ```javascript
   voice.sampler.dispose();
   const instrument = INSTRUMENTS[newInstrument];
   voice.sampler = new Tone.Sampler({...});
   voice.sampler.connect(voice.gain);
   voice.instrument = newInstrument;
   saveVoiceInstrument(voice.shortName, newInstrument);
   ```

3. **localStorage persistence** - Use JSON object keyed by shortName:
   ```javascript
   // Key: "voiceInstruments"
   // Value: {"S1":"violin","T1":"piano","B1":"cello",...}
   ```

4. **"Mixed" indicator pattern** - Check if all voices share same instrument:
   ```javascript
   const instruments = voices.map(v => v.instrument);
   const allSame = instruments.every(i => i === instruments[0]);
   // If !allSame, show disabled "Mixed" option
   ```

### Things That Worked Well

- Vitest setup with jsdom environment for browser API testing
- Following existing control row pattern for instrument dropdown
- Using `data-role="instrument"` attribute for event delegation
- Parameterizing `createVoiceState()` with default value maintained backward compatibility

### Gotchas

- The INSTRUMENTS constant uses lowercase keys (piano, violin) but display names are capitalized (Piano, Violin)
- Simple view "Other Voices" needs special handling - it's not using createVoiceControlRow(), has custom HTML
- When switching Simple→Advanced, voices keep their individual instruments (no reset)
