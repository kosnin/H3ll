// Effects module - death explosion, particles
import * as THREE from 'three';

class Particle {
    constructor(scene, position, velocity, color, size, lifetime) {
        this.scene = scene;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.lifetime = lifetime;
        this.age = 0;
        this.alive = true;

        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        this.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );

        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.alive = false;
            return;
        }

        this.velocity.y -= 15 * deltaTime;
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.copy(this.position);

        this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
        this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
        this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;

        const lifeRatio = 1 - (this.age / this.lifetime);
        this.mesh.material.opacity = lifeRatio;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}

// Explosion sphere effect
class ExplosionEffect {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.age = 0;
        this.lifetime = 0.8;
        this.alive = true;

        // Core flash
        const coreGeo = new THREE.SphereGeometry(1, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.core.position.copy(position);
        this.scene.add(this.core);

        // Outer ring
        const ringGeo = new THREE.RingGeometry(0.5, 2, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.ring = new THREE.Mesh(ringGeo, ringMat);
        this.ring.position.copy(position);
        this.scene.add(this.ring);

        // Shockwave ring
        const shockGeo = new THREE.TorusGeometry(1, 0.2, 8, 32);
        const shockMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.6
        });
        this.shockwave = new THREE.Mesh(shockGeo, shockMat);
        this.shockwave.position.copy(position);
        this.shockwave.rotation.x = Math.PI / 2;
        this.scene.add(this.shockwave);
    }

    update(deltaTime) {
        this.age += deltaTime;

        if (this.age >= this.lifetime) {
            this.alive = false;
            return;
        }

        const t = this.age / this.lifetime;

        // Core shrinks and fades
        this.core.scale.setScalar(1 + t * 3);
        this.core.material.opacity = Math.max(0, 1 - t * 2);

        // Ring expands
        this.ring.scale.setScalar(1 + t * 5);
        this.ring.material.opacity = Math.max(0, 0.8 - t);

        // Shockwave expands fast
        this.shockwave.scale.setScalar(1 + t * 8);
        this.shockwave.material.opacity = Math.max(0, 0.6 - t * 0.8);
    }

    destroy() {
        this.scene.remove(this.core);
        this.scene.remove(this.ring);
        this.scene.remove(this.shockwave);
    }
}

export class EffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.effects = [];
    }

    // Spawn explosion particles
    spawnExplosion(position, count = 80) {
        const colors = [0xff3300, 0xff6600, 0xffaa00, 0xffffff, 0xff0000];

        for (let i = 0; i < count; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                Math.random() * 20 + 5,
                (Math.random() - 0.5) * 25
            );

            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 0.2 + Math.random() * 0.5;
            const lifetime = 0.8 + Math.random() * 0.8;

            const particle = new Particle(
                this.scene, position, velocity, color, size, lifetime
            );
            this.particles.push(particle);
        }
    }

    // Death effect - big explosion
    spawnDeathEffect(position) {
        this.spawnExplosion(position, 120);
        const explosion = new ExplosionEffect(this.scene, position);
        this.effects.push(explosion);
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (!this.particles[i].alive) {
                this.particles[i].destroy();
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
            this.effects[i].update(deltaTime);
            if (!this.effects[i].alive) {
                this.effects[i].destroy();
                this.effects.splice(i, 1);
            }
        }
    }

    clear() {
        this.particles.forEach(p => p.destroy());
        this.effects.forEach(e => e.destroy());
        this.particles = [];
        this.effects = [];
    }
}
