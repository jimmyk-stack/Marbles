# SYSTEMS — Sabotage Game Architecture

## Physics Engine
**Simulates both marbles falling through the course and interacting with lines, items, and each other.**

Built on Matter.js. The world runs at a fixed gravity defined in CONFIG (1.2). Marble bodies are Matter circles; lines are thin rotated rectangles added as static bodies. Walls bound the left, right, and bottom of the canvas. Buckets are U-shaped static geometry at bottom-left (P1) and bottom-right (P2). The engine provides a `cloneForSimulation()` method that creates a complete copy of the physics world for Builder/Saboteur previews without mutating the real course state. Collision events are forwarded to the Effects system for impact particles and screen shake.

## Items System
**Handles placement and force application for fans, bumpers, and magnets.**

Fans apply directional force within a cone angle, diminishing with distance. Bumpers are high-restitution static circles that bounce marbles. Magnets attract marbles within a radius with force proportional to proximity. Forces are applied each frame via Matter.js `beforeUpdate` event during drop phase. Items can be cloned into simulation worlds for preview. Bumpers are physical Matter.js bodies; fans and magnets apply forces programmatically without physical bodies. Items cost score points to place (Builder pays 2x, Saboteur pays 1x base).

## Drawing System
**Handles all player input for drawing lines and placing items on the canvas.**

Click-and-drag creates line segments committed on mouse release. Ink cost scales with line length, a proximity multiplier (more expensive near buckets), and a role multiplier (Saboteur pays 2.5x for lines). Item placement deducts from the player's score via callbacks wired by Game. Erase mode lets players click near their own current-round lines to remove them with ink refund. No-draw zones prevent placement in the top 15% drop zone and inside bucket bounds. The system handles a two-step fan direction picker with cone preview. Sounds play on draw, erase, place, and denied actions.

## Renderer
**Draws the game world with rich visual effects and different view modes for Builder and Saboteur.**

Uses HTML5 Canvas 2D context. Renders in layers: gradient background, depth zone indicators (showing ink cost tiers), no-draw zone with label, glowing buckets with gradient walls, historical lines (grayscale with opacity decay), current-round lines (colored with glow, hidden from Saboteur), animated items (pulsing bumpers, wind-line fans, radiating magnets), gradient-shaded marbles with specular highlights, drawing preview with ink cost display, item ghost previews at cursor, and marble trail. Integrates with Effects system for particles, floating text, and screen shake. Frame counter drives item animations.

## Effects System
**Provides particle effects, floating score text, screen shake, and confetti for game juice.**

Manages three particle-like systems: (1) generic particles with velocity, gravity, fade, and size decay for collisions, captures, and trails; (2) floating text that rises and fades for score popups; (3) confetti pieces with rotation and drift for game over celebration. Screen shake applies canvas translation with exponential decay. Specialized spawn functions for collision sparks, bucket capture bursts (with ring sparkle), and marble trail particles. All effects update and draw each frame via the render loop.

## Sound System
**Synthesizes all game audio using the Web Audio API with no external sound files.**

Creates oscillator tones and noise buffers for every game event: line drawing, erasing, item placement, button clicks, marble bounces (intensity-scaled), bucket captures (with jackpot fanfare), marble drops, round starts, phase transitions, shop purchases, game over (victory/defeat), and denied actions. Each sound is a carefully tuned combination of frequency sweeps, envelope shaping, and optional filtering. Master gain control with mute toggle. Audio context resumes on first user interaction for browser autoplay policy compliance.

## Simulation System
**Runs marble physics previews for Builder and Saboteur without affecting the real game state.**

Creates a cloned physics world and runs it at 60fps in an animation frame loop. Records marble positions as trail points with timestamps for fading trail rendering. Builder simulations include all items; Saboteur simulations only include pre-existing items (not the Saboteur's own placements). Simulation auto-completes when both marbles settle or after a 15-second timeout.

## Scoring System
**Detects which bucket each marble lands in and calculates round points.**

Checks marble position against bucket bounds and velocity against a threshold to confirm capture. Scoring: own marble in own bucket = 2pts, opponent's marble in own bucket = 3pts, both marbles in one bucket = 5pts jackpot. Generates event descriptions using actual player names for the score reveal screen.

## UI System
**Manages all screen transitions, HUD updates, shop interactions, keyboard shortcuts, and tutorials.**

Controls visibility of lobby, round start, game screen, score reveal, shop, and game over screens with CSS animations (fadeIn, slideUp, bounceIn). The HUD displays player names with role badges, scores, round number, and phase. Ink bar turns red when low. Shop generates ink refill buttons with role-adjusted pricing and shows each player's next-round role. Keyboard shortcuts: S=simulate, E=erase, 1/2/3=items, Enter=ready, Escape=deselect, D=draw (saboteur). First-time tutorial overlays explain Builder and Saboteur mechanics. Mute toggle for sound. Score reveal shows named events in styled cards.

## Game State Machine
**Orchestrates the full game flow with effects and audio integration.**

Plain JS state object manages transitions between 7 game states across up to 8 rounds. Each round: Builder draws with 3 simulation previews, Saboteur observes and places items, marbles drop for real with trail particles and collision effects, scores are tallied with bucket capture particles and floating score text, players shop for ink refills, roles swap. Collision handler spawns sparks and triggers screen shake proportional to impact speed. Drop phase spawns trail particles behind moving marbles. Score reveal delays briefly to let capture effects play before transitioning. Points callbacks let Drawing deduct from scores when placing items.
