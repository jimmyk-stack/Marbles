// physics.js — Matter.js world, marbles, lines, buckets

const Physics = (() => {
  const { Engine, World, Bodies, Body, Composite, Events, Vector } = Matter;

  let engine, world;
  let marble1, marble2;
  let walls = [];
  let bucketBodies = { p1: [], p2: [] };
  let lineBodies = []; // { body, owner, round, id }
  let itemBodies = []; // managed by Items module

  function init() {
    engine = Engine.create({
      gravity: { x: 0, y: CONFIG.gravity }
    });
    world = engine.world;

    createWalls();
    createBuckets();
    createMarbles();

    return engine;
  }

  function createWalls() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const t = 20;
    // Left, right, bottom walls (top is open for marble drop)
    walls = [
      Bodies.rectangle(-t / 2, h / 2, t, h, { isStatic: true, render: { visible: false } }),
      Bodies.rectangle(w + t / 2, h / 2, t, h, { isStatic: true, render: { visible: false } }),
      Bodies.rectangle(w / 2, h + t / 2, w, t, { isStatic: true, render: { visible: false } }),
    ];
    World.add(world, walls);
  }

  function createBuckets() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const bw = CONFIG.bucket.width;
    const bh = CONFIG.bucket.height;
    const bt = CONFIG.bucket.wallThickness;

    // P1 bucket - bottom left
    const p1x = bw / 2 + 30;
    const p1y = h - bh / 2;
    bucketBodies.p1 = [
      Bodies.rectangle(p1x - bw / 2 + bt / 2, p1y, bt, bh, { isStatic: true, label: 'bucket-wall' }),
      Bodies.rectangle(p1x + bw / 2 - bt / 2, p1y, bt, bh, { isStatic: true, label: 'bucket-wall' }),
      Bodies.rectangle(p1x, p1y + bh / 2 - bt / 2, bw, bt, { isStatic: true, label: 'bucket-floor' }),
    ];

    // P2 bucket - bottom right
    const p2x = w - bw / 2 - 30;
    const p2y = h - bh / 2;
    bucketBodies.p2 = [
      Bodies.rectangle(p2x - bw / 2 + bt / 2, p2y, bt, bh, { isStatic: true, label: 'bucket-wall' }),
      Bodies.rectangle(p2x + bw / 2 - bt / 2, p2y, bt, bh, { isStatic: true, label: 'bucket-wall' }),
      Bodies.rectangle(p2x, p2y + bh / 2 - bt / 2, bw, bt, { isStatic: true, label: 'bucket-floor' }),
    ];

    World.add(world, [...bucketBodies.p1, ...bucketBodies.p2]);
  }

  function createMarbles() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const r = CONFIG.marbles.radius;

    marble1 = Bodies.circle(
      w * CONFIG.marbles.p1Start.x,
      h * CONFIG.marbles.p1Start.y,
      r,
      {
        restitution: CONFIG.marbles.restitution,
        friction: CONFIG.marbles.friction,
        frictionAir: 0.01,
        label: 'marble-p1',
        isStatic: true,
      }
    );

    marble2 = Bodies.circle(
      w * CONFIG.marbles.p2Start.x,
      h * CONFIG.marbles.p2Start.y,
      r,
      {
        restitution: CONFIG.marbles.restitution,
        friction: CONFIG.marbles.friction,
        frictionAir: 0.01,
        label: 'marble-p2',
        isStatic: true,
      }
    );

    World.add(world, [marble1, marble2]);
  }

  function resetMarbles() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;

    Body.setPosition(marble1, {
      x: w * CONFIG.marbles.p1Start.x,
      y: h * CONFIG.marbles.p1Start.y
    });
    Body.setVelocity(marble1, { x: 0, y: 0 });
    Body.setAngularVelocity(marble1, 0);
    Body.setStatic(marble1, true);

    Body.setPosition(marble2, {
      x: w * CONFIG.marbles.p2Start.x,
      y: h * CONFIG.marbles.p2Start.y
    });
    Body.setVelocity(marble2, { x: 0, y: 0 });
    Body.setAngularVelocity(marble2, 0);
    Body.setStatic(marble2, true);
  }

  function releaseMarbles() {
    Body.setStatic(marble1, false);
    Body.setStatic(marble2, false);
  }

  function addLine(x1, y1, x2, y2, owner, round) {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    if (length < 5) return null;

    const body = Bodies.rectangle(cx, cy, length, CONFIG.lineThickness, {
      isStatic: true,
      angle: angle,
      friction: 0.5,
      restitution: 0.3,
      label: 'line',
    });

    const lineData = {
      body,
      owner,
      round,
      id: Date.now() + Math.random(),
      x1, y1, x2, y2,
    };

    lineBodies.push(lineData);
    World.add(world, body);
    return lineData;
  }

  function removeLine(lineData) {
    const idx = lineBodies.indexOf(lineData);
    if (idx >= 0) {
      World.remove(world, lineData.body);
      lineBodies.splice(idx, 1);
    }
  }

  function step(delta) {
    Engine.update(engine, delta || 1000 / 60);
  }

  function getBucketBounds(player) {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const bw = CONFIG.bucket.width;
    const bh = CONFIG.bucket.height;

    if (player === 1) {
      const cx = bw / 2 + 30;
      return { x: cx - bw / 2, y: h - bh, width: bw, height: bh };
    } else {
      const cx = w - bw / 2 - 30;
      return { x: cx - bw / 2, y: h - bh, width: bw, height: bh };
    }
  }

  function getState() {
    return {
      engine, world, marble1, marble2,
      lineBodies, itemBodies, bucketBodies,
      walls,
    };
  }

  // Clone world state for simulation preview
  function cloneForSimulation() {
    const simEngine = Engine.create({
      gravity: { x: 0, y: CONFIG.gravity }
    });
    const simWorld = simEngine.world;

    // Add walls
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const t = 20;
    World.add(simWorld, [
      Bodies.rectangle(-t / 2, h / 2, t, h, { isStatic: true }),
      Bodies.rectangle(w + t / 2, h / 2, t, h, { isStatic: true }),
      Bodies.rectangle(w / 2, h + t / 2, w, t, { isStatic: true }),
    ]);

    // Add bucket bodies
    const bw = CONFIG.bucket.width;
    const bh = CONFIG.bucket.height;
    const bt = CONFIG.bucket.wallThickness;

    const p1x = bw / 2 + 30;
    const p1y = h - bh / 2;
    World.add(simWorld, [
      Bodies.rectangle(p1x - bw / 2 + bt / 2, p1y, bt, bh, { isStatic: true }),
      Bodies.rectangle(p1x + bw / 2 - bt / 2, p1y, bt, bh, { isStatic: true }),
      Bodies.rectangle(p1x, p1y + bh / 2 - bt / 2, bw, bt, { isStatic: true }),
    ]);

    const p2x = w - bw / 2 - 30;
    const p2y = h - bh / 2;
    World.add(simWorld, [
      Bodies.rectangle(p2x - bw / 2 + bt / 2, p2y, bt, bh, { isStatic: true }),
      Bodies.rectangle(p2x + bw / 2 - bt / 2, p2y, bt, bh, { isStatic: true }),
      Bodies.rectangle(p2x, p2y + bh / 2 - bt / 2, bw, bt, { isStatic: true }),
    ]);

    // Add all line bodies (clone as new static bodies)
    for (const lineData of lineBodies) {
      const b = lineData.body;
      const clone = Bodies.rectangle(
        b.position.x, b.position.y,
        // Approximate original dimensions from vertices
        Math.sqrt((lineData.x2 - lineData.x1) ** 2 + (lineData.y2 - lineData.y1) ** 2),
        CONFIG.lineThickness,
        { isStatic: true, angle: b.angle, friction: 0.5, restitution: 0.3 }
      );
      World.add(simWorld, clone);
    }

    // Add cloned marbles
    const simMarble1 = Bodies.circle(
      w * CONFIG.marbles.p1Start.x,
      h * CONFIG.marbles.p1Start.y,
      CONFIG.marbles.radius,
      { restitution: CONFIG.marbles.restitution, friction: CONFIG.marbles.friction, label: 'marble-p1' }
    );
    const simMarble2 = Bodies.circle(
      w * CONFIG.marbles.p2Start.x,
      h * CONFIG.marbles.p2Start.y,
      CONFIG.marbles.radius,
      { restitution: CONFIG.marbles.restitution, friction: CONFIG.marbles.friction, label: 'marble-p2' }
    );

    World.add(simWorld, [simMarble1, simMarble2]);

    return { engine: simEngine, world: simWorld, marble1: simMarble1, marble2: simMarble2 };
  }

  function clearAll() {
    // Remove all lines
    for (const ld of lineBodies) {
      World.remove(world, ld.body);
    }
    lineBodies.length = 0;

    // Remove items
    Items.clearAll();

    resetMarbles();
  }

  return {
    init, step, getState,
    resetMarbles, releaseMarbles,
    addLine, removeLine,
    getBucketBounds, cloneForSimulation,
    clearAll,
    get marble1() { return marble1; },
    get marble2() { return marble2; },
    get lineBodies() { return lineBodies; },
    get engine() { return engine; },
    get world() { return world; },
  };
})();
