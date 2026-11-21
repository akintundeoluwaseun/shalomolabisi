# For Shalom — A small constellation

A one-page birthday experience in four scenes: Opening (hold to gather her name from stardust) → Journey (a constellation drawn by scrolling) → Letter (wax-sealed envelope) → Celebration (blow out the flame; dawn and engraved blooms).

## Run / build
    npm install
    npm run dev            # local preview
    npm run build          # static site in dist/  → drag onto Netlify Drop, or deploy to Vercel / GitHub Pages
    npm run build:single   # one self-contained file in dist-single/index.html

## Edit the words
All text lives in `src/content/story.ts`. To sign the letter, set `letter.signature`.

## Stack
React + TypeScript + Vite · GSAP (ScrollTrigger, ScrollTo) for choreography · Motion for gesture micro-interactions ·
Canvas 2D for the sky, the stardust name and the generative blooms · SVG for the constellation, seal and flame ·
Web Audio API for an optional, synthesised ambient score (no licensed music; never autoplays).
Respects prefers-reduced-motion.
