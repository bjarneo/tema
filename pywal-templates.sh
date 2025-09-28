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

echo "Generating configuration files from templates..."
echo "Templates directory: $TEMPLATES_DIR"
echo "Output directory: $CONFIG_BASE"
echo

# Generate configs from templates
generate_config "$TEMPLATES_DIR/alacritty.toml" "$CONFIG_BASE/alacritty/alacritty.toml"
generate_config "$TEMPLATES_DIR/waybar.css" "$CONFIG_BASE/waybar/colors.css"
generate_config "$TEMPLATES_DIR/hyprland.conf" "$CONFIG_BASE/hypr/colors.conf"
generate_config "$TEMPLATES_DIR/mako.ini" "$CONFIG_BASE/mako/config"
generate_config "$TEMPLATES_DIR/ghostty.conf" "$CONFIG_BASE/ghostty/config"
generate_config "$TEMPLATES_DIR/wofi.css" "$CONFIG_BASE/wofi/colors.css"

echo
echo "✓ Template generation complete!"
echo
echo "Next steps:"
echo "1. Include generated color files in your main configuration files"
echo "2. For Hyprland: add 'source = ~/.config/hypr/colors.conf' to hyprland.conf"
echo "3. For Waybar: add '@import \"colors.css\";' to your waybar style.css"
echo "4. Restart your applications to apply the new colors"