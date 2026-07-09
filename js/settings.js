// Settings module - manages color customization with localStorage persistence
// Singleton pattern for global access

const DEFAULTS = {
    // Stage
    stageBgColor: '#111111',
    stageGridColor: '#444444',
    stageGridSubColor: '#333333',

    // Player
    playerColor: '#ffffff',
    playerEyeColor: '#000000',

    // Bullets
    bulletColor: '#30e7b9',
    arrowheadColor: '#e7309f',

    // Laser
    laserColor: '#ffcc00',
    laserGlowColor: '#ff6600',
    laserWarningColor: '#ff4444',

    // Gimmicks
    poisonFogColor: '#33ff33',
    giantHandColor: '#ff6644',
    carBodyColor: '#ff4444',
    carRoofColor: '#cc3333',
    carLightColor: '#ffff00',
    enemyBodyColor: '#ff6600',
    enemyEyeColor: '#ff0000',
    mineBodyColor: '#888888',
    mineSpikeColor: '#666666',
    wallColor: '#4444ff',
    wallWireColor: '#6666ff',
    treeTrunkColor: '#8B4513',
    treeCanopyColor: '#228B22',
    largeHomingColor: '#aa00ff',
    warningColor: '#ff0000',
    speedUpColor: '#ff2222',
    bounceColor: '#22ccff',
    zigzagColor: '#ffaa00',

    // Unified Screens & Details
    panelBgColor: '#0a0a0f',
    panelBorderColor: '#333333',
    rankingEntryColor: '#aaaaaa',
    rankingBorderColor: '#222222',
    rankingRankColor: '#666666',
    rankingScoreColor: '#ffffff',
    statusLabelColor: '#666666',
    settingsInputBgColor: '#1c1c24',
    settingsInputBorderColor: '#444444',
    settingsInputTextColor: '#ffffff',
    settingsPreviewBorderColor: '#555555',

    // UI & Text
    mainTextColor: '#ffffff',
    mainTextGlowColor: '#ff003c',
    subTextColor: '#aaaaaa',
    btnBgColor: '#111115',
    btnBorderColor: '#555555',
    btnTextColor: '#aaaaaa',
    registerBtnBgColor: '#ff003c',
    registerBtnTextColor: '#ffffff',
    inputBgColor: '#111115',
    inputBorderColor: '#555555',
    inputFocusBorderColor: '#ff003c',
    inputTextColor: '#ffffff',
};

// Human-readable labels for the settings UI (grouped in English)
export const SETTINGS_GROUPS = [
    {
        label: 'Stage',
        items: [
            { key: 'stageBgColor', label: 'Background' },
            { key: 'stageGridColor', label: 'Grid (Main)' },
            { key: 'stageGridSubColor', label: 'Grid (Sub)' },
        ]
    },
    {
        label: 'Player',
        items: [
            { key: 'playerColor', label: 'Player & Shadow' },
            { key: 'playerEyeColor', label: 'Player Eyes' },
        ]
    },
    {
        label: 'Bullets',
        items: [
            { key: 'bulletColor', label: 'Bullet' },
            { key: 'arrowheadColor', label: 'Arrowhead' },
        ]
    },
    {
        label: 'Laser',
        items: [
            { key: 'laserColor', label: 'Laser Body' },
            { key: 'laserGlowColor', label: 'Laser Glow' },
            { key: 'laserWarningColor', label: 'Laser Warning' },
        ]
    },
    {
        label: 'Gimmicks',
        items: [
            { key: 'poisonFogColor', label: 'Poison Fog' },
            { key: 'giantHandColor', label: 'Giant Hand' },
            { key: 'carBodyColor', label: 'Car Body' },
            { key: 'carRoofColor', label: 'Car Roof' },
            { key: 'carLightColor', label: 'Car Headlights' },
            { key: 'enemyBodyColor', label: 'Enemy Shooter Body' },
            { key: 'enemyEyeColor', label: 'Enemy Shooter Eyes' },
            { key: 'mineBodyColor', label: 'Mine Body' },
            { key: 'mineSpikeColor', label: 'Mine Spikes' },
            { key: 'wallColor', label: 'Wall Body' },
            { key: 'wallWireColor', label: 'Wall Wireframe' },
            { key: 'treeTrunkColor', label: 'Tree Trunk' },
            { key: 'treeCanopyColor', label: 'Tree Leaves' },
            { key: 'largeHomingColor', label: 'Giant Homing Bullet' },
            { key: 'warningColor', label: 'Warning Indicator' },
            { key: 'speedUpColor', label: 'Speed Up Indicator' },
            { key: 'bounceColor', label: 'Bounce Indicator' },
            { key: 'zigzagColor', label: 'Zigzag Indicator' },
        ]
    },
    {
        label: 'Screens & Details',
        items: [
            { key: 'panelBgColor', label: 'Panel Background' },
            { key: 'panelBorderColor', label: 'Panel Border' },
            { key: 'rankingEntryColor', label: 'Ranking Entry' },
            { key: 'rankingBorderColor', label: 'Ranking Border' },
            { key: 'rankingRankColor', label: 'Ranking Rank Label' },
            { key: 'rankingScoreColor', label: 'Ranking Score Text' },
            { key: 'statusLabelColor', label: 'Your Status Label' },
            { key: 'settingsInputBgColor', label: 'Settings Input Background' },
            { key: 'settingsInputBorderColor', label: 'Settings Input Border' },
            { key: 'settingsInputTextColor', label: 'Settings Input Text' },
            { key: 'settingsPreviewBorderColor', label: 'Settings Preview Border' },
        ]
    },
    {
        label: 'UI & Text',
        items: [
            { key: 'mainTextColor', label: 'Main Text' },
            { key: 'mainTextGlowColor', label: 'Main Text Glow' },
            { key: 'subTextColor', label: 'Sub Text / Labels' },
            { key: 'btnBgColor', label: 'Button Background' },
            { key: 'btnBorderColor', label: 'Button Border' },
            { key: 'btnTextColor', label: 'Button Text' },
            { key: 'registerBtnBgColor', label: 'Register Button Bg' },
            { key: 'registerBtnTextColor', label: 'Register Button Text' },
            { key: 'inputBgColor', label: 'Input Background' },
            { key: 'inputBorderColor', label: 'Input Border' },
            { key: 'inputFocusBorderColor', label: 'Input Focus Border' },
            { key: 'inputTextColor', label: 'Input Text / Caret' },
        ]
    },
];

const STORAGE_KEY = 'h3ll_settings';

class GameSettings {
    constructor() {
        this.values = { ...DEFAULTS };
        this.load();
    }

    /** Get a setting value as hex string (e.g. '#ff3366') */
    get(key) {
        return this.values[key] ?? DEFAULTS[key] ?? '#ffffff';
    }

    /** Get a setting value as a THREE.js-compatible integer (e.g. 0xff3366) */
    getHex(key) {
        return parseInt(this.get(key).replace('#', ''), 16);
    }

    /** Set a setting value */
    set(key, value) {
        this.values[key] = value;
    }

    /** Save all settings to localStorage */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    /** Load settings from localStorage */
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults so new keys are always present
                this.values = { ...DEFAULTS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
            this.values = { ...DEFAULTS };
        }
    }

    /** Reset all settings to defaults */
    reset() {
        this.values = { ...DEFAULTS };
        this.save();
    }

    /** Get the defaults object */
    getDefaults() {
        return { ...DEFAULTS };
    }

    /** Apply text-related CSS custom properties to :root */
    applyCSSVariables() {
        const root = document.documentElement;
        root.style.setProperty('--text-color', this.get('mainTextColor'));
        root.style.setProperty('--text-glow-color', this.get('mainTextGlowColor'));
        root.style.setProperty('--sub-text-color', this.get('subTextColor'));
        root.style.setProperty('--btn-bg-color', this.get('btnBgColor'));
        root.style.setProperty('--btn-border-color', this.get('btnBorderColor'));
        root.style.setProperty('--btn-text-color', this.get('btnTextColor'));
        root.style.setProperty('--register-btn-bg-color', this.get('registerBtnBgColor'));
        root.style.setProperty('--register-btn-text-color', this.get('registerBtnTextColor'));
        root.style.setProperty('--input-bg-color', this.get('inputBgColor'));
        root.style.setProperty('--input-border-color', this.get('inputBorderColor'));
        root.style.setProperty('--input-focus-border-color', this.get('inputFocusBorderColor'));
        root.style.setProperty('--input-text-color', this.get('inputTextColor'));

        // Screens & Details
        root.style.setProperty('--screen-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--death-screen-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--ranking-screen-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--settings-screen-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--ranking-title-color', this.get('mainTextColor'));
        root.style.setProperty('--ranking-entry-color', this.get('rankingEntryColor'));
        root.style.setProperty('--ranking-border-color', this.get('rankingBorderColor'));
        root.style.setProperty('--ranking-rank-color', this.get('rankingRankColor'));
        root.style.setProperty('--ranking-score-color', this.get('rankingScoreColor'));
        root.style.setProperty('--status-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--status-border-color', this.get('panelBorderColor'));
        root.style.setProperty('--status-label-color', this.get('statusLabelColor'));
        root.style.setProperty('--status-value-color', this.get('rankingScoreColor'));
        root.style.setProperty('--settings-group-bg-color', this.get('panelBgColor'));
        root.style.setProperty('--settings-group-border-color', this.get('panelBorderColor'));
        root.style.setProperty('--settings-input-bg-color', this.get('settingsInputBgColor'));
        root.style.setProperty('--settings-input-border-color', this.get('settingsInputBorderColor'));
        root.style.setProperty('--settings-input-text-color', this.get('settingsInputTextColor'));
        root.style.setProperty('--settings-preview-border-color', this.get('settingsPreviewBorderColor'));
    }
}

// Singleton instance
const settings = new GameSettings();
export default settings;
