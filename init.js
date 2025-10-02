#!/usr/bin/gjs

imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

function resolveScriptPath() {
    const scriptPath = imports.system.programInvocationName;

    try {
        const file = Gio.File.new_for_path(scriptPath);
        const info = file.query_info('standard::symlink-target', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);

        if (!info.has_attribute('standard::symlink-target')) {
            return scriptPath;
        }

        const symlinkTarget = info.get_symlink_target();

        if (GLib.path_is_absolute(symlinkTarget)) {
            return symlinkTarget;
        }

        return GLib.build_filenamev([GLib.path_get_dirname(scriptPath), symlinkTarget]);
    } catch (error) {
        return scriptPath;
    }
}

function initializeImports() {
    const scriptPath = resolveScriptPath();
    const scriptDir = GLib.path_get_dirname(scriptPath);
    imports.searchPath.unshift(scriptDir);
}

function runApplication() {
    const main = imports.src.main;
    main.main(ARGV);
}

initializeImports();
runApplication();
