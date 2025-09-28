#!/usr/bin/gjs -m

import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';

// Every GJS application needs an ID
const APP_ID = 'com.example.WallpaperViewer';

const TemaApp = GObject.registerClass(
class TemaApp extends Adw.Application {
    constructor() {
        super({ application_id: APP_ID });
        GLib.set_prgname(APP_ID);
    }

    vfunc_activate() {
        const window = new Adw.ApplicationWindow({
            application: this,
            default_width: 800,
            default_height: 600
        });

        // Create header bar
        const headerBar = new Adw.HeaderBar();
        headerBar.set_title_widget(new Gtk.Label({ label: 'Tēma' }));

        // Create main content
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0
        });

        mainBox.append(headerBar);

        // Create scrolled window for the grid
        const scrolled = new Gtk.ScrolledWindow({
            hexpand: true,
            vexpand: true,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });

        // Create grid for images
        const grid = new Gtk.FlowBox({
            valign: Gtk.Align.START,
            max_children_per_line: 6,
            selection_mode: Gtk.SelectionMode.SINGLE,
            column_spacing: 12,
            row_spacing: 12,
            can_focus: true,
            activate_on_single_click: false
        });

        // Connect double-click activation
        grid.connect('child-activated', (flowbox, child) => {
            const box = child.get_child();
            if (box && box._filePath) {
                this.showModeDialog(window, box._filePath, box._fileName);
            }
        });

        scrolled.set_child(grid);
        mainBox.append(scrolled);

        // Load images from ~/Wallpapers/
        this.loadImages(grid);

        // Set up keyboard event handling
        this.setupKeyboardHandling(window, grid);

        window.set_content(mainBox);
        window.present();
    }

    loadImages(grid) {
        const wallpapersPath = GLib.get_home_dir() + '/Wallpapers';
        const wallpapersDir = Gio.File.new_for_path(wallpapersPath);

        if (!wallpapersDir.query_exists(null)) {
            const label = new Gtk.Label({
                label: 'Wallpapers directory not found!',
                margin_top: 50
            });
            grid.append(label);
            return;
        }

        try {
            const enumerator = wallpapersDir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();
                const filePath = wallpapersPath + '/' + fileName;

                // Check if it's an image file
                if (this.isImageFile(fileName)) {
                    this.createImageThumbnail(grid, filePath, fileName);
                }
            }

            enumerator.close(null);
        } catch (error) {
            print('Error reading wallpapers directory:', error.message);
            const label = new Gtk.Label({
                label: 'Error reading wallpapers directory',
                margin_top: 50
            });
            grid.append(label);
        }
    }

    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const lowerFileName = fileName.toLowerCase();
        return imageExtensions.some(ext => lowerFileName.endsWith(ext));
    }

    createImageThumbnail(grid, filePath, fileName) {
        try {
            // Load the image and create thumbnail
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                filePath,
                128,
                128,
                true
            );

            // Create image widget
            const image = new Gtk.Picture();
            image.set_pixbuf(pixbuf);
            image.set_can_shrink(false);

            // Create label for filename
            const label = new Gtk.Label({
                label: fileName,
                ellipsize: 3, // PANGO_ELLIPSIZE_END
                max_width_chars: 15,
                margin_top: 6
            });

            // Create container box
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 6,
                margin_top: 6,
                margin_bottom: 6,
                margin_start: 6,
                margin_end: 6
            });

            box.append(image);
            box.append(label);

            // Store the file path in the box for later use
            box._filePath = filePath;
            box._fileName = fileName;

            // Add to grid
            grid.append(box);

        } catch (error) {
            print(`Error loading image ${fileName}:`, error.message);
        }
    }

    setupKeyboardHandling(window, grid) {
        // Create event controller for key events
        const keyController = new Gtk.EventControllerKey();
        window.add_controller(keyController);

        keyController.connect('key-pressed', (controller, keyval, keycode, state) => {
            // Handle Enter key
            if (keyval === 65293) { // GDK_KEY_Return
                const selected = grid.get_selected_children();
                if (selected.length > 0) {
                    const selectedBox = selected[0].get_child();
                    if (selectedBox && selectedBox._filePath) {
                        this.showModeDialog(window, selectedBox._filePath, selectedBox._fileName);
                    }
                }
                return true;
            }
            return false;
        });

        // Make sure the grid can receive focus
        grid.grab_focus();
    }

    showModeDialog(parent, filePath, fileName) {
        // Create dialog
        const dialog = new Adw.MessageDialog({
            transient_for: parent,
            modal: true,
            heading: 'Choose Theme Mode',
            body: `Set wallpaper: ${fileName}`
        });

        dialog.add_response('dark', '🌙 Dark Mode');
        dialog.add_response('light', '☀️ Light Mode');
        dialog.add_response('cancel', 'Cancel');

        dialog.set_response_appearance('dark', Adw.ResponseAppearance.SUGGESTED);
        dialog.set_default_response('dark');
        dialog.set_close_response('cancel');

        dialog.connect('response', (dialog, response) => {
            if (response === 'dark' || response === 'light') {
                this.setWallpaper(filePath, fileName, response === 'light');
            }
            dialog.destroy();
        });

        dialog.present();
    }

    setWallpaper(imagePath, fileName, lightMode) {
        try {
            // Check if wal is available
            const subprocess = new Gio.Subprocess({
                argv: ['which', 'wal'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            subprocess.init(null);

            const [, stdout, stderr] = subprocess.communicate_utf8(null, null);

            if (!subprocess.get_successful()) {
                this.showError('Error: wal not found. Please install pywal.');
                return;
            }

            // Run wal command
            const walArgs = lightMode ? ['wal', '-l', '-i', imagePath] : ['wal', '-i', imagePath];
            const walProcess = new Gio.Subprocess({
                argv: walArgs,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            walProcess.init(null);

            const [, walStdout, walStderr] = walProcess.communicate_utf8(null, null);

            if (walProcess.get_successful()) {
                const mode = lightMode ? 'light' : 'dark';
                print(`Wallpaper and colors set using wal (${mode} mode): ${fileName}`);

                // Generate templates
                this.generateTemplates();

                this.showSuccess(`Wallpaper set successfully!\n${fileName} (${mode} mode)`);
            } else {
                this.showError(`Error running wal: ${walStderr}`);
            }

        } catch (error) {
            this.showError(`Error: ${error.message}`);
        }
    }

    generateTemplates() {
        try {
            // Get the directory where the script is located
            const scriptDir = GLib.path_get_dirname(GLib.get_current_dir() + '/init.js');
            const templateScript = scriptDir + '/pywal-templates.sh';

            // Check if template script exists
            const scriptFile = Gio.File.new_for_path(templateScript);
            if (!scriptFile.query_exists(null)) {
                print('Template script not found:', templateScript);
                return;
            }

            // Run template generation script
            const templateProcess = new Gio.Subprocess({
                argv: [templateScript],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            templateProcess.init(null);

            const [, templateStdout, templateStderr] = templateProcess.communicate_utf8(null, null);

            if (templateProcess.get_successful()) {
                print('Templates generated successfully');
            } else {
                print('Error generating templates:', templateStderr);
            }

        } catch (error) {
            print('Error running template generation:', error.message);
        }
    }

    showError(message) {
        print(`Error: ${message}`);
    }

    showSuccess(message) {
        print(`Success: ${message}`);
    }
});

new TemaApp().run(null);
