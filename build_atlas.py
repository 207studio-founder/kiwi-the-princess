#!/usr/bin/env python3
"""Build a deterministic Kiwi v2 atlas from a reviewed selection.json."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
CELL = (192, 208)
ATLAS = (1536, 2288)
ROWS = (
    ("idle", 6, [280, 110, 110, 140, 140, 320]),
    ("running-right", 8, [120] * 7 + [220]),
    ("running-left", 8, [120] * 7 + [220]),
    ("waving", 4, [140, 140, 140, 280]),
    ("jumping", 5, [140, 140, 140, 140, 280]),
    ("failed", 8, [140] * 7 + [240]),
    ("waiting", 6, [150] * 5 + [260]),
    ("running", 6, [120] * 5 + [220]),
    ("review", 6, [150] * 5 + [280]),
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def resolve_source(value: str, selection_path: Path) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = selection_path.parent / path
    return path.resolve()


def unpack_entry(entry: object, shared_transform: object, selection_path: Path) -> tuple[Path, dict | None]:
    if isinstance(entry, str):
        value, transform = entry, shared_transform
    elif isinstance(entry, dict):
        value = entry.get("path", entry.get("source"))
        transform = entry.get("transform", shared_transform)
    else:
        raise ValueError(f"invalid frame entry: {entry!r}")
    if not isinstance(value, str) or not value:
        raise ValueError("each frame entry needs a nonempty path")
    if transform is not None and not isinstance(transform, dict):
        raise ValueError("transform must be an object")
    return resolve_source(value, selection_path), transform


def validate_transform(transform: dict | None) -> tuple[float, tuple[float, float], tuple[float, float]] | None:
    if transform is None:
        return None
    scale = transform.get("scale")
    source_anchor = transform.get("sourceAnchor")
    cell_anchor = transform.get("cellAnchor", [96, 190])
    if not isinstance(scale, (int, float)) or not 0 < scale <= 10:
        raise ValueError("transform.scale must be positive")
    if not isinstance(source_anchor, list) or len(source_anchor) != 2:
        raise ValueError("transform.sourceAnchor must be [x, y]")
    if not isinstance(cell_anchor, list) or len(cell_anchor) != 2:
        raise ValueError("transform.cellAnchor must be [x, y]")
    return float(scale), tuple(map(float, source_anchor)), tuple(map(float, cell_anchor))


def clean_and_check(image: Image.Image, path: Path) -> Image.Image:
    if image.mode != "RGBA":
        raise ValueError(f"{path}: expected RGBA, got {image.mode}")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] <= 4:
                pixels[x, y] = (0, 0, 0, 0)
    alpha = image.getchannel("A")
    if alpha.getbbox() is None:
        raise ValueError(f"{path}: empty alpha")
    low, high = alpha.getextrema()
    if low == high == 255:
        raise ValueError(f"{path}: opaque image has no transparent background")
    bbox = alpha.getbbox()
    if bbox[0] == 0 or bbox[1] == 0 or bbox[2] >= image.width or bbox[3] >= image.height:
        raise ValueError(f"{path}: visible art touches image boundary")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if pixels[x, y][3] == 0 and pixels[x, y][:3] != (0, 0, 0):
                pixels[x, y] = (0, 0, 0, 0)
    return image


def render_cell(path: Path, transform_value: dict | None) -> Image.Image:
    if not path.is_file():
        raise ValueError(f"missing frame: {path}")
    with Image.open(path) as opened:
        opened.load()
        image = opened.copy()
    clean_and_check(image, path)
    if image.size == CELL:
        if transform_value is not None:
            raise ValueError(f"{path}: cell frame must not also specify a transform")
        return image
    transform = validate_transform(transform_value)
    if transform is None:
        raise ValueError(f"{path}: expected a {CELL[0]}x{CELL[1]} cell or a shared transform")
    scale, source_anchor, cell_anchor = transform
    inverse_scale = 1.0 / scale
    coefficients = (
        inverse_scale, 0.0, source_anchor[0] - cell_anchor[0] * inverse_scale,
        0.0, inverse_scale, source_anchor[1] - cell_anchor[1] * inverse_scale,
    )
    cell = image.transform(CELL, Image.Transform.AFFINE, coefficients, Image.Resampling.BICUBIC)
    clean_and_check(cell, path)
    return cell


def normalize_group(value: object, shared_transform: object, selection_path: Path, expected: int, label: str) -> list[tuple[Path, dict | None]]:
    if isinstance(value, dict):
        frames = value.get("frames", value.get("paths"))
        transform = value.get("transform", shared_transform)
    else:
        frames, transform = value, shared_transform
    if not isinstance(frames, list) or len(frames) != expected:
        actual = len(frames) if isinstance(frames, list) else "invalid"
        raise ValueError(f"{label}: expected {expected} frame paths, found {actual}")
    return [unpack_entry(frame, transform, selection_path) for frame in frames]


def build(selection_path: Path, output: Path) -> None:
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    states = selection.get("states")
    if not isinstance(states, dict):
        raise ValueError("selection.states must be an object")
    transforms = selection.get("transforms", {})
    if not isinstance(transforms, dict):
        raise ValueError("selection.transforms must be an object")

    frame_records: dict[str, list[dict]] = {}
    prepared: dict[str, list[Image.Image]] = {}
    for state, count, _durations in ROWS:
        if state not in states:
            raise ValueError(f"selection is missing state {state}")
        items = normalize_group(states[state], transforms.get(state), selection_path, count, state)
        prepared[state] = []
        frame_records[state] = []
        for index, (path, transform) in enumerate(items):
            cell = render_cell(path, transform)
            target = output / "frames" / state / f"{index:02d}.png"
            target.parent.mkdir(parents=True, exist_ok=True)
            cell.save(target, format="PNG", optimize=False, compress_level=9)
            prepared[state].append(cell)
            frame_records[state].append({
                "path": path.relative_to(selection_path.parent).as_posix(),
                "sha256": digest(path),
                "output": str(target.relative_to(output)),
                "outputSha256": digest(target),
                "transform": transform,
                "sourceSize": list(Image.open(path).size),
            })

    look_items = normalize_group(selection.get("look"), transforms.get("look"), selection_path, 16, "look")
    neutral_item = selection.get("neutral")
    if neutral_item is None:
        raise ValueError("selection is missing neutral")
    neutral_path, neutral_transform = unpack_entry(neutral_item, transforms.get("neutral"), selection_path)
    prepared["look"] = []
    frame_records["look"] = []
    for index, (path, transform) in enumerate(look_items):
        cell = render_cell(path, transform)
        target = output / "frames" / "look" / f"{index:02d}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        cell.save(target, format="PNG", optimize=False, compress_level=9)
        prepared["look"].append(cell)
        frame_records["look"].append({
            "path": path.relative_to(selection_path.parent).as_posix(), "sha256": digest(path),
            "output": str(target.relative_to(output)), "outputSha256": digest(target),
        })
    neutral = render_cell(neutral_path, neutral_transform)
    neutral_target = output / "frames" / "neutral.png"
    neutral_target.parent.mkdir(parents=True, exist_ok=True)
    neutral.save(neutral_target, format="PNG", optimize=False, compress_level=9)

    atlas = Image.new("RGBA", ATLAS, (0, 0, 0, 0))
    for row, (state, _count, _durations) in enumerate(ROWS):
        for column, frame in enumerate(prepared[state]):
            atlas.alpha_composite(frame, (column * CELL[0], row * CELL[1]))
    atlas.alpha_composite(neutral, (6 * CELL[0], 0))
    for index, frame in enumerate(prepared["look"]):
        row, column = 9 + index // 8, index % 8
        atlas.alpha_composite(frame, (column * CELL[0], row * CELL[1]))
    output.mkdir(parents=True, exist_ok=True)
    png_path = output / "spritesheet.png"
    webp_path = output / "spritesheet.webp"
    atlas.save(png_path, format="PNG", optimize=False, compress_level=9)
    atlas.save(webp_path, format="WEBP", lossless=True, quality=100, method=6, exact=True)
    metadata = {
        "id": "kiwi-clay-r4",
        "displayName": "키위 · 클레이",
        "description": "Latte long-haired dachshund Kiwi",
        "spriteVersionNumber": 2,
        "spritesheetPath": "spritesheet.webp",
    }
    (output / "pet.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    frame_records["neutral"] = [{
        "path": neutral_path.relative_to(selection_path.parent).as_posix(), "sha256": digest(neutral_path),
        "output": str(neutral_target.relative_to(output)), "outputSha256": digest(neutral_target),
    }]
    provenance = {
        "selection": selection_path.name,
        "selectionSha256": digest(selection_path),
        "rows": [{"state": state, "count": count, "durationsMs": durations} for state, count, durations in ROWS],
        "lookCount": 16,
        "frames": frame_records,
        "spritesheetPngSha256": digest(png_path),
        "spritesheetWebpSha256": digest(webp_path),
    }
    (output / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection", type=Path, default=HERE / "selection.json")
    parser.add_argument("--output", type=Path, default=HERE / "build")
    args = parser.parse_args()
    try:
        selection_path = args.selection.expanduser().resolve()
        output = args.output.expanduser().resolve()
        build(selection_path, output)
        print(json.dumps({"ok": True, "output": str(output)}))
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
