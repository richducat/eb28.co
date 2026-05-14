#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "ios" / "CadetCatch" / "CadetCatch" / "Assets.xcassets"
ICONSET = ASSET_ROOT / "AppIcon.appiconset"
SCREENSHOT_ROOT = ROOT / "app-store" / "releases" / "cadetcatch" / "screenshots"
RAW_SCREENSHOTS = SCREENSHOT_ROOT / "raw"
IPHONE_69 = SCREENSHOT_ROOT / "iphone-6-9"

AMBER = (245, 160, 18)
GREEN = (54, 199, 107)
CYAN = (55, 209, 230)
INK = (13, 13, 11)
SURFACE = (32, 29, 24)
MUTED = (156, 150, 137)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Avenir Next.ttc",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        t = y / max(height - 1, 1)
        row = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(width):
            pixels[x, y] = row
    return image


def add_noise(image: Image.Image, opacity: int = 18) -> Image.Image:
    random.seed(28)
    noise = Image.new("L", image.size)
    noise.putdata([random.randrange(0, 255) for _ in range(image.size[0] * image.size[1])])
    tint = Image.new("RGB", image.size, (255, 255, 255))
    image = Image.blend(image, Image.composite(tint, image, noise), opacity / 255)
    return image


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def draw_text_center(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], text: str, fill, image_font) -> None:
    bbox = draw.textbbox((0, 0), text, font=image_font)
    x = box[0] + (box[2] - box[0] - (bbox[2] - bbox[0])) / 2
    y = box[1] + (box[3] - box[1] - (bbox[3] - bbox[1])) / 2
    draw.text((x, y), text, fill=fill, font=image_font)


def generate_icon() -> Image.Image:
    scale = 2
    size = 1024 * scale
    image = gradient((size, size), (8, 13, 13), (39, 32, 17))
    image = add_noise(image, 12)
    draw = ImageDraw.Draw(image)

    for step in range(0, size, 128):
        alpha = 34 if step % 256 == 0 else 20
        draw.line((step, 0, step, size), fill=(23, 55, 56), width=2)
        draw.line((0, step, size, step), fill=(23, 55, 56), width=2)

    center = (size // 2, size // 2 + 60)
    for radius, color, width in [
        (760, (25, 128, 135), 10),
        (604, (35, 210, 228), 8),
        (450, (245, 160, 18), 7),
    ]:
        bbox = (center[0] - radius // 2, center[1] - radius // 2, center[0] + radius // 2, center[1] + radius // 2)
        draw.arc(bbox, start=205, end=340, fill=color, width=width)

    sweep_end = (
        center[0] + int(math.cos(math.radians(-38)) * 450),
        center[1] + int(math.sin(math.radians(-38)) * 450),
    )
    draw.line((center[0], center[1], sweep_end[0], sweep_end[1]), fill=(57, 221, 226), width=10)

    shield = [
        (center[0], center[1] - 610),
        (center[0] + 430, center[1] - 430),
        (center[0] + 386, center[1] + 130),
        (center[0] + 238, center[1] + 466),
        (center[0], center[1] + 630),
        (center[0] - 238, center[1] + 466),
        (center[0] - 386, center[1] + 130),
        (center[0] - 430, center[1] - 430),
    ]
    draw.polygon(shield, fill=(62, 42, 13))
    draw.line(shield + [shield[0]], fill=AMBER, width=52, joint="curve")

    lens_box = (center[0] - 250, center[1] - 244, center[0] + 250, center[1] + 256)
    draw.ellipse(lens_box, fill=(11, 14, 14), outline=(255, 255, 245), width=20)
    for angle in range(0, 360, 60):
        x = center[0] + math.cos(math.radians(angle)) * 185
        y = center[1] + math.sin(math.radians(angle)) * 185
        draw.line((center[0], center[1], x, y), fill=(255, 255, 245), width=8)
    draw.ellipse((center[0] - 82, center[1] - 82, center[0] + 82, center[1] + 82), fill=(26, 210, 229))
    draw.ellipse((center[0] - 38, center[1] - 38, center[0] + 38, center[1] + 38), fill=(245, 160, 18))

    word_font = font(116, bold=True)
    draw_text_center(draw, (center[0] - 240, center[1] + 330, center[0] + 240, center[1] + 470), "CC", (255, 251, 238), word_font)

    image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=130, threshold=2))
    return image.resize((1024, 1024), Image.Resampling.LANCZOS).convert("RGB")


def write_icon_set(icon: Image.Image) -> None:
    with (ICONSET / "Contents.json").open() as handle:
        contents = json.load(handle)

    for item in contents["images"]:
        filename = item.get("filename")
        if not filename:
            continue
        point_size = float(item["size"].split("x")[0])
        scale = int(item["scale"].replace("x", ""))
        pixels = int(point_size * scale)
        icon.resize((pixels, pixels), Image.Resampling.LANCZOS).save(ICONSET / filename)

    (ROOT / "app-store" / "releases" / "cadetcatch").mkdir(parents=True, exist_ok=True)
    icon.save(ROOT / "app-store" / "releases" / "cadetcatch" / "app-icon-1024.png")


def make_training_image(kind: str, title: str, colors: tuple[tuple[int, int, int], tuple[int, int, int]], accent) -> Image.Image:
    width, height = 1200, 900
    image = gradient((width, height), colors[0], colors[1])
    image = add_noise(image, 16)
    draw = ImageDraw.Draw(image)

    horizon = 560
    draw.rectangle((0, horizon, width, height), fill=(20, 24, 20))
    for y in range(horizon, height, 32):
        draw.line((0, y, width, y + 44), fill=(45, 55, 42), width=3)

    if kind == "water":
        draw.rectangle((0, 500, width, height), fill=(12, 58, 72))
        for y in range(530, height, 34):
            draw.arc((-120, y - 26, width + 120, y + 42), 0, 180, fill=(65, 150, 158), width=3)
        draw.polygon([(240, 590), (620, 590), (545, 630), (300, 630)], fill=(18, 22, 20))
        draw.rectangle((380, 510, 405, 590), fill=(15, 18, 17))
        draw.polygon([(405, 512), (540, 582), (405, 582)], fill=(232, 235, 220))
    elif kind == "track":
        for lane in range(6):
            y = 520 + lane * 56
            draw.arc((-120, y - 150, width + 260, y + 270), 188, 352, fill=(151, 79, 47), width=22)
            draw.arc((-120, y - 150, width + 260, y + 270), 188, 352, fill=(230, 208, 172), width=2)
    elif kind == "field":
        for x in range(100, width, 160):
            draw.line((x, 520, x - 220, height), fill=(65, 92, 54), width=4)
        draw.rectangle((0, 665, width, 675), fill=(235, 235, 210))
    else:
        for x in range(120, width, 120):
            draw.line((x, 520, x - 220, height), fill=(70, 84, 62), width=3)

    for i, x in enumerate(range(210, 1010, 115)):
        body_top = 580 + (i % 2) * 18
        draw.ellipse((x - 20, body_top - 54, x + 20, body_top - 14), fill=(18, 20, 18))
        draw.rounded_rectangle((x - 18, body_top - 15, x + 18, body_top + 90), radius=14, fill=(18, 20, 18))
        draw.line((x - 18, body_top + 16, x - 54, body_top + 62), fill=(18, 20, 18), width=12)
        draw.line((x + 18, body_top + 16, x + 54, body_top + 62), fill=(18, 20, 18), width=12)

    draw.rounded_rectangle((54, 54, 478, 164), radius=24, fill=(0, 0, 0), outline=accent, width=4)
    draw.text((86, 82), title.upper(), fill=(255, 252, 238), font=font(34, bold=True))
    draw.text((86, 124), "CADETCATCH SAMPLE SOURCE", fill=accent, font=font(20, bold=True))

    return image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=110, threshold=2)).convert("RGB")


def write_sample_images() -> None:
    specs = [
        ("SampleFormation", "formation", "Field Training", ((36, 44, 41), (128, 96, 44)), AMBER),
        ("SampleWaterfront", "water", "Waterfront Block", ((20, 62, 74), (11, 18, 23)), CYAN),
        ("SamplePT", "track", "PT Conditioning", ((62, 37, 30), (18, 24, 25)), GREEN),
        ("SampleAthletics", "field", "Team Practice", ((26, 58, 46), (14, 18, 16)), AMBER),
    ]
    for asset_name, kind, title, colors, accent in specs:
        folder = ASSET_ROOT / f"{asset_name}.imageset"
        folder.mkdir(parents=True, exist_ok=True)
        make_training_image(kind, title, colors, accent).save(folder / f"{asset_name}.png")
        with (folder / "Contents.json").open("w") as handle:
            json.dump(
                {
                    "images": [{"filename": f"{asset_name}.png", "idiom": "universal", "scale": "1x"}],
                    "info": {"author": "xcode", "version": 1},
                },
                handle,
                indent=2,
            )
            handle.write("\n")


def draw_multiline(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, image_font, fill, spacing: int = 8) -> int:
    x, y = xy
    for line in text.split("\n"):
        draw.text((x, y), line, font=image_font, fill=fill)
        bbox = draw.textbbox((x, y), line, font=image_font)
        y = bbox[3] + spacing
    return y


def marketing_canvas(raw_path: Path, title: str, subtitle: str, output_path: Path, accent) -> None:
    canvas_size = (1320, 2868)
    canvas = gradient(canvas_size, (10, 12, 12), (55, 38, 16))
    canvas = add_noise(canvas, 10)
    draw = ImageDraw.Draw(canvas)

    for y in range(0, canvas_size[1], 116):
        draw.line((0, y, canvas_size[0], y - 380), fill=(28, 61, 61), width=2)
    draw.ellipse((-380, -260, 780, 900), outline=(33, 201, 214), width=4)
    draw.ellipse((780, 420, 1640, 1280), outline=(245, 160, 18), width=4)

    draw.text((92, 92), "CADETCATCH", fill=accent, font=font(34, bold=True))
    title_end = draw_multiline(draw, (92, 164), title, font(76, bold=True), (255, 252, 238), spacing=12)
    draw_multiline(draw, (94, title_end + 18), subtitle, font(34), (214, 207, 190), spacing=6)

    raw = Image.open(raw_path).convert("RGB")
    phone_w = 930
    phone_h = int(phone_w * raw.height / raw.width)
    phone_x = (canvas_size[0] - phone_w) // 2
    phone_y = 655
    frame_pad = 28

    shadow = Image.new("RGBA", (phone_w + 150, phone_h + 150), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((75, 75, 75 + phone_w, 75 + phone_h), radius=96, fill=(0, 0, 0, 210))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    canvas.paste(shadow, (phone_x - 75, phone_y - 45), shadow)

    frame = Image.new("RGBA", (phone_w + frame_pad * 2, phone_h + frame_pad * 2), (0, 0, 0, 0))
    frame_draw = ImageDraw.Draw(frame)
    frame_draw.rounded_rectangle((0, 0, frame.width - 1, frame.height - 1), radius=112, fill=(5, 6, 6), outline=accent + (255,), width=4)
    screen = raw.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
    mask = rounded_mask((phone_w, phone_h), 84)
    frame.paste(screen, (frame_pad, frame_pad), mask)
    frame_draw.rounded_rectangle((frame_pad, frame_pad, frame_pad + phone_w, frame_pad + phone_h), radius=84, outline=(255, 255, 255, 36), width=2)
    canvas.paste(frame, (phone_x - frame_pad, phone_y - frame_pad), frame)

    canvas.save(output_path)


def write_marketing_screenshots() -> None:
    raw_specs = [
        ("01-scanner.png", "Find academy\nphotos faster", "Private watchlists, Pro scan modes, and priority sweeps.", "01-find-photos-faster-6-9.png", CYAN),
        ("02-intel.png", "Know what\nmatters instantly", "Confidence scores, source details, and saved dossiers.", "02-match-confidence-6-9.png", GREEN),
        ("03-roster.png", "Track every\ncadet in one place", "Family-ready rosters with fast target switching.", "03-private-roster-6-9.png", AMBER),
        ("04-decoder.png", "Decode academy\nlife", "Plain-English military terms built for parents.", "04-decoder-6-9.png", CYAN),
        ("05-paywall.png", "CadetCatch Pro", "Premium photo recovery tools for military families.", "05-pro-clearance-6-9.png", AMBER),
    ]

    if not RAW_SCREENSHOTS.exists():
        return

    IPHONE_69.mkdir(parents=True, exist_ok=True)
    for raw_name, title, subtitle, output_name, accent in raw_specs:
        raw_path = RAW_SCREENSHOTS / raw_name
        if raw_path.exists():
            marketing_canvas(raw_path, title, subtitle, IPHONE_69 / output_name, accent)


def main() -> None:
    write_icon_set(generate_icon())
    write_sample_images()
    write_marketing_screenshots()


if __name__ == "__main__":
    main()
