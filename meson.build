project('tema', 'c',
  version: '1.0.0',
  meson_version: '>= 0.59.0',
  default_options: [
    'warning_level=2',
    'werror=false',
  ],
)

gnome = import('gnome')

app_id = 'com.example.WallpaperViewer'

# Install the main script
install_data('init.js',
  install_dir: get_option('bindir'),
  install_mode: 'rwxr-xr-x',
  rename: 'tema'
)

# Install desktop file
desktop_file = configure_file(
  input: 'tema.desktop.in',
  output: 'tema.desktop',
  configuration: {
    'bindir': get_option('prefix') / get_option('bindir'),
  }
)

install_data(desktop_file,
  install_dir: get_option('datadir') / 'applications'
)