import * as THREE from './three/three.module.js';
import { createRig } from './activity-base.js';

export const ACTIVITY_COUNTS = Object.freeze({ jump: 5, failed: 8, running: 6, review: 6, waiting: 6 });
export const ACTIVITY_EXPORT_CANVAS = Object.freeze([640, 680]);

const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;

function curve(t, keys) {
  const p = clamp(t);
  for (let i = 1; i < keys.length; i += 1) {
    if (p <= keys[i][0]) {
      const [a, va] = keys[i - 1];
      const [b, vb] = keys[i];
      return mix(va, vb, (p - a) / (b - a));
    }
  }
  return keys.at(-1)[1];
}

export function resolveActivityPose(state, index) {
  const count = ACTIVITY_COUNTS[state];
  if (!count) throw new RangeError(`Unknown activity: ${state}`);
  if (!Number.isInteger(index) || index < 0 || index >= count) throw new RangeError(`Invalid ${state} sample index`);
  const t = count === 1 ? 0 : index / (count - 1);
  const pose = {
    bodyX: 0, bodyY: 0, headTurn: 0, headDroop: 0, headShiftX: 0, nosePulse: 0, earSag: 0, eyeClose: 0,
    wrists: { left: [194, 503], right: [324, 503] }, keyboard: false, bones: false, sleepTime: null, standTime: null
  };
  if (state === 'jump') {
    pose.standTime = t;
  } else if (state === 'failed') {
    pose.bodyY = .87 * curve(t, [[0, 0], [.24, 2], [.52, 5], [.78, 1], [1, 0]]);
    pose.headDroop = .87 * curve(t, [[0, 0], [.28, 3], [.62, 28], [.82, 17], [1, 0]]);
    pose.earSag = .87 * curve(t, [[0, 0], [.32, 1], [.62, 14], [.82, 8], [1, 0]]);
    pose.eyeClose = .87 * curve(t, [[0, 0], [.28, .15], [.58, 1], [.78, .52], [1, 0]]);
    pose.headTurn = .87 * .045 * Math.sin(Math.PI * t);
  } else if (state === 'running') {
    const phase = index / (count - 1) * Math.PI * 2;
    const sway = Math.sin(phase);
    const leftLift = Math.max(0, sway) * 22;
    const rightLift = Math.max(0, Math.sin(phase + Math.PI)) * 22;
    pose.bodyY = -Math.abs(sway) * 6;
    pose.bodyX = sway * 6;
    pose.wrists = { left: [194, 503 - leftLift], right: [324, 503 - rightLift] };
    pose.keyboard = true;
  } else if (state === 'review') {
    pose.headTurn = [0, -.03, 0, .12, .12, 0][index];
    pose.headDroop = [0, 7, 1, 0, 0, 0][index];
    pose.headShiftX = [0, -2, 0, 0, 0, 0][index];
    pose.nosePulse = [0, 1, .15, 0, 0, 0][index];
    pose.earSag = [0, 1, 0, 2, 1, 0][index];
    pose.eyeClose = [0, .08, 0, 0, 0, 0][index];
  } else if (state === 'waiting') {
    pose.sleepTime = index / 6 * 3.2;
  }
  return { ...pose, state, index, count, progress: t };
}

function prop(texture, width, height, x, y, z, order) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false,
    depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x - 260, 295 - y, z);
  mesh.renderOrder = order;
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

export async function createActivity(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(...ACTIVITY_EXPORT_CANVAS);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-320, 320, 355, -325, -10, 10);
  camera.position.z = 5;
  const rig = await createRig(THREE);
  scene.add(rig.group);
  const loader = new THREE.TextureLoader();
  const [keyboard] = await Promise.all(['keyboard_rest-crop.png'].map(async name => {
    const texture = await loader.loadAsync(new URL(`./assets/${name}`, import.meta.url).href);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }));
  const keyboardMesh = prop(keyboard, 378, 61, 260, 550, 1, 1.5);
  scene.add(keyboardMesh);
  let current = null;
  function sample(state, index) {
    const pose = resolveActivityPose(state, index);
    if (state === 'jump') {
      rig.setHindStandTime(pose.standTime);
    } else if (state === 'waiting') {
      rig.setSleepPoseTimes({ breathTime: pose.sleepTime, effectTime: pose.sleepTime });
    } else {
      rig.setActivityPose(pose);
    }
    keyboardMesh.visible = pose.keyboard;
    renderer.render(scene, camera);
    current = pose;
  }
  function capturePNG() {
    return renderer.domElement.toDataURL('image/png');
  }
  function diagnostics() {
    return current ? { ...current, canvas: [canvas.width, canvas.height], webgl: true, rigEvidence: rig.evidence() } : null;
  }
  sample('jump', 0);
  return { sample, capturePNG, diagnostics };
}
