# Galleria
A static gallery website driven of an input folder. Uses HTML, CSS and JS to create a static gallery.
Thumbnails are created for JPG and MP4 files and then delivered as a website with Lightbox navigation.
Site structure mirrors the input folder and a 'prune' function removes thumbnail files and folder if they are delete from the input folder.

# Structure
public/
  gallery.html              # gallery homepage (your index.html can sit alongside)
  index.html                # placeholder (safe to delete/replace)
  assets/
    styles.css              # all CSS (external, as requested)
    app.js                  # client-side app (vanilla JS)
  data/                     # per-folder JSON indexes (generated)
  media/                    # originals mirrored for static hosting (generated)
  thumbs/                   # 200px-high thumbs/posters (generated)
  .gallery-manifest.json    # cache to avoid reprocessing (generated)
scripts/
  generate_thumbs.js        # makes thumbs & mp4 posters (incremental)
  generate_index.js         # writes per-folder JSON indexes & copies media
package.json
