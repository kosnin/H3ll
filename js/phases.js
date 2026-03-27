// Phases module - continuous bullet/laser attacks + 5-second gimmick cycle
import * as THREE from 'three';

export class PhaseManager {
    constructor(bulletManager, gimmickManager, bounds) {
        this.bulletManager = bulletManager;
        this.gimmickManager = gimmickManager;
        this.bounds = bounds;

        // Spawn timers
        this.bulletTimer = 0;
        this.laserTimer = 0;
        this.gimmickTimer = 0;
        this.ringTimer = 0;

        this.gimmickInterval = 5; // Gimmick every 5 seconds
    }

    update(deltaTime, gameTime, playerPos) {
        this.bulletTimer += deltaTime;
        this.laserTimer += deltaTime;
        this.gimmickTimer += deltaTime;
        this.ringTimer += deltaTime;

        // Difficulty scales with time
        const difficulty = Math.min(gameTime / 60, 1); // 0 to 1 over 60 seconds

        // === Continuous bullet attacks ===
        const bulletInterval = Math.max(0.3, 1.2 - difficulty * 0.9); // Spawn more frequently
        if (this.bulletTimer > bulletInterval) {
            this.bulletTimer = 0;
            this.spawnBulletAttack(playerPos, difficulty);
        }

        // === Continuous laser attacks ===
        const laserInterval = Math.max(2, 4 - difficulty * 2);
        if (this.laserTimer > laserInterval) {
            this.laserTimer = 0;
            this.spawnLaserAttack(playerPos, difficulty);
        }

        // === Gimmick every 5 seconds ===
        if (this.gimmickTimer >= this.gimmickInterval) {
            this.gimmickTimer = 0;
            this.gimmickManager.spawnRandomGimmick();
        }
    }

    spawnBulletAttack(playerPos, difficulty) {
        // Surround the player from all directions (omnidirectional spherical distribution)
        const numSources = 12 + Math.floor(difficulty * 8); // Increased from 8-14 to 12-20 sources to compensate for missing yellow bullets
        const countPerSource = Math.max(1, Math.floor((4 + difficulty * 5) / numSources * 3)); // Slightly more bullets per source
        const speed = 10 + difficulty * 6;
        const spread = 0.4 - difficulty * 0.15;

        for (let i = 0; i < numSources; i++) {
            const spawnPos = (i < numSources / 3)
                ? this.getRandomEdgePosition()
                : this.getRandomOmnidirectionalPosition(playerPos);
            this.bulletManager.spawnAimedBurst(spawnPos, playerPos, Math.max(2, countPerSource), speed, spread);
        }
    }

    spawnLaserAttack(playerPos, difficulty) {
        const duration = 0.5 + difficulty * 0.3;

        // Fire lasers from edge to edge of the stage
        const laserCount = 5 + Math.floor(difficulty * 5);
        for (let i = 0; i < laserCount; i++) {
            const start = this.getRandomEdgePosition();
            
            // End point: extend through player area to the opposite edge
            const direction = playerPos.clone().sub(start);
            // Add some randomness to avoid all lasers converging on exact player pos
            direction.x += (Math.random() - 0.5) * (8 + i * 2);
            direction.y += (Math.random() - 0.5) * (8 + i * 2);
            direction.z += (Math.random() - 0.5) * (8 + i * 2);
            direction.normalize();

            // Extend the laser far enough to reach the opposite edge
            const maxDist = Math.sqrt(
                (this.bounds.x * 2) ** 2 + 
                (this.bounds.y * 2) ** 2 + 
                (this.bounds.z * 2) ** 2
            ) + 10;
            const end = start.clone().add(direction.multiplyScalar(maxDist));
            
            this.bulletManager.spawnLaser(start, end, duration, 0.8);
        }
    }

    spawnRingAttack(playerPos, difficulty) {
        const center = this.getRandomEdgePosition();
        const axis = playerPos.clone().sub(center).normalize();
        const count = Math.floor((8 + difficulty * 6) * 1.4);
        const speed = 8 + difficulty * 4;

        this.bulletManager.spawnRing(center, axis, count, speed);
    }

    getRandomEdgePosition() {
        const side = Math.floor(Math.random() * 6);
        const pos = new THREE.Vector3();

        switch (side) {
            case 0:
                pos.set(this.bounds.x + 5, (Math.random() - 0.5) * this.bounds.y * 2, (Math.random() - 0.5) * this.bounds.z * 2);
                break;
            case 1:
                pos.set(-this.bounds.x - 5, (Math.random() - 0.5) * this.bounds.y * 2, (Math.random() - 0.5) * this.bounds.z * 2);
                break;
            case 2:
                pos.set((Math.random() - 0.5) * this.bounds.x * 2, this.bounds.y + 5, (Math.random() - 0.5) * this.bounds.z * 2);
                break;
            case 3:
                pos.set((Math.random() - 0.5) * this.bounds.x * 2, -this.bounds.y - 5, (Math.random() - 0.5) * this.bounds.z * 2);
                break;
            case 4:
                pos.set((Math.random() - 0.5) * this.bounds.x * 2, (Math.random() - 0.5) * this.bounds.y * 2, this.bounds.z + 5);
                break;
            case 5:
                pos.set((Math.random() - 0.5) * this.bounds.x * 2, (Math.random() - 0.5) * this.bounds.y * 2, -this.bounds.z - 5);
                break;
        }

        return pos;
    }

    getRandomOmnidirectionalPosition(playerPos) {
        // Random direction in 3D sphere using spherical coordinates
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        
        // Spawn distance large enough to be outside the immediate bounds
        const r = Math.max(this.bounds.x, this.bounds.y, this.bounds.z) + 15;
        
        const sinPhi = Math.sin(phi);
        const dir = new THREE.Vector3(
            r * sinPhi * Math.cos(theta),
            r * sinPhi * Math.sin(theta),
            r * Math.cos(phi)
        );
        
        const pos = playerPos.clone().add(dir);
        
        // Clamp to a box slightly larger than play bounds to ensure they are off-screen but not infinitely far
        pos.x = THREE.MathUtils.clamp(pos.x, -this.bounds.x - 10, this.bounds.x + 10);
        pos.y = THREE.MathUtils.clamp(pos.y, -this.bounds.y - 10, this.bounds.y + 10);
        pos.z = THREE.MathUtils.clamp(pos.z, -this.bounds.z - 10, this.bounds.z + 10);
        
        return pos;
    }

    reset() {
        this.bulletTimer = 0;
        this.laserTimer = 0;
        this.gimmickTimer = 0;
        this.ringTimer = 0;
    }
}
