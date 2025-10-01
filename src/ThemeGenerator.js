const { GLib, Gio } = imports.gi;

var ThemeGenerator = class ThemeGenerator {
    constructor(app) {
        this.app = app;
    }

    generateTemplates() {
        try {
            print('Generating templates with pywal colors...');

            const colors = this.readPywalColors();
            if (!colors) {
                print('Error: Could not read pywal colors');
                return;
            }

            const homeDir = GLib.get_home_dir();
            const configBase = homeDir + '/.config';
            const templatesDir = this.findTemplatesDirectory();

            if (!templatesDir) {
                const possibleDirs = this.getTemplatePaths();
                this.app.showError(`Templates directory not found!\nChecked paths:\n${possibleDirs.join('\n')}`);
                return;
            }

            const temaThemeDir = configBase + '/omarchy/themes/tema';

            print('Templates directory:', templatesDir);
            print('Tema theme directory:', temaThemeDir);

            this.processTemplates(templatesDir, temaThemeDir, colors);
            this.copyStaticFiles(templatesDir, temaThemeDir);
            this.handleLightMode(colors, temaThemeDir);
            this.symlinkWallpapers(homeDir, temaThemeDir);
            this.applyOmarchyTheme();
            this.setOmarchyBackground(colors, configBase);

            print('✓ Template generation complete!');

            // Apply dynamic theming after theme is set successfully
            this.app.temaTheming.applyDynamicTheming();
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

    findTemplatesDirectory() {
        const possibleDirs = this.getTemplatePaths();

        for (const dir of possibleDirs) {
            const templatesDirFile = Gio.File.new_for_path(dir);
            if (templatesDirFile.query_exists(null)) {
                return dir;
            }
        }
        return null;
    }

    getTemplatePaths() {
        return [
            GLib.get_current_dir() + '/templates',
            '/usr/share/tema/templates',
            '/usr/local/share/tema/templates',
            GLib.get_home_dir() + '/.local/share/tema/templates',
            GLib.get_home_dir() + '/Code/tema/templates'
        ];
    }

    processTemplates(templatesDir, temaThemeDir, colors) {
        const templateMappings = [
            ['alacritty.toml', temaThemeDir + '/alacritty.toml'],
            ['kitty.conf', temaThemeDir + '/kitty.conf'],
            ['waybar.css', temaThemeDir + '/waybar.css'],
            ['hyprland.conf', temaThemeDir + '/hyprland.conf'],
            ['mako.ini', temaThemeDir + '/mako.ini'],
            ['ghostty.conf', temaThemeDir + '/ghostty.conf'],
            ['wofi.css', temaThemeDir + '/wofi.css'],
            ['btop.theme', temaThemeDir + '/btop.theme'],
            ['swayosd.css', temaThemeDir + '/swayosd.css'],
            ['walker.css', temaThemeDir + '/walker.css'],
            ['hyprlock.conf', temaThemeDir + '/hyprlock.conf'],
            ['chromium.theme', temaThemeDir + '/chromium.theme']
        ];

        for (const [templateName, temaOutput] of templateMappings) {
            const templateFile = Gio.File.new_for_path(templatesDir + '/' + templateName);
            if (templateFile.query_exists(null)) {
                this.processTemplate(templateFile.get_path(), temaOutput, colors);
            }
        }
    }

    hexToRgb(hex) {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        return `${r} ${g} ${b}`;
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

            for (const [key, value] of Object.entries(colors)) {
                templateContent = templateContent.replace(
                    new RegExp(`\\{${key}\\.strip\\}`, 'g'),
                    value.replace('#', '')
                );
                templateContent = templateContent.replace(
                    new RegExp(`\\{${key}\\.rgb\\}`, 'g'),
                    this.hexToRgb(value)
                );
                templateContent = templateContent.replace(
                    new RegExp(`\\{${key}\\}`, 'g'),
                    value
                );
            }

            const outputFile = Gio.File.new_for_path(outputPath);
            const outputDir = outputFile.get_parent();
            if (!outputDir.query_exists(null)) {
                outputDir.make_directory_with_parents(null);
            }

            const encoder = new TextEncoder('utf-8');
            const encodedContent = encoder.encode(templateContent);
            outputFile.replace_contents(encodedContent, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

            print('✓ Generated:', outputPath);
        } catch (error) {
            print('Error processing template:', templatePath, error.message);
        }
    }

    copyStaticFiles(templatesDir, temaThemeDir) {
        const staticFiles = ['neovim.lua', 'icons.theme'];

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
    }

    handleLightMode(colors, temaThemeDir) {
        try {
            const bg = colors.background;
            const r = parseInt(bg.substring(1, 3), 16);
            const g = parseInt(bg.substring(3, 5), 16);
            const b = parseInt(bg.substring(5, 7), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            const lightModeFile = Gio.File.new_for_path(temaThemeDir + '/light.mode');

            if (luminance > 0.5) {
                lightModeFile.create(Gio.FileCreateFlags.NONE, null);
                print('✓ Light mode detected - created light.mode file');
            } else {
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
                if (backgroundsFile.query_exists(null)) {
                    if (backgroundsFile.query_file_type(Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null) === Gio.FileType.SYMBOLIC_LINK) {
                        backgroundsFile.delete(null);
                    } else {
                        const deleteProcess = new Gio.Subprocess({
                            argv: ['rm', '-rf', backgroundsDir],
                            flags: Gio.SubprocessFlags.NONE
                        });
                        deleteProcess.init(null);
                        deleteProcess.wait(null);
                    }
                }

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

            if (!this.isImageFile(colors.wallpaper)) {
                print('Warning: File is not a recognized image format:', colors.wallpaper);
                return;
            }

            const backgroundLink = configBase + '/omarchy/current/background';
            const backgroundFile = Gio.File.new_for_path(backgroundLink);

            if (backgroundFile.query_exists(null)) {
                backgroundFile.delete(null);
            }

            backgroundFile.make_symbolic_link(colors.wallpaper, null);
            print('✓ Set background symlink:', colors.wallpaper);

            this.app.wallpaperManager.restartSwaybg(backgroundLink);
        } catch (error) {
            print('Error setting Omarchy background:', error.message);
        }
    }

    applyOmarchyTheme() {
        try {
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

    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const lowerFileName = fileName.toLowerCase();
        return imageExtensions.some(ext => lowerFileName.endsWith(ext));
    }

    ejectTheme(imagePath, fileName, lightMode, outputPath) {
        try {
            print(`Ejecting theme to: ${outputPath}`);

            // First, run wal to generate colors
            const walPath = this.app.wallpaperManager.findWalExecutable();
            if (!walPath) {
                this.app.showError('Error: wal not found. Please install pywal.');
                return;
            }

            const spinnerDialog = this.showEjectionSpinner();
            this.runWalAndEject(walPath, imagePath, lightMode, outputPath, fileName, spinnerDialog);
        } catch (error) {
            this.app.showError(`Error ejecting theme: ${error.message}`);
        }
    }

    runWalAndEject(walPath, imagePath, lightMode, outputPath, fileName, spinnerDialog) {
        try {
            const walArgs = lightMode ? [walPath, '-n', '-l', '-i', imagePath] : [walPath, '-n', '-i', imagePath];

            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });

            launcher.setenv('HOME', GLib.get_home_dir(), true);
            const currentPath = GLib.getenv('PATH') || '';
            const localBin = GLib.get_home_dir() + '/.local/bin';
            if (!currentPath.includes(localBin)) {
                launcher.setenv('PATH', currentPath + ':' + localBin, true);
            }

            const walProcess = launcher.spawnv(walArgs);

            walProcess.communicate_utf8_async(null, null, (source, result) => {
                try {
                    const [, walStdout, walStderr] = walProcess.communicate_utf8_finish(result);

                    if (walProcess.get_successful()) {
                        const colors = this.readPywalColors();
                        if (colors) {
                            this.createEjectedTheme(outputPath, colors, imagePath, spinnerDialog);
                        } else {
                            spinnerDialog.destroy();
                            this.app.showError('Error: Could not read pywal colors');
                        }
                    } else {
                        spinnerDialog.destroy();
                        this.app.showError(`Error running wal: ${walStderr}`);
                    }
                } catch (error) {
                    spinnerDialog.destroy();
                    this.app.showError(`Error: ${error.message}`);
                }
            });
        } catch (error) {
            spinnerDialog.destroy();
            this.app.showError(`Error: ${error.message}`);
        }
    }

    createEjectedTheme(outputPath, colors, imagePath, spinnerDialog) {
        try {
            // Create output directory
            const outputDir = Gio.File.new_for_path(outputPath);
            if (!outputDir.query_exists(null)) {
                outputDir.make_directory_with_parents(null);
            }

            const templatesDir = this.findTemplatesDirectory();
            if (!templatesDir) {
                spinnerDialog.destroy();
                this.app.showError('Templates directory not found!');
                return;
            }

            // Process all templates to the output directory
            this.processTemplates(templatesDir, outputPath, colors);
            this.copyStaticFiles(templatesDir, outputPath);
            this.handleLightMode(colors, outputPath);

            // Copy the wallpaper to the theme directory
            const wallpaperFile = Gio.File.new_for_path(imagePath);
            const wallpaperName = wallpaperFile.get_basename();
            const destWallpaper = Gio.File.new_for_path(outputPath + '/background' + this.getFileExtension(wallpaperName));
            wallpaperFile.copy(destWallpaper, Gio.FileCopyFlags.OVERWRITE, null, null);

            spinnerDialog.destroy();
            this.app.showSuccess(`Theme ejected successfully to:\n${outputPath}`);
            print(`✓ Theme ejected to: ${outputPath}`);
        } catch (error) {
            spinnerDialog.destroy();
            this.app.showError(`Error creating theme: ${error.message}`);
        }
    }

    getFileExtension(fileName) {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot > 0 ? fileName.substring(lastDot) : '';
    }

    showEjectionSpinner() {
        const { Adw, Gtk } = imports.gi;
        const dialog = new Adw.MessageDialog({
            transient_for: this.app.get_active_window(),
            modal: true,
            heading: 'Ejecting Theme...',
            body: 'Generating colors and creating theme files...'
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
};
