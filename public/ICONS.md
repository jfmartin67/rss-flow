# Icon Generation

The app requires PNG icons for PWA support. Use the following commands to generate icons from the SVG:

## Using ImageMagick (if installed):

```bash
# Install ImageMagick (macOS)
brew install imagemagick

# Generate icons
convert -background none public/icon.svg -resize 192x192 public/icon-192x192.png
convert -background none public/icon.svg -resize 512x512 public/icon-512x512.png
convert -background none public/icon.svg -resize 32x32 public/favicon.ico
```

## Using online tools:

1. Visit https://cloudconvert.com/svg-to-png
2. Upload `public/icon.svg`
3. Generate:
   - 192x192 PNG → Save as `icon-192x192.png`
   - 512x512 PNG → Save as `icon-512x512.png`
   - 32x32 PNG → Save as `favicon.ico`

## Using Node.js sharp library:

```bash
npm install sharp-cli -g
sharp -i public/icon.svg -o public/icon-192x192.png resize 192 192
sharp -i public/icon.svg -o public/icon-512x512.png resize 512 512
```

Place all generated files in the `public/` directory.
