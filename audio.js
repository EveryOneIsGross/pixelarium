// ═══════════════════════════════════════════════════════════════
// AUDIO.JS - Audio System & Sound Synthesis
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// Audio Context & Infrastructure
// ───────────────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let master = audioCtx.createGain();
master.gain.value = 0; // Start muted until audio unlock

// Add limiter to prevent hard clipping and amplitude discontinuities
const limiter = audioCtx.createDynamicsCompressor();
limiter.threshold.value = -1;         // start compressing just under full-scale
limiter.knee.value = 0;
limiter.ratio.value = 20;
limiter.attack.value = 0.003;
limiter.release.value = 0.020;

master.connect(limiter).connect(audioCtx.destination);

// ───────────────────────────────────────────────────────────────
// Water Noise System Infrastructure
// ───────────────────────────────────────────────────────────────
const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
const data = noiseBuffer.getChannelData(0);
for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);

// Shared filter and gain nodes for the active water noise system
const noiseFilter = audioCtx.createBiquadFilter();
noiseFilter.type = 'lowpass';
noiseFilter.frequency.value = 1400;

const waterNoiseGain = audioCtx.createGain();
waterNoiseGain.gain.value = 0;

// Global crossfade gain for density-aware color control
const crossfade = audioCtx.createGain();

let smoothedWaterCover = 0;
let waterNoiseStarted = false; // track if water noise system is running
let currentWaterNodes = null;
let smoothedMovement = 0;
let lastWaterActivity = 0; // Track when water was last active

// Constants for water noise filtering
const BASE_CUTOFF = 1400;              // current static value
const TONE_TO_CUTOFF = 5;              // Hz added per MATERIAL_TONE.freq step

// ───────────────────────────────────────────────────────────────
// Material Tone Mapping
// ───────────────────────────────────────────────────────────────
const MATERIAL_TONE = {
    [SAND]:  {freq: 220,  depth:  4},
    [WATER]: {freq: 330,  depth: 12},
    [FIRE]:  {freq: 660,  depth: 25},
    [DIRT]:  {freq: 110,  depth:  6},
    [TREE]:  {freq: 175,  depth:  8},
    [GLASS]: {freq: 440,  depth: 10},
    [STEAM]: {freq: 990,  depth: 14},
    [ACID]:  {freq: 555,  depth: 18},
    [LAVA]:  {freq: 120,  depth: 22}
};

// ───────────────────────────────────────────────────────────────
// Audio Cue Definitions
// ───────────────────────────────────────────────────────────────
const AUDIO_CUES = {
    acidFizz(){
        return {
            base: 880,
            env: {attack:0.001, decay:0.15, sustain:0.0, release:0.02},
            vibrato: {freq:40, depth:80}
        };
    },
    sandClink(){
        return {
            base: 640,
            env: {attack:0.002, decay:0.08},
            vibrato: {freq:5, depth:15}
        };
    },
    lavaBloop(){
        return {
            base: 110,
            env: {attack:0.004, decay:0.25, sustain:0.1, release:0.12},
            vibrato: {freq:3, depth:4}
        };
    },
    waterDrop(){
        return {
            base: 800,
            env: {attack:0.001, decay:0.06, sustain:0.0, release:0.01},
            vibrato: {freq:8, depth:12}
        };
    },
    steamHiss(){
        return {
            base: 1200,
            env: {attack:0.003, decay:0.2, sustain:0.05, release:0.1},
            vibrato: {freq:25, depth:30}
        };
    },
    fireCrackle(){
        return {
            base: 400,
            env: {attack:0.002, decay:0.1, sustain:0.0, release:0.05},
            vibrato: {freq:15, depth:20}
        };
    }
};

// ───────────────────────────────────────────────────────────────
// Worm Audio Voice System
// ───────────────────────────────────────────────────────────────
let allocatedVoices = [];
const MAX_SYNTH_VOICES = 16; // Balanced for performance vs richness
let movementAudioCounter = 0;

// ───────────────────────────────────────────────────────────────
// Audio Context Management
// ───────────────────────────────────────────────────────────────
let audioUnlocked = false;
let needsGesture = false;

function unlockAudio() {
    if (!audioUnlocked && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            audioUnlocked = true;
            console.log('Audio unlocked 🎵');
            // Fade in the master gain smoothly after unlock (only if sound enabled)
            if (soundEnabled) {
                const tNow = audioCtx.currentTime;
                master.gain.linearRampToValueAtTime(0.8, tNow + 0.5); // Limiter headroom
            }
        });
    }
}

// iOS/Safari audio context resume handling - background tolerant pattern
// Flag when we need a fresh user gesture to resume audio
window.addEventListener('pageshow', () => {
    if (audioCtx && audioCtx.state !== 'running') {
        needsGesture = true;
    }
});

window.addEventListener('focus', () => {
    if (audioCtx && audioCtx.state !== 'running') {
        needsGesture = true;
    }
});

// Clean pause when page goes to background
window.addEventListener('pagehide', () => {
    needsGesture = true;
    if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
    }
});

// Resume audio only from genuine user gesture handlers
['touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
        if (!needsGesture || !audioUnlocked) return;

        if (audioCtx && audioCtx.state !== 'running') {
            // Rebuild if iOS actually closed the context
            if (audioCtx.state === 'closed') {
                console.log('AudioContext closed - would need rebuild');
                return; // For now, just log this case
            }

            audioCtx.resume().then(() => {
                needsGesture = false;
                console.log('AudioContext resumed from user gesture');

                // Restore master gain if sound is enabled
                if (soundEnabled) {
                    master.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + 0.03);
                }

                // Visual feedback
                const soundToggle = document.getElementById('soundToggle');
                if (soundToggle) {
                    soundToggle.style.opacity = '0.5';
                    setTimeout(() => soundToggle.style.opacity = '1', 500);
                }
            }).catch(err => console.warn('AudioContext resume() failed', err));
        }
    }, { passive: true });
});

// ───────────────────────────────────────────────────────────────
// Synthesis Utilities
// ───────────────────────────────────────────────────────────────
function envelope({attack=0.75, decay=0.012, sustain=1.0, release=0.05}, gain){
    const now = audioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.setTargetAtTime(0, now + attack + decay, release);
}

function vibrato(osc, {freq=6, depth=7}){
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = freq;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start();
    lfo.stop(audioCtx.currentTime + 0.14);
}

function smoothSet(param, value, t, ramp = 0.002) {
    param.cancelAndHoldAtTime(t);                      // hold current value
    param.linearRampToValueAtTime(value, t + ramp);    // tiny cross-fade
}

function dispose(nodes, ...keys){
    keys.forEach(k=>{
        const n = nodes[k];
        if (!n) return;
        try { n.stop?.(); } catch(_) {}
        try { n.disconnect?.(); } catch(_) {}
    });
}

// ───────────────────────────────────────────────────────────────
// Water Noise System
// ───────────────────────────────────────────────────────────────
function countWaterStats() {
    let waterPixelCount = 0;
    let totalDensity = 0;

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === WATER) {
                waterPixelCount++;
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                            if (grid[ny][nx] === WATER) neighbors++;
                        }
                    }
                }
                totalDensity += neighbors / 8;
            }
        }
    }

    return {
        count: waterPixelCount,
        density: waterPixelCount > 0 ? totalDensity / waterPixelCount : 0
    };
}

function createWaterNoiseSystem() {
    // ▸ dispose the previous nodes before building a new one
    if (currentWaterNodes) {
        dispose(currentWaterNodes,
            'noise','lfo','splashLFO','lfoDepth',
            'splashLFOGain','lowNoise','highNoise',
            'surfGain','mixer');
    }

    // Always disconnect shared filter to prevent pile-up
    try {
        noiseFilter.disconnect();
    } catch(e) {} // Ignore if already disconnected

    // Create new noise buffer source
    const newNoise = audioCtx.createBufferSource();
    newNoise.buffer = noiseBuffer;
    newNoise.loop = true;

    // Create new LFO with fresh gain node for subtle modulation
    const newLfo = audioCtx.createOscillator();
    newLfo.type = 'sine';
    newLfo.frequency.value = 0.035;
    const newLfoDepth = audioCtx.createGain();
    newLfoDepth.gain.value = 0.025; // Very subtle breathing

    // Create new splash LFO with fresh gain node
    const newSplashLFO = audioCtx.createOscillator();
    newSplashLFO.type = 'sine';
    newSplashLFO.frequency.value = 8;
    const newSplashLFOGain = audioCtx.createGain();
    newSplashLFOGain.gain.value = 0; // Start silent

    // Create fresh dual-band filters for this instance
    const newLowNoise = audioCtx.createBiquadFilter();  // 400 Hz rumble
    newLowNoise.type = 'lowpass';
    newLowNoise.frequency.value = 400;

    const newHighNoise = audioCtx.createBiquadFilter(); // 4 kHz hiss
    newHighNoise.type = 'highpass';
    newHighNoise.frequency.value = 2400;

    // Create surface gain for LFO modulation (separate from envelope)
    const surfGain = audioCtx.createGain();
    surfGain.gain.value = 1;

    // Connect everything - world state controls envelope, LFOs control texture
    newNoise.connect(noiseFilter);
    newNoise.connect(newLowNoise);
    newNoise.connect(newHighNoise);

    // Route dual-band through crossfade, main filter through surfGain, then combine
    newLowNoise.connect(crossfade);   // Low band to crossfade
    newHighNoise.connect(crossfade);  // High band to crossfade
    noiseFilter.connect(surfGain);    // Main MATERIAL_TONE filter through surfGain

    // Create mixer for both paths
    const mixer = audioCtx.createGain();
    mixer.gain.value = 0.5; // Balance both sources
    surfGain.connect(mixer);     // Main filter path
    crossfade.connect(mixer);    // Density crossfade path
    mixer.connect(waterNoiseGain); // Combined output

    // Main LFO modulates surface texture, splash LFO modulates main envelope for prominence
    newLfo.connect(newLfoDepth).connect(surfGain.gain);
    newSplashLFO.connect(newSplashLFOGain).connect(waterNoiseGain.gain);

    // Start all
    newNoise.start();
    newLfo.start();
    newSplashLFO.start();

    // Store references for cleanup and control
    return {
        noise: newNoise,
        lfo: newLfo,
        lfoDepth: newLfoDepth,
        splashLFO: newSplashLFO,
        splashLFOGain: newSplashLFOGain,
        lowNoise: newLowNoise,
        highNoise: newHighNoise,
        surfGain: surfGain,
        mixer: mixer
    };
}

function calcAmbientCutoff() {
    // scan whole grid once per ½-second tick
    let acc = 0, cells = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const id = grid[y][x];
            const tone = MATERIAL_TONE[id];
            if (tone) { acc += tone.freq; cells++; }
        }
    }
    const avg = cells ? acc / cells : 0;
    return BASE_CUTOFF + avg * TONE_TO_CUTOFF;   // map 0-1100 Hz to ~cutoff
}

function updateWaterNoise(falling) {
    const now = audioCtx.currentTime;
    const waterData = countWaterStats();

    // Stop everything if paused, sound disabled, or no water exists
    if (isPaused || !soundEnabled || waterData.count === 0) {
        if (waterNoiseStarted) {
            waterNoiseGain.gain.setTargetAtTime(0, now, 0.02); // Longer decay
            // Disconnect after fade
            setTimeout(() => {
                if (waterNoiseStarted) {
                    waterNoiseGain.disconnect();
                    waterNoiseStarted = false;
                }
            }, 600);
        }
        smoothedMovement = 0;
        return;
    }

    // Water exists - start system if needed
    if (!waterNoiseStarted) {
        currentWaterNodes = createWaterNoiseSystem();
        waterNoiseGain.connect(master);
        waterNoiseStarted = true;
        smoothedMovement = 0; // Reset smoothed movement
        // Cancel any scheduled changes and start fresh
        waterNoiseGain.gain.cancelAndHoldAtTime(now);
        waterNoiseGain.gain.setValueAtTime(0, now);
    }

    // Track water activity for persistent decay
    if (falling > 0) {
        lastWaterActivity = now;
    }

    // Update filter cutoff based on material tones + falling water activity (once every 15 frames)
    if (treeUpdateCounter % 6 === 0) {
        const baseCutoff = calcAmbientCutoff();
        const activityBoost = Math.min(falling * 2, 800); // Up to +800Hz for high activity
        const target = baseCutoff + activityBoost;
        noiseFilter.frequency.setTargetAtTime(target, now, 0.5); // gentle slide
    }

    // Base ambient volume proportional to water pixel count (reduced)
    const waterCoverage = waterData.count / (GRID_WIDTH * GRID_HEIGHT);
    const ambientGain = Math.min(waterCoverage * 0.008, 0.002); // Reduced sustain

    // Movement creates transient bursts with decay
    const timeSinceActivity = now - lastWaterActivity;
    const activityDecay = Math.max(0, Math.exp(-timeSinceActivity * 1)); // 2s decay

    // Main volume control based on falling activity
    const targetMovement = Math.min(falling / 8, 0.01) * activityDecay;

    const smoothing = falling > 0 ? 0.15 : 0.5; // Faster attack, slower decay
    smoothedMovement += (targetMovement - smoothedMovement) * smoothing;

    // Total gain = reduced ambient + decaying movement
    const totalGain = ambientGain + smoothedMovement;

    // LFO depth based on water density and activity (modulates texture, not volume)
    const baseLfoDepth = waterData.density * 0.005;
    const activityLfoBoost = activityDecay * 0.003;
    const lfoDepth = baseLfoDepth + activityLfoBoost;

    if (currentWaterNodes && currentWaterNodes.lfoDepth) {
        currentWaterNodes.lfoDepth.gain.setTargetAtTime(lfoDepth, now, 0.3);
    }

    // Density-aware noise coloring: density 0..1 → bass ratio, with falling water energy sweep
    const densityBass = 0.2 + waterData.density * 0.7;
    // Smoothly sweep toward highs when water is energetic (falling)
    const targetBass = densityBass - (smoothedMovement * 15); // Use existing smoothed movement
    crossfade.gain.setTargetAtTime(1 - Math.max(0.1, targetBass), now, 0.2); // Invert: sparse=high, dense=low

    // Faster transitions for more responsive feel
    const timeConstant = falling > 0 ? 0.05 : 0.5; // Quick attack, slower decay
    waterNoiseGain.gain.setTargetAtTime(totalGain, now, timeConstant);
}

function triggerSplashAccent(splashIntensity = 1, waterPixels = null, cueName = null) {
    const now = audioCtx.currentTime;

    // Only trigger if water noise system is running
    if (!waterNoiseStarted || !currentWaterNodes) return;

    // For splash effects, we need actual water involvement in the interaction
    // The calling code should pass waterPixels from the specific interaction
    if (waterPixels === null) {
        waterPixels = countWaterStats().count;
    }

    if (waterPixels === 0) return; // No water = no splash

    const waterCoverage = waterPixels / (GRID_WIDTH * GRID_HEIGHT);

    // Get cue-specific modulation parameters
    let LFO_DEPTH = waterCoverage * splashIntensity * 0.008; // Base depth
    let LFO_FREQ = Math.max(3, 12 - (splashIntensity * 4)); // Base frequency

    // Apply audio cue modulation to noise characteristics
    if (cueName && AUDIO_CUES[cueName]) {
        const cue = AUDIO_CUES[cueName]();
        // Map cue frequency to LFO modulation
        const freqInfluence = (cue.base - 400) / 800; // Normalize around 400Hz
        LFO_FREQ = Math.max(2, LFO_FREQ + (freqInfluence * 6));

        // Map cue vibrato to depth modulation
        if (cue.vibrato) {
            const vibratoInfluence = cue.vibrato.depth / 50; // Normalize vibrato depth
            LFO_DEPTH *= (1 + vibratoInfluence * 0.5);
        }
    }

    if (LFO_DEPTH > 0) {
        // Use the current water nodes' splash LFO
        currentWaterNodes.splashLFO.frequency.setValueAtTime(LFO_FREQ, now);
        currentWaterNodes.splashLFOGain.gain.cancelAndHoldAtTime(now);
        currentWaterNodes.splashLFOGain.gain.linearRampToValueAtTime(LFO_DEPTH, now + 0.008);
        currentWaterNodes.splashLFOGain.gain.linearRampToValueAtTime(0, now + 0.035);
    }
}

// ───────────────────────────────────────────────────────────────
// Audio Cues
// ───────────────────────────────────────────────────────────────
function playCue(name, detuneSemis = 0){
    if(!AUDIO_CUES[name]) return;
    const p = AUDIO_CUES[name]();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = p.base * Math.pow(2, detuneSemis/12);
    osc.connect(gain).connect(master);

    envelope(p.env, gain);
    if(p.vibrato) vibrato(osc, p.vibrato);

    osc.start();
    const stopTime = audioCtx.currentTime + 1;
    osc.stop(stopTime);

    // Cleanup nodes after stop to prevent memory leaks
    setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
    }, 1100); // Slightly after stop time
}

// ───────────────────────────────────────────────────────────────
// Worm Audio Voice System
// ───────────────────────────────────────────────────────────────
function attachAudioVoice(worm) {
    // Check if we've hit the voice limit (but allow upgrading silent worms)
    if (allocatedVoices.length >= MAX_SYNTH_VOICES &&
        (!worm.voice || worm.voice.hasVoice === true)) {
        // No voice allocated - worm will be silent
        worm.voice = {
            baseFreq: 160 + (worm.id % 8) * 25,
            lastMaterial: EMPTY,
            id: worm.id,
            isActive: false,
            hasVoice: false
        };
        return;
    }

    // Create persistent FM voice for this worm
    const baseFreq = 160 + (worm.id % 8) * 25; // Slight pitch variation per worm

    // Dual carrier FM synthesis
    const carrier1 = audioCtx.createOscillator();
    const carrier1Gain = audioCtx.createGain();
    const carrier2 = audioCtx.createOscillator();
    const carrier2Gain = audioCtx.createGain();

    // Modulator oscillator (for FM)
    const modulator = audioCtx.createOscillator();
    const mod1Gain = audioCtx.createGain();
    const mod2Gain = audioCtx.createGain();

    // Voice envelope gain
    const voiceGain = audioCtx.createGain();

    // Event envelope and amplifier
    const eventEnv = audioCtx.createGain();
    const eventAmp = audioCtx.createGain();

    carrier1.type = 'sine';
    carrier2.type = 'sine';
    modulator.type = 'sine';
    // Fixed carrier frequencies (never change during FM)
    carrier1.frequency.value = baseFreq;
    carrier2.frequency.value = baseFreq * 1.5; // Perfect fifth
    modulator.frequency.value = baseFreq * 2; // 2:1 ratio

    // Initialize detune parameters for FM (in cents)
    carrier1.detune.value = 0;
    carrier2.detune.value = 0;

    // Start silent
    carrier1Gain.gain.value = 0.12; // Primary carrier
    carrier2Gain.gain.value = 0; // Secondary carrier (silent until events)
    mod1Gain.gain.value = 0; // No modulation until triggered
    mod2Gain.gain.value = 0; // No modulation until triggered
    voiceGain.gain.value = 0; // Start silent
    eventEnv.gain.value = 0; // Event envelope starts silent
    eventAmp.gain.value = 1; // Event amplifier unity gain

    // FM routing: modulator drives detune (cents) to avoid 0Hz crossings
    modulator.connect(mod1Gain).connect(carrier1.detune);
    modulator.connect(mod2Gain).connect(carrier2.detune);
    carrier1.connect(carrier1Gain).connect(voiceGain);
    carrier2.connect(carrier2Gain).connect(voiceGain);

    // Dual path: voiceGain for movement, eventEnv for events
    voiceGain.connect(master); // Movement path
    voiceGain.connect(eventEnv).connect(eventAmp).connect(master); // Event path

    carrier1.start();
    carrier2.start();
    modulator.start();

    worm.voice = {
        baseFreq,
        carrier1,
        carrier2,
        modulator,
        carrier1Gain,
        carrier2Gain,
        mod1Gain,
        mod2Gain,
        voiceGain,
        eventEnv,
        eventAmp,
        lastMaterial: EMPTY,
        id: worm.id,
        isActive: false,
        hasVoice: true
    };

    // Add to allocated voices tracking
    allocatedVoices.push(worm);
}

function playWormMovement(worm, moveData) {
    if (!worm.voice || !worm.voice.hasVoice) return;

    // Throttle: only play movement audio every 4th frame
    movementAudioCounter++;
    if (movementAudioCounter % 4 !== 0) return;

    const v = worm.voice;
    const now = audioCtx.currentTime;

    // Calculate mood-based modulation from memories
    const mood = worm.memory.reduce((s, m) => s + m.weight, 0) / Math.max(worm.memory.length, 1);
    const modRate = Math.max(1, Math.min(6, 2 + mood * 2)); // 1-6 Hz mod rate

    // Movement direction affects carrier frequency
    const moveVector = Math.sqrt(moveData.dx * moveData.dx + moveData.dy * moveData.dy);
    const carrierFreq = v.baseFreq * (1 + moveVector * 0.1);
    const modFreq = carrierFreq * modRate;

    // Update oscillator frequencies - only carrier1 for movement (with smoothing)
    v.carrier1.frequency.cancelScheduledValues(now);
    v.carrier1.frequency.setValueAtTime(v.carrier1.frequency.value, now);
    v.carrier1.frequency.linearRampToValueAtTime(carrierFreq, now + 0.05); // Slower for smoothness

    v.modulator.frequency.cancelScheduledValues(now);
    v.modulator.frequency.setValueAtTime(v.modulator.frequency.value, now);
    v.modulator.frequency.linearRampToValueAtTime(modFreq, now + 0.05); // Slower for smoothness

    // Movement intensity affects volume and modulation depth
    const intensity = Math.abs(moveData.dx) + Math.abs(moveData.dy);
    const gain = 0.03 * intensity;
    const modDepth = Math.abs(mood) * 15 + 3; // 3-18 Hz FM depth (reduced)

    // Trigger voice envelope
    v.voiceGain.gain.cancelScheduledValues(now);
    v.voiceGain.gain.setValueAtTime(v.voiceGain.gain.value, now);
    v.voiceGain.gain.linearRampToValueAtTime(gain, now + 0.01);
    v.voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Movement uses only carrier1 modulation (with smoothing)
    v.mod1Gain.gain.cancelScheduledValues(now);
    v.mod1Gain.gain.setValueAtTime(v.mod1Gain.gain.value, now); // Start from current value
    v.mod1Gain.gain.linearRampToValueAtTime(modDepth, now + 0.04); // Slower ramp
    v.mod1Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.15);

    // Keep carrier2 silent for movement (smooth)
    smoothSet(v.carrier2Gain.gain, 0, now);

    v.isActive = true;
}

function reallocateVoiceToSilentWorm() {
    // Only proceed if we have available voice slots
    if (allocatedVoices.length >= MAX_SYNTH_VOICES) return;

    // Find silent worms (those with hasVoice: false)
    const silentWorms = wormList.filter(worm =>
        worm.voice && !worm.voice.hasVoice
    );

    if (silentWorms.length === 0) return;

    // Prioritize older worms (they've been waiting longer)
    silentWorms.sort((a, b) => a.id - b.id); // Lower ID = older worm

    // Give voice to the oldest silent worm
    const selectedWorm = silentWorms[0];

    // Upgrade the silent worm to have a real voice
    attachAudioVoice(selectedWorm);

    console.log(`Voice reallocated to worm ${selectedWorm.id}`);
}

function playWormEvent(worm, eventType) {
    if (!worm.voice || !worm.voice.hasVoice) return;

    const v = worm.voice;
    const now = audioCtx.currentTime;

    // Calculate mood-based frequency with Lydian intervals based on memory
    const mood = worm.memory.reduce((s, m) => s + m.weight, 0) / 5;
    const lydianIntervals = [1, 9/8, 5/4, 11/8]; // Lydian mode intervals
    const intervalIndex = Math.floor(Math.abs(mood * 4)) % 4;
    const lydianMultiplier = lydianIntervals[intervalIndex];
    const semis = Math.max(-12, Math.min(12, mood * 3));
    const moodFreq = v.baseFreq * lydianMultiplier * Math.pow(2, semis / 12);

    if (eventType === 'mating') {
        // Mating: Add second carrier with cross-modulation
        const freq1 = moodFreq * 1.2; // Slightly higher
        const freq2 = moodFreq * 1.5; // Perfect fifth
        const modFreq = moodFreq * 3; // Higher modulation rate

        // Update detune smoothly for mating (in cents to avoid 0Hz crossings)
        const detune1 = 1200 * Math.log2(freq1 / v.baseFreq); // Convert freq ratio to cents
        const detune2 = 1200 * Math.log2(freq2 / v.baseFreq);
        const modDetune = 1200 * Math.log2(modFreq / (v.baseFreq * 2));

        v.carrier1.detune.cancelAndHoldAtTime(now);
        v.carrier1.detune.linearRampToValueAtTime(detune1, now + 0.03);

        v.carrier2.detune.cancelAndHoldAtTime(now);
        v.carrier2.detune.linearRampToValueAtTime(detune2, now + 0.03);

        v.modulator.detune.cancelAndHoldAtTime(now);
        v.modulator.detune.linearRampToValueAtTime(modDetune, now + 0.03);

        // Activate both carriers with controlled volume (smooth ramps)
        const tgtTime = now + 0.010;
        v.carrier1Gain.gain.cancelAndHoldAtTime(now);
        v.carrier1Gain.gain.linearRampToValueAtTime(0.06, tgtTime);

        v.carrier2Gain.gain.cancelAndHoldAtTime(now);
        v.carrier2Gain.gain.linearRampToValueAtTime(0.05, tgtTime);

        // Cross-modulation: different depths for each carrier (with smoothing) - adjusted for cents
        v.mod1Gain.gain.cancelAndHoldAtTime(now);
        v.mod1Gain.gain.linearRampToValueAtTime(150, now + 0.05); // Scaled up for cents (was 20)

        v.mod2Gain.gain.cancelAndHoldAtTime(now);
        v.mod2Gain.gain.linearRampToValueAtTime(200, now + 0.05); // Scaled up for cents (was 30)

        // Event envelope - short and punchy with controlled volume (smooth ramp)
        v.eventAmp.gain.cancelAndHoldAtTime(now);
        v.eventAmp.gain.linearRampToValueAtTime(0.18, now + 0.003); // 3ms ramp for events (further reduced)
        // Pop-safe envelope reset and attack
        smoothSet(v.eventEnv.gain, 0, now);                   // pop-safe reset
        v.eventEnv.gain.linearRampToValueAtTime(1, now + 0.004); // Fast attack
        v.eventEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Short duration
        smoothSet(v.eventEnv.gain, 0, now + 0.08);            // return to 0 smoothly
        smoothSet(v.eventAmp.gain, 0.02, now + 0.10);         // fade eventAmp back down

        // Fade modulation to match envelope
        v.mod1Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
        v.mod2Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.08);
        v.carrier2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    } else if (eventType === 'eating') {
        // Eating: Add second carrier with parallel modulation
        const freq1 = moodFreq * 0.8; // Lower, satisfied
        const freq2 = moodFreq * 0.6; // Even lower harmonic
        const modFreq = moodFreq * 1.5; // Moderate modulation

        // Update detune smoothly for eating (in cents to avoid 0Hz crossings)
        const detune1 = 1200 * Math.log2(freq1 / v.baseFreq); // Convert freq ratio to cents
        const detune2 = 1200 * Math.log2(freq2 / v.baseFreq);
        const modDetune = 1200 * Math.log2(modFreq / (v.baseFreq * 2));

        v.carrier1.detune.cancelAndHoldAtTime(now);
        v.carrier1.detune.linearRampToValueAtTime(detune1, now + 0.03);

        v.carrier2.detune.cancelAndHoldAtTime(now);
        v.carrier2.detune.linearRampToValueAtTime(detune2, now + 0.03);

        v.modulator.detune.cancelAndHoldAtTime(now);
        v.modulator.detune.linearRampToValueAtTime(modDetune, now + 0.03);

        // Activate both carriers with controlled volume (smooth ramps)
        const tgtTime2 = now + 0.010;
        v.carrier1Gain.gain.cancelAndHoldAtTime(now);
        v.carrier1Gain.gain.linearRampToValueAtTime(0.05, tgtTime2);

        v.carrier2Gain.gain.cancelAndHoldAtTime(now);
        v.carrier2Gain.gain.linearRampToValueAtTime(0.06, tgtTime2); // Lower carrier louder

        // Parallel modulation: similar depths (with smoothing) - adjusted for cents
        v.mod1Gain.gain.cancelAndHoldAtTime(now);
        v.mod1Gain.gain.linearRampToValueAtTime(100, now + 0.05); // Scaled up for cents (was 12)

        v.mod2Gain.gain.cancelAndHoldAtTime(now);
        v.mod2Gain.gain.linearRampToValueAtTime(120, now + 0.05); // Scaled up for cents (was 15)

        // Event envelope for eating - slightly longer than mating with controlled volume (smooth ramp)
        v.eventAmp.gain.cancelAndHoldAtTime(now);
        v.eventAmp.gain.linearRampToValueAtTime(0.15, now + 0.003); // 3ms ramp for eating (further reduced)
        // Pop-safe envelope reset and attack for eating
        smoothSet(v.eventEnv.gain, 0, now);                   // pop-safe reset
        v.eventEnv.gain.linearRampToValueAtTime(1, now + 0.007); // Slower attack
        v.eventEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.12); // Slightly longer
        smoothSet(v.eventEnv.gain, 0, now + 0.12);            // return to 0 smoothly
        smoothSet(v.eventAmp.gain, 0.02, now + 0.14);         // fade eventAmp back down

        // Fade modulation to match envelope
        v.mod1Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.12);
        v.mod2Gain.gain.exponentialRampToValueAtTime(0.1, now + 0.12);
        v.carrier2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    } else {
        // Dying/Material: Simple single carrier events
        let freqMod = 1;
        let ampLevel = 0.06;
        let attack = 0.01;
        let duration = 0.06;
        let modDepth = 8;

        if (eventType === 'dying') {
            freqMod = 0.5;
            ampLevel = 0.1; // Reduced headroom
            attack = 0.02;
            duration = 0.4; // Much shorter than before (was 2.0)
            modDepth = 3;
        } else if (eventType === 'material') {
            freqMod = 1.0;
            ampLevel = 0.06; // Reduced headroom
            attack = 0.001;
            duration = 0.04; // Very short blip
            modDepth = 5;
        }

        const targetFreq = moodFreq * freqMod;
        const modFreq = targetFreq * 2;

        // Single carrier operation with smooth detune changes (in cents)
        const detune1 = 1200 * Math.log2(targetFreq / v.baseFreq);
        const modDetune = 1200 * Math.log2(modFreq / (v.baseFreq * 2));

        v.carrier1.detune.cancelAndHoldAtTime(now);
        v.carrier1.detune.linearRampToValueAtTime(detune1, now + 0.03);

        v.modulator.detune.cancelAndHoldAtTime(now);
        v.modulator.detune.linearRampToValueAtTime(modDetune, now + 0.03);
        smoothSet(v.carrier2Gain.gain, 0, now); // Keep carrier2 silent (smooth)

        // Event envelope for dying/material (smooth ramp)
        v.eventAmp.gain.cancelAndHoldAtTime(now);
        v.eventAmp.gain.linearRampToValueAtTime(ampLevel, now + 0.003); // 3ms ramp
        // Pop-safe envelope reset and attack for dying/material
        smoothSet(v.eventEnv.gain, 0, now);                   // pop-safe reset
        v.eventEnv.gain.linearRampToValueAtTime(1, now + attack + 0.002); // attack with safety buffer
        v.eventEnv.gain.exponentialRampToValueAtTime(0.001, now + duration);
        smoothSet(v.eventEnv.gain, 0, now + duration);        // return to 0 smoothly
        smoothSet(v.eventAmp.gain, 0.02, now + duration + 0.02); // fade eventAmp back down

        // Smooth modulation for single carrier events - adjusted for cents
        const centsModDepth = modDepth * 8; // Scale up for cents (3→24, 5→40)
        v.mod1Gain.gain.cancelAndHoldAtTime(now);
        v.mod1Gain.gain.linearRampToValueAtTime(centsModDepth, now + 0.04); // Slower ramp
        v.mod1Gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Fixed: was 0.1, now 0.001
    }

    v.isActive = true;
}
