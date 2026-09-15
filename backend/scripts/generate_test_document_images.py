from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

BASE = Path(__file__).resolve().parents[2]
TEST_SAMPLES = BASE / "test_samples"

FONT_PATH = "/System/Library/Fonts/Arial.ttf"

SAMPLE_FILES = [
    "health_insurance_policy.txt",
    "sample_passport.txt",
    "vehicle_registration_rc.txt",
]


def render_document_image(source_path: Path, output_path: Path, title: str):
    text = source_path.read_text(encoding="utf-8")
    wrapped = textwrap.fill(text, width=110)

    width, height = 1500, 2200
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype(FONT_PATH, 52)
        body_font = ImageFont.truetype(FONT_PATH, 32)
    except Exception:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()

    margin = 80
    y = 80

    draw.text((margin, y), title, fill="black", font=title_font)
    y += 90

    for line in wrapped.splitlines():
        draw.text((margin, y), line, fill="black", font=body_font)
        y += 38
        if y > height - 120:
            break

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"Created {output_path}")


def main():
    for filename in SAMPLE_FILES:
        source = TEST_SAMPLES / filename
        if not source.exists():
            print(f"Missing source file: {source}")
            continue

        output = TEST_SAMPLES / f"{source.stem}.png"
        render_document_image(source, output, source.stem.replace("_", " ").title())


if __name__ == "__main__":
    main()
