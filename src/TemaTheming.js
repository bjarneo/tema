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

    generateDynamicCSS(isDark) {
        if (isDark) {
            return `
/* Main window background - Dark mode */
window {
    background-color: rgba(10, 10, 20, 0.95);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
`;
        } else {
            return `
/* Main window background - Light mode */
window {
    background-color: rgba(245, 245, 250, 0.95);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
`;
        }
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