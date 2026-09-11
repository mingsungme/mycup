#!/usr/bin/env python3
"""브루잉 효과음 원본(mp3)을 앱용 짧은 m4a 로 다듬는다.

    python3 tools/build-sfx.py ~/Downloads

원본은 7~20초짜리 필드 레코딩이라 그대로 쓸 수 없다. 에너지가 가장 높은
구간만 잘라내고, 클릭음이 안 나게 페이드를 걸고, 레벨을 맞춘 뒤 AAC 로 인코딩한다.

macOS 내장 afconvert 만 쓴다(설치 불필요). 표준 라이브러리 wave 로 편집.
원본 출처는 Pixabay(Content License) — 상세는 assets/sfx/README.md.
"""
import array, math, os, subprocess, sys, tempfile, wave

SR = 24000          # UI 효과음이라 24kHz 로 충분
PEAK = 0.72         # 약 -3dBFS
OUT_DIR = "assets/sfx"

# (출력이름, 원본파일 패턴, 시작초, 길이초)  — 시작/길이는 RMS 분석으로 고른 구간
CLIPS = [
    ("ice",   "getting-ice-36928",     2.2, 1.6),
    ("pour",  "water-pouring-80316",   1.0, 1.6),
    ("soda",  "soda-pour-72514",       5.4, 1.6),
]


def load_mono(path):
    """afconvert 로 mono/24k PCM 을 거쳐 샘플 배열로 읽는다."""
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", path, tmp],
                   check=True, capture_output=True)
    w = wave.open(tmp)
    a = array.array("h")
    a.frombytes(w.readframes(w.getnframes()))
    w.close()
    os.remove(tmp)
    return a


def process(a, start, dur, fade_in=.02, fade_out=.18):
    i0, i1 = int(start * SR), int((start + dur) * SR)
    seg = array.array("h", a[i0:i1])
    if not seg:
        raise ValueError("잘라낸 구간이 비어 있음")
    # 피크 정규화
    mx = max(abs(x) for x in seg) or 1
    g = (PEAK * 32767) / mx
    # 페이드 — 시작/끝 클릭음 방지
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    n = len(seg)
    for i in range(n):
        v = seg[i] * g
        if i < fi:
            v *= i / fi
        elif i > n - fo:
            v *= (n - i) / fo
        seg[i] = max(-32768, min(32767, int(v)))
    return seg


def write_m4a(seg, out):
    tmp = tempfile.mktemp(suffix=".wav")
    w = wave.open(tmp, "wb")
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(seg.tobytes()); w.close()
    os.makedirs(os.path.dirname(out), exist_ok=True)
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", tmp, out],
                   check=True, capture_output=True)
    os.remove(tmp)


def main():
    src_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Downloads")
    total = 0
    for name, pat, start, dur in CLIPS:
        matches = [f for f in os.listdir(src_dir) if pat in f and f.endswith(".mp3")]
        if not matches:
            print(f"❌ {name}: '{pat}' 원본 없음 ({src_dir})")
            continue
        src = os.path.join(src_dir, matches[0])
        out = os.path.join(OUT_DIR, f"{name}.m4a")
        write_m4a(process(load_mono(src), start, dur), out)
        kb = os.path.getsize(out) / 1024
        total += kb
        print(f"✅ {name:<6} {dur}s  {kb:5.1f}KB   ← {matches[0]}")
    print(f"\n합계 {total:.1f}KB")
    print("라이선스 고지를 assets/sfx/README.md 에 유지할 것")


if __name__ == "__main__":
    main()
