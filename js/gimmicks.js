// Gimmicks module - handles all stage hazards and enemy objects
import * as THREE from 'three';
import settings from './settings.js';
import { playGimmickSound } from './audio.js';

// ============================================================
// Warning Indicator - 感嘆符(❗) displayed before gimmick arrives
// ============================================================
class WarningIndicator {
    constructor(scene, position, duration = 0.8) {
        this.scene = scene;
        this.alive = true;
        this.duration = duration;
        this.age = 0;

        this.createMesh(position);
    }

    createMesh(position) {
        const group = new THREE.Group();

        // Exclamation mark body (tall box)
        const bodyGeo = new THREE.BoxGeometry(0.6, 2.5, 0.6);
        const mat = new THREE.MeshBasicMaterial({
            color: settings.getHex('speedUpColor'),
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.8;
        group.add(body);

        // Exclamation mark dot
        const dotGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const dot = new THREE.Mesh(dotGeo, mat);
        dot.position.y = -1.0;
        group.add(dot);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(1.2, 1.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('warningColor'),
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(this.ring);

        this.mesh = group;
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;

        // Pulsing effect
        const pulse = Math.sin(this.age * 20) * 0.5 + 0.5;
        let baseScale = 0.8 + pulse * 0.4;
        
        // Height-based scaling
        if (boundsY) {
            const normalizedHeight = (this.mesh.position.y + boundsY) / (2 * boundsY);
            baseScale *= (0.55 + normalizedHeight * 0.9);
        }
        this.mesh.scale.setScalar(baseScale);

        // Ring expands
        if (this.ring) {
            this.ring.scale.setScalar(1 + this.age * 2);
            this.ring.material.opacity = 0.4 * (1 - this.age / this.duration);
        }

        // Always face camera (billboard)
        this.mesh.rotation.y += deltaTime * 3;

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// 1. Poison Fog - 10秒間毒霧が発生 (Revised: 5 instances)
// ============================================================
class PoisonFog {
    constructor(scene, bounds, center = new THREE.Vector3(), radius = 10) {
        this.scene = scene;
        this.bounds = bounds;
        this.center = center;
        this.radius = radius;
        this.alive = true;
        this.duration = 10;
        this.age = 0;
        this.particles = [];
        this.gimmickName = 'Poison Fog';

        this.createFog();
    }

    createFog() {
        // Create fog particle cloud - danger zone in center
        const fogCount = 40; // Reduced per instance
        const mat = new THREE.MeshBasicMaterial({
            color: settings.getHex('poisonFogColor'),
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < fogCount; i++) {
            const size = 3 + Math.random() * 4;
            const geo = new THREE.PlaneGeometry(size, size);
            const mesh = new THREE.Mesh(geo, mat.clone());

            // Place fog within radius
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.radius;
            mesh.position.set(
                this.center.x + Math.cos(angle) * dist,
                this.center.y + (Math.random() - 0.5) * 5,
                this.center.z + Math.sin(angle) * dist
            );
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            mesh.userData = {
                basePos: mesh.position.clone(),
                drift: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 2
                ),
                phase: Math.random() * Math.PI * 2
            };

            this.particles.push(mesh);
            this.scene.add(mesh);
        }

        // Boundary ring to show collision radius
        this.boundaryRings = [];
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.RingGeometry(this.radius - 0.3, this.radius, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: settings.getHex('poisonFogColor'),
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(this.center);
            // Different orientations for 3D visibility
            if (i === 0) ring.rotation.x = Math.PI / 2; // XZ plane
            if (i === 1) ring.rotation.y = 0;            // XY plane  
            if (i === 2) ring.rotation.z = Math.PI / 2; // YZ plane
            ring.position.y += (i - 1) * 0.5; // Slight vertical offset
            this.boundaryRings.push(ring);
            this.scene.add(ring);
        }
    }

    update(deltaTime, playerPos, boundsY) {
        this.age += deltaTime;

        // Fade in during first 1 second, fade out during last 1 second
        let opacity;
        if (this.age < 1) {
            opacity = this.age * 0.35;
        } else if (this.age > this.duration - 1) {
            opacity = (this.duration - this.age) * 0.35;
        } else {
            opacity = 0.35;
        }

        // 毒霧は鮮明度の影響を受けないように調整
        let proximityMul = 1.0;

        let heightScale = 1.0;
        if (boundsY) {
            const normalizedHeight = (this.center.y + boundsY) / (2 * boundsY);
            heightScale = 0.55 + normalizedHeight * 0.9;
        }

        for (const p of this.particles) {
            const d = p.userData;
            p.position.x = d.basePos.x + Math.sin(this.age * 0.5 + d.phase) * d.drift.x * 3;
            p.position.y = d.basePos.y + Math.sin(this.age * 0.3 + d.phase) * d.drift.y * 3;
            p.position.z = d.basePos.z + Math.cos(this.age * 0.4 + d.phase) * d.drift.z * 3;
            p.rotation.z += deltaTime * 0.2;
            p.material.opacity = opacity * (0.6 + Math.random() * 0.4) * proximityMul;
            p.scale.setScalar(heightScale);
        }

        const ringOpacity = opacity * 0.6 * (0.7 + Math.sin(this.age * 3) * 0.3) * proximityMul;
        for (const ring of this.boundaryRings) {
            ring.material.opacity = ringOpacity;
            ring.scale.setScalar(heightScale);
        }

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    checkCollision(playerPos, playerRadius) {
        // Fog damage if inside the cloud
        if (this.age > 0.5 && this.age < this.duration - 0.5) {
            const dist = playerPos.distanceTo(this.center);
            return dist < this.radius;
        }
        return false;
    }

    destroy() {
        for (const p of this.particles) {
            this.scene.remove(p);
        }
        this.particles = [];
        for (const ring of this.boundaryRings) {
            this.scene.remove(ring);
        }
        this.boundaryRings = [];
        this.alive = false;
    }
}

// ============================================================
// 2. Giant Hand - 右下から斜めに指を広げる巨大な手
// ============================================================
class GiantHand {
    constructor(scene, bounds) {
        this.scene = scene;
        this.bounds = bounds;
        this.alive = true;
        this.duration = 2.5;
        this.age = 0;
        this.gimmickName = 'Hand';

        // Fixed position - wrist at bottom-right corner
        this.baseX = bounds.x * 0.7;
        this.baseZ = bounds.z * 0.7;
        this.hasLanded = false;

        this.handScale = 2.7; // 1.8 * 1.5 = 2.7

        // Collision uses individual finger/palm boxes
        this.collisionBoxes = [];

        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        const material = new THREE.MeshBasicMaterial({
            color: settings.getHex('giantHandColor'),
            transparent: true,
            opacity: 0.95
        });
        const outlineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

        // Palm - angled, wider
        const palmGeo = new THREE.BoxGeometry(10, 2, 12);
        const palm = new THREE.Mesh(palmGeo, material);
        palm.position.set(0, 0, 0);
        group.add(palm);
        const palmEdges = new THREE.LineSegments(new THREE.EdgesGeometry(palmGeo), outlineMat);
        palmEdges.position.copy(palm.position);
        group.add(palmEdges);
        this.collisionBoxes.push({ center: new THREE.Vector3(0, 0, 0), halfX: 5, halfY: 1, halfZ: 6 });

        // 5 fingers spread - matching reference picture with wider gaps
        const fingerData = [
            { x: -5.5, z: 7.5, angle: -0.45, len: 11, label: 'pinky' },
            { x: -2.5, z: 8.5, angle: -0.15, len: 13, label: 'ring' },
            { x:  0.5, z: 9,   angle: 0.05,  len: 15, label: 'middle' },
            { x:  3.5, z: 8.5, angle: 0.25,  len: 13, label: 'index' },
            { x:  6.5, z: 4,   angle: 0.80,  len: 10, label: 'thumb' },
        ];

        for (const f of fingerData) {
            const fingerGeo = new THREE.BoxGeometry(1.8, 1.8, f.len);
            const finger = new THREE.Mesh(fingerGeo, material.clone());
            finger.position.set(f.x, 0, f.z + f.len * 0.5);
            finger.rotation.y = f.angle;
            group.add(finger);

            const fEdges = new THREE.LineSegments(new THREE.EdgesGeometry(fingerGeo), outlineMat.clone());
            fEdges.position.copy(finger.position);
            fEdges.rotation.y = finger.rotation.y;
            group.add(fEdges);

            // Approximate collision box for each finger
            const cosA = Math.cos(f.angle);
            const sinA = Math.sin(f.angle);
            const cx = f.x + sinA * f.len * 0.5;
            const cz = f.z + f.len * 0.5 * cosA;
            this.collisionBoxes.push({
                center: new THREE.Vector3(cx, 0, cz),
                halfX: f.len * 0.5 * Math.abs(sinA) + 0.9,
                halfY: 0.9,
                halfZ: f.len * 0.5 * Math.abs(cosA) + 0.9
            });
        }

        // Wrist/arm extending down-right
        const wristGeo = new THREE.BoxGeometry(10, 2, 8);
        const wrist = new THREE.Mesh(wristGeo, material.clone());
        wrist.position.set(2, 0, -10);
        group.add(wrist);
        const wEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wristGeo), outlineMat.clone());
        wEdges.position.copy(wrist.position);
        group.add(wEdges);
        this.collisionBoxes.push({ center: new THREE.Vector3(2, 0, -10), halfX: 5, halfY: 1, halfZ: 4 });

        this.mesh = group;
        this.mesh.rotation.y = -Math.PI * 0.75; // Pointing "Left-Back" (-X, -Z) from basePos
        this.mesh.position.set(this.baseX, 50, this.baseZ);
        this.mesh.scale.setScalar(this.handScale);
        this.scene.add(this.mesh);
    }

    getWarningPosition() {
        return new THREE.Vector3(this.baseX, this.bounds.y, this.baseZ);
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;

        const landY = -this.bounds.y + 2;

        if (this.age < 0.5) {
            this.mesh.position.y = 50 - this.age * 120;
            if (this.mesh.position.y <= landY) {
                this.mesh.position.y = landY;
                this.hasLanded = true;
            }
        } else if (!this.hasLanded) {
            this.mesh.position.y = landY;
            this.hasLanded = true;
        }

        if (this.hasLanded) {
            if (this.age > 1.2) {
                this.mesh.position.y += (this.age - 1.2) * 40;
            }
        }

        // GiantHandは高低差によるサイズ変化を行わない（一定サイズ）
        this.mesh.scale.setScalar(this.handScale);

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    checkCollision(playerPos, playerRadius) {
        if (this.age < 0) return false;

        const scale = this.handScale;
        const cosR = Math.cos(-this.mesh.rotation.y);
        const sinR = Math.sin(-this.mesh.rotation.y);

        const relX = playerPos.x - this.mesh.position.x;
        const relY = playerPos.y - this.mesh.position.y;
        const relZ = playerPos.z - this.mesh.position.z;

        const localX = (cosR * relX - sinR * relZ) / scale;
        const localY = relY / scale;
        const localZ = (sinR * relX + cosR * relZ) / scale;

        for (const box of this.collisionBoxes) {
            const dx = Math.abs(localX - box.center.x) - box.halfX;
            const dy = Math.abs(localY - box.center.y) - box.halfY;
            const dz = Math.abs(localZ - box.center.z) - box.halfZ;

            const closest = Math.sqrt(
                Math.max(0, dx) * Math.max(0, dx) +
                Math.max(0, dy) * Math.max(0, dy) +
                Math.max(0, dz) * Math.max(0, dz)
            );

            if (closest < playerRadius / scale) {
                return true;
            }
        }

        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// 3. Rushing Car - 突進してくる車（2回来る）
// ============================================================
class RushingCar {
    constructor(scene, bounds, warningCallback) {
        this.scene = scene;
        this.bounds = bounds;
        this.alive = true;
        this.age = 0;
        this.speed = 120;
        this.hitRadius = 3.8;
        this.warningCallback = warningCallback;
        this.gimmickName = 'Car';

        // First pass direction
        this.pass = 1;
        this.setupPass(1);
        this.createMesh();
    }

    setupPass(passNum) {
        const side = Math.floor(Math.random() * 4);
        const b = this.bounds;

        switch (side) {
            case 0: // From +X
                this.startPos = new THREE.Vector3(b.x + 15, (Math.random() - 0.5) * b.y, (Math.random() - 0.5) * b.z);
                this.direction = new THREE.Vector3(-1, 0, 0);
                break;
            case 1: // From -X
                this.startPos = new THREE.Vector3(-b.x - 15, (Math.random() - 0.5) * b.y, (Math.random() - 0.5) * b.z);
                this.direction = new THREE.Vector3(1, 0, 0);
                break;
            case 2: // From +Z
                this.startPos = new THREE.Vector3((Math.random() - 0.5) * b.x, (Math.random() - 0.5) * b.y, b.z + 15);
                this.direction = new THREE.Vector3(0, 0, -1);
                break;
            case 3: // From -Z
                this.startPos = new THREE.Vector3((Math.random() - 0.5) * b.x, (Math.random() - 0.5) * b.y, -b.z - 15);
                this.direction = new THREE.Vector3(0, 0, 1);
                break;
        }

        this.position = this.startPos.clone();
    }

    createMesh() {
        const group = new THREE.Group();

        // Car body
        const bodyGeo = new THREE.BoxGeometry(3.8, 2.5, 7.6);
        const bodyMat = new THREE.MeshBasicMaterial({ color: settings.getHex('carBodyColor') });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Roof
        const roofGeo = new THREE.BoxGeometry(3.15, 1.5, 3.8);
        const roofMat = new THREE.MeshBasicMaterial({ color: settings.getHex('carRoofColor') });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.9;
        roof.position.z = -0.6;
        group.add(roof);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 8);
        const wheelMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

        [[-1.9, -1, 2.5], [1.9, -1, 2.5], [-1.9, -1, -2.5], [1.9, -1, -2.5]].forEach(([x, y, z]) => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(x, y, z);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
        });

        // Headlights
        const lightGeo = new THREE.SphereGeometry(0.4, 6, 6);
        const lightMat = new THREE.MeshBasicMaterial({ color: settings.getHex('carLightColor') });
        const lightL = new THREE.Mesh(lightGeo, lightMat);
        lightL.position.set(-1.25, 0, 3.9);
        group.add(lightL);
        const lightR = new THREE.Mesh(lightGeo, lightMat);
        lightR.position.set(1.25, 0, 3.9);
        group.add(lightR);

        // Outline
        const edges = new THREE.EdgesGeometry(bodyGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
        group.add(new THREE.LineSegments(edges, lineMat));

        this.mesh = group;
        this.mesh.position.copy(this.position);

        // Orient car in direction of movement
        if (this.direction.x !== 0) {
            this.mesh.rotation.y = this.direction.x > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else if (this.direction.z < 0) {
            this.mesh.rotation.y = Math.PI;
        }

        // Scale up
        this.mesh.scale.setScalar(2.3);

        this.scene.add(this.mesh);
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;

        // Move car
        this.position.add(this.direction.clone().multiplyScalar(this.speed * deltaTime));
        this.mesh.position.copy(this.position);

        // Height-based scaling
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            const heightScale = 0.55 + normalizedHeight * 0.9;
            this.mesh.scale.setScalar(2.3 * heightScale);
        }

        // Check if car went off screen
        const b = this.bounds;
        const outOfBounds = Math.abs(this.position.x) > b.x + 20 ||
            Math.abs(this.position.z) > b.z + 20;

        if (outOfBounds && this.pass === 1) {
            this.pass = 2;
            this.setupPass(2);
            this.mesh.position.copy(this.position);

            if (this.direction.x !== 0) {
                this.mesh.rotation.y = this.direction.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            } else if (this.direction.z < 0) {
                this.mesh.rotation.y = Math.PI;
            } else {
                this.mesh.rotation.y = 0;
            }

            if (this.warningCallback) {
                const warnPos = this.position.clone();
                warnPos.x = THREE.MathUtils.clamp(warnPos.x, -b.x, b.x);
                warnPos.z = THREE.MathUtils.clamp(warnPos.z, -b.z, b.z);
                this.warningCallback(warnPos, 0.25);
            }
        } else if (outOfBounds && this.pass === 2) {
            this.alive = false;
        }
    }

    checkCollision(playerPos, playerRadius) {
        const dist = playerPos.distanceTo(this.position);
        return dist < this.hitRadius + playerRadius;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// 4. Enemy Shooter - 弾とレーザーを出す敵
// ============================================================
class EnemyShooter {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 6;
        this.age = 0;
        this.shootTimer = 0;
        this.laserTimer = 0;
        this.gimmickName = 'Enemy Shooter';

        // Spawn at edge
        const side = Math.floor(Math.random() * 4);
        this.position = new THREE.Vector3();
        switch (side) {
            case 0: this.position.set(bounds.x - 2, (Math.random() - 0.5) * bounds.y, bounds.z - 2); break;
            case 1: this.position.set(-bounds.x + 2, (Math.random() - 0.5) * bounds.y, bounds.z - 2); break;
            case 2: this.position.set(bounds.x - 2, (Math.random() - 0.5) * bounds.y, -bounds.z + 2); break;
            case 3: this.position.set(-bounds.x + 2, (Math.random() - 0.5) * bounds.y, -bounds.z + 2); break;
        }

        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Body - diamond shape
        const bodyGeo = new THREE.OctahedronGeometry(1.5, 0);
        this.bodyMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('enemyBodyColor'),
            transparent: true,
            opacity: 0.9
        });
        this.baseBodyColor = new THREE.Color(settings.getHex('enemyBodyColor'));
        const body = new THREE.Mesh(bodyGeo, this.bodyMat);
        group.add(body);

        // Eye
        const eyeGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: settings.getHex('enemyEyeColor') });
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.z = 1.3;
        group.add(eye);

        // Energy ring
        const ringGeo = new THREE.TorusGeometry(2, 0.15, 8, 16);
        this.ringMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('enemyBodyColor'),
            transparent: true,
            opacity: 0.5
        });
        this.baseRingColor = new THREE.Color(settings.getHex('enemyBodyColor'));
        this.ring = new THREE.Mesh(ringGeo, this.ringMat);
        group.add(this.ring);

        // Outline
        const edges = new THREE.EdgesGeometry(bodyGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x000000 });
        group.add(new THREE.LineSegments(edges, lineMat));

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime, playerPos, boundsY) {
        this.age += deltaTime;
        this.shootTimer += deltaTime;
        this.laserTimer += deltaTime;

        // Rotate to face player
        if (playerPos) {
            this.mesh.lookAt(playerPos);
        }

        // Spin ring
        this.ring.rotation.x += deltaTime * 3;
        this.ring.rotation.y += deltaTime * 2;

        // Base scaling (fade in/out)
        let baseScale = 1.0;
        if (this.age < 0.5) {
            baseScale = this.age * 2;
        } else if (this.age > this.duration - 0.5) {
            baseScale = (this.duration - this.age) * 2;
        }

        // Height-based scaling
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            baseScale *= (0.55 + normalizedHeight * 0.9);
        }
        this.mesh.scale.setScalar(baseScale);

        // Proximity color (distance + height difference)
        if (playerPos) {
            const dist3D = this.position.distanceTo(playerPos);
            const distY = Math.abs(this.position.y - playerPos.y);
            const proximityOpacity = THREE.MathUtils.clamp(1.0 - dist3D * 0.02 - distY * 0.05, 0.1, 0.95);
            // グループではなくマテリアルに対して適用する
            if (this.bodyMat) {
                this.bodyMat.opacity = proximityOpacity * 0.9;
                // 明るくする
                const colorFactor = (1.0 - proximityOpacity) * 0.3;
                this.bodyMat.color.copy(this.baseBodyColor).lerp(new THREE.Color(0xffffff), colorFactor);
            }
            if (this.ringMat) {
                this.ringMat.opacity = proximityOpacity * 0.5;
                // 明るくする
                const colorFactor = (1.0 - proximityOpacity) * 0.3;
                this.ringMat.color.copy(this.baseRingColor).lerp(new THREE.Color(0xffffff), colorFactor);
            }
        }

        // Shoot bullets at player
        if (this.shootTimer > 0.6 && this.age > 0.5 && playerPos) {
            this.shootTimer = 0;
            const speed = 20;
            this.bulletManager.spawnAimedBurst(this.position, playerPos, 3, speed, 0.4);
        }

        // Shoot laser occasionally
        if (this.laserTimer > 2.5 && this.age > 1 && playerPos) {
            this.laserTimer = 0;
            const endPos = this.position.clone().add(
                playerPos.clone().sub(this.position).normalize().multiplyScalar(60)
            );
            this.bulletManager.spawnLaser(this.position.clone(), endPos, 0.5, 0.6);
        }

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    checkCollision(playerPos, playerRadius) {
        // Enemy body collision
        const dist = playerPos.distanceTo(this.position);
        return dist < 1.5 + playerRadius;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// 5. Mine - 弾/レーザー/自機に当たるとランダム6方向にレーザー射出
// ============================================================
class Mine {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 7;
        this.age = 0;
        this.radius = 1.0;
        this.triggered = false;
        this.triggerAge = 0;
        this.triggerDelay = 0.3; // 0.3s preview before firing
        this.hasFired = false;
        this.gimmickName = 'Mine';
        this.laserDuration = 0.6;

        // Random position within bounds
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds.x * 1.4,
            (Math.random() - 0.5) * bounds.y * 1.0,
            (Math.random() - 0.5) * bounds.z * 1.4
        );

        // Pre-generate 6 random laser directions
        this.laserDirs = [];
        for (let i = 0; i < 6; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            this.laserDirs.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ));
        }

        this.previewLines = [];
        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Mine body - spiked sphere
        const bodyGeo = new THREE.SphereGeometry(this.radius, 8, 8);
        const bodyMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('mineBodyColor'),
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Spikes
        const spikeGeo = new THREE.ConeGeometry(0.2, 0.6, 4);
        const spikeMat = new THREE.MeshBasicMaterial({ color: settings.getHex('mineSpikeColor') });
        for (let i = 0; i < 12; i++) {
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = this.radius;
            spike.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
            spike.lookAt(spike.position.clone().multiplyScalar(2));
            group.add(spike);
        }

        // Warning light
        const lightGeo = new THREE.SphereGeometry(0.2, 6, 6);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.warningLight = new THREE.Mesh(lightGeo, lightMat);
        this.warningLight.position.y = this.radius + 0.3;
        group.add(this.warningLight);

        this.bodyMesh = body;
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.mesh.scale.setScalar(1.4);
        this.scene.add(this.mesh);
    }

    trigger() {
        if (this.triggered) return;
        this.triggered = true;
        this.triggerAge = 0;

        // Show preview lines for the laser directions
        for (const dir of this.laserDirs) {
            const endPos = this.position.clone().add(dir.clone().multiplyScalar(60));
            const lineDir = endPos.clone().sub(this.position);
            const length = lineDir.length();

            const geo = new THREE.CylinderGeometry(0.1, 0.1, length, 4);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                transparent: true,
                opacity: 0.25
            });
            const lineMesh = new THREE.Mesh(geo, mat);

            const mid = this.position.clone().add(endPos).multiplyScalar(0.5);
            lineMesh.position.copy(mid);
            lineMesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                lineDir.normalize()
            );
            this.scene.add(lineMesh);
            this.previewLines.push(lineMesh);
        }
    }

    fireLasers() {
        if (this.hasFired) return;
        this.hasFired = true;

        // Spawn 6 lasers
        for (const dir of this.laserDirs) {
            const endPos = this.position.clone().add(dir.clone().multiplyScalar(60));
            this.bulletManager.spawnLaserImmediate(
                this.position.clone(), endPos, this.laserDuration
            );
        }

        // Remove preview lines
        for (const line of this.previewLines) {
            this.scene.remove(line);
        }
        this.previewLines = [];

        // Hide mine body
        this.mesh.visible = false;
    }

    // Check if a bullet hits this mine
    checkBulletHit(bulletPos, bulletRadius) {
        if (this.triggered) return false;
        const dist = bulletPos.distanceTo(this.position);
        return dist < this.radius * 1.4 + bulletRadius;
    }

    // Check if player touches this mine
    checkPlayerHit(playerPos, playerRadius) {
        if (this.triggered) return false;
        const dist = playerPos.distanceTo(this.position);
        return dist < this.radius * 1.4 + playerRadius;
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;

        // Height-based scaling
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            const heightScale = 0.55 + normalizedHeight * 0.9;
            this.mesh.scale.setScalar(1.4 * heightScale);
            
            for (const line of this.previewLines) {
                line.scale.set(heightScale, 1.0, heightScale);
            }
        }

        if (!this.triggered) {
            // Blinking warning light
            const blink = Math.sin(this.age * 8) > 0;
            this.warningLight.material.color.setHex(blink ? 0xff0000 : 0x330000);

            // Slow rotation
            this.mesh.rotation.y += deltaTime * 0.5;

            if (this.age >= this.duration) {
                this.alive = false;
            }
        } else {
            this.triggerAge += deltaTime;

            // Pulse preview lines
            const pulse = Math.sin(this.triggerAge * 20) * 0.5 + 0.5;
            for (const line of this.previewLines) {
                line.material.opacity = 0.15 + pulse * 0.35;
            }

            // Flash mine body
            if (this.mesh.visible) {
                const flash = Math.sin(this.triggerAge * 30) > 0;
                this.bodyMesh.material.color.setHex(flash ? 0xff4444 : 0x888888);
            }

            // Fire lasers after delay
            if (this.triggerAge >= this.triggerDelay && !this.hasFired) {
                this.fireLasers();
            }

            // Die after lasers complete
            if (this.hasFired && this.triggerAge >= this.triggerDelay + this.laserDuration + 0.1) {
                this.alive = false;
            }
        }
    }

    checkCollision(playerPos, playerRadius) {
        // No direct collision damage - lasers handle killing
        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
        for (const line of this.previewLines) {
            this.scene.remove(line);
        }
        this.previewLines = [];
        this.alive = false;
    }
}

// ============================================================
// 6. Dividing Wall - 5秒間ステージ分断（攻撃判定なし）
// ============================================================
class DividingWall {
    constructor(scene, bounds) {
        this.scene = scene;
        this.bounds = bounds;
        this.alive = true;
        this.duration = 5;
        this.age = 0;
        this.hasCollision = false; // No damage, only blocks movement
        this.gimmickName = 'Dividing Wall';

        // Random orientation - vertical wall along X or Z
        this.axis = Math.random() < 0.5 ? 'x' : 'z';
        this.wallOffset = (Math.random() - 0.5) * 8; // Position offset

        this.createMesh();
    }

    createMesh() {
        let width, height, depth;
        if (this.axis === 'x') {
            width = this.bounds.x * 2;
            height = this.bounds.y * 2;
            depth = 0.5;
        } else {
            width = 0.5;
            height = this.bounds.y * 2;
            depth = this.bounds.z * 2;
        }

        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshBasicMaterial({
            color: settings.getHex('wallColor'),
            transparent: true,
            opacity: 0.0
        });

        this.mesh = new THREE.Mesh(geo, mat);

        if (this.axis === 'x') {
            this.mesh.position.set(0, 0, this.wallOffset);
        } else {
            this.mesh.position.set(this.wallOffset, 0, 0);
        }

        // Wireframe overlay
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({
            color: settings.getHex('wallWireColor'),
            transparent: true,
            opacity: 0.0
        });
        this.wireframe = new THREE.LineSegments(edges, lineMat);
        this.mesh.add(this.wireframe);

        this.scene.add(this.mesh);
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;

        // Fade in/out
        let opacity;
        if (this.age < 0.5) {
            opacity = this.age * 0.6;
        } else if (this.age > this.duration - 0.5) {
            opacity = (this.duration - this.age) * 0.6;
        } else {
            opacity = 0.3;
        }

        this.mesh.material.opacity = opacity;
        this.wireframe.material.opacity = opacity * 2;

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    // Push player away from wall (no damage)
    constrainPlayer(playerPos, playerRadius) {
        if (this.age < 0.1 || this.age > this.duration - 0.1) return playerPos;

        const wallThickness = 3.0; // Thick enough to prevent fast players passing through
        const pos = playerPos.clone();

        if (this.axis === 'x') {
            const dist = Math.abs(pos.z - this.wallOffset);
            if (dist < wallThickness) {
                pos.z = pos.z > this.wallOffset
                    ? this.wallOffset + wallThickness
                    : this.wallOffset - wallThickness;
            }
        } else {
            const dist = Math.abs(pos.x - this.wallOffset);
            if (dist < wallThickness) {
                pos.x = pos.x > this.wallOffset
                    ? this.wallOffset + wallThickness
                    : this.wallOffset - wallThickness;
            }
        }

        return pos;
    }

    checkCollision() {
        return false; // No damage
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// 7. Fruit Tree - 4秒間実を落とす木
// ============================================================
class FruitTree {
    constructor(scene, bounds) {
        this.scene = scene;
        this.bounds = bounds;
        this.alive = true;
        this.duration = 5.5;
        this.gimmickName = 'Fruit Tree';
        this.age = 0;
        this.fruits = [];
        this.fruitTimer = 0;

        // Random position
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * bounds.x * 1.2,
            bounds.y - 2,
            (Math.random() - 0.5) * bounds.z * 1.2
        );

        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 6, 6);
        const trunkMat = new THREE.MeshBasicMaterial({ color: settings.getHex('treeTrunkColor') });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        group.add(trunk);

        // Canopy - several spheres
        const canopyMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('treeCanopyColor'),
            transparent: true,
            opacity: 0.8
        });
        const positions = [[0, 4, 0], [-2, 3.5, 0], [2, 3.5, 0], [0, 3.5, -2], [0, 3.5, 2]];
        for (const [x, y, z] of positions) {
            const leafGeo = new THREE.SphereGeometry(2, 8, 8);
            const leaf = new THREE.Mesh(leafGeo, canopyMat);
            leaf.position.set(x, y, z);
            group.add(leaf);
        }

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.mesh.scale.setScalar(2.3);
        this.scene.add(this.mesh);
    }

    update(deltaTime, boundsY) {
        this.age += deltaTime;
        this.fruitTimer += deltaTime;

        // Drop fruits periodically
        if (this.fruitTimer > 0.3 && this.age > 0.3) {
            this.fruitTimer = 0;
            this.dropFruit();
        }

        let treeHeightScale = 1.0;
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            treeHeightScale = 0.55 + normalizedHeight * 0.9;
        }

        // Update fruits
        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const f = this.fruits[i];
            f.velocity.y -= 20 * deltaTime;
            f.mesh.position.add(f.velocity.clone().multiplyScalar(deltaTime));
            f.mesh.rotation.x += deltaTime * 5;
            f.mesh.rotation.z += deltaTime * 3;

            // Height-based scaling for fruits
            if (boundsY) {
                const fNormH = (f.mesh.position.y + boundsY) / (2 * boundsY);
                const fHeightScale = 0.55 + fNormH * 0.9;
                f.mesh.scale.setScalar(4.6 * fHeightScale);
            }

            if (f.mesh.position.y < -this.bounds.y - 5) {
                this.scene.remove(f.mesh);
                this.fruits.splice(i, 1);
            }
        }

        // Fade out tree at end
        let baseScale = 2.3;
        if (this.age > this.duration - 0.5) {
            baseScale = Math.max(0, (this.duration - this.age) * 2 * 2.3);
        }
        this.mesh.scale.setScalar(baseScale * treeHeightScale);

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    dropFruit() {
        const geo = new THREE.SphereGeometry(0.4, 6, 6);
        const colors = [0xff0000, 0xff6600, 0xffcc00, 0x00cc00];
        const mat = new THREE.MeshBasicMaterial({
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Scale fruit (2x original)
        mesh.scale.setScalar(4.6);

        // Drop randomly across the ENTIRE stage
        mesh.position.set(
            (Math.random() - 0.5) * this.bounds.x * 1.8,
            this.bounds.y + 10 + Math.random() * 5, // start higher up to allow spread
            (Math.random() - 0.5) * this.bounds.z * 1.8
        );

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8, // Horizontal velocity
            Math.random() * 2,
            (Math.random() - 0.5) * 8
        );

        this.fruits.push({ mesh, velocity, radius: 0.4 });
        this.scene.add(mesh);
    }

    checkCollision(playerPos, playerRadius) {
        // Check fruits
        for (const f of this.fruits) {
            const dist = playerPos.distanceTo(f.mesh.position);
            if (dist < f.radius * 2.3 + playerRadius) {
                return true;
            }
        }

        // Check Tree Trunk (approx cylinder at base)
        const dx = playerPos.x - this.position.x;
        const dz = playerPos.z - this.position.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        if (distXZ < 0.8 * 2.3 + playerRadius && playerPos.y < this.position.y + 6 * 2.3) {
            return true;
        }

        // Check Canopy (approx sphere at top)
        const canopyPos = this.position.clone().add(new THREE.Vector3(0, 4 * 2.3, 0));
        if (playerPos.distanceTo(canopyPos) < 2.5 * 2.3 + playerRadius) {
            return true;
        }

        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
        for (const f of this.fruits) {
            this.scene.remove(f.mesh);
        }
        this.fruits = [];
        this.alive = false;
    }
}

// ============================================================
// 8. Bullet Speed Up - 5秒間弾が高速化
// ============================================================
class BulletSpeedUp {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 5;
        this.age = 0;
        this.gimmickName = 'Speed Up';
        this.hasCollision = false; // No collision damage

        // Activate speed boost
        this.bulletManager.speedMultiplier = 1.8;

        // Visual indicator - pulsing red border around stage
        this.createIndicator();
    }

    createIndicator() {
        const geo = new THREE.BoxGeometry(
            this.bounds.x * 2 + 2,
            this.bounds.y * 2 + 2,
            this.bounds.z * 2 + 2
        );
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({
            color: settings.getHex('speedUpColor'),
            transparent: true,
            opacity: 0.6
        });
        this.mesh = new THREE.LineSegments(edges, mat);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Pulse effect
        const pulse = 0.3 + Math.sin(this.age * 6) * 0.3;
        this.mesh.material.opacity = pulse;

        if (this.age >= this.duration) {
            this.alive = false;
            this.bulletManager.speedMultiplier = 1.0;
        }
    }

    checkCollision() {
        return false; // No damage
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.bulletManager.speedMultiplier = 1.0;
        this.alive = false;
    }
}

// ============================================================
// 9. Bouncing Projectiles - 5秒間弾とレーザーが壁で跳ね返る
// ============================================================
class BouncingProjectiles {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 5;
        this.age = 0;
        this.gimmickName = 'Bounce';
        this.hasCollision = false;

        // Activate bounce
        this.bulletManager.bounceEnabled = true;

        this.createIndicator();
    }

    createIndicator() {
        const geo = new THREE.BoxGeometry(
            this.bounds.x * 2 + 2,
            this.bounds.y * 2 + 2,
            this.bounds.z * 2 + 2
        );
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({
            color: settings.getHex('bounceColor'),
            transparent: true,
            opacity: 0.6
        });
        this.mesh = new THREE.LineSegments(edges, mat);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.age += deltaTime;

        const pulse = 0.3 + Math.sin(this.age * 4) * 0.3;
        this.mesh.material.opacity = pulse;

        if (this.age >= this.duration) {
            this.alive = false;
            this.bulletManager.bounceEnabled = false;
        }
    }

    checkCollision() {
        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.bulletManager.bounceEnabled = false;
        this.alive = false;
    }
}

// ============================================================
// 9.5. Zigzag Bullets - 5秒間弾がジグザグに動く
// ============================================================
class ZigzagBullets {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 5;
        this.age = 0;
        this.gimmickName = 'Zigzag';
        this.hasCollision = false;

        // Activate zigzag
        this.bulletManager.zigzagEnabled = true;

        this.createIndicator();
    }

    createIndicator() {
        const geo = new THREE.BoxGeometry(
            this.bounds.x * 2 + 2,
            this.bounds.y * 2 + 2,
            this.bounds.z * 2 + 2
        );
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({
            color: settings.getHex('zigzagColor'),
            transparent: true,
            opacity: 0.6
        });
        this.mesh = new THREE.LineSegments(edges, mat);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.age += deltaTime;

        const pulse = 0.3 + Math.sin(this.age * 8) * 0.3;
        this.mesh.material.opacity = pulse;

        if (this.age >= this.duration) {
            this.alive = false;
            this.bulletManager.zigzagEnabled = false;
        }
    }

    checkCollision() {
        return false;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.bulletManager.zigzagEnabled = false;
        this.alive = false;
    }
}

// ============================================================
// 10. Large Homing Bullet - 5秒間追尾する巨大弾
// ============================================================
class LargeHomingBullet {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;
        this.alive = true;
        this.duration = 5;
        this.age = 0;
        this.radius = 1.2; // 通常弾(0.3)の4倍相当だが、依頼通りさらに2倍にする
        this.speed = 20;
        this.gimmickName = 'Homing';
        this.baseColor = new THREE.Color(settings.getHex('largeHomingColor')); // 追記

        // Spawn at a random edge
        const side = Math.floor(Math.random() * 4);
        const b = bounds;
        switch(side) {
            case 0: this.position = new THREE.Vector3(b.x + 2, 0, (Math.random() - 0.5) * b.z); break;
            case 1: this.position = new THREE.Vector3(-b.x - 2, 0, (Math.random() - 0.5) * b.z); break;
            case 2: this.position = new THREE.Vector3((Math.random() - 0.5) * b.x, 0, b.z + 2); break;
            case 3: this.position = new THREE.Vector3((Math.random() - 0.5) * b.x, 0, -b.z - 2); break;
        }
        this.position.y = (Math.random() - 0.5) * b.y;
        
        this.velocity = new THREE.Vector3(0, 0, 0);

        this.createMesh();
    }

    createMesh() {
        const geo = new THREE.SphereGeometry(this.radius, 12, 8);
        const mat = new THREE.MeshBasicMaterial({
            color: settings.getHex('largeHomingColor'),
            transparent: true,
            opacity: 0.95
        });
        this.mesh = new THREE.Mesh(geo, mat);

        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(deltaTime, playerPos, boundsY) {
        this.age += deltaTime;

        this.hasCollision = true;

        if (playerPos) {
            const dir = playerPos.clone().sub(this.position).normalize();
            this.velocity.lerp(dir.multiplyScalar(this.speed), 4 * deltaTime);
        }

        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.copy(this.position);
        
        this.mesh.rotation.x += deltaTime * 4;
        this.mesh.rotation.y += deltaTime * 5;

        // Pulse + Height-based scaling
        let baseScale = 1.0 + Math.sin(this.age * 12) * 0.1;
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            baseScale *= (0.55 + normalizedHeight * 0.9);
        }
        this.mesh.scale.setScalar(baseScale);

        // Proximity color (distance + height difference)
        if (playerPos) {
            const dist3D = this.position.distanceTo(playerPos);
            const distY = Math.abs(this.position.y - playerPos.y);
            const proximityOpacity = THREE.MathUtils.clamp(1.0 - dist3D * 0.02 - distY * 0.05, 0.1, 0.95);
            this.mesh.material.opacity = proximityOpacity;
            
            // 明るくする
            const colorFactor = (1.0 - proximityOpacity) * 0.3;
            this.mesh.material.color.copy(this.baseColor).lerp(new THREE.Color(0xffffff), colorFactor);
        }

        if (this.age >= this.duration) {
            this.alive = false;
        }
    }

    checkCollision(playerPos, playerRadius) {
        const dist = playerPos.distanceTo(this.position);
        return dist < this.radius + playerRadius;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// ============================================================
// Gimmick Manager
// ============================================================
export class GimmickManager {
    constructor(scene, bounds, bulletManager) {
        this.scene = scene;
        this.bounds = bounds;
        this.bulletManager = bulletManager;

        this.activeGimmicks = [];
        this.warnings = [];
        this.walls = []; // Separate tracking for wall constraints
        this.mines = []; // Separate tracking for mine-bullet interaction
        this.activeModifier = null; // Track active modifier gimmick (speed/bounce)
        
        // Track the last gimmick to prevent consecutive same-location spawns
        this.lastGimmick = null; // { type: string, position: THREE.Vector3 }
    }

    spawnWarning(position, duration = 0.8) {
        const warning = new WarningIndicator(this.scene, position, duration);
        this.warnings.push(warning);
        return warning;
    }

    spawnGimmick(type) {
        let gimmick;
        let warningPos;
        let warningDuration = 0.8;
        playGimmickSound();

        switch (type) {
            case 'poison_fog':
                // Spawn 5 independent fog clouds
                for (let i = 0; i < 5; i++) {
                    const pos = new THREE.Vector3(
                        (Math.random() - 0.5) * this.bounds.x * 1.8,
                        (Math.random() - 0.5) * this.bounds.y,
                        (Math.random() - 0.5) * this.bounds.z * 1.8
                    );
                    const fogRadius = 10;
                    const warnRadius = fogRadius / 1.15;

                    // Custom warning for fog area
                    const warning = new WarningIndicator(this.scene, pos, warningDuration);
                    warning.mesh.scale.setScalar(warnRadius / 2); // Approximate visual scale
                    this.warnings.push(warning);

                    setTimeout(() => {
                        const fog = new PoisonFog(this.scene, this.bounds, pos, fogRadius);
                        this.activeGimmicks.push(fog);
                    }, warningDuration * 1000);
                }
                break;

            case 'giant_hand': {
                const hand = new GiantHand(this.scene, this.bounds);
                warningPos = hand.getWarningPosition();
                // Hand starts falling after warning
                hand.age = -warningDuration;
                hand.mesh.visible = false;
                setTimeout(() => { hand.mesh.visible = true; }, warningDuration * 1000);
                this.activeGimmicks.push(hand);
                break;
            }

            case 'rushing_car':
                warningPos = new THREE.Vector3(
                    (Math.random() - 0.5) * this.bounds.x,
                    0,
                    (Math.random() - 0.5) * this.bounds.z
                );
                setTimeout(() => {
                    const car = new RushingCar(
                        this.scene, this.bounds,
                        (pos, dur) => this.spawnWarning(pos, dur)
                    );
                    this.activeGimmicks.push(car);
                }, warningDuration * 1000);
                break;

            case 'enemy_shooter':
                const isCenter = Math.random() < 0.33;
                warningPos = isCenter ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(
                    (Math.random() > 0.5 ? 1 : -1) * (this.bounds.x - 3),
                    0,
                    (Math.random() > 0.5 ? 1 : -1) * (this.bounds.z - 3)
                );
                setTimeout(() => {
                    const enemy = new EnemyShooter(this.scene, this.bounds, this.bulletManager);
                    // Update enemy position to match warning
                    enemy.position.copy(warningPos);
                    enemy.mesh.position.copy(warningPos);
                    this.activeGimmicks.push(enemy);
                }, warningDuration * 1000);
                break;

            case 'mine':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    for (let i = 0; i < 3; i++) {
                        const mine = new Mine(this.scene, this.bounds, this.bulletManager);
                        this.activeGimmicks.push(mine);
                        this.mines.push(mine);
                    }
                }, warningDuration * 1000);
                break;

            case 'dividing_wall':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    const wall = new DividingWall(this.scene, this.bounds);
                    this.activeGimmicks.push(wall);
                    this.walls.push(wall);
                }, warningDuration * 1000);
                break;

            case 'fruit_tree':
                warningPos = new THREE.Vector3(
                    (Math.random() - 0.5) * this.bounds.x,
                    this.bounds.y - 2,
                    (Math.random() - 0.5) * this.bounds.z
                );
                setTimeout(() => {
                    const tree = new FruitTree(this.scene, this.bounds);
                    this.activeGimmicks.push(tree);
                }, warningDuration * 1000);
                break;

            case 'bullet_speed':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    const speed = new BulletSpeedUp(this.scene, this.bounds, this.bulletManager);
                    this.activeGimmicks.push(speed);
                    this.activeModifier = speed;
                }, warningDuration * 1000);
                break;

            case 'bouncing':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    const bounce = new BouncingProjectiles(this.scene, this.bounds, this.bulletManager);
                    this.activeGimmicks.push(bounce);
                    this.activeModifier = bounce;
                }, warningDuration * 1000);
                break;

            case 'zigzag':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    const zigzag = new ZigzagBullets(this.scene, this.bounds, this.bulletManager);
                    this.activeGimmicks.push(zigzag);
                    this.activeModifier = zigzag;
                }, warningDuration * 1000);
                break;
            case 'homing_bullet':
                warningPos = new THREE.Vector3(0, 0, 0);
                setTimeout(() => {
                    const homing = new LargeHomingBullet(this.scene, this.bounds, this.bulletManager);
                    this.activeGimmicks.push(homing);
                }, warningDuration * 1000);
                break;
        }

        if (warningPos) {
            // Check if this is the same type as the last gimmick and too close
            if (this.lastGimmick && this.lastGimmick.type === type) {
                const minDistanceSq = 15 * 15; // 15 units minimum distance
                if (warningPos.distanceToSquared(this.lastGimmick.position) < minDistanceSq) {
                    // Try to generate a new position by just randomly shifting it
                    // This is a simple fallback. A robust solution would be to wrap the case statements in a retry loop.
                    warningPos.x = (Math.random() > 0.5 ? 1 : -1) * (this.bounds.x * Math.random());
                    warningPos.z = (Math.random() > 0.5 ? 1 : -1) * (this.bounds.z * Math.random());
                    
                    // Keep within bounds roughly
                    warningPos.x = THREE.MathUtils.clamp(warningPos.x, -this.bounds.x + 2, this.bounds.x - 2);
                    warningPos.z = THREE.MathUtils.clamp(warningPos.z, -this.bounds.z + 2, this.bounds.z - 2);
                }
            }

            this.spawnWarning(warningPos, warningDuration);
            
            // Record last gimmick
            this.lastGimmick = { type: type, position: warningPos.clone() };
        }
    }

    spawnRandomGimmick() {
        // Check if a modifier is already active
        const hasActiveModifier = this.activeModifier && this.activeModifier.alive;

        const baseTypes = [
            'poison_fog', 'giant_hand', 'rushing_car',
            'enemy_shooter', 'mine', 'dividing_wall', 'fruit_tree', 'homing_bullet'
        ];

        // Always allow base gimmicks. Only prevent modifier stacking.
        let types = [...baseTypes];
        if (!hasActiveModifier) {
            types.push('bullet_speed', 'bouncing', 'zigzag');
        }

        // Prevent same gimmick from spawning consecutively
        if (this.lastGimmick && this.lastGimmick.type) {
            types = types.filter(t => t !== this.lastGimmick.type);
        }

        const type = types[Math.floor(Math.random() * types.length)];
        this.spawnGimmick(type);
    }

    update(deltaTime, playerPos, playerRadius, cameraPos, boundsY) {
        // Update warnings
        for (let i = this.warnings.length - 1; i >= 0; i--) {
            this.warnings[i].update(deltaTime, boundsY);
            if (!this.warnings[i].alive) {
                this.warnings[i].destroy();
                this.warnings.splice(i, 1);
            }
        }

        // Update active gimmicks
        for (let i = this.activeGimmicks.length - 1; i >= 0; i--) {
            const g = this.activeGimmicks[i];
            
            // Handle different update signatures
            if (g instanceof EnemyShooter || g instanceof LargeHomingBullet) {
                g.update(deltaTime, playerPos, boundsY);
            } else if (g instanceof PoisonFog) {
                g.update(deltaTime, playerPos, boundsY);
            } else {
                g.update(deltaTime, boundsY);
            }

            if (!g.alive) {
                g.destroy();
                this.activeGimmicks.splice(i, 1);
            }
        }

        // Clean up dead mines/walls references
        this.mines = this.mines.filter(m => m.alive);
        this.walls = this.walls.filter(w => w.alive);

        // Check mine-bullet interactions
        this.checkMineBulletCollisions(playerPos, playerRadius);
    }

    checkMineBulletCollisions(playerPos, playerRadius) {
        const allProjectiles = this.bulletManager.getAllProjectiles();
        const lasers = this.bulletManager.getLasers();

        for (const mine of this.mines) {
            if (mine.triggered) continue;

            // Check bullets
            for (const bullet of allProjectiles) {
                if (mine.checkBulletHit(bullet.position, bullet.radius)) {
                    mine.trigger();
                    break;
                }
            }

            // Check lasers
            if (!mine.triggered) {
                for (const laser of lasers) {
                    if (laser.checkCollision(mine.position, mine.radius)) {
                        mine.trigger();
                        break;
                    }
                }
            }

            // Check player collision
            if (!mine.triggered && playerPos) {
                if (mine.checkPlayerHit(playerPos, playerRadius)) {
                    mine.trigger();
                }
            }
        }
    }

    // Constrain player position based on walls
    constrainPlayerPosition(playerPos, playerRadius) {
        let pos = playerPos;
        for (const wall of this.walls) {
            pos = wall.constrainPlayer(pos, playerRadius);
        }
        return pos;
    }

    checkCollision(playerPos, playerRadius) {
        for (const g of this.activeGimmicks) {
            if (g.checkCollision && g.checkCollision(playerPos, playerRadius)) {
                return g.gimmickName || 'ギミック';
            }
        }
        return null;
    }

    clear() {
        for (const w of this.warnings) { w.destroy(); }
        for (const g of this.activeGimmicks) { g.destroy(); }
        this.warnings = [];
        this.activeGimmicks = [];
        this.mines = [];
        this.walls = [];
        this.activeModifier = null;
    }
}
