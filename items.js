// items.js — fan, bumper, magnet, wall, ice, bomb force logic

const Items = (() => {
  const { Bodies, World, Body, Vector } = Matter;

  let placedItems = []; // { type, x, y, owner, round, body?, direction?, id }

  function placeItem(type, x, y, owner, round, direction) {
    const item = {
      type, x, y, owner, round,
      id: Date.now() + Math.random(),
      direction: direction || 0,
      body: null,
      triggered: false, // for bomb
    };

    if (type === 'bumper') {
      item.body = Bodies.circle(x, y, CONFIG.items.bumper.radius, {
        isStatic: true,
        restitution: CONFIG.items.bumper.restitution,
        label: 'bumper',
      });
      World.add(Physics.world, item.body);
    } else if (type === 'wall') {
      const len = CONFIG.items.wall.length;
      const thick = CONFIG.items.wall.thickness;
      const angle = direction || 0;
      item.body = Bodies.rectangle(x, y, len, thick, {
        isStatic: true,
        angle: angle,
        friction: 0.5,
        restitution: 0.3,
        label: 'wall-item',
      });
      // Store endpoints for rendering
      item.x1 = x - Math.cos(angle) * len / 2;
      item.y1 = y - Math.sin(angle) * len / 2;
      item.x2 = x + Math.cos(angle) * len / 2;
      item.y2 = y + Math.sin(angle) * len / 2;
      World.add(Physics.world, item.body);
    } else if (type === 'ice') {
      // Ice is a zone — no physics body, just reduces friction on nearby marbles
      item.body = null;
    } else if (type === 'bomb') {
      // Bomb is a proximity trigger — no physics body until triggered
      item.body = null;
    }

    placedItems.push(item);
    return item;
  }

  function applyForces(marble) {
    for (const item of placedItems) {
      if (item.type === 'fan') {
        applyFanForce(item, marble);
      } else if (item.type === 'magnet') {
        applyMagnetForce(item, marble);
      } else if (item.type === 'ice') {
        applyIceEffect(item, marble);
      } else if (item.type === 'bomb') {
        applyBombEffect(item, marble);
      }
    }
  }

  function applyFanForce(item, marble) {
    const dx = marble.position.x - item.x;
    const dy = marble.position.y - item.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > CONFIG.items.fan.coneRadius) return;

    // Check if marble is within fan cone
    const angleToMarble = Math.atan2(dy, dx);
    let angleDiff = angleToMarble - item.direction;
    // Normalize
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const halfCone = (CONFIG.items.fan.coneAngle * Math.PI / 180) / 2;
    if (Math.abs(angleDiff) > halfCone) return;

    const force = CONFIG.items.fan.force * (1 - dist / CONFIG.items.fan.coneRadius);
    Body.applyForce(marble, marble.position, {
      x: Math.cos(item.direction) * force,
      y: Math.sin(item.direction) * force,
    });
  }

  function applyMagnetForce(item, marble) {
    const dx = item.x - marble.position.x;
    const dy = item.y - marble.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > CONFIG.items.magnet.radius || dist < 1) return;

    const force = CONFIG.items.magnet.force * (1 - dist / CONFIG.items.magnet.radius);
    Body.applyForce(marble, marble.position, {
      x: (dx / dist) * force,
      y: (dy / dist) * force,
    });
  }

  function applyIceEffect(item, marble) {
    const dx = marble.position.x - item.x;
    const dy = marble.position.y - item.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CONFIG.items.ice.radius) {
      // Reduce friction dramatically when in ice zone
      marble.friction = CONFIG.items.ice.friction;
      marble.frictionAir = 0.001;
    }
  }

  function applyBombEffect(item, marble) {
    if (item.triggered) return;

    const dx = marble.position.x - item.x;
    const dy = marble.position.y - item.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CONFIG.items.bomb.radius) {
      // Trigger explosion — apply massive repulsive force
      item.triggered = true;
      item.triggerTime = Date.now();
      const angle = Math.atan2(dy, dx);
      const force = CONFIG.items.bomb.force;
      Body.applyForce(marble, marble.position, {
        x: Math.cos(angle) * force,
        y: Math.sin(angle) * force,
      });

      // Also push the other marble if it's nearby
      const otherMarble = marble.label === 'marble-p1' ? Physics.marble2 : Physics.marble1;
      if (otherMarble) {
        const odx = otherMarble.position.x - item.x;
        const ody = otherMarble.position.y - item.y;
        const odist = Math.sqrt(odx * odx + ody * ody);
        if (odist < CONFIG.items.bomb.radius * 2) {
          const oangle = Math.atan2(ody, odx);
          const oforce = force * (1 - odist / (CONFIG.items.bomb.radius * 2));
          Body.applyForce(otherMarble, otherMarble.position, {
            x: Math.cos(oangle) * oforce,
            y: Math.sin(oangle) * oforce,
          });
        }
      }

      // Visual/audio feedback
      if (typeof Effects !== 'undefined') {
        Effects.spawnParticles(item.x, item.y, '#ff8800', 40, { speed: 8, life: 40, size: 5, gravity: 0.1 });
        Effects.spawnParticles(item.x, item.y, '#ffcc00', 20, { speed: 5, life: 30, size: 3, gravity: 0.05 });
        Effects.triggerShake(12);
        Effects.showFloatingText('BOOM!', item.x, item.y - 30, '#ff6600', 32);
      }
      if (typeof Sound !== 'undefined') {
        Sound.bombExplode();
      }
    }
  }

  function applyAllForces() {
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;

    // Reset marble friction before applying ice (so ice only works in zone)
    if (m1 && !m1.isStatic) {
      m1.friction = CONFIG.marbles.friction;
      m1.frictionAir = 0.01;
      applyForces(m1);
    }
    if (m2 && !m2.isStatic) {
      m2.friction = CONFIG.marbles.friction;
      m2.frictionAir = 0.01;
      applyForces(m2);
    }
  }

  function addToSimWorld(simWorld, includeItems) {
    for (const item of includeItems) {
      if (item.type === 'bumper') {
        const clone = Bodies.circle(item.x, item.y, CONFIG.items.bumper.radius, {
          isStatic: true,
          restitution: CONFIG.items.bumper.restitution,
          label: 'bumper',
        });
        World.add(simWorld, clone);
      } else if (item.type === 'wall') {
        const len = CONFIG.items.wall.length;
        const thick = CONFIG.items.wall.thickness;
        const clone = Bodies.rectangle(item.x, item.y, len, thick, {
          isStatic: true,
          angle: item.direction || 0,
          friction: 0.5,
          restitution: 0.3,
          label: 'wall-item',
        });
        World.add(simWorld, clone);
      }
    }
  }

  function applyForcesInSim(items, marble) {
    for (const item of items) {
      if (item.type === 'fan') applyFanForce(item, marble);
      if (item.type === 'magnet') applyMagnetForce(item, marble);
      if (item.type === 'ice') applyIceEffect(item, marble);
      // Don't apply bomb in sim - it's a surprise
    }
  }

  function resetBombs() {
    for (const item of placedItems) {
      if (item.type === 'bomb') {
        item.triggered = false;
        item.triggerTime = null;
      }
    }
  }

  function getItems() { return placedItems; }

  function clearAll() {
    for (const item of placedItems) {
      if (item.body) {
        World.remove(Physics.world, item.body);
      }
    }
    placedItems.length = 0;
  }

  function removeItem(item) {
    const idx = placedItems.indexOf(item);
    if (idx >= 0) {
      if (item.body) World.remove(Physics.world, item.body);
      placedItems.splice(idx, 1);
    }
  }

  return {
    placeItem, applyAllForces, applyForces,
    addToSimWorld, applyForcesInSim,
    getItems, clearAll, removeItem, resetBombs,
    get placedItems() { return placedItems; },
  };
})();
