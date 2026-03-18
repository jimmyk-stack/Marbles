// game.js — state machine, round flow

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

  // Shop purchases queued for next round (ink only)
  let bonusInk = { 1: 0, 2: 0 };

  // Collision event tracking
  let collisionHandler = null;

  function getPlayerScore(player) {
    return player === 1 ? p1Score : p2Score;
  }

  function deductPlayerScore(player, cost) {
    if (player === 1) p1Score -= cost;
    else p2Score -= cost;
    document.getElementById('hudP1Score').textContent = p1Score;
    document.getElementById('hudP2Score').textContent = p2Score;
  }

  function startGame(name1, name2) {
    p1Name = name1;
    p2Name = name2;

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

    // Collision sounds and particles during drop
    collisionHandler = (event) => {
      if (!dropPhaseActive) return;
      for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        const isMarble = (l) => l && (l.startsWith('marble'));
        if (isMarble(a.label) || isMarble(b.label)) {
          const speed = Math.sqrt(
            Math.pow(pair.collision.normal.x * (a.velocity?.x || 0), 2) +
            Math.pow(pair.collision.normal.y * (a.velocity?.y || 0), 2)
          );
          if (speed > 1) {
            Sound.marbleBounce(speed);
            const cx = (pair.collision.supports?.[0]?.x) || a.position.x;
            const cy = (pair.collision.supports?.[0]?.y) || a.position.y;
            Effects.spawnCollisionSpark(cx, cy);
            if (speed > 4) {
              Effects.triggerShake(speed * 0.5);
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

    showRoundStart();
  }

  function showRoundStart() {
    state = 'ROUND_START';
    const p1Role = builderPlayer === 1 ? 'Builder' : 'Saboteur';
    const p2Role = builderPlayer === 2 ? 'Builder' : 'Saboteur';
    UI.showRoundStart(round, p1Role, p2Role);
  }

  function beginRound() {
    state = 'BUILDER_PHASE';
    simCount = 3;

    Physics.resetMarbles();

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
  }

  function runSaboteurSimulation() {
    Simulation.stopSimulation();
    Simulation.startSimulation('saboteur', () => {});
  }

  function saboteurReady() {
    Drawing.disable();
    Simulation.stopSimulation();
    startDropPhase();
  }

  function startDropPhase() {
    state = 'DROP_PHASE';
    dropPhaseActive = true;
    stuckTimers = { m1: 0, m2: 0 };
    lastDropTime = performance.now();
    totalDropTime = 0;
    dropTrailTimer = 0;

    Sound.marbleDrop();
    UI.showGameScreen('drop', builderPlayer, round, p1Score, p2Score);
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
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
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
  });

  return {
    startGame, beginRound,
    builderReady, saboteurReady,
    runBuilderSimulation, runSaboteurSimulation,
    showShop, buyItem, shopDone,
    getCurrentSaboteur, getRound,
  };
})();
