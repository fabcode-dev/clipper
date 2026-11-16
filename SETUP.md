# Clipper: Setup on a fresh PC

Clipper cuts clips from a video, or stacks two videos into a split-screen clip, with optional logo and captions. It is a Next.js app that uses **FFmpeg** on the server to render videos, so FFmpeg must be installed on the machine that runs it.

## What you need

| Requirement | Version | Why |
| --- | --- | --- |
| Node.js (includes npm) | 20.9 or newer (22 or 24 LTS recommended) | Runs Next.js 16 |
| FFmpeg (includes ffprobe) | 5 or newer (a "full" build is fine) | Cuts, crops, overlays and encodes video |
| Git | any recent | Gets the code (skip if you copy the folder) |
| A modern browser | Chrome, Edge, Firefox or Safari | The editor UI |

Nothing else is required: no database, no API keys and no environment variables.

## 1. Install Node.js

**Windows**
```powershell
winget install OpenJS.NodeJS.LTS
```
Or download the LTS installer from https://nodejs.org.

**macOS**
```bash
brew install node
```

**Linux (Debian/Ubuntu)**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Close and reopen your terminal, then check:
```bash
node -v    # v20.9.0 or higher
npm -v
```

## 2. Install FFmpeg

**Windows**
```powershell
winget install Gyan.FFmpeg
```
Or download a "full" build from https://www.gyan.dev/ffmpeg/builds/, unzip it, and add its `bin` folder to your PATH.

**macOS**
```bash
brew install ffmpeg
```

**Linux (Debian/Ubuntu)**
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
```

Close and reopen your terminal, then check that **both** commands work:
```bash
ffmpeg -version
ffprobe -version
```

If they say "not found", the `bin` folder is not on your PATH. Either fix the PATH, or tell the app where they are (see Troubleshooting).

## 3. Install Git (optional)

```powershell
winget install Git.Git        # Windows
brew install git              # macOS
sudo apt-get install -y git   # Linux
```

## 4. Get the code and install dependencies

```bash
git clone <your-repo-url> clipper
cd clipper
npm install
```

If you copied the project folder instead, skip the clone, delete any old `node_modules` and `.next` folders, and run `npm install` inside it.

## 5. Run it

**Development** (auto-reloads when you edit code):
```bash
npm run dev
```

**Production** (faster, for real use):
```bash
npm run build
npm run start
```

Open http://localhost:3000.

To use another port: `npm run dev -- -p 4000` or `npm run start -- -p 4000`.

To use it from another device on your network, open `http://<this-pc-ip>:3000`. You may need to allow Node through the firewall.

## 6. Check that it works

1. Open http://localhost:3000.
2. Upload any short video in **Clip a video**.
3. Press an auto-create button (for example 15s) and click **Create clips**.
4. You should see the elapsed timer count up, then a player and a Download button for each clip.

If a render fails, the error from FFmpeg appears in the progress panel.

## Optional settings

Set these environment variables only if the tools are not on your PATH.

| Variable | Example |
| --- | --- |
| `FFMPEG_PATH` | `C:\tools\ffmpeg\bin\ffmpeg.exe` |
| `FFPROBE_PATH` | `C:\tools\ffmpeg\bin\ffprobe.exe` |

Put them in a `.env.local` file in the project root:
```
FFMPEG_PATH=C:\tools\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\tools\ffmpeg\bin\ffprobe.exe
```
Restart the server after changing it.

## Where files are stored

Uploads and finished clips are kept in your system temp folder under `clipper-data` (on Windows, `%TEMP%\clipper-data`). Files older than 24 hours are deleted automatically. **Download the clips you want to keep.**

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `ffprobe not found` or `ffmpeg not found` | Install FFmpeg (step 2), reopen the terminal, and run `ffmpeg -version`. Or set `FFMPEG_PATH` and `FFPROBE_PATH`. |
| `npm` or `node` not recognized | Reopen the terminal after installing Node. On Windows, make sure Node was added to PATH. |
| `npm install` fails on an old Node | Run `node -v`. It must be 20.9 or newer. |
| Port 3000 already in use | Run on another port (`npm run dev -- -p 4000`), or stop the other program. |
| Captions are missing from the output | Captions need a system font. Windows and macOS have one by default. On Linux install one: `sudo apt-get install -y fonts-dejavu-core`. |
| Captions show boxes instead of letters | Captions use Arial or DejaVu, which lack some scripts (for example Hindi). The font is chosen in `lib/server/ffmpeg.ts` (`findFont`). |
| Upload says "Not a readable media file" | The file is corrupted or not a video. Try another file, or convert it to MP4. |
| Rendering is slow | Long or high-resolution source videos take longer. Rendering uses the CPU, so close other heavy programs. |

## Notes for deploying on a server

- Use a host where you control the machine (a VPS or your own PC) and can install FFmpeg. Serverless hosts such as Vercel cannot run FFmpeg and do not allow large uploads.
- Run with `npm run build` and `npm run start`, and put a reverse proxy such as nginx in front of it. Raise the proxy's upload size limit (nginx: `client_max_body_size 5g;`) and its timeouts.
- There is no login. Anyone who can open the site can upload and render, so keep it on a private network or add authentication before exposing it publicly.
- Jobs are tracked in server memory, so a restart cancels any render in progress.
