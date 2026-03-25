// Player module - handles player movement and rendering
import * as THREE from 'three';

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
            color: 0xffffff,
            wireframe: false
        });

        this.mesh = new THREE.Mesh(geometry, material);



        // Eyes
        const eyeGeometry = new THREE.CircleGeometry(0.1, 6);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.15, 0.15, this.radius * 0.95);
        this.mesh.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.15, 0.15, this.radius * 0.95);
        this.mesh.add(this.rightEye);

        this.scene.add(this.mesh);
    }

    updateTargetFromMouse() {
        const sensitivity = 2.5;

        // Raw input position relative to screen center
        let inputX = this.mousePos.x * this.bounds.x * sensitivity;
        let inputZ = this.mousePos.y * this.bounds.z * sensitivity;

        // Rotate input based on camera angle to align controls with view
        const sin = Math.sin(this.cameraTheta);
        const cos = Math.cos(this.cameraTheta);

        this.targetPosition.x = inputX * cos - inputZ * sin;
        this.targetPosition.z = inputX * sin + inputZ * cos;

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

    update(deltaTime) {
        this.updateTargetFromMouse();

        // Smoothly move towards target position on XZ plane
        this.position.x = THREE.MathUtils.lerp(
            this.position.x,
            this.targetPosition.x,
            deltaTime * 8
        );
        this.position.z = THREE.MathUtils.lerp(
            this.position.z,
            this.targetPosition.z,
            deltaTime * 8
        );

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

        // Wobble animation
        this.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.1;
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
