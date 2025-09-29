# Tēma - Wallpaper Viewer

A GTK4/Adwaita wallpaper viewer application that integrates with pywal for automatic color scheme generation.

## 🙏 Acknowledgments

This application is built on top of the incredible work by these amazing creators:

- **[pywal](https://github.com/dylanaraps/pywal)** by [@dylanaraps](https://github.com/dylanaraps) - The original and foundational pywal that revolutionized automatic color scheme generation
- **[pywal16](https://github.com/eylles/pywal16)** by [@eylles](https://github.com/eylles) - An enhanced fork providing 16-color support and additional features

Huge kudos to both projects - without their awesome work, Tēma wouldn't exist! 🎨

## Features

- Browse wallpapers from `~/Wallpapers/` directory
- Grid-based thumbnail view
- Dark/Light mode wallpaper setting
- Integration with pywal for automatic color scheme generation
- Keyboard navigation support

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

## Installing as a Native App

### Option 1: Desktop Entry (Quick Setup)

To make Tēma appear in your application menu:

```bash
# Install the desktop file for current user
cp tema.desktop ~/.local/share/applications/

# Or install system-wide (requires sudo)
sudo cp tema.desktop /usr/share/applications/
```

After installation, you can launch Tēma from your desktop environment's application launcher.

### Option 2: Proper Installation with Meson

For a complete native app installation:

```bash
# Install build dependencies
sudo pacman -S meson ninja

# Build and install
meson setup builddir
meson compile -C builddir
sudo meson install -C builddir
```

This installs Tēma to `/usr/local/bin/tema` and adds it to your application menu.

### Option 3: Command Line Access

To run Tēma from anywhere in the terminal:

```bash
# Create symlink to PATH
chmod +x init.js
sudo ln -s $(pwd)/init.js /usr/local/bin/tema

# Now you can run it from anywhere
tema
```

## Omarchy Theme Integration

Tēma is now integrated as an Omarchy theme! The templates are symlinked to `~/.config/omarchy/themes/tema`.

### Using with Omarchy

```bash
# Set Tēma as your Omarchy theme
omarchy-theme-set tema

# The templates will use pywal variables and automatically update when you change wallpapers
```

When you set a wallpaper through Tēma, it will:
1. Generate colors with pywal16
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

## Technical Details

- Built with GTK4 and libadwaita for modern GNOME integration
- Written in GJS (GNOME JavaScript)
- Uses GdkPixbuf for image loading and thumbnail generation
- Integrates with pywal for system-wide color scheme management
