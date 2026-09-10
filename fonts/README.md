# fonts/

## MyCup Display (`mycup-display-latin.woff2`)

배달의민족 **꾸불림체(BM Kkubulim)** 에서 라틴 글리프만 추출한 서브셋.
온보딩(SCR-01)의 아웃라인 레터링과 ✳ 모티프에 쓴다.

| | |
|---|---|
| 원본 | BM Kkubulim (OTF, 11,411 글리프, 1,635KB) |
| 서브셋 | 라틴 대소문자 + 숫자 + 기본 문장부호 + `*` (83 글리프, **16.4KB**) |
| 원저작자 | Woowa Brothers Corporation — https://www.woowahan.com |
| 라이선스 | SIL Open Font License 1.1 — [OFL.txt](OFL.txt) |

### 이름을 바꾼 이유 (중요)

원본 저작권 고지에 `BMkkubulim`이 **Reserved Font Name**으로 등록돼 있다.
OFL 1.1 3항:

> No Modified Version of the Font Software may use the Reserved Font Name(s)
> unless explicit written permission is granted by the corresponding Copyright Holder.
> This restriction only applies to the primary font name as presented to the users.

서브셋은 Modified Version에 해당하므로, 파일명·내부 name 테이블·CSS `font-family`
어디에도 원래 이름을 쓸 수 없다. 그래서 **`MyCup Display`** 로 개명했다.

- `font-family: 'MyCup Display'` — 이 이름을 바꾸지 말 것
- 원본 저작권 고지(name ID 0)는 OFL상 유지 의무가 있어 그대로 두고, 파생 사실만 덧붙였다

### 재생성 방법

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
.venv/bin/python tools/build-display-font.py <BMKkubulim.otf 경로>
```

### 원 라이선스 고지

```
Copyright © 2013, Woowa Brothers Corporation (https://www.woowahan.com),
with Reserved Font Name BM HANNA 11yrs old, BM HANNA 11yrs old OTF, BMHANNAAir_otf,
BMHANNAAir_ttf, BMHANNAPro_otf, BMHANNAPro_ttf, BM JUA_TTF, BM JUA_OTF, BM DoHyeon,
BM DoHyeon OTF, BM YEONSUNG, BM YEONSUNG OTF, BM KIRANGHAERANG, BM KIRANGHAERANG OTF,
BMEULJIRO, BMEULJIROTTF, BM EULJITO 10 YEARS LATER, BM EULJITO 10 YEARS LATER TTF,
BMEuljirooraeoraeOTF, BMkkubulimTTF, BMkkubulim.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
```

전문은 [OFL.txt](OFL.txt) 참고.
