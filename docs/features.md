# Features

## Two ways to make clips

### 1. Clip a video
Upload one video and cut it into as many clips as you want.

- Set each clip's **start** and **end** by typing a time (`83.5`, `1:23.5` or `1:02:03`) or by moving the playhead and pressing **Set to playhead**.
- **Preview** plays only the selected range, so you can check it before rendering.
- Each clip is rendered as its own MP4.
- Choose the output shape:

| Format | Size | Use for |
| --- | --- | --- |
| 9:16 Vertical | 1080×1920 | Shorts, Reels, TikTok |
| 1:1 Square | 1080×1080 | Feed posts |
| 16:9 | 1920×1080 | Landscape |
| Original | Source size (long side capped at 1920) | Keeping the source shape |

Videos that don't match the chosen shape are cropped to fill the frame. The preview shows exactly what will be kept.

### 2. Split screen
Upload two videos and stack them into one clip: one on top, one below.

- Output is always 1080×1920 (vertical), each video filling half the frame.
- Pick which video is on top and which is on the bottom, and **swap** them with one click.
- Each clip has its own start time for the top video and for the bottom video, plus one shared length. You can combine different moments from the two videos.
- Choose the audio: top video, bottom video, a mix of both, or no audio. If the chosen video has no sound, the other one is used automatically.

## Auto-create clips
Instead of placing every clip by hand, pick a length (15s, 30s, 1 min, 2 min, or any number of seconds) and press **Generate**. The whole video is split into back-to-back clips of that length.

- In split mode, both videos start at 0 and the clip count follows the shorter video.
- A leftover piece shorter than 3 seconds at the end is dropped.
- It replaces the current clip list, and you can still edit any clip afterwards.
- Limited to 50 clips per job.

## Logo and captions
Available in both modes and applied to every clip in the job.

**Logo**
- Upload a PNG, JPG or WebP. A PNG with a transparent background looks best.
- Choose any of the four corners and the size (5% to 50% of the video width).

**Captions**
- Type caption text on each clip. A clip with no text has no caption.
- Long text wraps onto several lines automatically.
- Choose the position (top, middle or bottom), size and colour. These apply to all clips.

A live preview shows the logo and caption on the video before you render.

## Live progress and timer
While clips are rendering you see:

- A large **elapsed time** counter that starts when you press Create.
- Overall **percent complete** and an estimate of **time remaining**.
- A line per clip: waiting, percent and time so far, or "Done in mm:ss".
- The **total time** when everything finishes.
- A **Cancel** button that stops the render.

Finished clips appear with a video player and a **Download MP4** button.

## Other details
- **Large files:** uploads are streamed straight to disk with a progress bar, so there is no built-in size limit.
- **Edits are kept when switching tabs:** moving between "Clip a video" and "Split screen" keeps your uploads and clips.
- **Output:** H.264 video and AAC audio in an MP4 that plays in browsers, phones and social apps.
- **Runs on your machine:** videos are processed with FFmpeg on the computer running the app, not sent to a third-party service.
- **Temporary storage:** files are deleted automatically after 24 hours.

## Current limits
- Split screen is top/bottom only (no side by side) and always vertical 1080×1920.
- One caption per clip, shown for the whole clip (no timed or word-by-word captions).
- Captions use Arial (or DejaVu on Linux), so some scripts such as Hindi do not display.
- No login or user accounts, and jobs are held in server memory, so restarting the server cancels a running render.
