#!/usr/bin/env python3
"""BM 꾸불림체 -> MyCup Display 라틴 서브셋(woff2) 생성.

    python3 tools/build-display-font.py ~/Downloads/BM-fonts-package/otf/BMKkubulim.otf

원본은 SIL Open Font License 1.1이고 `BMkkubulim`이 Reserved Font Name이다.
서브셋은 OFL상 Modified Version이므로 3항에 따라 원래 이름을 쓸 수 없다
 -> name 테이블의 family/full/postscript 를 'MyCup Display'로 개명한다.
저작권 고지(name ID 0)는 유지 의무가 있어 그대로 두고 파생 사실만 덧붙인다.

Pillow 아닌 fonttools 필요: pip install fonttools brotli
"""
import argparse, os, sys, tempfile
from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY, PSNAME = "MyCup Display", "MyCupDisplay-Regular"
CHARS = ("abcdefghijklmnopqrstuvwxyz"
         "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
         "0123456789 *·.,!?&'-—")
DERIV = ("  Subset/modified from BM Kkubulim by the My Cup project; "
         "renamed per OFL 1.1 clause 3 (Reserved Font Name).")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="BMKkubulim.otf 경로")
    ap.add_argument("-o", "--out", default="fonts/mycup-display-latin.woff2")
    a = ap.parse_args()
    if not os.path.exists(a.src):
        sys.exit(f"원본 없음: {a.src}")

    tmp = tempfile.mktemp(suffix=".otf")
    subset.main([a.src, f"--text={CHARS}", "--layout-features=*",
                 f"--output-file={tmp}", "--desubroutinize"])

    f = TTFont(tmp)
    for rec in list(f["name"].names):
        if rec.nameID in (1, 4, 16):
            rec.string = FAMILY
        elif rec.nameID == 6:
            rec.string = PSNAME
        elif rec.nameID == 3:
            rec.string = f"{PSNAME};subset of BM Kkubulim"
    f["name"].setName((f["name"].getDebugName(0) or "") + DERIV, 0, 3, 1, 0x409)

    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    f.flavor = "woff2"
    f.save(a.out)
    f.close()
    os.remove(tmp)

    chk = TTFont(a.out)
    fam = chk["name"].getDebugName(1) or ""
    assert "kkubulim" not in fam.lower(), f"Reserved Font Name 잔존: {fam}"
    print(f"✅ {a.out}  {os.path.getsize(a.out)//1024}KB  family={fam}")
    print("   라이선스 고지는 fonts/OFL.txt · fonts/README.md 와 함께 배포할 것")


if __name__ == "__main__":
    main()
