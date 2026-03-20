// effects.js — Particle system, confetti, screen shake, floating score text

const Effects = (() => {
  let canvas, ctx;
  let particles = [];
  let floatingTexts = [];
  let shakeAmount = 0;
  let shakeDecay = 0.92;
  let confettiPieces = [];
  let confettiActive = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  // --- Particles ---

  function spawnParticles(x, y, color, count, opts = {}) {
    const speed = opts.speed || 3;
    const life = opts.life || 40;
    const size = opts.size || 3;
    const gravity = opts.gravity || 0.05;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = (0.3 + Math.random() * 0.7) * speed;
      particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.5),
        color,
        gravity,
      });
    }
  }

  function spawnTrailParticle(x, y, color) {
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: 20,
      maxLife: 20,
      size: 2 + Math.random() * 2,
      color,
      gravity: 0,
    });
  }

  function spawnBucketCapture(x, y, playerColor) {
    spawnParticles(x, y, playerColor, 30, { speed: 5, life: 50, size: 4, gravity: 0.08 });
    // Extra sparkle ring
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      particles.push({
        x, y,
        vx: Math.cos(angle) * 4,
        vy: Math.sin(angle) * 4,
        life: 35,
        maxLife: 35,
        size: 2,
        color: '#ffffff',
        gravity: 0,
      });
    }
  }

  function spawnCollisionSpark(x, y) {
    spawnParticles(x, y, '#ffffff', 5, { speed: 2, life: 15, size: 2, gravity: 0 });
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.life--;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Floating Score Text ---

  function showFloatingText(text, x, y, color, size) {
    floatingTexts.push({
      text, x, y, color,
      size: size || 24,
      life: 60,
      maxLife: 60,
      vy: -1.5,
    });
  }

  function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.vy *= 0.97;
      ft.life--;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function drawFloatingTexts() {
    for (const ft of floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${Math.round(ft.size * scale)}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  // --- Screen Shake ---

  function triggerShake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
  }

  function applyShake() {
    if (shakeAmount < 0.5) {
      shakeAmount = 0;
      return;
    }
    const dx = (Math.random() - 0.5) * shakeAmount * 2;
    const dy = (Math.random() - 0.5) * shakeAmount * 2;
    ctx.translate(dx, dy);
    shakeAmount *= shakeDecay;
  }

  function resetShake() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- Confetti ---

  function startConfetti(winnerColor, width, height) {
    confettiActive = true;
    confettiPieces = [];
    const w = width || CONFIG.canvas.width;
    const h = height || CONFIG.canvas.height;
    const colors = [winnerColor, '#ffffff', '#ffcc00', '#44ff88', '#ff44aa', '#44ccff'];
    for (let i = 0; i < 120; i++) {
      confettiPieces.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        width: 6 + Math.random() * 6,
        height: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 180 + Math.random() * 120,
        maxY: h + 30,
      });
    }
  }

  function stopConfetti() {
    confettiActive = false;
    confettiPieces = [];
  }

  function updateConfetti() {
    if (!confettiActive) return;
    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const c = confettiPieces[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vx += (Math.random() - 0.5) * 0.3;
      c.rotation += c.rotSpeed;
      c.life--;
      if (c.life <= 0 || c.y > (c.maxY || CONFIG.canvas.height + 30)) {
        confettiPieces.splice(i, 1);
      }
    }
    if (confettiPieces.length === 0) confettiActive = false;
  }

  function drawConfetti(targetCtx) {
    if (!confettiActive) return;
    const c = targetCtx || ctx;
    for (const piece of confettiPieces) {
      const alpha = Math.min(1, piece.life / 30);
      c.save();
      c.globalAlpha = alpha;
      c.translate(piece.x, piece.y);
      c.rotate((piece.rotation * Math.PI) / 180);
      c.fillStyle = piece.color;
      c.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
      c.restore();
    }
    c.globalAlpha = 1;
  }

  // --- Update & Draw all ---

  function update() {
    updateParticles();
    updateFloatingTexts();
    updateConfetti();
  }

  function draw() {
    drawParticles();
    drawFloatingTexts();
  }

  function hasActiveEffects() {
    return particles.length > 0 || floatingTexts.length > 0 || confettiActive;
  }

  return {
    init, update, draw,
    spawnParticles, spawnTrailParticle, spawnBucketCapture, spawnCollisionSpark,
    showFloatingText,
    triggerShake, applyShake, resetShake,
    startConfetti, stopConfetti, drawConfetti, updateConfetti,
    hasActiveEffects,
    get confettiActive() { return confettiActive; },
  };
})();
