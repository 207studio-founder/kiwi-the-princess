import {
  WIDTH, HEIGHT, DURATION, TAIL_ROOT, TAIL_LENGTH,
  breathePoint, bendTailPoint, tailCurve, tailYaw,
} from './rig-math.js';
import { TAIL_PROFILES } from './tail-profiles.js';

const TAIL_ROWS = 66;
const TAIL_COLUMNS = 16;

function makeMaterial(THREE, texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function rememberStageVertices(geometry, mapVertex) {
  const positions = geometry.attributes.position;
  const source = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i += 1) {
    const point = mapVertex(positions.getX(i), positions.getY(i));
    source[i * 2] = point.x;
    source[i * 2 + 1] = point.y;
  }
  return source;
}

function updateMesh(geometry, source, transform) {
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const point = transform(source[i * 2], source[i * 2 + 1]);
    positions.setXYZ(i, point.x - WIDTH / 2, HEIGHT / 2 - point.y, point.z ?? 0);
  }
  positions.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function contour(view, q) {
  const rows = TAIL_PROFILES.views[view];
  const index = Math.max(0, Math.min(TAIL_PROFILES.steps, q * TAIL_PROFILES.steps));
  const low = Math.min(TAIL_PROFILES.steps - 1, Math.floor(index));
  const fraction = index - low;
  return [
    rows[low][0] * (1 - fraction) + rows[low + 1][0] * fraction,
    rows[low][1] * (1 - fraction) + rows[low + 1][1] * fraction,
  ];
}

function makeTailGeometry(THREE) {
  const count = (TAIL_ROWS + 1) * (TAIL_COLUMNS + 1);
  const positions = new Float32Array(count * 3);
  const uvLeft = new Float32Array(count * 2);
  const uvCenter = new Float32Array(count * 2);
  const uvRight = new Float32Array(count * 2);
  const viewBlend = new Float32Array(count);
  const indices = [];
  const geometry = new THREE.BufferGeometry();
  for (let row = 0; row <= TAIL_ROWS; row += 1) {
    const q = -0.015 + row * 1.03 / TAIL_ROWS;
    const sourceY = TAIL_PROFILES.textureRoot[1] - q * TAIL_LENGTH;
    const v = 1 - sourceY / TAIL_PROFILES.textureSize[1];
    for (let column = 0; column <= TAIL_COLUMNS; column += 1) {
      const s = -1 + 2 * column / TAIL_COLUMNS;
      const index = row * (TAIL_COLUMNS + 1) + column;
      for (const [view, target] of [
        ['left', uvLeft], ['center', uvCenter], ['right', uvRight],
      ]) {
        const [offset, halfWidth] = contour(view, q);
        target[index * 2] = (TAIL_PROFILES.textureRoot[0] + offset + s * halfWidth) /
          TAIL_PROFILES.textureSize[0];
        target[index * 2 + 1] = v;
      }
    }
  }
  for (let row = 0; row < TAIL_ROWS; row += 1) {
    for (let column = 0; column < TAIL_COLUMNS; column += 1) {
      const a = row * (TAIL_COLUMNS + 1) + column;
      const b = a + 1;
      const c = a + TAIL_COLUMNS + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uvLeft', new THREE.BufferAttribute(uvLeft, 2));
  geometry.setAttribute('uvCenter', new THREE.BufferAttribute(uvCenter, 2));
  geometry.setAttribute('uvRight', new THREE.BufferAttribute(uvRight, 2));
  geometry.setAttribute('viewBlend', new THREE.BufferAttribute(viewBlend, 1));
  return geometry;
}

function updateTailGeometry(geometry, time) {
  const curve = tailCurve(time);
  const positions = geometry.attributes.position;
  const blends = geometry.attributes.viewBlend;
  for (let row = 0; row <= TAIL_ROWS; row += 1) {
    const q = -0.015 + row * 1.03 / TAIL_ROWS;
    const yawBlend = Math.sin(tailYaw(time, q)) / Math.sin(Math.PI / 4);
    const left = contour('left', q);
    const center = contour('center', q);
    const right = contour('right', q);
    const side = yawBlend < 0 ? left : right;
    const mix = Math.min(1, Math.abs(yawBlend));
    const offset = center[0] * (1 - mix) + side[0] * mix;
    const halfWidth = center[1] * (1 - mix) + side[1] * mix;
    for (let column = 0; column <= TAIL_COLUMNS; column += 1) {
      const s = -1 + 2 * column / TAIL_COLUMNS;
      const point = bendTailPoint(curve,
        TAIL_ROOT.x + offset + s * halfWidth,
        TAIL_ROOT.y - q * TAIL_LENGTH);
      const index = row * (TAIL_COLUMNS + 1) + column;
      positions.setXYZ(index, point.x - WIDTH / 2, HEIGHT / 2 - point.y, point.z);
      blends.setX(index, yawBlend);
    }
  }
  positions.needsUpdate = true;
  blends.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function makeTailMaterial(THREE, textures) {
  for (const texture of textures) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }
  return new THREE.ShaderMaterial({
    uniforms: {
      leftMap: { value: textures[0] },
      centerMap: { value: textures[1] },
      rightMap: { value: textures[2] },
    },
    vertexShader: `
      attribute vec2 uvLeft;
      attribute vec2 uvCenter;
      attribute vec2 uvRight;
      attribute float viewBlend;
      varying vec2 vLeft;
      varying vec2 vCenter;
      varying vec2 vRight;
      varying float vBlend;
      void main() {
        vLeft = uvLeft;
        vCenter = uvCenter;
        vRight = uvRight;
        vBlend = viewBlend;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D leftMap;
      uniform sampler2D centerMap;
      uniform sampler2D rightMap;
      varying vec2 vLeft;
      varying vec2 vCenter;
      varying vec2 vRight;
      varying float vBlend;
      void main() {
        vec4 leftColor = texture2D(leftMap, vLeft);
        vec4 centerColor = texture2D(centerMap, vCenter);
        vec4 rightColor = texture2D(rightMap, vRight);
        float leftWeight = max(0.0, -vBlend);
        float rightWeight = max(0.0, vBlend);
        float centerWeight = 1.0 - leftWeight - rightWeight;
        float alpha = leftColor.a * leftWeight + centerColor.a * centerWeight + rightColor.a * rightWeight;
        vec3 premultiplied = leftColor.rgb * leftColor.a * leftWeight
          + centerColor.rgb * centerColor.a * centerWeight
          + rightColor.rgb * rightColor.a * rightWeight;
        gl_FragColor = vec4(premultiplied / max(alpha, 0.00001), alpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

export function createFrontSit({ THREE, assetsBase, assetBase } = {}) {
  if (!THREE) throw new Error('createFrontSit requires a THREE namespace');
  const base = assetsBase ?? assetBase ?? new URL('./', import.meta.url).href;
  const assetUrl = (name) => new URL(name, base.endsWith('/') ? base : `${base}/`).href;
  const group = new THREE.Group();
  group.name = 'Kiwi front sitting';
  let time = 0;
  let disposed = false;
  let bodyPart;
  let tailPart;
  const loader = new THREE.TextureLoader();

  const ready = Promise.all([
    loader.loadAsync(assetUrl('body.png')),
    loader.loadAsync(assetUrl('tail-left.png')),
    loader.loadAsync(assetUrl('tail-center.png')),
    loader.loadAsync(assetUrl('tail-right.png')),
  ]).then(([bodyTexture, ...tailTextures]) => {
    if (disposed) {
      bodyTexture.dispose();
      tailTextures.forEach((texture) => texture.dispose());
      return;
    }

    const bodyGeometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, 52, 59);
    const bodySource = rememberStageVertices(bodyGeometry, (x, y) => ({
      x: x + WIDTH / 2,
      y: HEIGHT / 2 - y,
    }));
    const body = new THREE.Mesh(bodyGeometry, makeMaterial(THREE, bodyTexture));
    body.name = 'Body, face and four grounded paws';
    body.renderOrder = 1;
    bodyPart = { mesh: body, source: bodySource };

    const tailGeometry = makeTailGeometry(THREE);
    const tail = new THREE.Mesh(tailGeometry, makeTailMaterial(THREE, tailTextures));
    tail.name = 'Continuous three-lobed tail';
    tail.renderOrder = 0;
    tailPart = { mesh: tail, textures: tailTextures };

    group.add(tail, body);
    setTime(time);
  });

  function setPoseTimes({ tailTime, breathTime }) {
    if (!Number.isFinite(tailTime) || !Number.isFinite(breathTime)) {
      throw new TypeError('Pose times must be finite seconds');
    }
    time = breathTime;
    if (disposed || !bodyPart || !tailPart) return;
    updateTailGeometry(tailPart.mesh.geometry, tailTime);
    updateMesh(bodyPart.mesh.geometry, bodyPart.source,
      (x, y) => breathePoint(x, y, breathTime));
  }

  function setTime(nextTime) {
    setPoseTimes({ tailTime: nextTime, breathTime: nextTime });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const part of [bodyPart, tailPart]) {
      if (!part) continue;
      group.remove(part.mesh);
      if (part.textures) part.textures.forEach((texture) => texture.dispose());
      else part.mesh.material.map.dispose();
      part.mesh.material.dispose();
      part.mesh.geometry.dispose();
    }
  }

  return {
    group, ready, width: WIDTH, height: HEIGHT, duration: DURATION,
    setTime, setPoseTimes, dispose,
    metadata: {
      pose: 'front-sitting',
      stage: { width: WIDTH, height: HEIGHT },
      bodyTop: 46,
      bodyFloor: 546,
      tailRoot: { ...TAIL_ROOT },
      tailLength: TAIL_LENGTH,
      assets: ['body.png', 'tail-left.png', 'tail-center.png', 'tail-right.png'],
    },
  };
}

export const createRig = createFrontSit;
