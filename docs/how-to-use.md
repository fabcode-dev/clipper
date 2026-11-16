# How to use Clipper

Start the app (see [setup.md](setup.md)) and open http://localhost:3000. The page has two tabs at the top right, **Clip a video** and **Split screen**, and a **Logo and caption** panel that applies to both.

## Make clips from one video

1. **Upload.** On the **Clip a video** tab, drop a video into the box or click to browse. A progress bar shows the upload.
2. **Choose the output shape** under the preview: 9:16 Vertical, 1:1 Square, 16:9 or Original. The preview shows what will be kept.
3. **Create your clips**, in either of two ways:
   - **Automatically:** in "Auto-create clips", pick 15s, 30s, 1 min, 2 min or a custom number of seconds, then press **Generate**. The whole video is cut into back-to-back clips.
   - **By hand:** drag the playhead to where a clip should start, press **Set to playhead** next to Start, move to the end point, and press **Set to playhead** next to End. You can also type the times. Press **+ Add clip at playhead** for more clips.
4. **Check each clip** with **▶ Preview**. Remove one with ✕.
5. *(Optional)* **Add a caption** in the "Caption" box of any clip.
6. *(Optional)* Add a logo and set the caption style (see below).
7. Press **Create N clips**.
8. Watch the **timer and progress bar**. When it finishes, play each clip and press **Download MP4**.

## Make a split-screen clip

1. Open the **Split screen** tab.
2. Upload the **Top video** and the **Bottom video**. Use **⇅ Swap top and bottom** if you put them in the wrong order.
3. Choose the **Audio**: top, bottom, mix of both, or none.
4. **Create your clips:**
   - **Automatically:** pick a length in "Auto-create clips" and press **Generate**. Both videos start at 0 and are cut together.
   - **By hand:** move the **Top playhead** and **Bottom playhead** to the moments you want, then press **+ Add clip at playheads**. Fine-tune "Top starts at", "Bottom starts at" and "Length" for each clip. Each video can start at a different time.
5. Use **▶ Preview** to play both videos together for that clip.
6. *(Optional)* Add captions, logo and style.
7. Press **Create N split clips**, then watch the timer and download the results.

## Add a logo

In the **Logo (optional)** panel on the right:

1. Upload an image (PNG with a transparent background is best).
2. Pick the **Corner** (the four arrow buttons).
3. Drag **Size** to make it larger or smaller.

The logo appears on the preview and on every clip. Press **Remove** to take it off.

## Add captions

1. Type the text in the **Caption** box of a clip. Leave it empty for no caption.
2. In **Caption style**, choose **Position** (Top, Middle, Bottom), **Size** and **Color**.

The style applies to all clips. The text can differ on each clip. Long text wraps to several lines.

## Reading the progress panel

| You see | It means |
| --- | --- |
| Big clock (for example `00:42`) | Time since you pressed Create. It becomes the **Total time** when done. |
| Percent bar and "About 01:10 remaining" | Overall progress and an estimate (appears after a few seconds). |
| Waiting / 63% · 00:05 / Done in 00:08 | The state of each clip. |
| **Cancel** | Stops the render. Finished clips stay available to download. |
| Red message | Something failed. The text explains why (for example a missing FFmpeg). |

## Tips

- **Short clips render faster.** Rendering time depends on your computer and on the clip length and size.
- **Time formats:** `45`, `1:05`, `1:05.5` and `1:02:03` all work in the time boxes.
- **Don't close the tab while uploading.** Rendering continues on the server, but uploads need the page open.
- **Download what you want to keep.** Files are deleted automatically after 24 hours.
- **Switching tabs is safe.** Your uploads and clips stay as they were.

## Common problems

| Problem | What to do |
| --- | --- |
| "Create" button is greyed out | Upload a video and make sure each clip's end is after its start. |
| "ffmpeg not found" | FFmpeg is not installed or not on PATH. See [setup.md](setup.md). |
| A split clip is shorter than I set | One video ran out of footage. The clip is shortened to the shortest available length. |
| No sound in the result | The chosen source has no audio track, or Audio is set to "No audio". |
| Caption is not shown | The caption box is empty, or no system font was found. See [setup.md](setup.md). |

More options and limits: [features.md](features.md).
