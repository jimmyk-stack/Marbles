// game.js — state machine, round flow, bounce scoring, countdown, lobby demo

const Game = (() => {
  let state = 'LOBBY';
  let round = 1;
  let builderPlayer = 1;
  let p1Score = 0;
  let p2Score = 0;
  let simCount = 3;
  let p1Name = 'Player 1';
  let p2Name = 'Player 2';
  let animFrame = null;
  let dropPhaseActive = false;
  let stuckTimers = { m1: 0, m2: 0 };
  let lastDropTime = 0;
  let totalDropTime = 0;

  // Marble trail particles during drop
  let dropTrailTimer = 0;

  // Bounce tracking for scoring
  let bounceCounts = { m1: 0, m2: 0 };

  // Shop purchases queued for next round
  let bonusInk = { 1: 0, 2: 0 };
  let bonusSims = { 1: 0, 2: 0 };

  // Collision event tracking
  let collisionHandler = null;

  // Lobby demo animation
  let lobbyAnimFrame = null;

  function getPlayerScore(player) {
    return player === 1 ? p1Score : p2Score;
  }

  function deductPlayerScore(player, cost) {
    if (player === 1) p1Score -= cost;
    else p2Score -= cost;
    document.getElementById('hudP1Score').textContent = p1Score;
    document.getElementById('hudP2Score').textContent = p2Score;
  }

  // --- Lobby Demo ---

  function startLobbyDemo() {
    const lobbyCanvas = document.getElementById('lobbyCanvas');
    if (!lobbyCanvas) return;
    const lctx = lobbyCanvas.getContext('2d');
    const w = lobbyCanvas.width;
    const h = lobbyCanvas.height;

    // Bouncing demo marbles
    const demoMarbles = [];
    for (let i = 0; i < 6; i++) {
      demoMarbles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 + 1,
        color: i < 3 ? '#4488ff' : '#ff4444',
        lightColor: i < 3 ? '#88bbff' : '#ff8888',
        r: 8 + Math.random() * 4,
      });
    }

    // Demo lines
    const demoLines = [];
    for (let i = 0; i < 8; i++) {
      demoLines.push({
        x1: Math.random() * w,
        y1: 80 + Math.random() * (h - 100),
        x2: Math.random() * w,
        y2: 80 + Math.random() * (h - 100),
        color: `rgba(${100 + Math.random() * 100}, ${100 + Math.random() * 100}, 255, 0.15)`,
      });
    }

    function lobbyLoop() {
      lctx.clearRect(0, 0, w, h);

      // Background
      const grad = lctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a1e');
      grad.addColorStop(1, '#111128');
      lctx.fillStyle = grad;
      lctx.fillRect(0, 0, w, h);

      // Grid
      lctx.strokeStyle = 'rgba(100, 100, 180, 0.04)';
      lctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        lctx.beginPath();
        lctx.moveTo(x, 0);
        lctx.lineTo(x, h);
        lctx.stroke();
      }

      // Lines
      lctx.lineCap = 'round';
      for (const line of demoLines) {
        lctx.strokeStyle = line.color;
        lctx.lineWidth = 3;
        lctx.beginPath();
        lctx.moveTo(line.x1, line.y1);
        lctx.lineTo(line.x2, line.y2);
        lctx.stroke();
      }

      // Update & draw marbles
      for (const m of demoMarbles) {
        m.vy += 0.05; // gravity
        m.x += m.vx;
        m.y += m.vy;

        // Bounce off walls
        if (m.x < m.r) { m.x = m.r; m.vx *= -0.8; }
        if (m.x > w - m.r) { m.x = w - m.r; m.vx *= -0.8; }
        if (m.y > h - m.r) { m.y = h - m.r; m.vy *= -0.7; m.vx *= 0.99; }
        if (m.y < m.r) { m.y = m.r; m.vy *= -0.8; }

        // Bounce off demo lines
        for (const line of demoLines) {
          const dist = distToSeg(m.x, m.y, line.x1, line.y1, line.x2, line.y2);
          if (dist < m.r + 2) {
            const nx = -(line.y2 - line.y1);
            const ny = line.x2 - line.x1;
            const len = Math.sqrt(nx * nx + ny * ny);
            if (len > 0) {
              const nnx = nx / len, nny = ny / len;
              const dot = m.vx * nnx + m.vy * nny;
              m.vx -= 1.5 * dot * nnx;
              m.vy -= 1.5 * dot * nny;
            }
          }
        }

        // Draw marble
        const mgrd = lctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
        mgrd.addColorStop(0, m.lightColor);
        mgrd.addColorStop(0.7, m.color);
        mgrd.addColorStop(1, m.color);
        lctx.beginPath();
        lctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        lctx.fillStyle = mgrd;
        lctx.fill();

        // Highlight
        lctx.beginPath();
        lctx.arc(m.x - m.r * 0.2, m.y - m.r * 0.2, m.r * 0.25, 0, Math.PI * 2);
        lctx.fillStyle = 'rgba(255,255,255,0.25)';
        lctx.fill();
      }

      lobbyAnimFrame = requestAnimationFrame(lobbyLoop);
    }
    lobbyLoop();
  }

  function stopLobbyDemo() {
    if (lobbyAnimFrame) {
      cancelAnimationFrame(lobbyAnimFrame);
      lobbyAnimFrame = null;
    }
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    return Math.sqrt((px - (x1 + t * dx)) ** 2 + (py - (y1 + t * dy)) ** 2);
  }

  // --- Core Game ---

  function startGame(name1, name2) {
    p1Name = name1;
    p2Name = name2;
    stopLobbyDemo();

    const canvas = document.getElementById('gameCanvas');
    Physics.init();
    Renderer.init(canvas);
    Drawing.init(canvas);
    Effects.init(canvas);

    Drawing.onInkChanged = (current, max) => {
      UI.updateInkBar(current, max);
    };

    // Item forces during drop
    Matter.Events.on(Physics.engine, 'beforeUpdate', () => {
      if (dropPhaseActive) {
        Items.applyAllForces();
      }
    });

    // Collision sounds, particles, and bounce scoring during drop
    collisionHandler = (event) => {
      if (!dropPhaseActive) return;
      for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const isMarble = (l) => l && l.startsWith('marble');
        const aIsMarble = isMarble(a.label);
        const bIsMarble = isMarble(b.label);

        if (aIsMarble || bIsMarble) {
          const marble = aIsMarble ? a : b;
          const speed = Math.sqrt(marble.velocity.x ** 2 + marble.velocity.y ** 2);

          if (speed > 1) {
            Sound.marbleBounce(speed);
            const cx = (pair.collision.supports?.[0]?.x) || marble.position.x;
            const cy = (pair.collision.supports?.[0]?.y) || marble.position.y;
            Effects.spawnCollisionSpark(cx, cy);
            if (speed > 4) {
              Effects.triggerShake(speed * 0.5);
            }
          }

          // Bounce scoring
          if (speed > CONFIG.scoring.bounceMinSpeed) {
            if (marble.label === 'marble-p1') {
              bounceCounts.m1++;
            } else if (marble.label === 'marble-p2') {
              bounceCounts.m2++;
            }
          }
        }
      }
    };
    Matter.Events.on(Physics.engine, 'collisionStart', collisionHandler);

    round = 1;
    builderPlayer = 1;
    p1Score = 0;
    p2Score = 0;

    // Start ambient music
    Sound.startAmbientMusic();

    showRoundStart();
  }

  function showRoundStart() {
    state = 'ROUND_START';
    const p1Role = builderPlayer === 1 ? 'Builder' : 'Saboteur';
    const p2Role = builderPlayer === 2 ? 'Builder' : 'Saboteur';
    UI.showRoundStart(round, p1Role, p2Role);
  }

  function beginRound() {
    // Show handoff screen for builder
    state = 'HANDOFF';
    const builderName = builderPlayer === 1 ? p1Name : p2Name;
    UI.showHandoff(builderName, 'builder');
  }

  function handoffReady() {
    if (state === 'HANDOFF') {
      if (UI.lastHandoffRole === 'builder') {
        startBuilderPhase();
      } else {
        startSaboteurPhase();
      }
    }
  }

  function startBuilderPhase() {
    state = 'BUILDER_PHASE';
    simCount = 3 + bonusSims[builderPlayer];
    bonusSims[builderPlayer] = 0;

    Physics.resetMarbles();
    Items.resetBombs();

    const inkBudget = CONFIG.ink.builderBudget + bonusInk[builderPlayer];
    bonusInk[builderPlayer] = 0;

    Drawing.enable(builderPlayer, round, 'builder', inkBudget);
    Drawing.setPointsCallbacks(
      () => getPlayerScore(builderPlayer),
      (cost) => deductPlayerScore(builderPlayer, cost)
    );
    UI.showGameScreen('builder', builderPlayer, round, p1Score, p2Score);
    UI.updateInkBar(inkBudget, inkBudget);
    UI.updateSimCount(simCount);
    UI.updateItemCosts(builderPlayer, 'builder');

    startRenderLoop();
  }

  function startRenderLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);

    function loop() {
      if (state === 'BUILDER_PHASE') {
        if (Simulation.isRunning()) {
          const marbles = Simulation.getSimMarbles();
          Renderer.renderSimulation(marbles.m1, marbles.m2, round, 'builder', Simulation.getTrail());
        } else {
          Renderer.render(round, 'builder', null);
        }
      } else if (state === 'SABOTEUR_PHASE') {
        if (Simulation.isRunning()) {
          const marbles = Simulation.getSimMarbles();
          Renderer.renderSimulation(marbles.m1, marbles.m2, round, 'saboteur', Simulation.getTrail());
        } else {
          Renderer.render(round, 'saboteur', null);
        }
      } else if (state === 'DROP_PHASE') {
        Renderer.render(round, 'drop', null);
      }
      animFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  function runBuilderSimulation() {
    if (simCount <= 0) return;
    simCount--;
    UI.updateSimCount(simCount);
    Simulation.startSimulation('builder', () => {});
  }

  function builderReady() {
    Drawing.disable();
    Simulation.stopSimulation();

    // Handoff to saboteur
    state = 'HANDOFF';
    const sabPlayer = builderPlayer === 1 ? 2 : 1;
    const sabName = sabPlayer === 1 ? p1Name : p2Name;
    UI.showHandoff(sabName, 'saboteur');
  }

  function startSaboteurPhase() {
    state = 'SABOTEUR_PHASE';

    const sabPlayer = builderPlayer === 1 ? 2 : 1;
    const inkBudget = CONFIG.ink.saboteurBudget + bonusInk[sabPlayer];
    bonusInk[sabPlayer] = 0;

    Drawing.enable(sabPlayer, round, 'saboteur', inkBudget);
    Drawing.setPointsCallbacks(
      () => getPlayerScore(sabPlayer),
      (cost) => deductPlayerScore(sabPlayer, cost)
    );
    UI.showGameScreen('saboteur', builderPlayer, round, p1Score, p2Score);
    UI.updateInkBar(inkBudget, inkBudget);
    UI.updateItemCosts(sabPlayer, 'saboteur');

    startRenderLoop();
  }

  function runSaboteurSimulation() {
    Simulation.stopSimulation();
    Simulation.startSimulation('saboteur', () => {});
  }

  function saboteurReady() {
    Drawing.disable();
    Simulation.stopSimulation();
    Insults.reset();
    startCountdown();
  }

  // --- Countdown before drop ---

  function startCountdown() {
    state = 'COUNTDOWN';
    UI.showGameScreen('drop', builderPlayer, round, p1Score, p2Score);
    startRenderLoop();

    let count = 3;
    const overlay = document.getElementById('countdownOverlay');
    const numberEl = document.getElementById('countdownNumber');
    overlay.style.display = 'flex';

    function tick() {
      if (count > 0) {
        numberEl.textContent = count;
        // Re-trigger animation
        numberEl.style.animation = 'none';
        numberEl.offsetHeight; // reflow
        numberEl.style.animation = 'countdownPulse 0.8s ease-out';
        Sound.countdownTick();
        count--;
        setTimeout(tick, 800);
      } else {
        numberEl.textContent = 'DROP!';
        numberEl.style.animation = 'none';
        numberEl.offsetHeight;
        numberEl.style.animation = 'countdownPulse 0.8s ease-out';
        Sound.countdownGo();
        setTimeout(() => {
          overlay.style.display = 'none';
          startDropPhase();
        }, 600);
      }
    }
    tick();
  }

  function startDropPhase() {
    state = 'DROP_PHASE';
    dropPhaseActive = true;
    stuckTimers = { m1: 0, m2: 0 };
    bounceCounts = { m1: 0, m2: 0 };
    lastDropTime = performance.now();
    totalDropTime = 0;
    dropTrailTimer = 0;

    Sound.marbleDrop();
    Physics.releaseMarbles();

    dropTick();
  }

  function dropTick() {
    if (state !== 'DROP_PHASE') return;

    try {
      const now = performance.now();
      const dt = Math.min(now - lastDropTime, 33);
      lastDropTime = now;
      totalDropTime += dt;

      Physics.step(1000 / 60);

      const m1 = Physics.marble1;
      const m2 = Physics.marble2;

      const v1 = Math.sqrt(m1.velocity.x ** 2 + m1.velocity.y ** 2);
      const v2 = Math.sqrt(m2.velocity.x ** 2 + m2.velocity.y ** 2);

      // Spawn trail particles
      dropTrailTimer += dt;
      if (dropTrailTimer > 30) {
        dropTrailTimer = 0;
        if (v1 > 1) Effects.spawnTrailParticle(m1.position.x, m1.position.y, '#4488ff');
        if (v2 > 1) Effects.spawnTrailParticle(m2.position.x, m2.position.y, '#ff4444');
      }

      const settleThreshold = 0.5;

      if (v1 < settleThreshold) stuckTimers.m1 += dt;
      else stuckTimers.m1 = 0;

      if (v2 < settleThreshold) stuckTimers.m2 += dt;
      else stuckTimers.m2 = 0;

      // Nudge stuck marbles
      if (stuckTimers.m1 > CONFIG.stuckDetection.timeoutMs && !Scoring.checkMarbleInBucket(m1, 1) && !Scoring.checkMarbleInBucket(m1, 2)) {
        Matter.Body.setVelocity(m1, { x: (Math.random() - 0.5) * 4, y: -2 });
        stuckTimers.m1 = 0;
      }
      if (stuckTimers.m2 > CONFIG.stuckDetection.timeoutMs && !Scoring.checkMarbleInBucket(m2, 1) && !Scoring.checkMarbleInBucket(m2, 2)) {
        Matter.Body.setVelocity(m2, { x: (Math.random() - 0.5) * 4, y: -2 });
        stuckTimers.m2 = 0;
      }

      const bothSettled = stuckTimers.m1 > 1500 && stuckTimers.m2 > 1500;
      const timeout = totalDropTime > 15000;

      if (bothSettled || timeout) {
        endDropPhase();
        return;
      }
    } catch (err) {
      console.error('Drop phase error:', err);
      endDropPhase();
      return;
    }

    requestAnimationFrame(dropTick);
  }

  function stopRenderLoop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function endDropPhase() {
    dropPhaseActive = false;
    state = 'SCORE_REVEAL';
    stopRenderLoop();

    const result = Scoring.calculateRoundScores(p1Name, p2Name);

    // Add bounce scoring
    const p1BouncePoints = Math.floor(bounceCounts.m1 * CONFIG.scoring.perBounce * 10) / 10;
    const p2BouncePoints = Math.floor(bounceCounts.m2 * CONFIG.scoring.perBounce * 10) / 10;

    if (p1BouncePoints > 0) {
      result.p1Points += p1BouncePoints;
      result.events.push(`${p1Name}'s marble bounced ${bounceCounts.m1}x (+${p1BouncePoints})`);
    }
    if (p2BouncePoints > 0) {
      result.p2Points += p2BouncePoints;
      result.events.push(`${p2Name}'s marble bounced ${bounceCounts.m2}x (+${p2BouncePoints})`);
    }

    p1Score += result.p1Points;
    p2Score += result.p2Points;

    // Visual effects for scores
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;

    if (result.p1Points > 0) {
      const b1 = Physics.getBucketBounds(1);
      Effects.spawnBucketCapture(b1.x + b1.width / 2, b1.y, '#4488ff');
      Effects.showFloatingText(`+${result.p1Points}`, b1.x + b1.width / 2, b1.y - 20, '#4488ff', 28);
      Effects.triggerShake(4);
      Sound.bucketCapture(result.p1Points >= 5);
    }
    if (result.p2Points > 0) {
      const b2 = Physics.getBucketBounds(2);
      Effects.spawnBucketCapture(b2.x + b2.width / 2, b2.y, '#ff4444');
      Effects.showFloatingText(`+${result.p2Points}`, b2.x + b2.width / 2, b2.y - 20, '#ff4444', 28);
      if (result.p1Points === 0) Effects.triggerShake(4);
      Sound.bucketCapture(result.p2Points >= 5);
    }
    if (result.p1Points === 0 && result.p2Points === 0) {
      Effects.showFloatingText('No Score', CONFIG.canvas.width / 2, CONFIG.canvas.height / 2, '#888888', 24);
    }

    // Keep rendering effects briefly before showing score screen
    let effectsTimer = 0;
    function effectsLoop() {
      effectsTimer++;
      Renderer.render(round, 'drop', null);
      if (effectsTimer < 90 && Effects.hasActiveEffects()) {
        requestAnimationFrame(effectsLoop);
      } else {
        UI.showScoreReveal(p1Score, p2Score, result);
      }
    }
    effectsLoop();
  }

  function showShop() {
    if (round >= CONFIG.rounds) {
      Sound.stopAmbientMusic();
      UI.showGameOver(p1Score, p2Score);
      state = 'GAME_OVER';
      return;
    }

    state = 'SHOP';
    UI.showShop(p1Score, p2Score, builderPlayer);
  }

  function buyItem(player, itemType, cost) {
    if (player === 1 && p1Score < cost) return;
    if (player === 2 && p2Score < cost) return;

    if (player === 1) p1Score -= cost;
    else p2Score -= cost;

    if (itemType === 'inkSmall') {
      bonusInk[player] += 50;
    } else if (itemType === 'inkLarge') {
      bonusInk[player] += 150;
    } else if (itemType === 'extraSim') {
      bonusSims[player] += 2;
    }

    document.getElementById('shopP1Points').textContent = p1Score;
    document.getElementById('shopP2Points').textContent = p2Score;
  }

  function shopDone() {
    builderPlayer = builderPlayer === 1 ? 2 : 1;
    round++;

    Physics.resetMarbles();
    showRoundStart();
  }

  function getCurrentSaboteur() {
    return builderPlayer === 1 ? 2 : 1;
  }

  function getRound() { return round; }

  window.addEventListener('DOMContentLoaded', () => {
    UI.init();
    startLobbyDemo();
  });

  return {
    startGame, beginRound, handoffReady,
    builderReady, saboteurReady,
    runBuilderSimulation, runSaboteurSimulation,
    showShop, buyItem, shopDone,
    getCurrentSaboteur, getRound,
    get p1Name() { return p1Name; },
    get p2Name() { return p2Name; },
  };
})();
