const { Adw, Gtk } = imports.gi;

var DialogManager = class DialogManager {
    constructor(app) {
        this.app = app;
    }

    addVimKeybindings(dialog) {
        const keyController = new Gtk.EventControllerKey();
        dialog.add_controller(keyController);

        keyController.connect('key-pressed', (controller, keyval, keycode, state) => {
            const vimKeyMap = {
                104: Gtk.DirectionType.LEFT,  // h
                106: Gtk.DirectionType.DOWN,  // j
                107: Gtk.DirectionType.UP,    // k
                108: Gtk.DirectionType.RIGHT  // l
            };

            if (vimKeyMap[keyval] !== undefined) {
                dialog.child_focus(vimKeyMap[keyval]);
                return true;
            }

            return false;
        });
    }

    showHelpModal(parent) {
        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Keyboard Shortcuts',
            body: `Navigation:
Arrow keys - Navigate through wallpapers
h, j, k, l - Vim-style navigation (left, down, up, right)
Enter - Set selected wallpaper
Tab - Move focus between UI elements

Help:
? - Show this help dialog

Application:
q, Esc - Quit application

Setting Wallpapers:
Enter/Double-click - Choose dark/light mode for selected wallpaper

Theme Ejection:
e - Eject selected wallpaper as a standalone theme`
        });

        dialog.add_response('ok', 'Got it!');
        dialog.set_default_response('ok');
        dialog.set_close_response('ok');

        dialog.connect('response', () => dialog.destroy());
        dialog.present();
    }

    showModeDialog(parent, filePath, fileName, callback) {
        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Choose Theme Mode'
        });

        dialog.add_response('dark', 'Dark Mode');
        dialog.add_response('light', 'Light Mode');
        dialog.add_response('cancel', 'Cancel');

        dialog.set_response_appearance('dark', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('dark');
        dialog.set_close_response('cancel');

        this.addVimKeybindings(dialog);

        dialog.connect('response', (dialog, response) => {
            if (response === 'dark' || response === 'light') {
                callback(filePath, fileName, response === 'light');
            }
            dialog.destroy();
        });

        dialog.present();
    }

    showError(message, parent = null) {
        print(`Error: ${message}`);

        const window = parent || this.app.get_active_window();
        if (window) {
            const dialog = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading: 'Error',
                body: message
            });
            dialog.add_response('ok', 'OK');
            dialog.set_default_response('ok');
            dialog.connect('response', () => dialog.destroy());
            dialog.present();
        }
    }

    showSuccess(message, parent = null) {
        print(`Success: ${message}`);

        const window = parent || this.app.get_active_window();
        if (window) {
            const dialog = new Adw.MessageDialog({
                transient_for: window,
                modal: true,
                heading: 'Success',
                body: message
            });
            dialog.add_response('ok', 'OK');
            dialog.set_default_response('ok');
            dialog.connect('response', () => dialog.destroy());
            dialog.present();
        }
    }

    showThemeEjectionDialog(parent, filePath, fileName, callback) {
        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Eject Theme',
            body: `Create theme from: ${fileName}`
        });

        dialog.add_response('dark', 'Dark Mode');
        dialog.add_response('light', 'Light Mode');
        dialog.add_response('cancel', 'Cancel');

        dialog.set_response_appearance('dark', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('dark');
        dialog.set_close_response('cancel');

        this.addVimKeybindings(dialog);

        dialog.connect('response', (dialog, response) => {
            if (response === 'dark' || response === 'light') {
                const isLight = response === 'light';
                dialog.destroy();
                this.showPathSelectionDialog(parent, filePath, fileName, isLight, callback);
            } else {
                dialog.destroy();
            }
        });

        dialog.present();
    }

    showPathSelectionDialog(parent, filePath, fileName, isLight, callback) {
        const { GLib } = imports.gi;
        const homeDir = GLib.get_home_dir();
        const themeName = fileName.replace(/\.[^.]+$/, '');
        const defaultPath = `${homeDir}/omarchy-${themeName}-theme`;

        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Select Output Path',
            body: 'Enter the path where the theme should be created:'
        });

        const entry = new Gtk.Entry({
            text: defaultPath,
            hexpand: true,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6
        });
        box.append(entry);
        dialog.set_extra_child(box);

        dialog.add_response('create', 'Create Theme');
        dialog.add_response('cancel', 'Cancel');

        dialog.set_response_appearance('create', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('create');
        dialog.set_close_response('cancel');

        dialog.connect('response', (dialog, response) => {
            if (response === 'create') {
                const outputPath = entry.get_text();
                callback(filePath, fileName, isLight, outputPath);
            }
            dialog.destroy();
        });

        dialog.present();
        entry.grab_focus();
    }
};
