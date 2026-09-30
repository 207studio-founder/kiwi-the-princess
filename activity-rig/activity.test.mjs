import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY_COUNTS, ACTIVITY_EXPORT_CANVAS, resolveActivityPose } from './activity.js';
import { solveTwoBone } from './forelimb-math.mjs';

const states = ['jump', 'failed', 'running', 'review', 'waiting'];

test('activity sample counts, pose shapes and index bounds are exact', () => {
  assert.deepEqual(ACTIVITY_EXPORT_CANVAS, [640, 680]);
  assert.deepEqual(ACTIVITY_COUNTS, { jump: 5, failed: 8, running: 6, review: 6, waiting: 6 });
  for (const [state, count] of Object.entries(ACTIVITY_COUNTS)) {
    const first = resolveActivityPose(state, 0);
    assert.equal(first.index, 0);
    assert.deepEqual(Object.keys(first).sort(), Object.keys(resolveActivityPose('jump', 0)).sort());
    assert.equal(resolveActivityPose(state, count - 1).progress, 1);
    assert.throws(() => resolveActivityPose(state, count));
    assert.throws(() => resolveActivityPose(state, -1));
    assert.throws(() => resolveActivityPose(state, 0.5));
    for (let index = 0; index < count; index += 1) {
      const pose = resolveActivityPose(state, index);
      assert.deepEqual(Object.keys(pose.wrists).sort(), ['left', 'right']);
      for (const wrist of Object.values(pose.wrists)) {
        assert.equal(wrist.length, 2);
        assert.ok(wrist.every(Number.isFinite));
      }
    }
  }
  assert.throws(() => resolveActivityPose('sleep', 0));
});

test('standing row keeps the hind body grounded and cycles the raised forepaw pose', () => {
  const poses = Array.from({ length: 5 }, (_, index) => resolveActivityPose('jump', index));
  assert.ok(poses.every(pose => pose.bodyY === 0 && pose.bodyX === 0));
  assert.deepEqual(poses.map(pose => pose.standTime), [0,.25,.5,.75,1]);
  assert.ok(poses.every(pose => !pose.keyboard && !pose.bones && pose.sleepTime === null));
});

test('failed action scales the authored collapse and recovery curves', () => {
  const poses = Array.from({ length: 8 }, (_, index) => resolveActivityPose('failed', index));
  assert.ok(poses[4].headDroop > 20);
  assert.ok(poses[4].eyeClose > .8);
  assert.ok(poses[4].earSag > 10);
  assert.equal(poses[7].headDroop, 0);
  assert.equal(poses[7].eyeClose, 0);
  assert.ok(poses.every(pose => pose.keyboard === false && pose.bones === false));
});

test('typing action alternates grounded forepaws over the keyboard', () => {
  const poses = Array.from({ length: 6 }, (_, index) => resolveActivityPose('running', index));
  assert.ok(poses.some(pose => pose.wrists.left[1] <= 483));
  assert.ok(poses.some(pose => pose.wrists.right[1] <= 483));
  assert.ok(poses.every(pose => pose.keyboard && !pose.bones));
  assert.ok(poses.every(pose => pose.wrists.left[0] === 194 && pose.wrists.right[0] === 324));
  assert.ok(poses.some(pose => pose.bodyY < 0));
});

test('review sniffs, returns, then holds a curious head tilt', () => {
  const poses = Array.from({ length: 6 }, (_, index) => resolveActivityPose('review', index));
  assert.ok(poses.every(pose => pose.wrists.left[1] === 503 && pose.wrists.right[1] === 503));
  assert.ok(poses.every(pose => !pose.keyboard && !pose.bones));
  assert.deepEqual(poses.map(pose => pose.nosePulse), [0, 1, .15, 0, 0, 0]);
  assert.ok(poses.every(pose => Number.isFinite(pose.nosePulse) && pose.nosePulse >= 0 && pose.nosePulse <= 1));
  assert.deepEqual(poses.map(pose => pose.headTurn), [0, -.03, 0, .12, .12, 0]);
  assert.deepEqual(poses.map(pose => pose.headDroop), [0, 7, 1, 0, 0, 0]);
  assert.deepEqual(poses.map(pose => pose.headShiftX), [0, -2, 0, 0, 0, 0]);
  assert.deepEqual(poses.map(pose => pose.earSag), [0, 1, 0, 2, 1, 0]);
  assert.deepEqual(poses.map(pose => pose.eyeClose), [0, .08, 0, 0, 0, 0]);
  const withoutMetadata = pose => {
    const { state, index, count, progress, ...semanticPose } = pose;
    return semanticPose;
  };
  assert.deepEqual(withoutMetadata(poses[0]), withoutMetadata(poses[5]));
});

test('waiting samples advance breath and effect time by one sixth-cycle step', () => {
  const poses = Array.from({ length: 6 }, (_, index) => resolveActivityPose('waiting', index));
  assert.deepEqual(poses.map(pose => pose.sleepTime), Array.from({ length: 6 }, (_, index) => index / 6 * 3.2));
  assert.ok(poses.every(pose => !pose.keyboard && !pose.bones));
  assert.ok(poses.every(pose => pose.wrists.left[1] === 503 && pose.wrists.right[1] === 503));
});

test('all activity wrist targets keep the forelimb two-bone chain reachable', () => {
  for (const [state, count] of Object.entries(ACTIVITY_COUNTS)) {
    if (state === 'waiting') continue;
    for (let index = 0; index < count; index += 1) {
      const pose = resolveActivityPose(state, index);
      for (const side of ['left', 'right']) {
        const shoulder = side === 'left' ? [194, 419] : [324, 419];
        const elbow = solveTwoBone({ shoulder, wrist: pose.wrists[side], upperLength: 54,
          lowerLength: 30, bendSign: side === 'left' ? -1 : 1 });
        assert.equal(elbow.clamped, false, `${state}/${index}/${side}`);
        assert.ok(Math.abs(Math.hypot(elbow.elbow[0] - shoulder[0], elbow.elbow[1] - shoulder[1]) - 54) < 1e-8);
        assert.ok(Math.abs(Math.hypot(elbow.elbow[0] - elbow.reachableWrist[0], elbow.reachableWrist[1] - elbow.elbow[1]) - 30) < 1e-8);
      }
    }
  }
});

test('pose sampling is deterministic', () => {
  for (const state of states) {
    for (let index = 0; index < ACTIVITY_COUNTS[state]; index += 1) {
      assert.deepEqual(resolveActivityPose(state, index), resolveActivityPose(state, index));
    }
  }
});
