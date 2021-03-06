import * as $ from '//unpkg.com/three@0.123.0/build/three.module.js'
import { OrbitControls } from '//unpkg.com/three@0.123.0/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from '//unpkg.com/three@0.123.0/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from '//unpkg.com/three@0.123.0/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from '//unpkg.com/three@0.123.0/examples/jsm/postprocessing/UnrealBloomPass'
import { BokehPass } from '//unpkg.com/three@0.123.0/examples/jsm/postprocessing/BokehPass'

//Boot

const renderer = new $.WebGLRenderer({ antialias: true });
const scene = new $.Scene();
const camera = new $.PerspectiveCamera(45, 2, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
const composer = new EffectComposer(renderer);
const drawingBufferSize = new $.Vector2();

window.addEventListener('resize', () => {
    const { clientWidth, clientHeight } = renderer.domElement;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight, false);

    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();

    composer.setPixelRatio(window.devicePixelRatio);
    composer.setSize(clientWidth, clientHeight);

    renderer.getDrawingBufferSize(drawingBufferSize); 
});

document.body.prepend(renderer.domElement);
window.dispatchEvent(new Event('resize'));
renderer.setAnimationLoop(() => {
    composer.render();
    controls.update();
});

// Main

const SZ = 32;
const ISZ = 2;

scene.background = new $.Color('black');
camera.position.set(-40, 30, -50);
controls.autoRotate = true;
controls.autoRotateSpeed = 0.2;

const light = new $.DirectionalLight('white', 1);
scene.add(light);

class Inst {    // 3JS inst wrapper for gsap
    constructor(mesh, idx, r, g, b, x, z) {
        this.mesh = mesh;
        this.idx = idx;
        this.color = new $.Color(r, g, b);
        this.matrix = new $.Matrix4();
        this.scaleMatrix = new $.Matrix4();
        this.x = x;
        this.z = z;
        this._setXZ(x, z);
        this._updateColor();
    }

    get $r() { return this.color.r }
    get $g() { return this.color.g }
    get $b() { return this.color.b }

    set $r(v) { this.color.r = v; this._updateColor() }
    set $g(v) { this.color.g = v; this._updateColor() }
    set $b(v) { this.color.b = v; this._updateColor() }

    _updateColor() {
        this.mesh.setColorAt(this.idx, this.color);
        this.mesh.instanceColor.needsUpdate = true;
        this._setY((this.$r * 0.25 + this.$g * 0.5 + this.$b * 0.2) ** 4 * 100);
    }
    _updateMatrix() {
        this.mesh.setMatrixAt(this.idx, this.matrix);
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    _setXZ(x, z) {
        this.matrix.makeTranslation(x, 0, z);
        this._updateMatrix();
    }
    _setY(y) {
        this.scaleMatrix.makeScale(1, y, 1);
        this.matrix.makeTranslation(this.x, 0, this.z).multiply(this.scaleMatrix);
        this._updateMatrix();
    }
}

const geom = new $.BoxBufferGeometry(ISZ, 1, ISZ).translate(0, 0.5, 0);
const mat = new $.MeshLambertMaterial();
const mesh = new $.InstancedMesh(geom, mat, SZ * SZ);
scene.add(mesh);

const insts = [];
for (let i = 0, I = SZ; i < I; ++i) {
    for (let j = 0, J = SZ; j < J; ++j) {
        const n = i * SZ + j;
        const x = (j / J - 0.5) * (ISZ * 1.01 * SZ);
        const z = (i / I - 0.5) * (ISZ * 1.01 * SZ);
        insts.push(new Inst(mesh, n, 0, 0, 0, x, z));
    }
}

// Animation

gsap.timeline({
    repeat: -1, yoyo: true, // infinite alternate
    defaults: {
        stagger: {
            amount: 1,      // duration
            grid: [SZ, SZ], from: 'center' // ripple
        },
        ease: 'bounce'
    }
})
    .to(insts, { $r: 0.2, $g: 'random(0, 0.56)', $b: 1 }) // random string
    .to(insts, { $r: (i) => i / (SZ * SZ), $g: 0.2, $b: 0.8 }) // fn-based

// Post Processing

const renderPass = new RenderPass(scene, camera);
const bokehPass = new BokehPass(scene, camera, { focus: 40, aperture: 0.01 / 20, maxblur: 0.01 });
const bloomPass = new UnrealBloomPass(drawingBufferSize, 0.5, 0.2, 0.2);
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(bokehPass);