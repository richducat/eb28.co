#!/usr/bin/env python3
from __future__ import annotations

import html
import math
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path("/Users/richardducat/GITHUB/eb28.co")
SOURCE_ASSETS = Path("/Users/richardducat/Desktop/el-world-protein-bars/src/assets")
PUBLIC_DIR = ROOT / "public" / "ELWSOCIAL2"
DOCS_DIR = ROOT / "docs" / "ELWSOCIAL2"
DESKTOP_MD = Path("/Users/richardducat/Desktop/EL World 14-Day Social Copy - Batch 2 Email Ready.md")
DESKTOP_PRESENTATION_DIR = Path("/Users/richardducat/Desktop/EL World Social Presentation Batch 2")
DESKTOP_PRESENTATION_HTML = DESKTOP_PRESENTATION_DIR / "EL World 14-Day Social Copy - Batch 2 Presentation.html"

NAVY = "#34477a"
NAVY_DARK = "#172646"
NAVY_DEEP = "#071431"
CREAM = "#f5efe5"
WHITE = "#fffaf1"
GOLD = "#d6a241"
GOLD_LIGHT = "#ffe9a6"
INK = "#263446"
MUTED = "#6f7786"


POSTS = [
    {
        "day": 15,
        "date": "May 14, 2026",
        "title": "The Bag Check",
        "pillar": "Routine",
        "visual": "BAG CHECK",
        "overlay": "Pack the snack before the day gets loud.",
        "subhead": "Blueberry Almond Butter | 13g protein",
        "ig": [
            "Do the bag check before the day starts.",
            "Keys. Water. Headphones. EL World Blueberry Almond Butter protein bar.",
            "The routine works better when the better option is already with you. Each bar brings 13g of protein, clean ingredients, and a flavor that fits the busy middle of the day without turning snack time into another decision.",
            "Put one in the bag before you leave and make the busy snack moment easier to handle.",
            "What is the one place you always wish you had a better snack?",
            "#ELWorld #ProteinBars #BlueberryAlmondButter #BusyRoutine #SnackSmart",
        ],
        "x": "Bag check: keys, water, headphones, EL World bar. The better snack works best when it is already with you. 13g protein, Blueberry Almond Butter flavor, grab-and-go routine support. https://eb28.co/ELW/",
        "reel_hook": "Before you leave, do this 10-second bag check.",
        "reel_caption": "Pack the snack before the day gets loud. #ELWorld #ProteinBar #HealthyRoutine",
        "reel_direction": "0-3 sec: fast bag-check hook. 3-12 sec: keys, water, headphones, EL World bar. 12-25 sec: product close-up and bag placement. 25-35 sec: on-screen text says \"Prepared beats improvised.\" End with URL.",
    },
    {
        "day": 16,
        "date": "May 15, 2026",
        "title": "Flavor Worth Repeating",
        "pillar": "Flavor",
        "visual": "FLAVOR REPEAT",
        "overlay": "Taste is what makes consistency possible.",
        "subhead": "Blueberry + Almond Butter",
        "ig": [
            "A protein bar only becomes part of the routine if you actually want to eat it again.",
            "That is why flavor matters.",
            "EL World leans into Blueberry Almond Butter - bright, smooth, and satisfying without the chalky compromise people expect from protein snacks.",
            "Add 13g of protein and bovine collagen support, and the bar becomes a simple daily tool instead of a snack you have to force.",
            "Try it once. Then decide where it belongs in your week.",
            "#BlueberryAlmondButter #ProteinSnack #ELWorld #CleanEnergy #SnackRoutine",
        ],
        "x": "Taste is what makes consistency possible. Blueberry Almond Butter flavor, 13g protein, and a bar built to stay in the weekly rotation.",
        "reel_hook": "The flavor test: would you eat it again tomorrow?",
        "reel_caption": "Taste has to earn the repeat. #TasteTest #ProteinSnack #ELWorld",
        "reel_direction": "Show wrapper, break bar, texture close-up, first bite, quick reaction. Overlay: \"Blueberry. Almond butter. No chalky compromise.\" End with product stack.",
    },
    {
        "day": 17,
        "date": "May 16, 2026",
        "title": "The 3 PM Plan",
        "pillar": "Healthy Habits",
        "visual": "3 PM PLAN",
        "overlay": "Plan for the moment your energy dips.",
        "subhead": "Simple snack reset",
        "ig": [
            "The 3 p.m. dip needs a plan.",
            "Not a complicated one. Just something better than reaching for whatever is closest.",
            "Keep an EL World bar where the dip usually happens - desk drawer, work bag, car, or pantry. Blueberry Almond Butter flavor, 13g protein, and clean ingredients make the choice easier when the day is already full.",
            "The goal is not perfection. The goal is a better default.",
            "Save this as your reminder to stock the drawer before Monday.",
            "#HealthyHabits #ELWorld #ProteinBar #SnackReset #CleanIngredients",
        ],
        "x": "The 3 p.m. dip needs a plan. Keep the better option where the dip happens: desk, bag, car, pantry. One smarter default changes the whole afternoon.",
        "reel_hook": "If 3 p.m. keeps winning, change the setup.",
        "reel_caption": "Your snack routine needs a location. #SnackReset #ELWorld #HealthyHabits",
        "reel_direction": "Clock hits 3:00. Show usual snack temptation, then open drawer with EL World bar. Voiceover: \"Do not wait for willpower. Set up the better option first.\"",
    },
    {
        "day": 18,
        "date": "May 17, 2026",
        "title": "Collagen Support, Simply",
        "pillar": "Ingredients",
        "visual": "COLLAGEN SUPPORT",
        "overlay": "Bovine collagen for whole-body support.",
        "subhead": "Clean ingredients, practical routine fuel",
        "ig": [
            "What matters inside should be easy to understand.",
            "EL World includes bovine collagen as part of a protein-forward snack made for real routines.",
            "That means you get a Blueberry Almond Butter bar with 13g of protein, clean ingredients, and whole-body support without needing to add one more supplement step to the day.",
            "Simple ingredients. Simple format. Easy to keep nearby.",
            "That is the point.",
            "#BovineCollagen #ELWorld #ProteinSnack #CleanIngredients #WellnessRoutine",
        ],
        "x": "Bovine collagen support, 13g protein, clean ingredients, Blueberry Almond Butter flavor. EL World is built to keep the routine simple.",
        "reel_hook": "Ingredient spotlight: bovine collagen.",
        "reel_caption": "Simple support in a bar you can keep close. #BovineCollagen #ELWorld #ProteinSnack",
        "reel_direction": "Start with ingredient callout text. Show wrapper, product close-up, and daily use moments. Keep the language conservative: support, routine, clean ingredients.",
    },
    {
        "day": 19,
        "date": "May 18, 2026",
        "title": "Desk Drawer Reset",
        "pillar": "Routine",
        "visual": "DESK DRAWER",
        "overlay": "Stock the drawer before the craving shows up.",
        "subhead": "Better defaults for busy workdays",
        "ig": [
            "A desk drawer can either help the routine or break it.",
            "Set it up before the week gets crowded.",
            "Add water, a few EL World Blueberry Almond Butter bars, and whatever simple tools help you stay steady through the day. No fridge. No blender. No extra stop when your calendar is already full.",
            "Small setup. Fewer snack decisions. Better workday rhythm.",
            "Stock the drawer, then let the routine do its job.",
            "#DeskSnack #ELWorld #ProteinBars #WorkdayRoutine #SnackSmart",
        ],
        "x": "Desk drawer reset: water, better snacks, fewer emergency decisions. Stock the drawer before the craving shows up.",
        "reel_hook": "Reset your desk drawer with me.",
        "reel_caption": "A better workday snack setup. #DeskSnack #Restock #ELWorld",
        "reel_direction": "Before/after drawer shot. Add bars, water, napkins, small organizer. Overlay: \"No fridge. No blender. No extra stop.\" End with close-up of stocked drawer.",
    },
    {
        "day": 20,
        "date": "May 19, 2026",
        "title": "Walk, Water, Better Snack",
        "pillar": "Wellness",
        "visual": "WALK RESET",
        "overlay": "Not every routine has to be intense.",
        "subhead": "Movement + water + clean snack",
        "ig": [
            "Not every healthy routine has to be intense.",
            "Some days the win is a walk, water, and a snack that keeps you moving in the direction you meant to go.",
            "EL World fits those lighter routine days too. Blueberry Almond Butter flavor, 13g protein, clean ingredients, and a format you can take with you on a walk, errand run, or reset break.",
            "Simple counts when you repeat it.",
            "What is your low-pressure wellness reset?",
            "#WellnessRoutine #WalkingRoutine #ELWorld #ProteinSnack #HealthyHabits",
        ],
        "x": "Some days the routine is simple: walk, water, better snack. That still counts.",
        "reel_hook": "Your low-pressure wellness reset starts here.",
        "reel_caption": "Walk. Water. Better snack. #WellnessRoutine #ELWorld #HealthyHabits",
        "reel_direction": "Show shoes, water bottle, walk outside, bar in hand after walk. Voiceover: \"Not every day needs intensity. Repeat the simple things.\"",
    },
    {
        "day": 21,
        "date": "May 20, 2026",
        "title": "Taste Review",
        "pillar": "Social Proof",
        "visual": "REAL REVIEW",
        "overlay": "No aftertaste. Delicious flavor.",
        "subhead": "Customer taste note",
        "ig": [
            "\"There was NO after taste. Flavor-Taste is DELICIOUS!\"",
            "That is the kind of feedback that matters because taste is what keeps a product in the routine.",
            "EL World was made to be practical, but it still had to taste great. Blueberry Almond Butter flavor, 13g protein, clean ingredients, and a texture people can actually come back to.",
            "Try the box and see where it fits in your week.",
            "#CustomerReview #ELWorld #ProteinBars #BlueberryAlmondButter #TasteTest",
        ],
        "x": "\"No after taste\" is the review every protein bar wants. Taste is what keeps the routine repeatable.",
        "reel_hook": "A real protein bar review that says what matters.",
        "reel_caption": "No aftertaste. Real flavor. #ProteinBarReview #ELWorld #TasteTest",
        "reel_direction": "Show review text on screen, wrapper close-up, bite, texture shot. Voiceover reads the review and ends with: \"Taste is the routine builder.\"",
    },
    {
        "day": 22,
        "date": "May 21, 2026",
        "title": "Restock Before Monday",
        "pillar": "Conversion",
        "visual": "RESTOCK",
        "overlay": "The easiest snack is the one already stocked.",
        "subhead": "Box or subscribe and save",
        "ig": [
            "Do not wait until the busy week starts to decide what you will reach for.",
            "Restock before Monday.",
            "A Clean Energy Box keeps EL World Blueberry Almond Butter protein bars ready for the bag, desk drawer, gym tote, car, or pantry. Each bar brings 13g protein and clean ingredients in a grab-and-go format built for consistency.",
            "Start with the box or subscribe and save so the routine is already waiting.",
            "Link in bio.",
            "#Restock #ELWorld #ProteinBars #SubscribeAndSave #CleanEnergy",
        ],
        "x": "Restock before Monday. Box or subscribe and save so the better snack is already waiting when the week gets busy. https://eb28.co/ELW/",
        "reel_hook": "Restock with me before Monday.",
        "reel_caption": "Make the better snack automatic. #Restock #ELWorld #ProteinBars",
        "reel_direction": "Empty pantry/drawer, unbox bars, place in multiple locations. Overlay: \"Bag. Desk. Gym tote. Car. Pantry.\" CTA: \"Stock the week.\"",
    },
    {
        "day": 23,
        "date": "May 22, 2026",
        "title": "Travel Day Snack",
        "pillar": "Lifestyle",
        "visual": "TRAVEL READY",
        "overlay": "Carry-on snack. Road-trip snack. Errand snack.",
        "subhead": "No fridge required",
        "ig": [
            "Travel days reward the prepared.",
            "The airport line, the long drive, the back-to-back errands, the appointment that runs late - those are the moments where the snack plan usually falls apart.",
            "Keep EL World close when the day takes you out of the routine. Blueberry Almond Butter flavor, 13g protein, clean ingredients, and no fridge required.",
            "Pack it before you need it.",
            "#TravelSnack #ELWorld #ProteinBar #GrabAndGo #HealthyRoutine",
        ],
        "x": "Travel day snack rule: pack it before you need it. EL World bars are built for the carry-on, car, work bag, and errand run.",
        "reel_hook": "Pack my carry-on snack with me.",
        "reel_caption": "Travel days need better defaults. #TravelSnack #ELWorld #GrabAndGo",
        "reel_direction": "Packing flat lay: bag, water, headphones, book, EL World bar. Cut to car/airport/errands. Overlay: \"No fridge required.\"",
    },
    {
        "day": 24,
        "date": "May 23, 2026",
        "title": "Consistency Beats Perfect",
        "pillar": "Mindset",
        "visual": "CONSISTENCY",
        "overlay": "The routine sticks when it is easy to repeat.",
        "subhead": "Convenience without compromise",
        "ig": [
            "The routine does not need to be perfect to work.",
            "It needs to be repeatable.",
            "That is the idea behind EL World: convenience without compromise. A Blueberry Almond Butter protein bar you can keep nearby, actually enjoy, and use as a better default when your schedule is not meal-prep perfect.",
            "Consistency is built by the choices you make easy.",
            "Make the better snack the easy one.",
            "#Consistency #ELWorld #HealthyHabits #ProteinSnack #RoutineFuel",
        ],
        "x": "The routine does not need to be perfect. It needs to be repeatable. Make the better snack the easy one.",
        "reel_hook": "Stop building routines that only work on perfect days.",
        "reel_caption": "Consistency needs repeatable defaults. #Consistency #HealthyHabits #ELWorld",
        "reel_direction": "Direct-to-camera hook, then show simple routine placements. Voiceover: \"The busy version of you needs options, not pressure.\"",
    },
    {
        "day": 25,
        "date": "May 24, 2026",
        "title": "What Powers Your Consistency?",
        "pillar": "Ingredients",
        "visual": "WHAT POWERS YOU?",
        "overlay": "Clean ingredients. 13g protein. Blueberry Almond Butter.",
        "subhead": "What matters inside matters",
        "ig": [
            "What powers your consistency?",
            "For EL World, the answer starts with ingredients that make sense in a routine: 13g protein, Blueberry Almond Butter flavor, bovine collagen support, and a clean grab-and-go format.",
            "No snack should make you feel like you compromised your goals just because the day got busy.",
            "Choose the option that is easy to keep close and easy to come back to.",
            "#CleanIngredients #ELWorld #ProteinBars #BlueberryAlmondButter #RoutineFuel",
        ],
        "x": "What powers your consistency? Clean ingredients, 13g protein, Blueberry Almond Butter flavor, and a bar that fits the day you actually live.",
        "reel_hook": "What powers your consistency?",
        "reel_caption": "Clean routine fuel, made simple. #CleanIngredients #ELWorld #ProteinBars",
        "reel_direction": "Ingredient-style close-ups: blueberries, almonds, wrapper, bite. Text overlays: \"13g protein\", \"bovine collagen support\", \"Blueberry Almond Butter\".",
    },
    {
        "day": 26,
        "date": "May 25, 2026",
        "title": "Post-Workout Backup",
        "pillar": "Fitness",
        "visual": "GYM BAG READY",
        "overlay": "Keep one in the gym bag.",
        "subhead": "Simple protein after movement",
        "ig": [
            "The best post-workout snack is the one you remembered to pack.",
            "Keep EL World in the gym bag so you are not improvising after the workout, walk, class, or practice.",
            "With 13g protein, Blueberry Almond Butter flavor, clean ingredients, and bovine collagen support, it is a practical way to bridge the gap until your next meal.",
            "Pack the bar before the excuse.",
            "#GymBagSnack #ELWorld #ProteinBar #FitnessRoutine #PostWorkoutSnack",
        ],
        "x": "Gym bag rule: pack the snack before the excuse. 13g protein, Blueberry Almond Butter flavor, no blender required.",
        "reel_hook": "What is in my gym bag, realistic version.",
        "reel_caption": "Pack the bar before the excuse. #GymBagSnack #ELWorld #FitnessRoutine",
        "reel_direction": "Gym bag flat lay: shoes, towel, water, headphones, EL World bar. End with product in hand after movement.",
    },
    {
        "day": 27,
        "date": "May 26, 2026",
        "title": "Listen To Your Body",
        "pillar": "Wellness",
        "visual": "LISTEN",
        "overlay": "Pause before you choose.",
        "subhead": "Water, breath, better snack",
        "ig": [
            "Before you snack on autopilot, pause.",
            "Take a few breaths. Drink water. Ask what would actually support the rest of your day.",
            "Sometimes the answer is simple: a better snack you already planned for. EL World gives you 13g protein, Blueberry Almond Butter flavor, and a clean bar you can keep nearby for those moments.",
            "Listening to your body starts with slowing down long enough to choose.",
            "#ListenToYourBody #WellnessRoutine #ELWorld #ProteinSnack #SnackReset",
        ],
        "x": "Before you snack on autopilot: pause, breathe, drink water, choose what actually supports the rest of your day.",
        "reel_hook": "Before you snack on autopilot, try this.",
        "reel_caption": "Pause before you choose. #SnackReset #WellnessRoutine #ELWorld",
        "reel_direction": "Show hand reaching for random snack, pause, breath, water, EL World bar. Keep pacing calm and clean.",
    },
    {
        "day": 28,
        "date": "May 27, 2026",
        "title": "Two-Week Routine Recap",
        "pillar": "Recap",
        "visual": "ROUTINE RECAP",
        "overlay": "One better snack default, repeated.",
        "subhead": "Stock the week with EL World",
        "ig": [
            "Two-week routine recap:",
            "Pack it before the day gets loud. Stock the drawer before the 3 p.m. dip. Keep one in the gym bag. Put one in the carry-on. Choose the snack that is easy to repeat.",
            "EL World Blueberry Almond Butter protein bars are built for that kind of consistency - 13g protein, clean ingredients, bovine collagen support, and grab-and-go convenience.",
            "Ready to make the snack routine easier?",
            "Stock the box at the link in bio.",
            "#ELWorld #ProteinBars #CleanEnergy #HealthyHabits #SnackRoutine",
        ],
        "x": "Two-week recap: one better snack default, repeated. Bag, desk, car, gym tote, carry-on. Stock the week with EL World. https://eb28.co/ELW/",
        "reel_hook": "Here is the whole routine in 20 seconds.",
        "reel_caption": "One better snack default, repeated. #ELWorld #SnackRoutine #ProteinBars",
        "reel_direction": "Fast recap montage: bag, desk drawer, walk, travel, gym bag, product bite. End screen: \"Stock the week. eb28.co/ELW\".",
    },
]


def ensure_dirs() -> None:
    for path in [
        PUBLIC_DIR / "assets" / "feed-png",
        PUBLIC_DIR / "assets" / "vertical-png",
        DOCS_DIR / "assets" / "feed-png",
        DOCS_DIR / "assets" / "vertical-png",
        DESKTOP_PRESENTATION_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/System/Library/Fonts/Supplemental/Avenir Next Condensed.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            continue
    return ImageFont.load_default(size=size)


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def gradient(size: tuple[int, int], left: str, right: str) -> Image.Image:
    width, height = size
    l = hex_to_rgb(left)
    r = hex_to_rgb(right)
    image = Image.new("RGB", size)
    pix = image.load()
    for y in range(height):
        for x in range(width):
            t = (x / max(width - 1, 1)) * 0.75 + (y / max(height - 1, 1)) * 0.25
            pix[x, y] = tuple(int(l[i] * (1 - t) + r[i] * t) for i in range(3))
    return image.convert("RGBA")


def cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    src_w, src_h = image.size
    dst_w, dst_h = size
    scale = max(dst_w / src_w, dst_h / src_h)
    new_size = (math.ceil(src_w * scale), math.ceil(src_h * scale))
    image = image.resize(new_size, Image.Resampling.LANCZOS)
    left = (new_size[0] - dst_w) // 2
    top = (new_size[1] - dst_h) // 2
    return image.crop((left, top, left + dst_w, top + dst_h)).convert("RGBA")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def paste_round(base: Image.Image, image: Image.Image, box: tuple[int, int], radius: int) -> None:
    mask = rounded_mask(image.size, radius)
    base.paste(image, box, mask)


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if draw.textbbox((0, 0), trial, font=text_font)[2] <= max_width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    text_font: ImageFont.ImageFont,
    fill: str,
    max_width: int,
    line_gap: int,
    max_lines: int | None = None,
) -> int:
    x, y = xy
    lines = wrapped_lines(draw, text, text_font, max_width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, font=text_font, fill=fill)
        bbox = draw.textbbox((x, y), line, font=text_font)
        y += (bbox[3] - bbox[1]) + line_gap
    return y


def letter_spaced(text: str) -> str:
    return " ".join(text.upper())


def add_logo(draw: ImageDraw.ImageDraw, canvas: Image.Image, x: int, y: int, scale: float = 0.34) -> None:
    logo = Image.open(SOURCE_ASSETS / "el-world-logo-gold.png").convert("RGBA")
    logo = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, (x, y))
    draw.text((x + logo.width + 20, y + 12), "PROTEIN BARS", font=font(29, True), fill=WHITE)
    draw.text((x + logo.width + 21, y + 50), "BLUEBERRY ALMOND BUTTER", font=font(17, True), fill=GOLD_LIGHT)


def card_shadow(size: tuple[int, int], radius: int, blur: int = 28) -> Image.Image:
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    d.rounded_rectangle((blur, blur, size[0] - blur, size[1] - blur), radius=radius, fill=(0, 0, 0, 92))
    return shadow.filter(ImageFilter.GaussianBlur(blur // 2))


def draw_feed_asset(post: dict) -> Image.Image:
    w, h = 1080, 1350
    canvas = gradient((w, h), NAVY_DARK, NAVY).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    for i in range(0, w, 54):
        draw.line((i, 0, i, h), fill=(255, 255, 255, 12), width=1)
    for i in range(0, h, 54):
        draw.line((0, i, w, i), fill=(255, 255, 255, 10), width=1)

    draw.rounded_rectangle((-120, 855, 860, 1500), radius=130, fill="#f2eadc")
    draw.polygon([(700, 0), (1080, 0), (1080, 1350), (910, 1350)], fill=(245, 215, 148, 56))
    draw.rectangle((0, 0, w, 18), fill=GOLD)

    add_logo(draw, canvas, 68, 56, 0.33)
    draw.text((68, 188), f"DAY {post['day']}  |  {post['date'].upper()}", font=font(24, True), fill=GOLD_LIGHT)

    title_font = font(92, True)
    draw_wrapped(draw, (68, 250), post["visual"], title_font, WHITE, 920, 4, max_lines=3)

    draw.rounded_rectangle((68, 560, 1012, 882), radius=42, fill=(255, 255, 255, 21), outline=(255, 255, 255, 45), width=2)
    draw_wrapped(draw, (108, 615), post["overlay"], font(48, True), NAVY_DARK, 850, 10, max_lines=3)
    draw.text((108, 808), post["subhead"].upper(), font=font(24, True), fill=GOLD)

    hero = Image.open(SOURCE_ASSETS / "elw-hero-photo.jpeg")
    photo = cover_crop(hero, (836, 288))
    photo = ImageEnhance.Contrast(photo).enhance(1.06)
    photo = ImageEnhance.Color(photo).enhance(1.08)
    canvas.alpha_composite(card_shadow((900, 360), 44, 34), (76, 900))
    paste_round(canvas, photo, (122, 936), 36)
    draw.rounded_rectangle((122, 936, 958, 1224), radius=36, outline=WHITE, width=6)

    draw.rounded_rectangle((122, 1238, 540, 1295), radius=28, fill=GOLD)
    draw.text((158, 1252), "SHOP THE BOX", font=font(28, True), fill=NAVY_DEEP)
    draw.text((678, 1250), "eb28.co/ELW", font=font(26, True), fill=NAVY_DARK)
    return canvas.convert("RGB")


def draw_vertical_asset(post: dict) -> Image.Image:
    w, h = 1080, 1920
    canvas = gradient((w, h), NAVY_DEEP, NAVY).convert("RGBA")
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((760, -300, 1440, 420), fill=(245, 215, 148, 48))
    draw.ellipse((-240, 1210, 540, 2050), fill=(255, 250, 241, 28))
    draw.rectangle((0, 0, w, 24), fill=GOLD)

    add_logo(draw, canvas, 72, 70, 0.36)
    draw.text((72, 240), f"DAY {post['day']}  |  {post['pillar'].upper()}", font=font(27, True), fill=GOLD_LIGHT)

    y = draw_wrapped(draw, (72, 306), post["visual"], font(108, True), WHITE, 900, 6, max_lines=4)
    y += 34
    draw_wrapped(draw, (76, y), post["overlay"], font(48, True), GOLD_LIGHT, 760, 10, max_lines=4)

    hero = Image.open(SOURCE_ASSETS / "elw-hero-photo.jpeg")
    photo = cover_crop(hero, (864, 548))
    photo = ImageEnhance.Sharpness(photo).enhance(1.06)
    canvas.alpha_composite(card_shadow((936, 620), 58, 42), (42, 968))
    paste_round(canvas, photo, (108, 1012), 44)
    draw.rounded_rectangle((108, 1012, 972, 1560), radius=44, outline=WHITE, width=8)

    draw.rounded_rectangle((72, 1616, 1008, 1744), radius=64, fill=CREAM)
    draw.text((130, 1652), post["subhead"].upper(), font=font(33, True), fill=NAVY_DARK)
    draw.text((132, 1701), "13G PROTEIN  |  BLUEBERRY ALMOND BUTTER", font=font(23, True), fill=GOLD)

    draw.text((72, 1812), "EL WORLD PROTEIN BARS", font=font(27, True), fill=WHITE)
    draw.text((730, 1812), "eb28.co/ELW", font=font(27, True), fill=GOLD_LIGHT)
    return canvas.convert("RGB")


def write_assets() -> None:
    hero = SOURCE_ASSETS / "elw-hero-photo.jpeg"
    shutil.copy2(hero, PUBLIC_DIR / "elw-og.jpeg")
    shutil.copy2(hero, DOCS_DIR / "elw-og.jpeg")
    for post in POSTS:
        feed = draw_feed_asset(post)
        vertical = draw_vertical_asset(post)
        feed_name = f"day-{post['day']:02d}-feed.png"
        vertical_name = f"day-{post['day']:02d}-vertical.png"
        feed.save(PUBLIC_DIR / "assets" / "feed-png" / feed_name, quality=95)
        vertical.save(PUBLIC_DIR / "assets" / "vertical-png" / vertical_name, quality=95)
        shutil.copy2(PUBLIC_DIR / "assets" / "feed-png" / feed_name, DOCS_DIR / "assets" / "feed-png" / feed_name)
        shutil.copy2(PUBLIC_DIR / "assets" / "vertical-png" / vertical_name, DOCS_DIR / "assets" / "vertical-png" / vertical_name)


def post_markdown(post: dict) -> str:
    lines = [
        f"## Day {post['day']}: {post['title']} ({post['date']})",
        "",
        "### Instagram",
        "",
        *post["ig"],
        "",
        "### Short Post / X",
        "",
        post["x"],
        "",
        "### TikTok / Reel",
        "",
        f"Hook: {post['reel_hook']}",
        "",
        f"Caption: {post['reel_caption']}",
        "",
        post["reel_direction"],
        "",
        "---",
        "",
    ]
    return "\n".join(lines)


def write_markdown() -> str:
    intro = [
        "# EL World Protein Bars - 14-Day Social Copy Plan, Batch 2",
        "",
        "Hi Lisa,",
        "",
        "Below is the next 14-day social media copy plan for EL World Protein Bars. This batch continues the routine-first direction from the first set while adding more desk drawer, travel, collagen support, workout, restock, and taste-review angles.",
        "",
        "Each day includes Instagram caption copy, short-post/X copy, and a TikTok/Reel hook, caption, and filming direction. The copy keeps claims conservative: 13g protein, Blueberry Almond Butter flavor, clean ingredients, bovine collagen support, grab-and-go convenience, and routine support.",
        "",
        "Suggested posting window: May 14, 2026 through May 27, 2026.",
        "",
        "---",
        "",
    ]
    body = "".join(post_markdown(post) for post in POSTS)
    extras = """
## Extra Short-Form Snippets

Use these as Stories, Reels, TikToks, X posts, or follow-up captions.

1. The better snack works best when it is already where your day gets busy.
2. Pack the bar before the excuse.
3. Taste is what keeps a clean snack in the weekly rotation.
4. Your desk drawer is part of your routine. Stock it like it matters.
5. Not every wellness reset needs to be intense. Walk, water, better snack.
6. Travel days reward the prepared.
7. The 3 p.m. dip needs a location-based plan, not more willpower.
8. Convenience without compromise means the snack is easy and still aligned with your goals.
9. One better snack default, repeated, can change the whole week.
10. Blueberry Almond Butter belongs in the bag before the day gets loud.
11. Bovine collagen support in a bar you can keep close.
12. Clean energy starts with fewer emergency snack decisions.

## Asset Production Briefs

### Feed Asset 1: Desk Drawer Reset

- Size: 1080 x 1350.
- Visual: EL World bar in a clean desk drawer with water, laptop, planner, and pen.
- Text overlay: "Stock the drawer before the craving shows up."
- Use on Day 19 and resize/crop for Stories.

### Feed Asset 2: Taste Review

- Size: 1080 x 1350.
- Visual: Wrapper close-up, bite/texture shot, blueberry and almond cues.
- Text overlay: "No aftertaste. Delicious flavor."
- Use on Day 21.

### Vertical Asset 1: Restock Before Monday

- Size: 1080 x 1920.
- Scenes: empty drawer, product stack, bag placement, gym tote, final stocked shelf.
- On-screen text: "The easiest snack is the one already stocked."
- Use on Day 22.

### Vertical Asset 2: Listen To Your Body

- Size: 1080 x 1920.
- Scenes: pause, three breaths, water, unwrap, bite.
- On-screen text: "Pause before you choose."
- Use on Day 27.

## Publishing Notes

- Recommended cadence: one Instagram post/Reel, one TikTok/Reel, and one short text post per day for 14 days.
- Keep all medical, disease, weight-loss, and guaranteed-performance claims out of captions and comment replies.
- Use native platform captions/subtitles on Reels/TikToks and keep the wrapper visible in the first 3 seconds.
- Every 4 to 5 posts includes a soft conversion CTA back to `https://eb28.co/ELW/`.

## QA Checklist

- Product claim says 13g protein.
- Copy says bovine collagen support, not medical or anti-aging outcomes.
- Copy does not call the product vegan, dairy-free, nut-free, gluten-free, keto, or meal replacement.
- Copy avoids "cure", "treat", "diabetes", "weight loss", or guaranteed health outcomes.
- All vertical edits keep key text centered and away from platform UI.
- All product visuals show the wrapper clearly.

Best,
Richard
""".strip()
    content = "\n".join(intro) + body + extras + "\n"
    DESKTOP_MD.write_text(content)
    return content


def write_html(markdown_text: str) -> str:
    cards = []
    for post in POSTS:
        feed = f"assets/feed-png/day-{post['day']:02d}-feed.png"
        vertical = f"assets/vertical-png/day-{post['day']:02d}-vertical.png"
        ig_html = "".join(f"<p>{html.escape(p)}</p>" for p in post["ig"])
        cards.append(
            f"""
      <article class="post-card" id="day-{post['day']:02d}">
        <div class="post-meta">
          <span>Day {post['day']}</span>
          <span>{html.escape(post['date'])}</span>
          <span>{html.escape(post['pillar'])}</span>
        </div>
        <h2>{html.escape(post['title'])}</h2>
        <div class="asset-grid">
          <a href="{feed}" download><img src="{feed}" alt="Day {post['day']} feed social asset"></a>
          <a href="{vertical}" download><img class="vertical" src="{vertical}" alt="Day {post['day']} vertical social asset"></a>
        </div>
        <div class="copy-grid">
          <section>
            <h3>Instagram</h3>
            {ig_html}
          </section>
          <section>
            <h3>Short Post / X</h3>
            <p>{html.escape(post['x'])}</p>
            <h3>TikTok / Reel</h3>
            <p><strong>Hook:</strong> {html.escape(post['reel_hook'])}</p>
            <p><strong>Caption:</strong> {html.escape(post['reel_caption'])}</p>
            <p>{html.escape(post['reel_direction'])}</p>
          </section>
        </div>
      </article>
"""
        )
    nav_items = "".join(f'<a href="#day-{post["day"]:02d}">Day {post["day"]}</a>' for post in POSTS)
    html_text = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EL World Batch 2 Social Content Campaign</title>
  <meta name="description" content="Batch 2 of the EL World Protein Bars 14-day social media content campaign.">
  <meta property="og:title" content="EL World Batch 2 Social Content Campaign">
  <meta property="og:description" content="14 days of captions, short posts, Reel/TikTok scripts, and social graphics for EL World Protein Bars.">
  <meta property="og:image" content="/ELWSOCIAL2/elw-og.jpeg">
  <style>
    :root {{
      --navy: {NAVY};
      --deep: {NAVY_DEEP};
      --dark: {NAVY_DARK};
      --gold: {GOLD};
      --gold-light: {GOLD_LIGHT};
      --cream: {CREAM};
      --white: {WHITE};
      --ink: {INK};
      --muted: {MUTED};
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      background: var(--deep);
      color: var(--white);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.5;
    }}
    a {{ color: inherit; }}
    .hero {{
      position: relative;
      min-height: 92vh;
      overflow: hidden;
      padding: 56px min(6vw, 84px);
      display: grid;
      align-items: end;
      background:
        radial-gradient(circle at 82% 12%, rgba(255, 233, 166, .28), transparent 28%),
        linear-gradient(130deg, var(--deep), var(--dark) 48%, var(--navy));
    }}
    .hero::after {{
      content: "";
      position: absolute;
      inset: auto -10% -2% -10%;
      height: 150px;
      background: linear-gradient(90deg, var(--gold), var(--gold-light), var(--gold));
      transform: rotate(-5deg);
      box-shadow: 0 26px 70px rgba(0,0,0,.28);
    }}
    .hero-content {{ position: relative; z-index: 2; max-width: 980px; padding-bottom: 76px; }}
    .kicker {{
      color: var(--gold-light);
      font-weight: 950;
      letter-spacing: .16em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }}
    h1 {{
      margin: 0;
      font-size: clamp(54px, 10vw, 132px);
      line-height: .86;
      letter-spacing: -.05em;
      max-width: 900px;
    }}
    .lead {{
      max-width: 780px;
      margin: 28px 0 0;
      color: rgba(255, 250, 241, .86);
      font-size: clamp(20px, 2.4vw, 34px);
      font-weight: 720;
    }}
    .hero-actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 36px;
    }}
    .button {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 54px;
      padding: 14px 22px;
      border-radius: 999px;
      background: linear-gradient(115deg, var(--gold), var(--gold-light), var(--gold));
      color: var(--deep);
      text-decoration: none;
      font-weight: 950;
      letter-spacing: .08em;
      text-transform: uppercase;
      box-shadow: 0 18px 44px rgba(0,0,0,.28);
    }}
    .button.secondary {{
      background: transparent;
      color: var(--white);
      border: 2px solid rgba(255,255,255,.38);
    }}
    .nav {{
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding: 12px min(6vw, 84px);
      background: rgba(7, 20, 49, .92);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid rgba(255,255,255,.12);
    }}
    .nav a {{
      flex: 0 0 auto;
      padding: 9px 13px;
      border-radius: 999px;
      color: var(--gold-light);
      text-decoration: none;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .08em;
      border: 1px solid rgba(255,233,166,.22);
    }}
    main {{
      padding: 48px min(6vw, 84px) 90px;
      background: linear-gradient(180deg, var(--deep), #0d1b3e 34%, var(--cream) 34%, var(--cream));
    }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 34px;
    }}
    .summary div {{
      min-height: 138px;
      padding: 22px;
      border-radius: 28px;
      background: rgba(255,255,255,.09);
      border: 1px solid rgba(255,255,255,.16);
    }}
    .summary b {{ display: block; color: var(--gold-light); font-size: 34px; line-height: 1; }}
    .summary span {{ display: block; margin-top: 10px; color: rgba(255,250,241,.78); font-weight: 760; }}
    .post-card {{
      margin: 28px auto;
      max-width: 1360px;
      padding: clamp(22px, 4vw, 46px);
      color: var(--ink);
      background: rgba(255,250,241,.92);
      border: 1px solid rgba(38,52,70,.12);
      border-radius: 38px;
      box-shadow: 0 24px 70px rgba(7,20,49,.12);
    }}
    .post-meta {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }}
    .post-meta span {{
      padding: 8px 11px;
      border-radius: 999px;
      background: rgba(52,71,122,.09);
      color: var(--navy);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: .11em;
      text-transform: uppercase;
    }}
    h2 {{
      margin: 0 0 24px;
      color: var(--navy);
      font-size: clamp(36px, 5vw, 72px);
      line-height: .9;
      letter-spacing: -.04em;
    }}
    .asset-grid {{
      display: grid;
      grid-template-columns: .9fr .72fr;
      gap: 18px;
      align-items: start;
      margin-bottom: 28px;
    }}
    .asset-grid img {{
      width: 100%;
      height: auto;
      border-radius: 24px;
      box-shadow: 0 18px 50px rgba(38,52,70,.18);
      background: var(--deep);
    }}
    .vertical {{ max-height: 820px; object-fit: cover; object-position: top; }}
    .copy-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }}
    h3 {{
      margin: 18px 0 8px;
      color: #a06f1f;
      font-size: 14px;
      letter-spacing: .14em;
      text-transform: uppercase;
    }}
    p {{ margin: 0 0 12px; font-size: 17px; }}
    .footer-note {{
      max-width: 1100px;
      margin: 44px auto 0;
      padding: 28px;
      color: var(--ink);
      background: rgba(255,255,255,.82);
      border-radius: 30px;
      border: 1px solid rgba(38,52,70,.12);
    }}
    @media (max-width: 820px) {{
      .summary, .asset-grid, .copy-grid {{ grid-template-columns: 1fr; }}
      .hero {{ min-height: 84vh; }}
      main {{ padding-inline: 16px; }}
      .post-card {{ border-radius: 26px; }}
      .vertical {{ max-height: none; }}
    }}
    @media print {{
      body {{ background: white; color: var(--ink); }}
      .hero, .nav, .hero-actions {{ display: none; }}
      main {{ padding: 0; background: white; }}
      .post-card {{ box-shadow: none; page-break-inside: avoid; border-radius: 0; border: 0; }}
      .asset-grid img {{ max-height: 420px; width: auto; }}
      .footer-note {{ box-shadow: none; }}
    }}
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <div class="kicker">EL World Protein Bars | Social Batch 2</div>
      <h1>14 more days of clean routine content.</h1>
      <p class="lead">Captions, short posts, Reel/TikTok directions, and ready-to-review social graphics for May 14-27, 2026.</p>
      <div class="hero-actions">
        <a class="button" href="#day-15">Review Batch</a>
        <a class="button secondary" href="https://eb28.co/ELW/">View EL World Site</a>
      </div>
    </div>
  </header>
  <nav class="nav">{nav_items}</nav>
  <main>
    <section class="summary">
      <div><b>14</b><span>Daily campaign concepts</span></div>
      <div><b>28</b><span>Feed and vertical assets</span></div>
      <div><b>42</b><span>Caption/script deliverables</span></div>
      <div><b>0</b><span>Medical or weight-loss claims</span></div>
    </section>
    {''.join(cards)}
    <section class="footer-note">
      <h2>QA Notes</h2>
      <p>Claims stay conservative: 13g protein, Blueberry Almond Butter flavor, clean ingredients, bovine collagen support, grab-and-go convenience, and routine support.</p>
      <p>Recommended cadence: one Instagram post/Reel, one TikTok/Reel, and one short text post per day for 14 days.</p>
    </section>
  </main>
</body>
</html>
"""
    PUBLIC_DIR.joinpath("index.html").write_text(html_text)
    DOCS_DIR.joinpath("index.html").write_text(html_text)
    DESKTOP_PRESENTATION_HTML.write_text(html_text)
    return html_text


def main() -> None:
    ensure_dirs()
    write_assets()
    markdown = write_markdown()
    write_html(markdown)
    print(f"Wrote {DESKTOP_MD}")
    print(f"Wrote {DESKTOP_PRESENTATION_HTML}")
    print(f"Wrote {PUBLIC_DIR}")
    print(f"Wrote {DOCS_DIR}")


if __name__ == "__main__":
    main()
