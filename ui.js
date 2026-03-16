// ui.js — score display, ink bar, shop panel, role indicator

const UI = (() => {
  let p1Name = 'Player 1';
  let p2Name = 'Player 2';

  function init() {
    // Start button
    document.getElementById('startBtn').addEventListener('click', () => {
      p1Name = document.getElementById('p1name').value || 'Player 1';
      p2Name = document.getElementById('p2name').value || 'Player 2';
      Game.startGame(p1Name, p2Name);
    });

    document.getElementById('roundStartBtn').addEventListener('click', () => {
      Game.beginRound();
    });

    document.getElementById('readyBtn').addEventListener('click', () => {
      Game.builderReady();
    });

    document.getElementById('sabReadyBtn').addEventListener('click', () => {
      Game.saboteurReady();
    });

    document.getElementById('simBtn').addEventListener('click', () => {
      Game.runBuilderSimulation();
    });

    document.getElementById('sabSimBtn').addEventListener('click', () => {
      Game.runSaboteurSimulation();
    });

    document.getElementById('eraseModeBtn').addEventListener('click', (e) => {
      const active = e.target.classList.toggle('active');
      Drawing.setEraseMode(active);
    });

    document.getElementById('sabDrawBtn').addEventListener('click', (e) => {
      const active = e.target.classList.toggle('active');
      if (active) {
        Drawing.selectItem(null);
        // Enable drawing mode for saboteur
        document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('selected'));
      }
    });

    // Item buttons
    document.querySelectorAll('.item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        Drawing.selectItem(item);
        document.getElementById('sabDrawBtn').classList.remove('active');
      });
    });

    document.getElementById('scoreNextBtn').addEventListener('click', () => {
      Game.showShop();
    });

    document.getElementById('shopDoneBtn').addEventListener('click', () => {
      Game.shopDone();
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
      location.reload();
    });
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
    showScreen('roundStart');
  }

  function showGameScreen(phase, builderPlayer, round, p1Score, p2Score) {
    showScreen('gameScreen');

    document.getElementById('hudP1Name').textContent = p1Name;
    document.getElementById('hudP2Name').textContent = p2Name;
    document.getElementById('hudP1Score').textContent = p1Score;
    document.getElementById('hudP2Score').textContent = p2Score;
    document.getElementById('hudRound').textContent = `Round ${round}`;

    // Reset toggle states between phases
    document.getElementById('eraseModeBtn').classList.remove('active');
    document.getElementById('sabDrawBtn').classList.remove('active');
    document.querySelectorAll('.item-btn').forEach(b => b.classList.remove('selected'));

    if (phase === 'builder') {
      document.getElementById('hudPhase').textContent = `${builderPlayer === 1 ? p1Name : p2Name} — Builder Phase`;
      document.getElementById('hudP1Role').textContent = builderPlayer === 1 ? '[Builder]' : '[Saboteur]';
      document.getElementById('hudP2Role').textContent = builderPlayer === 2 ? '[Builder]' : '[Saboteur]';
      document.getElementById('builderControls').style.display = 'flex';
      document.getElementById('saboteurControls').style.display = 'none';
      document.getElementById('dropOverlay').style.display = 'none';
    } else if (phase === 'saboteur') {
      const sabPlayer = builderPlayer === 1 ? 2 : 1;
      document.getElementById('hudPhase').textContent = `${sabPlayer === 1 ? p1Name : p2Name} — Saboteur Phase`;
      document.getElementById('builderControls').style.display = 'none';
      document.getElementById('saboteurControls').style.display = 'flex';
      document.getElementById('dropOverlay').style.display = 'none';
    } else if (phase === 'drop') {
      document.getElementById('hudPhase').textContent = 'Drop Phase';
      document.getElementById('builderControls').style.display = 'none';
      document.getElementById('saboteurControls').style.display = 'none';
      document.getElementById('dropOverlay').style.display = 'flex';
    }
  }

  function updateInkBar(current, max) {
    const pct = Math.max(0, (current / max) * 100);
    document.getElementById('inkFill').style.width = pct + '%';
    document.getElementById('inkValue').textContent = Math.round(current);
  }

  function updateSimCount(count) {
    document.getElementById('simCount').textContent = count;
    document.getElementById('simBtn').disabled = count <= 0;
  }

  function showScoreReveal(p1Score, p2Score, roundResult) {
    document.getElementById('scoreDetails').innerHTML = roundResult.events
      .map(e => `<div>${e}</div>`).join('');
    document.getElementById('revealP1').innerHTML =
      `<span class="p1-color">${p1Name}: ${p1Score}</span>`;
    document.getElementById('revealP2').innerHTML =
      `<span class="p2-color">${p2Name}: ${p2Score}</span>`;
    showScreen('scoreReveal');
  }

  function showShop(p1Score, p2Score, builderPlayer) {
    document.getElementById('shopP1Name').textContent = p1Name;
    document.getElementById('shopP2Name').textContent = p2Name;
    document.getElementById('shopP1Points').textContent = p1Score;
    document.getElementById('shopP2Points').textContent = p2Score;

    buildShopPanel('shopP1Items', 1, p1Score, builderPlayer === 1);
    buildShopPanel('shopP2Items', 2, p2Score, builderPlayer === 2);

    showScreen('shopScreen');
  }

  function buildShopPanel(containerId, player, points, isBuilder) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // Ink refills
    const smallInkCost = isBuilder ? 1 : 2;
    const largeInkCost = isBuilder ? 2 : 4;

    addShopButton(container, `Ink Refill (Small) — ${smallInkCost}pt`, smallInkCost, points, () => {
      Game.buyItem(player, 'inkSmall', smallInkCost);
    });
    addShopButton(container, `Ink Refill (Large) — ${largeInkCost}pt`, largeInkCost, points, () => {
      Game.buyItem(player, 'inkLarge', largeInkCost);
    });

    // Items
    const fanCost = isBuilder ? 4 : 2;
    const bumperCost = isBuilder ? 4 : 2;
    const magnetCost = isBuilder ? 6 : 3;

    addShopButton(container, `Fan — ${fanCost}pt`, fanCost, points, () => {
      Game.buyItem(player, 'fan', fanCost);
    });
    addShopButton(container, `Bumper — ${bumperCost}pt`, bumperCost, points, () => {
      Game.buyItem(player, 'bumper', bumperCost);
    });
    addShopButton(container, `Magnet — ${magnetCost}pt`, magnetCost, points, () => {
      Game.buyItem(player, 'magnet', magnetCost);
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
      btn.textContent += ' ✓';
    });
    container.appendChild(btn);
  }

  function showGameOver(p1Score, p2Score) {
    let winner;
    if (p1Score > p2Score) winner = p1Name + ' Wins!';
    else if (p2Score > p1Score) winner = p2Name + ' Wins!';
    else winner = "It's a Tie!";

    document.getElementById('winnerText').textContent = winner;
    document.getElementById('finalP1').innerHTML =
      `<span class="p1-color">${p1Name}: ${p1Score}</span>`;
    document.getElementById('finalP2').innerHTML =
      `<span class="p2-color">${p2Name}: ${p2Score}</span>`;
    showScreen('gameOver');
  }

  function updateItemCosts(saboteurPlayer) {
    const btns = document.querySelectorAll('.item-btn');
    btns.forEach(btn => {
      const item = btn.dataset.item;
      const cost = CONFIG.items[item].cost;
      btn.querySelector('.item-cost').textContent = cost;
    });
  }

  return {
    init, showScreen, showRoundStart, showGameScreen,
    updateInkBar, updateSimCount, showScoreReveal,
    showShop, showGameOver, updateItemCosts,
    get p1Name() { return p1Name; },
    get p2Name() { return p2Name; },
  };
})();
