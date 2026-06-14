# My Cup ☕ — 개발 가이드 & 디자인 스펙

> 음료 레시피(당도·온도·바디) 슬라이더로 무드를 '제조'하면, 그 프로필에 맞는
> 음악 플레이리스트를 매칭해 재생·기록하는 모바일 웹앱.
> 이 문서는 **원본 디자인 스펙(`mycup_design.md`)** + **세션 중 확정한 모든 수정사항**을 정리한 것입니다.

---

## 1. 프로젝트 구조

```
mycup/
├── index.html          # 전체 화면(SCR-01~06) + 탭바 + 설정 모달
├── css/style.css       # 디자인 토큰 + 전체 스타일
├── js/
│   ├── config.js       # API 키 플레이스홀더 (커밋 금지 / 빈 값 유지)
│   └── app.js          # 전체 로직 (음료 매트릭스·API 매칭·재생·라이브러리)
├── .claude/launch.json # 프리뷰 서버(python http.server 5500)
├── README.md           # 사용자용 실행 안내
└── guide.md            # ← 이 문서
```

### 실행
```
cd mycup
python -m http.server 5500    # → http://localhost:5500
```
빌드 불필요(정적 SPA). YouTube Iframe API 때문에 `file://` 직접 열기보다 로컬 서버 권장.

> **프리뷰 패널이 "한경유레카" 파일을 보여줄 때**: 이 세션이 한경유레카 폴더에서
> 시작됐기 때문. mycup을 **독립 프로젝트로 열면**(이제 `mycup/.claude/launch.json`이
> 있으므로) 파일 트리·서버 모두 mycup 기준이 됨. 서버 주소는 항상 `localhost:5500`.

---

## 2. 디자인 토큰 (원본 `mycup_design.md` 기준)

### 컬러 (semantic)
| 역할 | 값 | 용도 |
|---|---|---|
| `--surface` | `#131411` | 기본 다크 배경 |
| `--primary` | `#ffffff` | 주 텍스트·CTA 바탕 |
| `--on-primary` | `#353028` | primary 위 텍스트 |
| `--secondary` | `#e5beb5` (rose/90) | 따뜻한 핑크·브라운 보조, 피크 하이라이트 |
| `--tertiary-container` | `#f3e56c` (yellow/90) | 재생바·진행·AI 하이라이트 |
| `--outline` | `#979087` | 테두리·구분선 |
| `--glass-line` | `rgba(151,144,135,.15)` | Smoked Glass 1px 테두리 |
| `--error` | `#ffb4ab` | 오류 |

### 타이포그래피
- **Display·Headline**: `Maru Buri` (폴백 Noto Serif KR) — 쫀쫀한 자간
- **Title·Body·Label**: `Pretendard`
- **Label/Caps**: 11px, +0.15em, 대문자 — 영수증/매거진 메타 무드

### 형태·간격
- radius: sm 4 / default 8 / md 12 / lg 16 / xl 24 / full
- spacing: 8px 기반 (xs4 base8 sm12 md24 lg40 xl64), 모바일 마진 16px
- Smoked Glass: `backdrop-blur 20–30px` + 흰색 6% 레이어 + outline 15% 1px
- 카드 16px / 버튼 pill / 앨범아트 8px

---

## 3. 화면 플로우 (SCR-01 ~ 06)

| 화면 | 내용 |
|---|---|
| **SCR-01** 스플래시 | 다크 카페 배경 + "my cup" 세리프 + "crafted with love, peace." / 터치·Enter 진입 |
| **SCR-02** 커스텀 | 슬라이더 3축 + 실시간 컵 비주얼 + CUP SIZE + Blend 버튼 (**스크롤 없이 한 화면**) |
| **SCR-03** 블렌딩 | 조제 애니메이션, 이 동안 선곡·매칭 |
| **SCR-04** 재생 | 팬톤 칩 음료 카드(영상 숨김) + 진행바 + 컨트롤 + Coming Up Next + 브루잉 영수증 |
| **SCR-05** 라이브러리 | 팬톤 칩 그리드 + ★ 고정 + 정렬 + 편집(삭제) + 전체 폭 플레이어 바 |
| **SCR-06** 저장곡 재생 | 라이브러리 카드 클릭 → ▶ 대기 상태로 진입 |

하단 탭바(GNB): **Order / Play / Library** — 하단 전체 폭 도킹(불투명 블러).

---

## 4. 핵심 로직

### 4-1. 음료 매트릭스 (슬라이더 3축 → 18종)
- 축: **당도(SWEET) · 온도(TEMP) · 바디(BODY)** — *얼음 슬라이더는 제거됨*
- `DRINKS[hot|cold][바디 3단계][당도 3단계]` = 18종
  (예: HOT·진함·당도낮음 → ☕ COFFEE / COLD·가벼움·당도낮음 → 🥝 KIWI JUICE)
- 각 음료: 이름·그래픽·고유색·무드 키워드(YouTube/iTunes 검색어) 보유
- 온도 ≤35 → 컵에 얼음 표시, 온도 ≥65 → 스팀
- 팬톤 코드: 슬라이더 값 → 3자리(각 0~9 클램프) + HOT은 ` C` / COLD는 ` U`

### 4-2. 컵 사이즈 = 플레이리스트 용량 필터 (oz당 1.25곡)
| 사이즈 | 용량 | 곡수 | 분량 |
|---|---|---|---|
| Short | 8oz | 10곡 | 약 40분 |
| **Tall (기본)** | 12oz | 15곡 | 약 60분 |
| Grande | 16oz | 20곡 | 약 80분 |
| Venti | 20oz | 25곡 | 약 95분 |

### 4-3. 선곡 → 영상 매칭 파이프라인 (★ 핵심 설계)
> **"매칭은 Gemini/iTunes, 재생은 YouTube"** — YouTube는 *검색*만 쿼터를 쓰고
> *재생(iframe)*은 무료라는 점을 이용해 검색 쿼터를 최소화.

1. **선곡**: Gemini API가 음료 프로필+곡수에 맞는 실제 발매곡 + **공식 MV videoId까지** 생성
   - 키 없음/실패 시 → iTunes Search 선곡으로 자동 폴백
   - 모델 폴백: `gemini-flash-latest → 2.5-flash → 2.0-flash` (429/404 시 다음 모델)
2. **중복 제거**:
   - 같은 곡의 다른 버전(remix/acoustic/inst/live)은 **1개만** (괄호·대시 앞 원곡 제목 기준)
   - 같은 앨범 **최대 2곡** (iTunes collectionName 기준)
3. **영상 매칭 (쿼터 최소화 순서)**:
   - ① localStorage 매칭 캐시 조회 (쿼터 0)
   - ② Gemini가 준 videoId를 **썸네일 핑으로 검증** (쿼터 0, 환각 ID 자동 탈락)
   - ③ 그래도 없는 곡만 YouTube Data API 검색 (곡당 100유닛, 최후 보조)
4. **재생**: YouTube Iframe Player API (쿼터 무료) — 풀곡 재생

### 4-4. 폴백 체인 (쿼터/크레딧 소진 시)
- YouTube 검색 403 → 선곡곡들의 **iTunes 30초 프리뷰 모드**로 재생 (30초 후 자동 다음 곡)
- 프리뷰도 불가 → 데모 큐레이션(공식 MV 음원)
- 실패 사유는 **토스트로 안내** (예: "Gemini 크레딧 소진(429)…")
- 데모 모드 진입 조건: YouTube·Gemini 키가 **둘 다** 없을 때만

### 4-5. 30초 프리뷰 = 피크(peek) 기능
- Coming Up Next 목록·라이브러리 카드에서
  **웹: 호버 0.3초 / 모바일: 롱프레스 0.35초** → 해당 곡 30초 프리뷰 잠깐 재생
- 떼면 메인 재생 복귀, 롱프레스 후 클릭(재생 진입)은 억제
- 재생 화면 팬톤 카드 롱프레스 = 현재 곡 프리뷰 (별도 유지)

### 4-6. 라이브러리 (LocalStorage)
- 저장 객체: 레시피·videoId·preview·timestamp·★·size 등 (서버 없음)
- **정렬**: ★ 켜진 카드 최상단 그룹 고정 → 그룹 내 최신순/이름순
- **편집 모드**: [편집] 버튼 → 카드 흔들림 + ✕ 삭제 배지 / 하단 [편집 완료] 버튼
  / 편집 중 카드 클릭 시 재생 진입 방지
- **NOW BREWING 바**: 탭바 위 **전체 폭** 도킹(아트·곡명·재생·다음곡)

---

## 5. API 키 & 보안

- 키는 **코드에 하드코딩 금지**. 앱 내 **⚙ 설정**에서 입력 → `localStorage`에만 저장.
- `js/config.js`는 **빈 플레이스홀더** 상태로 커밋 (`YOUTUBE_API_KEY:''`, `GEMINI_API_KEY:''`).
- **YouTube Data API v3**: GCP Console → "YouTube Data API v3" 사용 설정 → API 키
  - 곡당 검색 100유닛, Tall 1회 ≈ 1,500유닛 (기본 일일 10,000, 태평양 자정 리셋)
- **Gemini API** (선곡, 선택): [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  - 선불(prepaid) 방식 — 결제수단 미등록 시 **요금 청구 불가**, 한도 초과는 429로 멈춤
  - Gemini 키만 있어도 YouTube 키 없이 풀곡 재생 가능(재생은 쿼터 무료)
- **iTunes Search API**: 키 불필요 (JSONP 호출)

---

## 6. UI / 환경 규칙

- **아이콘은 Lucide 사용** (CDN `lucide@0.469.0`). 이모지를 UI 아이콘으로 쓰지 말 것
  — iOS 외 환경 렌더 불일치 방지. (음료 카드 *그래픽* 이모지는 일러스트 교체 전 placeholder)
  - 동적 아이콘(재생↔일시정지)은 `innerHTML` 교체 후 `lucide.createIcons()` 갱신
  - 교체 지점: `app.js`의 `icon()`/`refreshIcons()` 헬퍼
- **모바일 프레임 고정**: `.app { height: 100dvh }` — 화면별 크기 불일치 방지
- **화면 전환**: 나가는 화면 즉시 숨김 + 들어오는 화면만 페이드인(겹침 방지)
- **좁은 화면 대응**: 헤더 타이틀 말줄임, 360px 이하 미디어쿼리, 핀치줌 차단
- 정적 자원 캐시버스팅: `?v=N` (수정 시 `index.html`에서 일괄 증가)

---

## 7. 변경 이력 (세션 순서대로)

| 커밋 | 요약 |
|---|---|
| `f1b11e8` | 최초 구현 (SCR-01~06, YouTube/iTunes, LocalStorage) |
| `233aa01` | 플레이리스트를 공식 음원 곡 단위 매칭으로 변경 |
| `c8bd58e` | 컵 사이즈(용량) 필터 + Gemini 선곡 엔진 추가 |
| `45f7b36` | 재생 화면 뮤비 숨김 + 플리 생성 후 자동재생 제거 |
| `c96943f` | YouTube 쿼터 소진 시 iTunes 30초 프리뷰 모드 폴백 |
| `12b6a75` | YouTube 검색 의존 제거 — Gemini가 videoId 제공 |
| `558936e` | 모바일 프레임 고정 + 탭바 도킹 + 라이브러리 편집(삭제) |
| `9620d1e` | 화면 겹침 수정 + 편집 모드 종료 버튼 |
| `fabf368` | Order 화면 원페이지(스크롤 없이) 레이아웃 |
| `d585975` | Gemini 풀곡 매칭 성공률 보강 |
| `18939a8` | Gemini 모델 폴백 + 실패 사유 토스트 |
| `8a3e577` | 30초 프리뷰 → 피크(호버/롱프레스) 기능 |
| `e3a2616` | 플리 중복 규칙(버전 1개·앨범 2곡) + 아이콘 Lucide 전환 |
| `f452875` | 팬톤 코드 자릿수 버그 수정 |
| `a233ed3` | 라이브러리 NOW BREWING 전체 폭 플레이어 바 |

> 리포: https://github.com/mingsungme/mycup
