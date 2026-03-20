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

  function calculateRoundScores(p1Name, p2Name) {
    const n1 = p1Name || 'P1';
    const n2 = p2Name || 'P2';
    const m1 = Physics.marble1;
    const m2 = Physics.marble2;

    const m1inP1 = checkMarbleInBucket(m1, 1);
    const m1inP2 = checkMarbleInBucket(m1, 2);
    const m2inP1 = checkMarbleInBucket(m2, 1);
    const m2inP2 = checkMarbleInBucket(m2, 2);

    let p1Points = 0;
    let p2Points = 0;
    const events = [];

    // Check jackpots first
    if (m1inP1 && m2inP1) {
      p1Points = CONFIG.scoring.jackpot;
      events.push(`JACKPOT! Both marbles in ${n1}'s bucket! (+${CONFIG.scoring.jackpot})`);
    } else {
      if (m1inP1) {
        p1Points += CONFIG.scoring.ownMarbleOwnBucket;
        events.push(`${n1}'s marble landed in ${n1}'s bucket (+${CONFIG.scoring.ownMarbleOwnBucket})`);
      }
      if (m2inP1) {
        p1Points += CONFIG.scoring.opponentMarbleOwnBucket;
        events.push(`${n2}'s marble landed in ${n1}'s bucket (+${CONFIG.scoring.opponentMarbleOwnBucket} to ${n1})`);
      }
    }

    if (m1inP2 && m2inP2) {
      p2Points = CONFIG.scoring.jackpot;
      events.push(`JACKPOT! Both marbles in ${n2}'s bucket! (+${CONFIG.scoring.jackpot})`);
    } else {
      if (m2inP2) {
        p2Points += CONFIG.scoring.ownMarbleOwnBucket;
        events.push(`${n2}'s marble landed in ${n2}'s bucket (+${CONFIG.scoring.ownMarbleOwnBucket})`);
      }
      if (m1inP2) {
        p2Points += CONFIG.scoring.opponentMarbleOwnBucket;
        events.push(`${n1}'s marble landed in ${n2}'s bucket (+${CONFIG.scoring.opponentMarbleOwnBucket} to ${n2})`);
      }
    }

    if (!m1inP1 && !m1inP2) {
      events.push(`${n1}'s marble missed both buckets`);
    }
    if (!m2inP1 && !m2inP2) {
      events.push(`${n2}'s marble missed both buckets`);
    }

    if (events.length === 0) {
      events.push('No marbles captured this round');
    }

    return { p1Points, p2Points, events };
  }

  return { calculateRoundScores, checkMarbleInBucket };
})();
