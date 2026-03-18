// sound.js — Web Audio API synthesized sound effects (no external files)

const Sound = (() => {
  let audioCtx = null;
  let muted = false;
  let masterGain = null;

  function init() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  function ensureContext() {
    if (!audioCtx) return false;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return true;
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 0.3;
    }
    return muted;
  }

  // Play a tone with optional frequency sweep
  function playTone(freq, duration, type, opts = {}) {
    if (!ensureContext()) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, audioCtx.currentTime + duration);
    }

    gain.gain.setValueAtTime(opts.volume || 0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(audioCtx.currentTime + (opts.delay || 0));
    osc.stop(audioCtx.currentTime + duration + (opts.delay || 0));
  }

  // Play noise burst (for impacts)
  function playNoise(duration, opts = {}) {
    if (!ensureContext()) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(opts.volume || 0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    // Optional filter for different textures
    if (opts.filterFreq) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = opts.filterFreq;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(masterGain);
    source.start(audioCtx.currentTime);
  }

  // --- Game-specific sounds ---

  function drawLine() {
    playTone(800, 0.08, 'sine', { freqEnd: 600, volume: 0.15 });
  }

  function eraseLine() {
    playTone(400, 0.15, 'square', { freqEnd: 200, volume: 0.1 });
  }

  function placeItem() {
    playTone(520, 0.1, 'sine', { volume: 0.3 });
    playTone(780, 0.1, 'sine', { volume: 0.2, delay: 0.05 });
  }

  function buttonClick() {
    playTone(660, 0.06, 'sine', { volume: 0.15 });
  }

  function buttonHover() {
    playTone(440, 0.03, 'sine', { volume: 0.05 });
  }

  function marbleBounce(intensity) {
    const vol = Math.min(0.4, 0.1 + intensity * 0.05);
    playNoise(0.06, { volume: vol, filterFreq: 2000 + intensity * 500 });
    playTone(300 + intensity * 100, 0.08, 'sine', { freqEnd: 200, volume: vol * 0.5 });
  }

  function bucketCapture(isJackpot) {
    if (isJackpot) {
      // Triumphant fanfare
      playTone(523, 0.2, 'sine', { volume: 0.4 });
      playTone(659, 0.2, 'sine', { volume: 0.4, delay: 0.15 });
      playTone(784, 0.2, 'sine', { volume: 0.4, delay: 0.3 });
      playTone(1047, 0.4, 'sine', { volume: 0.5, delay: 0.45 });
    } else {
      // Happy ding
      playTone(880, 0.15, 'sine', { volume: 0.35 });
      playTone(1100, 0.2, 'sine', { volume: 0.3, delay: 0.1 });
    }
  }

  function marbleDrop() {
    playTone(200, 0.3, 'sine', { freqEnd: 100, volume: 0.2 });
    playNoise(0.1, { volume: 0.15, filterFreq: 800 });
  }

  function roundStart() {
    playTone(440, 0.1, 'triangle', { volume: 0.25 });
    playTone(550, 0.1, 'triangle', { volume: 0.25, delay: 0.12 });
    playTone(660, 0.15, 'triangle', { volume: 0.3, delay: 0.24 });
  }

  function phaseTransition() {
    playTone(330, 0.15, 'sine', { freqEnd: 660, volume: 0.2 });
  }

  function shopBuy() {
    playTone(600, 0.08, 'sine', { volume: 0.2 });
    playTone(900, 0.12, 'sine', { volume: 0.25, delay: 0.06 });
  }

  function gameOver(won) {
    if (won) {
      // Victory fanfare
      [523, 659, 784, 1047].forEach((f, i) => {
        playTone(f, 0.3, 'sine', { volume: 0.3, delay: i * 0.18 });
        playTone(f * 0.5, 0.3, 'triangle', { volume: 0.15, delay: i * 0.18 });
      });
    } else {
      // Sad trombone
      playTone(311, 0.3, 'triangle', { volume: 0.25 });
      playTone(293, 0.3, 'triangle', { volume: 0.25, delay: 0.3 });
      playTone(277, 0.3, 'triangle', { volume: 0.25, delay: 0.6 });
      playTone(261, 0.6, 'triangle', { volume: 0.3, delay: 0.9 });
    }
  }

  function denied() {
    playTone(200, 0.15, 'square', { volume: 0.15 });
    playTone(150, 0.2, 'square', { volume: 0.12, delay: 0.12 });
  }

  function simulate() {
    playTone(440, 0.08, 'sine', { freqEnd: 880, volume: 0.15 });
    playNoise(0.05, { volume: 0.1, filterFreq: 3000 });
  }

  return {
    init, toggleMute,
    drawLine, eraseLine, placeItem,
    buttonClick, buttonHover,
    marbleBounce, bucketCapture, marbleDrop,
    roundStart, phaseTransition, shopBuy,
    gameOver, denied, simulate,
    get muted() { return muted; },
  };
})();
