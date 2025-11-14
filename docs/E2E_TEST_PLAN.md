# E2E Test Plan (Cypress or Playwright)

## Preconditions
- Vite dev server running locally with sample data.
- Mapbox token set in .env as VITE_MAPBOX_ACCESS_TOKEN.

## Test 1: Layer Toggle
- Navigate to /datasets-demo
- Expect map to load and sidebar to render overlay rows.
- Filter box: type "Health" and verify only matching overlay remains visible in list.
- Toggle ON the tile layer:
  - Assert raster layer added (e.g., by checking canvas changes or Mapbox debug hook if exposed).
- Toggle OFF the tile layer:
  - Assert raster layer removed.

## Test 2: Swipe Compare
- Ensure exactly two raster tile overlays are available.
- Toggle two tile overlays ON.
- Verify Swipe button becomes enabled.
- Click Swipe:
  - Expect sidebar controls to be disabled.
  - Expect visible draggable divider (fallback) or mapbox-gl-compare slider present.
- Drag divider ~30%.
  - Assert left portion reveals first raster and right portion reveals second raster (visual diff or layer visibility checks if test hooks available).
- Exit Swipe.
  - Controls re-enable and single map view restored.

## Accessibility
- TAB navigation reaches top controls and sidebar toggles.
- Divider handle focusable; ArrowLeft/ArrowRight moves divider.

## Notes
- Prefer Playwright for reliable mouse/keyboard interaction on the divider.
- If using Cypress, consider stubbing Mapbox network calls or use sample tiles to keep consistent rendering.
