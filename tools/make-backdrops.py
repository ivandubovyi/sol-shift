"""
Sol Shift: prepare the two NASA photos used behind the base.

NOTE: this script was written by an AI assistant (Claude). See AI-USE.md.

The photos (downloaded once, on 2026-11-14, with the team lead's approval):
  Day:  PIA16768, "Mount Sharp Panorama in White-Balanced Colors"
        https://science.nasa.gov/photojournal/mount-sharp-panorama-in-white-balanced-colors/
        Credit: NASA/JPL-Caltech/MSSS
  Dusk: PIA19400, "Sunset in Mars' Gale Crater"
        https://science.nasa.gov/photojournal/sunset-in-mars-gale-crater/
        Credit: NASA/JPL-Caltech/MSSS/Texas A&M Univ.

What this script does to them, and nothing else:
  Day:  keeps the mountain and removes the sky. NASA white-balanced this
        photo, which makes the sky look blue like Earth's. The game draws
        its own sky instead (an artistic choice). The bottom strip with the
        black mosaic edge and NASA's caption text is cropped off. The far
        left and right ends fade out.
  Dusk: crops the bottom (dark ground the game covers anyway) and fades the
        top and left edges so the photo blends into the drawn sky.
  No pixels are painted, moved or generated. Colors are not changed here.

It uses only Python's standard library. It reads BMP files, so first convert
the downloads with the Mac's built-in "sips" tool, then make WebP files with
"cwebp":

  sips -Z 3000 -s format bmp PIA16768.jpg --out day.bmp
  sips -s format bmp PIA19400.tif --out dusk.bmp
  python3 tools/make-backdrops.py day  day.bmp  day.png
  python3 tools/make-backdrops.py dusk dusk.bmp dusk.png
  cwebp -q 90 -alpha_q 95 day.png  -o images/mars-day-PIA16768.webp
  cwebp -q 92 -alpha_q 95 dusk.png -o images/mars-dusk-PIA19400.webp

  python3 tools/make-backdrops.py sample any.bmp x y w h    (average color of a box)
"""
import struct
import sys
import zlib


def read_bmp(path):
    """Read an uncompressed 24 or 32 bit BMP. Returns (width, height, rows),
    where rows[y][x] is (r, g, b) and row 0 is the top."""
    with open(path, "rb") as f:
        data = f.read()
    if data[:2] != b"BM":
        raise SystemExit("not a BMP file: " + path)
    offset = struct.unpack_from("<I", data, 10)[0]
    width, height = struct.unpack_from("<ii", data, 18)
    bits = struct.unpack_from("<H", data, 28)[0]
    compression = struct.unpack_from("<I", data, 30)[0]
    if bits not in (24, 32) or compression not in (0, 3):
        raise SystemExit("unsupported BMP: %d bits, compression %d" % (bits, compression))
    step = bits // 8
    top_down = height < 0
    height = abs(height)
    row_bytes = (width * step + 3) & ~3
    rows = []
    for y in range(height):
        src_y = y if top_down else height - 1 - y
        start = offset + src_y * row_bytes
        raw = data[start:start + width * step]
        rows.append([(raw[i + 2], raw[i + 1], raw[i]) for i in range(0, width * step, step)])
    return width, height, rows


def write_png(path, width, height, rgba_rows):
    """Write an RGBA PNG. rgba_rows[y] is a bytes object, 4 bytes per pixel."""
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + row for row in rgba_rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------
# Day: keep the mountain, remove the sky
# ---------------------------------------------------------------------------
DAY_TOP = 0.20      # crop: keep rows from 20% ...
DAY_BOTTOM = 0.90   # ... to 90% of the photo's height (drops the caption strip)
DAY_EDGE_FADE = 0.04
LAND_REDNESS = 14   # land is redder than the sky: red minus blue above this


def make_day(src, out):
    width, height, rows = read_bmp(src)
    y0 = int(height * DAY_TOP)
    y1 = int(height * DAY_BOTTOM)

    # For every column, find where the land starts (the skyline).
    skyline = []
    for x in range(width):
        found = y1
        run = 0
        for y in range(0, y1):
            r, g, b = rows[y][x]
            if r - b > LAND_REDNESS:
                run += 1
                if run >= 3:
                    found = y - 2
                    break
            else:
                run = 0
        skyline.append(found)
    # Remove single-column jumps (a median over 5 columns).
    smooth = []
    for x in range(width):
        near = sorted(skyline[max(0, x - 2):x + 3])
        smooth.append(near[len(near) // 2])

    out_rows = []
    for y in range(y0, y1):
        row = bytearray()
        for x in range(width):
            r, g, b = rows[y][x]
            # Start 1 px below the skyline (skips the pale fringe) and
            # soften the edge over 2 px.
            alpha = smoothstep((y - smooth[x] - 1) / 2.0)
            edge = min(x, width - 1 - x) / (width * DAY_EDGE_FADE)
            alpha *= smoothstep(edge)
            row += bytes((r, g, b, int(alpha * 255 + 0.5)))
        out_rows.append(bytes(row))
    write_png(out, width, y1 - y0, out_rows)
    peak = min(range(width), key=lambda x: smooth[x])
    print("day: %d x %d, peak at column %d (%.3f of width), row %d of the crop (%.3f of height)" % (
        width, y1 - y0, peak, peak / width, smooth[peak] - y0, (smooth[peak] - y0) / (y1 - y0)))
    for frac in (0.0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 0.99):
        x = min(width - 1, int(frac * width))
        print("  skyline at %.2f of width: %.3f of crop height" % (frac, (smooth[x] - y0) / (y1 - y0)))


# ---------------------------------------------------------------------------
# Dusk: crop the bottom, fade the top and left edges
# ---------------------------------------------------------------------------
DUSK_BOTTOM = 0.74
DUSK_LEFT_FADE = 0.10
DUSK_TOP_FADE = 0.12


def make_dusk(src, out):
    width, height, rows = read_bmp(src)
    y1 = int(height * DUSK_BOTTOM)
    out_rows = []
    for y in range(y1):
        row = bytearray()
        top = smoothstep(y / (height * DUSK_TOP_FADE))
        for x in range(width):
            r, g, b = rows[y][x]
            left = smoothstep(x / (width * DUSK_LEFT_FADE))
            row += bytes((r, g, b, int(top * left * 255 + 0.5)))
        out_rows.append(bytes(row))
    write_png(out, width, y1, out_rows)

    # Where is the Sun? The brightest pixels in the photo.
    xs, ys, n = 0, 0, 0
    left, right = width, 0
    for y in range(height):
        for x in range(width):
            r, g, b = rows[y][x]
            if r + g + b > 720:
                xs += x; ys += y; n += 1
                left = min(left, x); right = max(right, x)
    if n:
        print("dusk: %d x %d, Sun centre at (%.3f of width, %.3f of the original height), about %d px wide" % (
            width, y1, xs / n / width, ys / n / height, right - left + 1))


def sample(src, x, y, w, h):
    width, height, rows = read_bmp(src)
    r = g = b = n = 0
    for yy in range(y, min(height, y + h)):
        for xx in range(x, min(width, x + w)):
            p = rows[yy][xx]
            r += p[0]; g += p[1]; b += p[2]; n += 1
    print("%dx%d box at (%d,%d) of %dx%d: #%02x%02x%02x" % (w, h, x, y, width, height, r // n, g // n, b // n))


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 3 and args[0] == "day":
        make_day(args[1], args[2])
    elif len(args) == 3 and args[0] == "dusk":
        make_dusk(args[1], args[2])
    elif len(args) == 6 and args[0] == "sample":
        sample(args[1], *[int(a) for a in args[2:]])
    else:
        print(__doc__)
