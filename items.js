// items.js — fan, bumper, magnet force logic

const Items = (() => {
  const { Bodies, World, Body, Vector } = Matter;

  let placedItems = []; // { type, x, y, owner, round, body?, direction?, id }

  function placeItem(type, x, y, owner, round, direction) {
    const item = {
      type, x, y, owner, round,
      id: Date.now() + Math.random(),
      direction: direction || 0,
      body: null,
    };

    if (type === 'bumper') {
      item.body = Bodies.circle(x, y, CONFIG.items.bumper.radius, {
        isStatic: true,
        restitution: CONFIG.items.bumper.restitution,
        label: 'bumper',
      });
      World.add(Physics.world, item.body);
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

  function applyAllForces() {
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;
    if (m1 && !m1.isStatic) applyForces(m1);
    if (m2 && !m2.isStatic) applyForces(m2);
  }

  function addToSimWorld(simWorld, includeItems) {
    // Add bumper bodies to sim world, apply forces separately
    for (const item of includeItems) {
      if (item.type === 'bumper') {
        const clone = Bodies.circle(item.x, item.y, CONFIG.items.bumper.radius, {
          isStatic: true,
          restitution: CONFIG.items.bumper.restitution,
          label: 'bumper',
        });
        World.add(simWorld, clone);
      }
    }
  }

  function applyForcesInSim(items, marble) {
    for (const item of items) {
      if (item.type === 'fan') applyFanForce(item, marble);
      if (item.type === 'magnet') applyMagnetForce(item, marble);
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
    getItems, clearAll, removeItem,
    get placedItems() { return placedItems; },
  };
})();
