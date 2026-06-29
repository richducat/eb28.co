#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SHOT_DIR = ROOT / "app-store/releases/cadetcatch/screenshots/iphone-6-9"
SOURCE_DIR = Path("/Users/richardducat/Documents/Codex/Release-Artifacts/CadetCatch/build-95-20260628/receipts/live-simulator-screenshots-20260629")
ICON_PATH = ROOT / "ios/CadetCatch/CadetCatch/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png"

WIDTH = 1320
HEIGHT = 2868

NAVY = (2, 18, 39)
MUTED = (91, 111, 136)
ORANGE = (255, 76, 22)
BLUE = (35, 70, 126)
PALE = (238, 246, 253)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSRounded.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT_BRAND = font(34, True)
FONT_HEAD = font(92, True)
FONT_SUB = font(39)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def gradient_background() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), PALE)
    pixels = image.load()
    top = (236, 245, 253)
    bottom = (250, 252, 255)
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(WIDTH):
            pixels[x, y] = color

    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((-120, 470, WIDTH + 160, 860), radius=170, fill=(255, 255, 255, 128))
    draw.rounded_rectangle((740, -80, WIDTH + 120, 360), radius=120, fill=(35, 70, 126, 24))
    draw.rounded_rectangle((-160, HEIGHT - 470, 520, HEIGHT + 100), radius=180, fill=(255, 76, 22, 18))
    return image


def text_size(draw: ImageDraw.ImageDraw, text: str, typeface: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=typeface)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, typeface: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        attempt = " ".join([*current, word])
        if text_size(draw, attempt, typeface)[0] <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_text_block(draw: ImageDraw.ImageDraw, headline: str, subhead: str) -> None:
    max_width = WIDTH - 180
    y = 205
    for line in wrap_text(draw, headline, FONT_HEAD, max_width):
        draw.text((90, y), line, font=FONT_HEAD, fill=NAVY)
        y += 105
    y += 22
    for line in wrap_text(draw, subhead, FONT_SUB, max_width):
        draw.text((94, y), line, font=FONT_SUB, fill=MUTED)
        y += 52


def draw_brand(draw: ImageDraw.ImageDraw, canvas: Image.Image) -> None:
    icon_size = 74
    icon = Image.open(ICON_PATH).convert("RGBA").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, (90, 78))
    draw.text((184, 92), "CadetCatch", font=FONT_BRAND, fill=NAVY)
    draw.rounded_rectangle((1036, 90, 1230, 144), radius=27, fill=ORANGE)
    draw.text((1075, 100), "iPhone", font=font(26, True), fill=(255, 255, 255))


def draw_device(canvas: Image.Image, source_path: Path, y: int = 635) -> None:
    screen = Image.open(source_path).convert("RGB")
    phone_w = 1010
    phone_h = round(phone_w * HEIGHT / WIDTH)
    x = (WIDTH - phone_w) // 2

    shadow = Image.new("RGBA", (phone_w + 110, phone_h + 120), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((55, 48, 55 + phone_w, 48 + phone_h), radius=120, fill=(0, 25, 60, 65))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas.alpha_composite(shadow, (x - 55, y - 48))

    frame = Image.new("RGBA", (phone_w + 32, phone_h + 32), (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.rounded_rectangle((0, 0, phone_w + 31, phone_h + 31), radius=135, fill=NAVY)
    frame_draw.rounded_rectangle((12, 12, phone_w + 19, phone_h + 19), radius=124, fill=(255, 255, 255))
    canvas.alpha_composite(frame, (x - 16, y - 16))

    screen = screen.resize((phone_w, phone_h), Image.Resampling.LANCZOS).convert("RGBA")
    mask = rounded_mask((phone_w, phone_h), 112)
    canvas.paste(screen, (x, y), mask)


def render_one(output_name: str, source_name: str, headline: str, subhead: str, y: int = 635) -> None:
    canvas = gradient_background().convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    draw_brand(draw, canvas)
    draw_text_block(draw, headline, subhead)
    draw_device(canvas, SOURCE_DIR / source_name, y=y)
    canvas.convert("RGB").save(SHOT_DIR / output_name, "PNG", optimize=True)


def unlink_existing(names: Iterable[str]) -> None:
    for name in names:
        path = SHOT_DIR / name
        if path.exists():
            path.unlink()


def main() -> None:
    raw_files = [
        "01-welcome-live-6-9.png",
        "02-home-live-6-9.png",
        "03-photos-live-6-9.png",
        "04-roster-live-6-9.png",
        "05-info-live-6-9.png",
        "06-add-cadet-live-6-9.png",
    ]
    preview_files = [
        "01-find-cadet-photos-preview-6-9.png",
        "02-start-with-one-photo-preview-6-9.png",
        "03-review-photo-finds-preview-6-9.png",
        "04-private-cadet-roster-preview-6-9.png",
        "05-match-guidance-preview-6-9.png",
    ]
    unlink_existing(preview_files)

    render_one(
        "01-find-cadet-photos-preview-6-9.png",
        "02-home-live-6-9.png",
        "Find cadet photos faster",
        "Set up a cadet profile and start searches from Home.",
    )
    render_one(
        "02-start-with-one-photo-preview-6-9.png",
        "06-add-cadet-live-6-9.png",
        "Start with one clear photo",
        "One clear face helps return better possible matches.",
    )
    render_one(
        "03-review-photo-finds-preview-6-9.png",
        "03-photos-live-6-9.png",
        "Review new and saved photos",
        "Keep possible finds organized as event photos are added.",
    )
    render_one(
        "04-private-cadet-roster-preview-6-9.png",
        "04-roster-live-6-9.png",
        "Keep a private roster",
        "Manage cadet profiles before running a photo search.",
    )
    render_one(
        "05-match-guidance-preview-6-9.png",
        "05-info-live-6-9.png",
        "Review matches with confidence",
        "Plain-English guidance helps families check each result.",
    )

    # The upload manifest points at preview files only. Raw captures are stored
    # in the release-artifact receipt folder, not uploaded as product media.
    unlink_existing(raw_files)


if __name__ == "__main__":
    main()
