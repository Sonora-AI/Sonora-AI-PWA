# Sonora AI — PWA

Next.js 14 (App Router) progressive web app for Sonora AI — the studio interface for recording, mode selection, and AI-tuned playback.

## Design system

Minimalist Architectural Luxury: Obsidian Black (`#08080A`), Muted Graphite (`#121316`), Champagne Gold (`#E5C158`), Ice Titanium (`#E2E8F0`). Inter/SF Pro for UI, JetBrains/SF Mono for pitch (Hz) and timecode readouts. 1px frosted glass borders, background blur, high-DPI pitch contour curves.

## Layout

```
public/manifest.json     # PWA manifest
src/app/                 # App Router (Dashboard, Record, Studio)
src/components/ui/       # Glassmorphism UI components
src/hooks/                # Audio & job-status hooks
src/lib/                  # API client & theme constants
```

## Development

```bash
npm install
npm run dev
```
