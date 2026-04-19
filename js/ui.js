// UI module - handles all UI interactions + online ranking
import { addScore, getRanking } from './ranking.js';

export class UIManager {
    constructor() {
        this.titleScreen = document.getElementById('title-screen');
        this.deathScreen = document.getElementById('death-screen');
        this.hud = document.getElementById('hud');
        this.timer = document.getElementById('timer');
        this.survivalTime = document.getElementById('survival-time');
        this.deathTitle = document.getElementById('death-title');

        // Ranking elements
        this.rankingScreen = document.getElementById('ranking-screen');
        this.rankingList = document.getElementById('ranking-list');
        this.rankingBtn = document.getElementById('ranking-btn');
        this.rankingCloseBtn = document.getElementById('ranking-close-btn');

        // Register elements
        this.registerBtn = document.getElementById('register-btn');
        this.registerForm = document.getElementById('register-form');
        this.usernameInput = document.getElementById('username-input');
        this.submitRegisterBtn = document.getElementById('submit-register-btn');

        this.currentScore = 0;
        this.registered = false;

        this.initRankingEvents();
    }

    initRankingEvents() {
        // Title screen Ranking button
        this.rankingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRanking();
        });

        // Close ranking
        this.rankingCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideRanking();
        });

        // Show register form
        this.registerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.registerForm.classList.remove('hidden');
            this.usernameInput.focus();
        });

        // Submit registration
        this.submitRegisterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.submitScore();
        });

        // Enter key submits too
        this.usernameInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                this.submitScore();
            }
        });

        // Prevent clicks on input/buttons from propagating to game
        this.usernameInput.addEventListener('click', (e) => e.stopPropagation());
        this.usernameInput.addEventListener('pointerdown', (e) => e.stopPropagation());
    }

    async submitScore() {
        const name = this.usernameInput.value.trim();
        if (!name) return;
        if (this.registered) return;

        this.submitRegisterBtn.textContent = '...';
        this.submitRegisterBtn.disabled = true;

        const success = await addScore(name, this.currentScore);

        if (success) {
            this.registered = true;
            this.registerBtn.textContent = 'Registered!';
            this.registerBtn.disabled = true;
            this.registerForm.classList.add('hidden');
            this.usernameInput.value = '';
        } else {
            this.submitRegisterBtn.textContent = 'Error';
            setTimeout(() => {
                this.submitRegisterBtn.textContent = 'Register';
                this.submitRegisterBtn.disabled = false;
            }, 2000);
        }
    }

    // === Screen management ===

    showTitle() {
        this.titleScreen.classList.remove('hidden');
        this.deathScreen.classList.add('hidden');
        this.hud.classList.add('hidden');
        this.rankingScreen.classList.add('hidden');
    }

    hideTitle() {
        this.titleScreen.classList.add('hidden');
    }

    showGame() {
        this.titleScreen.classList.add('hidden');
        this.deathScreen.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.rankingScreen.classList.add('hidden');
    }

    showDeath(time, killerName = '???') {
        this.deathScreen.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.deathTitle.textContent = `${killerName} killed you`;
        this.survivalTime.textContent = `Score: ${time.toFixed(2)}`;
        this.currentScore = parseFloat(time.toFixed(2));
        this.registered = false;
        this.registerBtn.textContent = 'Register';
        this.registerBtn.disabled = false;
        this.registerForm.classList.add('hidden');
        this.submitRegisterBtn.textContent = 'Register';
        this.submitRegisterBtn.disabled = false;
    }

    hideDeath() {
        this.deathScreen.classList.add('hidden');
    }

    async showRanking() {
        // Show loading state
        this.rankingList.innerHTML = '<div class="ranking-empty">Loading...</div>';
        this.rankingScreen.classList.remove('hidden');

        // Fetch from Firestore
        const ranking = await getRanking();

        this.rankingList.innerHTML = '';

        if (ranking.length === 0) {
            this.rankingList.innerHTML = '<div class="ranking-empty">No records yet.</div>';
        } else {
            ranking.forEach((entry, i) => {
                const row = document.createElement('div');
                row.className = 'ranking-entry';
                row.innerHTML = `
                    <span class="rank">${i + 1}.</span>
                    <span class="name">${this.escapeHtml(entry.name)}</span>
                    <span class="score">${entry.score.toFixed(2)}</span>
                `;
                this.rankingList.appendChild(row);
            });
        }
    }

    hideRanking() {
        this.rankingScreen.classList.add('hidden');
    }

    isRankingOpen() {
        return !this.rankingScreen.classList.contains('hidden');
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
