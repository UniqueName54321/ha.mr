# Retro Frontend Redesign — shrt.beep8.xyz

Date: 2026-08-14

## Overview

Fork of PortalRunner's `ha.mr` (link compressor / QR code generator) rebranded to
`shrt.beep8.xyz`. The two existing frontends (`index.html` and `404.html`) are
currently pixel-identical. This redesign gives each a distinct retro 8-bit
aesthetic while preserving all existing functionality (compression,
decompression, QR output, emoji toggle, error-correction slider).

## Goals

- Rebrand both pages from `ha.mr` / "hammer" to `shrt.beep8.xyz` / "short beep".
- Make each frontend visually and structurally unique within a shared retro 8-bit
  design language.
- Keep zero-dependency approach: inline CSS, vanilla JS, no build system.
- Preserve `main.js`, `compress.js`, `alphabets.js`, `qrcode.js` contract — all
  existing DOM ids and element types must remain unchanged so the JS keeps working.

## Non-Goals

- No changes to the compression/decompression engine.
- No changes to `standalone.js`, `qrcode.js`, `CNAME`, `LICENSE`.
- No new pages.
- No backend.

## Frontend 1: `index.html` — CRT Terminal (the tool)

- **Branding**: Title `shrt.beep8.xyz`, subtitle `(pronounced "short beep")`.
- **Font**: VT323 (terminal monospace) via Google Fonts `@import`.
- **Colors**:
  - Background: `#000000`
  - Primary text / phosphor: `#00ff41`
  - Secondary / dimmed text: `#008a10`
  - Accent / cursor: `#00ff41`
- **Visual effects**:
  - CRT scanline overlay via repeating-linear-gradient pseudo-element over the
    full viewport, `pointer-events: none`.
  - Subtle `text-shadow` glow on the title and output link.
  - Faint vignette (radial-gradient) around edges.
- **Layout**:
  - Centered chunky terminal-bezel frame (dark gray rounded border, inset shadow)
    resembling a CRT monitor.
  - Input rendered as a `$` prompt line; placeholder updated to something like
    `https://some-long.link/`.
  - Output renders like a terminal command result (blinking cursor animation).
- **QR code**: green-tinted via CSS `filter` when visible.

## Frontend 2: `404.html` — Retro Game Console (the error page)

- **Branding**: Same `shrt.beep8.xyz` mark, presented as a cartridge/console
  screen with a "GAME OVER"-style header.
- **Font**: Press Start 2P (chunky pixel game font) via Google Fonts `@import`.
- **Colors** (classic arcade palette):
  - Background: `#1a0030`
  - Primary accents: `#00ffff` (cyan), `#ff00ff` (magenta), `#ffff00` (yellow)
  - Text: `#ffffff` with colored highlights
- **Visual effects**:
  - 4px hard pixel borders (no `border-radius`).
  - Scanline / blinking animations on the header.
  - "404" rendered as pixel-art-style text (large, chunky, colored).
- **Layout**:
  - Centered console/TV frame (thick pixel border, dark inner bezel).
  - Big "404" pixel-art header.
  - Compact decompression input below the header.
- **QR code**: shown inside a pixel-art border.

## Additional Changes

- `main.js` line 84-85 uses `http://ha.mr#${output}` — must be updated to
  `https://shrt.beep8.xyz#${output}` for the rebranded output link.
- `main.js` and `standalone.js` contain decompression detection for
  `http://ha.mr` / `https://ha.mr` / `ha.mr` — these should also accept
  `shrt.beep8.xyz` for backward compatibility during transition.

## Constraints

- Both files must keep every existing `id` (e.g. `#loader`, `#content`,
  `#input-link`, `#output-link`, `#output-ratio`, `#qrcode`,
  `#qr-correct-level-container`, `#qr-correct-level`, `#settings-emoji`,
  `#settings-qr`, `#query-warning`) so `main.js` continues to work unchanged.
- Keep `<script src="/qrcode.js">` and `<script type="module" src="/main.js">`.
- Loader spinner behavior must be preserved (visible on load, fades out).
- Query-warning `<details>` block must remain present and functional.
- `<title>` tags updated to reflect the rebrand.
