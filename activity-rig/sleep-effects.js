const duration = 3.2;
const width = 661;
const height = 793;
const anchor = [345, 515];

export function sleepEffectOpacityAt(time) {
  if (!Number.isFinite(time)) throw new TypeError('Finite time required');
  return 0.78 + 0.18 * Math.cos(2 * Math.PI * time / duration);
}

function bubbleShape(THREE) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0, 5, 4, 8, 8, 10);
  shape.bezierCurveTo(2, 7, 1, 2, 6, -1);
  shape.bezierCurveTo(2, -7, 5, -18, 15, -20);
  shape.bezierCurveTo(23, -26, 36, -20, 38, -10);
  shape.bezierCurveTo(45, -1, 39, 12, 30, 15);
  shape.bezierCurveTo(22, 21, 9, 18, 5, 11);
  shape.bezierCurveTo(2, 8, 0, 4, 0, 0);
  shape.closePath();
  return shape;
}

export function createSleepEffects({ THREE }) {
  const group = new THREE.Group();
  group.position.set(-width / 2, height / 2, 0);
  group.scale.y = -1;

  const geometry = new THREE.ShapeGeometry(bubbleShape(THREE), 16);
  const material = new THREE.MeshBasicMaterial({
    color: 0xc9efff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });
  const bubble = new THREE.Mesh(geometry, material);
  bubble.position.set(anchor[0], anchor[1], 1);
  bubble.scale.set(0.82, 0.82, 1);
  bubble.frustumCulled = false;
  bubble.renderOrder = 30;
  group.add(bubble);

  const rimGeometry = new THREE.EdgesGeometry(geometry, 18);
  const rimMaterial = new THREE.LineBasicMaterial({
    color: 0xf5fcff,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
    toneMapped: false
  });
  const rim = new THREE.LineSegments(rimGeometry, rimMaterial);
  rim.position.copy(bubble.position);
  rim.scale.copy(bubble.scale);
  rim.renderOrder = 31;
  group.add(rim);

  let enabled = true;
  let mode = 'all';
  let handoffTime = null;
  let lastSleepTime = null;
  let currentTime = 0;
  let currentFade = 0;

  function paint(time, fade = 1) {
    currentTime = time;
    currentFade = fade;
    const breath = sleepEffectOpacityAt(time);
    const expansion = .5 - .5 * Math.sin(2 * Math.PI * time / duration);
    const scale = .55 + .45 * expansion;
    bubble.scale.set(scale, scale, 1);
    rim.scale.copy(bubble.scale);
    const opacity = enabled ? breath * fade : 0;
    material.opacity = 0.30 * opacity;
    rimMaterial.opacity = 0.74 * opacity;
  }

  function setSleepTime(time) {
    if (!Number.isFinite(time)) throw new TypeError('Finite sleep time required');
    handoffTime = null;
    lastSleepTime = time;
    paint(time);
  }

  function beginRiseFromSleep(time) {
    if (!Number.isFinite(time)) throw new TypeError('Finite rise time required');
    handoffTime = time;
  }

  function setRiseTime(time) {
    if (!Number.isFinite(time)) throw new TypeError('Finite rise time required');
    if (handoffTime === null && lastSleepTime !== null) {
      handoffTime = lastSleepTime;
      lastSleepTime = null;
    }
    if (handoffTime === null) {
      paint(0, 0);
      return;
    }
    const settle = Math.max(0, 1 - time / 0.45);
    paint(handoffTime, settle * settle);
  }

  function setSleepEffects(options = {}) {
    if (typeof options.enabled !== 'boolean' ||
        !['all', 'zzz', 'dream'].includes(options.mode ?? mode)) {
      throw new TypeError('Expected enabled boolean and mode all, zzz, or dream');
    }
    enabled = options.enabled;
    mode = options.mode ?? mode;
    paint(currentTime, currentFade);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    rimGeometry.dispose();
    rimMaterial.dispose();
    group.clear();
  }

  paint(0, 0);
  return { group, setSleepTime, beginRiseFromSleep, setRiseTime,
    setSleepEffects, dispose };
}
