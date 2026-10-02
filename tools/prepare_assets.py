"""Crop, shrink and convert source art + subset the Korean font for the web build.

Run: python tools/prepare_assets.py   (from the claude-endless-forest folder)
"""
import pathlib
import re

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT.parent.parent / "모바일게임" / "village-guardians"
OUT_IMG = ROOT / "game" / "assets" / "img"
OUT_FONT = ROOT / "game" / "assets" / "fonts"

IMAGES = {
    "squirrel": (SRC / "assets/heroes/hero_squirrel.png", 256),
    "tiger": (SRC / "assets/heroes/hero_tiger.png", 256),
    "sprout": (SRC / "assets/heroes/monster_normal.png", 192),
    "hedgehog": (SRC / "assets/heroes/monster_elite.png", 448),
}


def prepare_images():
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    for name, (path, height) in IMAGES.items():
        im = Image.open(path).convert("RGBA")
        im = im.crop(im.getbbox())
        width = round(im.width * height / im.height)
        im = im.resize((width, height), Image.LANCZOS)
        out = OUT_IMG / f"{name}.webp"
        im.save(out, "WEBP", quality=90, method=6)
        print(f"{out.name}: {width}x{height}, {out.stat().st_size // 1024} KB")


def subset_font():
    from fontTools import subset

    chars = set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .,:;!?%+-×·/()[]~'\"…→↑")
    for js in (ROOT / "game" / "js").glob("*.js"):
        for literal in re.findall(r"'([^']*)'|\"([^\"]*)\"|`([^`]*)`", js.read_text(encoding="utf-8")):
            chars.update("".join(literal))
    chars = {c for c in chars if c.isprintable()}
    src = SRC / "assets/fonts/Jua-Regular.ttf"
    out = OUT_FONT / "jua-subset.woff"
    OUT_FONT.mkdir(parents=True, exist_ok=True)
    options = subset.Options()
    options.flavor = "woff"
    font = subset.load_font(str(src), options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="".join(sorted(chars)))
    subsetter.subset(font)
    subset.save_font(font, str(out), options)
    (OUT_FONT / "OFL.txt").write_bytes((SRC / "assets/fonts/OFL.txt").read_bytes())
    print(f"{out.name}: {len(chars)} glyphs, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    prepare_images()
    subset_font()
