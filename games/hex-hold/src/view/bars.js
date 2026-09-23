// Small health bars that float above things and always face the camera.
// They only show while something is hurt.
import * as THREE from 'three';

const plane = new THREE.PlaneGeometry(1, 1);
const back = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, depthTest: false, transparent: true, opacity: 0.8 });
const good = new THREE.MeshBasicMaterial({ color: 0x5fd35a, depthTest: false, transparent: true });
const bad = new THREE.MeshBasicMaterial({ color: 0xe8483f, depthTest: false, transparent: true });

export class HealthBar {
  constructor(width = 0.6) {
    this.width = width;
    this.group = new THREE.Group();
    this.back = new THREE.Mesh(plane, back);
    this.back.scale.set(width + 0.06, 0.14, 1);
    this.fill = new THREE.Mesh(plane, good);
    this.fill.scale.set(width, 0.08, 1);
    this.fill.position.z = 0.001;
    this.back.renderOrder = 10;
    this.fill.renderOrder = 11;
    this.group.add(this.back, this.fill);
    this.group.visible = false;
  }

  set(fraction, camera) {
    const f = Math.max(0, Math.min(1, fraction));
    this.group.visible = f < 0.999;
    if (!this.group.visible) return;
    this.fill.scale.x = this.width * f;
    this.fill.position.x = -(this.width * (1 - f)) / 2;
    this.fill.material = f > 0.35 ? good : bad;
    this.group.quaternion.copy(camera.quaternion);
    // Undo the parent's rotation so it still faces the camera.
    const parent = this.group.parent;
    if (parent) this.group.quaternion.premultiply(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  }
}
