// Player module - handles player movement and rendering
import * as THREE from 'three';
import settings from './settings.js';

export class Player {
    constructor(scene, bounds) {
        this.scene = scene;
        this.bounds = bounds;
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speed = 20;
        this.verticalSpeed = 12;
        this.radius = 0.5;

        // Mouse-based movement
        this.targetPosition = new THREE.Vector3(0, 0, 0);
        this.mousePos = { x: 0, y: 0 }; // Normalized -1 to 1
        this.verticalInput = 0; // -1 (down), 0 (none), 1 (up)

        // Reference to camera theta for directional movement
        this.cameraTheta = 0;

        this.createMesh();
    }

    createMesh() {
        // Simple player sphere with outline
        const geometry = new THREE.SphereGeometry(this.radius, 8, 6);

        const material = new THREE.MeshBasicMaterial({
            color: settings.getHex('playerColor'),
            wireframe: false
        });

        this.mesh = new THREE.Mesh(geometry, material);

        // Eyes
        const eyeGeometry = new THREE.CircleGeometry(0.1, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: settings.getHex('playerEyeColor') });

        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.15, 0.15, this.radius * 0.95);
        this.mesh.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.15, 0.15, this.radius * 0.95);
        this.mesh.add(this.rightEye);

        this.scene.add(this.mesh);

        // === #1: Ground Shadow (地面マーカー) ===
        const shadowGeo = new THREE.CircleGeometry(this.radius, 24);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: settings.getHex('playerColor'),
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        this.groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.groundShadow.rotation.x = -Math.PI / 2; // Lay flat on ground
        this.scene.add(this.groundShadow);
    }

    updateTargetFromMouse(camera) {
        if (!camera) return;

        // Use Raycaster to project mouse screen coordinate to the XZ plane at player's height Y
        const raycaster = new THREE.Raycaster();
        const mouseCoords = new THREE.Vector2(this.mousePos.x, this.mousePos.y);
        raycaster.setFromCamera(mouseCoords, camera);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.position.y);
        const targetPoint = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(plane, targetPoint)) {
            this.targetPosition.copy(targetPoint);
        }

        // Clamp to bounds
        this.targetPosition.x = THREE.MathUtils.clamp(
            this.targetPosition.x,
            -this.bounds.x,
            this.bounds.x
        );
        this.targetPosition.z = THREE.MathUtils.clamp(
            this.targetPosition.z,
            -this.bounds.z,
            this.bounds.z
        );
    }

    setMousePosition(normalizedX, normalizedY) {
        this.mousePos.x = normalizedX;
        this.mousePos.y = normalizedY;
    }

    setVerticalInput(value) {
        this.verticalInput = value;
    }

    update(deltaTime, camera) {
        this.updateTargetFromMouse(camera);

        // Completely synchronize position with target position (no lerp delay)
        this.position.x = this.targetPosition.x;
        this.position.z = this.targetPosition.z;

        // Vertical movement from clicks
        this.position.y += this.verticalInput * this.verticalSpeed * deltaTime;

        // Clamp to bounds
        this.position.x = THREE.MathUtils.clamp(
            this.position.x,
            -this.bounds.x,
            this.bounds.x
        );
        this.position.y = THREE.MathUtils.clamp(
            this.position.y,
            -this.bounds.y,
            this.bounds.y
        );
        this.position.z = THREE.MathUtils.clamp(
            this.position.z,
            -this.bounds.z,
            this.bounds.z
        );

        // Update mesh position
        this.mesh.position.copy(this.position);

        // === Height-based Scaling (トップダウン用) ===
        // 高い位置(Y+) = カメラに近い = 大きく表示
        const normalizedHeight = (this.position.y + this.bounds.y) / (2 * this.bounds.y); // 0~1
        const heightScale = 0.55 + normalizedHeight * 0.9; // 0.55 (底) ~ 1.45 (天井)
        this.mesh.scale.setScalar(heightScale);

        // Wobble animation (additive to perspective scale)
        const wobble = Math.sin(Date.now() * 0.01) * 0.1;
        this.mesh.rotation.z = wobble;

        // === Update visual aids ===

        // #1: Ground shadow follows XZ position, stays on the ground
        if (this.groundShadow) {
            this.groundShadow.position.set(this.position.x, -this.bounds.y + 0.05, this.position.z);
            // Scale shadow based on height (higher = bigger but more transparent)
            const heightAboveGround = this.position.y + this.bounds.y;
            const shadowScale = 1 + heightAboveGround * 0.03;
            this.groundShadow.scale.setScalar(shadowScale);
            this.groundShadow.material.opacity = Math.max(0.08, 0.25 - heightAboveGround * 0.008);
        }
    }

    reset() {
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.targetPosition.set(0, 0, 0);
        this.mousePos = { x: 0, y: 0 };
        this.verticalInput = 0;
        this.mesh.position.copy(this.position);
        this.mesh.visible = true;
    }

    getPosition() {
        return this.position.clone();
    }

    getRadius() {
        return this.radius;
    }
}
