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

  // For saboteur item placement
  let selectedItem = null;
  let placingFan = false;
  let fanPlaceX = 0, fanPlaceY = 0;
  let mouseX = 0, mouseY = 0;

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

  function getInk() { return inkRemaining; }
  function getMaxInk() { return maxInk; }

  function getProximityMultiplier(y) {
    const h = CONFIG.canvas.height;
    const depthFraction = 1 - (y / h); // 0 = bottom, 1 = top
    // Actually we want distance from bottom: y/h is fraction from top
    // depthFraction from bottom = y / h → higher y = further from bottom
    // No, y increases downward. So y=0 is top, y=h is bottom.
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
    // Top 15% is no-draw zone
    if (y < h * CONFIG.noDrawZoneTop) return true;

    // Check bucket zones
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
      // Set fan direction based on click relative to fan position
      const angle = Math.atan2(y - fanPlaceY, x - fanPlaceX);
      Items.placeItem('fan', fanPlaceX, fanPlaceY, currentPlayer, currentRound, angle);
      placingFan = false;
      selectedItem = null;
      return;
    }

    if (eraseMode) {
      // Find closest line owned by current player in current round and erase it
      const lines = Physics.lineBodies.filter(l => l.owner === currentPlayer && l.round === currentRound);
      let closest = null;
      let closestDist = 20; // max click distance

      for (const line of lines) {
        const dist = distToSegment(x, y, line.x1, line.y1, line.x2, line.y2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = line;
        }
      }

      if (closest) {
        // Refund ink
        const cost = calculateInkCost(closest.x1, closest.y1, closest.x2, closest.y2);
        inkRemaining = Math.min(maxInk, inkRemaining + cost);
        Physics.removeLine(closest);
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
      return;
    }

    if (selectedItem) {
      // Place item
      if (isInNoDrawZone(x, y)) return;

      if (selectedItem === 'fan') {
        fanPlaceX = x;
        fanPlaceY = y;
        placingFan = true;
        // Show direction picker - handled in renderer
        return;
      }

      Items.placeItem(selectedItem, x, y, currentPlayer, currentRound);
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Store current mouse pos for preview rendering
    mouseX = x;
    mouseY = y;
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
      // Truncate line to fit ink budget
      const ratio = inkRemaining / cost;
      const truncX = startX + (endX - startX) * ratio;
      const truncY = startY + (endY - startY) * ratio;
      const line = Physics.addLine(startX, startY, truncX, truncY, currentPlayer, currentRound);
      if (line) {
        inkRemaining = 0;
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    } else {
      const line = Physics.addLine(startX, startY, endX, endY, currentPlayer, currentRound);
      if (line) {
        inkRemaining -= cost;
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    }
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

  // Preview state for renderer
  function getPreviewState() {
    if (!enabled) return null;
    return {
      isDrawing,
      startX, startY,
      mouseX: mouseX,
      mouseY: mouseY,
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
    getInk, getMaxInk,
    getPreviewState,
    calculateInkCost,
    isInNoDrawZone,
    _mouseX: 0,
    _mouseY: 0,
    set onInkChanged(fn) { onInkChanged = fn; },
    get isPlacingFan() { return placingFan; },
  };
})();
