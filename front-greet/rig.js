import { createFrontSit } from '../front-sit/rig.js';

const DURATION = 0.7;
const IMAGE = { width: 1470, height: 1070, crop: [515, 492, 955, 732] };

export function createRig({ THREE, assetsBase, assetBase } = {}) {
  if (!THREE) throw new Error('Greeting rig requires THREE');
  const base = createFrontSit({ THREE, assetsBase: new URL('../front-sit/', import.meta.url).href });
  const group = new THREE.Group();
  group.name = 'Kiwi tongue and tail greeting';
  group.add(base.group);
  const geometry = new THREE.PlaneGeometry(68, 37, 24, 16);
  const [left, top, right, bottom] = IMAGE.crop;
  const loader = new THREE.TextureLoader();
  const assetRoot = assetsBase ?? assetBase ?? new URL('./', import.meta.url).href;
  const mouthUrl = new URL('mouth.png', assetRoot.endsWith('/') ? assetRoot : `${assetRoot}/`).href;
  let mesh = null;
  let texture = null;
  let disposed = false;
  let pendingTime = 0;
  const ready = Promise.all([base.ready, loader.loadAsync(mouthUrl)]).then(([, loaded]) => {
    if (disposed) { loaded.dispose(); return; }
    texture = loaded;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const material = new THREE.ShaderMaterial({
      uniforms: {
        imageMap: { value: texture },
        uvRect: { value: new THREE.Vector4(left / IMAGE.width, 1 - bottom / IMAGE.height,
          right / IMAGE.width, 1 - top / IMAGE.height) },
        amount: { value: 1 },
        sway: { value: 0 },
      },
      vertexShader: `varying vec2 localUv;
        uniform float sway;
        void main() {
          localUv = uv;
          float tip = (1.0 - smoothstep(0.25, 0.65, uv.y))
            * smoothstep(0.0, 0.12, uv.y)
            * (1.0 - smoothstep(0.12, 0.35, abs(uv.x - 0.5)));
          vec3 p = position;
          p.x += 1.5 * sway * tip;
          p.y += 0.35 * sway * tip;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform sampler2D imageMap;
        uniform vec4 uvRect;
        uniform float amount;
        varying vec2 localUv;
        void main() {
          vec2 imageUv = mix(uvRect.xy, uvRect.zw, localUv);
          vec4 color = texture2D(imageMap, imageUv);
          float edge = smoothstep(0.0, 0.18, localUv.x)
            * smoothstep(0.0, 0.18, 1.0 - localUv.x)
            * smoothstep(0.0, 0.22, localUv.y)
            * smoothstep(0.0, 0.22, 1.0 - localUv.y);
          gl_FragColor = vec4(color.rgb, color.a * edge * amount);
          if (gl_FragColor.a < 0.015686275) discard;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2;
    mesh.position.set(255 - 260, 295 - 269, 0);
    group.add(mesh);
    setTime(pendingTime);
  });
  function setTime(time) {
    if (!Number.isFinite(time)) throw new TypeError('Finite greeting time required');
    pendingTime = time;
    base.setPoseTimes({ tailTime: 3.2 * time / DURATION, breathTime: 0 });
    if (mesh) mesh.material.uniforms.sway.value = Math.sin(2 * Math.PI * time / DURATION);
  }
  function dispose() {
    disposed = true;
    base.dispose();
    if (mesh) { group.remove(mesh); mesh.material.dispose(); }
    geometry.dispose();
    if (texture) texture.dispose();
  }
  return { group, ready, width: 520, height: 590, duration: DURATION, setTime, dispose };
}
