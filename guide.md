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
├── manifest.json        # PWA 매니페스트 (앱 이름·아이콘·standalone 모드)
├── sw.js                 # 설치 조건 충족용 서비스워커 (네트워크 우선, 오프라인 폴백)
├── icons/
│   ├── icon.svg          # 앱 아이콘 (favicon·PWA 아이콘 공용)
│   ├── icon-maskable.svg # 안드로이드 마스커블 아이콘
│   └── drinks/           # 음료별 일러스트 SVG (진행 중 — 아직 커피·망고 스무디 시안만, 앱에 미연결)
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
- `DRINKS[hot|cold][바디 3단계][당도 3단계]` = 18종. 각 음료는 이름·그래픽(emoji)·고유색(hex)·
  무드 서브카피·음악 무드(vibe)·YouTube/iTunes 검색어를 가짐 (정의: `js/app.js`의 `DRINKS` 상수)
- 슬라이더 값 → 구간 매핑: 0~33 LOW · 34~66 MID · 67~100 HIGH (`level3()`), 온도는 50 미만 COLD / 이상 HOT
- 온도 ≤35 → 컵에 얼음 표시, 온도 ≥65 → 스팀
- 팬톤 코드: 슬라이더 값 → 3자리(각 0~9 클램프) + HOT은 ` C` / COLD는 ` U`

| 온도 | 바디 | 당도 | 음료 | 컬러 | 무드 | 음악 장르(vibe) |
|---|---|---|---|---|---|---|
| HOT | Light | Low | 🌿 GREEN TEA | `#9caf6f` | CALM · ZEN · LEAF BLEND | warm acoustic |
| HOT | Light | Mid | 🌼 CHAMOMILE | `#d9c47a` | SOFT · FLORAL · EVENING BLEND | warm acoustic |
| HOT | Light | High | 🍯 HONEY YUZU TEA | `#e0a83e` | SWEET · CITRUS · WARM BLEND | warm acoustic |
| HOT | Medium | Low | 🍵 MATCHA LATTE | `#88a764` | EARTHY · SMOOTH · GREEN BLEND | chill lofi beats |
| HOT | Medium | Mid | 🫖 CHAI LATTE | `#b07b4a` | SPICED · COZY · MILK BLEND | cozy jazz |
| HOT | Medium | High | 🍮 CARAMEL LATTE | `#c98e4f` | SWEET · BUTTERY · COZY BLEND | warm acoustic |
| HOT | Heavy | Low | ☕ COFFEE | `#3f2d22` | INTENSE · DARK · ROASTED BLEND | cozy jazz |
| HOT | Heavy | Mid | 🥛 FLAT WHITE | `#a07852` | SMOOTH · VELVET · MILK BLEND | cozy jazz |
| HOT | Heavy | High | 🍫 HOT CHOCOLATE | `#6e4a33` | SWEET · RICH · COCOA BLEND | cozy jazz |
| COLD | Light | Low | 🥝 KIWI JUICE | `#9bbf3b` | TANGY · GREEN · FRESH BLEND | fresh indie pop |
| COLD | Light | Mid | 🍋 LEMONADE | `#dede8d` | ZESTY · SPARKLING · SUMMER BLEND | fresh indie pop |
| COLD | Light | High | 🍊 ORANGE JUICE | `#f5a637` | BRIGHT · CITRUS · MORNING BLEND | fresh indie pop |
| COLD | Medium | Low | 🥬 GREEN JUICE | `#4f8f46` | CLEAN · CRISP · DETOX BLEND | fresh indie pop |
| COLD | Medium | Mid | 🍑 PEACH ICED TEA | `#e8a06a` | BREEZY · FRUITY · AFTERNOON BLEND | fresh indie pop |
| COLD | Medium | High | 🥭 MANGO SMOOTHIE | `#f3b04e` | TROPICAL · SWEET · SUNNY BLEND | fresh indie pop |
| COLD | Heavy | Low | 🧊 COLD BREW | `#3a2a20` | BOLD · SLOW · DARK BLEND | chill lofi beats |
| COLD | Heavy | Mid | 🥤 ICED LATTE | `#b9986e` | CHILL · SMOOTH · STUDY BLEND | chill lofi beats |
| COLD | Heavy | High | 🫐 BERRY SMOOTHIE | `#a64d79` | SWEET · BERRY · VELVET BLEND | chill lofi beats |

> 음악 무드(vibe) 4종(`cozy jazz` / `warm acoustic` / `chill lofi beats` / `fresh indie pop`)은
> Gemini 프롬프트의 장르 힌트이자, 데모 모드(API 키 없음)에서 쓰는 `DEMO_SETS`의 키이기도 함 — 새 음료를
> 추가할 때 vibe를 기존 4종 중 하나로 맞추거나, `DEMO_SETS`에 새 세트를 함께 추가해야 데모 모드가 깨지지 않음.

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
- **Coming Up Next 목록에서만** — 카드(라이브러리 그리드 타일)를 눌러 재생 화면에 들어간 뒤,
  그 안의 각 곡 항목을 **웹: 호버 0.3초 / 모바일: 롱프레스 0.35초** → 해당 곡 30초 프리뷰 잠깐 재생
- 라이브러리 그리드 카드 자체는 호버 프리뷰 없음 — 클릭하면 바로 재생 화면(SCR-06)으로 진입
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

### 6-1. 데스크톱 반응형(와이드 레이아웃)
- 기본은 폰 프레임(`max-width: 430px`, 480px 이상에서 카드처럼 중앙 도킹)
- **900px 이상이면 화면 구분 없이 항상 `.app`이 넓어짐**(`max-width: 860px`, 순수 미디어쿼리 —
  화면별 JS 토글 없음. 화면 전환할 때마다 폭이 늘었다 줄었다 덜컹거리는 걸 막기 위해 이 방식으로 통일함)
  - Order(SCR-02): `.order-row`가 2컬럼 — 왼쪽 `.order-main`(컵 비주얼·슬라이더), 오른쪽
    `.order-side`(CUP SIZE·Blend 버튼)
  - Play(SCR-04/06): `.play-main`(팬톤 카드·컨트롤) / `.play-side`(Coming Up Next·영수증) 2컬럼
  - Library(SCR-05): `.lib-grid`가 `auto-fill`로 컬럼 수 자동 증가
  - Splash(SCR-01)·Loading(SCR-03): 2컬럼 없이 **내용만 계속 430px 폭으로 중앙 고정**
    (`splash-inner`/`scr-loading`에 `max-width:430px; margin:0 auto` 상시 적용 — 프레임은 넓어져도
    로고·문구가 화면 양끝으로 벌어지지 않게)
  - 위 `-main`/`-side`/`-row` wrapper들은 모바일에서 `display:contents`라 레이아웃에 관여하지 않고
    원래대로 세로 스택
  - `.tabbar`는 와이드에서도 폰 폭(380px)으로 고정 + 중앙 정렬 — 안 그러면 900px대에서 탭 3개가
    지나치게 멀어짐 (실제로 겪은 버그, 고정폭 처리로 해결)

### 6-2. 설치(PWA)
- `manifest.json`(standalone·아이콘) + `sw.js`(서비스워커) + 스플래시 화면의 **"앱처럼 설치하기"** 버튼(`#btn-install`)
- `beforeinstallprompt` 이벤트로 설치 가능 여부 판단 → 지원 브라우저(Chrome/Edge 등)에서만 버튼 노출,
  이미 설치됐거나 미지원이면 자동 숨김. iOS Safari는 API가 없어 "공유 → 홈 화면에 추가" 안내 토스트로 대체
- `sw.js`는 **네트워크 우선**(온라인이면 항상 최신 파일, 오프라인일 때만 캐시 폴백) — 캐시 우선으로
  하면 개발 중 수정사항이 반영 안 되는 문제가 있었음(실제로 겪음, `?v=N` 캐시버스팅과는 별개 이슈)
- 아이콘: `icons/icon.svg`(favicon 겸용) / `icons/icon-maskable.svg`(안드로이드 마스커블)

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
| `ec340d6` | PWA 설치 지원(manifest.json/sw.js/설치 버튼) |
| `139a89f` | 데스크톱 와이드 반응형 통일(전 화면 900px+) + 라이브러리 카드 호버 프리뷰 제거 |
| `74f2d39` | 호버 프리뷰 오디오 자동재생 정책 대응(1차 시도, 근본 원인은 아니었음) |
| `4230880` | 모바일 실기기 버그 4종(슬라이더 길이, 삼성인터넷 설치안내, 탭바 fixed, **iTunes 프리뷰 URL 백그라운드 보강 — 이게 진짜 원인**) |
| `19bb7d5` | 피크 프리뷰 볼륨 페이드 인/아웃 |
| `75c487c` | 데스크톱용 임시 호버 상태(`@media (hover:hover)`) |

> 리포: https://github.com/mingsungme/mycup
> GitHub Pages 배포: https://mingsungme.github.io/mycup/ (main push마다 1분 내 자동 갱신, 서비스워커 네트워크 우선이라 재설치 불필요)
> PRD(구글시트): https://docs.google.com/spreadsheets/d/1WsYZPGm14hrrMLUcVa_Uavlmv3VonhwXoFW_ELoX-fI/edit
> 슬라이드 덱(포트폴리오): [deck-guide.md](deck-guide.md) 참고

---

## 8. 알려진 이슈 / TODO

- **모바일 백그라운드(잠금화면) 재생 안 됨** — YouTube iframe은 모바일 브라우저가 화면 잠기거나 탭이
  백그라운드로 가면 강제 일시정지시킴. 진짜 뮤직플레이어처럼 만들려면 Media Session API 연동이 필요하고,
  YouTube 임베드는 플랫폼 자체 제약으로 완전 해결 안 될 수 있음 — 아직 미착수
- **음료 그래픽 에셋(18종)** — 소싱 방식 미정(일러스트는 제외하기로 함, 스톡/생성형 검토 중). placeholder
  자리는 잡아둠(`icons/drinks/`는 삭제됨 — 이전 벡터 시안 폐기). 필요한 크기는 **9-1** 참고
- **파비콘/PWA 아이콘 최종본** — 지금 `icons/icon.svg`는 배경 있는 임시 버전. 배경 없는 버전
  `icons/icon-transparent.svg`는 만들어뒀으나 투명 PNG 변환은 실패(브라우저 canvas→base64 데이터가
  너무 길어서 수동 전달 중 깨짐) — 직접 Figma나 다른 툴에서 SVG→PNG 내보내기 필요. 필요한 크기는 **9-2** 참고
- **공유용 이미지(OG)** — 카톡/트위터 공유 미리보기용, 보류 상태. `index.html`에 관련 메타태그 없음. 규격은 **9-3** 참고
- **라이트 모드** — 필요 여부 미정 (지금 다크 전용)
- **버튼 호버 상태** — `css/style.css` 맨 아래 `@media (hover: hover)` 블록에 임시로 채워둠,
  Figma 디자인 확정되면 교체 예정
- **디자인 전면 리뉴얼** — Figma에서 진행 중. 토큰은 `mycup-tokens.csv`(Figma Variables 임포트용,
  루트에 있음)로 전달함. 화면은 Figma 크롬 플러그인으로 직접 임포트해서 작업 예정, 끝나면 CSS로 반영
- **다음 단계 로드맵(계획)**: 디자인 리뉴얼(Figma→CSS 반영) 끝나면 순서대로
  1) 그래픽 에셋 — 음료 18종 이미지 + 파비콘 PNG + OG 이미지 (**전체 크기 리스트는 9번**)
  2) 모션 — 지금은 CSS 애니메이션(steam, wiggle, eq-bounce) 정도만 있음, 별도 모션 디자인 패스 예정
  3) 소리 — UI 사운드 이펙트 등, 아직 범위 미정

---

## 9. 그래픽 에셋 규격

렌더 크기는 전부 `.app` 최대폭 **430px** 기준 CSS px 실측값이고, 내보내기 크기는 @3x 올림값이다.
데스크톱 와이드(≥900px)는 컬럼이 380/140px로 오히려 좁아지므로 모바일 값이 항상 최대치다.

### 9-1. 음료 그래픽 18종 (최우선)

같은 음료가 3군데에서 서로 다른 비율로 쓰인다. 18종 목록은 4-1의 `DRINKS` 매트릭스 참고.

| 쓰이는 곳 | 클래스 | 비율 | 최대 렌더 | 내보내기(@3x) |
|---|---|---|---|---|
| 재생 화면 카드 | `.pantone-media` | 16:10 | 374 × 234 | **1200 × 750** |
| 라이브러리 카드 | `.lib-swatch` | 1:0.86 | 177 × 152 | **600 × 516** |
| 미니 플레이어 | `.mini-art` | 1:1 | 52 × 52 | **160 × 160** |

계산 근거: 430 − 32(`--margin-m` 좌우) = 398 → 재생은 카드 패딩 12×2 빼서 374,
라이브러리는 2열 gap 12 나눠 193 − 패딩 8×2 = 177.

- **워크플로**: 음료당 마스터 1장(정사각 2048×2048, 피사체를 중앙 1400×1200 세이프에어리어 안에)을
  만들고 위 3종을 크롭으로 뽑는다. 18종 × 3 = 54장.
- **포맷**: WebP 주력 + PNG 폴백(`<picture>`). 투명 배경이 아니면 배경은 `#efece4`(라이브러리) /
  `#ddd`(재생) 계열에 맞춘다.
- **용량**: 라이브러리 그리드는 18장이 한 번에 뜨므로 600×516 한 장당 **40KB 이하**.

### 9-2. 파비콘 / PWA 아이콘 PNG

지금 `icons/`에는 SVG 3종뿐이고 `manifest.json`도 `sizes: "any"`로만 걸려 있어서
iOS·구형 안드로이드에서 아이콘이 안 잡힌다. 원본 viewBox가 512라 배율 그대로 내보내면 된다.

| 용도 | 크기 | 소스 | 비고 |
|---|---|---|---|
| favicon.ico | 16 / 32 / 48 멀티 | `icon.svg` | 구형 브라우저·북마크 |
| favicon PNG | 32 × 32, 16 × 16 | `icon.svg` | |
| **apple-touch-icon** | **180 × 180** | `icon.svg` | 알파 금지, `#131411` 배경 구워넣기. 지금 `index.html`이 SVG를 가리키는데 iOS는 SVG를 못 읽음 |
| PWA any | 192 × 192, 512 × 512 | `icon.svg` | 매니페스트 필수 |
| PWA maskable | 192 × 192, 512 × 512 | `icon-maskable.svg` | 콘텐츠는 중앙 80% 안(512 기준 안전지름 409px, 192 기준 154px) |
| 안드로이드 레거시 | 144 × 144, 384 × 384 | | 선택 |
| Windows 타일 | 270 × 270 | | 선택 |

`icon-transparent.svg`의 투명 PNG 변환 실패(8번 참고)는 브라우저 canvas 대신
Figma나 `rsvg-convert`/`sharp`로 내보내면 해결된다.

### 9-3. 공유용 OG 이미지

앱(`index.html`)과 포트폴리오(`portfolio/index.html`) 둘 다 아직 없음.

| 용도 | 크기 | 비고 |
|---|---|---|
| og:image (앱) | **1200 × 630** | 1.91:1, 300KB 이하. 트위터 `summary_large_image`·디스코드 겸용 |
| og:image (포트폴리오) | **1200 × 630** | 앱과 별도 1장 |
| 카카오톡 | 1200 × 630 그대로 | 좌우가 잘릴 수 있어 텍스트는 중앙 1000 × 420 안에 |
| 2x | 2400 × 1260 | 고DPI 미리보기용, 선택 |

### 9-4. 앱 스크린샷

| 용도 | 크기 | 비고 |
|---|---|---|
| 포트폴리오 목업 | 1290 × 2796 | `portfolio/index.html`의 `.pocframe`이 390:780이라 iPhone 6.7" 스샷이 그대로 맞음 |
| 매니페스트 `screenshots` (narrow) | 1080 × 1920 | Chrome 리치 설치 UI, 선택 |
| 매니페스트 `screenshots` (wide) | 1920 × 1080 | 데스크톱 와이드 레이아웃, 선택 |

### 9-5. iOS 스플래시 (우선순위 낮음)

`display: standalone`이라 iOS는 매니페스트 아이콘으로 스플래시를 못 만들고
`apple-touch-startup-image`를 기기별로 전부 요구한다. 주요 기종만 세로 기준
1320×2868 / 1290×2796 / 1206×2622 / 1179×2556 / 1170×2532 / 1125×2436 / 1080×2340 /
828×1792 / 750×1334 … 로 10종이 넘으므로, 다른 게 끝난 뒤 스크립트로 일괄 생성한다.

### 9-6. 착수 순서

1. **9-2 아이콘 PNG** — 소스가 이미 있어서 반나절
2. **9-3 OG** — 1~2장
3. **9-1 음료 18종** — 소싱 방식(스톡/생성형) 결정이 선행되어야 함
4. 9-4 → 9-5
