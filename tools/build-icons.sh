#!/usr/bin/env bash
# SVG 아이콘 -> 파비콘 / PWA / apple-touch PNG 일괄 생성
#
#   ./tools/build-icons.sh
#
# 필요: rsvg-convert  (brew install librsvg)
# 원본 viewBox 가 512 라 배율 그대로 내보내면 된다.
#
# apple-touch-icon 은 알파를 지원하지 않는다(iOS 가 투명을 검게 칠함).
# icon.svg 에 이미 #131411 배경 사각형이 있어 그대로 쓰면 된다.
#
# maskable 은 안드로이드가 원형·스퀘어클로 잘라내므로 콘텐츠가 중앙 80% 안에 있어야 한다
# (512 기준 안전지름 409px). icon-maskable.svg 는 scale(0.72) 라 이미 만족.

set -euo pipefail
cd "$(dirname "$0")/.."

command -v rsvg-convert >/dev/null || { echo "rsvg-convert 없음 — brew install librsvg"; exit 1; }

SRC=icons/icon.svg
MASK=icons/icon-maskable.svg
OUT=icons

png() {  # png <소스> <크기> <출력> [배경색]
  if [ -n "${4:-}" ]; then
    rsvg-convert -b "$4" -w "$2" -h "$2" -f png -o "$OUT/$3" "$1"
  else
    rsvg-convert -w "$2" -h "$2" -f png -o "$OUT/$3" "$1"
  fi
  printf "  %-28s %s\n" "$3" "$(du -h "$OUT/$3" | cut -f1)"
}

echo "일반 아이콘"
png "$SRC" 16  favicon-16.png
png "$SRC" 32  favicon-32.png
png "$SRC" 48  favicon-48.png
png "$SRC" 180 apple-touch-icon.png "#131411"   # iOS 는 알파를 검게 칠함
png "$SRC" 192 icon-192.png
png "$SRC" 512 icon-512.png

echo "마스커블 (안전지름 중앙 80%)"
png "$MASK" 192 icon-maskable-192.png
png "$MASK" 512 icon-maskable-512.png

# favicon.ico — 16/32/48 멀티 해상도
if command -v magick >/dev/null; then
  magick "$OUT/favicon-16.png" "$OUT/favicon-32.png" "$OUT/favicon-48.png" "$OUT/favicon.ico"
  printf "  %-28s %s\n" "favicon.ico" "$(du -h "$OUT/favicon.ico" | cut -f1)"
else
  python3 - <<'PY'
# ImageMagick 없이 표준 라이브러리만으로 멀티 해상도 .ico 를 만든다
import struct
sizes = [16, 32, 48]
imgs = [open(f"icons/favicon-{s}.png", "rb").read() for s in sizes]
out = struct.pack("<HHH", 0, 1, len(sizes))          # ICONDIR
off = 6 + 16 * len(sizes)
for s, d in zip(sizes, imgs):
    out += struct.pack("<BBBBHHII", s if s < 256 else 0, s if s < 256 else 0,
                       0, 0, 1, 32, len(d), off)      # ICONDIRENTRY
    off += len(d)
out += b"".join(imgs)
open("icons/favicon.ico", "wb").write(out)
print(f"  {'favicon.ico':<28} {len(out)//1024 or 1}K")
PY
fi

echo
echo "완료 — index.html 의 <link> 와 manifest.json 이 이 파일들을 가리키는지 확인할 것"
