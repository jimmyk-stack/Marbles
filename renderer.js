// renderer.js — builder view vs saboteur view, line age/opacity

const Renderer = (() => {
  let canvas, ctx;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
  }

  function clear() {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  }

  function drawBuckets() {
    const b1 = Physics.getBucketBounds(1);
    const b2 = Physics.getBucketBounds(2);

    // P1 bucket (blue)
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = CONFIG.bucket.wallThickness;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b1.x, b1.y + b1.height);
    ctx.lineTo(b1.x + b1.width, b1.y + b1.height);
    ctx.lineTo(b1.x + b1.width, b1.y);
    ctx.stroke();

    // P1 label
    ctx.fillStyle = '#4488ff88';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P1', b1.x + b1.width / 2, b1.y + b1.height / 2 + 4);

    // P2 bucket (red)
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = CONFIG.bucket.wallThickness;
    ctx.beginPath();
    ctx.moveTo(b2.x, b2.y);
    ctx.lineTo(b2.x, b2.y + b2.height);
    ctx.lineTo(b2.x + b2.width, b2.y + b2.height);
    ctx.lineTo(b2.x + b2.width, b2.y);
    ctx.stroke();

    ctx.fillStyle = '#ff444488';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('P2', b2.x + b2.width / 2, b2.y + b2.height / 2 + 4);
  }

  function drawNoDrawZone() {
    const h = CONFIG.canvas.height;
    const zoneH = h * CONFIG.noDrawZoneTop;
    ctx.fillStyle = 'rgba(50, 50, 80, 0.15)';
    ctx.fillRect(0, 0, CONFIG.canvas.width, zoneH);
    ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, zoneH);
    ctx.lineTo(CONFIG.canvas.width, zoneH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function getLineColor(lineData, currentRound, viewMode) {
    const age = currentRound - lineData.round;
    const owner = lineData.owner;

    if (age === 0) {
      // Current round lines
      if (viewMode === 'saboteur' && lineData.owner !== Game.getCurrentSaboteur()) {
        // Hide builder's new lines from saboteur
        return null;
      }
      return owner === 1 ? '#4488ff' : '#ff4444';
    }

    // Historical lines — grayscale with opacity decay
    let opacity = CONFIG.lineOpacity[4]; // default oldest
    if (age <= 3) {
      opacity = CONFIG.lineOpacity[age];
    }

    const gray = 150;
    return `rgba(${gray}, ${gray}, ${gray}, ${opacity})`;
  }

  function drawLines(currentRound, viewMode) {
    for (const lineData of Physics.lineBodies) {
      const color = getLineColor(lineData, currentRound, viewMode);
      if (!color) continue;

      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.lineThickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lineData.x1, lineData.y1);
      ctx.lineTo(lineData.x2, lineData.y2);
      ctx.stroke();
    }
  }

  function drawItems(currentRound, viewMode) {
    for (const item of Items.getItems()) {
      const age = currentRound - item.round;
      let alpha = 1;
      if (age > 0) {
        alpha = CONFIG.lineOpacity[Math.min(age, 4)];
      }

      if (age === 0 && viewMode === 'saboteur') {
        // Current round items from builder are hidden
        // But saboteur's own items are visible
        if (item.owner !== Game.getCurrentSaboteur()) continue;
      }

      const color = item.owner === 1 ? `rgba(68, 136, 255, ${alpha})` : `rgba(255, 68, 68, ${alpha})`;

      if (item.type === 'bumper') {
        ctx.beginPath();
        ctx.arc(item.x, item.y, CONFIG.items.bumper.radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = color.replace(alpha + ')', Math.min(alpha, 0.3) + ')');
        ctx.fill();
      } else if (item.type === 'fan') {
        drawFan(item, color, alpha);
      } else if (item.type === 'magnet') {
        drawMagnet(item, color, alpha);
      }
    }
  }

  function drawFan(item, color, alpha) {
    const r = 15;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.direction);

    // Fan body
    ctx.beginPath();
    ctx.arc(0, 0, r, -0.4, 0.4);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Direction arrow
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r + 20, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(r + 20, 0);
    ctx.lineTo(r + 14, -4);
    ctx.moveTo(r + 20, 0);
    ctx.lineTo(r + 14, 4);
    ctx.stroke();

    ctx.restore();
  }

  function drawMagnet(item, color, alpha) {
    // Draw magnet as a circle with radius indicator
    ctx.beginPath();
    ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Range circle
    ctx.beginPath();
    ctx.arc(item.x, item.y, CONFIG.items.magnet.radius, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace(alpha + ')', Math.min(alpha, 0.15) + ')');
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // M label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', item.x, item.y + 4);
  }

  function drawMarbles() {
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;

    if (m1) {
      ctx.beginPath();
      ctx.arc(m1.position.x, m1.position.y, CONFIG.marbles.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#4488ff';
      ctx.fill();
      ctx.strokeStyle = '#6699ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (m2) {
      ctx.beginPath();
      ctx.arc(m2.position.x, m2.position.y, CONFIG.marbles.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawPreview() {
    const state = Drawing.getPreviewState();
    if (!state) return;

    if (state.isDrawing) {
      const color = state.currentPlayer === 1 ? '#4488ff88' : '#ff444488';
      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.lineThickness;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(state.startX, state.startY);
      ctx.lineTo(state.mouseX, state.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (state.placingFan) {
      // Show direction indicator
      ctx.beginPath();
      ctx.arc(state.fanPlaceX, state.fanPlaceY, 15, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffcc0088';
      ctx.lineWidth = 2;
      ctx.stroke();

      const angle = Math.atan2(state.mouseY - state.fanPlaceY, state.mouseX - state.fanPlaceX);
      ctx.beginPath();
      ctx.moveTo(state.fanPlaceX, state.fanPlaceY);
      ctx.lineTo(
        state.fanPlaceX + Math.cos(angle) * 40,
        state.fanPlaceY + Math.sin(angle) * 40
      );
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px sans-serif';
      ctx.fillText('Click to set direction', state.fanPlaceX - 55, state.fanPlaceY - 25);
    }
  }

  function drawTrail(trail) {
    if (!trail || trail.length === 0) return;
    const now = Date.now();

    for (const point of trail) {
      const age = now - point.time;
      if (age > CONFIG.marbleTrail.durationMs) continue;

      const alpha = CONFIG.marbleTrail.opacity * (1 - age / CONFIG.marbleTrail.durationMs);
      const color = point.player === 1 ? `rgba(68, 136, 255, ${alpha})` : `rgba(255, 68, 68, ${alpha})`;

      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  function render(currentRound, viewMode, trail) {
    clear();
    drawNoDrawZone();
    drawBuckets();
    drawLines(currentRound, viewMode);
    drawItems(currentRound, viewMode);
    drawMarbles();
    drawPreview();
    if (trail) drawTrail(trail);
  }

  function renderSimulation(simMarble1, simMarble2, currentRound, viewMode, trail) {
    clear();
    drawNoDrawZone();
    drawBuckets();
    drawLines(currentRound, viewMode);
    drawItems(currentRound, viewMode);

    // Draw sim marbles instead of real ones
    if (simMarble1) {
      ctx.beginPath();
      ctx.arc(simMarble1.position.x, simMarble1.position.y, CONFIG.marbles.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#4488ff';
      ctx.fill();
      ctx.strokeStyle = '#6699ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (simMarble2) {
      ctx.beginPath();
      ctx.arc(simMarble2.position.x, simMarble2.position.y, CONFIG.marbles.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (trail) drawTrail(trail);
  }

  return {
    init, render, renderSimulation, clear,
  };
})();
