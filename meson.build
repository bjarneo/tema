project('tema',
  version: '1.0.0',
  meson_version: '>= 0.59.0',
  default_options: [
    'warning_level=2',
    'werror=false',
  ],
)

gnome = import('gnome')

# Package configuration
package_name = 'com.bjarneo.Tema'
package_tarname = 'tema'
app_id = package_name

# Dependencies
dependency('gjs-1.0', version: '>= 1.66')
dependency('gtk4', version: '>= 4.6')
dependency('libadwaita-1', version: '>= 1.0')

# Compile GResource for JavaScript source files
src_resource = gnome.compile_resources(
  'com.bjarneo.Tema.src',
  'src/com.bjarneo.Tema.src.gresource.xml',
  source_dir: 'src',
  gresource_bundle: true,
  install: true,
  install_dir: get_option('datadir') / package_name
)

# Configure and install the entry point script
entry_point = configure_file(
  input: 'src/com.bjarneo.Tema.in',
  output: package_name,
  configuration: {
    'GJS': find_program('gjs').full_path(),
    'PACKAGE_NAME': package_name,
    'PACKAGE_VERSION': meson.project_version(),
    'prefix': get_option('prefix'),
  },
  install: true,
  install_dir: get_option('datadir') / package_name,
  install_mode: 'rwxr-xr-x'
)

# Create symlink in bindir for command line usage
install_symlink(
  package_tarname,
  pointing_to: get_option('datadir') / package_name / package_name,
  install_dir: get_option('bindir')
)

# Install desktop file
desktop_file = configure_file(
  input: 'data/com.bjarneo.Tema.desktop.in',
  output: 'com.bjarneo.Tema.desktop',
  configuration: {
    'bindir': get_option('prefix') / get_option('bindir'),
  },
  install: true,
  install_dir: get_option('datadir') / 'applications'
)

# Install template files to pkgdatadir
install_subdir('templates',
  install_dir: get_option('datadir') / package_name,
  strip_directory: false
)