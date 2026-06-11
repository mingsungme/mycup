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
2. 음료별 무드 검색어로 YouTube Data API 호출 —
   **공식 뮤직비디오가 존재하는 음원 10곡**을 추려 플레이리스트 구성
   (`videoCategoryId=10` 음악 카테고리 + `videoEmbeddable=true` + `maxResults=10`,
   컴필레이션/믹스 영상이 아니라 개별 공식 음원 단위)
3. 곡이 끝나면 자동으로 다음 곡 재생, Coming Up Next에서 선택 이동 가능

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
- **iTunes Search API**: 키 불필요 (JSONP 호출)
- `js/config.js`에 직접 넣을 수도 있으나, 그 경우 저장소에 커밋 금지

## 기술
Vanilla HTML/CSS/JS · YouTube Data API v3 · YouTube Iframe Player API ·
iTunes Search API(JSONP) · LocalStorage · 디자인 토큰: `mycup_design.md` 기준
