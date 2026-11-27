# Builds the New Year app icon (and its launch-screen star) from the drafts in
# this folder, so it is the Premium "Glow" icon with only two things changed:
# the background colour (burgundy instead of our navy blue) and the star.
#
# Everything else is measured off mobile/assets/icons/glow.png and reused:
#   * the background is that icon's vertical gradient, hue turned to burgundy
#     (the same saturation and brightness on every row, so the white light at
#     the bottom keeps its intensity),
#   * the soft light around the star (a blurred silhouette, sigma 80),
#   * the drop shadow under it (the silhouette 40px lower, sigma 15, a 6.5%
#     darkening of the background).
#
# The star itself comes out of the drafts: newyear_glow_bottom / _top / _corner
# are the same star over three different backgrounds, so the pixels that are
# identical in all three are the star (difference matting).
#
#   python3 design/icons/newyear_icon.py        (run from the repo root)
from PIL import Image, ImageFilter
import colorsys
import numpy as np

ROOT = "."
HUE = 347 / 360.0           # burgundy, the hue of our Secret Santa red
GLOW_SIGMA, GLOW_K = 80, np.array([8.71, 13.37, 20.74])   # fitted on glow.png
SHADOW_DY, SHADOW_SIGMA, SHADOW_K = 40, 15, 0.065


def blur(a, s):
    return np.array(Image.fromarray((np.clip(a, 0, 1) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(s))).astype(float) / 255


def grow(seed, allow):
    cur = seed.copy()
    while True:
        n = cur.copy()
        n[1:] |= cur[:-1]; n[:-1] |= cur[1:]; n[:, 1:] |= cur[:, :-1]; n[:, :-1] |= cur[:, 1:]
        n &= allow
        if n.sum() == cur.sum():
            return cur
        cur = n


def star_cutout():
    """The New Year star with a clean alpha, 1024x1024, where the drafts put it."""
    a, b, c = (np.array(Image.open(f"{ROOT}/design/icons/newyear_glow_{k}.png").convert("RGB")).astype(float) for k in ("bottom", "top", "corner"))
    same = (np.abs(a - b).max(2) < 1.5) & (np.abs(a - c).max(2) < 1.5)
    seed = np.zeros(same.shape, bool)
    seed[500:560, 480:540] = True       # inside the star
    body = grow(seed & same, same)
    alpha = np.array(Image.fromarray((body * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.7))).astype(float) / 255
    return a, alpha


def recolour(rgb):
    """Same saturation and brightness, our burgundy hue."""
    h, s, v = colorsys.rgb_to_hsv(*(np.asarray(rgb) / 255))
    return np.array(colorsys.hsv_to_rgb(HUE, s, v)) * 255


def main():
    blue = np.array(Image.open(f"{ROOT}/mobile/assets/icons/glow.png").convert("RGB")).astype(float)
    rgb, alpha = star_cutout()

    # the background: the blue icon's own gradient, row by row, turned burgundy
    prof = np.stack([recolour(blue[y, 0]) for y in range(blue.shape[0])])
    out = np.repeat(prof[:, None, :], blue.shape[1], axis=1)

    # the shadow under the star, then the light around it, then the star
    shadow = np.zeros_like(alpha)
    shadow[SHADOW_DY:] = alpha[:-SHADOW_DY]
    out *= 1 - SHADOW_K * blur(shadow, SHADOW_SIGMA)[..., None]
    out += recolour(GLOW_K)[None, None, :] * blur(alpha, GLOW_SIGMA)[..., None]
    out = out * (1 - alpha[..., None]) + rgb * alpha[..., None]
    icon = Image.fromarray(np.clip(out, 0, 255).astype("uint8"))
    icon.save(f"{ROOT}/mobile/assets/icons/newyear.png")

    # Android foreground: the same picture, the star a little smaller (safe zone)
    fg = Image.open(f"{ROOT}/mobile/assets/icons/glow-fg.png")
    scale = 0.84
    small = icon.resize((round(fg.width * scale), round(fg.height * scale)), Image.LANCZOS)
    pad = Image.fromarray(np.repeat(np.repeat(np.clip(prof, 0, 255).astype("uint8")[:, None, :], fg.width, 1), 1, 0)).resize(fg.size)
    pad.paste(small, ((fg.width - small.width) // 2, (fg.height - small.height) // 2))
    pad.save(f"{ROOT}/mobile/assets/icons/newyear-fg.png")

    # the launch screen's star: the cut-out on its own, like premium-star.png
    # (600 wide, a small margin), plus the blurred twin IconSplash cross-fades
    # it with: half the size, the star at 65% of the canvas, blur 12 (measured
    # off premium-star.png / premium-star-blur.png)
    cut = Image.fromarray(np.dstack([rgb.astype("uint8"), (alpha * 255).astype("uint8")]))
    cut = cut.crop(cut.getbbox())
    w = 584
    cut = cut.resize((w, round(cut.height * w / cut.width)), Image.LANCZOS)
    sharp = Image.new("RGBA", (600, cut.height + 16), (0, 0, 0, 0))
    sharp.paste(cut, (8, 8))
    sharp.save(f"{ROOT}/mobile/assets/newyear-star.png")
    cw, ch = sharp.width // 2, sharp.height // 2
    sw = round(cw * 0.65)
    small = cut.resize((sw, round(cut.height * sw / cut.width)), Image.LANCZOS)
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    canvas.paste(small, ((cw - small.width) // 2, (ch - small.height) // 2))
    canvas.filter(ImageFilter.GaussianBlur(12)).save(f"{ROOT}/mobile/assets/newyear-star-blur.png")
    print("icon", icon.size, "star", sharp.size, "blur", canvas.size)


if __name__ == "__main__":
    main()
