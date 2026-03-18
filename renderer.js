// renderer.js — builder view vs saboteur view, line age/opacity
// Full visual polish: gradients, glow, depth zones, animated items

const Renderer = (() => {
  let canvas, ctx;
  let bgGradient = null;
  let frameCount = 0;

  // Cached gradients for marbles
  let m1Gradient = null;
  let m2Gradient = null;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');

    // Pre-build background gradient
    bgGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.canvas.height);
    bgGradient.addColorStop(0, '#0a0a1e');
    bgGradient.addColorStop(0.5, '#0d0d24');
    bgGradient.addColorStop(1, '#111128');
  }

  function clear() {
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
  }

  function drawDepthZones() {
    const w = CONFIG.canvas.width;
    const h = CONFIG.canvas.height;
    const zones = CONFIG.ink.proximityMultiplier;

    // Draw subtle zone bands from bottom up
    const zoneColors = [
      'rgba(255, 50, 50, 0.04)',   // 8x - near bottom (danger)
      'rgba(255, 150, 50, 0.03)',  // 4x
      'rgba(255, 255, 100, 0.02)', // 2x
      'rgba(100, 255, 100, 0.01)', // 1x - far from buckets (cheap)
    ];

    for (let i = 0; i < zones.length; i++) {
      const top = h * (1 - zones[i].minDepthFraction);
      const bottom = i === 0 ? h : h * (1 - zones[i - 1].minDepthFraction);
      ctx.fillStyle = zoneColors[i] || 'rgba(255,255,255,0.01)';
      ctx.fillRect(0, top, w, bottom - top);
    }
  }

  function drawBuckets(viewMode) {
    const b1 = Physics.getBucketBounds(1);
    const b2 = Physics.getBucketBounds(2);
    drawSingleBucket(b1, '#4488ff', '1', viewMode);
    drawSingleBucket(b2, '#ff4444', '2', viewMode);
  }

  function drawSingleBucket(b, color, label, viewMode) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    // Glow behind bucket
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.width * 0.8);
    glowGrad.addColorStop(0, color.replace(')', ', 0.08)').replace('rgb', 'rgba'));
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cx - b.width, cy - b.height, b.width * 2, b.height * 2);

    // Bucket interior fill
    ctx.fillStyle = color.replace(')', ', 0.06)').replace('rgb', 'rgba');
    // Parse hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const bl = parseInt(color.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, 0.06)`;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Bucket walls with gradient
    const wallGrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.height);
    wallGrad.addColorStop(0, `rgba(${r}, ${g}, ${bl}, 0.5)`);
    wallGrad.addColorStop(1, color);

    ctx.strokeStyle = wallGrad;
    ctx.lineWidth = CONFIG.bucket.wallThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x, b.y + b.height);
    ctx.lineTo(b.x + b.width, b.y + b.height);
    ctx.lineTo(b.x + b.width, b.y);
    ctx.stroke();

    // Bucket label
    ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, 0.4)`;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`P${label}`, cx, cy + 5);
  }

  function drawNoDrawZone() {
    const h = CONFIG.canvas.height;
    const w = CONFIG.canvas.width;
    const zoneH = h * CONFIG.noDrawZoneTop;

    // Subtle gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, zoneH);
    grad.addColorStop(0, 'rgba(40, 40, 80, 0.15)');
    grad.addColorStop(1, 'rgba(40, 40, 80, 0.03)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, zoneH);

    // Dashed border line
    ctx.strokeStyle = 'rgba(100, 100, 160, 0.2)';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, zoneH);
    ctx.lineTo(w, zoneH);
    ctx.stroke();
    ctx.setLineDash([]);

    // "DROP ZONE" label
    ctx.fillStyle = 'rgba(100, 100, 160, 0.15)';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP ZONE', w / 2, zoneH - 6);
  }

  function getLineColor(lineData, currentRound, viewMode) {
    const age = currentRound - lineData.round;
    const owner = lineData.owner;

    if (age === 0) {
      if (viewMode === 'saboteur' && lineData.owner !== Game.getCurrentSaboteur()) {
        return null;
      }
      return owner === 1 ? '#4488ff' : '#ff4444';
    }

    let opacity = CONFIG.lineOpacity[4];
    if (age <= 3) {
      opacity = CONFIG.lineOpacity[age];
    }

    const gray = 140;
    return `rgba(${gray}, ${gray}, ${gray}, ${opacity})`;
  }

  function drawLines(currentRound, viewMode) {
    for (const lineData of Physics.lineBodies) {
      const color = getLineColor(lineData, currentRound, viewMode);
      if (!color) continue;

      const age = currentRound - lineData.round;

      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.lineThickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lineData.x1, lineData.y1);
      ctx.lineTo(lineData.x2, lineData.y2);
      ctx.stroke();

      // Current-round lines get a subtle glow
      if (age === 0 && viewMode !== 'saboteur') {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = CONFIG.lineThickness + 4;
        ctx.filter = 'blur(3px)';
        ctx.beginPath();
        ctx.moveTo(lineData.x1, lineData.y1);
        ctx.lineTo(lineData.x2, lineData.y2);
        ctx.stroke();
        ctx.restore();
      }
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
        if (item.owner !== Game.getCurrentSaboteur()) continue;
      }

      if (item.type === 'bumper') {
        drawBumper(item, alpha);
      } else if (item.type === 'fan') {
        drawFan(item, alpha);
      } else if (item.type === 'magnet') {
        drawMagnet(item, alpha);
      }
    }
  }

  function drawBumper(item, alpha) {
    const r = CONFIG.items.bumper.radius;
    const rgb = item.owner === 1 ? '68, 136, 255' : '255, 68, 68';
    const pulse = 1 + Math.sin(frameCount * 0.05) * 0.05;

    // Glow
    ctx.save();
    ctx.globalAlpha = alpha * 0.15;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 1.5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.filter = 'blur(6px)';
    ctx.fill();
    ctx.restore();

    // Main body
    const grad = ctx.createRadialGradient(item.x - r * 0.3, item.y - r * 0.3, 0, item.x, item.y, r);
    grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    grad.addColorStop(1, `rgba(${rgb}, ${alpha * 0.5})`);

    ctx.beginPath();
    ctx.arc(item.x, item.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight dot
    ctx.beginPath();
    ctx.arc(item.x - r * 0.25, item.y - r * 0.25, r * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
    ctx.fill();
  }

  function drawFan(item, alpha) {
    const rgb = item.owner === 1 ? '68, 136, 255' : '255, 68, 68';
    const r = 15;
    const wavePhase = frameCount * 0.15;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(item.x, item.y);
    ctx.rotate(item.direction);

    // Wind lines (animated)
    ctx.strokeStyle = `rgba(${rgb}, 0.3)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const offset = ((wavePhase + i * 8) % 40);
      const waveY = Math.sin(wavePhase + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(r + offset, waveY - 6 + i * 6);
      ctx.lineTo(r + offset + 12, waveY - 6 + i * 6);
      ctx.stroke();
    }

    // Fan body (wedge)
    ctx.beginPath();
    ctx.arc(0, 0, r, -0.5, 0.5);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Direction arrow
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r + 18, 0);
    ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(r + 18, 0);
    ctx.lineTo(r + 12, -4);
    ctx.lineTo(r + 12, 4);
    ctx.closePath();
    ctx.fillStyle = `rgba(${rgb}, ${alpha * 0.8})`;
    ctx.fill();

    ctx.restore();
  }

  function drawMagnet(item, alpha) {
    const rgb = item.owner === 1 ? '68, 136, 255' : '255, 68, 68';
    const pulse = 1 + Math.sin(frameCount * 0.04) * 0.08;
    const magnetR = CONFIG.items.magnet.radius;

    // Pulsing range circle
    ctx.save();
    ctx.globalAlpha = alpha * 0.08;
    ctx.beginPath();
    ctx.arc(item.x, item.y, magnetR * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.fill();
    ctx.restore();

    // Range indicator rings
    ctx.strokeStyle = `rgba(${rgb}, ${alpha * 0.12})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(item.x, item.y, magnetR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(item.x, item.y, magnetR * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Main body
    const grad = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, 10);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
    grad.addColorStop(0.5, `rgba(${rgb}, ${alpha})`);
    grad.addColorStop(1, `rgba(${rgb}, ${alpha * 0.6})`);

    ctx.beginPath();
    ctx.arc(item.x, item.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // M label
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M', item.x, item.y + 4);
  }

  function drawMarble(marble, color, lightColor, isDropping) {
    if (!marble) return;
    const x = marble.position.x;
    const y = marble.position.y;
    const r = CONFIG.marbles.radius;

    // Glow
    if (isDropping) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.filter = 'blur(8px)';
      ctx.fill();
      ctx.restore();
    }

    // Main sphere with gradient
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, lightColor);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, darkenColor(color, 0.5));

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer ring
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Specular highlight
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
  }

  function drawMarbles(isDropping) {
    drawMarble(Physics.marble1, '#4488ff', '#88bbff', isDropping);
    drawMarble(Physics.marble2, '#ff4444', '#ff8888', isDropping);
  }

  function drawSimMarbles(m1, m2) {
    drawMarble(m1, '#4488ff', '#88bbff', true);
    drawMarble(m2, '#ff4444', '#ff8888', true);
  }

  function drawPreview() {
    const state = Drawing.getPreviewState();
    if (!state) return;

    if (state.isDrawing) {
      const color = state.currentPlayer === 1 ? '#4488ff' : '#ff4444';
      const ghostColor = state.currentPlayer === 1 ? 'rgba(68, 136, 255, 0.5)' : 'rgba(255, 68, 68, 0.5)';

      // Preview line with glow
      ctx.save();
      ctx.strokeStyle = ghostColor;
      ctx.lineWidth = CONFIG.lineThickness + 4;
      ctx.filter = 'blur(3px)';
      ctx.beginPath();
      ctx.moveTo(state.startX, state.startY);
      ctx.lineTo(state.mouseX, state.mouseY);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = color;
      ctx.lineWidth = CONFIG.lineThickness;
      ctx.setLineDash([6, 4]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(state.startX, state.startY);
      ctx.lineTo(state.mouseX, state.mouseY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ink cost preview
      const cost = Drawing.calculateInkCost(state.startX, state.startY, state.mouseX, state.mouseY);
      ctx.fillStyle = cost > Drawing.getInk() ? '#ff4444' : 'rgba(255,255,255,0.5)';
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(cost)} ink`, (state.startX + state.mouseX) / 2, (state.startY + state.mouseY) / 2 - 12);
    }

    if (state.selectedItem && !state.placingFan) {
      // Ghost preview of selected item at cursor
      drawItemGhost(state.selectedItem, state.mouseX, state.mouseY, state.currentPlayer);
    }

    if (state.placingFan) {
      const angle = Math.atan2(state.mouseY - state.fanPlaceY, state.mouseX - state.fanPlaceX);

      // Pulsing circle at placement point
      const pulse = 1 + Math.sin(frameCount * 0.1) * 0.1;
      ctx.beginPath();
      ctx.arc(state.fanPlaceX, state.fanPlaceY, 18 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Direction line
      ctx.beginPath();
      ctx.moveTo(state.fanPlaceX, state.fanPlaceY);
      ctx.lineTo(
        state.fanPlaceX + Math.cos(angle) * 45,
        state.fanPlaceY + Math.sin(angle) * 45
      );
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cone preview
      ctx.save();
      ctx.translate(state.fanPlaceX, state.fanPlaceY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, CONFIG.items.fan.coneRadius * 0.6, -0.4, 0.4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 204, 0, 0.08)';
      ctx.fill();
      ctx.restore();

      // Label
      ctx.fillStyle = '#ffcc00';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Click to set direction', state.fanPlaceX, state.fanPlaceY - 28);
    }
  }

  function drawItemGhost(type, x, y, player) {
    ctx.save();
    ctx.globalAlpha = 0.4;

    const inNoZone = Drawing.isInNoDrawZone(x, y);
    if (inNoZone) ctx.globalAlpha = 0.15;

    const rgb = player === 1 ? '68, 136, 255' : '255, 68, 68';

    if (type === 'bumper') {
      ctx.beginPath();
      ctx.arc(x, y, CONFIG.items.bumper.radius, 0, Math.PI * 2);
      ctx.strokeStyle = inNoZone ? '#ff0000' : `rgba(${rgb}, 1)`;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (type === 'fan') {
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = inNoZone ? '#ff0000' : `rgba(${rgb}, 1)`;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (type === 'magnet') {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = inNoZone ? '#ff0000' : `rgba(${rgb}, 1)`;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(x, y, CONFIG.items.magnet.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb}, 0.2)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Cost indicator
    const cost = Drawing.getItemPointCost(type);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = inNoZone ? '#ff4444' : '#ffcc00';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(inNoZone ? 'NO PLACE' : `${cost}pt`, x, y - 22);

    ctx.restore();
  }

  function drawTrail(trail) {
    if (!trail || trail.length === 0) return;
    const now = Date.now();

    for (const point of trail) {
      const age = now - point.time;
      if (age > CONFIG.marbleTrail.durationMs) continue;

      const t = age / CONFIG.marbleTrail.durationMs;
      const alpha = CONFIG.marbleTrail.opacity * (1 - t);
      const size = 3 * (1 - t * 0.5);

      const rgb = point.player === 1 ? '68, 136, 255' : '255, 68, 68';
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
      ctx.fill();
    }
  }

  // Helper to darken a hex color
  function darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
  }

  function render(currentRound, viewMode, trail) {
    frameCount++;
    Effects.resetShake();
    Effects.applyShake();

    clear();
    drawDepthZones();
    drawNoDrawZone();
    drawBuckets(viewMode);
    drawLines(currentRound, viewMode);
    drawItems(currentRound, viewMode);
    drawMarbles(viewMode === 'drop');
    drawPreview();
    if (trail) drawTrail(trail);
    Effects.update();
    Effects.draw();

    Effects.resetShake();
  }

  function renderSimulation(simMarble1, simMarble2, currentRound, viewMode, trail) {
    frameCount++;
    clear();
    drawDepthZones();
    drawNoDrawZone();
    drawBuckets(viewMode);
    drawLines(currentRound, viewMode);
    drawItems(currentRound, viewMode);
    drawSimMarbles(simMarble1, simMarble2);
    if (trail) drawTrail(trail);
    Effects.update();
    Effects.draw();
  }

  return {
    init, render, renderSimulation, clear,
    get ctx() { return ctx; },
    get frameCount() { return frameCount; },
  };
})();
