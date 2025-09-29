#!/usr/bin/gjs

// Backwards compatibility wrapper for development
// This file provides compatibility for development and manual execution

// Set up compatibility imports
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

// Get the directory where this script is actually located (resolve symlinks)
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

let scriptPath = imports.system.programInvocationName;
try {
    // Try to resolve symlink to get the real path
    const file = Gio.File.new_for_path(scriptPath);
    const info = file.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    if (info.has_attribute('standard::symlink-target')) {
        const symlinkTarget = info.get_symlink_target();
        if (GLib.path_is_absolute(symlinkTarget)) {
            scriptPath = symlinkTarget;
        } else {
            scriptPath = GLib.build_filenamev([GLib.path_get_dirname(scriptPath), symlinkTarget]);
        }
    }
} catch (e) {
    // If resolving symlink fails, use the original path
}

const scriptDir = GLib.path_get_dirname(scriptPath);

// Add the script directory to the search path
imports.searchPath.unshift(scriptDir);

// Load the main module using the old imports system
const main = imports.src.main;

// Run the application
main.main(ARGV);
