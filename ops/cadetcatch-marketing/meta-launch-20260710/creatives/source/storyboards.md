# Video storyboards

Both videos are silent, fully burned-in-captioned, draft assets. They remain paused/unpublished.

## V1 Scroll Search — 9 seconds, 9:16

| Time | Frame | Message |
| --- | --- | --- |
| 0:00–0:02.25 | `frames/v1/v1-frame-01.png` | “Hours of scrolling? Review possible matches faster.” |
| 0:02.25–0:04.50 | `frames/v1/v1-frame-02.png` | “Add one clear photo” |
| 0:04.50–0:06.75 | `frames/v1/v1-frame-03.png` | “Search event photos” |
| 0:06.75–0:09.00 | `frames/v1/v1-frame-04.png` | Exact opening message plus free-download CTA |

Render command:

```bash
ffmpeg -y -framerate 4/9 -i creatives/frames/v1/v1-frame-%02d.png -vf "fps=30,format=yuv420p" -c:v libx264 -profile:v high -level 4.0 -crf 18 -movflags +faststart creatives/v1-scroll-search-1080x1920.mp4
```

## G2 Free Guide — 36 seconds, 9:16

| Time | Frame | Message |
| --- | --- | --- |
| 0:00–0:06 | `frames/g2/g2-frame-01.png` | “Free Swab Summer photo guide — no signup required.” |
| 0:06–0:12 | `frames/g2/g2-frame-02.png` | Start with public photo sources |
| 0:12–0:18 | `frames/g2/g2-frame-03.png` | Save the trusted source list |
| 0:18–0:24 | `frames/g2/g2-frame-04.png` | Use one clear photo |
| 0:24–0:30 | `frames/g2/g2-frame-05.png` | Review every possible match |
| 0:30–0:36 | `frames/g2/g2-frame-06.png` | Exact guide message and URL |

Render command:

```bash
ffmpeg -y -framerate 1/6 -i creatives/frames/g2/g2-frame-%02d.png -vf "fps=30,format=yuv420p" -c:v libx264 -profile:v high -level 4.0 -crf 18 -movflags +faststart creatives/g2-guide-video-1080x1920.mp4
```
