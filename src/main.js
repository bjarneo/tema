imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

const { Gtk, Adw, GLib, GObject, Gio, Gdk } = imports.gi;

// Detect if we're running in development mode or packaged mode
let ThumbnailManager, DialogManager, ThemeGenerator, WallpaperManager, TemaTheming;

try {
    // Try development mode imports first (when running ./init.js)
    ({ ThumbnailManager } = imports.src.ThumbnailManager);
    ({ DialogManager } = imports.src.DialogManager);
    ({ ThemeGenerator } = imports.src.ThemeGenerator);
    ({ WallpaperManager } = imports.src.WallpaperManager);
    ({ TemaTheming } = imports.src.TemaTheming);
} catch (e) {
    // Fall back to packaged mode imports (when running installed tema)
    ({ ThumbnailManager } = imports.ThumbnailManager);
    ({ DialogManager } = imports.DialogManager);
    ({ ThemeGenerator } = imports.ThemeGenerator);
    ({ WallpaperManager } = imports.WallpaperManager);
    ({ TemaTheming } = imports.TemaTheming);
}

const APP_ID = 'com.bjarneo.Tema';

const TemaApp = GObject.registerClass(
class TemaApp extends Adw.Application {
    constructor() {
        super({ application_id: APP_ID });
        GLib.set_prgname(APP_ID);

        this.initializeManagers();
    }

    initializeManagers() {
        this.thumbnailManager = new ThumbnailManager();
        this.dialogManager = new DialogManager(this);
        this.themeGenerator = new ThemeGenerator(this);
        this.wallpaperManager = new WallpaperManager(this);
        this.temaTheming = new TemaTheming();
    }

    vfunc_activate() {
        this.initializeWallpapersDirectory();
        this.loadCustomCSS();
        this.temaTheming.applyDynamicTheming();

        const window = this.createMainWindow();
        const mainBox = this.createMainContent();
        const { scrolled, grid } = this.createImageGrid();

        mainBox.append(scrolled);
        this.loadWallpaperImages(grid);
        this.setupKeyboardHandling(window, grid);

        window.set_content(mainBox);
        window.present();
    }

    initializeWallpapersDirectory() {
        const homeDir = GLib.get_home_dir();
        const wallpapersDir = Gio.File.new_for_path(homeDir + '/Wallpapers');

        this._ensureWallpapersDirectoryExists(wallpapersDir);
        this._copyOmarchyBackgrounds(homeDir, wallpapersDir);
    }

    _ensureWallpapersDirectoryExists(wallpapersDir) {
        if (wallpapersDir.query_exists(null)) {
            return;
        }

        try {
            wallpapersDir.make_directory_with_parents(null);
            print('✓ Created Wallpapers directory');
        } catch (error) {
            print('Error creating Wallpapers directory:', error.message);
        }
    }

    _copyOmarchyBackgrounds(homeDir, wallpapersDir) {
        const themesPath = homeDir + '/.config/omarchy/themes';
        const themesDir = Gio.File.new_for_path(themesPath);

        if (!themesDir.query_exists(null)) {
            return;
        }

        try {
            const enumerator = themesDir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                this._processThemeDirectory(fileInfo, themesPath, wallpapersDir);
            }

            enumerator.close(null);
        } catch (error) {
            print('Error copying omarchy backgrounds:', error.message);
        }
    }

    _processThemeDirectory(fileInfo, themesPath, wallpapersDir) {
        if (fileInfo.get_file_type() !== Gio.FileType.DIRECTORY) {
            return;
        }

        const themeName = fileInfo.get_name();
        const backgroundsPath = `${themesPath}/${themeName}/backgrounds`;
        const backgroundsDir = Gio.File.new_for_path(backgroundsPath);

        if (!backgroundsDir.query_exists(null)) {
            return;
        }

        this._copyBackgroundFiles(backgroundsDir, wallpapersDir);
    }

    _copyBackgroundFiles(backgroundsDir, wallpapersDir) {
        try {
            const enumerator = backgroundsDir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                this._copyBackgroundFile(fileInfo, backgroundsDir, wallpapersDir);
            }

            enumerator.close(null);
        } catch (error) {
            print('Error reading backgrounds directory:', error.message);
        }
    }

    _copyBackgroundFile(fileInfo, backgroundsDir, wallpapersDir) {
        if (fileInfo.get_file_type() !== Gio.FileType.REGULAR) {
            return;
        }

        const fileName = fileInfo.get_name();
        const sourceFile = Gio.File.new_for_path(`${backgroundsDir.get_path()}/${fileName}`);
        const destFile = Gio.File.new_for_path(`${wallpapersDir.get_path()}/${fileName}`);

        if (destFile.query_exists(null)) {
            return;
        }

        try {
            sourceFile.copy(destFile, Gio.FileCopyFlags.NONE, null, null);
            print('✓ Copied background:', fileName);
        } catch (error) {
            print('Error copying', fileName, ':', error.message);
        }
    }

    loadCustomCSS() {
        const cssProvider = new Gtk.CssProvider();

        if (this._tryLoadCSSFromFile(cssProvider)) {
            return;
        }

        this._tryLoadCSSFromResource(cssProvider);
    }

    _tryLoadCSSFromFile(cssProvider) {
        const cssPath = GLib.get_current_dir() + '/src/style.css';
        const cssFile = Gio.File.new_for_path(cssPath);

        if (!cssFile.query_exists(null)) {
            return false;
        }

        try {
            cssProvider.load_from_file(cssFile);
            this._applyStyleProvider(cssProvider);
            print('✓ Custom CSS loaded from file:', cssPath);
            return true;
        } catch (error) {
            print('Error loading CSS from file:', error.message);
            return false;
        }
    }

    _tryLoadCSSFromResource(cssProvider) {
        try {
            cssProvider.load_from_resource('/com/bjarneo/Tema/js/style.css');
            this._applyStyleProvider(cssProvider);
            print('✓ Custom CSS loaded from gresource');
        } catch (error) {
            print('Note: Custom CSS not loaded from gresource');
        }
    }

    _applyStyleProvider(cssProvider) {
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            cssProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        );
    }

    createMainWindow() {
        return new Adw.ApplicationWindow({
            application: this,
            default_width: 800,
            default_height: 600
        });
    }

    createMainContent() {
        return new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0
        });
    }

    createImageGrid() {
        const scrolled = new Gtk.ScrolledWindow({
            hexpand: true,
            vexpand: true,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12
        });

        const grid = new Gtk.FlowBox({
            valign: Gtk.Align.START,
            max_children_per_line: 6,
            selection_mode: Gtk.SelectionMode.SINGLE,
            column_spacing: 4,
            row_spacing: 4,
            can_focus: true,
            activate_on_single_click: false
        });

        this.connectGridEvents(grid);
        scrolled.set_child(grid);

        return { scrolled, grid };
    }

    connectGridEvents(grid) {
        grid.connect('child-activated', (flowbox, child) => {
            const box = child.get_child();
            if (box && box._filePath) {
                this.handleWallpaperSelection(box._filePath, box._fileName);
            }
        });
    }

    loadWallpaperImages(grid) {
        const wallpapersPath = GLib.get_home_dir() + '/Wallpapers';
        const wallpapersDir = Gio.File.new_for_path(wallpapersPath);

        if (!wallpapersDir.query_exists(null)) {
            this.showNoWallpapersMessage(grid);
            return;
        }

        try {
            const imageFiles = this.scanWallpaperDirectory(wallpapersDir, wallpapersPath);
            this.thumbnailManager.loadThumbnailsAsync(grid, imageFiles, 0);
        } catch (error) {
            this.showDirectoryError(grid, error);
        }
    }

    scanWallpaperDirectory(wallpapersDir, wallpapersPath) {
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

            if (this.thumbnailManager.isImageFile(fileName)) {
                imageFiles.push({ filePath, fileName });
            }
        }

        enumerator.close(null);
        return imageFiles;
    }

    showNoWallpapersMessage(grid) {
        const label = new Gtk.Label({
            label: 'Wallpapers directory not found!',
            margin_top: 50
        });
        grid.append(label);
    }

    showDirectoryError(grid, error) {
        print('Error reading wallpapers directory:', error.message);
        const label = new Gtk.Label({
            label: 'Error reading wallpapers directory',
            margin_top: 50
        });
        grid.append(label);
    }

    setupKeyboardHandling(window, grid) {
        const keyController = new Gtk.EventControllerKey();
        window.add_controller(keyController);

        keyController.connect('key-pressed', (controller, keyval, keycode, state) => {
            return this.handleKeyPress(keyval, window, grid);
        });

        grid.grab_focus();
    }

    handleKeyPress(keyval, window, grid) {
        if (this._handleVimNavigation(keyval, grid)) {
            return true;
        }

        return this._handleActionKey(keyval, window, grid);
    }

    _handleVimNavigation(keyval, grid) {
        const VIM_KEY_MAP = {
            104: Gtk.DirectionType.LEFT,  // h
            106: Gtk.DirectionType.DOWN,  // j
            107: Gtk.DirectionType.UP,    // k
            108: Gtk.DirectionType.RIGHT  // l
        };

        const direction = VIM_KEY_MAP[keyval];
        if (direction === undefined) {
            return false;
        }

        grid.child_focus(direction);
        return true;
    }

    _handleActionKey(keyval, window, grid) {
        const KEY_ENTER = 65293;
        const KEY_E = 101;
        const KEY_QUESTION = 63;
        const KEY_Q = 113;
        const KEY_ESCAPE = 65307;

        switch (keyval) {
            case KEY_ENTER:
                return this._handleEnterKey(grid);
            case KEY_E:
                return this._handleEjectKey(grid);
            case KEY_QUESTION:
                this.dialogManager.showHelpModal(window);
                return true;
            case KEY_Q:
            case KEY_ESCAPE:
                window.close();
                return true;
            default:
                return false;
        }
    }

    _handleEnterKey(grid) {
        const selectedBox = this._getSelectedBox(grid);
        if (!selectedBox) {
            return true;
        }

        this.handleWallpaperSelection(selectedBox._filePath, selectedBox._fileName);
        return true;
    }

    _handleEjectKey(grid) {
        const selectedBox = this._getSelectedBox(grid);
        if (!selectedBox) {
            return true;
        }

        this.handleThemeEjection(selectedBox._filePath, selectedBox._fileName);
        return true;
    }

    _getSelectedBox(grid) {
        const selected = grid.get_selected_children();
        if (selected.length === 0) {
            return null;
        }

        const selectedBox = selected[0].get_child();
        if (!selectedBox || !selectedBox._filePath) {
            return null;
        }

        return selectedBox;
    }

    handleWallpaperSelection(filePath, fileName) {
        const window = this.get_active_window();
        this.dialogManager.showModeDialog(
            window,
            filePath,
            fileName,
            (path, name, isLight) => this.setWallpaper(path, name, isLight)
        );
    }

    handleThemeEjection(filePath, fileName) {
        const window = this.get_active_window();
        this.dialogManager.showThemeEjectionDialog(
            window,
            filePath,
            fileName,
            (path, name, isLight, outputPath) => this.themeGenerator.ejectTheme(path, name, isLight, outputPath)
        );
    }

    setWallpaper(imagePath, fileName, lightMode) {
        this.wallpaperManager.setWallpaper(imagePath, fileName, lightMode);
        // Reapply theming based on selected mode
        this.temaTheming.applyDynamicTheming(!lightMode);
    }

    showError(message) {
        this.dialogManager.showError(message);
    }

    showSuccess(message) {
        this.dialogManager.showSuccess(message);
    }
});

function main(argv) {
    const app = new TemaApp();
    return app.run(argv);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { main };
} else if (typeof exports !== 'undefined') {
    exports.main = main;
}
