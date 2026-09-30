export function solveTwoBone({ shoulder, wrist, upperLength, lowerLength, bendSign }) {
  const values = [...shoulder, ...wrist, upperLength, lowerLength, bendSign];
  if (!values.every(Number.isFinite)) throw new TypeError('All inputs must be finite numbers');
  if (shoulder.length !== 2 || wrist.length !== 2) throw new TypeError('Points must contain two coordinates');
  if (upperLength <= 0 || lowerLength <= 0) throw new RangeError('Limb lengths must be positive');
  if (bendSign !== -1 && bendSign !== 1) throw new RangeError('bendSign must be -1 or 1');

  const [sx, sy] = shoulder;
  const targetWrist = [...wrist];
  const dx = wrist[0] - sx;
  const dy = wrist[1] - sy;
  const distance = Math.hypot(dx, dy);
  const minReach = Math.abs(upperLength - lowerLength);
  const maxReach = upperLength + lowerLength;
  const reachableDistance = Math.max(minReach, Math.min(maxReach, distance));
  const clamped = Math.abs(reachableDistance - distance) > 1e-12;
  const ux = distance > 1e-12 ? dx / distance : 0;
  const uy = distance > 1e-12 ? dy / distance : 1;
  const reachableWrist = [sx + ux * reachableDistance, sy + uy * reachableDistance];
  const along = reachableDistance > 1e-12
    ? (upperLength ** 2 - lowerLength ** 2 + reachableDistance ** 2) / (2 * reachableDistance)
    : 0;
  const offset = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  const elbow = [
    sx + ux * along + bendSign * uy * offset,
    sy + uy * along - bendSign * ux * offset,
  ];
  const upperAngle = Math.atan2(elbow[0] - sx, elbow[1] - sy);
  const lowerAngle = Math.atan2(reachableWrist[0] - elbow[0], reachableWrist[1] - elbow[1]);
  return { elbow, upperAngle, lowerAngle, clamped, reachableWrist, targetWrist };
}

export function posedForelimb(side, progress) {
  if (side !== 'left' && side !== 'right') throw new RangeError('side must be left or right');
  if (!Number.isFinite(progress)) throw new TypeError('progress must be finite');
  const left = side === 'left';
  const bindShoulder = left ? [245, 550] : [440, 550];
  const bindElbow = left ? [245, 595] : [440, 595];
  const bindWrist = left ? [245, 645] : [440, 645];
  const sleepShoulder = left ? [225, 598] : [460, 598];
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  const shoulder = sleepShoulder.map((value, index) => value + (bindShoulder[index] - value) * eased);
  const wrist = [...bindWrist];
  const solved = solveTwoBone({
    shoulder,
    wrist,
    upperLength: 45,
    lowerLength: 50,
    bendSign: left ? -1 : 1,
  });
  return { ...solved, shoulder, wrist, bindShoulder, bindElbow, bindWrist };
}
