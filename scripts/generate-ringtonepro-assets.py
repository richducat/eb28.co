#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import os
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "ios" / "RingToneCreatorPro" / "RingToneCreatorPro"
ASSETS = APP / "Assets.xcassets"
APPICON = ASSETS / "AppIcon.appiconset"
STARTERS = APP / "Resources" / "StarterTones"
RELEASE = ROOT / "app-store" / "releases" / "ring-tone-creator-pro"
RAW = RELEASE / "screenshots" / "raw"
IPHONE_69 = RELEASE / "screenshots" / "iphone-69"
IPHONE_65 = RELEASE / "screenshots" / "iphone-65"


def ensure_dirs() -> None:
    for path in [APPICON, STARTERS, RAW, IPHONE_69, IPHONE_65, ASSETS / "AccentColor.colorset", ASSETS / "LaunchBackground.colorset"]:
        path.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def gradient(size: tuple[int, int], colors: list[tuple[int, int, int]]) -> Image.Image:
    width, height = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(height - 1, 1)
        idx = min(len(colors) - 2, int(t * (len(colors) - 1)))
        local = t * (len(colors) - 1) - idx
        c1, c2 = colors[idx], colors[idx + 1]
        color = tuple(int(c1[i] * (1 - local) + c2[i] * local) for i in range(3))
        draw.line([(0, y), (width, y)], fill=color)
    return img


def draw_centered(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fill, size: int, bold=False) -> None:
    f = font(size, bold)
    bbox = draw.multiline_textbbox((0, 0), text, font=f, spacing=8, align="center")
    x = box[0] + (box[2] - box[0] - (bbox[2] - bbox[0])) / 2
    y = box[1] + (box[3] - box[1] - (bbox[3] - bbox[1])) / 2
    draw.multiline_text((x, y), text, font=f, fill=fill, spacing=8, align="center")


def create_icon_base(size: int = 1024) -> Image.Image:
    img = gradient((size, size), [(7, 9, 16), (16, 24, 43), (8, 10, 17)]).convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")
    draw.rounded_rectangle((0, 0, size, size), radius=int(size * 0.22), fill=None)

    for radius, color in [
        (410, (10, 226, 246, 42)),
        (285, (60, 98, 255, 54)),
        (170, (255, 54, 158, 48)),
    ]:
        layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer, "RGBA")
        cx, cy = size * 0.52, size * 0.5
        ld.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=color, width=max(8, size // 55))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(size // 140)))

    # Tone ring
    cx, cy = size // 2, size // 2
    draw.ellipse((160, 160, size - 160, size - 160), outline=(223, 236, 246, 235), width=28)
    draw.ellipse((234, 234, size - 234, size - 234), outline=(12, 226, 246, 220), width=20)

    # Waveform
    bars = 19
    start_x = int(size * 0.24)
    end_x = int(size * 0.76)
    base_y = int(size * 0.53)
    for i in range(bars):
        x = start_x + (end_x - start_x) * i / (bars - 1)
        amp = (math.sin(i * 0.82) * 0.5 + 0.5) * 185 + 48
        color = (14, 232, 246, 255) if i % 3 else (255, 78, 168, 245)
        draw.rounded_rectangle((x - 9, base_y - amp / 2, x + 9, base_y + amp / 2), radius=9, fill=color)

    # Crown/pro mark
    draw.rounded_rectangle((358, 722, 666, 796), radius=36, fill=(232, 236, 244, 236))
    draw.text((392, 730), "PRO", font=font(54, True), fill=(8, 14, 24, 255))
    return img


def write_icons() -> None:
    base = create_icon_base()
    specs = [
        ("Icon-20@2x.png", 40, "iphone", "20x20", "2x"),
        ("Icon-20@3x.png", 60, "iphone", "20x20", "3x"),
        ("Icon-29@2x.png", 58, "iphone", "29x29", "2x"),
        ("Icon-29@3x.png", 87, "iphone", "29x29", "3x"),
        ("Icon-40@2x.png", 80, "iphone", "40x40", "2x"),
        ("Icon-40@3x.png", 120, "iphone", "40x40", "3x"),
        ("Icon-60@2x.png", 120, "iphone", "60x60", "2x"),
        ("Icon-60@3x.png", 180, "iphone", "60x60", "3x"),
        ("Icon-1024.png", 1024, "ios-marketing", "1024x1024", "1x"),
    ]
    images = []
    for filename, px, idiom, size, scale in specs:
        base.resize((px, px), Image.Resampling.LANCZOS).save(APPICON / filename)
        images.append({"filename": filename, "idiom": idiom, "scale": scale, "size": size})
    (APPICON / "Contents.json").write_text(json.dumps({"images": images, "info": {"author": "xcode", "version": 1}}, indent=2) + "\n")
    base.save(RELEASE / "app-icon-1024.png")


def write_colors() -> None:
    colors = {
        "AccentColor.colorset": {"color-space": "srgb", "components": {"red": "0.047", "green": "0.886", "blue": "0.965", "alpha": "1.000"}},
        "LaunchBackground.colorset": {"color-space": "srgb", "components": {"red": "0.035", "green": "0.039", "blue": "0.055", "alpha": "1.000"}},
    }
    for name, color in colors.items():
        payload = {"colors": [{"idiom": "universal", "color": color}], "info": {"author": "xcode", "version": 1}}
        (ASSETS / name / "Contents.json").write_text(json.dumps(payload, indent=2) + "\n")
    (ASSETS / "Contents.json").write_text(json.dumps({"info": {"author": "xcode", "version": 1}}, indent=2) + "\n")


def write_tone(name: str, freqs: list[float], duration: float) -> None:
    path = STARTERS / f"{name}.wav"
    rate = 44100
    frames = int(rate * duration)
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        for i in range(frames):
            t = i / rate
            env = min(1.0, t / 0.05) * min(1.0, (duration - t) / 0.18)
            sample = sum(math.sin(2 * math.pi * f * t) for f in freqs) / len(freqs)
            sample += 0.25 * math.sin(2 * math.pi * freqs[0] * 2 * t)
            value = int(max(-1, min(1, sample * env * 0.62)) * 32767)
            wav.writeframesraw(value.to_bytes(2, byteorder="little", signed=True))


def write_starter_tones() -> None:
    tones = {
        "neon-pulse": ([440, 660, 880], 7.2),
        "platinum-chime": ([523.25, 783.99, 1046.5], 5.8),
        "velvet-alert": ([329.63, 493.88, 659.25], 6.4),
        "orbit-tone": ([392, 587.33, 987.77], 7.6),
        "focus-tap": ([880, 1174.66], 2.8),
        "golden-rise": ([261.63, 392, 523.25], 8.0),
    }
    for name, (freqs, duration) in tones.items():
        write_tone(name, freqs, duration)


def screenshot(size: tuple[int, int], title: str, subtitle: str, panels: list[str], filename: str, target: Path) -> None:
    w, h = size
    img = gradient(size, [(6, 8, 15), (14, 23, 42), (7, 8, 14)]).convert("RGBA")
    draw = ImageDraw.Draw(img, "RGBA")
    draw.ellipse((w - 560, -180, w + 220, 590), fill=(10, 226, 246, 42))
    draw.ellipse((-240, h - 710, 540, h + 120), fill=(255, 58, 154, 36))

    margin = int(w * 0.075)
    y = int(h * 0.08)
    draw.text((margin, y), "RING TONE CREATOR PRO", font=font(34, True), fill=(17, 226, 246, 255))
    y += 72
    draw.multiline_text((margin, y), title, font=font(76, True), fill=(246, 249, 253, 255), spacing=8)
    y += 210
    draw.multiline_text((margin, y), subtitle, font=font(34), fill=(165, 176, 196, 255), spacing=8)

    phone_w = int(w * 0.78)
    phone_h = int(h * 0.52)
    phone_x = (w - phone_w) // 2
    phone_y = int(h * 0.38)
    draw.rounded_rectangle((phone_x, phone_y, phone_x + phone_w, phone_y + phone_h), radius=68, fill=(12, 15, 23, 245), outline=(230, 238, 246, 60), width=3)
    draw.rounded_rectangle((phone_x + 28, phone_y + 42, phone_x + phone_w - 28, phone_y + phone_h - 28), radius=46, fill=(22, 27, 39, 255))

    inner_x = phone_x + 64
    inner_y = phone_y + 90
    draw.text((inner_x, inner_y), panels[0], font=font(43, True), fill=(255, 255, 255, 255))
    inner_y += 72
    for i in range(46):
        x = inner_x + i * ((phone_w - 150) / 45)
        amp = 18 + 90 * abs(math.sin(i * 0.58))
        color = (12, 226, 246, 255) if i % 4 else (255, 70, 160, 245)
        draw.rounded_rectangle((x, inner_y + 120 - amp / 2, x + 7, inner_y + 120 + amp / 2), radius=4, fill=color)
    inner_y += 285

    for i, panel in enumerate(panels[1:]):
        top = inner_y + i * 126
        draw.rounded_rectangle((inner_x, top, phone_x + phone_w - 64, top + 92), radius=26, fill=(35, 42, 58, 255), outline=(255, 255, 255, 26))
        draw.text((inner_x + 28, top + 26), panel, font=font(28, True), fill=(226, 235, 246, 255))

    draw.rounded_rectangle((margin, h - 184, w - margin, h - 98), radius=43, fill=(11, 226, 246, 255))
    draw_centered(draw, (margin, h - 184, w - margin, h - 98), "Three free exports. Unlimited for $0.99/mo.", (6, 13, 24, 255), 30, True)
    img.convert("RGB").save(target / filename, quality=96)


def write_screenshots() -> None:
    shots = [
        ("01-create.png", "Make ringtones from any sound.", "Import audio, video, music, voice recordings, or starter tones.", ["Premium Studio", "Files / Video / Music", "Voice Recorder", "Starter Tone Library"]),
        ("02-editor.png", "A modern waveform editor.", "Trim the hook, set fades, preview instantly, and export cleanly.", ["Waveform Editor", "Trim handles", "Fade controls", "M4R export"]),
        ("03-library.png", "Save every tone project.", "Search, favorite, duplicate, and re-edit your ringtone library.", ["Tone Library", "Favorites", "Recent exports", "Re-edit drafts"]),
        ("04-signup.png", "Email signup with cloud credits.", "Three free exports are tracked remotely with Firebase.", ["Secure Account", "3 free exports", "Cloud credit ledger", "Delete account"]),
        ("05-pro.png", "Unlimited exports. No ads.", "$0.99/month unlocks unlimited ringtone creation.", ["Creator Pro", "Unlimited exports", "Ad-free app", "Restore purchases"]),
        ("06-install.png", "Guided GarageBand install.", "Export ringtone-ready files and follow simple iPhone install steps.", ["Install Guide", "Share to GarageBand", "Export as ringtone", "Assign to contact"]),
    ]
    for filename, title, subtitle, panels in shots:
        screenshot((1290, 2796), title, subtitle, panels, filename, IPHONE_69)
        screenshot((1284, 2778), title, subtitle, panels, filename, IPHONE_65)
        screenshot((1290, 2796), title, subtitle, panels, filename, RAW)


def main() -> None:
    ensure_dirs()
    write_icons()
    write_colors()
    write_starter_tones()
    write_screenshots()
    print("Generated Ring Tone Creator Pro icons, colors, starter tones, and screenshots.")


if __name__ == "__main__":
    main()
