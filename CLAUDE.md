# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (GitHub Pages) showcasing multiple self-contained web projects. Built with vanilla JavaScript, HTML5, and CSS3 — no framework, no build step.

## Local Development

```bash
npm install                  # Install Swiper.js dependency
python -m http.server 8000  # Serve locally (or use VS Code Live Server)
```

No build, lint, or test commands are configured.

## Architecture

The site is a **portfolio hub** pattern: `index.html` at the root links out to independent sub-projects, each living in its own folder with its own HTML/CSS/JS. There is no shared component system or module bundler.

```
index.html          # Portfolio landing page
resume.html         # Resume page
MusicSwipe/         # Spotify + YouTube music discovery app
Sprite Game/        # 2-player keyboard-controlled sprite game
TuffyPub/           # Multi-page web app (tuffy.html, landing.html, Dashboard.html)
Ayli/               # Single-page web app
Cocoweb/            # Web app with social media integrations
Open Inventory/     # Inventory dashboard
ShrineHouse/        # Web app
docs/               # Layout test pages
```

## MusicSwipe (most complex project)

`MusicSwipe/MusicSwipe.js` (~850 lines) is the most architecturally significant file. Key concepts:

- **OAuth flow:** Spotify login via redirect, token stored in `localStorage`
- **State:** `VideoData` objects tracked in a `videoDataMap` keyed by YouTube video ID
- **UI:** Swiper.js vertical carousel — each slide is a genre/track card
- **APIs used:** Spotify Web API (track search, recommendations) + YouTube Data API (video IDs) + YouTube IFrame Player API (playback)
- **Recommendation logic:** Like/dislike interactions update genre weights; watch time influences rankings

The hardcoded API keys in `MusicSwipe.js` (YouTube key, Spotify client ID) are public-facing client credentials — this is a known tradeoff for a static GitHub Pages deployment with no backend.

## Sprite Game

`Sprite Game/main.js` — Two independently controlled sprites (Robot vs Zombie) driven by `keydown`/`keyup` events. Boundary detection is done by clamping pixel positions against viewport dimensions.
