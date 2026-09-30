export const WIDTH = 520;
export const HEIGHT = 590;
export const DURATION = 3.2;
export const TAIL_ROOT = Object.freeze({ x: 260, y: 480 });
export const TAIL_LENGTH = 230;

const STEPS = 80;
const RAD = Math.PI / 180;

export function phaseAt(time) {
  const wrapped = ((time % DURATION) + DURATION) % DURATION;
  return 2 * Math.PI * wrapped / DURATION;
}

export function tailAngles(time) {
  const phase = phaseAt(time);
  return [
    55 * RAD * Math.sin(phase),
    55 * RAD * Math.sin(phase),
    55 * RAD * Math.sin(phase - 8 * RAD),
  ];
}

export function tailYaw(time, progress = 0) {
  return 45 * RAD * Math.sin(phaseAt(time) - 8 * RAD * Math.max(0, Math.min(1, progress)));
}

export function tailAngleAt(angles, progress) {
  const q = Math.max(0, Math.min(1, progress));
  const u = 1 - q;
  return u * u * angles[0] + 2 * u * q * angles[1] + q * q * angles[2];
}

export function tailCurve(time) {
  const angles = tailAngles(time);
  const yaw = tailYaw(time);
  const xs = new Float64Array(STEPS + 1);
  const ys = new Float64Array(STEPS + 1);
  xs[0] = TAIL_ROOT.x;
  ys[0] = TAIL_ROOT.y;
  const step = TAIL_LENGTH / STEPS;
  for (let i = 1; i <= STEPS; i += 1) {
    const a = tailAngleAt(angles, (i - 1) / STEPS);
    const b = tailAngleAt(angles, i / STEPS);
    xs[i] = xs[i - 1] + step * (Math.sin(a) + Math.sin(b)) / 2;
    ys[i] = ys[i - 1] - step * (Math.cos(a) + Math.cos(b)) / 2;
  }
  return { time, angles, yaw, xs, ys };
}

export function bendTailPoint(curve, x, y) {
  const q = (TAIL_ROOT.y - y) / TAIL_LENGTH;
  const clamped = Math.max(0, Math.min(1, q));
  const index = clamped * STEPS;
  const lo = Math.min(STEPS - 1, Math.floor(index));
  const fraction = index - lo;
  const angle = tailAngleAt(curve.angles, q);
  let cx = curve.xs[lo] * (1 - fraction) + curve.xs[lo + 1] * fraction;
  let cy = curve.ys[lo] * (1 - fraction) + curve.ys[lo + 1] * fraction;
  if (q < 0 || q > 1) {
    const extension = (q - clamped) * TAIL_LENGTH;
    cx += extension * Math.sin(angle);
    cy -= extension * Math.cos(angle);
  }
  const across = x - TAIL_ROOT.x;
  const yaw = tailYaw(curve.time, q);
  return {
    x: cx + across * Math.cos(angle),
    y: cy + across * Math.sin(angle),
    z: -30 + 0.2 * across * Math.sin(yaw) * smoothstep(0.08, 0.82, q),
  };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function breathePoint(x, y, time) {
  const chest = smoothstep(278, 325, y) * (1 - smoothstep(450, 485, y));
  const pulse = (1 - Math.cos(phaseAt(time))) / 2;
  const lateral = Math.max(-1, Math.min(1, (x - WIDTH / 2) / 185));
  return { x: x + 1.15 * chest * pulse * lateral, y };
}
