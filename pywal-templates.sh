#!/bin/bash

# Script to generate config files from pywal16 templates
# This script should be run after setting a wallpaper with pywal16

TEMPLATES_DIR="$(dirname "$0")/templates"
CONFIG_BASE="$HOME/.config"

# Function to generate config from template
generate_config() {
    local template_file="$1"
    local output_file="$2"
    local template_name=$(basename "$template_file")

    if [[ ! -f "$template_file" ]]; then
        echo "Template not found: $template_file"
        return 1
    fi

    echo "Generating $output_file from $template_name..."

    # Process template with pywal variables
    python3 -c "
import re
import os
import json

# Read pywal colors
colors = {}
try:
    with open(os.path.expanduser('~/.cache/wal/colors.json'), 'r') as f:
        data = json.load(f)
        colors['background'] = data['special']['background']
        colors['foreground'] = data['special']['foreground']
        colors['cursor'] = data['special']['cursor']
        colors['wallpaper'] = data['wallpaper']
        for i in range(16):
            colors[f'color{i}'] = data['colors'][f'color{i}']
except Exception as e:
    print(f'Error reading colors: {e}')
    exit(1)

# Read template
try:
    with open('$template_file', 'r') as f:
        content = f.read()
except Exception as e:
    print(f'Error reading template: {e}')
    exit(1)

# Replace variables
for key, value in colors.items():
    # Handle .strip for removing # from hex colors
    content = content.replace('{' + key + '.strip}', value.replace('#', ''))
    content = content.replace('{' + key + '}', value)

# Write output
try:
    os.makedirs(os.path.dirname('$output_file'), exist_ok=True)
    with open('$output_file', 'w') as f:
        f.write(content)
    print(f'✓ Generated: $output_file')
except Exception as e:
    print(f'Error writing output: {e}')
    exit(1)
"
}

# Check if pywal colors exist
if [[ ! -f "$HOME/.cache/wal/colors.json" ]]; then
    echo "Error: Pywal colors not found. Run pywal first to generate a color scheme."
    exit 1
fi

# Check if light mode was used (detect light background)
LIGHT_MODE=false
if [[ -f "$HOME/.cache/wal/colors.json" ]]; then
    # Extract background color and check if it's light
    BG_COLOR=$(python3 -c "
import json
import os
try:
    with open(os.path.expanduser('~/.cache/wal/colors.json'), 'r') as f:
        data = json.load(f)
        bg = data['special']['background']
        # Convert hex to RGB and calculate luminance
        r = int(bg[1:3], 16)
        g = int(bg[3:5], 16)
        b = int(bg[5:7], 16)
        # Calculate relative luminance
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        print('light' if luminance > 0.5 else 'dark')
except:
    print('dark')
")
    if [[ "$BG_COLOR" == "light" ]]; then
        LIGHT_MODE=true
    fi
fi

echo "Generating configuration files from templates..."
echo "Templates directory: $TEMPLATES_DIR"
echo "Output directory: $CONFIG_BASE"
echo

# Generate configs from templates to standard locations
generate_config "$TEMPLATES_DIR/alacritty.toml" "$CONFIG_BASE/alacritty/alacritty.toml"
generate_config "$TEMPLATES_DIR/waybar.css" "$CONFIG_BASE/waybar/colors.css"
generate_config "$TEMPLATES_DIR/hyprland.conf" "$CONFIG_BASE/hypr/colors.conf"
generate_config "$TEMPLATES_DIR/mako.ini" "$CONFIG_BASE/mako/config"
generate_config "$TEMPLATES_DIR/ghostty.conf" "$CONFIG_BASE/ghostty/config"
generate_config "$TEMPLATES_DIR/wofi.css" "$CONFIG_BASE/wofi/colors.css"

# Generate processed files to Omarchy tema theme directory
echo
echo "Generating processed files to Omarchy tema theme..."
TEMA_THEME_DIR="$CONFIG_BASE/omarchy/themes/tema"
generate_config "$TEMPLATES_DIR/alacritty.toml" "$TEMA_THEME_DIR/alacritty.toml"
generate_config "$TEMPLATES_DIR/waybar.css" "$TEMA_THEME_DIR/waybar.css"
generate_config "$TEMPLATES_DIR/hyprland.conf" "$TEMA_THEME_DIR/hyprland.conf"
generate_config "$TEMPLATES_DIR/mako.ini" "$TEMA_THEME_DIR/mako.ini"
generate_config "$TEMPLATES_DIR/ghostty.conf" "$TEMA_THEME_DIR/ghostty.conf"
generate_config "$TEMPLATES_DIR/wofi.css" "$TEMA_THEME_DIR/wofi.css"

# Create light.mode file if light mode is detected
if [[ "$LIGHT_MODE" == "true" ]]; then
    echo "Creating light.mode file..."
    touch "$TEMA_THEME_DIR/light.mode"
    echo "✓ Light mode detected - created light.mode file"
else
    # Remove light.mode file if it exists (for dark mode)
    if [[ -f "$TEMA_THEME_DIR/light.mode" ]]; then
        rm "$TEMA_THEME_DIR/light.mode"
        echo "✓ Dark mode detected - removed light.mode file"
    fi
fi

# Apply the tema theme with Omarchy
echo
echo "Applying tema theme with Omarchy..."
if command -v omarchy-theme-set >/dev/null 2>&1; then
    omarchy-theme-set tema
    echo "✓ Omarchy tema theme applied!"
else
    echo "Warning: omarchy-theme-set command not found"
fi

echo
echo "✓ Template generation complete!"
echo
echo "What happened:"
echo "1. ✓ Generated config files with pywal colors to standard locations"
echo "2. ✓ Generated processed config files to Omarchy tema theme directory"
echo "3. ✓ Applied tema theme system-wide with omarchy-theme-set"
echo
echo "Your entire system theme has been updated with the new wallpaper colors!"