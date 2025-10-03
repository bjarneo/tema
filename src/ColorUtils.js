var ColorUtils = class ColorUtils {
    static stripHash(hex) {
        return hex.replace('#', '');
    }

    static hexToRgb(hex) {
        const cleanHex = this.stripHash(hex);
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `${r} ${g} ${b}`;
    }

    static hexToRgba(hex, alpha = 0.95) {
        const cleanHex = this.stripHash(hex);
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    static calculateLuminance(hex) {
        const cleanHex = this.stripHash(hex);
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }
};
