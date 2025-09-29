# Tēma - Omarchy Theming

https://github.com/user-attachments/assets/demo.mp4

> **テーマ (tēma)**: This is a loanword from English ("theme") written in katakana. It's widely used and understood in Japan, especially in the context of a theme for a website, an application, or a graphical user interface.

A GTK4/Adwaita Omarchy theming application that integrates with pywal for automatic color scheme generation.

> **⚠️ Important:** Tēma requires wallpapers to be placed in `~/Wallpapers/` directory to function. Create this directory and add your wallpaper images before running the application.

## 🙏 Acknowledgments

This application is built on top of the incredible work by these amazing creators:

- **[pywal](https://github.com/dylanaraps/pywal)** by [@dylanaraps](https://github.com/dylanaraps) - The original and foundational pywal that revolutionized automatic color scheme generation

Huge kudos to this amazing project - without their awesome work, Tēma wouldn't exist! 🎨

## Features

- Browse wallpapers from `~/Wallpapers/` directory
- Grid-based thumbnail view with caching
- Dark/Light mode wallpaper setting
- Integration with pywal for automatic color scheme generation
- Keyboard navigation support
- Help dialog with keyboard shortcuts
- Thumbnail caching with ImageMagick support
- Modular architecture for better maintainability

## Installing as a Native App

### Option 1: AUR Package (Recommended for Arch Linux)

Install from the AUR using your preferred AUR helper:

```bash
# Using yay
yay -S tema-git

# Using paru
paru -S tema-git

# Manual installation
git clone https://aur.archlinux.org/tema-git.git
cd tema-git
makepkg -si
```

This provides the cleanest installation with proper package management.

### Option 2: Proper Installation with Meson (GJS Packaging Standard)

For a complete native app installation following GTK/GJS standards:

```bash
# Install build dependencies
sudo pacman -S meson ninja gjs gtk4 libadwaita

# Build and install
meson setup builddir
meson compile -C builddir
sudo meson install -C builddir
```

This installs:
- Main application bundle (GResource) to `/usr/share/tema/`
- All JavaScript modules bundled in the GResource
- Command line symlink at `/usr/bin/tema`
- Desktop file for application launcher
- Template files to `/usr/share/tema/templates/`

The build process:
1. Compiles all JavaScript modules into a GResource bundle
2. Configures the entry point script with proper paths
3. Creates symlinks for command-line access
4. Installs templates and desktop integration files

### Option 3: Development Setup

For development or quick testing:

```bash
# Make executable and run directly
chmod +x init.js
./init.js
```

### Option 4: Manual Desktop Integration

To make Tēma appear in your application menu without full installation:

```bash
# Copy desktop file for current user
cp data/com.bjarneo.Tema.desktop ~/.local/share/applications/

# Edit the desktop file to point to your local copy
sed -i "s|Exec=tema|Exec=$(pwd)/init.js|" ~/.local/share/applications/com.bjarneo.Tema.desktop
```

## Dependencies (Arch Linux)

Install the required packages using pacman:

```bash
# Core dependencies
sudo pacman -S gjs gtk4 libadwaita

# For image processing
sudo pacman -S gdk-pixbuf2

# For wallpaper and color scheme management
sudo pacman -S python-pywal
```

## Setup

1. Create the wallpapers directory if it doesn't exist:
   ```bash
   mkdir -p ~/Wallpapers
   ```

2. Add your wallpaper images to the `~/Wallpapers/` directory. Supported formats:
   - JPG/JPEG
   - PNG
   - GIF
   - BMP
   - WebP
   - TIFF

## Running the Application

Make the script executable and run it:

```bash
chmod +x init.js
./init.js
```

Or run it directly with gjs:

```bash
gjs -m init.js
```

## Omarchy Integration

Tēma is now integrated as an Omarchy theme! The templates are symlinked to `~/.config/omarchy/themes/tema`.

### Setup with Omarchy
```bash
# Copy existing wallpapers from Omarchy themes to get started
cp ~/.config/omarchy/themes/**/backgrounds/* ~/Wallpapers/
```

### Recommended Keybind

Add this keybind to your Hyprland configuration to quickly launch Tēma:

`~/.config/hypr/bindings.conf`
```bash
bindd = SUPER SHIFT, T, Tema, exec, uwsm app -- tema
```

This allows you to press `Super + Shift + T` to open the wallpaper selector.

### How it Works

When you set a wallpaper through Tēma, it will:
1. Generate colors with pywal
2. Process all template files with the new colors
3. Update both standard config locations AND the current Omarchy theme
4. Apply the new theme system-wide

## Usage

1. Launch the application
2. Browse through your wallpapers in the grid view
3. Double-click on a wallpaper or select it and press Enter
4. Choose between Dark Mode (🌙) or Light Mode (☀️)
5. The wallpaper will be set and pywal will generate a matching color scheme

## Keyboard Navigation

- **Arrow keys**: Navigate through wallpapers
- **Enter**: Set the selected wallpaper
- **?**: Show help dialog with keyboard shortcuts
- **q** or **Escape**: Quit application
- **Tab**: Move focus between UI elements

## Troubleshooting

### "Wallpapers directory not found!"
- Ensure `~/Wallpapers/` directory exists and contains image files

### "Error: wal not found"
- Install pywal: `sudo pacman -S python-pywal`

### Images not showing
- Check file permissions in `~/Wallpapers/`
- Ensure image files have supported extensions
- Install additional image format support if needed

### Package Structure

The AUR package follows the [GJS packaging specification](https://gjs.guide/guides/gtk/gtk4.html#packaging) and includes:

- **Standard compliant structure**: Uses proper DBus naming (`com.bjarneo.Tema`)
- **GResource bundling**: All JavaScript modules (main.js, ThumbnailManager.js, DialogManager.js, ThemeGenerator.js, WallpaperManager.js) bundled for efficiency
- **Template installation**: Theme templates installed to `/usr/share/tema/templates/`
- **Desktop integration**: Proper desktop file and symlinks
- **Dependency management**: All runtime and build dependencies specified
- **Modular architecture**: Separates concerns across multiple specialized modules

## Technical Details

- Built with GTK4 and libadwaita for modern GNOME integration
- Written in GJS (GNOME JavaScript)
- Uses GdkPixbuf for image loading and thumbnail generation
- Integrates with pywal for system-wide color scheme management
- Follows the official GTK/GJS application packaging specification
- Modular architecture with separation of concerns:
  - `ThumbnailManager` - Handles image thumbnails and caching
  - `WallpaperManager` - Manages wallpaper setting and pywal integration
  - `DialogManager` - Handles all user interface dialogs
  - `ThemeGenerator` - Processes templates and generates theme files
  - `main.js` - Application entry point and UI coordination
