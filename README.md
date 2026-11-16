# Clipper

Turn long videos into short clips, right on your own computer.

- **Clip a video:** cut one video into as many clips as you want, by hand or automatically (every 15s, 30s, 1 min, 2 min or a custom length).
- **Split screen:** stack two videos, one above the other, into a single vertical clip.
- **Logo and captions:** add your logo and a caption to any clip.
- **Live timer:** see the elapsed time, percent complete and time remaining while clips render.

Videos are processed locally with FFmpeg. Nothing is sent to an outside service.

## Quick start

You need [Node.js](https://nodejs.org) 20.9 or newer and [FFmpeg](https://ffmpeg.org) installed.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

On a fresh PC, follow the full guide: **[docs/setup.md](docs/setup.md)**.

## Documentation

| Guide | What's in it |
| --- | --- |
| [Setup](docs/setup.md) | Installing Node.js, FFmpeg and the project on a fresh PC, running it, and fixing problems |
| [How to use](docs/how-to-use.md) | Step-by-step: making clips, split screen, logo, captions, and the progress panel |
| [Features](docs/features.md) | Everything the tool can do, plus its current limits |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the development server with auto-reload |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Check the code with ESLint |

## How it works

- **Frontend:** Next.js (App Router) and React, in `app/`. The editor lives in `app/_components/`.
- **API routes:** `app/api/` handles uploads, serving files with seek support, and starting and checking render jobs.
- **Rendering:** `lib/server/ffmpeg.ts` builds the FFmpeg commands (crop, stack, logo overlay, captions) and reports progress. `lib/server/jobs.ts` runs the clips one after another and tracks their status.
- **Storage:** uploads and results go in the system temp folder (`clipper-data`) and are deleted after 24 hours.

This project uses a recent Next.js with changes from older versions. Before changing framework code, read the guides in `node_modules/next/dist/docs/` (see `AGENTS.md`).
