const { Gtk, Gdk, GLib, Gio } = imports.gi;

var TemaTheming = class TemaTheming {
    constructor() {
        this.dynamicCssProvider = new Gtk.CssProvider();
        this.setupColorSchemeMonitor();
    }

    setupColorSchemeMonitor() {
        try {
            const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
            settings.connect('changed::color-scheme', () => {
                print('Color scheme changed, reapplying theming...');
                this.applyDynamicTheming();
            });
        } catch (e) {
            print('Could not setup color scheme monitor:', e.message);
        }
    }

    getSystemColorScheme() {
        try {
            const [success, stdout] = GLib.spawn_command_line_sync('gsettings get org.gnome.desktop.interface color-scheme');
            if (success) {
                const output = new TextDecoder().decode(stdout).trim().replace(/'/g, '');
                return output === 'prefer-dark';
            }
        } catch (e) {
            print('Could not detect color scheme:', e.message);
        }
        return true; // Default to dark
    }

    getPywalBackgroundColor() {
        try {
            const pywalColorsPath = GLib.get_home_dir() + '/.cache/wal/colors';
            const file = Gio.File.new_for_path(pywalColorsPath);

            if (!file.query_exists(null)) {
                return null;
            }

            const [success, contents] = file.load_contents(null);
            if (success) {
                const text = new TextDecoder().decode(contents);
                const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));

                if (lines.length > 0) {
                    return lines[0].trim();
                }
            }
        } catch (e) {
            print('Could not read pywal colors:', e.message);
        }
        return null;
    }

    hexToRgba(hex, alpha = 0.95) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    generateDynamicCSS(isDark) {
        const pywalBg = this.getPywalBackgroundColor();
        let backgroundColor;

        if (pywalBg) {
            backgroundColor = this.hexToRgba(pywalBg, 0.95);
            print('Using pywal background color:', pywalBg, '->', backgroundColor);
        } else {
            // Fallback to current dark/light mode
            backgroundColor = isDark ? 'rgba(10, 10, 20, 0.95)' : 'rgba(245, 245, 250, 0.95)';
            print('Pywal color not found, using fallback:', backgroundColor);
        }

        const boxShadow = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';

        return `
/* Main window background */
window {
    background-color: ${backgroundColor};
    box-shadow: 0 4px 20px ${boxShadow};
}
`;
    }

    applyDynamicTheming(forceDark = null) {
        const isDark = forceDark !== null ? forceDark : this.getSystemColorScheme();

        try {
            const css = this.generateDynamicCSS(isDark);
            this.dynamicCssProvider.load_from_string(css);
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                this.dynamicCssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 1
            );
            print('✓ Dynamic theming applied (', isDark ? 'dark' : 'light', 'mode)');
        } catch (error) {
            print('Error applying dynamic theming:', error.message);
        }
    }
};