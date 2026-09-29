import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export type ControllerState = { left: boolean; right: boolean };
type Callbacks = {
  onSessionChange: (active: boolean) => void;
  onControllersChange: (state: ControllerState) => void;
};

type HapticGamepad = Gamepad & {
  vibrationActuator?: { playEffect?: (type: string, options: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<unknown> };
  hapticActuators?: Array<{ pulse?: (value: number, duration: number) => Promise<boolean> }>;
};

function createGlove(color: number, handedness: 'left' | 'right') {
  const glove = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color, roughness: 0.44, metalness: 0.08, emissive: color, emissiveIntensity: 0.045 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.88 });
  const highlight = new THREE.MeshStandardMaterial({ color: 0xe6d6b9, roughness: 0.72 });
  const sphere = new THREE.SphereGeometry(1, 16, 12);

  const palm = new THREE.Mesh(sphere, leather);
  palm.scale.set(0.136, 0.14, 0.152);
  palm.position.z = -0.055;
  glove.add(palm);

  const knuckles = new THREE.Mesh(sphere, leather);
  knuckles.scale.set(0.151, 0.102, 0.105);
  knuckles.position.set(0, 0.032, -0.167);
  glove.add(knuckles);

  const thumb = new THREE.Mesh(sphere, leather);
  thumb.scale.set(0.061, 0.081, 0.089);
  thumb.position.set(handedness === 'left' ? 0.125 : -0.125, -0.058, -0.078);
  glove.add(thumb);

  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.099, 0.17, 16), leather);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 0.132;
  glove.add(cuff);

  const opening = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.012, 6, 16), trim);
  opening.position.z = 0.218;
  glove.add(opening);

  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.009, 0.008), highlight);
  seam.position.set(0, 0.089, 0.135);
  glove.add(seam);
  glove.userData.leather = leather;
  return glove;
}

export class BoxingScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.05, 70);
  private preview = new THREE.Group();
  private button: HTMLElement;
  private observer: ResizeObserver;
  private controllerSources: (XRInputSource | null)[] = [null, null];
  private previewGloves: THREE.Group[] = [];
  private state: ControllerState = { left: false, right: false };
  private disposed = false;
  private host: HTMLDivElement;
  private callbacks: Callbacks;
  private clock = new THREE.Clock();

  constructor(host: HTMLDivElement, buttonHost: HTMLDivElement, callbacks: Callbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.setClearColor(0x101314);
    host.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x101314);
    this.scene.fog = new THREE.FogExp2(0x101314, 0.075);
    this.camera.position.set(0, 1.55, 2.85);
    this.camera.lookAt(0, 1.42, 0);

    this.scene.add(new THREE.HemisphereLight(0xd7e6e6, 0x28271e, 2.3));
    const key = new THREE.DirectionalLight(0xffede1, 3.2);
    key.position.set(-2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6a9bad, 2.8);
    rim.position.set(2, 2, -2);
    this.scene.add(rim);

    // Spatial grounding only; the gym environment and bag arrive in Phase 2.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x1a1e1e, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(16, 16, 0x566566, 0x303b3d);
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    this.scene.add(grid);

    const previewLeft = createGlove(0xe84d2f, 'left');
    const previewRight = createGlove(0xe3d7c2, 'right');
    previewLeft.position.set(-0.4, 1.34, 0.02);
    previewRight.position.set(0.4, 1.36, -0.16);
    previewLeft.rotation.set(-0.24, -0.27, -0.29);
    previewRight.rotation.set(-0.18, 0.28, 0.26);
    this.previewGloves = [previewLeft, previewRight];
    this.preview.add(previewLeft, previewRight);
    this.scene.add(this.preview);

    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      const grip = this.renderer.xr.getControllerGrip(i);
      const glove = createGlove(i === 0 ? 0xe84d2f : 0xe3d7c2, i === 0 ? 'left' : 'right');
      glove.visible = false;
      grip.add(glove);
      this.scene.add(controller, grip);
      controller.addEventListener('connected', (event) => {
        const source = event.data as XRInputSource;
        this.controllerSources[i] = source;
        glove.visible = true;
        const hand = source.handedness;
        if (hand === 'left' || hand === 'right') {
          const leather = glove.userData.leather as THREE.MeshStandardMaterial;
          leather.color.setHex(hand === 'left' ? 0xe84d2f : 0xe3d7c2);
          leather.emissive.copy(leather.color);
          this.state = { ...this.state, [hand]: true };
          this.callbacks.onControllersChange({ ...this.state });
        }
      });
      controller.addEventListener('disconnected', () => {
        const hand = this.controllerSources[i]?.handedness;
        this.controllerSources[i] = null;
        glove.visible = false;
        if (hand === 'left' || hand === 'right') {
          this.state = { ...this.state, [hand]: false };
          this.callbacks.onControllersChange({ ...this.state });
        }
      });
      controller.addEventListener('selectstart', () => {
        const leather = glove.userData.leather as THREE.MeshStandardMaterial;
        leather.emissiveIntensity = 0.42;
        void this.pulse(this.controllerSources[i]);
      });
      controller.addEventListener('selectend', () => {
        (glove.userData.leather as THREE.MeshStandardMaterial).emissiveIntensity = 0.045;
      });
    }

    this.button = VRButton.createButton(this.renderer, { optionalFeatures: ['local-floor', 'bounded-floor'] });
    this.button.classList.add('enter-vr-button');
    // VRButton supplies fixed inline positioning; retain its session logic in our layout.
    this.button.style.cssText = '';
    buttonHost.appendChild(this.button);

    this.renderer.xr.addEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.addEventListener('sessionend', this.onSessionEnd);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
  }

  private pulse = async (source: XRInputSource | null) => {
    const pad = source?.gamepad as HapticGamepad | undefined;
    try {
      if (pad?.vibrationActuator?.playEffect) {
        await pad.vibrationActuator.playEffect('dual-rumble', { duration: 85, strongMagnitude: 0.55, weakMagnitude: 0.55 });
      } else {
        await pad?.hapticActuators?.[0]?.pulse?.(0.55, 85);
      }
    } catch {
      // A browser may expose haptics but reject individual pulses.
    }
  };

  private onSessionStart = () => {
    this.preview.visible = false;
    this.camera.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
    this.callbacks.onSessionChange(true);
  };

  private onSessionEnd = () => {
    this.preview.visible = true;
    this.camera.position.set(0, 1.55, 2.85);
    this.camera.lookAt(0, 1.42, 0);
    this.state = { left: false, right: false };
    this.callbacks.onControllersChange({ ...this.state });
    this.callbacks.onSessionChange(false);
  };

  private resize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const compact = width < 650;
    this.preview.position.x = compact ? 0 : 0.8;
    this.preview.scale.setScalar(compact ? 1.25 : 1.8);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    if (this.preview.visible) {
      const time = this.clock.getElapsedTime();
      this.previewGloves[0].position.y = 1.34 + Math.sin(time * 1.3) * 0.035;
      this.previewGloves[1].position.y = 1.36 + Math.sin(time * 1.3 + 1.7) * 0.035;
      this.preview.rotation.y = Math.sin(time * 0.42) * 0.09;
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.renderer.xr.removeEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this.onSessionEnd);
    this.observer.disconnect();
    this.renderer.xr.getSession()?.end().catch(() => {});
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      } else if (object instanceof THREE.GridHelper) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.button.remove();
  }
}