const CONFIG = {
  canvas: { width: 800, height: 600 },
  marbles: {
    p1Start: { x: 0.25, y: 0.08 },
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
    saboteurLineMultiplier: 2.5,
    builderItemMultiplier: 2,
    proximityMultiplier: [
      { minDepthFraction: 0.6, multiplier: 1 },
      { minDepthFraction: 0.4, multiplier: 2 },
      { minDepthFraction: 0.2, multiplier: 4 },
      { minDepthFraction: 0.0, multiplier: 8 },
    ],
  },
  lineOpacity: {
    1: 0.75,
    2: 0.45,
    3: 0.25,
    4: 0.15,
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
    jackpot: 5,
  },
  rounds: 8,
  stuckDetection: {
    velocityThreshold: 0.2,
    timeoutMs: 3000,
  },
  noDrawZoneTop: 0.15,
  lineThickness: 4,
};
