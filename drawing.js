// drawing.js — Builder input handling, line drawing

const Drawing = (() => {
  let canvas, ctx;
  let isDrawing = false;
  let eraseMode = false;
  let startX, startY;
  let currentPlayer = 1;
  let currentRound = 1;
  let currentRole = 'builder'; // 'builder' or 'saboteur'
  let inkRemaining = 100;
  let maxInk = 100;
  let onInkChanged = null;
  let enabled = false;

  // For item placement
  let selectedItem = null;
  let placingFan = false;
  let fanPlaceX = 0, fanPlaceY = 0;
  let mouseX = 0, mouseY = 0;

  // Points-based item economy — callbacks set by Game
  let getPoints = () => 0;
  let spendPoints = () => {};

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
  }

  function enable(player, round, role, ink) {
    currentPlayer = player;
    currentRound = round;
    currentRole = role;
    inkRemaining = ink;
    maxInk = ink;
    enabled = true;
    eraseMode = false;
    selectedItem = null;
    placingFan = false;
  }

  function disable() {
    enabled = false;
    isDrawing = false;
    selectedItem = null;
    placingFan = false;
  }

  function setEraseMode(val) {
    eraseMode = val;
    selectedItem = null;
  }

  function selectItem(type) {
    selectedItem = type;
    eraseMode = false;
  }

  function setPointsCallbacks(getFn, spendFn) {
    getPoints = getFn;
    spendPoints = spendFn;
  }

  function getInk() { return inkRemaining; }
  function getMaxInk() { return maxInk; }

  function getItemPointCost(type) {
    const baseCost = CONFIG.items[type].cost;
    return currentRole === 'builder'
      ? baseCost * CONFIG.ink.builderItemMultiplier
      : baseCost;
  }

  function getProximityMultiplier(y) {
    const h = CONFIG.canvas.height;
    // y increases downward. y=0 is top, y=h is bottom.
    // Distance from bottom as fraction = (h - y) / h
    const distFromBottom = (h - y) / h;

    for (const tier of CONFIG.ink.proximityMultiplier) {
      if (distFromBottom >= tier.minDepthFraction) {
        return tier.multiplier;
      }
    }
    return 8;
  }

  function calculateInkCost(x1, y1, x2, y2) {
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const midY = (y1 + y2) / 2;
    let cost = length * CONFIG.ink.costPerPixel;

    // Proximity multiplier
    cost *= getProximityMultiplier(midY);

    // Role multiplier
    if (currentRole === 'saboteur') {
      cost *= CONFIG.ink.saboteurLineMultiplier;
    }

    return cost;
  }

  function isInNoDrawZone(x, y) {
    const h = CONFIG.canvas.height;
    if (y < h * CONFIG.noDrawZoneTop) return true;

    const b1 = Physics.getBucketBounds(1);
    const b2 = Physics.getBucketBounds(2);

    if (x >= b1.x && x <= b1.x + b1.width && y >= b1.y && y <= b1.y + b1.height) return true;
    if (x >= b2.x && x <= b2.x + b2.width && y >= b2.y && y <= b2.y + b2.height) return true;

    return false;
  }

  function onMouseDown(e) {
    if (!enabled) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (placingFan) {
      const angle = Math.atan2(y - fanPlaceY, x - fanPlaceX);
      placeAndDeductItem('fan', fanPlaceX, fanPlaceY, angle);
      placingFan = false;
      selectedItem = null;
      return;
    }

    if (eraseMode) {
      const lines = Physics.lineBodies.filter(l => l.owner === currentPlayer && l.round === currentRound);
      let closest = null;
      let closestDist = 20;

      for (const line of lines) {
        const dist = distToSegment(x, y, line.x1, line.y1, line.x2, line.y2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = line;
        }
      }

      if (closest) {
        const cost = calculateInkCost(closest.x1, closest.y1, closest.x2, closest.y2);
        inkRemaining = Math.min(maxInk, inkRemaining + cost);
        Physics.removeLine(closest);
        Sound.eraseLine();
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
      return;
    }

    if (selectedItem) {
      if (isInNoDrawZone(x, y)) return;

      // Items cost points, not ink
      const cost = getItemPointCost(selectedItem);
      if (getPoints() < cost) {
        Sound.denied();
        return;
      }

      if (selectedItem === 'fan') {
        fanPlaceX = x;
        fanPlaceY = y;
        placingFan = true;
        return;
      }

      placeAndDeductItem(selectedItem, x, y);
      selectedItem = null;
      return;
    }

    // Start drawing a line
    if (isInNoDrawZone(x, y)) return;
    isDrawing = true;
    startX = x;
    startY = y;
  }

  function onMouseMove(e) {
    if (!enabled) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function onMouseUp(e) {
    if (!enabled || !isDrawing) return;
    isDrawing = false;

    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    if (isInNoDrawZone(endX, endY)) return;

    const cost = calculateInkCost(startX, startY, endX, endY);
    if (cost > inkRemaining) {
      const ratio = inkRemaining / cost;
      const truncX = startX + (endX - startX) * ratio;
      const truncY = startY + (endY - startY) * ratio;
      const line = Physics.addLine(startX, startY, truncX, truncY, currentPlayer, currentRound);
      if (line) {
        inkRemaining = 0;
        Sound.drawLine();
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    } else {
      const line = Physics.addLine(startX, startY, endX, endY, currentPlayer, currentRound);
      if (line) {
        inkRemaining -= cost;
        Sound.drawLine();
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    }
  }

  function placeAndDeductItem(type, x, y, direction) {
    const cost = getItemPointCost(type);
    if (getPoints() < cost) return;

    Items.placeItem(type, x, y, currentPlayer, currentRound, direction);
    spendPoints(cost);
    Sound.placeItem();
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  function getPreviewState() {
    if (!enabled) return null;
    return {
      isDrawing,
      startX, startY,
      mouseX, mouseY,
      eraseMode,
      selectedItem,
      placingFan,
      fanPlaceX, fanPlaceY,
      currentPlayer,
    };
  }

  return {
    init, enable, disable,
    setEraseMode, selectItem,
    setPointsCallbacks,
    getInk, getMaxInk,
    getItemPointCost,
    getPreviewState,
    calculateInkCost,
    isInNoDrawZone,
    set onInkChanged(fn) { onInkChanged = fn; },
    get isPlacingFan() { return placingFan; },
  };
})();
