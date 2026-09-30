import * as THREE from '/three.module.js';

const width = 810;
const height = 590;
const renderer = new THREE.WebGLRenderer({alpha:true, antialias:false, preserveDrawingBuffer:true, premultipliedAlpha:false});
renderer.setSize(width, height, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
document.querySelector('#stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0.1, 100);
camera.position.z = 10;
camera.lookAt(0,0,0);
const sideInput = document.querySelector('#side');
const frameInput = document.querySelector('#frame');
const status = document.querySelector('#status');
const cache = new Map();
let generation = 0;

async function binary(url, type) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return new type(await response.arrayBuffer());
}

async function loadSide(side) {
  if (cache.has(side)) return cache.get(side);
  const response = await fetch(`/proof/${side}/manifest.json`);
  if (!response.ok) throw new Error(`${side} manifest: HTTP ${response.status}`);
  const manifest = await response.json();
  const [indices, uv] = await Promise.all([
    binary(`/proof/${side}/indices.u32`, Uint32Array),
    binary(`/proof/${side}/uv.f32`, Float32Array),
  ]);
  const loader = new THREE.TextureLoader();
  const textures = {};
  for (const kind of manifest.order) {
    const texture = await loader.loadAsync(manifest.textures[kind].url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = true;
    textures[kind] = texture;
  }
  const result = {manifest, indices, uv, textures};
  cache.set(side, result);
  return result;
}

function clearScene() {
  for (const object of [...scene.children]) {
    scene.remove(object);
    object.geometry?.dispose();
    object.material?.dispose();
  }
}

async function select(side, frame) {
  const current = ++generation;
  status.textContent = `Loading ${side} ${frame}`;
  const data = await loadSide(side);
  if (!(frame in data.manifest.positions)) throw new Error(`${side} ${frame} has not been exported`);
  const packed = await binary(`/proof/${side}/${data.manifest.positions[frame]}`, Float32Array);
  if (current !== generation) return;
  const count = data.manifest.vertexCount;
  if (packed.length !== count * 2 * data.manifest.order.length) throw new Error('Position count mismatch');
  clearScene();
  data.manifest.order.forEach((kind, index) => {
    const geometry = new THREE.BufferGeometry();
    const xyz = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      xyz[i*3] = packed[index*count*2 + i*2];
      xyz[i*3+1] = packed[index*count*2 + i*2+1];
      xyz[i*3+2] = 0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2));
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
    const material = new THREE.MeshBasicMaterial({map:data.textures[kind], transparent:true,
      depthTest:false, depthWrite:false, side:THREE.DoubleSide, toneMapped:false});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = index;
    scene.add(mesh);
  });
  renderer.render(scene, camera);
  sideInput.value = side;
  frameInput.replaceChildren(...data.manifest.frames.map(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    return option;
  }));
  frameInput.value = frame;
  status.textContent = `${side} ${frame}`;
  return {side, frame, width, height};
}

function capturePNG() {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}

window.select = select;
window.capturePNG = capturePNG;
window.proofReady = select('left', 'neutral').catch(error => {
  status.textContent = error.message;
  throw error;
});
sideInput.addEventListener('change', () => select(sideInput.value, 'neutral').catch(error => status.textContent = error.message));
frameInput.addEventListener('change', () => select(sideInput.value, frameInput.value).catch(error => status.textContent = error.message));
