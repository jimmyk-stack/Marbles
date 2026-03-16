// scoring.js — bucket detection, point tallying

const Scoring = (() => {

  function checkMarbleInBucket(marble, bucketPlayer) {
    const bounds = Physics.getBucketBounds(bucketPlayer);
    const mx = marble.position.x;
    const my = marble.position.y;
    const vel = Math.sqrt(marble.velocity.x ** 2 + marble.velocity.y ** 2);

    const inBounds = mx >= bounds.x && mx <= bounds.x + bounds.width &&
                     my >= bounds.y && my <= bounds.y + bounds.height;

    return inBounds && vel < CONFIG.bucket.captureVelocityThreshold;
  }

  function calculateRoundScores() {
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;

    const m1inP1 = checkMarbleInBucket(m1, 1);
    const m1inP2 = checkMarbleInBucket(m1, 2);
    const m2inP1 = checkMarbleInBucket(m2, 1);
    const m2inP2 = checkMarbleInBucket(m2, 2);

    let p1Points = 0;
    let p2Points = 0;
    const events = [];

    // Check jackpot first
    if (m1inP1 && m2inP1) {
      p1Points = CONFIG.scoring.jackpot;
      events.push('Both marbles in P1 bucket! Jackpot!');
    } else {
      if (m1inP1) {
        p1Points += CONFIG.scoring.ownMarbleOwnBucket;
        events.push('P1 marble landed in P1 bucket (+2)');
      }
      if (m2inP1) {
        p1Points += CONFIG.scoring.opponentMarbleOwnBucket;
        events.push('P2 marble landed in P1 bucket (+3 to P1)');
      }
    }

    if (m1inP2 && m2inP2) {
      p2Points = CONFIG.scoring.jackpot;
      events.push('Both marbles in P2 bucket! Jackpot!');
    } else {
      if (m2inP2) {
        p2Points += CONFIG.scoring.ownMarbleOwnBucket;
        events.push('P2 marble landed in P2 bucket (+2)');
      }
      if (m1inP2) {
        p2Points += CONFIG.scoring.opponentMarbleOwnBucket;
        events.push('P1 marble landed in P2 bucket (+3 to P2)');
      }
    }

    if (!m1inP1 && !m1inP2) {
      events.push('P1 marble missed both buckets');
    }
    if (!m2inP1 && !m2inP2) {
      events.push('P2 marble missed both buckets');
    }

    return { p1Points, p2Points, events };
  }

  return { calculateRoundScores, checkMarbleInBucket };
})();
