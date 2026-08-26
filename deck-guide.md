# My Cup — 포트폴리오 슬라이드 가이드

> UX/UI 포트폴리오용 Figma Slides 덱의 디자인 규칙. Papertory 팀 덱(구조만 참고, 톤은 제외)을
> 벤치마킹해서 정한 것들 — 다음에 슬라이드를 추가/수정할 때 이 문서 기준으로 맞추면 됨.

- Figma 파일: https://www.figma.com/slides/GXTWM6T5kLhDiccLGVlaIv (**Pro 팀 드래프트에 임시로 있음** —
  개인 드래프트(Starter)는 MCP 툴 호출 한도 걸려서 잠시 옮김. 파일 "이동" 기능은 없어서 재생성한 것.
  개인 드래프트 구버전: https://www.figma.com/slides/ivMFSW6FJ2jVTD7fiKUS0D (구조 낡음, 참고용으로만 남겨둠)
  → 작업 마무리되면 개인 드래프트에 다시 재생성해서 옮길 예정 (자동화 없음, 수동으로 진행)
- 캔버스: **1920 × 1080** (Figma Slides 기본값, 슬라이드 노드는 resize 불가 — 기본 크기 그대로 사용)

---

## 1. 컬러 팔레트 (mycup 앱 토큰 그대로, Figma 0–1 range)

| 역할 | HEX | RGB(0–1) |
|---|---|---|
| bg (surface) | `#131411` | `{0.0745, 0.0784, 0.0667}` |
| bgLow | `#0e0e0c` | `{0.0549, 0.0549, 0.0471}` |
| card | `#20201d` | `{0.1255, 0.1255, 0.1137}` |
| cardHigh | `#2a2a27` | `{0.1647, 0.1647, 0.1529}` |
| onSurface | `#e5e2dd` | `{0.898, 0.886, 0.867}` |
| onSurfaceVar | `#cec5bc` | `{0.808, 0.773, 0.737}` |
| secondary (rose) | `#e5beb5` | `{0.898, 0.745, 0.710}` |
| tertiary (yellow) | `#f3e56c` | `{0.953, 0.898, 0.424}` |
| outline | `#979087` | `{0.592, 0.565, 0.529}` |

다크 전용 — 앱과 동일하게 라이트 배경 안 씀. body 텍스트는 항상 onSurface/onSurfaceVar(고대비), secondary/tertiary는
라벨·강조·모티프 색으로만.

## 2. 타이포그래피

- **Display/Headline**: `Noto Serif KR` Bold — 앱의 MaruBuri 폴백과 동일 (MaruBuri/Pretendard는 Figma
  폰트 목록에 없음, `listAvailableFontsAsync()`로 확인함)
- **Body/Label**: `Noto Sans KR` — Regular/Medium/Bold
- 스케일: 헤드라인 44–84px bold, 서브카피 16–20px regular, eyebrow 라벨 13–14px bold + letterSpacing 12–14%
- 헤드라인은 슬라이드에서 가장 큰 요소여야 함 — 본문과 확실한 크기 차이

## 3. 시그니처 모티프 — 팬톤 칩

앱의 "팬톤 칩" 그래픽(색상 + 이름 + 코드, 예: `CHAI LATTE / 555 C`)을 덱 전체의 반복 모티프로 사용.
- 작게: eyebrow 옆이나 카드 안 배지로
- 크게: 표지처럼 여러 개를 겹쳐서 **키비주얼**로 (캔버스 가장자리 밖으로 bleed, 살짝 회전(-10~12°)으로 유기적 느낌)
- 색상은 실제 `js/app.js`의 `DRINKS` 데이터 hex를 그대로 씀 (지어내지 않음)

## 4. 컴포지션 원칙 (Papertory 참고 후 확정)

Papertory 덱을 보고 확인한 것: 작은 반복 요소(배지·태그)는 오토레이아웃, 큰 콘텐츠 레이아웃은 절대좌표로
자유롭게 구성(오토레이아웃 강제 X). 그리고 아래 원칙을 지킬 것 —

- **같은 구조 반복 금지**: "eyebrow + headline + 카드그리드" 템플릿을 매 장 복붙하지 않기. 슬라이드마다
  콘텐츠 목적에 맞게 구조를 다르게 (조용한 슬라이드는 큰 타이포+여백만, 매트릭스는 그리드, 플로우는 스텝형 등)
  → 실패 사례: 초안 v1은 6장이 전부 동일 구조라 "구리다"는 피드백 받음
- **비대칭**: 50/50 대신 70/30 같은 불균형 분할. 앵커 포인트(왼쪽/오른쪽/중앙/코너)를 슬라이드마다 다르게
- **엣지까지 밀기**: 캔버스 가운데 균등 여백으로 다 몰아넣지 말고, 색면·도형이 가장자리 밖으로 bleed
- **강약 조절**: 6개 항목이 있어도 다 똑같은 크기로 나열하지 말고 1~2개는 강조(더 크게, accent 테두리)
- **여백도 선택**: 조용한 슬라이드(예: Concept)는 확실히 비우고, 밀도 있는 슬라이드(예: Flow, Drink Logic)는
  확실히 채우기 — 애매하게 반쯤 채우지 않기

## 5. 재사용 컴포넌트

### Eyebrow 배지 (오토레이아웃)
```js
frame.layoutMode = 'HORIZONTAL';
frame.primaryAxisSizingMode = 'AUTO';
frame.counterAxisSizingMode = 'AUTO';
frame.paddingLeft = frame.paddingRight = 20;
frame.paddingTop = frame.paddingBottom = 12;
frame.cornerRadius = 999;
// stroke: outline 1px, text: Noto Sans KR Bold 13px, secondary color, letterSpacing 12%
```
텍스트 길이가 바뀌어도 배지 폭이 자동으로 맞춰짐(HUG) — 수동으로 폭 계산 안 해도 됨.

### 카드 (절대좌표 + 내부 자유 배치)
`card` 색 배경, cornerRadius 12–16px, `strokes: {r:1,g:1,b:1,a:0.08}` 1px 테두리. 강조 카드는
`cardHigh` 배경 + `secondary` 1.5px 테두리.

## 6. 이미지 에셋 규격 (소싱 방식은 미정 — placeholder만)

| 용도 | 비율 | 앱 기준 | 내보내기 |
|---|---|---|---|
| 라이브러리 카드 | 1 : 0.86 | `css/style.css`의 `.lib-swatch` | 600 × 516 |
| 재생 화면 카드 | 16 : 10 | `css/style.css`의 `.pantone-media` | 1200 × 750 |

덱 9번 슬라이드의 플레이스홀더도 앱과 같은 비율이므로, 위 파일을 그대로 넣으면 된다.
슬라이드 캔버스는 1920 × 1080이라 1200 × 750을 넣어도 업스케일 없이 화면 절반 이상을 채운다.

앱 전체 에셋(음료 18종 3종 크롭 · 파비콘/PWA 아이콘 · OG · 스크린샷)의 크기 리스트는
[guide.md](guide.md)의 **9. 그래픽 에셋 규격**에 정리되어 있음.

일러스트 vs 스톡 이미지 vs 생성형 AI 중 어떤 방식으로 채울지는 아직 결정 안 됨 — 결정되면 이 섹션 갱신.

## 7. 슬라이드 현황 (Pro 드래프트 기준, 9장 전부 완료)

| # | 이름 | 구성 |
|---|---|---|
| 1 | Cover | 팬톤 칩 클러스터 키비주얼(플랫 컬러, 이미지 아직 아님), 워드마크 좌측 정렬 |
| 2 | Overview | 서비스명 + 3줄 스펙(개발기간/제약/핵심루프), PRD 기반 |
| 3 | Motivation | 카피 확정본(아래 8번 참고), 풀-쿼트 스타일 큰 타이포 |
| 4 | Concept | 큰 타이포 중심, 여백 많음, 작은 플로우 다이어그램은 우하단 구석에만 |
| 5 | Flow | 6단계 스텝, 01/06 강조(더 큰 카드 + secondary 테두리) |
| 6 | Drink Logic | 3×3 매트릭스가 캔버스 우측 대부분 차지, 헤드라인은 좌측 압축 |
| 7 | Design System | 컬러 스와치 5개가 우측 엣지까지 꽉 참(bleed), 헤드라인은 하단좌측 |
| 8 | Features | "살짝 미리듣기"를 히어로 카드로, 나머지 3개는 우측에 조용히 리스트(70/30 비대칭) |
| 9 | Graphic Assets | 이미지 플레이스홀더(broken-image 아이콘) + 실제 앱 규격(1:0.86, 16:10) |

**남은 것**: 음료 일러스트/이미지 소싱 방식 결정(일러스트 제외, 스톡/생성형 검토 중), 개인 드래프트로 재생성.

## 8. Overview / Motivation 확정 카피 (PRD 기반)

PRD(구글시트): https://docs.google.com/spreadsheets/d/1WsYZPGm14hrrMLUcVa_Uavlmv3VonhwXoFW_ELoX-fI/edit
— "1 개요" 시트에 서비스명/목적/개발스코프, "2 디자인 시스템"에 타이포/컬러, "3 기능 정의" 이하 상세 기술 스펙.
**컬러 토큰만 실제 구현과 다름**(PRD 원안: primary `#7EA04D` 말차그린 / secondary `#FDD5BD` — 개발 중 지금의
`--secondary #E5BEB5` 등으로 변경됨). 슬라이더도 원래 4개(당도·**얼음**·온도·바디)였다가 3개로 단순화(이미
guide.md에 기록됨). 그 외(YouTube+iTunes 하이브리드, LocalStorage, ★ 정렬, 롱프레스 프리뷰, 무가입 UUID
클라이언트)는 실제 구현과 PRD가 대부분 일치.

**Overview**
- 서비스명: My Cup — Mood-to-Drink Music Player
- 개발 기간: 3시간 타임어택 — 개인 스피드 코딩 챌린지
- 제약 조건: 외부 DB 없이, 로컬스토리지 아카이빙만으로
- 핵심 루프: 커스텀 슬라이더 → YouTube+iTunes API 매칭 → 로컬 아카이빙

**Motivation** (여러 버전 시도 후 확정 — 특정 개인 일화(커피/유자차)는 빼고 누구나 자기 기분을 대입할 수
있게 일반화함. 타겟은 "카페 무드·인스타 감성을 즐기는 사람들"과 겹침)
> 지금 기분, 어떤 음료에 가까울까
>
> 당도, 온도, 바디 — 기분을 음료 레시피로 옮기면, 그 음료에 어울리는 플레이리스트가 완성된다.

캡션: "카페 무드·인스타 감성을 즐기는 사람들을 위한 사이드 프로젝트"
