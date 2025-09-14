# SsR Opel Z

3D animated stereo/dashboard experience — premium, tablet-optimized, production-ready SPA targeting Samsung Galaxy Tab SMT77U. Includes 3D cockpit scene, animated panels, Spotify integration, voice assistant, geolocation-adaptive visuals/DSP, wake-lock, fullscreen car-dock, and GitHub Pages CI.

## Live path

If deployed to GitHub Pages: `https://belisario-afk.github.io/SsR/`

## Features

- Cinematic 3D cockpit (react-three-fiber + drei) with neon grid, particles, and bloom
- Panels that unfold with spy-movie flair (framer-motion)
- Spotify Web Playback SDK with PKCE OAuth (no backend), device transfer, play/next/volume
- AI Voice Assistant (Web Speech) — “Welcome MR. Belisario” on first load; commands: play/pause/next/theme
- Geolocation-based adaptation — auto speed tracking; fallback slider when GPS absent
- Visual themes: Chase, Starlight, Romance (colors, particle density, bloom)
- Accessibility: keyboard navigation, high-contrast toggle
- Tablet-first UX: large hit targets, swipe gestures, fullscreen, Wake Lock with audio fallback
- Performance tuned for tablet GPU/CPU; antialias and dpr capped

## Quick start

```bash
# Clone and run locally
npm i
npm run dev
# Build
npm run build
# Preview
npm run preview
```

The app uses Vite with base set to `/SsR/` for GitHub Pages.

## Spotify setup

- Client ID is hardcoded for demo: `927fda6918514f96903e828fcd6bb576`
- Redirect URI is `https://belisario-afk.github.io/SsR/`
- First run will redirect to Spotify for consent (Authorization Code with PKCE)
- Required scopes include: streaming, modify/read playback state, offline_access
- The app transfers playback to the device "SsR Opel Z" and exposes play/next/volume

Notes:
- Spotify does not support changing playback speed for streaming; the app adapts visual intensity and uses Web Audio for speed DSP in fallback mode only.
- PKCE token exchange is done directly in the browser; Spotify supports CORS for `/api/token`.

## Gestures and controls

- Swipe left / right: switch panels
- Swipe up: cycle themes
- Keyboard: Left/Right arrows switch panels, "t" cycles themes
- Settings (top-right): Fullscreen toggle, High Contrast, Car Dock Mode
- Voice assistant button (bottom center): tap to listen; say "play", "pause", "next", or "theme starlight" etc.

## Tablet optimizations

- Target device: Samsung Galaxy Tab SMT77U (landscape default)
- Fullscreen auto on load, Car Dock Mode hides browser UI where possible (PWA standalone + Fullscreen API)
- Wake Lock API keeps the screen on; fallback silent audio loop retains awake state
- Large controls (44–56px touch targets), pointer-events layering to keep 3D interactive while UI remains accessible
- Performance: capped dpr, minimal post-processing, low-poly cockpit, adaptive particle counts with speed

### Preventing sleep

- The app requests `navigator.wakeLock.request('screen')`
- If unsupported or fails, a near-silent loop via Web Audio runs in the background
- Tip (SMT77U): Enable Developer Options → "Stay awake" when charging; set display timeout to max for car sessions

## Accessibility

- High-contrast mode toggles enhanced contrast
- Keyboard navigation for panels and theme switching
- Screen reader labels on primary controls

## Project structure

```
src/
  assets/         # logos and icons
  components/     # UI and 3D components
  providers/      # React contexts (Spotify, Speed, Theme, Gestures)
  styles/         # TailwindCSS
  utils/          # OAuth, device, wake lock helpers
  main.tsx, App.tsx
types/
.github/workflows/deploy.yml
```

## Testing

- Vitest basic test included for OAuth config.
- Run `npm test`.

## Deployment (GitHub Pages)

- On pushes to `main`, GitHub Actions builds and deploys `dist` to Pages.
- Vite `base` is set to `/SsR/`.

## Branding

- App title: "SsR Opel Z"
- Opel "Z" chrome SVG and favicon included (`src/assets/opelZ.svg`, `public/favicon.svg`)

## License

MIT — see [LICENSE](./LICENSE).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).