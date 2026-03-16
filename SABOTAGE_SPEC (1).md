# SABOTAGE — MVP Game Spec

## Overview

**Sabotage** is a 2-player browser-based physics game built on a single shared canvas with two marbles — one per player. Players alternate between the **Builder** role (sculpting the course toward their bucket) and the **Saboteur** role (placing disruptors blind to redirect marbles into their bucket). The course accumulates across rounds — old lines persist and new edits are only visible to the player who made them until the marbles drop.

---

## Core Loop

1. Two marbles start at the top of the canvas — P1's marble top-left, P2's marble top-right
2. The **Builder** takes their turn: they see the full current course and can draw/edit lines. They can simulate both marbles falling (up to 3 times) to preview the result.
3. The **Saboteur** takes their turn: they see the old course (pre-Builder edits) and watch a simulation of both marbles falling through it. They place items to intercept.
4. Both marbles drop for real — full course revealed simultaneously
5. Points awarded based on where each marble lands
6. Roles swap. Repeat.

---

## Roles

### Builder
- **Sees:** Full course — old lines in grayscale, their own new edits in full color
- **Can:** Draw lines, erase own previously drawn lines, place items (at 2× point cost)
- **Can:** Run marble simulation up to 3 times per turn — shows **both marbles** falling through the full course including their new edits
- **Goal:** Route your marble into your bucket, and ideally reroute the opponent's marble into yours too

### Saboteur
- **Sees:** The old course only — all lines in grayscale, Builder's new edits hidden
- **Can:** Draw lines (at 2.5× ink cost), place items (at base cost)
- **Can:** Watch marble simulation — shows **both marbles** falling through the real course including hidden Builder edits. Unlimited replays. Simulation does NOT update to reflect the Saboteur's own placements — it always shows the Builder's version of the course.
- **Goal:** Infer where the Builder modified the course from marble deviations, then intercept to reroute marbles into your bucket

### The Inference Game
The Saboteur's core skill is reading the marble simulation. The marble falls through the *real* course including the Builder's hidden edits — so if the marble drifts right through a section where the old gray lines suggest it should go left, something new is there. That deviation is the targeting information.

---

## Visual System

All lines on the canvas have a visual age that communicates their history:

| Line Type | Appearance |
|---|---|
| Drawn this round (Builder's new edits) | Full color (blue for P1, red for P2) |
| Drawn last round | ~75% opacity, desaturating toward gray |
| Drawn 2 rounds ago | ~45% opacity, mostly gray |
| Drawn 3 rounds ago | ~25% opacity |
| Older | Faint gray ghost (~15%), still physically active |

**Both players see the same grayscale history.** The only difference is the Builder sees their own new edits in color; the Saboteur does not see them at all until the drop.

Old vestigial lines are intentionally useful as decoys — the Builder can leave inactive gray geometry that makes the course look like it does something it no longer does.

---

## Game Layout

```
┌──────────────────────────────────────────────────────┐
│  P1 [Builder]  Score: 3       Round 4      Score: 5  P2 [Saboteur] │
│  Ink: ████░░░                                                        │
├──────────────────────────────────────────────────────┤
│  ●P1                              ●P2   (marble start positions, top)                │
│                                                                      │
│                   [shared canvas]                                    │
│                                                                      │
│                                                                      │
│                                                                      │
│    [P1 Bucket]                        [P2 Bucket]                   │
└──────────────────────────────────────────────────────┘
│  SHOP (Saboteur only): [Fan 2pt] [Bumper 2pt] [Magnet 3pt]         │
```

---

## Turn Structure

### Each Round:

**1. Builder Phase** (P2 looks away — honor system for hotseat)
- Builder sees the full course
- Builder draws/edits lines using their ink budget
- Builder can run a marble simulation to preview the result — **maximum 3 reruns per turn**
- Simulation shows the marble falling through the full course including the Builder's new edits
- Builder hits "Ready"

**2. Saboteur Phase**
- Saboteur sees the old course in grayscale (Builder's new edits hidden)
- Saboteur watches a marble simulation — marble falls through the real course including hidden edits, showing the true trajectory
- Simulation leaves a **fading trail** (~2 seconds before it disappears) so the Saboteur must actively watch rather than read a static map
- Saboteur can replay the simulation as many times as they want during their turn
- **The simulation does NOT update to reflect items or lines the Saboteur places** — it always shows the course as the Builder left it. The Saboteur is flying blind on their own placements; the simulation is purely an inference tool.
- Saboteur places items based on their inference
- Saboteur hits "Ready"

**3. Drop Phase**
- Full course revealed: Builder's new lines snap to full color, all items visible
- Marble drops for real
- No input accepted

**4. Score Reveal**
- Winning bucket highlighted
- Points awarded
- Brief pause

**5. Shop Phase**
- Both players spend points
- Roles swap for next round

---

## Ink System

Both Builder and Saboteur can draw lines and place items, but pricing is asymmetric — each role pays a premium for using the other's primary tool.

### Ink (for drawing lines)
- Both players have an ink budget per turn
- **Builder** starts with the full ink budget (100 units default)
- **Saboteur** starts with a reduced ink budget (40 units default) — drawing lines is expensive for them
- Line length costs ink proportionally, modified by two multipliers:

**Role multiplier:**
| Action | Builder cost | Saboteur cost |
|---|---|---|
| Drawing lines | 1× (base) | 2.5× |
| Placing items | 2× point cost | 1× (base) |

**Proximity multiplier (applies to both roles):**
Line ink cost scales with how close the drawn line is to either bucket. Cost is calculated based on the midpoint of the line segment.

| Distance from nearest bucket | Ink multiplier |
|---|---|
| Far (>60% canvas height from bottom) | 1× |
| Mid (40–60%) | 2× |
| Near (20–40%) | 4× |
| Close (<20% from bottom) | 8× |
| Inside bucket zone | Not allowed |

This makes coursework near the buckets expensive for everyone, forcing meaningful decisions to happen higher up the canvas where ink goes further.

- Erasing one of your own lines refunds its ink cost at the current proximity rate
- Unused ink does NOT carry over
- Builder can spend points in the shop to buy more ink

---

## Physics

Use **Matter.js** for all physics simulation.

### Marbles
- Two marble bodies — P1's starts top-left, P2's starts top-right, fixed positions each round
- Identical radius, mass, restitution
- Both released simultaneously after both players are ready
- Marbles collide with each other, lines, walls, and items
- Bounces off canvas walls (no wrapping)
- Both marbles interact with all lines and placed items — a Builder's edit affects both marble trajectories

### Lines
- Static rigid line segments (`Matter.js Bodies.rectangle` rotated)
- Friction and restitution applied
- Lines from all previous rounds remain **physically active** regardless of visual opacity
- No-draw zones: top 15% of canvas (drop zone) and inside bucket bounds

### Buckets
- Static U-shaped geometry, P1 bottom-left, P2 bottom-right
- Opening faces upward
- Marble capture detected when velocity drops below threshold within bucket bounds
- Indestructible — no lines or items can be placed inside them

---

## Scoring

| Event | Points |
|---|---|
| Your marble lands in your bucket | +2 pts |
| Opponent's marble lands in your bucket | +3 pts |
| Both marbles land in your bucket | +5 pts (jackpot) |
| Your marble lands in opponent's bucket | 0 pts |
| A marble misses both buckets | 0 pts |

Both players can score every round. The Saboteur has two targets — they can play offensively (reroute opponent's marble into their bucket) or defensively (correct their own marble's path if the Builder's edits sent it astray). Usually they won't know which they need until they watch the simulation.

---

## Shop & Economy

Points spent after each drop, before roles swap. Both players can buy either ink or items, but pay a premium for the other role's primary tool.

### Ink Refills (available to both, Builder discount)
| Item | Builder Cost | Saboteur Cost | Effect |
|---|---|---|---|
| Ink Refill (small) | 1 pt | 2 pts | +50 ink units next turn |
| Ink Refill (large) | 2 pts | 4 pts | +150 ink units next turn |

### Placeable Items (available to both, Saboteur discount)
| Item | Saboteur Cost | Builder Cost | Effect |
|---|---|---|---|
| Fan | 2 pts | 4 pts | Directional force in a cone. Player sets direction on placement. Active entire drop. |
| Bumper | 2 pts | 4 pts | Circular high-restitution obstacle. Marble bounces off it. |
| Magnet | 3 pts | 6 pts | Attracts marble within radius. |
| Gravity Flip Zone | 4 pts | 8 pts | Rectangular region of reversed gravity. Stretch goal. |

### Notes
- Items are permanent — they persist into future rounds as part of the grayscale history
- Saboteur's simulation does NOT update to reflect their own item/line placements — the simulation is always the baseline course as the Builder left it
- Consider a max item cap per player if canvas gets cluttered (tune during playtesting)

---

## Controls

### Drawing Lines (Builder only)
- Click + drag to draw a line segment
- Preview shown in Builder's color while dragging
- Committed on mouse release, ink deducted
- Line truncated at max length if ink runs out mid-drag

### Placing Items (Saboteur only)
- Select item from inventory panel
- Ghost preview follows cursor before placement
- For Fan: show a direction wheel on placement to set force vector before committing
- Click to place
- Rejected with visual feedback if placed in no-place zone

### Player Colors
- Player 1: **Blue**
- Player 2: **Red**
- Historical lines: **Grayscale**, opacity decaying by age

---

## Screens / States

```
LOBBY → ROUND_START → BUILDER_PHASE → SABOTEUR_PHASE → DROP_PHASE → SCORE_REVEAL → SHOP → ROUND_START
                                                                                         ↓ (after N rounds)
                                                                                     GAME_OVER
```

| State | Description |
|---|---|
| `LOBBY` | Rules summary, player name entry, Start |
| `ROUND_START` | "Round X" splash, scores, role assignment |
| `BUILDER_PHASE` | Builder draws. Ink bar shown. Ready button. |
| `SABOTEUR_PHASE` | Saboteur watches simulation with fading marble trail. Item placement. Ready button. |
| `DROP_PHASE` | Full course revealed, marble drops, no input |
| `SCORE_REVEAL` | Winning bucket highlighted, points updated |
| `SHOP` | Both players spend points. P1 panel left, P2 panel right. |
| `GAME_OVER` | Winner shown, Play Again |

---

## Canvas & Rendering

- Canvas size: **800 × 600px** (fixed for MVP)
- Render loop: `requestAnimationFrame` with Matter.js Runner
- Draw layers (bottom to top):
  1. Background
  2. Buckets
  3. Historical lines (grayscale, opacity by age)
  4. Current round new lines (full color — omitted entirely in Saboteur view)
  5. Placed items
  6. Marble
  7. Marble trail (Saboteur simulation view only, fading)
  8. UI overlay

### Two Rendering Modes (same physics world, different draw calls)

- **Builder view:** Render everything. New lines in full color.
- **Saboteur view:** Render historical lines in grayscale only. New lines not drawn. Show marble simulation trail.

---

## Technical Stack

| Component | Technology |
|---|---|
| Physics | Matter.js |
| Rendering | HTML5 Canvas 2D context |
| Multiplayer (MVP) | Local hotseat — honor system for looking away |
| State management | Plain JS state object |
| Backend | None required for MVP |

### File Structure
```
/index.html
/style.css
/game.js          ← state machine, round flow
/physics.js       ← Matter.js world, marble, lines, items
/drawing.js       ← Builder input handling, line drawing
/simulation.js    ← Saboteur preview simulation + marble trail
/items.js         ← fan, bumper, magnet force logic
/renderer.js      ← builder view vs saboteur view, line age/opacity
/scoring.js       ← bucket detection, point tallying
/ui.js            ← score display, ink bar, shop panel, role indicator
/constants.js     ← all tunable values
```

---

## Tunable Constants

```js
const CONFIG = {
  canvas: { width: 800, height: 600 },
  marbles: {
    p1Start: { x: 0.25, y: 0.08 },  // as fraction of canvas width/height
    p2Start: { x: 0.75, y: 0.08 },
    radius: 12,
    restitution: 0.6,
    friction: 0.1,
  },
  gravity: 1.2,
  ink: {
    builderBudget: 100,
    saboteurBudget: 40,
    costPerPixel: 1,
    saboteurLineMultiplier: 2.5,   // Saboteur pays 2.5x ink per pixel
    builderItemMultiplier: 2,      // Builder pays 2x point cost for items
    proximityMultiplier: [
      { minDepthFraction: 0.6, multiplier: 1 },   // far from buckets
      { minDepthFraction: 0.4, multiplier: 2 },   // mid canvas
      { minDepthFraction: 0.2, multiplier: 4 },   // near buckets
      { minDepthFraction: 0.0, multiplier: 8 },   // close to buckets
    ],
  },
  lineOpacity: {
    // Rounds since drawn → opacity (current round lines are full color or hidden)
    1: 0.75,
    2: 0.45,
    3: 0.25,
    4: 0.15,   // 4+ rounds old
  },
  marbleTrail: {
    durationMs: 2000,
    opacity: 0.4,
  },
  bucket: {
    width: 80,
    height: 60,
    wallThickness: 6,
    captureVelocityThreshold: 1.5,
  },
  items: {
    fan:    { cost: 2, force: 0.005, coneRadius: 80, coneAngle: 45 },
    bumper: { cost: 2, radius: 20, restitution: 0.9 },
    magnet: { cost: 3, radius: 100, force: 0.003 },
  },
  scoring: {
    ownMarbleOwnBucket: 2,
    opponentMarbleOwnBucket: 3,
    jackpot: 5,             // both marbles in your bucket
  },
  rounds: 8,
  stuckDetection: {
    velocityThreshold: 0.2,
    timeoutMs: 3000,      // marble flashes 3x then passes through blocking line
  },
};
```

---

## Living Systems Document

As each system is built, Claude Code must update a file called `SYSTEMS.md` in the project root. Each entry follows this format:

```
## [System Name]
**[One bold sentence describing what this system does in plain English.]**

[2–4 sentences of technical description: how it works, what libraries or patterns it uses, key implementation decisions, and anything a developer would need to know to modify it.]
```

This document is a running record of the architecture as it's actually built — not a plan, but a description of what exists. It should be updated immediately after each system is implemented, not at the end. If a system is significantly refactored, the entry should be updated to reflect the current implementation.

Example entry:

```
## Physics Engine
**Simulates both marbles falling through the course and interacting with lines, items, and each other.**

Built on Matter.js. The world runs at a fixed gravity defined in CONFIG. Marble bodies are Matter circles; lines are thin rotated rectangles added as static bodies. Items (fans, magnets) apply forces each frame via a Matter.js `Events.on('beforeUpdate')` hook rather than as physical bodies, which keeps their behavior tunable without re-adding bodies. The engine runs in a separate simulation pass for Builder/Saboteur previews, using a cloned world so the real course state is never mutated during preview.
```

- No network multiplayer
- No item animations
- No sound
- No turn timer
- No Gravity Flip Zone
- No mobile/touch support
- No save states or replays
- No marble customization

---

## Stretch Goals

- Network multiplayer (Partykit or Supabase Realtime)
- Animated items (spinning fan, pulsing magnet)
- More items: Teleporter, Ice Patch (zero friction), Sticky Patch
- Round replay as shareable GIF
- Spectator mode
- Sound effects

---

## Key Risks & Design Notes

1. **Stuck marble:** If either marble's velocity drops below threshold for 3 seconds, it flashes 3 times, then passes through the blocking line as if it isn't there and continues falling under gravity. Applies to both marbles independently.
2. **Canvas clutter:** Line opacity decay handles readability. Old lines are near-invisible but still physically active — this is intentional and creates hidden legacy geometry as a gameplay element.
3. **Saboteur simulation:** The preview runs through the *real* course including hidden Builder edits. Deviations from the gray skeleton are the inference signal. UI should make this explicit to new players.
4. **No-draw zone enforcement:** Reject any line or item placement overlapping bucket interiors or the top 15% drop zone.
5. **Magnet balance:** Single marble means magnet always affects the only marble. Start force low — it should redirect, not teleport.
6. **Fan direction UX:** Show a direction wheel on placement so Saboteur can set the force vector before committing. Don't require a second click.
7. **Item persistence:** Saboteur items survive into future rounds as grayscale history. Cap total items if needed to prevent clutter.
