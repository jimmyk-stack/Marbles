// simulation.js — Saboteur preview simulation + marble trail

const Simulation = (() => {
  const { Engine, World, Bodies, Body } = Matter;

  let simEngine = null;
  let simMarble1 = null;
  let simMarble2 = null;
  let trail = [];
  let running = false;
  let animFrame = null;
  let onComplete = null;
  let stuckTimers = { m1: 0, m2: 0 };
  let lastTime = 0;
  let totalElapsed = 0;
  const MAX_SIM_TIME = 15000; // 15 seconds max

  function startSimulation(mode, callback) {
    stopSimulation();
    onComplete = callback;
    trail = [];
    stuckTimers = { m1: 0, m2: 0 };
    totalElapsed = 0;

    // Clone the physics world
    const sim = Physics.cloneForSimulation();
    simEngine = sim.engine;
    simMarble1 = sim.marble1;
    simMarble2 = sim.marble2;

    // Add items to sim world (only existing items, not saboteur's new ones)
    const itemsToInclude = mode === 'builder'
      ? Items.getItems() // Builder sees everything
      : Items.getItems().filter(i => i.round < Game.getRound()); // Saboteur sees old items only in simulation

    Items.addToSimWorld(sim.world, itemsToInclude);

    running = true;
    lastTime = performance.now();
    tick();
  }

  function tick() {
    if (!running) return;

    const now = performance.now();
    const dt = Math.min(now - lastTime, 33); // cap at ~30fps minimum
    lastTime = now;
    totalElapsed += dt;

    // Step simulation
    Engine.update(simEngine, 1000 / 60);

    // Apply item forces
    const items = Items.getItems();
    Items.applyForcesInSim(items, simMarble1);
    Items.applyForcesInSim(items, simMarble2);

    // Record trail
    trail.push({
      x: simMarble1.position.x, y: simMarble1.position.y,
      player: 1, time: Date.now()
    });
    trail.push({
      x: simMarble2.position.x, y: simMarble2.position.y,
      player: 2, time: Date.now()
    });

    // Check if marbles are settled or out of bounds
    const v1 = Math.sqrt(simMarble1.velocity.x ** 2 + simMarble1.velocity.y ** 2);
    const v2 = Math.sqrt(simMarble2.velocity.x ** 2 + simMarble2.velocity.y ** 2);

    if (v1 < CONFIG.stuckDetection.velocityThreshold) {
      stuckTimers.m1 += dt;
    } else {
      stuckTimers.m1 = 0;
    }

    if (v2 < CONFIG.stuckDetection.velocityThreshold) {
      stuckTimers.m2 += dt;
    } else {
      stuckTimers.m2 = 0;
    }

    const bothSettled = stuckTimers.m1 > 2000 && stuckTimers.m2 > 2000;
    const timeout = totalElapsed > MAX_SIM_TIME;

    if (bothSettled || timeout) {
      running = false;
      if (onComplete) {
        setTimeout(onComplete, 500);
      }
      return;
    }

    animFrame = requestAnimationFrame(tick);
  }

  function stopSimulation() {
    running = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    simEngine = null;
    simMarble1 = null;
    simMarble2 = null;
  }

  function isRunning() { return running; }
  function getTrail() { return trail; }
  function getSimMarbles() { return { m1: simMarble1, m2: simMarble2 }; }

  return {
    startSimulation, stopSimulation,
    isRunning, getTrail, getSimMarbles,
  };
})();
