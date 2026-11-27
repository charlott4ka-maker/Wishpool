# The New Year app icon's parts, and the files the app needs built from them.
#
# The icon itself is HERS: the "App icon/newyear" component in her Figma file
# (a burgundy linear gradient, the star on top with a soft glow), exported at
# 1024 into design/icons/newyear_icon_1024.png. That export is the master, so
# never redraw the icon here; re-export it when the component changes.
#
# The background of that component is the Premium "Glow" icon's own gradient
# with the hue turned to burgundy, stop by stop (same saturation and
# brightness, so the white light at the bottom keeps its intensity).
# `gradient_stops()` prints those stops again if the blue icon ever changes.
#
# This script writes what the app loads:
#   mobile/assets/icons/newyear.png       the icon (no alpha, like the others)
#   mobile/assets/icons/newyear-fg.png    the Android foreground (safe zone)
#   mobile/assets/newyear-star.png        the launch screen's star
#   mobile/assets/newyear-star-blur.png   and the blurred twin it fades in from
#
#   python3 design/icons/newyear_icon.py        (run from the repo root)
from PIL import Image, ImageFilter
import colorsys
import numpy as np

ROOT = "."
HUE = 347 / 360.0           # burgundy, the hue of our Secret Santa red


def gradient_stops():
    """The blue icon's background gradient, recoloured: for the Figma component."""
    blue = np.array(Image.open(f"{ROOT}/mobile/assets/icons/glow.png").convert("RGB")).astype(float)
    out = []
    for y in range(0, blue.shape[0], 64):
        h, s, v = colorsys.rgb_to_hsv(*(blue[y, 0] / 255))
        r, g, b = colorsys.hsv_to_rgb(HUE, s, v)
        out.append((round(y / (blue.shape[0] - 1), 3), tuple(round(c * 255) for c in (r, g, b))))
    return out


def main():
    icon = Image.open(f"{ROOT}/design/icons/newyear_icon_1024.png").convert("RGB")
    icon.save(f"{ROOT}/mobile/assets/icons/newyear.png")

    # Android foreground: the same picture, the star a little smaller (safe zone)
    fg = Image.open(f"{ROOT}/mobile/assets/icons/glow-fg.png")
    small = icon.resize((round(fg.width * 0.84), round(fg.height * 0.84)), Image.LANCZOS)
    prof = np.array(icon)[:, 0:1, :]          # the gradient on its own
    pad = Image.fromarray(np.repeat(prof, icon.width, axis=1)).resize(fg.size)
    pad.paste(small, ((fg.width - small.width) // 2, (fg.height - small.height) // 2))
    pad.save(f"{ROOT}/mobile/assets/icons/newyear-fg.png")

    # the launch screen's star: the cut-out on its own, like premium-star.png
    # (600 wide, a small margin), plus the blurred twin IconSplash cross-fades
    # it with: half the size, the star at 65% of the canvas, blur 12 (measured
    # off premium-star.png / premium-star-blur.png)
    cut = Image.open(f"{ROOT}/design/icons/newyear_star.png").convert("RGBA")
    cut = cut.crop(cut.getbbox())
    cut = cut.resize((584, round(cut.height * 584 / cut.width)), Image.LANCZOS)
    sharp = Image.new("RGBA", (600, cut.height + 16), (0, 0, 0, 0))
    sharp.paste(cut, (8, 8))
    sharp.save(f"{ROOT}/mobile/assets/newyear-star.png")
    cw, ch = sharp.width // 2, sharp.height // 2
    sw = round(cw * 0.65)
    small_star = cut.resize((sw, round(cut.height * sw / cut.width)), Image.LANCZOS)
    blurred = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    blurred.paste(small_star, ((cw - small_star.width) // 2, (ch - small_star.height) // 2))
    blurred.filter(ImageFilter.GaussianBlur(12)).save(f"{ROOT}/mobile/assets/newyear-star-blur.png")
    print("icon", icon.size, "star", sharp.size, "blur", blurred.size)


if __name__ == "__main__":
    main()
