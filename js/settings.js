// Settings module - manages color customization with localStorage persistence
// Singleton pattern for global access

const DEFAULTS = {
    // UI & Text
    mainTextColor:          '#ffffff',
    mainTextGlowColor:      '#ff003c',
    subTextColor:           '#aaaaaa',
    btnBgColor:             '#111115',
    btnBorderColor:         '#555555',
    btnTextColor:           '#aaaaaa',
    registerBtnBgColor:     '#ff003c',
    registerBtnTextColor:   '#ffffff',
    inputBgColor:           '#111115',
    inputBorderColor:       '#555555',
    inputFocusBorderColor:  '#ff003c',
    inputTextColor:         '#ffffff',

    // Stage
    stageBgColor:           '#111111',
    stageGridColor:         '#444444',
    stageGridSubColor:      '#333333',

    // Player
    playerColor:            '#ffffff',
    playerEyeColor:         '#000000',

    // Bullets
    bulletColor:            '#ff3366',
    homingBulletColor:      '#33ffcc',

    // Laser
    laserColor:             '#ffcc00',
    laserGlowColor:         '#ff6600',
    laserWarningColor:      '#ff4444',

    // Gimmicks
    poisonFogColor:         '#33ff33',
    giantHandColor:         '#ff6644',
    carBodyColor:           '#ff4444',
    carRoofColor:           '#cc3333',
    carLightColor:          '#ffff00',
    enemyBodyColor:         '#ff6600',
    enemyEyeColor:          '#ff0000',
    mineBodyColor:          '#888888',
    mineSpikeColor:         '#666666',
    wallColor:              '#4444ff',
    wallWireColor:          '#6666ff',
    treeTrunkColor:         '#8B4513',
    treeCanopyColor:        '#228B22',
    largeHomingColor:       '#aa00ff',
    warningColor:           '#ff0000',
    speedUpColor:           '#ff2222',
    bounceColor:            '#22ccff',
    zigzagColor:            '#ffaa00',
};

// Human-readable labels for the settings UI (grouped in English)
export const SETTINGS_GROUPS = [
    {
        label: 'UI & Text',
        items: [
            { key: 'mainTextColor',         label: 'Main Text' },
            { key: 'mainTextGlowColor',     label: 'Main Text Glow' },
            { key: 'subTextColor',          label: 'Sub Text / Labels' },
            { key: 'btnBgColor',            label: 'Button Background' },
            { key: 'btnBorderColor',        label: 'Button Border' },
            { key: 'btnTextColor',          label: 'Button Text' },
            { key: 'registerBtnBgColor',    label: 'Register Button Bg' },
            { key: 'registerBtnTextColor',  label: 'Register Button Text' },
            { key: 'inputBgColor',          label: 'Input Background' },
            { key: 'inputBorderColor',      label: 'Input Border' },
            { key: 'inputFocusBorderColor', label: 'Input Focus Border' },
            { key: 'inputTextColor',        label: 'Input Text / Caret' },
        ]
    },
    {
        label: 'Stage',
        items: [
            { key: 'stageBgColor',          label: 'Background' },
            { key: 'stageGridColor',        label: 'Grid (Main)' },
            { key: 'stageGridSubColor',     label: 'Grid (Sub)' },
        ]
    },
    {
        label: 'Player',
        items: [
            { key: 'playerColor',           label: 'Player & Shadow' },
            { key: 'playerEyeColor',        label: 'Player Eyes' },
        ]
    },
    {
        label: 'Bullets',
        items: [
            { key: 'bulletColor',           label: 'Normal Bullet' },
            { key: 'homingBulletColor',     label: 'Homing Bullet' },
        ]
    },
    {
        label: 'Laser',
        items: [
            { key: 'laserColor',            label: 'Laser Body' },
            { key: 'laserGlowColor',        label: 'Laser Glow' },
            { key: 'laserWarningColor',     label: 'Laser Warning' },
        ]
    },
    {
        label: 'Gimmicks',
        items: [
            { key: 'poisonFogColor',        label: 'Poison Fog' },
            { key: 'giantHandColor',        label: 'Giant Hand' },
            { key: 'carBodyColor',          label: 'Car Body' },
            { key: 'carRoofColor',          label: 'Car Roof' },
            { key: 'carLightColor',         label: 'Car Headlights' },
            { key: 'enemyBodyColor',        label: 'Enemy Shooter Body' },
            { key: 'enemyEyeColor',         label: 'Enemy Shooter Eyes' },
            { key: 'mineBodyColor',         label: 'Mine Body' },
            { key: 'mineSpikeColor',        label: 'Mine Spikes' },
            { key: 'wallColor',             label: 'Wall Body' },
            { key: 'wallWireColor',         label: 'Wall Wireframe' },
            { key: 'treeTrunkColor',        label: 'Tree Trunk' },
            { key: 'treeCanopyColor',       label: 'Tree Leaves' },
            { key: 'largeHomingColor',      label: 'Giant Homing Bullet' },
            { key: 'warningColor',          label: 'Warning Indicator' },
            { key: 'speedUpColor',          label: 'Speed Up Indicator' },
            { key: 'bounceColor',           label: 'Bounce Indicator' },
            { key: 'zigzagColor',           label: 'Zigzag Indicator' },
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
    }
}

// Singleton instance
const settings = new GameSettings();
export default settings;CSS custom properties to :root */
    applyCSSVariables() {
        const root = document.documentElement;
        root.style.setProperty('--text-color', this.get('textColor'));
        root.style.setProperty('--text-glow-color', this.get('textGlowColor'));
    }
}

// Singleton instance
const settings = new GameSettings();
export default settings;
