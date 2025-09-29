const { GLib, Gio, Adw, Gtk } = imports.gi;

var WallpaperManager = class WallpaperManager {
    constructor(app) {
        this.app = app;
    }

    setWallpaper(imagePath, fileName, lightMode) {
        try {
            const walPath = this.findWalExecutable();
            if (!walPath) {
                this.app.showError('Error: wal not found. Please install pywal.\nChecked paths: ' + this.getWalPaths().join(', '));
                return;
            }

            const spinnerDialog = this.showSpinnerDialog();
            this.executeWal(walPath, imagePath, lightMode, spinnerDialog, fileName);
        } catch (error) {
            this.app.showError(`Error: ${error.message}`);
        }
    }

    findWalExecutable() {
        const possiblePaths = this.getWalPaths();

        for (const path of possiblePaths) {
            try {
                const subprocess = new Gio.Subprocess({
                    argv: ['test', '-x', path],
                    flags: Gio.SubprocessFlags.NONE
                });
                subprocess.init(null);
                subprocess.wait(null);

                if (subprocess.get_successful()) {
                    return path;
                }
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    getWalPaths() {
        return [
            'wal',
            '/usr/bin/wal',
            '/usr/local/bin/wal',
            GLib.get_home_dir() + '/.local/bin/wal',
            '/bin/wal'
        ];
    }

    executeWal(walPath, imagePath, lightMode, spinnerDialog, fileName) {
        try {
            const walArgs = lightMode ? [walPath, '-n', '-l', '-i', imagePath] : [walPath, '-n', '-i', imagePath];

            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });

            this.setupEnvironment(launcher);
            const walProcess = launcher.spawnv(walArgs);

            walProcess.communicate_utf8_async(null, null, (source, result) => {
                try {
                    const [, walStdout, walStderr] = walProcess.communicate_utf8_finish(result);
                    spinnerDialog.destroy();

                    if (walProcess.get_successful()) {
                        const mode = lightMode ? 'light' : 'dark';
                        print(`Wallpaper and colors set using wal (${mode} mode): ${fileName}`);
                        this.app.themeGenerator.generateTemplates();
                    } else {
                        this.app.showError(`Error running wal: ${walStderr}`);
                    }
                } catch (error) {
                    spinnerDialog.destroy();
                    this.app.showError(`Error: ${error.message}`);
                }
            });
        } catch (error) {
            this.app.showError(`Error: ${error.message}`);
        }
    }

    setupEnvironment(launcher) {
        launcher.setenv('HOME', GLib.get_home_dir(), true);

        const currentPath = GLib.getenv('PATH') || '';
        const localBin = GLib.get_home_dir() + '/.local/bin';
        if (!currentPath.includes(localBin)) {
            launcher.setenv('PATH', currentPath + ':' + localBin, true);
        }
    }

    showSpinnerDialog() {
        const dialog = new Adw.MessageDialog({
            transient_for: this.app.get_active_window(),
            modal: true,
            heading: 'Processing...',
            body: 'Generating colors with pywal...'
        });

        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 32,
            height_request: 32,
            margin_top: 12,
            margin_bottom: 12
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12
        });
        box.append(spinner);
        dialog.set_extra_child(box);

        dialog.present();
        return dialog;
    }

    restartSwaybg(backgroundLink) {
        try {
            const checkProcess = new Gio.Subprocess({
                argv: ['pgrep', '-x', 'swaybg'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE
            });
            checkProcess.init(null);
            const [, stdout] = checkProcess.communicate_utf8(null, null);

            if (checkProcess.get_successful() && stdout.trim()) {
                const killProcess = new Gio.Subprocess({
                    argv: ['pkill', '-x', 'swaybg'],
                    flags: Gio.SubprocessFlags.NONE
                });
                killProcess.init(null);
                killProcess.wait(null);

                const startArgs = ['swaybg', '-i', backgroundLink, '-m', 'fill'];

                const uwsmCheck = new Gio.Subprocess({
                    argv: ['which', 'uwsm'],
                    flags: Gio.SubprocessFlags.STDOUT_PIPE
                });
                uwsmCheck.init(null);
                uwsmCheck.wait(null);

                if (uwsmCheck.get_successful()) {
                    startArgs.unshift('uwsm', 'app', '--');
                }

                const startProcess = new Gio.Subprocess({
                    argv: startArgs,
                    flags: Gio.SubprocessFlags.NONE
                });
                startProcess.init(null);

                print('✓ Restarted swaybg with new background');
            }
        } catch (error) {
            print('Error restarting swaybg:', error.message);
        }
    }
};