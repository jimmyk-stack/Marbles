// insults.js — Premade insult system hurled during opponent's turn

const Insults = (() => {
  const insultBank = [
    // Trash talk
    "Is that the best you can do?",
    "My grandma draws better lines!",
    "You call that a strategy?",
    "I've seen better plans from a toddler!",
    "This is almost too easy...",
    "Are you even trying?",
    "Wow, that's... creative. In a bad way.",
    "I can already see where this is going. Nowhere.",
    "Bold move! Boldly terrible.",
    "Keep going, I love watching disasters unfold.",
    // Saboteur-specific
    "Nice lines. I'll enjoy destroying them.",
    "Oh, you think you're clever? Think again.",
    "Your marble is MINE.",
    "I see your plan. It won't work.",
    "That bucket's looking pretty empty...",
    // Builder-specific taunts
    "Good luck getting past my bumpers!",
    "Hope you like detours!",
    "Your marble will never see that bucket.",
    "I've already won. You just don't know it yet.",
    // Silly/fun
    "Beep boop, you're a noob!",
    "404: Skill not found.",
    "Have you considered a different hobby?",
    "This is the way. Not YOUR way, but THE way.",
    "Marble go BRRRR... into MY bucket!",
    "You dropped this: L",
    "That marble is lost and confused. Like you.",
    "Plot twist: you lose!",
    "Ah yes, the classic 'lose on purpose' strategy.",
    "I'm not even worried. Should I be?",
    "Your ink is wasted. Like your potential.",
  ];

  let lastUsed = -1;
  let cooldownActive = false;
  let activeInsult = null;
  let insultTimer = null;

  function getRandomInsult() {
    let idx;
    do {
      idx = Math.floor(Math.random() * insultBank.length);
    } while (idx === lastUsed && insultBank.length > 1);
    lastUsed = idx;
    return insultBank[idx];
  }

  function hurlInsult() {
    if (cooldownActive) return null;

    const insult = getRandomInsult();
    activeInsult = insult;
    cooldownActive = true;

    // Show insult on banner
    const banner = document.getElementById('insultBanner');
    const text = document.getElementById('insultText');
    if (banner && text) {
      text.textContent = insult;
      banner.style.display = 'flex';
      banner.classList.remove('insult-exit');
      banner.classList.add('insult-enter');

      // Clear previous timer
      if (insultTimer) clearTimeout(insultTimer);

      // Hide after 3 seconds
      insultTimer = setTimeout(() => {
        banner.classList.remove('insult-enter');
        banner.classList.add('insult-exit');
        setTimeout(() => {
          banner.style.display = 'none';
          activeInsult = null;
        }, 400);
      }, 3000);
    }

    // Cooldown for 5 seconds
    setTimeout(() => {
      cooldownActive = false;
    }, 5000);

    return insult;
  }

  function isOnCooldown() {
    return cooldownActive;
  }

  function reset() {
    cooldownActive = false;
    activeInsult = null;
    if (insultTimer) clearTimeout(insultTimer);
    const banner = document.getElementById('insultBanner');
    if (banner) banner.style.display = 'none';
  }

  return {
    hurlInsult,
    isOnCooldown,
    reset,
    get activeInsult() { return activeInsult; },
  };
})();
