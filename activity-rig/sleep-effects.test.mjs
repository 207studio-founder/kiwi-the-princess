import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './three/three.module.js';
import { createSleepEffects, sleepEffectOpacityAt } from './sleep-effects.js';

test('sleep bubble breathes periodically while its nostril anchor stays fixed', () => {
  const effects = createSleepEffects({ THREE });
  const bubble = effects.group.children.find(child => child.isMesh);
  assert.ok(bubble);
  assert.equal(effects.group.children.length, 2);
  const anchor = bubble.position.toArray();

  effects.setSleepTime(1.6);
  const contractedScale = bubble.scale.x;
  effects.setSleepTime(2.4);
  const expandedScale = bubble.scale.x;
  assert.ok(sleepEffectOpacityAt(0) > 0);
  assert.ok(bubble.material.opacity > 0);
  assert.ok(expandedScale > contractedScale);
  effects.setSleepTime(3.2);
  const loopScale = bubble.scale.x;
  effects.setSleepTime(0);
  assert.ok(Math.abs(loopScale - bubble.scale.x) < 1e-12);
  assert.ok(bubble.material.opacity > 0);
  assert.deepEqual(bubble.position.toArray(), anchor);
  effects.dispose();
});

test('sleep effect modes keep one bubble and disabling hides every part', () => {
  const effects = createSleepEffects({ THREE });
  const bubble = effects.group.children.find(child => child.isMesh);
  const rim = effects.group.children.find(child => child.isLineSegments);
  effects.setSleepTime(0.4);

  for (const mode of ['all', 'zzz', 'dream']) {
    effects.setSleepEffects({ enabled: true, mode });
    assert.ok(bubble.material.opacity > 0);
    assert.ok(rim.material.opacity > 0);
    assert.equal(effects.group.children.length, 2);
  }

  effects.setSleepEffects({ enabled: false, mode: 'all' });
  assert.equal(bubble.material.opacity, 0);
  assert.equal(rim.material.opacity, 0);
  effects.dispose();
});

test('sleep and rise APIs reject non-finite times', () => {
  const effects = createSleepEffects({ THREE });
  for (const time of [NaN, Infinity, -Infinity]) {
    assert.throws(() => sleepEffectOpacityAt(time), TypeError);
    assert.throws(() => effects.setSleepTime(time), TypeError);
    assert.throws(() => effects.beginRiseFromSleep(time), TypeError);
    assert.throws(() => effects.setRiseTime(time), TypeError);
  }
  effects.dispose();
});
