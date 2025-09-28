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

        // Create main content
        const mainBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0
        });

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

            const imageFiles = [];
            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();
                const filePath = wallpapersPath + '/' + fileName;

                // Check if it's an image file
                if (this.isImageFile(fileName)) {
                    imageFiles.push({ filePath, fileName });
                }
            }

            enumerator.close(null);

            // Load thumbnails asynchronously
            this.loadThumbnailsAsync(grid, imageFiles, 0);

        } catch (error) {
            print('Error reading wallpapers directory:', error.message);
            const label = new Gtk.Label({
                label: 'Error reading wallpapers directory',
                margin_top: 50
            });
            grid.append(label);
        }
    }

    loadThumbnailsAsync(grid, imageFiles, index) {
        if (index >= imageFiles.length) {
            return; // All thumbnails loaded
        }

        const { filePath, fileName } = imageFiles[index];

        // Create placeholder first for immediate feedback
        const placeholder = this.createPlaceholder(grid, filePath, fileName);

        // Load thumbnail asynchronously using GLib.idle_add
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try {
                this.loadThumbnailForPlaceholder(placeholder, filePath, fileName);
            } catch (error) {
                print(`Error loading thumbnail for ${fileName}:`, error.message);
            }

            // Load next thumbnail
            this.loadThumbnailsAsync(grid, imageFiles, index + 1);
            return GLib.SOURCE_REMOVE;
        });
    }

    createPlaceholder(grid, filePath, fileName) {
        // Create placeholder with spinner
        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 128,
            height_request: 128
        });

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

        box.append(spinner);
        box.append(label);

        // Store the file path in the box for later use
        box._filePath = filePath;
        box._fileName = fileName;
        box._spinner = spinner;

        // Add to grid
        grid.append(box);

        return box;
    }

    loadThumbnailForPlaceholder(placeholder, filePath, fileName) {
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

            // Replace spinner with image
            const spinner = placeholder._spinner;
            placeholder.remove(spinner);
            placeholder.prepend(image);

        } catch (error) {
            print(`Error loading image ${fileName}:`, error.message);
            // Replace spinner with error icon
            const spinner = placeholder._spinner;
            placeholder.remove(spinner);

            const errorLabel = new Gtk.Label({
                label: '❌',
                width_request: 128,
                height_request: 128
            });
            placeholder.prepend(errorLabel);
        }
    }

    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const lowerFileName = fileName.toLowerCase();
        return imageExtensions.some(ext => lowerFileName.endsWith(ext));
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
            // Check if wal is available - try multiple locations
            let walPath = null;
            const possiblePaths = [
                'wal',  // Try PATH first
                '/usr/bin/wal',
                '/usr/local/bin/wal',
                GLib.get_home_dir() + '/.local/bin/wal',
                '/bin/wal'
            ];

            for (const path of possiblePaths) {
                try {
                    const subprocess = new Gio.Subprocess({
                        argv: ['test', '-x', path],
                        flags: Gio.SubprocessFlags.NONE
                    });
                    subprocess.init(null);
                    subprocess.wait(null);

                    if (subprocess.get_successful()) {
                        walPath = path;
                        break;
                    }
                } catch (e) {
                    // Continue to next path
                }
            }

            if (!walPath) {
                this.showError('Error: wal not found. Please install pywal.\nChecked paths: ' + possiblePaths.join(', '));
                return;
            }

            // Show spinner dialog
            const spinnerDialog = this.showSpinnerDialog();

            // Run wal command asynchronously with proper environment
            const walArgs = lightMode ? [walPath, '-l', '-i', imagePath] : [walPath, '-i', imagePath];

            // Set up environment variables for wal
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });

            // Ensure HOME is set
            launcher.setenv('HOME', GLib.get_home_dir(), true);
            // Add .local/bin to PATH if not present
            const currentPath = GLib.getenv('PATH') || '';
            const localBin = GLib.get_home_dir() + '/.local/bin';
            if (!currentPath.includes(localBin)) {
                launcher.setenv('PATH', currentPath + ':' + localBin, true);
            }

            const walProcess = launcher.spawnv(walArgs);

            // Use async communication
            walProcess.communicate_utf8_async(null, null, (source, result) => {
                try {
                    const [, walStdout, walStderr] = walProcess.communicate_utf8_finish(result);

                    // Close spinner dialog
                    spinnerDialog.destroy();

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
                    spinnerDialog.destroy();
                    this.showError(`Error: ${error.message}`);
                }
            });

        } catch (error) {
            this.showError(`Error: ${error.message}`);
        }
    }

    showSpinnerDialog() {
        // Create spinner dialog
        const dialog = new Adw.MessageDialog({
            transient_for: this.get_active_window(),
            modal: true,
            heading: 'Processing...',
            body: 'Generating colors with pywal...'
        });

        // Create spinner
        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 32,
            height_request: 32,
            margin_top: 12,
            margin_bottom: 12
        });

        // Add spinner to dialog
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12
        });
        box.append(spinner);
        dialog.set_extra_child(box);

        dialog.present();
        return dialog;
    }

    generateTemplates() {
        try {
            print('Generating templates with pywal colors...');

            // Get colors from pywal
            const colors = this.readPywalColors();
            if (!colors) {
                print('Error: Could not read pywal colors');
                return;
            }

            const homeDir = GLib.get_home_dir();
            const configBase = homeDir + '/.config';
            // Find templates directory - try multiple locations
            let templatesDir = null;
            const possibleTemplateDirs = [
                // If running from source directory
                GLib.get_current_dir() + '/templates',
                // If import.meta.url is available
                typeof import.meta !== 'undefined' && import.meta.url ?
                    GLib.path_get_dirname(import.meta.url.replace('file://', '')) + '/templates' : null,
                // Common installation locations
                '/usr/share/tema/templates',
                '/usr/local/share/tema/templates',
                GLib.get_home_dir() + '/.local/share/tema/templates',
                // Look in Code directory
                GLib.get_home_dir() + '/Code/tema/templates'
            ].filter(path => path !== null);

            for (const dir of possibleTemplateDirs) {
                const templatesDirFile = Gio.File.new_for_path(dir);
                if (templatesDirFile.query_exists(null)) {
                    templatesDir = dir;
                    break;
                }
            }

            const temaThemeDir = configBase + '/omarchy/themes/tema';

            // Debug output
            print('Templates directory:', templatesDir);
            print('Tema theme directory:', temaThemeDir);
            print('Checked paths:', possibleTemplateDirs.join(', '));

            // Check if templates directory was found
            if (!templatesDir) {
                this.showError(`Templates directory not found!\nChecked paths:\n${possibleTemplateDirs.join('\n')}`);
                return;
            }

            // Template mappings: [template_file, tema_output]
            const templateMappings = [
                ['alacritty.toml', temaThemeDir + '/alacritty.toml'],
                ['waybar.css', temaThemeDir + '/waybar.css'],
                ['hyprland.conf', temaThemeDir + '/hyprland.conf'],
                ['mako.ini', temaThemeDir + '/mako.ini'],
                ['ghostty.conf', temaThemeDir + '/ghostty.conf'],
                ['wofi.css', temaThemeDir + '/wofi.css'],
                ['btop.theme', temaThemeDir + '/btop.theme'],
                ['swayosd.css', temaThemeDir + '/swayosd.css'],
                ['walker.css', temaThemeDir + '/walker.css'],
                ['hyprlock.conf', temaThemeDir + '/hyprlock.conf']
            ];

            // Process each template
            for (const [templateName, temaOutput] of templateMappings) {
                const templateFile = Gio.File.new_for_path(templatesDir + '/' + templateName);
                if (templateFile.query_exists(null)) {
                    this.processTemplate(templateFile.get_path(), temaOutput, colors);
                }
            }

            // Copy static files (non-template files) to tema theme directory
            const staticFiles = ['README.md', 'theme.png', 'neovim.lua', 'chromium.theme', 'icons.theme'];
            for (const staticFile of staticFiles) {
                const sourceFile = Gio.File.new_for_path(templatesDir + '/' + staticFile);
                const destFile = Gio.File.new_for_path(temaThemeDir + '/' + staticFile);
                if (sourceFile.query_exists(null)) {
                    try {
                        sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
                        print('✓ Copied static file:', staticFile);
                    } catch (error) {
                        print('Warning: Could not copy', staticFile, ':', error.message);
                    }
                }
            }

            // Handle light mode detection and file creation
            this.handleLightMode(colors, temaThemeDir);

            // Symlink wallpapers to backgrounds
            this.symlinkWallpapers(homeDir, temaThemeDir);

            // Apply the tema theme with Omarchy first
            this.applyOmarchyTheme();

            // Set current wallpaper as Omarchy background AFTER theme is applied
            this.setOmarchyBackground(colors, configBase);

            print('✓ Template generation complete!');

        } catch (error) {
            print('Error in template generation:', error.message);
        }
    }

    readPywalColors() {
        try {
            const colorsFile = Gio.File.new_for_path(GLib.get_home_dir() + '/.cache/wal/colors.json');
            if (!colorsFile.query_exists(null)) {
                return null;
            }

            const [success, content] = colorsFile.load_contents(null);
            if (!success) {
                return null;
            }

            const decoder = new TextDecoder('utf-8');
            const jsonContent = decoder.decode(content);
            const data = JSON.parse(jsonContent);

            const colors = {
                background: data.special.background,
                foreground: data.special.foreground,
                cursor: data.special.cursor,
                wallpaper: data.wallpaper
            };

            for (let i = 0; i < 16; i++) {
                colors[`color${i}`] = data.colors[`color${i}`];
            }

            return colors;
        } catch (error) {
            print('Error reading pywal colors:', error.message);
            return null;
        }
    }

    processTemplate(templatePath, outputPath, colors) {
        try {
            const templateFile = Gio.File.new_for_path(templatePath);
            const [success, content] = templateFile.load_contents(null);
            if (!success) {
                print('Error reading template:', templatePath);
                return;
            }

            const decoder = new TextDecoder('utf-8');
            let templateContent = decoder.decode(content);

            // Replace color variables
            for (const [key, value] of Object.entries(colors)) {
                // Handle .strip for removing # from hex colors
                templateContent = templateContent.replace(
                    new RegExp(`\\{${key}\\.strip\\}`, 'g'),
                    value.replace('#', '')
                );
                templateContent = templateContent.replace(
                    new RegExp(`\\{${key}\\}`, 'g'),
                    value
                );
            }

            // Create output directory if it doesn't exist
            const outputFile = Gio.File.new_for_path(outputPath);
            const outputDir = outputFile.get_parent();
            if (!outputDir.query_exists(null)) {
                outputDir.make_directory_with_parents(null);
            }

            // Write processed content
            const encoder = new TextEncoder('utf-8');
            const encodedContent = encoder.encode(templateContent);
            outputFile.replace_contents(encodedContent, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

            print('✓ Generated:', outputPath);
        } catch (error) {
            print('Error processing template:', templatePath, error.message);
        }
    }

    handleLightMode(colors, temaThemeDir) {
        try {
            // Calculate luminance to detect light mode
            const bg = colors.background;
            const r = parseInt(bg.substring(1, 3), 16);
            const g = parseInt(bg.substring(3, 5), 16);
            const b = parseInt(bg.substring(5, 7), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            const lightModeFile = Gio.File.new_for_path(temaThemeDir + '/light.mode');

            if (luminance > 0.5) {
                // Light mode - create file
                lightModeFile.create(Gio.FileCreateFlags.NONE, null);
                print('✓ Light mode detected - created light.mode file');
            } else {
                // Dark mode - remove file if it exists
                if (lightModeFile.query_exists(null)) {
                    lightModeFile.delete(null);
                    print('✓ Dark mode detected - removed light.mode file');
                }
            }
        } catch (error) {
            print('Error handling light mode:', error.message);
        }
    }

    symlinkWallpapers(homeDir, temaThemeDir) {
        try {
            const wallpapersDir = homeDir + '/Wallpapers';
            const backgroundsDir = temaThemeDir + '/backgrounds';

            const wallpapersFile = Gio.File.new_for_path(wallpapersDir);
            const backgroundsFile = Gio.File.new_for_path(backgroundsDir);

            if (wallpapersFile.query_exists(null)) {
                // Remove existing backgrounds directory/symlink if it exists
                if (backgroundsFile.query_exists(null)) {
                    if (backgroundsFile.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null) === Gio.FileType.SYMBOLIC_LINK) {
                        backgroundsFile.delete(null);
                    } else {
                        // Remove directory recursively (simplified)
                        const deleteProcess = new Gio.Subprocess({
                            argv: ['rm', '-rf', backgroundsDir],
                            flags: Gio.SubprocessFlags.NONE
                        });
                        deleteProcess.init(null);
                        deleteProcess.wait(null);
                    }
                }

                // Create symlink
                backgroundsFile.make_symbolic_link(wallpapersDir, null);
                print('✓ Symlinked', wallpapersDir, 'to', backgroundsDir);
            } else {
                print('Warning:', wallpapersDir, 'directory not found');
            }
        } catch (error) {
            print('Error symlinking wallpapers:', error.message);
        }
    }

    setOmarchyBackground(colors, configBase) {
        try {
            if (!colors.wallpaper) {
                print('Warning: Could not determine current wallpaper from pywal');
                return;
            }

            const wallpaperFile = Gio.File.new_for_path(colors.wallpaper);
            if (!wallpaperFile.query_exists(null)) {
                print('Warning: Wallpaper file does not exist:', colors.wallpaper);
                return;
            }

            // Validate that this is actually an image file
            if (!this.isImageFile(colors.wallpaper)) {
                print('Warning: File is not a recognized image format:', colors.wallpaper);
                return;
            }

            const backgroundLink = configBase + '/omarchy/current/background';
            const backgroundFile = Gio.File.new_for_path(backgroundLink);

            // Remove existing symlink if it exists
            if (backgroundFile.query_exists(null)) {
                backgroundFile.delete(null);
            }

            // Create new symlink to the actual image file
            backgroundFile.make_symbolic_link(colors.wallpaper, null);
            print('✓ Set background symlink:', colors.wallpaper);

            // Restart swaybg if running
            this.restartSwaybg(backgroundLink);

        } catch (error) {
            print('Error setting Omarchy background:', error.message);
        }
    }

    restartSwaybg(backgroundLink) {
        try {
            // Check if swaybg is running
            const checkProcess = new Gio.Subprocess({
                argv: ['pgrep', '-x', 'swaybg'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE
            });
            checkProcess.init(null);
            const [, stdout] = checkProcess.communicate_utf8(null, null);

            if (checkProcess.get_successful() && stdout.trim()) {
                // Kill existing swaybg
                const killProcess = new Gio.Subprocess({
                    argv: ['pkill', '-x', 'swaybg'],
                    flags: Gio.SubprocessFlags.NONE
                });
                killProcess.init(null);
                killProcess.wait(null);

                // Start new swaybg
                const startArgs = ['swaybg', '-i', backgroundLink, '-m', 'fill'];

                // Check if uwsm is available
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

    applyOmarchyTheme() {
        try {
            // Check if omarchy-theme-set is available
            const checkProcess = new Gio.Subprocess({
                argv: ['which', 'omarchy-theme-set'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE
            });
            checkProcess.init(null);
            checkProcess.wait(null);

            if (checkProcess.get_successful()) {
                const applyProcess = new Gio.Subprocess({
                    argv: ['omarchy-theme-set', 'tema'],
                    flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                });
                applyProcess.init(null);
                const [, stdout, stderr] = applyProcess.communicate_utf8(null, null);

                if (applyProcess.get_successful()) {
                    print('✓ Omarchy tema theme applied!');
                } else {
                    print('Error applying Omarchy theme:', stderr);
                }
            } else {
                print('Warning: omarchy-theme-set command not found');
            }
        } catch (error) {
            print('Error applying Omarchy theme:', error.message);
        }
    }

    showError(message) {
        print(`Error: ${message}`);

        // Also show error dialog if we have a window
        const window = this.get_active_window();
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

    showSuccess(message) {
        print(`Success: ${message}`);

        // Also show success dialog if we have a window
        const window = this.get_active_window();
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
});

new TemaApp().run(null);
