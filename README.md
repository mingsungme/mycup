# My Cup ☕ — Mood-to-Drink Music Player

음료 레시피(당도/얼음/온도/바디) 슬라이더로 나만의 무드를 '제조'하면,
그 프로필에 맞는 음악 플레이리스트를 매칭해 재생·기록하는 모바일 웹앱.

## 실행
빌드 불필요. 폴더에서 정적 서버 실행 후 접속:

```
cd mycup
python -m http.server 5500
# → http://localhost:5500
```

(YouTube Iframe API 때문에 `file://` 직접 열기보다 로컬 서버 권장)

## 화면 플로우
| 화면 | 내용 |
|---|---|
| SCR-01 | 온보딩 스플래시 — 터치/Enter로 진입 |
| SCR-02 | 메인 커스텀 — 4축 슬라이더 + 실시간 컵 비주얼 |
| SCR-03 | 블렌딩 로딩 — 이 동안 YouTube/iTunes 매칭 |
| SCR-04 | 재생 — 팬톤 칩 카드 + YouTube 플레이어 + 브루잉 영수증 |
| SCR-05 | 라이브러리 — 팬톤 컬러칩 그리드, ★ 최상단 고정 + 최신/이름순 정렬 |
| SCR-06 | 저장된 블렌드 재생 (라이브러리 카드 클릭) |

## 플레이리스트 매칭 로직
1. 슬라이더 3축(당도/온도/바디) 조합 → **음료 매트릭스 18종**에서 음료 프로필 결정
   (예: HOT+진함+당도낮음 = ☕ COFFEE)
2. **컵 사이즈 = 플레이리스트 용량 필터** (oz당 1.25곡)

   | 사이즈 | 용량 | 곡수 | 분량 |
   |---|---|---|---|
   | Short | 8oz | 10곡 | 약 40분 |
   | Tall (기본) | 12oz | 15곡 | 약 60분 |
   | Grande | 16oz | 20곡 | 약 80분 |
   | Venti | 20oz | 25곡 | 약 95분 |

3. **선곡 엔진**: Gemini API가 음료 프로필 + 곡수에 맞는 실제 발매곡 리스트와
   **공식 MV YouTube videoId까지 함께** 생성
   (키 없거나 실패 시 → iTunes Search 선곡으로 자동 폴백)
4. **영상 매칭 — YouTube 검색 쿼터 최소화 설계**:
   ① localStorage 매칭 캐시 조회 (쿼터 0)
   ② Gemini가 준 videoId를 썸네일 핑으로 검증 (쿼터 0, 환각 ID 자동 탈락)
   ③ 그래도 없는 곡만 YouTube Data API 검색 (곡당 100유닛, 최후 보조)
   — Gemini 키가 있으면 YouTube 검색 없이도 풀 곡 재생이 가능
   (YouTube *재생*은 Data API 쿼터를 쓰지 않음)
   (`videoCategoryId=10` 음악 카테고리 + `videoEmbeddable=true`)
5. 플리 생성 직후엔 자동재생하지 않고 ▶ 대기 (저장곡 재생도 동일)
6. 재생 화면에는 **뮤직비디오 영상 대신 음료 그래픽 카드만 표시** —
   YouTube 플레이어는 카드 뒤에서 오디오만 재생, 이퀄라이저 아이콘으로 재생 상태 표시
7. 곡이 끝나면 자동으로 다음 곡 재생, Coming Up Next에서 선택 이동 가능

## 핵심 인터랙션
- **롱프레스 하이브리드 재생**: 재생 화면의 팬톤 카드를 길게 누르면
  YouTube가 `pauseVideo()` 되고 iTunes 30초 프리뷰가 재생, 손을 떼면 YouTube 재개
- **라이브러리 저장**: 레시피 + 영상 ID + timestamp + ★ 상태를 LocalStorage에 저장 (서버 없음)
- **저장곡 재생(SCR-06)**: 자동재생 없이 ▶ 대기 상태로 진입,
  같은 무드의 음원 목록을 다시 불러와 저장곡 포함 10곡 플레이리스트 표시

## API 키 설정 (보안)
- **YouTube Data API v3**: 키를 코드에 넣지 마세요. 앱 안 **⚙ 설정**에서 입력하면
  localStorage에만 저장됩니다. (발급: GCP Console → YouTube Data API v3 사용 설정 → API 키)
  - 키가 없으면 무드별로 큐레이션된 공식 뮤직비디오 음원으로 **데모 모드** 동작
  - 할당량 참고: 곡당 검색 100유닛 → Tall 1회 ≈ 1,500유닛 (기본 일일 10,000유닛)
  - **할당량 소진(403) 시 자동 폴백**: 선곡된 곡들의 iTunes **30초 프리뷰 모드**로 전환해
    재생 지속 (영수증 SOURCE에 "iTunes 30s Preview" 표시, 30초 끝나면 자동 다음 곡).
    프리뷰도 불가하면 데모 큐레이션으로 폴백. YouTube *재생*은 할당량을 쓰지 않으므로
    저장곡·데모곡 재생은 쿼터 0이어도 정상 동작
- **Gemini API** (선곡 엔진, 선택): aistudio.google.com/apikey 에서 발급 → ⚙ 설정에 입력
  - 키가 없으면 iTunes 선곡으로 자동 폴백
- **iTunes Search API**: 키 불필요 (JSONP 호출)
- `js/config.js`에 직접 넣을 수도 있으나, 그 경우 저장소에 커밋 금지

## 기술
Vanilla HTML/CSS/JS · YouTube Data API v3 · YouTube Iframe Player API ·
iTunes Search API(JSONP) · LocalStorage · 디자인 토큰: `mycup_design.md` 기준
