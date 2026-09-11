# assets/sfx/

브루잉 효과음. 원본은 **Pixabay** 에서 받은 필드 레코딩이고,
`tools/build-sfx.py` 로 에너지 높은 구간 1.6초만 잘라 mono 24kHz AAC 로 인코딩했다.

| 파일 | 용도 | 원본 파일명 |
|---|---|---|
| `ice.m4a` | 얼음 넣기 (차가운 음료) | `freesound_community-getting-ice-36928` |
| `pour.m4a` | 물 붓기 (뜨거운 음료) | `freesound_community-water-pouring-80316` |
| `soda.m4a` | 탄산 붓기 | `freesound_community-soda-pour-72514` |

합계 53KB (원본 764KB).

## 라이선스

**Pixabay Content License** — Pixabay 의 모든 콘텐츠에 단일하게 적용된다.

- 상업적·비상업적 사용 가능, **출처 표기 의무 없음**
- 주된 제한은 **가공하지 않은 원본을 단독으로 재배포·판매**하는 것
  (스톡 사이트에 다시 올리거나 효과음 팩으로 파는 등)

여기서는 구간을 잘라내고 페이드·정규화·재인코딩한 뒤 앱에 임베드하므로 해당 제한에
걸리지 않는다.

> 파일명의 `freesound_community-` 접두사는 Pixabay 가 Freesound 출신 음원에 붙이는
> 이름 규칙이다. freesound.org 에서 직접 받은 것이 아니므로 음원별 CC 라이선스가
> 아니라 위 Pixabay 라이선스가 적용된다. **출처를 freesound.org 로 바꿔 받는 경우
> 라이선스가 달라지니 주의.**

표기 의무는 없지만, 출처를 남겨두는 편이 나중에 추적하기 좋아 위 표에 원본 파일명을
적어둔다.

## 재생성

```bash
python3 tools/build-sfx.py ~/Downloads
```

macOS 내장 `afconvert` 만 쓴다(설치 불필요). 구간·길이는 스크립트의 `CLIPS` 에 있다.
