# Polish V2 — Full Production Pass

## 1. Animated Lobby with Live Demo
- Starfield/floating particle background behind the lobby
- Animated marble physics demo playing behind the title (two marbles bouncing around with some lines, auto-resetting — shows the game before you even start)
- Title text with shimmer animation
- Smooth entrance animations for all lobby elements

## 2. "Pass the Device" Handoff Screen
- Between builder→saboteur transition, show a full-screen handoff overlay:
  "Pass to [Player Name]" with their color, big and dramatic
- Prevents the saboteur from seeing the builder's work during transition
- Click/press to dismiss, auto-plays the sim intro for saboteur
- Same concept between rounds in hotseat

## 3. Drop Phase Cinematic
- 3-2-1 countdown overlay before marbles release (with escalating tones)
- Persistent glowing trail behind marbles during the real drop (not just particles)
- Speed lines radiating from fast-moving marbles
- Slow-motion effect on bucket capture (physics timescale drops to 0.3x for ~1 second)
- Camera subtle zoom toward whichever marble is closest to a bucket
- "GOAL!" burst text on bucket capture in real-time (not just at score reveal)

## 4. Undo/Redo for Drawing
- Ctrl+Z undoes last drawn line (refunds ink)
- Ctrl+Y/Ctrl+Shift+Z redoes
- History stack per turn (cleared when turn ends)
- Visual flash on undo/redo

## 5. Line Snap & Drawing Guides
- Hold Shift while drawing to snap to horizontal/vertical/45° angles
- Show proximity cost zone indicator at cursor (subtle "2x"/"4x"/"8x" label)
- Cursor changes based on current mode (crosshair for draw, X for erase, item icon for placement)

## 6. Round Progress & Score Ticker
- Visual round progress bar in the HUD (8 dots/pips, filled as rounds complete)
- Animated score counter that rolls up/down on change (not just instant text swap)
- Score differential indicator ("+2 lead" / "Tied" shown subtly)

## 7. Post-Drop Replay
- After score reveal, option to "Watch Replay" — replays the drop at 1.5x speed
- Trail visualization shows full path both marbles took
- Helps players learn from each round

## 8. Ambient Background Music
- Generative ambient music using Web Audio API oscillators
- Soft pads that shift tone based on game phase:
  - Lobby: calm, inviting
  - Builder: focused, methodical
  - Saboteur: tense, suspenseful
  - Drop: energetic, building
  - Score: triumphant or sympathetic
- Volume auto-adjusts, respects mute toggle
- Layered so it evolves rather than loops

## 9. Enhanced Score Reveal
- Animated marble paths drawn on a mini canvas showing trajectory
- Score numbers count up with each event
- Camera/canvas snapshot of the final marble positions
- Dramatic pause between events for anticipation

## 10. Victory Screen Overhaul
- Full stats summary: rounds won, jackpots, total items placed, lines drawn
- "MVP Moment" — highlights the single most impactful play
- Larger confetti canvas, winner's color theme takes over the whole screen
- Rematch button that keeps names

## 11. Visual Atmosphere
- Subtle animated grid on canvas (very faint, helps with spatial awareness)
- Floating dust motes / ambient particles on the canvas
- Vignette effect (darker corners)
- Bucket "breathing" animation (subtle scale pulse)
- Marble shadows/reflections on the ground plane
- Items emit subtle ambient particles (fan has wind dots, magnet has field lines)

## 12. In-Game Help & Tooltips
- "?" button opens a help panel with rules, controls, scoring
- Item buttons show tooltip on hover with description and stats
- First-round builder gets a "draw here" arrow pointing at the canvas
- Ink cost breakdown tooltip on the ink bar

## 13. Better Saboteur Experience
- Simulation trail is more dramatic — glowing, with directional arrows
- "Deviation detected" visual pulse when marble path differs from expected (based on visible gray lines)
- Heat map overlay option showing where marbles spent the most time
- Item placement preview shows estimated effect radius more clearly

## 14. Canvas Quality & Performance
- HiDPI/Retina canvas scaling (window.devicePixelRatio)
- Offscreen canvas for static elements (background, depth zones) — only redraw dynamic elements each frame
- RequestAnimationFrame with proper delta time everywhere

## 15. Game Feel Polish
- Button press animations (scale down on click, spring back)
- Screen transition effects (fade through black, slide)
- Pulsing "Ready" button when player has drawn at least one line
- Ink bar has animated shimmer when full
- Empty state messaging ("No items placed yet", "Draw some lines!")
- End-of-ink warning flash
