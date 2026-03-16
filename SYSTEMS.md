# SYSTEMS — Sabotage Game Architecture

## Physics Engine
**Simulates both marbles falling through the course and interacting with lines, items, and each other.**

Built on Matter.js. The world runs at a fixed gravity defined in CONFIG (1.2). Marble bodies are Matter circles; lines are thin rotated rectangles added as static bodies. Walls bound the left, right, and bottom of the canvas. Buckets are U-shaped static geometry at bottom-left (P1) and bottom-right (P2). The engine provides a `cloneForSimulation()` method that creates a complete copy of the physics world for Builder/Saboteur previews without mutating the real course state. Stuck marble detection nudges marbles downward and temporarily disables collision to prevent permanent jams.

## Items System
**Handles placement and force application for fans, bumpers, and magnets.**

Fans apply directional force within a cone angle, diminishing with distance. Bumpers are high-restitution static circles that bounce marbles. Magnets attract marbles within a radius with force proportional to proximity. Forces are applied each frame via Matter.js `beforeUpdate` event during drop phase. Items can be cloned into simulation worlds for preview. Bumpers are physical Matter.js bodies; fans and magnets apply forces programmatically without physical bodies.

## Drawing System
**Handles all player input for drawing lines and placing items on the canvas.**

Click-and-drag creates line segments committed on mouse release. Ink cost scales with line length, a proximity multiplier (more expensive near buckets), and a role multiplier (Saboteur pays 2.5x for lines). Erase mode lets players click near their own current-round lines to remove them with ink refund. No-draw zones prevent placement in the top 15% drop zone and inside bucket bounds. The system also handles item placement including a two-step fan direction picker.

## Renderer
**Draws the game world with different visual modes for Builder and Saboteur perspectives.**

Uses HTML5 Canvas 2D context. Renders in layers: background, no-draw zone indicator, buckets, historical lines (grayscale with opacity decay by age), current-round lines (colored, hidden from Saboteur), placed items, marbles, drawing preview, and marble trail. Two rendering modes share the same draw calls but filter visibility — Builder sees everything, Saboteur sees only historical elements plus their own placements. Line opacity decays from 75% (1 round old) to 15% (4+ rounds old).

## Simulation System
**Runs marble physics previews for Builder and Saboteur without affecting the real game state.**

Creates a cloned physics world and runs it at 60fps in an animation frame loop. Records marble positions as trail points with timestamps for fading trail rendering. Builder simulations include all items; Saboteur simulations only include pre-existing items (not the Saboteur's own placements). Simulation auto-completes when both marbles settle or after a 15-second timeout.

## Scoring System
**Detects which bucket each marble lands in and calculates round points.**

Checks marble position against bucket bounds and velocity against a threshold to confirm capture. Scoring: own marble in own bucket = 2pts, opponent's marble in own bucket = 3pts, both marbles in one bucket = 5pts jackpot. Generates event descriptions for the score reveal screen.

## UI System
**Manages all screen transitions, HUD updates, shop interactions, and button handlers.**

Controls visibility of lobby, round start, game screen, score reveal, shop, and game over screens. The HUD displays player names, roles, scores, round number, and current phase. Ink bar updates in real-time during drawing. Shop panel dynamically generates buy buttons with role-adjusted pricing (Builder pays 2x for items, Saboteur pays 2x for ink). Item buttons in saboteur controls allow selection before placement.

## Game State Machine
**Orchestrates the full game flow: lobby → round start → builder → saboteur → drop → score → shop → repeat.**

Plain JS state object manages transitions between 7 game states across up to 8 rounds. Each round: Builder draws with 3 simulation previews, Saboteur observes and places items, marbles drop for real, scores are tallied, players shop, roles swap. The state machine coordinates Physics, Drawing, Simulation, Renderer, Scoring, and UI modules. Drop phase runs physics at 60fps with stuck detection and auto-completion.
