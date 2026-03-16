// game.js — state machine, round flow

const Game = (() => {
  let state = 'LOBBY';
  let round = 1;
  let builderPlayer = 1; // which player is builder this round
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

  // Shop purchases queued for next round
  let bonusInk = { 1: 0, 2: 0 };
  let purchasedItems = { 1: [], 2: [] };
  let sabFreeItems = [];

  function startGame(name1, name2) {
    p1Name = name1;
    p2Name = name2;

    // Initialize systems
    const canvas = document.getElementById('gameCanvas');
    Physics.init();
    Renderer.init(canvas);
    Drawing.init(canvas);

    Drawing.onInkChanged = (current, max) => {
      UI.updateInkBar(current, max);
    };

    // Set up Matter.js beforeUpdate for item forces
    Matter.Events.on(Physics.engine, 'beforeUpdate', () => {
      if (dropPhaseActive) {
        Items.applyAllForces();
      }
    });

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

    // Grant purchased items as free placements
    const builderItems = purchasedItems[builderPlayer] || [];
    const sabPlayer = builderPlayer === 1 ? 2 : 1;
    const sabItems = purchasedItems[sabPlayer] || [];
    Drawing.setFreeItems(builderItems);
    sabFreeItems = sabItems;
    purchasedItems[builderPlayer] = [];
    purchasedItems[sabPlayer] = [];

    const inkBudget = CONFIG.ink.builderBudget + bonusInk[builderPlayer];
    bonusInk[builderPlayer] = 0;

    Drawing.enable(builderPlayer, round, 'builder', inkBudget);
    UI.showGameScreen('builder', builderPlayer, round, p1Score, p2Score);
    UI.updateInkBar(inkBudget, inkBudget);
    UI.updateSimCount(simCount);

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

    Simulation.startSimulation('builder', () => {
      // Simulation complete, render loop handles transition automatically
    });
  }

  function builderReady() {
    Drawing.disable();
    Simulation.stopSimulation();
    state = 'SABOTEUR_PHASE';

    const sabPlayer = builderPlayer === 1 ? 2 : 1;
    const inkBudget = CONFIG.ink.saboteurBudget + bonusInk[sabPlayer];
    bonusInk[sabPlayer] = 0;

    Drawing.enable(sabPlayer, round, 'saboteur', inkBudget);
    Drawing.setFreeItems(sabFreeItems);
    sabFreeItems = [];
    UI.showGameScreen('saboteur', builderPlayer, round, p1Score, p2Score);
    UI.updateInkBar(inkBudget, inkBudget);
    UI.updateItemCosts(sabPlayer);
  }

  function runSaboteurSimulation() {
    Simulation.stopSimulation();
    Simulation.startSimulation('saboteur', () => {
      // Simulation complete
    });
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

      // Use a generous threshold — micro-bouncing can keep velocity oscillating
      const settleThreshold = 0.5;

      if (v1 < settleThreshold) {
        stuckTimers.m1 += dt;
      } else {
        stuckTimers.m1 = 0;
      }

      if (v2 < settleThreshold) {
        stuckTimers.m2 += dt;
      } else {
        stuckTimers.m2 = 0;
      }

      // Handle stuck marbles — nudge sideways instead of disabling collision
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

    const result = Scoring.calculateRoundScores();
    p1Score += result.p1Points;
    p2Score += result.p2Points;

    UI.showScoreReveal(p1Score, p2Score, result);
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
    } else {
      purchasedItems[player].push(itemType);
    }

    // Update shop display
    document.getElementById('shopP1Points').textContent = p1Score;
    document.getElementById('shopP2Points').textContent = p2Score;
  }

  function shopDone() {
    // Swap roles
    builderPlayer = builderPlayer === 1 ? 2 : 1;
    round++;

    Physics.resetMarbles();
    showRoundStart();
  }

  function getCurrentSaboteur() {
    return builderPlayer === 1 ? 2 : 1;
  }

  function getRound() { return round; }

  // Initialize UI on load
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
