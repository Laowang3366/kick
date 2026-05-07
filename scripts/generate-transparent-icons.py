from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DESKTOP_SOURCE = Path(r"D:\Tencent\QQNT\QQdownloads\IMG_20260507_170537_251.jpg")
DEFAULT_INSTALLER_SOURCE = Path(r"D:\Tencent\QQNT\QQdownloads\IMG_20260507_170537_594.jpg")
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def is_edge_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    high = max(r, g, b)
    low = min(r, g, b)
    chroma = high - low

    return (low >= 232 and chroma <= 36) or (low >= 218 and chroma <= 16)


def build_edge_background_mask(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def index(x: int, y: int) -> int:
        return y * width + x

    def enqueue_if_background(x: int, y: int) -> None:
        item_index = index(x, y)
        if visited[item_index] or not is_edge_background(pixels[x, y]):
            return
        visited[item_index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue_if_background(x, 0)
        enqueue_if_background(x, height - 1)
    for y in range(height):
        enqueue_if_background(0, y)
        enqueue_if_background(width - 1, y)

    while queue:
        x, y = queue.popleft()
        for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= next_x < width and 0 <= next_y < height:
                enqueue_if_background(next_x, next_y)

    mask = Image.new("L", (width, height), 0)
    mask.putdata(visited)
    return mask.point(lambda value: 255 if value else 0)


def trim_to_icon(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if bbox is None:
        return image

    cropped = image.crop(bbox)
    width, height = cropped.size
    square_size = max(width, height)
    padding = max(10, round(square_size * 0.035))
    canvas_size = square_size + padding * 2
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 0))
    canvas.alpha_composite(cropped, ((canvas_size - width) // 2, (canvas_size - height) // 2))
    return canvas


def make_transparent_icon(source: Path, output: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    background_mask = build_edge_background_mask(image)
    softened_background = background_mask.filter(ImageFilter.GaussianBlur(radius=0.9))
    alpha = softened_background.point(lambda value: 255 - value)

    image.putalpha(alpha)
    icon_canvas = trim_to_icon(image)
    output.parent.mkdir(parents=True, exist_ok=True)
    icon_canvas.save(output, format="ICO", sizes=ICON_SIZES)
    return icon_canvas


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate transparent Windows ICO assets from source JPG icons.")
    parser.add_argument("--desktop-source", type=Path, default=DEFAULT_DESKTOP_SOURCE)
    parser.add_argument("--installer-source", type=Path, default=DEFAULT_INSTALLER_SOURCE)
    parser.add_argument("--desktop-output", type=Path, default=PROJECT_ROOT / "build" / "icons" / "desktop-icon.ico")
    parser.add_argument("--installer-output", type=Path, default=PROJECT_ROOT / "build" / "icons" / "installer-icon.ico")
    parser.add_argument("--preview-dir", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    desktop_icon = make_transparent_icon(args.desktop_source, args.desktop_output)
    installer_icon = make_transparent_icon(args.installer_source, args.installer_output)

    if args.preview_dir:
        args.preview_dir.mkdir(parents=True, exist_ok=True)
        desktop_icon.save(args.preview_dir / "desktop-icon-transparent.png")
        installer_icon.save(args.preview_dir / "installer-icon-transparent.png")

    print(f"desktop icon: {args.desktop_output}")
    print(f"installer icon: {args.installer_output}")


if __name__ == "__main__":
    main()
