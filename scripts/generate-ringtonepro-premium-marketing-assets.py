#!/usr/bin/env python3
from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "app-store" / "releases" / "ring-tone-creator-pro"
IPHONE_69 = RELEASE / "screenshots" / "iphone-69"
IPHONE_65 = RELEASE / "screenshots" / "iphone-65"
RAW = RELEASE / "screenshots" / "raw"
PUBLIC = ROOT / "public" / "ringtonecreatorpro"

INK = (246, 248, 252, 255)
MUTED = (163, 174, 190, 255)
LINE = (220, 232, 244, 42)
TEAL = (20, 224, 232, 255)
MINT = (100, 236, 203, 255)
PINK = (255, 70, 148, 255)
AMBER = (255, 197, 96, 255)
PANEL = (18, 23, 32, 248)
PANEL_2 = (28, 34, 46, 250)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Avenir.ttc",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def ensure_dirs() -> None:
    for path in [IPHONE_69, IPHONE_65, RAW, PUBLIC]:
        path.mkdir(parents=True, exist_ok=True)


def lerp(a: int, b: int, t: float) -> int:
    return int(a * (1 - t) + b * t)


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        color = tuple(lerp(top[i], bottom[i], t) for i in range(3)) + (255,)
        draw.line((0, y, w, y), fill=color)
    return img


def add_radial(img: Image.Image, center: tuple[int, int], radius: int, color: tuple[int, int, int, int]) -> None:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")
    x, y = center
    for r in range(radius, 0, -10):
        alpha = int(color[3] * (1 - r / radius) ** 1.8)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color[:3] + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(max(18, radius // 12))))


def draw_tracking(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.ImageFont, fill, tracking: int = 4) -> None:
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        bbox = draw.textbbox((x, y), char, font=fnt)
        x += bbox[2] - bbox[0] + tracking


def wrapped(text: str, width: int) -> str:
    return "\n".join(textwrap.wrap(text, width=width, break_long_words=False))


def draw_wave(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], bars: int = 48) -> None:
    x1, y1, x2, y2 = box
    mid = (y1 + y2) // 2
    for i in range(bars):
        t = i / max(1, bars - 1)
        x = x1 + int((x2 - x1) * t)
        amp = 20 + 88 * abs(math.sin(i * 0.46)) + 30 * abs(math.cos(i * 0.21))
        color = TEAL if i % 5 else PINK
        draw.rounded_rectangle((x - 3, mid - amp // 2, x + 3, mid + amp // 2), radius=3, fill=color)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill, outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def icon_line_mark(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    r1 = int(150 * scale)
    r2 = int(104 * scale)
    draw.ellipse((cx - r1, cy - r1, cx + r1, cy + r1), outline=(235, 244, 252, 190), width=max(2, int(5 * scale)))
    draw.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=(24, 224, 232, 205), width=max(2, int(4 * scale)))
    for i in range(17):
        x = cx - int(83 * scale) + int(i * 10.5 * scale)
        amp = int((28 + 76 * abs(math.sin(i * 0.76))) * scale)
        color = TEAL if i % 4 else PINK
        draw.rounded_rectangle((x - int(2.4 * scale), cy - amp // 2, x + int(2.4 * scale), cy + amp // 2), radius=max(1, int(2 * scale)), fill=color)
    draw.arc((cx - r1 + int(24 * scale), cy - r1 + int(24 * scale), cx + r1 - int(24 * scale), cy + r1 - int(24 * scale)), 308, 354, fill=AMBER, width=max(2, int(4 * scale)))


def make_web_icon(size: int) -> Image.Image:
    img = gradient((size, size), (7, 10, 16), (15, 18, 27))
    add_radial(img, (int(size * 0.73), int(size * 0.2)), int(size * 0.46), (28, 224, 232, 95))
    add_radial(img, (int(size * 0.18), int(size * 0.82)), int(size * 0.42), (255, 70, 148, 70))
    draw = ImageDraw.Draw(img, "RGBA")
    pad = int(size * 0.06)
    rounded(draw, (pad, pad, size - pad, size - pad), int(size * 0.18), None, (255, 255, 255, 28), max(1, size // 190))
    icon_line_mark(draw, size // 2, int(size * 0.45), size / 1024)
    word = "RT"
    fnt = font(max(26, int(size * 0.12)))
    bbox = draw.textbbox((0, 0), word, font=fnt)
    draw.text(((size - (bbox[2] - bbox[0])) / 2, int(size * 0.68)), word, font=fnt, fill=(247, 250, 252, 230))
    if size >= 512:
        small = font(int(size * 0.038))
        label = "RING TONE"
        lb = draw.textbbox((0, 0), label, font=small)
        draw_tracking(draw, (int((size - (lb[2] - lb[0] + len(label) * 5)) / 2), int(size * 0.82)), label, small, (178, 190, 205, 210), max(2, size // 170))
    return img.convert("RGB")


def write_web_assets() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#070A10"/>
      <stop offset="1" stop-color="#111823"/>
    </linearGradient>
    <radialGradient id="glow" cx=".72" cy=".24" r=".7">
      <stop offset="0" stop-color="#14E0E8" stop-opacity=".42"/>
      <stop offset="1" stop-color="#14E0E8" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <rect width="512" height="512" rx="108" fill="url(#glow)"/>
  <circle cx="256" cy="230" r="138" fill="none" stroke="#EEF6FC" stroke-opacity=".72" stroke-width="3"/>
  <circle cx="256" cy="230" r="94" fill="none" stroke="#14E0E8" stroke-opacity=".82" stroke-width="3"/>
  <path d="M172 229h12v-40h6v80h10v-116h7v154h10v-92h8v52h8v-130h8v184h9v-78h8v36h8v-108h8v136h9v-58h8v32h8v-98h8v92h9v-48h8v22h8v-64h8v44h11" fill="none" stroke="#14E0E8" stroke-linecap="round" stroke-width="5"/>
  <path d="M168 108c54-34 126-38 184-6" fill="none" stroke="#FF466F" stroke-linecap="round" stroke-opacity=".82" stroke-width="4"/>
  <text x="256" y="382" text-anchor="middle" fill="#F7FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-size="70" font-weight="300" letter-spacing="8">RT</text>
  <text x="256" y="429" text-anchor="middle" fill="#AEB8C8" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" font-size="19" font-weight="300" letter-spacing="5">RING TONE</text>
</svg>
"""
    (PUBLIC / "favicon.svg").write_text(svg)
    sizes = {
        "favicon-16.png": 16,
        "favicon-32.png": 32,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "apple-touch-icon.png": 180,
        "web-icon-1024.png": 1024,
    }
    for name, size in sizes.items():
        make_web_icon(size).save(PUBLIC / name)
    make_og_image().save(PUBLIC / "og-image.png", quality=96)
    make_web_icon(1024).save(RELEASE / "web-icon-1024.png")
    (PUBLIC / "site.webmanifest").write_text(
        """{
  "name": "Ring Tone Creator Pro",
  "short_name": "Ring Tone",
  "icons": [
    { "src": "/ringtonecreatorpro/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/ringtonecreatorpro/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#070A10",
  "background_color": "#070A10",
  "display": "standalone"
}
"""
    )


def screenshot_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = gradient(size, (6, 8, 13), (11, 13, 20))
    add_radial(img, (int(w * 0.82), int(h * 0.12)), int(w * 0.72), (24, 224, 232, 70))
    add_radial(img, (int(w * 0.12), int(h * 0.92)), int(w * 0.68), (255, 70, 148, 48))
    draw = ImageDraw.Draw(img, "RGBA")
    for y in range(-220, h + 220, 112):
        draw.line((-80, y, w + 80, y - 480), fill=(255, 255, 255, 12), width=1)
    for x in range(-120, w + 120, 126):
        draw.arc((x, int(h * 0.28), x + 460, int(h * 0.28) + 460), 204, 338, fill=(255, 255, 255, 9), width=1)
    return img


def draw_device(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], scene: str) -> None:
    x1, y1, x2, y2 = box
    w = x2 - x1
    h = y2 - y1
    shadow = Image.new("RGBA", (w + 90, h + 90), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow, "RGBA")
    sd.rounded_rectangle((45, 34, w + 45, h + 34), radius=72, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    draw.bitmap((x1 - 45, y1 - 34), shadow, fill=None)
    rounded(draw, box, 74, (7, 9, 14, 255), (255, 255, 255, 80), 3)
    rounded(draw, (x1 + 26, y1 + 38, x2 - 26, y2 - 28), 50, (14, 18, 26, 255), (255, 255, 255, 24), 2)
    draw.rounded_rectangle((x1 + w // 2 - 88, y1 + 50, x1 + w // 2 + 88, y1 + 78), radius=14, fill=(5, 7, 11, 255))

    sx1, sy1 = x1 + 58, y1 + 104
    sx2, sy2 = x2 - 58, y2 - 58
    draw_tracking(draw, (sx1, sy1), "RING TONE", font(19), (150, 164, 182, 255), 3)
    draw.text((sx1, sy1 + 40), scene_title(scene), font=font(40), fill=INK)
    draw.line((sx1, sy1 + 98, sx2, sy1 + 98), fill=LINE, width=1)
    content = (sx1, sy1 + 130, sx2, sy2)
    {
        "create": draw_create_scene,
        "editor": draw_editor_scene,
        "library": draw_library_scene,
        "signup": draw_signup_scene,
        "pro": draw_pro_scene,
        "install": draw_install_scene,
    }[scene](draw, content)


def scene_title(scene: str) -> str:
    return {
        "create": "Create",
        "editor": "Editor",
        "library": "Library",
        "signup": "Sign up",
        "pro": "Pro",
        "install": "Install",
    }[scene]


def draw_tile(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, accent) -> None:
    rounded(draw, box, 28, PANEL_2, (255, 255, 255, 30), 1)
    x1, y1, x2, _ = box
    draw.ellipse((x1 + 28, y1 + 26, x1 + 72, y1 + 70), outline=accent, width=3)
    draw.line((x1 + 40, y1 + 48, x1 + 62, y1 + 48), fill=accent, width=3)
    draw.text((x1 + 92, y1 + 31), label, font=font(27), fill=INK)
    draw.text((x1 + 92, y1 + 68), "Ready", font=font(18), fill=MUTED)


def draw_create_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    gap = 22
    tile_h = 128
    labels = [("Files", TEAL), ("Video audio", PINK), ("Voice", MINT), ("Starter tones", AMBER)]
    for i, (label, color) in enumerate(labels):
        y = y1 + i * (tile_h + gap)
        draw_tile(draw, (x1, y, x2, y + tile_h), label, color)
    rounded(draw, (x1, y1 + 4 * (tile_h + gap) + 18, x2, y1 + 4 * (tile_h + gap) + 96), 28, TEAL, None, 1)
    draw.text((x1 + 32, y1 + 4 * (tile_h + gap) + 39), "Start a new tone", font=font(27), fill=(5, 11, 19, 255))


def draw_editor_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    rounded(draw, (x1, y1, x2, y1 + 300), 32, PANEL, (255, 255, 255, 28), 1)
    draw_wave(draw, (x1 + 34, y1 + 54, x2 - 34, y1 + 246), 62)
    for x in (x1 + 130, x2 - 170):
        draw.line((x, y1 + 34, x, y1 + 266), fill=AMBER, width=4)
        draw.ellipse((x - 18, y1 + 258, x + 18, y1 + 294), fill=AMBER)
    controls = [("0:12", TEAL), ("Fade in", MINT), ("Fade out", PINK), ("Export M4R", AMBER)]
    for i, (label, color) in enumerate(controls):
        y = y1 + 334 + i * 88
        rounded(draw, (x1, y, x2, y + 64), 22, PANEL_2, (255, 255, 255, 25), 1)
        draw.ellipse((x1 + 24, y + 20, x1 + 48, y + 44), fill=color)
        draw.text((x1 + 68, y + 17), label, font=font(24), fill=INK)


def draw_library_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    tones = [("Neon Pulse", "M4R 18s", TEAL), ("Velvet Alert", "Favorite", PINK), ("Golden Rise", "Draft", AMBER), ("Orbit Tone", "Exported", MINT)]
    for i, (title, meta, color) in enumerate(tones):
        y = y1 + i * 126
        rounded(draw, (x1, y, x2, y + 102), 28, PANEL_2, (255, 255, 255, 24), 1)
        draw_wave(draw, (x1 + 24, y + 24, x1 + 170, y + 78), 18)
        draw.text((x1 + 202, y + 23), title, font=font(26), fill=INK)
        draw.text((x1 + 202, y + 59), meta, font=font(18), fill=MUTED)
        draw.ellipse((x2 - 58, y + 32, x2 - 30, y + 60), outline=color, width=3)
    rounded(draw, (x1, y1 + 538, x2, y1 + 620), 27, (33, 39, 53, 255), (255, 255, 255, 28), 1)
    draw.text((x1 + 30, y1 + 562), "Search, favorite, duplicate, re-edit", font=font(23), fill=MUTED)


def draw_signup_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    rounded(draw, (x1, y1, x2, y1 + 164), 34, PANEL, (255, 255, 255, 30), 1)
    for i in range(3):
        cx = x1 + 86 + i * 90
        draw.ellipse((cx - 28, y1 + 54, cx + 28, y1 + 110), outline=TEAL if i < 3 else LINE, width=4)
    draw.text((x1 + 340, y1 + 48), "3 free exports", font=font(31), fill=INK)
    draw.text((x1 + 340, y1 + 91), "Synced to your account", font=font(19), fill=MUTED)
    fields = ["Email address", "Password", "Create account"]
    for i, label in enumerate(fields):
        y = y1 + 214 + i * 104
        fill = TEAL if i == 2 else PANEL_2
        text_fill = (5, 11, 19, 255) if i == 2 else MUTED
        rounded(draw, (x1, y, x2, y + 76), 24, fill, (255, 255, 255, 24), 1)
        draw.text((x1 + 30, y + 24), label, font=font(23), fill=text_fill)
    draw.text((x1, y1 + 560), "Delete account anytime", font=font(21), fill=MUTED)


def draw_pro_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    rounded(draw, (x1, y1, x2, y1 + 220), 38, (17, 29, 39, 255), (20, 224, 232, 86), 2)
    draw.text((x1 + 34, y1 + 34), "$0.99", font=font(70), fill=INK)
    draw.text((x1 + 282, y1 + 76), "/ month", font=font(24), fill=MUTED)
    draw.text((x1 + 34, y1 + 142), "Unlimited exports. No ads.", font=font(27), fill=TEAL)
    benefits = [("Unlimited M4R exports", TEAL), ("Remove banners", PINK), ("Restore purchases", MINT)]
    for i, (label, color) in enumerate(benefits):
        y = y1 + 270 + i * 108
        rounded(draw, (x1, y, x2, y + 78), 24, PANEL_2, (255, 255, 255, 25), 1)
        draw.ellipse((x1 + 28, y + 24, x1 + 58, y + 54), fill=color)
        draw.text((x1 + 82, y + 23), label, font=font(24), fill=INK)
    rounded(draw, (x1, y1 + 620, x2, y1 + 696), 26, TEAL, None, 1)
    draw.text((x1 + 32, y1 + 644), "Go Unlimited", font=font(24), fill=(5, 11, 19, 255))


def draw_install_scene(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, _ = box
    steps = [
        ("1", "Export ringtone-ready file"),
        ("2", "Share to GarageBand"),
        ("3", "Save as ringtone"),
        ("4", "Assign to contact"),
    ]
    for i, (num, label) in enumerate(steps):
        y = y1 + i * 126
        rounded(draw, (x1, y, x2, y + 92), 27, PANEL_2, (255, 255, 255, 24), 1)
        draw.ellipse((x1 + 24, y + 22, x1 + 72, y + 70), outline=TEAL, width=3)
        draw.text((x1 + 41, y + 30), num, font=font(20), fill=TEAL)
        draw.text((x1 + 100, y + 28), label, font=font(24), fill=INK)
    draw.line((x1 + 48, y1 + 94, x1 + 48, y1 + 378), fill=(20, 224, 232, 90), width=2)
    rounded(draw, (x1, y1 + 548, x2, y1 + 626), 28, PANEL, (255, 255, 255, 24), 1)
    draw.text((x1 + 30, y1 + 572), "No direct Settings claims", font=font(22), fill=MUTED)


def make_screenshot(size: tuple[int, int], headline: str, subhead: str, scene: str) -> Image.Image:
    w, h = size
    img = screenshot_background(size)
    draw = ImageDraw.Draw(img, "RGBA")
    margin = int(w * 0.075)
    y = int(h * 0.062)
    draw_tracking(draw, (margin, y), "RING TONE CREATOR PRO", font(29), TEAL, 5)
    y += 86
    headline_size = 74 if w >= 1290 else 72
    draw.multiline_text((margin, y), wrapped(headline, 18), font=font(headline_size), fill=INK, spacing=10)
    y += 250
    draw.multiline_text((margin, y), wrapped(subhead, 35), font=font(31), fill=MUTED, spacing=7)
    draw.line((margin, y + 120, w - margin, y + 120), fill=(255, 255, 255, 28), width=1)
    phone_w = int(w * 0.76)
    phone_h = int(h * 0.55)
    phone_x = (w - phone_w) // 2
    phone_y = int(h * 0.405)
    draw_device(draw, (phone_x, phone_y, phone_x + phone_w, phone_y + phone_h), scene)
    footer = "Private audio on device"
    if scene == "pro":
        footer = "Unlimited exports require subscription"
    if scene == "signup":
        footer = "Remote credits require account"
    draw_tracking(draw, (margin, h - 118), footer.upper(), font(22), (180, 192, 207, 210), 4)
    return img.convert("RGB")


def make_og_image() -> Image.Image:
    size = (1200, 630)
    img = screenshot_background(size)
    draw = ImageDraw.Draw(img, "RGBA")
    icon = make_web_icon(220)
    img.paste(icon, (80, 84))
    draw_tracking(draw, (338, 110), "RING TONE CREATOR PRO", font(28), TEAL, 5)
    draw.multiline_text((338, 174), "Premium ringtone\nstudio for iPhone", font=font(72), fill=INK, spacing=4)
    draw.text((342, 390), "Import, trim, fade, export, and install custom ringtone-ready files.", font=font(30), fill=MUTED)
    rounded(draw, (342, 474, 760, 534), 30, TEAL, None, 1)
    draw.text((374, 490), "Three free exports", font=font(25), fill=(5, 11, 19, 255))
    return img.convert("RGB")


def write_screenshots() -> None:
    shots = [
        ("01-create.png", "Turn any sound into a signature ringtone", "Import from Files, video, music, voice, or polished starter tones.", "create"),
        ("02-editor.png", "Edit the exact hook in seconds", "Trim the waveform, add fades, preview cleanly, and export M4R.", "editor"),
        ("03-library.png", "Keep every tone project organized", "Search, favorite, duplicate, and re-edit your best ringtone drafts.", "library"),
        ("04-signup.png", "Get three exports when you sign up", "Remote credits keep your free exports synced to your account.", "signup"),
        ("05-pro.png", "Unlimited exports for $0.99/month", "Go Pro for unlimited ringtone creation and an ad-free studio.", "pro"),
        ("06-install.png", "Follow the guided iPhone install flow", "Export ringtone-ready files and finish setup with GarageBand.", "install"),
    ]
    for filename, headline, subhead, scene in shots:
        make_screenshot((1290, 2796), headline, subhead, scene).save(IPHONE_69 / filename, quality=96)
        make_screenshot((1284, 2778), headline, subhead, scene).save(IPHONE_65 / filename, quality=96)
        make_screenshot((1290, 2796), headline, subhead, scene).save(RAW / filename, quality=96)


def main() -> None:
    ensure_dirs()
    write_web_assets()
    write_screenshots()
    print("Generated premium Ring Tone Creator Pro web icons and App Store screenshots.")


if __name__ == "__main__":
    main()
