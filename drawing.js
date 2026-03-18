// drawing.js — Builder input handling, line drawing, undo, snap

const Drawing = (() => {
  let canvas, ctx;
  let isDrawing = false;
  let eraseMode = false;
  let startX, startY;
  let currentPlayer = 1;
  let currentRound = 1;
  let currentRole = 'builder';
  let inkRemaining = 100;
  let maxInk = 100;
  let onInkChanged = null;
  let enabled = false;

  // For item placement
  let selectedItem = null;
  let placingFan = false;
  let fanPlaceX = 0, fanPlaceY = 0;
  let placingWall = false;
  let wallPlaceX = 0, wallPlaceY = 0;
  let mouseX = 0, mouseY = 0;

  // Points-based item economy
  let getPoints = () => 0;
  let spendPoints = () => {};

  // Undo stack: array of { type: 'line'|'item', data, inkCost? }
  let undoStack = [];

  // Line snap
  let shiftHeld = false;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);

    // Track shift for snap
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') shiftHeld = true;
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') shiftHeld = false;
    });
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
    placingWall = false;
    undoStack = [];
  }

  function disable() {
    enabled = false;
    isDrawing = false;
    selectedItem = null;
    placingFan = false;
    placingWall = false;
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
    cost *= getProximityMultiplier(midY);
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

  function snapEndpoint(sx, sy, ex, ey) {
    if (!shiftHeld) return { x: ex, y: ey };

    const dx = ex - sx;
    const dy = ey - sy;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);

    // Snap to nearest 45 degrees
    const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: sx + Math.cos(snapped) * len,
      y: sy + Math.sin(snapped) * len,
      snapActive: true,
    };
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

    if (placingWall) {
      const angle = Math.atan2(y - wallPlaceY, x - wallPlaceX);
      placeAndDeductItem('wall', wallPlaceX, wallPlaceY, angle);
      placingWall = false;
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

      if (selectedItem === 'wall') {
        wallPlaceX = x;
        wallPlaceY = y;
        placingWall = true;
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
    let endX = e.clientX - rect.left;
    let endY = e.clientY - rect.top;

    // Apply snap
    const snapped = snapEndpoint(startX, startY, endX, endY);
    endX = snapped.x;
    endY = snapped.y;

    if (isInNoDrawZone(endX, endY)) return;

    const cost = calculateInkCost(startX, startY, endX, endY);
    if (cost > inkRemaining) {
      const ratio = inkRemaining / cost;
      const truncX = startX + (endX - startX) * ratio;
      const truncY = startY + (endY - startY) * ratio;
      const line = Physics.addLine(startX, startY, truncX, truncY, currentPlayer, currentRound);
      if (line) {
        const actualCost = inkRemaining;
        inkRemaining = 0;
        undoStack.push({ type: 'line', data: line, inkCost: actualCost });
        Sound.drawLine();
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    } else {
      const line = Physics.addLine(startX, startY, endX, endY, currentPlayer, currentRound);
      if (line) {
        inkRemaining -= cost;
        undoStack.push({ type: 'line', data: line, inkCost: cost });
        Sound.drawLine();
        if (onInkChanged) onInkChanged(inkRemaining, maxInk);
      }
    }
  }

  function placeAndDeductItem(type, x, y, direction) {
    const cost = getItemPointCost(type);
    if (getPoints() < cost) return;

    const item = Items.placeItem(type, x, y, currentPlayer, currentRound, direction);
    spendPoints(cost);
    undoStack.push({ type: 'item', data: item, pointCost: cost });
    Sound.placeItem();
  }

  function undo() {
    if (!enabled || undoStack.length === 0) return;

    const action = undoStack.pop();
    if (action.type === 'line') {
      Physics.removeLine(action.data);
      inkRemaining = Math.min(maxInk, inkRemaining + action.inkCost);
      if (onInkChanged) onInkChanged(inkRemaining, maxInk);
    } else if (action.type === 'item') {
      Items.removeItem(action.data);
      // Refund points
      if (action.pointCost) {
        spendPoints(-action.pointCost);
      }
    }
    Sound.undo();
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

    let snapX = mouseX, snapY = mouseY;
    let snapActive = false;
    if (isDrawing && shiftHeld) {
      const s = snapEndpoint(startX, startY, mouseX, mouseY);
      snapX = s.x;
      snapY = s.y;
      snapActive = true;
    }

    return {
      isDrawing,
      startX, startY,
      mouseX: isDrawing && shiftHeld ? snapX : mouseX,
      mouseY: isDrawing && shiftHeld ? snapY : mouseY,
      eraseMode,
      selectedItem,
      placingFan,
      fanPlaceX, fanPlaceY,
      placingWall,
      wallPlaceX, wallPlaceY,
      currentPlayer,
      snapActive,
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
    undo,
    set onInkChanged(fn) { onInkChanged = fn; },
    get isPlacingFan() { return placingFan; },
    get isPlacingWall() { return placingWall; },
    get undoStackSize() { return undoStack.length; },
  };
})();
