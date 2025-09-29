#!/usr/bin/gjs

// Backwards compatibility wrapper for development
// This file provides compatibility for development and manual execution

// Set up compatibility imports
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

// Load the main module using the old imports system
imports.searchPath.unshift('.');
const main = imports.src.main;

// Run the application
main.main(ARGV);
