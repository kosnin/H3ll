// Collision detection module
import * as THREE from 'three';

export class CollisionSystem {
    constructor() {
        this.tempVec = new THREE.Vector3();
    }

    // Sphere vs Sphere collision
    checkSphereCollision(pos1, radius1, pos2, radius2) {
        const distance = pos1.distanceTo(pos2);
        return distance < (radius1 + radius2);
    }

    // Check player against all hazards
    checkPlayerCollisions(player, bulletManager, gimmickManager) {
        const playerPos = player.getPosition();
        const playerRadius = player.getRadius();

        // Check against regular bullets
        const projectiles = bulletManager.getAllProjectiles();
        for (const projectile of projectiles) {
            if (this.checkSphereCollision(
                playerPos, playerRadius,
                projectile.position, projectile.radius
            )) {
                return { hit: true, type: 'bullet', killerName: 'Bullet', position: projectile.position.clone() };
            }
        }

        // Check against lasers
        const lasers = bulletManager.getLasers();
        for (const laser of lasers) {
            if (laser.checkCollision(playerPos, playerRadius)) {
                return { hit: true, type: 'laser', killerName: 'Laser', position: playerPos.clone() };
            }
        }

        // Check against gimmicks
        if (gimmickManager) {
            const gimmickHit = gimmickManager.checkCollision(playerPos, playerRadius);
            if (gimmickHit) {
                return { hit: true, type: 'gimmick', killerName: gimmickHit, position: playerPos.clone() };
            }
        }

        return { hit: false };
    }
}
