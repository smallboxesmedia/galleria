### Galleria 

Galleria is a static gallery generator for single media sets, designed to prevent duplication and streamline media management. It leverages Node.js utilities and system ffmpeg to process MP4 posters, making gallery setup effective and easily maintainable.[^1]

***

#### Features

- **Static gallery generation** for media sets, ensuring no duplication.[^1]
- **MP4 poster support** using system ffmpeg for automatic thumbnail creation.[^1]
- **Automated indexing** and scan of media files.[^1]
- **Pruning and build management** for maintaining consistency.[^1]
- **Simple local serving** with http-server for previews.[^1]

***

#### Requirements

- Node.js (recommended: LTS version)[^1]
- ffmpeg (must be available on your system)[^1]
- npm

***

#### Installation

```bash
npm install
```

_(All dependencies are listed in package.json. Key packages: `fs-extra`, `sharp`.)_[^1]

***

#### Usage

**To build and serve your gallery:**

```bash
# Generate thumbnails
npm run thumbs

# Scan and index media files
npm run scan

# Prune unused or duplicate items
npm run prune

# Run all build tasks sequentially
npm run build

# Preview your gallery locally
npx http-server .public -p 8080 -c-1
```

Each script automates a part of the gallery workflow: thumbnail creation, indexing, pruning, and serving via a static server.[^1]

***

#### Scripts Overview

| Script | Command | Purpose |
| :-- | :-- | :-- |
| thumbs | node scripts/generatethumbs.js | Generate thumbnails |
| scan | node scripts/generateindex.js | Scan and index media |
| prune | node scripts/prunebuild.js | Prune duplicates and cleanup |
| build | npm run thumbs, scan, and prune | Full build process |
| serve | npx http-server .public -p 8080 -c-1 | Serve gallery locally |


***

#### Dependencies

- `fs-extra` (v11.2.0): Enhanced filesystem operations[^1]
- `sharp` (v0.33.5): Image processing for thumbnails[^1]

***

For more details and extended customization, refer to specific script implementations and adjust according to your media requirements.
