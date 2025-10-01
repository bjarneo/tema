const { Gtk, GLib, Gio, GdkPixbuf } = imports.gi;

const THUMBNAIL_SIZE = 92;

var ThumbnailManager = class ThumbnailManager {
    constructor() {
        this.cacheDir = null;
        this.isImageMagickAvailable = null;
    }

    ensureCacheDirectory() {
        if (this.cacheDir) return this.cacheDir;

        this.cacheDir = GLib.get_home_dir() + '/.cache/tema/thumbnails';
        const cacheDirFile = Gio.File.new_for_path(this.cacheDir);

        if (!cacheDirFile.query_exists(null)) {
            try {
                cacheDirFile.make_directory_with_parents(null);
                print('✓ Created thumbnail cache directory:', this.cacheDir);
            } catch (error) {
                print('Error creating cache directory:', error.message);
                throw error;
            }
        }

        return this.cacheDir;
    }

    getThumbnailPath(filePath) {
        const cacheDir = this.ensureCacheDirectory();
        const hash = this.hashString(filePath);
        const fileExt = filePath.toLowerCase().split('.').pop();
        return `${cacheDir}/${hash}.${fileExt}`;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    createPlaceholder(grid, filePath, fileName) {
        let placeholderWidget;

        try {
            const placeholderPath = GLib.get_current_dir() + '/placeholder.png';
            const placeholderFile = Gio.File.new_for_path(placeholderPath);

            if (placeholderFile.query_exists(null)) {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                    placeholderPath,
                    THUMBNAIL_SIZE,
                    THUMBNAIL_SIZE,
                    true
                );
                placeholderWidget = new Gtk.Picture();
                placeholderWidget.set_pixbuf(pixbuf);
                placeholderWidget.set_can_shrink(false);
            } else {
                placeholderWidget = new Gtk.Spinner({
                    spinning: true,
                    width_request: THUMBNAIL_SIZE,
                    height_request: THUMBNAIL_SIZE
                });
            }
        } catch (error) {
            placeholderWidget = new Gtk.Spinner({
                spinning: true,
                width_request: THUMBNAIL_SIZE,
                height_request: THUMBNAIL_SIZE
            });
        }

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 2,
            margin_bottom: 2,
            margin_start: 2,
            margin_end: 2
        });

        box.append(placeholderWidget);
        box._filePath = filePath;
        box._fileName = fileName;
        box._placeholderWidget = placeholderWidget;

        grid.append(box);
        return box;
    }

    loadThumbnailForPlaceholder(placeholder, filePath, fileName) {
        try {
            const thumbnailPath = this.getThumbnailPath(filePath);
            const thumbnailFile = Gio.File.new_for_path(thumbnailPath);

            if (thumbnailFile.query_exists(null)) {
                this.loadCachedThumbnail(placeholder, thumbnailPath);
            } else {
                this.generateThumbnail(placeholder, filePath, thumbnailPath, fileName);
            }
        } catch (error) {
            print(`Error loading image ${fileName}:`, error.message);
            this.showThumbnailError(placeholder);
        }
    }

    checkImageMagick(callback) {
        if (this.isImageMagickAvailable !== null) {
            callback(this.isImageMagickAvailable);
            return;
        }

        try {
            const subprocess = new Gio.Subprocess({
                argv: ['which', 'magick'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE
            });
            subprocess.init(null);

            subprocess.communicate_utf8_async(null, null, (source, result) => {
                try {
                    subprocess.communicate_utf8_finish(result);
                    this.isImageMagickAvailable = subprocess.get_successful();
                    callback(this.isImageMagickAvailable);
                } catch (error) {
                    this.isImageMagickAvailable = false;
                    callback(false);
                }
            });
        } catch (error) {
            this.isImageMagickAvailable = false;
            callback(false);
        }
    }

    generateThumbnail(placeholder, filePath, thumbnailPath, fileName) {
        try {
            this.ensureCacheDirectory();

            this.checkImageMagick((available) => {
                if (available) {
                    this.generateThumbnailWithImageMagick(placeholder, filePath, thumbnailPath);
                } else {
                    this.generateThumbnailFallback(placeholder, filePath, fileName);
                }
            });
        } catch (error) {
            print(`Error generating thumbnail for ${fileName}:`, error.message);
            this.showThumbnailError(placeholder);
        }
    }

    generateThumbnailWithImageMagick(placeholder, filePath, thumbnailPath) {
        try {
            const subprocess = new Gio.Subprocess({
                argv: [
                    'magick', filePath,
                    '-resize', `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}^`,
                    '-gravity', 'center',
                    '-extent', `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}`,
                    thumbnailPath
                ],
                flags: Gio.SubprocessFlags.STDERR_PIPE
            });
            subprocess.init(null);

            subprocess.communicate_utf8_async(null, null, (source, result) => {
                try {
                    const [, , stderr] = subprocess.communicate_utf8_finish(result);

                    if (subprocess.get_successful()) {
                        this.loadCachedThumbnail(placeholder, thumbnailPath);
                    } else {
                        print('ImageMagick error:', stderr);
                        this.generateThumbnailFallback(placeholder, filePath, 'unknown');
                    }
                } catch (error) {
                    print('Error with ImageMagick process:', error.message);
                    this.generateThumbnailFallback(placeholder, filePath, 'unknown');
                }
            });
        } catch (error) {
            print('Error starting ImageMagick:', error.message);
            this.generateThumbnailFallback(placeholder, filePath, 'unknown');
        }
    }

    generateThumbnailFallback(placeholder, filePath, fileName) {
        try {
            // Load the original image to get dimensions
            const originalPixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
            const origWidth = originalPixbuf.get_width();
            const origHeight = originalPixbuf.get_height();

            // Calculate scale to fill thumbnail (smallest dimension fits)
            const scaleX = THUMBNAIL_SIZE / origWidth;
            const scaleY = THUMBNAIL_SIZE / origHeight;
            const scale = Math.max(scaleX, scaleY);

            const scaledWidth = Math.round(origWidth * scale);
            const scaledHeight = Math.round(origHeight * scale);

            // Scale the image
            const scaledPixbuf = originalPixbuf.scale_simple(
                scaledWidth,
                scaledHeight,
                GdkPixbuf.InterpType.BILINEAR
            );

            // Calculate crop offsets for center crop
            const cropX = Math.max(0, Math.round((scaledWidth - THUMBNAIL_SIZE) / 2));
            const cropY = Math.max(0, Math.round((scaledHeight - THUMBNAIL_SIZE) / 2));

            // Crop to exactly thumbnail size from center
            const croppedPixbuf = scaledPixbuf.new_subpixbuf(
                cropX,
                cropY,
                THUMBNAIL_SIZE,
                THUMBNAIL_SIZE
            );

            const image = new Gtk.Picture();
            image.set_pixbuf(croppedPixbuf);
            image.set_can_shrink(false);

            const placeholderWidget = placeholder._placeholderWidget;
            placeholder.remove(placeholderWidget);
            placeholder.prepend(image);
        } catch (error) {
            print(`Error in fallback thumbnail generation for ${fileName}:`, error.message);
            this.showThumbnailError(placeholder);
        }
    }

    loadCachedThumbnail(placeholder, thumbnailPath) {
        try {
            const pixbuf = GdkPixbuf.Pixbuf.new_from_file(thumbnailPath);

            const image = new Gtk.Picture();
            image.set_pixbuf(pixbuf);
            image.set_can_shrink(false);

            const placeholderWidget = placeholder._placeholderWidget;
            placeholder.remove(placeholderWidget);
            placeholder.prepend(image);
        } catch (error) {
            print('Error loading cached thumbnail:', error.message);
            this.showThumbnailError(placeholder);
        }
    }

    showThumbnailError(placeholder) {
        const placeholderWidget = placeholder._placeholderWidget;
        placeholder.remove(placeholderWidget);

        const errorLabel = new Gtk.Label({
            label: '❌',
            width_request: THUMBNAIL_SIZE,
            height_request: THUMBNAIL_SIZE
        });
        placeholder.prepend(errorLabel);
    }

    loadThumbnailsAsync(grid, imageFiles, index) {
        if (index >= imageFiles.length) {
            return;
        }

        const { filePath, fileName } = imageFiles[index];
        const placeholder = this.createPlaceholder(grid, filePath, fileName);

        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try {
                this.loadThumbnailForPlaceholder(placeholder, filePath, fileName);
            } catch (error) {
                print(`Error loading thumbnail for ${fileName}:`, error.message);
            }

            this.loadThumbnailsAsync(grid, imageFiles, index + 1);
            return GLib.SOURCE_REMOVE;
        });
    }

    isImageFile(fileName) {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
        const lowerFileName = fileName.toLowerCase();
        return imageExtensions.some(ext => lowerFileName.endsWith(ext));
    }
};
