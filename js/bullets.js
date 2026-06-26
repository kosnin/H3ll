// Bullets module - handles all projectile types and patterns
import * as THREE from 'three';
import { playLaserSound } from './audio.js';
import settings from './settings.js';

// Base Bullet class
class Bullet {
    constructor(scene, position, velocity, radius = 0.3, color = null) {
        if (color === null) color = settings.getHex('bulletColor');
        this.scene = scene;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.radius = radius;
        this.alive = true;
        this.maxDistance = 100;
        this.startPosition = position.clone();
        this.bounceCount = 0;
        this.maxBounces = 3;

        this.baseColor = new THREE.Color(color);
        this.createMesh(color);
    }

    createMesh(color) {
        // Original sphere
        const geometry = new THREE.SphereGeometry(this.radius, 6, 4);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        // Arrowhead/Hood shape
        const createArcShape = (r) => {
            const shape = new THREE.Shape();
            const hx = r * 1.8; // half width (横幅を広げた)
            const ty = r * 1.6; // top y (tip)
            const by = r * 0.2; // bottom y (tails)
            
            // 線幅・厚み（thickness）を増やして「太く」した
            const thickness = r * 0.4; 
            const innerTy = r * 1.2; 
            
            shape.moveTo(0, ty);
            // 右外側
            shape.lineTo(hx, by);
            // 右末端
            shape.lineTo(hx - thickness, by);
            // 内側の切り込み
            shape.lineTo(0, innerTy);
            // 左末端（内側）
            shape.lineTo(-(hx - thickness), by);
            // 左末端
            shape.lineTo(-hx, by);
            // 先端へ戻る
            shape.lineTo(0, ty);
            
            return shape;
        };

        const hoodShape = createArcShape(this.radius);
        // Add high curveSegments (32) to fix potential asymmetric triangulation/tessellation artifacts
        const hoodGeo = new THREE.ShapeGeometry(hoodShape, 32);

        // Calculate complementary color (shift Hue by 180 degrees)
        const baseColor = new THREE.Color(color);
        const hsl = {};
        baseColor.getHSL(hsl);
        const compColor = new THREE.Color().setHSL((hsl.h + 0.5) % 1.0, hsl.s, hsl.l);

        // Arrowhead material (complementary color)
        const hoodMat = new THREE.MeshBasicMaterial({
            color: compColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        this.hoodMat = hoodMat; // 保持しておく

        const arrowMesh = new THREE.Mesh(hoodGeo, hoodMat);
        // Position at the center so the inner curve precisely wraps the sphere
        arrowMesh.position.set(0, 0, 0);
        // Rotate so +Y (the tip) points forward in the direction of movement.
        // We flip it to Math.PI / 2 to correct the backwards pointing issue.
        arrowMesh.rotation.x = Math.PI / 2;

        this.mesh.add(arrowMesh);

        this.scene.add(this.mesh);
    }

    update(deltaTime, bounds, bounceEnabled, zigzagEnabled, playerPos, boundsY) {
        // Zigzag: add periodic lateral offset to velocity
        if (zigzagEnabled) {
            const time = Date.now() * 0.005;
            const speed = this.velocity.length();
            const amplitude = speed * 3;
            const freq = 0.8;
            const right = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();
            const zigzagOffset = right.multiplyScalar(Math.sin(time * freq + this.startPosition.x * 3) * amplitude * deltaTime);
            this.position.add(zigzagOffset);
        }

        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.copy(this.position);

        // === Height-based Scaling ===
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            const heightScale = 0.55 + normalizedHeight * 0.9;
            this.mesh.scale.setScalar(heightScale);
        }

        // === Proximity Color (自機から遠い・高さが違うほど薄く) ===
        if (playerPos) {
            const dist3D = this.position.distanceTo(playerPos);
            const distY = Math.abs(this.position.y - playerPos.y);
            // 距離だけでなく高さの差も考慮して不透明度を調整
            const proximityOpacity = THREE.MathUtils.clamp(1.0 - dist3D * 0.02 - distY * 0.05, 0.1, 0.95);
            this.mesh.material.opacity = proximityOpacity;
            
            // 薄いもの程、色を明るく（白っぽく）する
            const colorFactor = (1.0 - proximityOpacity) * 0.3;
            this.mesh.material.color.copy(this.baseColor).lerp(new THREE.Color(0xffffff), colorFactor);
            
            // 矢印パーツも薄くする
            if (this.hoodMat) this.hoodMat.opacity = proximityOpacity;
        }

        // Orient the mesh to face the direction of travel
        if (this.velocity.lengthSq() > 0.01) {
            const lookTarget = this.position.clone().add(this.velocity);
            this.mesh.lookAt(lookTarget);
        }

        // Bounce off bounds if enabled
        if (bounceEnabled && bounds && this.bounceCount < this.maxBounces) {
            let bounced = false;
            if (Math.abs(this.position.x) > bounds.x) {
                this.velocity.x *= -1;
                this.position.x = Math.sign(this.position.x) * bounds.x;
                bounced = true;
            }
            if (Math.abs(this.position.y) > bounds.y) {
                this.velocity.y *= -1;
                this.position.y = Math.sign(this.position.y) * bounds.y;
                bounced = true;
            }
            if (Math.abs(this.position.z) > bounds.z) {
                this.velocity.z *= -1;
                this.position.z = Math.sign(this.position.z) * bounds.z;
                bounced = true;
            }
            if (bounced) {
                this.bounceCount++;
                this.startPosition.copy(this.position);
            }
        }

        // Out-of-bounds check
        if (bounds && !bounceEnabled) {
            const margin = 15;
            if (Math.abs(this.position.x) > bounds.x + margin ||
                Math.abs(this.position.y) > bounds.y + margin ||
                Math.abs(this.position.z) > bounds.z + margin) {
                this.alive = false;
                return;
            }
        }

        if (this.position.distanceTo(this.startPosition) > this.maxDistance) {
            this.alive = false;
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// Homing Bullet - tracks player
class HomingBullet extends Bullet {
    constructor(scene, position, target, speed = 8) {
        super(scene, position, new THREE.Vector3(), 0.4, settings.getHex('homingBulletColor'));
        this.target = target;
        this.speed = speed;
        this.turnSpeed = 2;
        this.lifetime = 8;
        this.age = 0;
    }

    update(deltaTime, playerPosition, boundsY) {
        this.age += deltaTime;

        if (this.age > this.lifetime) {
            this.alive = false;
            return;
        }

        const direction = playerPosition.clone().sub(this.position).normalize();
        this.velocity.lerp(direction.multiplyScalar(this.speed), this.turnSpeed * deltaTime);

        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.copy(this.position);

        // Height-based scaling
        let heightScale = 1.0;
        if (boundsY) {
            const normalizedHeight = (this.position.y + boundsY) / (2 * boundsY);
            heightScale = 0.55 + normalizedHeight * 0.9;
        }

        const pulse = (1 + Math.sin(this.age * 10) * 0.2) * heightScale;
        this.mesh.scale.setScalar(pulse);

        // Proximity color (distance + height difference)
        if (playerPosition) {
            const dist3D = this.position.distanceTo(playerPosition);
            const distY = Math.abs(this.position.y - playerPosition.y);
            const proximityOpacity = THREE.MathUtils.clamp(1.0 - dist3D * 0.02 - distY * 0.05, 0.1, 0.95);
            this.mesh.material.opacity = proximityOpacity;
            
            // 明るくする
            const colorFactor = (1.0 - proximityOpacity) * 0.3;
            this.mesh.material.color.copy(this.baseColor).lerp(new THREE.Color(0xffffff), colorFactor);
        }
    }
}

// Laser Warning - thin preview line with no collision
class LaserWarning {
    constructor(scene, start, end, warningDuration, onComplete) {
        this.scene = scene;
        this.alive = true;
        this.warningDuration = warningDuration;
        this.age = 0;
        this.start = start.clone();
        this.end = end.clone();
        this.onComplete = onComplete;

        this.createMesh();
    }

    createMesh() {
        const direction = this.end.clone().sub(this.start);
        const length = direction.length();

        const geometry = new THREE.CylinderGeometry(0.15, 0.15, length, 6);
        const material = new THREE.MeshBasicMaterial({
            color: settings.getHex('laserWarningColor'),
            transparent: true,
            opacity: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);

        const midpoint = this.start.clone().add(this.end).multiplyScalar(0.5);
        this.mesh.position.copy(midpoint);

        this.mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.age += deltaTime;

        const pulse = Math.sin(this.age * 15) * 0.5 + 0.5;
        this.mesh.material.opacity = 0.15 + pulse * 0.35;

        if (this.age > this.warningDuration) {
            this.alive = false;
            if (this.onComplete) {
                this.onComplete();
            }
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// Laser - instant line attack
class Laser {
    constructor(scene, start, end, duration = 0.5) {
        this.scene = scene;
        this.alive = true;
        this.duration = duration;
        this.age = 0;
        this.start = start.clone();
        this.end = end.clone();
        this.radius = 0.8;

        this.baseColor = new THREE.Color(settings.getHex('laserColor'));
        this.createMesh();
    }

    createMesh() {
        const direction = this.end.clone().sub(this.start);
        const length = direction.length();

        const geometry = new THREE.CylinderGeometry(this.radius, this.radius, length, 8);
        const material = new THREE.MeshBasicMaterial({
            color: settings.getHex('laserColor'),
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);

        const midpoint = this.start.clone().add(this.end).multiplyScalar(0.5);
        this.mesh.position.copy(midpoint);

        this.mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        // Glow outline
        const glowGeo = new THREE.CylinderGeometry(this.radius * 1.5, this.radius * 1.5, length, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('laserGlowColor'),
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.mesh.add(this.glow);

        this.scene.add(this.mesh);
    }

    update(deltaTime, playerPos, boundsY) {
        this.age += deltaTime;

        // Height-based scaling for laser thickness
        if (boundsY) {
            const midpoint = this.start.clone().add(this.end).multiplyScalar(0.5);
            const normalizedHeight = (midpoint.y + boundsY) / (2 * boundsY);
            const heightScale = 0.55 + normalizedHeight * 0.9;
            this.mesh.scale.set(heightScale, 1.0, heightScale);
        }

        // Proximity color for laser (distance + height difference)
        if (playerPos) {
            const midpoint = this.start.clone().add(this.end).multiplyScalar(0.5);
            const dist3D = midpoint.distanceTo(playerPos);
            const distY = Math.abs(midpoint.y - playerPos.y);
            const proximityOpacity = THREE.MathUtils.clamp(1.0 - dist3D * 0.02 - distY * 0.05, 0.15, 0.9);
            this.mesh.material.opacity = 0.2 + Math.random() * 0.2 + proximityOpacity * 0.5;
            
            // 明るくする
            const colorFactor = (1.0 - proximityOpacity) * 0.3;
            this.mesh.material.color.copy(this.baseColor).lerp(new THREE.Color(0xffffff), colorFactor);
        } else {
            this.mesh.material.opacity = 0.5 + Math.random() * 0.3;
        }

        if (this.age > this.duration) {
            this.alive = false;
        }
    }

    checkCollision(point, radius) {
        const lineVec = this.end.clone().sub(this.start);
        const pointVec = point.clone().sub(this.start);

        const t = Math.max(0, Math.min(1, pointVec.dot(lineVec) / lineVec.lengthSq()));
        const closestPoint = this.start.clone().add(lineVec.multiplyScalar(t));

        const distance = point.distanceTo(closestPoint);
        return distance < (this.radius + radius);
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.alive = false;
    }
}

// Bullet Manager
export class BulletManager {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        this.homingBullets = [];
        this.lasers = [];
        this.laserWarnings = [];

        // Modifier flags (controlled by gimmicks)
        this.speedMultiplier = 1.0;
        this.bounceEnabled = false;
        this.zigzagEnabled = false;
        this.bounds = null; // Set by main game
    }

    calculateLaserPaths(start, end) {
        const paths = [];
        let currentStart = start.clone();
        const totalVec = end.clone().sub(start);
        let remainingLength = totalVec.length();
        let direction = totalVec.normalize();
        let bouncesLeft = this.bounceEnabled ? 1 : 0;
        const bounds = this.bounds;

        while (remainingLength > 0) {
            let hitDist = Infinity;
            let normal = null;

            if (bounds && bouncesLeft > 0) {
                // Ray-AABB intersection
                const invDir = new THREE.Vector3(
                    direction.x !== 0 ? 1 / direction.x : 0,
                    direction.y !== 0 ? 1 / direction.y : 0,
                    direction.z !== 0 ? 1 / direction.z : 0
                );

                const tx1 = (-bounds.x - currentStart.x) * invDir.x;
                const tx2 = (bounds.x - currentStart.x) * invDir.x;
                const tminX = Math.min(tx1, tx2);
                const tmaxX = Math.max(tx1, tx2);

                const ty1 = (-bounds.y - currentStart.y) * invDir.y;
                const ty2 = (bounds.y - currentStart.y) * invDir.y;
                const tminY = Math.min(ty1, ty2);
                const tmaxY = Math.max(ty1, ty2);

                const tz1 = (-bounds.z - currentStart.z) * invDir.z;
                const tz2 = (bounds.z - currentStart.z) * invDir.z;
                const tminZ = Math.min(tz1, tz2);
                const tmaxZ = Math.max(tz1, tz2);

                const tmin = Math.max(Math.max(tminX, tminY), tminZ);
                const tmax = Math.min(Math.min(tmaxX, tmaxY), tmaxZ);

                if (tmax >= tmin && tmin > 0.01 && tmin < remainingLength) {
                    hitDist = tmin;
                    // Determine normal based on the intersected face
                    // Use a small epsilon to handle floating point issues
                    const eps = 0.01;
                    const hitPt = currentStart.clone().add(direction.clone().multiplyScalar(tmin));
                    if (Math.abs(Math.abs(hitPt.x) - bounds.x) < eps) {
                        normal = new THREE.Vector3(-Math.sign(hitPt.x), 0, 0);
                    } else if (Math.abs(Math.abs(hitPt.y) - bounds.y) < eps) {
                        normal = new THREE.Vector3(0, -Math.sign(hitPt.y), 0);
                    } else {
                        normal = new THREE.Vector3(0, 0, -Math.sign(hitPt.z));
                    }
                }
            }

            if (hitDist < remainingLength) {
                // Hit a wall
                const currentEnd = currentStart.clone().add(direction.clone().multiplyScalar(hitDist));
                paths.push({ start: currentStart, end: currentEnd });

                remainingLength -= hitDist;
                currentStart = currentEnd.clone();
                direction.reflect(normal);
                bouncesLeft--;
            } else {
                // No hit, reach end
                const currentEnd = currentStart.clone().add(direction.clone().multiplyScalar(remainingLength));
                paths.push({ start: currentStart, end: currentEnd });
                remainingLength = 0;
            }
        }
        return paths;
    }

    spawnBullet(position, velocity, radius = 0.3, color = null) {
        if (color === null) color = settings.getHex('bulletColor');
        const scaledVelocity = velocity.clone().multiplyScalar(this.speedMultiplier);
        const bullet = new Bullet(this.scene, position, scaledVelocity, radius, color);
        this.bullets.push(bullet);
        return bullet;
    }

    spawnHomingBullet(position, speed = 8) {
        const bullet = new HomingBullet(this.scene, position, null, speed);
        this.homingBullets.push(bullet);
        return bullet;
    }

    spawnLaser(start, end, duration = 0.5, warningDuration = 0.8) {
        const paths = this.calculateLaserPaths(start, end);
        const warnings = [];

        for (const path of paths) {
            const warning = new LaserWarning(
                this.scene,
                path.start,
                path.end,
                warningDuration,
                () => {
                    const laser = new Laser(this.scene, path.start, path.end, duration);
                    this.lasers.push(laser);
                    playLaserSound();
                }
            );
            this.laserWarnings.push(warning);
            warnings.push(warning);
        }
        return warnings;
    }

    spawnLaserImmediate(start, end, duration = 0.5) {
        const paths = this.calculateLaserPaths(start, end);
        const lasers = [];

        for (const path of paths) {
            const laser = new Laser(this.scene, path.start, path.end, duration);
            this.lasers.push(laser);
            lasers.push(laser);
        }
        if (lasers.length > 0) playLaserSound();
        return lasers;
    }

    spawnSphereBurst(center, count = 20, speed = 10, radius = 0.25) {
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ).multiplyScalar(speed);

            this.spawnBullet(center.clone(), velocity, radius, settings.getHex('bulletColor'));
        }
    }

    spawnAimedBurst(origin, target, count = 8, speed = 12, spread = 0.3) {
        const baseDirection = target.clone().sub(origin).normalize();

        for (let i = 0; i < count; i++) {
            const direction = baseDirection.clone();
            direction.x += (Math.random() - 0.5) * spread;
            direction.y += (Math.random() - 0.5) * spread;
            direction.z += (Math.random() - 0.5) * spread;
            direction.normalize();

            const velocity = direction.multiplyScalar(speed);
            this.spawnBullet(origin.clone(), velocity, 0.3, settings.getHex('homingBulletColor'));
        }
    }

    spawnRing(center, axis, count = 12, speed = 8, radius = 0.25) {
        const perpendicular = new THREE.Vector3(1, 0, 0);
        if (Math.abs(axis.dot(perpendicular)) > 0.9) {
            perpendicular.set(0, 1, 0);
        }

        const u = new THREE.Vector3().crossVectors(axis, perpendicular).normalize();
        const v = new THREE.Vector3().crossVectors(axis, u).normalize();

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const direction = u.clone().multiplyScalar(Math.cos(angle))
                .add(v.clone().multiplyScalar(Math.sin(angle)));

            const velocity = direction.multiplyScalar(speed);
            this.spawnBullet(center.clone(), velocity, radius, settings.getHex('laserColor'));
        }
    }

    update(deltaTime, playerPosition, cameraPos, boundsY) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update(deltaTime, this.bounds, this.bounceEnabled, this.zigzagEnabled, playerPosition, boundsY);
            if (!this.bullets[i].alive) {
                this.bullets[i].destroy();
                this.bullets.splice(i, 1);
            }
        }

        for (let i = this.homingBullets.length - 1; i >= 0; i--) {
            this.homingBullets[i].update(deltaTime, playerPosition, boundsY);
            if (!this.homingBullets[i].alive) {
                this.homingBullets[i].destroy();
                this.homingBullets.splice(i, 1);
            }
        }

        for (let i = this.laserWarnings.length - 1; i >= 0; i--) {
            this.laserWarnings[i].update(deltaTime);
            if (!this.laserWarnings[i].alive) {
                this.laserWarnings[i].destroy();
                this.laserWarnings.splice(i, 1);
            }
        }

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update(deltaTime, playerPosition, boundsY);
            if (!this.lasers[i].alive) {
                this.lasers[i].destroy();
                this.lasers.splice(i, 1);
            }
        }
    }

    getAllProjectiles() {
        return [...this.bullets, ...this.homingBullets];
    }

    getLasers() {
        return this.lasers;
    }

    clear() {
        this.bullets.forEach(b => b.destroy());
        this.homingBullets.forEach(b => b.destroy());
        this.lasers.forEach(l => l.destroy());
        this.laserWarnings.forEach(w => w.destroy());
        this.bullets = [];
        this.homingBullets = [];
        this.lasers = [];
        this.laserWarnings = [];
    }
}
