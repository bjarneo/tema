const { Adw, Gtk } = imports.gi;

var DialogManager = class DialogManager {
    constructor(app) {
        this.app = app;
    }

    showHelpModal(parent) {
        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Keyboard Shortcuts',
            body: `Navigation:
Arrow keys - Navigate through wallpapers
Enter - Set selected wallpaper
Tab - Move focus between UI elements

Help:
? - Show this help dialog

Application:
q, Esc - Quit application

Setting Wallpapers:
Enter/Double-click - Choose dark/light mode for selected wallpaper`
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
            heading: 'Choose Theme Mode',
            body: `Set wallpaper: ${fileName}`
        });

        dialog.add_response('dark', 'Dark Mode');
        dialog.add_response('light', 'Light Mode');
        dialog.add_response('cancel', 'Cancel');

        dialog.set_response_appearance('dark', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('dark');
        dialog.set_close_response('cancel');

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
};
