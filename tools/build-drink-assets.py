#!/usr/bin/env python3
"""생성된 음료 마스터(가로 이미지)를 앱 규격 3종으로 크롭·리사이즈·WebP 변환.

    python3 tools/build-drink-assets.py ~/Downloads/master

    입력:  01_green_tea.png … 18_berry_smoothie.png  (가로, 긴 변 1200px 이상)
    출력:  assets/drinks/play/green-tea.webp   1200x750  (16:10)  재생 카드
           assets/drinks/card/green-tea.webp    600x516  (1:0.86) 라이브러리
           assets/drinks/mini/green-tea.webp    160x160  (1:1)    미니 플레이어

크기 근거는 guide.md "9. 그래픽 에셋 규격" 참고.
Pillow 필요: python3 -m venv .venv && .venv/bin/pip install Pillow
"""
import sys, os, glob, argparse
from PIL import Image
import numpy as np

VARIANTS = [("play", 16 / 10, 1200), ("card", 1 / 0.86, 600), ("mini", 1.0, 160)]
BAND_SCAN = 140


def light_band(a, axis, frm):
    """가장자리부터 밝고 무채색인 줄이 몇 px 이어지는지 — 시트 셀 추출 오차 흔적."""
    n = a.shape[1] if axis == "x" else a.shape[0]
    c = 0
    for i in range(BAND_SCAN):
        idx = i if frm == "start" else n - 1 - i
        line = a[:, idx] if axis == "x" else a[idx, :]
        if line.mean() > 200 and (line.max(1).astype(int) - line.min(1).astype(int)).mean() < 25:
            c += 1
        else:
            break
    return c


def trim_bands(im):
    a = np.asarray(im)
    l, r = light_band(a, "x", "start"), light_band(a, "x", "end")
    t, b = light_band(a, "y", "start"), light_band(a, "y", "end")
    # 양쪽 중 큰 값 + 2px 여유로 대칭 크롭 — 구도 중심을 보존한다
    px = max(l, r) + 2 if max(l, r) else 0
    py = max(t, b) + 2 if max(t, b) else 0
    if not (px or py):
        return im, 0
    w, h = im.size
    return im.crop((px, py, w - px, h - py)), max(px, py)


def center_crop(im, ratio):
    w, h = im.size
    if w / h > ratio:
        nw, nh = int(round(h * ratio)), h
    else:
        nw, nh = w, int(round(w / ratio))
    return im.crop(((w - nw) // 2, (h - nh) // 2, (w - nw) // 2 + nw, (h - nh) // 2 + nh))


def slugify(path):
    return os.path.basename(path).rsplit(".", 1)[0].split("_", 1)[-1].replace("_", "-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="마스터 PNG 폴더")
    ap.add_argument("-o", "--out", default="assets/drinks")
    ap.add_argument("-q", "--quality", type=int, default=80)
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(args.src, "*.png")) + glob.glob(os.path.join(args.src, "*.jpg")))
    if not files:
        sys.exit(f"이미지 없음: {args.src}")
    for name, _, _ in VARIANTS:
        os.makedirs(os.path.join(args.out, name), exist_ok=True)

    warned = 0
    for f in files:
        slug = slugify(f)
        im = Image.open(f).convert("RGB")
        im, trimmed = trim_bands(im)
        w, h = im.size
        if w < 1200:
            print(f"❌ {slug:<18} {w}x{h} — 가로 1200px 미만, 재생 카드용으로 부족. 건너뜀")
            warned += 1
            continue
        sizes = []
        for name, ratio, target_w in VARIANTS:
            out = center_crop(im, ratio)
            out = out.resize((target_w, int(round(target_w / ratio))), Image.LANCZOS)
            path = os.path.join(args.out, name, f"{slug}.webp")
            out.save(path, "WEBP", quality=args.quality, method=6)
            sizes.append(f"{name} {os.path.getsize(path) // 1024}KB")
        note = f"  (흰 띠 {trimmed}px 제거)" if trimmed else ""
        print(f"✅ {slug:<18} " + "  ".join(sizes) + note)

    print()
    for name, _, _ in VARIANTS:
        d = os.path.join(args.out, name)
        fs = glob.glob(os.path.join(d, "*.webp"))
        if not fs:
            continue
        tot = sum(os.path.getsize(x) for x in fs)
        print(f"{name:<5} {len(fs):>2}종  합계 {tot//1024:>4}KB  최대 {max(os.path.getsize(x) for x in fs)//1024:>3}KB")
    print("\n라이브러리(card)는 18장이 한 번에 로드됩니다. 장당 40KB를 넘으면 -q 를 낮추세요.")
    if warned:
        sys.exit(1)


if __name__ == "__main__":
    main()
