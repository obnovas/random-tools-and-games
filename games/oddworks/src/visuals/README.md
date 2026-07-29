# Oddworks visual kit

The MVP uses a grounded, storybook-market look: warm paper, timber, stone,
workwear colors, and chunky 16-pixel people. It intentionally avoids neon,
glowing technology, space imagery, and sterile interface chrome.

## Integration

Import `theme.css` once at the application entry point, then use the utility
classes (`ow-panel`, `ow-button`, `ow-label`, `ow-meter`, and `ow-canvas`).

Canvas renderers can import `drawPerson`, `drawMechanism`, `drawGroundTile`,
and `setupCrispCanvas` from this directory. Coordinates are rounded and image
smoothing is disabled. Scale the context by whole numbers when possible.

Gameplay meaning must never depend on color alone. Pair status colors with an
icon, shape, text label, or animation. Keep important state readable with
particles and decorative effects disabled.

