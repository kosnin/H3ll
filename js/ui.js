// UI module - handles all UI interactions + online ranking
import { addScore, getRanking, getExactRank } from './ranking.js';
import { playButtonSound } from './audio.js';
import settings, { SETTINGS_GROUPS } from './settings.js';

export class UIManager {
    constructor() {
        this.container = document.getElementById('game-container');
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
        this.playerStatusContent = document.getElementById('player-status-content');

        // Register elements
        this.registerBtn = document.getElementById('register-btn');
        this.deathRankingBtn = document.getElementById('death-ranking-btn');
        this.registerForm = document.getElementById('register-form');
        this.usernameInput = document.getElementById('username-input');
        this.submitRegisterBtn = document.getElementById('submit-register-btn');

        this.currentScore = 0;
        this.registered = false;
        this.lastRegisteredName = "";
        this.lastRegisteredScore = 0;

        // Settings elements
        this.titleSettingsBtn = document.getElementById('title-settings-btn');
        this.deathSettingsBtn = document.getElementById('death-settings-btn');
        this.settingsScreen = document.getElementById('settings-screen');
        this.settingsContent = document.getElementById('settings-content');
        this.settingsResetBtn = document.getElementById('settings-reset-btn');
        this.settingsSaveBtn = document.getElementById('settings-save-btn');

        this.initRankingEvents();
        this.initSettingsEvents();

        // Apply initial CSS variables
        settings.applyCSSVariables();
    }

    initRankingEvents() {
        // Title screen Ranking button
        this.rankingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playButtonSound();
            this.showRanking();
        });

        // Death screen Ranking button
        this.deathRankingBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showRanking();
        });

        // Close ranking
        this.rankingCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playButtonSound();
            this.hideRanking();
        });

        // Show register form
        this.registerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playButtonSound();
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

    initSettingsEvents() {
        const openSettings = (e) => {
            e.stopPropagation();
            playButtonSound();
            this.showSettings();
        };

        if (this.titleSettingsBtn) this.titleSettingsBtn.addEventListener('click', openSettings);
        if (this.deathSettingsBtn) this.deathSettingsBtn.addEventListener('click', openSettings);

        if (this.settingsSaveBtn) {
            this.settingsSaveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playButtonSound();
                settings.save();
                settings.applyCSSVariables();
                this.hideSettings();
                alert('Refresh the page to apply');
            });
        }

        if (this.settingsResetBtn) {
            this.settingsResetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playButtonSound();
                settings.reset();
                this.populateSettings(); // Refresh UI
            });
        }
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
            this.lastRegisteredName = name;
            this.lastRegisteredScore = this.currentScore;
            
            this.registerBtn.textContent = 'Registered!';
            this.registerBtn.disabled = true;
            this.registerForm.classList.add('hidden');
            this.deathRankingBtn.classList.remove('hidden'); // Show ranking button
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
        if (this.settingsScreen) this.settingsScreen.classList.add('hidden');
        this.container.classList.remove('playing');
    }

    hideTitle() {
        this.titleScreen.classList.add('hidden');
    }

    showGame() {
        this.titleScreen.classList.add('hidden');
        this.deathScreen.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.rankingScreen.classList.add('hidden');
        if (this.settingsScreen) this.settingsScreen.classList.add('hidden');
        this.container.classList.add('playing');
    }

    showDeath(time, killerName = '???') {
        this.deathScreen.classList.remove('hidden');
        this.hud.classList.add('hidden');
        this.container.classList.remove('playing');
        this.deathTitle.textContent = `${killerName} killed you`;
        this.survivalTime.textContent = `Score: ${time.toFixed(2)}`;
        this.currentScore = parseFloat(time.toFixed(2));
        this.registered = false;
        this.registerBtn.textContent = 'Register for the Ranking';
        this.registerBtn.disabled = false;
        this.registerForm.classList.add('hidden');
        this.deathRankingBtn.classList.add('hidden'); // Hide until registered
        this.submitRegisterBtn.textContent = 'Register';
        this.submitRegisterBtn.disabled = false;
    }

    hideDeath() {
        this.deathScreen.classList.add('hidden');
    }

    async showRanking() {
        // Show loading state
        this.rankingList.innerHTML = '<div class="ranking-empty">Loading...</div>';
        this.playerStatusContent.innerHTML = '<div class="ranking-empty">Loading...</div>';
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

        // Update player status on the left
        let rankStr = "---";
        if (this.registered) {
            // Try to find in the fetched top 20
            const index = ranking.findIndex(e => e.name === this.lastRegisteredName && Math.abs(e.score - this.lastRegisteredScore) < 0.001);
            if (index !== -1) {
                rankStr = (index + 1).toString();
            } else {
                // Fetch exact rank if not in top 20
                const exactRank = await getExactRank(this.lastRegisteredScore);
                rankStr = exactRank !== -1 ? exactRank.toString() : "TOP 20+";
            }
        }

        this.playerStatusContent.innerHTML = `
            <div class="player-status-entry your-rank">
                <span class="label">RANK</span>
                <span class="value">${rankStr}</span>
            </div>
            <div class="player-status-entry">
                <span class="label">NAME</span>
                <span class="value">${this.escapeHtml(this.lastRegisteredName || "---")}</span>
            </div>
            <div class="player-status-entry">
                <span class="label">SCORE</span>
                <span class="value">${this.lastRegisteredScore ? this.lastRegisteredScore.toFixed(2) : "---"}</span>
            </div>
        `;
    }

    hideRanking() {
        this.rankingScreen.classList.add('hidden');
    }

    isRankingOpen() {
        return !this.rankingScreen.classList.contains('hidden');
    }

    showSettings() {
        this.populateSettings();
        this.settingsScreen.classList.remove('hidden');
    }

    hideSettings() {
        this.settingsScreen.classList.add('hidden');
    }

    isSettingsOpen() {
        return this.settingsScreen && !this.settingsScreen.classList.contains('hidden');
    }

    populateSettings() {
        if (!this.settingsContent) return;
        this.settingsContent.innerHTML = '';

        // Create 3 columns for Masonry S-curve layout
        const columns = [
            document.createElement('div'),
            document.createElement('div'),
            document.createElement('div')
        ];
        columns.forEach(col => {
            col.className = 'settings-column';
            this.settingsContent.appendChild(col);
        });

        SETTINGS_GROUPS.forEach((group, idx) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'settings-group';

            const titleEl = document.createElement('div');
            titleEl.className = 'settings-group-title';
            titleEl.textContent = group.label;
            groupEl.appendChild(titleEl);

            group.items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'setting-item';

                const labelEl = document.createElement('label');
                labelEl.textContent = item.label;

                const containerEl = document.createElement('div');
                containerEl.className = 'color-input-container';

                const inputEl = document.createElement('input');
                inputEl.type = 'text';
                inputEl.maxLength = 7;
                inputEl.value = settings.get(item.key);

                const pickerEl = document.createElement('input');
                pickerEl.type = 'color';
                pickerEl.className = 'color-picker-input';
                pickerEl.value = settings.get(item.key);

                const isValidHex = (hex) => /^#[0-9a-fA-F]{6}$/.test(hex);

                // Real-time input handling
                inputEl.addEventListener('input', (e) => {
                    let val = e.target.value.trim();
                    // Auto-prepend # if 6 characters are input without it
                    if (val.length === 6 && !val.startsWith('#') && /^[0-9a-fA-F]{6}$/.test(val)) {
                        val = '#' + val;
                        inputEl.value = val;
                    }

                    if (isValidHex(val)) {
                        settings.set(item.key, val);
                        pickerEl.value = val;
                        inputEl.style.borderColor = '';
                    } else {
                        inputEl.style.borderColor = 'var(--text-glow-color)';
                    }
                });

                // Revert on blur if invalid
                inputEl.addEventListener('blur', (e) => {
                    const val = e.target.value.trim();
                    if (!isValidHex(val)) {
                        const savedVal = settings.get(item.key);
                        inputEl.value = savedVal;
                        pickerEl.value = savedVal;
                        inputEl.style.borderColor = '';
                    }
                });

                // Color picker GUI selection handling
                pickerEl.addEventListener('input', (e) => {
                    const val = e.target.value;
                    settings.set(item.key, val);
                    inputEl.value = val;
                    inputEl.style.borderColor = '';
                });

                // Prevent pointer events from triggering title-start or canvas clicks
                inputEl.addEventListener('click', (e) => e.stopPropagation());
                inputEl.addEventListener('pointerdown', (e) => e.stopPropagation());
                pickerEl.addEventListener('click', (e) => e.stopPropagation());
                pickerEl.addEventListener('pointerdown', (e) => e.stopPropagation());

                containerEl.appendChild(inputEl);
                containerEl.appendChild(pickerEl);

                itemEl.appendChild(labelEl);
                itemEl.appendChild(containerEl);
                groupEl.appendChild(itemEl);
            });

            // Distribute groups in S-curve masonry columns:
            // Col 0 (Left): Stage (0), Screens & Details (5)
            // Col 1 (Middle): Player (1), Gimmicks (4)
            // Col 2 (Right): Bullets (2), Laser (3), UI & Text (6)
            let colIdx = 0;
            if (idx === 0 || idx === 5) {
                colIdx = 0;
            } else if (idx === 1 || idx === 4) {
                colIdx = 1;
            } else if (idx === 2 || idx === 3 || idx === 6) {
                colIdx = 2;
            }
            columns[colIdx].appendChild(groupEl);
        });
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
