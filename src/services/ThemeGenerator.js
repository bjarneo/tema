import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {
    extractColorsWithImageMagick,
    checkImageMagickAvailable,
    paletteToColorsObject,
} from './ColorExtractor.js';
import {
    stripHash,
    hexToRgbString,
    hexToRgba,
    hexToYaruTheme,
    calculateLuminance,
    hexToRgb,
} from '../utils/ColorUtils.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
const LUMINANCE_LIGHT_THRESHOLD = 0.5;

/**
 * ThemeGenerator - Generates theme files from extracted colors
 * Uses ImageMagick for color extraction (no pywal dependency)
 */
export class ThemeGenerator {
    constructor(app) {
        this.app = app;
    }

    /**
     * Generates templates using colors provided directly
     * @param {Object} colors - Colors object with color0-15, background, foreground, etc.
     */
    generateTemplatesWithColors(colors) {
        print('Generating templates with extracted colors...');

        const templatesDir = this.findTemplatesDirectory();
        if (!templatesDir) {
            this._showTemplatesNotFoundError();
            return;
        }

        const homeDir = GLib.get_home_dir();
        const configBase = homeDir + '/.config';
        const temaThemeDir = configBase + '/omarchy/themes/tema';

        print('Templates directory:', templatesDir);
        print('Tema theme directory:', temaThemeDir);

        this._processAllTemplates(templatesDir, temaThemeDir, colors);
        this._finalizeTheme(homeDir, configBase, temaThemeDir, colors);

        print('Template generation complete!');
        this.app.temaTheming.applyDynamicTheming();
        this._updatePywalfox();
    }

    /**
     * Legacy method - reads cached colors and generates templates
     */
    generateTemplates() {
        const colors = this._readCachedColors();
        if (!colors) {
            print('Error: Could not read cached colors');
            return;
        }
        this.generateTemplatesWithColors(colors);
    }

    /**
     * Reads colors from tema cache
     */
    _readCachedColors() {
        const colorsFile = Gio.File.new_for_path(
            GLib.get_home_dir() + '/.cache/tema/colors.json'
        );

        if (!colorsFile.query_exists(null)) {
            return null;
        }

        try {
            const [success, content] = colorsFile.load_contents(null);
            if (!success) return null;

            const jsonContent = new TextDecoder().decode(content);
            return JSON.parse(jsonContent);
        } catch (error) {
            print('Error reading cached colors:', error.message);
            return null;
        }
    }

    _showTemplatesNotFoundError() {
        const possibleDirs = this.getTemplatePaths();
        this.app.showError(
            `Templates directory not found!\nChecked paths:\n${possibleDirs.join('\n')}`
        );
    }

    _processAllTemplates(templatesDir, temaThemeDir, colors) {
        this.processTemplates(templatesDir, temaThemeDir, colors);
        this.handleLightMode(colors, temaThemeDir);
    }

    _finalizeTheme(homeDir, configBase, temaThemeDir, colors) {
        this.symlinkWallpapers(homeDir, temaThemeDir);
        this.applyOmarchyTheme();
        this.setOmarchyBackground(colors, configBase);
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
            GLib.get_home_dir() + '/Code/tema/templates',
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
            ['chromium.theme', temaThemeDir + '/chromium.theme'],
            ['gtk.css', temaThemeDir + '/gtk.css'],
            ['warp.yaml', temaThemeDir + '/warp.yaml'],
            ['icons.theme', temaThemeDir + '/icons.theme'],
            ['neovim.lua', temaThemeDir + '/neovim.lua'],
            ['firefox.json', temaThemeDir + '/firefox.json'],
            ['firefox.json', GLib.get_user_cache_dir() + '/wal/colors.json'],

        ];

        for (const [templateName, temaOutput] of templateMappings) {
            const templateFile = Gio.File.new_for_path(templatesDir + '/' + templateName);
            if (templateFile.query_exists(null)) {
                this.processTemplate(templateFile.get_path(), temaOutput, colors);
            }
        }
    }

    processTemplate(templatePath, outputPath, colors) {
        const templateFile = Gio.File.new_for_path(templatePath);
        const [success, content] = templateFile.load_contents(null);

        if (!success) {
            print('Error reading template:', templatePath);
            return;
        }

        try {
            const templateContent = new TextDecoder().decode(content);
            const processedContent = this._replaceColorPlaceholders(templateContent, colors);
            this._writeOutputFile(outputPath, processedContent);

            print('Generated:', outputPath);
        } catch (error) {
            print('Error processing template:', templatePath, error.message);
        }
    }

    _replaceColorPlaceholders(templateContent, colors) {
        let content = templateContent;

        for (const [key, value] of Object.entries(colors)) {
            if (!value) continue;

            // Handle {color.strip} - hex without #
            content = content.replace(
                new RegExp(`\\{${key}\\.strip\\}`, 'g'),
                stripHash(value)
            );

            // Handle {color.rgb} - "r g b" format
            content = content.replace(
                new RegExp(`\\{${key}\\.rgb\\}`, 'g'),
                hexToRgbString(value)
            );

            // Handle {color.rgba:alpha} - rgba with custom alpha (e.g. {background.rgba:0.66})
            content = content.replace(
                new RegExp(`\\{${key}\\.rgba:([0-9.]+)\\}`, 'g'),
                (_, alpha) => hexToRgba(value, parseFloat(alpha))
            );

            // Handle {color.rgba} - rgba with default alpha 1.0
            content = content.replace(
                new RegExp(`\\{${key}\\.rgba\\}`, 'g'),
                hexToRgba(value, 1.0)
            );

            // Handle {color.yaru} - Yaru icon theme name
            content = content.replace(
                new RegExp(`\\{${key}\\.yaru\\}`, 'g'),
                hexToYaruTheme(value)
            );

            // Handle plain {color} - hex color as-is
            content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        return content;
    }

    _writeOutputFile(outputPath, content) {
        const outputFile = Gio.File.new_for_path(outputPath);
        const outputDir = outputFile.get_parent();

        if (!outputDir.query_exists(null)) {
            outputDir.make_directory_with_parents(null);
        }

        const encodedContent = new TextEncoder().encode(content);
        outputFile.replace_contents(
            encodedContent,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );
    }

    handleLightMode(colors, temaThemeDir) {
        if (!colors.background) return;

        const isLightMode = this._isLightMode(colors.background);
        const lightModeFile = Gio.File.new_for_path(temaThemeDir + '/light.mode');

        if (isLightMode) {
            this._createLightModeFile(lightModeFile);
        } else {
            this._removeLightModeFile(lightModeFile);
        }
    }

    _isLightMode(backgroundColor) {
        const luminance = calculateLuminance(backgroundColor);
        return luminance > LUMINANCE_LIGHT_THRESHOLD;
    }

    _createLightModeFile(lightModeFile) {
        try {
            if (!lightModeFile.query_exists(null)) {
                lightModeFile.create(Gio.FileCreateFlags.NONE, null);
            }
            print('Light mode detected - created light.mode file');
        } catch (error) {
            print('Error creating light.mode file:', error.message);
        }
    }

    _removeLightModeFile(lightModeFile) {
        if (!lightModeFile.query_exists(null)) {
            return;
        }

        try {
            lightModeFile.delete(null);
            print('Dark mode detected - removed light.mode file');
        } catch (error) {
            print('Error removing light.mode file:', error.message);
        }
    }

    symlinkWallpapers(homeDir, temaThemeDir) {
        const wallpapersDir = homeDir + '/Wallpapers';
        const backgroundsDir = temaThemeDir + '/backgrounds';

        const wallpapersFile = Gio.File.new_for_path(wallpapersDir);

        if (!wallpapersFile.query_exists(null)) {
            print('Warning:', wallpapersDir, 'directory not found');
            return;
        }

        try {
            this._removeExistingBackgroundsDir(backgroundsDir);
            const backgroundsFile = Gio.File.new_for_path(backgroundsDir);
            backgroundsFile.make_symbolic_link(wallpapersDir, null);
            print('Symlinked', wallpapersDir, 'to', backgroundsDir);
        } catch (error) {
            print('Error symlinking wallpapers:', error.message);
        }
    }

    _removeExistingBackgroundsDir(backgroundsDir) {
        const backgroundsFile = Gio.File.new_for_path(backgroundsDir);

        if (!backgroundsFile.query_exists(null)) {
            return;
        }

        const fileType = backgroundsFile.query_file_type(
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            null
        );

        if (fileType === Gio.FileType.SYMBOLIC_LINK) {
            backgroundsFile.delete(null);
            return;
        }

        const deleteProcess = new Gio.Subprocess({
            argv: ['rm', '-rf', backgroundsDir],
            flags: Gio.SubprocessFlags.NONE,
        });
        deleteProcess.init(null);
        deleteProcess.wait(null);
    }

    setOmarchyBackground(colors, configBase) {
        if (!colors.wallpaper) {
            print('Warning: Could not determine current wallpaper');
            return;
        }

        if (!this._validateWallpaperFile(colors.wallpaper)) {
            return;
        }

        try {
            const backgroundLink = configBase + '/omarchy/current/background';
            this._createBackgroundSymlink(backgroundLink, colors.wallpaper);
            this.app.wallpaperManager.restartSwaybg(backgroundLink);
        } catch (error) {
            print('Error setting Omarchy background:', error.message);
        }
    }

    _validateWallpaperFile(wallpaperPath) {
        const wallpaperFile = Gio.File.new_for_path(wallpaperPath);

        if (!wallpaperFile.query_exists(null)) {
            print('Warning: Wallpaper file does not exist:', wallpaperPath);
            return false;
        }

        if (!this.isImageFile(wallpaperPath)) {
            print('Warning: File is not a recognized image format:', wallpaperPath);
            return false;
        }

        return true;
    }

    _createBackgroundSymlink(backgroundLink, wallpaperPath) {
        const backgroundFile = Gio.File.new_for_path(backgroundLink);
        const parentDir = backgroundFile.get_parent();

        if (!parentDir.query_exists(null)) {
            parentDir.make_directory_with_parents(null);
        }

        if (backgroundFile.query_exists(null)) {
            backgroundFile.delete(null);
        }

        backgroundFile.make_symbolic_link(wallpaperPath, null);
        print('Set background symlink:', wallpaperPath);
    }

    applyOmarchyTheme() {
        try {
            if (!this._checkCommandExists('omarchy-theme-set')) {
                print('Note: omarchy-theme-set command not found');
                return;
            }

            const applyProcess = new Gio.Subprocess({
                argv: ['omarchy-theme-set', 'tema'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
            });
            applyProcess.init(null);
            const [, stdout, stderr] = applyProcess.communicate_utf8(null, null);

            if (applyProcess.get_successful()) {
                print('Omarchy tema theme applied!');
            } else {
                print('Error applying Omarchy theme:', stderr);
            }
        } catch (error) {
            print('Error applying Omarchy theme:', error.message);
        }
    }

    _checkCommandExists(command) {
        try {
            const proc = Gio.Subprocess.new(
                ['which', command],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            proc.communicate_utf8(null, null);
            return proc.get_exit_status() === 0;
        } catch (e) {
            return false;
        }
    }

    isImageFile(fileName) {
        const lowerFileName = fileName.toLowerCase();
        return IMAGE_EXTENSIONS.some(ext => lowerFileName.endsWith(ext));
    }

    /**
     * Ejects a standalone theme to the specified path
     */
    async ejectTheme(imagePath, fileName, lightMode, outputPath) {
        print(`Ejecting theme to: ${outputPath}`);

        const spinnerDialog = this._showEjectionSpinner();

        try {
            const available = await checkImageMagickAvailable();
            if (!available) {
                spinnerDialog.destroy();
                this.app.showError('ImageMagick not found. Please install ImageMagick.');
                return;
            }

            const palette = await extractColorsWithImageMagick(imagePath, lightMode);
            const colors = paletteToColorsObject(palette, imagePath);

            this._createEjectedTheme(outputPath, colors, imagePath, spinnerDialog);
        } catch (error) {
            spinnerDialog.destroy();
            this.app.showError(`Error ejecting theme: ${error.message}`);
            console.error('Theme ejection error:', error);
        }
    }

    _createEjectedTheme(outputPath, colors, imagePath, spinnerDialog) {
        const templatesDir = this.findTemplatesDirectory();

        if (!templatesDir) {
            spinnerDialog.destroy();
            this.app.showError('Templates directory not found!');
            return;
        }

        try {
            this._createOutputDirectory(outputPath);
            this._processAllTemplates(templatesDir, outputPath, colors);
            this._copyWallpaperToOutput(imagePath, outputPath);

            spinnerDialog.destroy();
            this.app.showSuccess(`Theme ejected successfully to:\n${outputPath}`);
            print(`Theme ejected to: ${outputPath}`);
        } catch (error) {
            spinnerDialog.destroy();
            this.app.showError(`Error creating theme: ${error.message}`);
        }
    }

    _createOutputDirectory(outputPath) {
        const outputDir = Gio.File.new_for_path(outputPath);
        if (!outputDir.query_exists(null)) {
            outputDir.make_directory_with_parents(null);
        }
    }

    _copyWallpaperToOutput(imagePath, outputPath) {
        const backgroundsDir = Gio.File.new_for_path(outputPath + '/backgrounds');

        if (!backgroundsDir.query_exists(null)) {
            backgroundsDir.make_directory(null);
        }

        const wallpaperFile = Gio.File.new_for_path(imagePath);
        const wallpaperName = wallpaperFile.get_basename();
        const destWallpaper = Gio.File.new_for_path(
            outputPath + '/backgrounds/' + wallpaperName
        );
        wallpaperFile.copy(destWallpaper, Gio.FileCopyFlags.OVERWRITE, null, null);
    }

    _showEjectionSpinner() {
        const dialog = new Adw.MessageDialog({
            transient_for: this.app.get_active_window(),
            modal: true,
            heading: 'Ejecting Theme',
            body: 'Extracting colors and generating theme files...',
        });

        const spinner = new Gtk.Spinner({
            spinning: true,
            width_request: 32,
            height_request: 32,
            margin_top: 12,
            margin_bottom: 12,
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        });
        box.append(spinner);
        dialog.set_extra_child(box);

        dialog.present();
        return dialog;
    }

    // Update Pywalfox to Sync Firefox Theme
    _updatePywalfox() {
        try {
            print('Updating Firefox theme via Pywalfox...');
            // We use bash -c with an explicit mise activation because login shells
            // often return early in non-interactive environments, skipping the mise setup.
            const pywalfoxProcess = Gio.Subprocess.new(
                ['bash', '-c', 'eval "$(mise activate bash 2>/dev/null)" || true; pywalfox update'],
                Gio.SubprocessFlags.NONE
            );
            // We use wait_check_async so it doesn't freeze your UI while updating
            // and we can properly detect if the command failed (non-zero exit code)
            pywalfoxProcess.wait_check_async(null, (proc, res) => {
                try {
                    proc.wait_check_finish(res);
                    print('Pywalfox update complete!');
                } catch (e) {
                    print('Pywalfox update failed:', e.message);
                }
            });
        } catch (error) {
            print('Error launching pywalfox:', error.message);
        }
    }
}
