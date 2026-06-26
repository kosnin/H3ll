// Main game module - orchestrates all game systems
import * as THREE from 'three';
import { Player } from './player.js';
import { BulletManager } from './bullets.js';
import { GimmickManager } from './gimmicks.js';
import { CollisionSystem } from './collision.js';
import { EffectsManager } from './effects.js';
import { PhaseManager } from './phases.js';
import { UIManager } from './ui.js';
import { playButtonSound, playDeathSound } from './audio.js';
import settings from './settings.js';

class Game {
    constructor() {
        // Game state
        this.state = 'title'; // 'title', 'playing', 'dead'
        this.gameTime = 0;

        // Play area bounds
        // デフォルト面(XZ)を最大かつ少し横長に(X=32, Z=20)
        // 高さ(Y)は元の22の約2/3である15に設定
        this.bounds = new THREE.Vector3(32, 15, 20);

        // Camera settings - デフォルトは完全なトップダウン（真上から見下ろし）
        this.cameraDistance = 33;
        this.cameraTheta = 0; // Camera horizontal angle
        this.cameraPhi = 0.01; // 真上(0)だとジンバルロックが起きるので微小な値を設定
        this.cameraTarget = new THREE.Vector3(0, 0, 0);

        // Input state
        this.mousePos = { x: 0, y: 0 };
        this.mouseButtons = { left: false, right: false };
        this.keys = { w: false, a: false, s: false, d: false };

        // Initialize systems
        this.initThree();
        this.initGame();
        this.initEventListeners();

        // Start loop
        this.clock = new THREE.Clock();
        this.animate();
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(settings.getHex('stageBgColor'));

        // === #4: Fog (depth fog for spatial awareness) ===
        this.scene.fog = new THREE.Fog(settings.getHex('stageBgColor'), 40, 120);

        // Camera - 視野角を標準に戻す (パース強調のため個別スケーリングを併用)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 33, 0.5);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create play area boundary visualization
        this.createBoundaryVisual();

        // Create background grid
        this.createBackgroundGrid();

        // Simple lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
    }

    createBoundaryVisual() {
        const geometry = new THREE.BoxGeometry(
            this.bounds.x * 2,
            this.bounds.y * 2,
            this.bounds.z * 2
        );

        const edges = new THREE.EdgesGeometry(geometry);
        const material = new THREE.LineBasicMaterial({
            color: settings.getHex('stageGridColor'),
            transparent: true,
            opacity: 0.5
        });

        this.boundaryMat = material;
        this.boundaryMesh = new THREE.LineSegments(edges, material);
        this.scene.add(this.boundaryMesh);
    }

    createBackgroundGrid() {
        // 壁面用の矩形グリッド作成ヘルパー
        const createWallGrid = (width, height, divisions, color) => {
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            
            // 垂直線
            for (let i = 0; i <= divisions; i++) {
                const x = (i / divisions - 0.5) * width;
                vertices.push(x, -height / 2, 0, x, height / 2, 0);
            }
            // 水平線
            const hDivisions = Math.round(divisions * (height / width));
            for (let i = 0; i <= hDivisions; i++) {
                const y = (i / hDivisions - 0.5) * height;
                vertices.push(-width / 2, y, 0, width / 2, y, 0);
            }
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.4 
            }));
        };

        // 地面 (XZ平面) - 幅44, 奥行き28 の矩形
        const groundGrid = createWallGrid(this.bounds.x * 2, this.bounds.z * 2, 20, settings.getHex('stageGridColor'));
        groundGrid.rotation.x = -Math.PI / 2;
        groundGrid.position.y = -this.bounds.y;
        this.scene.add(groundGrid);
        this.groundGridMat = groundGrid.material;

        // 奥の壁 (XY平面) - 幅44, 高さ44
        const backGrid = createWallGrid(this.bounds.x * 2, this.bounds.y * 2, 20, settings.getHex('stageGridSubColor'));
        backGrid.position.set(0, 0, -this.bounds.z);
        this.scene.add(backGrid);
        this.backGridMat = backGrid.material;

        // 左の壁 (YZ平面) - 奥行き28, 高さ44
        const leftGrid = createWallGrid(this.bounds.z * 2, this.bounds.y * 2, 20, settings.getHex('stageGridSubColor'));
        leftGrid.rotation.y = Math.PI / 2;
        leftGrid.position.set(-this.bounds.x, 0, 0);
        this.scene.add(leftGrid);
        this.leftGridMat = leftGrid.material;
    }

    initGame() {
        // UI
        this.ui = new UIManager();

        // Player
        this.player = new Player(this.scene, this.bounds);

        // Systems
        this.bulletManager = new BulletManager(this.scene);
        this.bulletManager.bounds = this.bounds;
        this.gimmickManager = new GimmickManager(this.scene, this.bounds, this.bulletManager);
        this.collisionSystem = new CollisionSystem();
        this.effectsManager = new EffectsManager(this.scene);
        this.phaseManager = new PhaseManager(
            this.bulletManager,
            this.gimmickManager,
            this.bounds
        );
    }

    initEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onResize());

        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mouse/Pointer controls for player movement (document level to catch through overlays)
        document.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        document.addEventListener('pointermove', (e) => this.onPointerMove(e));
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));
        window.addEventListener('pointercancel', (e) => this.onPointerUp(e)); // Treat cancel like up
        
        window.addEventListener('blur', () => this.onBlur());

        // Camera controls
        window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onWheel(e) {
        e.preventDefault();
        let delta = e.deltaY;
        
        // Handle different delta modes (pixels, lines, pages)
        if (e.deltaMode === 1) delta *= 33; // lines
        if (e.deltaMode === 2) delta *= 800; // pages
        
        const sensitivity = 0.05;
        this.cameraDistance += delta * sensitivity;
        
        // Clamp camera distance (wider range: 10 to 150)
        this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 10, 150);
    }

    onKeyDown(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case 'q':
                // Reset Camera
                this.cameraDistance = 33;
                this.cameraTheta = 0;
                this.cameraPhi = 0.01;
                break;
            case 'pageup':
                this.cameraDistance -= 5;
                this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 10, 150);
                break;
            case 'pagedown':
                this.cameraDistance += 5;
                this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 10, 150);
                break;
        }
    }

    onBlur() {
        // Reset all inputs when window loses focus to prevent stuck movement
        this.mouseButtons.left = false;
        this.mouseButtons.right = false;
        for (let key in this.keys) {
            this.keys[key] = false;
        }
        if (this.player) this.player.setVerticalInput(0);
    }

    onKeyUp(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
        }
    }

    onPointerMove(e) {
        if (this.state === 'playing') {
            const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
            const normalizedY = -(e.clientY / window.innerHeight) * 2 + 1;
            this.player.setMousePosition(normalizedX, normalizedY);
        }
    }

    onPointerDown(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }

        // Don't start/restart if ranking is open or clicking UI elements
        if (this.ui.isRankingOpen() || this.ui.isSettingsOpen()) return;
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

        if (this.state === 'title') {
            this.startGame();
            return;
        }

        if (this.state === 'dead') {
            if (!this.deathDelayActive) {
                this.restartGame();
            }
            return;
        }

        if (this.state === 'playing') {
            // Force pointer capture to prevent OS/Browser gestures from eating pointermove events
            // We use the canvas for capture even if the target was slightly different
            this.renderer.domElement.setPointerCapture(e.pointerId);
            
            if (e.button === 0) {
                this.mouseButtons.left = true;
            } else if (e.button === 2) {
                this.mouseButtons.right = true;
            }
        }
    }

    onPointerUp(e) {
        const canvas = this.renderer.domElement;
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }

        if (e.button === 0) {
            this.mouseButtons.left = false;
        } else if (e.button === 2) {
            this.mouseButtons.right = false;
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    applySettings() {
        this.scene.background.setHex(settings.getHex('stageBgColor'));
        this.scene.fog.color.setHex(settings.getHex('stageBgColor'));
        if (this.boundaryMat) this.boundaryMat.color.setHex(settings.getHex('stageGridColor'));
        if (this.groundGridMat) this.groundGridMat.color.setHex(settings.getHex('stageGridColor'));
        if (this.backGridMat) this.backGridMat.color.setHex(settings.getHex('stageGridSubColor'));
        if (this.leftGridMat) this.leftGridMat.color.setHex(settings.getHex('stageGridSubColor'));
    }

    startGame() {
        this.applySettings();
        this.state = 'playing';
        this.gameTime = 0;
        playButtonSound();

        this.ui.showGame();
        this.player.reset();
    }

    restartGame() {
        // Clear all game objects
        this.bulletManager.clear();
        this.bulletManager.speedMultiplier = 1.0;
        this.bulletManager.bounceEnabled = false;
        this.gimmickManager.clear();
        this.effectsManager.clear();
        this.phaseManager.reset();
        this.ui.reset();

        this.startGame();
    }

    die(killerName = '???') {
        this.state = 'dead';
        this.deathDelayActive = true;

        // Death explosion effect
        this.effectsManager.spawnDeathEffect(this.player.getPosition());
        playDeathSound();

        // Hide player
        this.player.mesh.visible = false;

        // Show death screen after 1.5s delay
        setTimeout(() => {
            this.deathDelayActive = false;
            this.ui.showDeath(this.gameTime, killerName);
        }, 1500);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = Math.min(this.clock.getDelta(), 0.05);

        if (this.state === 'playing') {
            this.updateGame(deltaTime);
        }



        // Update camera (always, for zoom/rotate on title/death screens)
        this.updateCamera(deltaTime);

        const cameraPos = this.camera.position;

        // Always update effects (for death animation)
        this.effectsManager.update(deltaTime);
        this.ui.update(deltaTime);

        this.renderer.render(this.scene, this.camera);
    }

    updateGame(deltaTime) {
        // Update game time
        this.gameTime += deltaTime;
        this.ui.updateTimer(this.gameTime);

        // Derive vertical input from mouse interaction
        let vInput = 0;
        if (this.mouseButtons.left && !this.mouseButtons.right) vInput = 1;
        else if (this.mouseButtons.right && !this.mouseButtons.left) vInput = -1;
        this.player.setVerticalInput(vInput);

        // Update player with camera angle and position for adaptive movement and scaling
        this.player.cameraTheta = this.cameraTheta;
        this.player.update(deltaTime, this.camera);

        // Apply wall constraints from gimmicks
        const constrainedPos = this.gimmickManager.constrainPlayerPosition(
            this.player.getPosition(),
            this.player.getRadius()
        );
        this.player.position.copy(constrainedPos);
        this.player.mesh.position.copy(constrainedPos);

        const playerPos = this.player.getPosition();

        // Update phase manager (spawns attacks + gimmicks)
        this.phaseManager.update(deltaTime, this.gameTime, playerPos);

        // Update bullets: カメラ位置 + プレイヤー位置 + bounds.y (高さスケーリング + 近接色)
        this.bulletManager.update(deltaTime, playerPos, this.camera.position, this.bounds.y);

        // Update gimmicks: カメラ位置 + プレイヤー位置 + bounds.y
        this.gimmickManager.update(deltaTime, playerPos, this.player.getRadius(), this.camera.position, this.bounds.y);

        // Check collisions
        const collision = this.collisionSystem.checkPlayerCollisions(
            this.player,
            this.bulletManager,
            this.gimmickManager
        );

        if (collision.hit) {
            this.die(collision.killerName);
        }
    }

    updateCamera(deltaTime) {
        // Update camera angle from keys
        const rotationSpeed = 2.0; // Radians per second
        if (this.keys.a) this.cameraTheta += rotationSpeed * deltaTime;
        if (this.keys.d) this.cameraTheta -= rotationSpeed * deltaTime;

        if (this.keys.w) this.cameraPhi -= rotationSpeed * deltaTime;
        if (this.keys.s) this.cameraPhi += rotationSpeed * deltaTime;

        // Clamp Phi to prevent flipping
        this.cameraPhi = THREE.MathUtils.clamp(this.cameraPhi, 0.01, 1.4);

        const playerPos = this.player.getPosition();

        // Update camera - smooth follow with rotation
        this.cameraTarget.x = THREE.MathUtils.lerp(
            this.cameraTarget.x,
            playerPos.x * 0.3,
            deltaTime * 2
        );
        this.cameraTarget.z = THREE.MathUtils.lerp(
            this.cameraTarget.z,
            playerPos.z * 0.3,
            deltaTime * 2
        );
        this.cameraTarget.y = THREE.MathUtils.lerp(
            this.cameraTarget.y,
            playerPos.y * 0.2,
            deltaTime * 2
        );

        // Calculate camera position based on theta and phi (Spherical coordinates)
        const hDistance = this.cameraDistance * Math.sin(this.cameraPhi); // Horizontal distance
        const vDistance = this.cameraDistance * Math.cos(this.cameraPhi); // Vertical height

        const xOffset = Math.sin(this.cameraTheta) * hDistance;
        const zOffset = Math.cos(this.cameraTheta) * hDistance;
        const yOffset = vDistance;

        this.camera.position.set(
            this.cameraTarget.x + xOffset,
            this.cameraTarget.y + yOffset,
            this.cameraTarget.z + zOffset
        );
        this.camera.lookAt(this.cameraTarget);
    }
}

// Start the game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
