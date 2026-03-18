// ui.js — score display, ink bar, shop panel, role indicator, keyboard shortcuts, tutorial, insults

const UI = (() => {
  let p1Name = 'Player 1';
  let p2Name = 'Player 2';
  let currentPhase = null;
  let tutorialShown = { builder: false, saboteur: false };
  let lastHandoffRole = null;

  function init() {
    // Sound init on first interaction
    const initSound = () => {
      Sound.init();
      document.removeEventListener('click', initSound);
      document.removeEventListener('keydown', initSound);
    };
    document.addEventListener('click', initSound);
    document.addEventListener('keydown', initSound);

    // Start button
    document.getElementById('startBtn').addEventListener('click', () => {
      Sound.buttonClick();
      p1Name = document.getElementById('p1name').value || 'Player 1';
      p2Name = document.getElementById('p2name').value || 'Player 2';
      Game.startGame(p1Name, p2Name);
    });

    document.getElementById('roundStartBtn').addEventListener('click', () => {
      Sound.roundStart();
      Game.beginRound();
    });

    // Handoff button
    document.getElementById('handoffBtn').addEventListener('click', () => {
      Sound.buttonClick();
      Game.handoffReady();
    });

    document.getElementById('readyBtn').addEventListener('click', () => {
      Sound.phaseTransition();
      Game.builderReady();
    });

    document.getElementById('sabReadyBtn').addEventListener('click', () => {
      Sound.phaseTransition();
      Game.saboteurReady();
    });

    document.getElementById('simBtn').addEventListener('click', () => {
      Sound.simulate();
      Game.runBuilderSimulation();
    });

    document.getElementById('sabSimBtn').addEventListener('click', () => {
      Sound.simulate();
      Game.runSaboteurSimulation();
    });

    // Undo button
    document.getElementById('undoBtn').addEventListener('click', () => {
      Drawing.undo();
    });

    document.getElementById('eraseModeBtn').addEventListener('click', (e) => {
      Sound.buttonClick();
      const active = e.target.classList.toggle('active');
      Drawing.setEraseMode(active);
      document.querySelectorAll('#builderControls .item-btn').forEach(b => b.classList.remove('selected'));
    });

    document.getElementById('eraseModeBtn2').addEventListener('click', (e) => {
      Sound.buttonClick();
      const active = e.target.classList.toggle('active');
      Drawing.setEraseMode(active);
      document.querySelectorAll('#saboteurControls .item-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById('sabDrawBtn').classList.remove('active');
    });

    document.getElementById('sabDrawBtn').addEventListener('click', (e) => {
      Sound.buttonClick();
      const active = e.target.classList.toggle('active');
      if (active) {
        Drawing.selectItem(null);
        document.querySelectorAll('#saboteurControls .item-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('eraseModeBtn2').classList.remove('active');
        Drawing.setEraseMode(false);
      }
    });

    // Insult button
    document.getElementById('insultBtn').addEventListener('click', () => {
      const insult = Insults.hurlInsult();
      if (insult) Sound.insultHurl();
    });

    // Item buttons (both panels)
    document.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sound.buttonClick();
        const item = btn.dataset.item;
        const panel = btn.closest('.controls-panel');
        panel.querySelectorAll('.item-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Drawing.selectItem(item);
        if (panel.id === 'builderControls') {
          document.getElementById('eraseModeBtn').classList.remove('active');
          Drawing.setEraseMode(false);
        } else {
          document.getElementById('eraseModeBtn2').classList.remove('active');
          document.getElementById('sabDrawBtn').classList.remove('active');
          Drawing.setEraseMode(false);
        }
      });
    });

    document.getElementById('scoreNextBtn').addEventListener('click', () => {
      Sound.buttonClick();
      Game.showShop();
    });

    document.getElementById('shopDoneBtn').addEventListener('click', () => {
      Sound.buttonClick();
      Game.shopDone();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      Sound.buttonClick();
      Effects.stopConfetti();
      location.reload();
    });

    // Mute button
    document.getElementById('muteBtn').addEventListener('click', () => {
      const muted = Sound.toggleMute();
      document.getElementById('muteBtn').textContent = muted ? '/' : '\u266A';
    });

    // Tutorial dismiss
    document.getElementById('tutorialBtn').addEventListener('click', () => {
      Sound.buttonClick();
      document.getElementById('tutorialOverlay').style.display = 'none';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Enter key for lobby
    document.getElementById('p1name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('startBtn').click();
    });
    document.getElementById('p2name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('startBtn').click();
    });
  }

  const itemKeys = {
    '1': 'fan',
    '2': 'bumper',
    '3': 'magnet',
    '4': 'wall',
    '5': 'ice',
    '6': 'bomb',
  };

  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return;

    if (currentPhase === 'builder') {
      switch (e.key.toLowerCase()) {
        case 's':
          document.getElementById('simBtn').click();
          break;
        case 'e':
          document.getElementById('eraseModeBtn').click();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            Drawing.undo();
          } else {
            Drawing.undo();
          }
          break;
        case 'escape':
          Drawing.selectItem(null);
          Drawing.setEraseMode(false);
          document.getElementById('eraseModeBtn').classList.remove('active');
          document.querySelectorAll('#builderControls .item-btn').forEach(b => b.classList.remove('selected'));
          break;
        case 'enter':
          document.getElementById('readyBtn').click();
          break;
        default:
          if (itemKeys[e.key]) {
            const btn = document.querySelector(`#builderControls .item-btn[data-item="${itemKeys[e.key]}"]`);
            if (btn) btn.click();
          }
          break;
      }
    } else if (currentPhase === 'saboteur') {
      switch (e.key.toLowerCase()) {
        case 's':
          document.getElementById('sabSimBtn').click();
          break;
        case 'd':
          document.getElementById('sabDrawBtn').click();
          break;
        case 'e':
          document.getElementById('eraseModeBtn2').click();
          break;
        case 'i':
          document.getElementById('insultBtn').click();
          break;
        case 'z':
          Drawing.undo();
          break;
        case 'escape':
          Drawing.selectItem(null);
          Drawing.setEraseMode(false);
          document.getElementById('eraseModeBtn2').classList.remove('active');
          document.getElementById('sabDrawBtn').classList.remove('active');
          document.querySelectorAll('#saboteurControls .item-btn').forEach(b => b.classList.remove('selected'));
          break;
        case 'enter':
          document.getElementById('sabReadyBtn').click();
          break;
        default:
          if (itemKeys[e.key]) {
            const btn = document.querySelector(`#saboteurControls .item-btn[data-item="${itemKeys[e.key]}"]`);
            if (btn) btn.click();
          }
          break;
      }
    }
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = 'none';
    });
    const el = document.getElementById(screenId);
    el.classList.add('active');
    el.style.display = 'flex';
  }

  function showRoundStart(round, p1Role, p2Role) {
    document.getElementById('roundTitle').textContent = `Round ${round}`;
    document.getElementById('roundP1Name').textContent = p1Name;
    document.getElementById('roundP2Name').textContent = p2Name;
    document.getElementById('roundP1Role').textContent = p1Role;
    document.getElementById('roundP2Role').textContent = p2Role;

    // Round progress pips
    const progressEl = document.getElementById('roundProgress');
    progressEl.innerHTML = '';
    for (let i = 1; i <= CONFIG.rounds; i++) {
      const pip = document.createElement('div');
      pip.className = 'round-pip';
      if (i < round) pip.classList.add('completed');
      if (i === round) pip.classList.add('current');
      progressEl.appendChild(pip);
    }

    const hints = [
      'The Builder goes first. Saboteur, look away!',
      'Roles have swapped! New round, new strategy.',
      'Old lines still affect physics, even when faded.',
      'Items cost points. Spend wisely!',
      'The Saboteur\'s simulation shows the real trajectory.',
      'Lines near buckets cost up to 8x more ink.',
      'Jackpot: both marbles in your bucket = 5 points!',
      'Final round! Make it count.',
    ];
    document.getElementById('roundHint').textContent = hints[Math.min(round - 1, hints.length - 1)];

    showScreen('roundStart');
  }

  function showHandoff(playerName, role) {
    lastHandoffRole = role;
    document.getElementById('handoffTitle').textContent = 'Pass the device!';
    document.getElementById('handoffMessage').textContent =
      `${playerName}, it's your turn as ${role.charAt(0).toUpperCase() + role.slice(1)}.`;
    showScreen('handoffScreen');
  }

  function showGameScreen(phase, builderPlayer, round, p1Score, p2Score) {
    currentPhase = phase;
    showScreen('gameScreen');

    document.getElementById('hudP1Name').textContent = p1Name;
    document.getElementById('hudP2Name').textContent = p2Name;
    document.getElementById('hudP1Score').textContent = p1Score;
    document.getElementById('hudP2Score').textContent = p2Score;
    document.getElementById('hudRound').textContent = `Round ${round}`;

    // Reset toggle states
    document.getElementById('eraseModeBtn').classList.remove('active');
    if (document.getElementById('eraseModeBtn2')) {
      document.getElementById('eraseModeBtn2').classList.remove('active');
    }
    document.getElementById('sabDrawBtn').classList.remove('active');
    document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('selected'));

    const p1RoleBadge = document.getElementById('hudP1Role');
    const p2RoleBadge = document.getElementById('hudP2Role');

    if (phase === 'builder') {
      const bName = builderPlayer === 1 ? p1Name : p2Name;
      document.getElementById('hudPhase').textContent = `${bName} — Builder Phase`;

      p1RoleBadge.textContent = builderPlayer === 1 ? 'Builder' : 'Saboteur';
      p1RoleBadge.className = 'role-badge ' + (builderPlayer === 1 ? 'builder' : 'saboteur');
      p2RoleBadge.textContent = builderPlayer === 2 ? 'Builder' : 'Saboteur';
      p2RoleBadge.className = 'role-badge ' + (builderPlayer === 2 ? 'builder' : 'saboteur');

      document.getElementById('builderControls').style.display = 'flex';
      document.getElementById('saboteurControls').style.display = 'none';
      document.getElementById('dropOverlay').style.display = 'none';

      if (!tutorialShown.builder) {
        tutorialShown.builder = true;
        showTutorial('Builder Phase', `
          <div class="tutorial-step"><span class="step-num">1</span><p><strong>Click & drag</strong> on the canvas to draw lines. Lines cost ink.</p></div>
          <div class="tutorial-step"><span class="step-num">2</span><p>Route <strong>your marble</strong> (colored dot at top) into <strong>your bucket</strong> (bottom).</p></div>
          <div class="tutorial-step"><span class="step-num">3</span><p>Press <strong>S</strong> to simulate and preview the drop. <strong>Z</strong> to undo.</p></div>
          <div class="tutorial-step"><span class="step-num">4</span><p>Press <strong>Enter</strong> or click Ready when done. The Saboteur goes next!</p></div>
          <p style="margin-top:12px; color: #888; font-size:12px;">Items (1-6) cost score points. E = erase. Hold Shift for line snap. Esc = deselect.</p>
        `);
      }
    } else if (phase === 'saboteur') {
      const sabPlayer = builderPlayer === 1 ? 2 : 1;
      const sName = sabPlayer === 1 ? p1Name : p2Name;
      document.getElementById('hudPhase').textContent = `${sName} — Saboteur Phase`;

      document.getElementById('builderControls').style.display = 'none';
      document.getElementById('saboteurControls').style.display = 'flex';
      document.getElementById('dropOverlay').style.display = 'none';

      if (!tutorialShown.saboteur) {
        tutorialShown.saboteur = true;
        showTutorial('Saboteur Phase', `
          <div class="tutorial-step"><span class="step-num">1</span><p>Press <strong>S</strong> to watch the marble simulation. The trail fades — watch closely!</p></div>
          <div class="tutorial-step"><span class="step-num">2</span><p>Place <strong>items</strong> (1-6) where you think the Builder's edits are to redirect marbles.</p></div>
          <div class="tutorial-step"><span class="step-num">3</span><p>Press <strong>I</strong> to hurl insults! Distract your opponent with trash talk.</p></div>
          <div class="tutorial-step"><span class="step-num">4</span><p>Your placements are <strong>blind</strong> — the sim won't update with your items.</p></div>
          <p style="margin-top:12px; color: #888; font-size:12px;">D = draw lines (costs 2.5x ink). Press Enter or click Ready when done.</p>
        `);
      }
    } else if (phase === 'drop') {
      document.getElementById('hudPhase').textContent = 'Drop Phase';
      document.getElementById('builderControls').style.display = 'none';
      document.getElementById('saboteurControls').style.display = 'none';
      document.getElementById('dropOverlay').style.display = 'flex';
      currentPhase = 'drop';
    }
  }

  function showTutorial(title, contentHtml) {
    document.getElementById('tutorialTitle').textContent = title;
    document.getElementById('tutorialContent').innerHTML = contentHtml;
    document.getElementById('tutorialOverlay').style.display = 'flex';
  }

  function updateInkBar(current, max) {
    const pct = Math.max(0, (current / max) * 100);
    const fill = document.getElementById('inkFill');
    fill.style.width = pct + '%';
    fill.className = 'ink-fill' + (pct < 20 ? ' low' : '');
    document.getElementById('inkValue').textContent = Math.round(current);
  }

  function updateSimCount(count) {
    document.getElementById('simCount').textContent = count;
    document.getElementById('simBtn').disabled = count <= 0;
  }

  function showScoreReveal(p1Score, p2Score, roundResult) {
    const details = document.getElementById('scoreDetails');
    details.innerHTML = roundResult.events
      .map(e => `<div class="score-event">${e}</div>`).join('');
    document.getElementById('revealP1').innerHTML =
      `<span class="p1-color">${p1Name}: ${p1Score}</span>`;
    document.getElementById('revealP2').innerHTML =
      `<span class="p2-color">${p2Name}: ${p2Score}</span>`;
    showScreen('scoreReveal');
    currentPhase = null;
  }

  function showShop(p1Score, p2Score, builderPlayer) {
    document.getElementById('shopP1Name').textContent = p1Name;
    document.getElementById('shopP2Name').textContent = p2Name;
    document.getElementById('shopP1Points').textContent = p1Score;
    document.getElementById('shopP2Points').textContent = p2Score;

    const nextBuilder = builderPlayer === 1 ? 2 : 1;
    const p1NextRole = nextBuilder === 1 ? 'Builder' : 'Saboteur';
    const p2NextRole = nextBuilder === 2 ? 'Builder' : 'Saboteur';

    const p1Tag = document.getElementById('shopP1RoleTag');
    p1Tag.textContent = `Next: ${p1NextRole}`;
    p1Tag.className = 'shop-role-tag ' + p1NextRole.toLowerCase();

    const p2Tag = document.getElementById('shopP2RoleTag');
    p2Tag.textContent = `Next: ${p2NextRole}`;
    p2Tag.className = 'shop-role-tag ' + p2NextRole.toLowerCase();

    buildShopPanel('shopP1Items', 1, p1Score, nextBuilder === 1);
    buildShopPanel('shopP2Items', 2, p2Score, nextBuilder === 2);

    showScreen('shopScreen');
  }

  function buildShopPanel(containerId, player, points, isBuilder) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Ink section
    const inkLabel = document.createElement('div');
    inkLabel.className = 'shop-section-label';
    inkLabel.textContent = 'Ink Refills';
    container.appendChild(inkLabel);

    const smallInkCost = isBuilder ? 1 : 2;
    const largeInkCost = isBuilder ? 2 : 4;
    const rateLabel = isBuilder ? '(Builder rate)' : '(Saboteur rate)';

    addShopButton(container, `+50 Ink — ${smallInkCost}pt ${rateLabel}`, smallInkCost, points, () => {
      Sound.shopBuy();
      Game.buyItem(player, 'inkSmall', smallInkCost);
    });
    addShopButton(container, `+150 Ink — ${largeInkCost}pt ${rateLabel}`, largeInkCost, points, () => {
      Sound.shopBuy();
      Game.buyItem(player, 'inkLarge', largeInkCost);
    });

    // Power-ups section
    const powerLabel = document.createElement('div');
    powerLabel.className = 'shop-section-label';
    powerLabel.textContent = 'Power-ups';
    container.appendChild(powerLabel);

    const simCost = 2;
    addShopButton(container, `+2 Simulations — ${simCost}pt`, simCost, points, () => {
      Sound.shopBuy();
      Game.buyItem(player, 'extraSim', simCost);
    });
  }

  function addShopButton(container, label, cost, points, onClick) {
    const btn = document.createElement('button');
    btn.className = 'shop-item-btn';
    btn.textContent = label;
    btn.disabled = points < cost;
    btn.addEventListener('click', () => {
      onClick();
      btn.disabled = true;
      btn.classList.add('purchased');
      btn.textContent = label + ' \u2714';
    });
    container.appendChild(btn);
  }

  function showGameOver(p1Score, p2Score) {
    let winner, winnerColor;
    if (p1Score > p2Score) {
      winner = p1Name + ' Wins!';
      winnerColor = '#4488ff';
    } else if (p2Score > p1Score) {
      winner = p2Name + ' Wins!';
      winnerColor = '#ff4444';
    } else {
      winner = "It's a Tie!";
      winnerColor = '#ffcc00';
    }

    document.getElementById('winnerText').textContent = winner;
    document.getElementById('winnerText').style.color = winnerColor;
    document.getElementById('finalP1').innerHTML =
      `<span class="p1-color">${p1Name}: ${p1Score}</span>`;
    document.getElementById('finalP2').innerHTML =
      `<span class="p2-color">${p2Name}: ${p2Score}</span>`;

    if (p1Score !== p2Score) {
      Sound.gameOver(true);
    } else {
      Sound.gameOver(false);
    }

    const goCanvas = document.getElementById('gameOverCanvas');
    Effects.startConfetti(winnerColor, goCanvas.width, goCanvas.height);
    const goCtx = goCanvas.getContext('2d');

    function confettiLoop() {
      if (!Effects.confettiActive) return;
      goCtx.clearRect(0, 0, goCanvas.width, goCanvas.height);
      Effects.updateConfetti();
      Effects.drawConfetti(goCtx);
      requestAnimationFrame(confettiLoop);
    }
    confettiLoop();

    showScreen('gameOver');
    currentPhase = null;
  }

  function updateItemCosts(currentPlayer, role) {
    const btns = document.querySelectorAll('.item-btn');
    btns.forEach(btn => {
      const item = btn.dataset.item;
      if (!CONFIG.items[item]) return;
      const baseCost = CONFIG.items[item].cost;
      const cost = role === 'builder'
        ? baseCost * CONFIG.ink.builderItemMultiplier
        : baseCost;
      btn.querySelector('.item-cost').textContent = cost;
    });
  }

  return {
    init, showScreen, showRoundStart, showGameScreen,
    showHandoff,
    updateInkBar, updateSimCount, showScoreReveal,
    showShop, showGameOver, updateItemCosts, showTutorial,
    get p1Name() { return p1Name; },
    get p2Name() { return p2Name; },
    get currentPhase() { return currentPhase; },
    get lastHandoffRole() { return lastHandoffRole; },
  };
})();
