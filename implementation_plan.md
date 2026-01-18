# Implementation Plan - Mobile Compatibility Optimization

This plan addresses the issue where the info panel occupies too much screen space on mobile devices, obscuring the 3D model.

## Proposed Changes

### [Component] Layout & Styling (`styles.css`)

#### [MODIFY] [styles.css](file:///c:/Users/uruzgar/.gemini/antigravity/scratch/molecule-viewer/styles.css)

- **Reduce Mobile Info Panel Height**: Change `max-height: 50vh` to something smaller (e.g., `35vh`) or implement a "collapsed" state.
- **Implement a "Minimize/Expand" Toggle for Mobile**:
    - Add a toggle button or gesture to collapse/expand the panel on mobile.
    - Default to a collapsed state (showing only the title and formula) to maximize 3D model visibility.
- **Adjust Font Sizes**: Slightly reduce font sizes on mobile for better information density.
- **Ensure Canvas Visibility**: Ensure the `molecule-canvas` remains visible and interactive "behind" the semi-transparent panel if possible, or adjust the scene camera to center the molecule in the visible area.

### [Component] Logic (`app.js`)

#### [MODIFY] [app.js](file:///c:/Users/uruzgar/.gemini/antigravity/scratch/molecule-viewer/app.js)

- **Handle Panel Toggling**: Add logic to handle the new expand/collapse button for the mobile info panel.
- **Responsive Camera Adjustment**: Optionally adjust the Three.js camera/controls based on the visible screen area when the panel is shown.

## Verification Plan

### Manual Verification
1. Open the application on a mobile device (or use browser developer tools mobile emulation).
2. Search for a molecule.
3. Verify that the info panel initially appears in a "minimized" state or is small enough to see the 3D model.
4. Toggle the panel to expand/collapse and ensure it works smoothly.
5. Verify that the 3D model can be rotated and zoomed while the panel is present.
