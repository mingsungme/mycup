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

## 핵심 인터랙션
- **롱프레스 하이브리드 재생**: 재생 화면의 팬톤 카드를 길게 누르면
  YouTube가 `pauseVideo()` 되고 iTunes 30초 프리뷰가 재생, 손을 떼면 YouTube 재개
- **라이브러리 저장**: 레시피 + 영상 ID + timestamp + ★ 상태를 LocalStorage에 저장 (서버 없음)

## API 키 설정 (보안)
- **YouTube Data API v3**: 키를 코드에 넣지 마세요. 앱 안 **⚙ 설정**에서 입력하면
  localStorage에만 저장됩니다. (발급: GCP Console → YouTube Data API v3 사용 설정 → API 키)
  - 키가 없으면 큐레이션 영상으로 **데모 모드** 동작
- **iTunes Search API**: 키 불필요 (JSONP 호출)
- `js/config.js`에 직접 넣을 수도 있으나, 그 경우 저장소에 커밋 금지

## 기술
Vanilla HTML/CSS/JS · YouTube Data API v3 · YouTube Iframe Player API ·
iTunes Search API(JSONP) · LocalStorage · 디자인 토큰: `mycup_design.md` 기준
