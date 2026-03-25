// UI module - handles all UI interactions
export class UIManager {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.deathScreen = document.getElementById('death-screen');
        this.hud = document.getElementById('hud');
        this.timer = document.getElementById('timer');
        this.survivalTime = document.getElementById('survival-time');
        this.deathTitle = document.getElementById('death-title');
    }

    showTitle() {
        this.titleScreen.classList.remove('hidden');
        this.deathScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
    }

    hideTitle() {
        this.titleScreen.classList.add('hidden');
    }

    showGame() {
        this.titleScreen.classList.add('hidden');
        this.deathScreen.classList.add('hidden');
        this.hud.classList.remove('hidden');
    }

    showDeath(time, killerName = '???') {
        this.deathScreen.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.deathTitle.textContent = `${killerName} killed you`;
        this.survivalTime.textContent = `Score: ${time.toFixed(2)}`;
    }

    hideDeath() {
        this.deathScreen.classList.add('hidden');
    }

    updateTimer(time) {
        this.timer.textContent = time.toFixed(2);
    }

    update(deltaTime) {
        // No phase indicator to update
    }

    reset() {
        this.timer.textContent = '0.00';
    }
}
