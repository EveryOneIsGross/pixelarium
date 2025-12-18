Below is a *conceptual walk-through* of the audio “synthesizer” parts of your script, split into two big subsystems:

1. **Procedural water / environmental noise bed** (“the noise”).
2. **Per-worm FM voices + short event accents** (“the worms”).

I’ll first give you the high-level signal flow (so you can picture the routing graph), then drill into each subsystem, and finally point out where in the sim loop each piece gets driven.

---

## Global audio plumbing (common to both)

```text
[Various Sources] ─▶ master(Gain) ─▶ limiter(DynamicsCompressor) ─▶ audioCtx.destination
```

* `audioCtx` is the Web Audio context.
* `master` is your master volume fader; you fade it in after “audio unlock,” and mute/unmute in `toggleSound()`.
* A *brickwall-ish* limiter (`DynamicsCompressor`) is inserted after `master` to catch transients and prevent nasty clipping when a bunch of voices fire together.

Everything you synthesize—water noise, worm movements/events, legacy one-shot cues—ultimately feed the `master` node (directly or via sub-gains along the way).

---

# 1. Water / Environmental Noise Engine (“the noise”)

### Goals

Provide a continuous ambience whose timbre and level change with:

* **How much water** is on the board (coverage & density).
* **How active** that water is (falling / moving count).
* **Global “material tone” average**, so the rest of the world’s materials bias the spectral color.
* **Occasional “splash” accents** for discrete interactions (fire hits water, lava hits water, etc.).

### Shared raw noise

```js
const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
// Fill with white noise:
for (...) data[i] = (Math.random() * 2 - 1);
```

A 2-second mono white-noise buffer is looped. Each time the water system (re)starts, you build a new `BufferSource` that reads this buffer.

### High-level routing

When `createWaterNoiseSystem()` is called you build a *mini mixing rig*:

```
        newNoise(BufferSource white noise, loop)
              │
              ├──▶ noiseFilter(lowpass; cutoff modulated by world tone & activity) ─▶ surfGain ─▶
              │                                                                        │
              ├──▶ newLowNoise(lowpass ~400 Hz) ─┐                                     │
              │                                  ├──▶ crossfade(Gain) ─┐               │
              └──▶ newHighNoise(highpass ~2.4k) ─┘                     │               │
                                                                        ├──▶ mixer(Gain0.5) ─▶ waterNoiseGain ─▶ master
surfGain.gain  ⇐ main slow LFO ("breathing" texture)
waterNoiseGain.gain ⇐ activity envelope + splash LFO bumps
crossfade.gain ⇐ density/energy → spectral tilt (bass vs hiss)
```

**Nodes:**

* `noiseFilter` (shared lowpass \~BASE\_CUTOFF) = “material tone” bed. Its cutoff is recalculated from the average `MATERIAL_TONE` of all cells + current water activity (`calcAmbientCutoff()` → `updateWaterNoise()`).
* `newLowNoise` / `newHighNoise` split the broadband noise into bass rumble vs hiss.
* `crossfade` = a *single* gain controlling how much of that dual-band path is mixed in (actually you send *both* low & high into it, but you modulate its gain to lean the mix spectral energy one way or another).
* `surfGain` = gain before the main `mixer` for the “surf” (filtered) component; this is modulated slowly by `newLfo` (breathing) and briefly by `newSplashLFO` during splash accents.
* `mixer` adds the surf path and the dual-band crossfade path, sends to `waterNoiseGain`, which you connect to `master` only while water ambience is active.

### Lifecycle

* **Lazy start:** `updateWaterNoise(falling)` monitors the sim. If there is *any* water and sound is enabled & not paused, it ensures the noise system is built (`createWaterNoiseSystem()`), connects `waterNoiseGain` to `master`, and fades up.
* **Auto stop:** If no water, paused, or sound off, it ramps `waterNoiseGain.gain` down and later disconnects to save CPU.

### Quantities you compute

`countWaterDensity()` returns:

* `count`: # of water pixels.
* `density`: per-pixel neighbor water ratio (0..1, clusteriness).

`updateWaterNoise(falling)` uses:

* `waterCoverage = count / totalCells`.
* `falling` = number of downward water moves this frame (passed in by the sim loop).
* `lastWaterActivity` + time decay → smoother lingering ambience even after action stops.

#### Volume logic

```
ambientGain = min(waterCoverage * 0.08, 0.002); // very quiet base bed
activityDecay = exp(-timeSinceActivity * 1);
targetMovement = min(falling/8, 0.01) * activityDecay;
smoothedMovement ... (attack/decay smoothing)
totalGain = ambientGain + smoothedMovement;
waterNoiseGain.gain.setTargetAtTime(totalGain, now, timeConstant);
```

So: more water → slightly higher floor; more *moving* water → transient surges that decay.

#### Texture (LFO depth)

`currentWaterNodes.lfoDepth.gain` gets `baseLfoDepth` from density plus `activityLfoBoost` on movement. This modulates `surfGain.gain` slowly—producing a gentle “breathing / churning” sense that thick water masses feel heavier.

#### Spectral tilt (bass ↔ hiss)

You compute `densityBass = 0.2 + density * 0.7;`
Then subtract a chunk from that when water is energetic (movement); invert into `crossfade.gain` so sparse water yields more hiss, dense quiet water pushes toward bassy rumble. Results in an intuitive auditory “weight.”

### Splash accents

`triggerSplashAccent(splashIntensity, waterPixels, cueName)`

* Kicked by discrete interactions: fire hitting water, lava vaporizing, dirt sprouting, acid fizz, etc. (See calls in the simulation’s interaction pass.)
* Adjusts the **splash LFO** (`currentWaterNodes.splashLFO` freq & `splashLFOGain.gain` envelope) which modulates `waterNoiseGain.gain` briefly—tiny tremolo “splashes.”
* Optionally colors parameters using `AUDIO_CUES[cueName]()` (maps event type to a base freq / env / vibrato pattern used elsewhere; here you only mine a couple of those values to shape the splash modulation).

Because splashes piggyback on the already-running ambience, you don’t create a new sound each time; you just *shake* the existing water bed.

---

# 2. Worm Synth Voices (“the worms”)

Each worm can have its **own persistent 3-oscillator FM voice** that gets *poked* for movement and discrete events (eating, mating, dying, contacting new materials). Because Web Audio nodes are not cheap, you cap active voices.

### Voice allocation

* `MAX_SYNTH_VOICES = 24`.
* `attachAudioVoice(worm)` tries to allocate a full synth; if at cap, you give the worm a “dummy voice” struct (`hasVoice:false`) so the logic can safely no-op audio calls.
* On worm death you free its slot (`allocatedVoices.splice`) and call `reallocateVoiceToSilentWorm()` to upgrade an older silent worm if a slot opens.

### Per-worm voice architecture

When a full voice is created:

```
                   modulator (sine) ─┬─▶ mod1Gain ─▶ carrier1.detune
                                    └─▶ mod2Gain ─▶ carrier2.detune

carrier1 (sine baseFreq) ─▶ carrier1Gain ─┐
carrier2 (sine baseFreq*1.5) ─▶ carrier2Gain ─┤
                                             ├─▶ voiceGain ─┬─▶ master  (movement bed)
                                             │              │
                                             │              └─▶ eventEnv(Gain) ─▶ eventAmp(Gain) ─▶ master (punctual events)
```

Key ideas:

* **FM via detune**: Instead of routing modulator into frequency directly (which risks negative freq / discontinuities), you route into `detune` in cents. Gains (`mod1Gain`, `mod2Gain`) therefore set *FM index in cents.* You scale the numeric values higher for cents (e.g., 150 vs “20”).
* **Two carriers**: `carrier1` is always present (main “voice”). `carrier2` is normally silent, activated for richer timbres during “events” (mating/eating, etc.).
* **Two amplitude domains**:

  * `voiceGain` = short pips when the worm *moves* (or a sustained component if you ever extend it). This is the “continuously tickled” part.
  * `eventEnv→eventAmp` = *accent path* layered on top for discrete events; it gives you sharper, louder, quickly-decaying blips without permanently raising the bed.

### Parameters baked in at creation

* `baseFreq = 160 + (worm.id % 8) * 25` gives each worm a slightly different pitch family so a crowd doesn’t phase in unison.
* Carriers start at `baseFreq` & `baseFreq*1.5` (a perfect fifth).
* Modulator starts at `baseFreq*2` (simple 2:1 ratio); you later retune via **detune** for events.

### Movement audio (`playWormMovement(worm, moveData)`)

Called in `executeWormMove()` *once per actual move*, but throttled: only every 4th frame to keep chatter down.

What it does:

1. **Mood from memory:** Average of `worm.memory.weight` influences modulation rate (`modRate` 1-6 Hz) and FM depth.
2. **Movement vector magnitude:** sqrt(dx²+dy²) nudges the carrier frequency upward (“faster = higher squeak”) and volume.
3. Smooth ramps (`linearRampToValueAtTime`) to avoid clicks.
4. Only `carrier1` is used for movement; `carrier2` stays silent (gain→0). Movement = quick attack + quick decay envelope on `voiceGain`; FM depth pops up briefly via `mod1Gain`.
5. After envelope: exponential fall to near-zero to clear space for next move.

Result: a soft “peep/chirp” correlated with how vigorously the worm moved and its current emotional memory.

### Event audio (`playWormEvent(worm, eventType)`)

Triggered variously:

* `executeWormMove()` when worm eats a tree (`eating`) or first steps onto a new material cell (`material`).
* `attemptWormBreeding()` for parents (`mating`).
* `removeWorm()` for `dying`.

**Shared mood math:** A “Lydian flavor” melodic bias derived from worm memory. You pick an interval multiplier from `[1, 9/8, 5/4, 11/8]` and semitone offset from memory weight, giving each worm expressive contour.

Event branches:

#### Mating

* Retune both carriers *upwards* (playful, excited) using detune (cents).
* Modulator sped up (`modFreq = moodFreq * 3`).
* Bring in `carrier2` (gain \~0.05) for richer chord.
* FM depths large (150/200 cents swings).
* Event envelope: fast attack, very short; `eventAmp.gain` pops up (\~0.18) then decays; afterwards you fade the extra gains back down.

#### Eating

* Retune *down* (satiated); `carrier2` somewhat louder than 1.
* Moderate FM depths (100/120).
* Envelope longer than mating but still short; amplitude \~0.15 peak.

#### Dying / Material

* Single-carrier beep (carrier2 stays silent).
* Dying: lower, longer (\~0.4s), a bit louder.
* Material: ultra-short blip (\~0.04s) when stepping onto a new substrate (variety of footstep-ish pips).
* FM depth scaled according to event type.

All use the safer `smoothSet()` wrapper to avoid sudden parameter jumps → clicks.

### Material contact gating

In `executeWormMove()` after relocating the worm, you read the substrate you just stepped *onto* (`nextSubstrate`). If this differs from the last material the voice touched, you call `playWormEvent(worm,'material')`. This is how the audio “footsteps” track transitions: sand vs water vs glass etc. The sonic differences come from the mood retune path; if you want more material-specific color you could fold in `MATERIAL_TONE[nextSubstrate]` (you’ve stored that table for future expansion).

### Memory influences

Memories accumulate weights ±5 based on successes (finding food, breeding) and failures. These weights feed both `playWormMovement()` (mod rate, depth) and `playWormEvent()` (pitch selection). Thus worms that *learn* good behaviors literally “sound” different over time.

---

# 3. Legacy one-shot cue helper (`playCue()`)

You still have a generic `playCue(name, detuneSemis)` that:

* Looks up an `AUDIO_CUES[name]()` preset (base pitch, envelope, vibrato spec).
* Spawns a *temporary* single sine oscillator → gain → master, applies `envelope()` + `vibrato()`, stops & cleans up \~1s later.

You mostly transitioned to the newer systems (water splashes + per-worm events), but `playCue()` remains if you want simple UI bleeps.

`AUDIO_CUES` table is also used by `triggerSplashAccent()` (for parameter hints) and could be reused to material-color worm events if you choose.

---

# 4. Driving it from the Simulation Loop

Where everything is tied together:

| Sim Code Location                                                                        | Audio Call                                        | What triggers it                                     | Audible Effect                                                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `updateSimulation()` end (every \~10 frames)                                             | `updateWaterNoise(fallingWaterThisFrame)`         | Count of water pixels that moved downward this frame | Ambient water bed level / tone auto-adjust.                             |
| Interaction pass (fire vs water, dirt sprouts, lava vs water, acid neutralization, etc.) | `triggerSplashAccent(intensity, null, 'cueName')` | Discrete mixed-material hits                         | Brief tremolo accent (and sometimes param coloring) over ambient water. |
| `executeWormMove()`                                                                      | `playWormMovement(worm, selectedMove)`            | Any actual worm motion (throttled 1/4 frames)        | Quick chirp sized by move speed & mood.                                 |
| `executeWormMove()` when stepping on TREE → eating                                       | `playWormEvent(worm,'eating')`                    | Worm consumes food                                   | Downward 2-carrier burp.                                                |
| `executeWormMove()` when substrate changed                                               | `playWormEvent(worm,'material')`                  | Footstep / material contact                          | Tiny blip.                                                              |
| `attemptWormBreeding()` success                                                          | `playWormEvent(worm,'mating')` (both parents)     | Breeding completed                                   | Upward, lively 2-carrier sparkle.                                       |
| `removeWorm()`                                                                           | `playWormEvent(worm,'dying')`                     | Worm dies                                            | Lower, longer lament; voice nodes then fade & stop.                     |

---

# 5. Utility Envelopes & Modulations

### `envelope({attack,decay,sustain,release}, gainNode)`

A generic ADSR used by `playCue()`; note the release uses `setTargetAtTime` exponential fade.

### `vibrato(osc,{freq,depth})`

Creates a short-lived LFO oscillator that modulates the target oscillator’s *frequency param* through a `Gain` depth. Auto-stops after 0.14s; used in the one-shot cue world, not the persistent worm FM world (which uses the dedicated `modulator` oscillator).

### `smoothSet(param,value,t,ramp)`

Tiny linear ramp helper to avoid discontinuities (pops) whenever you slam a param.

---

# 6. How “Material Tone” ties in

You defined `MATERIAL_TONE` for several materials (`freq`,`depth`). Currently it’s used to compute an **average world tone**:

```js
function calcAmbientCutoff(){
  let acc=0,cells=0;
  ...
  const tone = MATERIAL_TONE[id];
  if(tone){ acc += tone.freq; cells++; }
  ...
  return BASE_CUTOFF + avg * TONE_TO_CUTOFF;
}
```

`updateWaterNoise()` calls this periodically and applies the result (plus activity boost) to the `noiseFilter.frequency`. So if, say, lots of FIRE is present (660), the water bed’s filtered component brightens; lots of DIRT (110) darkens it. You’ve laid the groundwork to do even richer cross-modulation (e.g., feed `tone.depth` into LFO depth or into worm “material” events).

---

# 7. Voice cleanup (memory / CPU safety)

Because each worm’s voice is a cluster of live oscillators:

* On worm death, you trigger a dying event envelope, schedule oscillators to stop after envelope completes, *disconnect* them, and mark `hasVoice=false`.
* You immediately free the slot in `allocatedVoices`, then call `reallocateVoiceToSilentWorm()` so long-lived silent worms can gain voices later.
* Water ambience nodes are also torn down and rebuilt cleanly when water recurs (`createWaterNoiseSystem()` first disconnects and stops all old node refs; defensive try/catch around `.stop()` because Web Audio throws if you stop twice).

This careful cleanup helps keep the tab from leaking nodes after long play sessions.

---

# 8. Quick mental model / metaphor

* **Water ambience** = a *single re-usable reverb-ish pad* whose **volume** = “how much water is moving” and whose **tone** = “what the world is made of” + “how clumpy the water is.” Splashes just *wiggle* that pad.
* **Worms** = tiny FM synthesizers carrying their own personality (base pitch), mood (memory-derived pitch & modulation), and actions (events). You hear where they step, what they eat, who they meet, and when they die—sonified ecology.

---

## If you want to tweak…

**Make water louder:** raise `ambientGain` and `targetMovement` scalars; also raise `master.gain` headroom but watch limiter.

**Sharpen splash accents:** lengthen `splashLFOGain` ramp (`linearRampToValueAtTime`) and slow the decay; or instead of modulating gain, momentarily open `noiseFilter.Q` or add a short burst of raw highpassed noise.

**Material-specific footstep timbres:** in `playWormEvent(...,'material')` grab the `MATERIAL_TONE` for the substrate and use its `freq` to set `targetFreq` instead of moodFreq.

**Crowd mix density:** lower `playWormMovement()` throttle (from %4 to %3) for chattier worms, or raise to %6 for sparser audio.

---
