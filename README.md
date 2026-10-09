# 13억 7천만 원의 무게

초현실주의 로또 1등 당첨 시뮬레이션. 텍스트 어드벤처 + 카드 선택형(Reigns 스타일).

```bash
npm install
npm run dev
```

→ http://localhost:5180

## 게임 규칙

| 항목 | 내용 |
| --- | --- |
| 승리 | 365일 생존 |
| 패배 ① | 잔고 1억 원 미만 (파산) |
| 패배 ② | 의심도 100% (정체 발각) |
| 멘탈 100% | 게임 오버는 아니지만 **붕괴 이벤트**가 강제 발동 (충동구매·사기) |

엔딩 5종: `perfect` / `quiet` / `noisy` / `broke` / `exposed`

## 구조

```
src/
├── data/                     # 이벤트 데이터 (JSON, 총 110개)
│   ├── cast.json             # 등장인물 15명 (이름/이모지/색/설명)
│   ├── events.phase1.json    #  8 · 주말의 숨바꼭질 (창원 자취방)
│   ├── events.phase2.json    #  8 · 월요일 상경길 (창원→서대문 농협)
│   ├── events.phase3.json    #  7 · 15층 VIP실 (금융상품 권유 방어)
│   ├── events.phase4.json    # 14 · 메인 게임 코어 (소확행/대형지출/위기)
│   ├── events.phase4.extra.json # 50 · 주식 폭락, 지인의 배신, 사치품 등
│   ├── events.filler.json    # 20 · 반복 출현 가능한 일상 이벤트
│   ├── events.special.json   #  3 · 멘탈 붕괴 강제 이벤트
│   └── index.js              # 병합 + 중복 id·끊긴 링크 검증 (dev)
├── engine/
│   ├── music.js              # 절차적 BGM (무드 7종, 음원 파일 없음)
│   ├── eventGenerator.js     # 조건 필터 · 동적 가중치 · 절차적 생성기
│   └── gameReducer.js        # useReducer 상태 머신 · 엔딩 판정 · 밸런스 상수
└── components/               # HUD, 이벤트 카드, 결과 카드, 아바타, 엔딩
```

## 이벤트 스키마

```jsonc
{
  "id": "p4_porsche",
  "phase": 4,
  "category": "대형지출",        // 동적 가중치 계산에 사용
  "speaker": "dealer",           // cast.json의 키
  "title": "포르쉐 전시장",
  "description": "...",
  "weight": 2,                   // 추첨 가중치 (기본 1)
  "days": 7,                     // 소비되는 게임 내 일수 (기본 4)
  "repeatable": false,           // true면 재출현 가능
  "cond": {                      // 출현 조건 (전부 선택)
    "minDay": 30, "maxDay": null,
    "minBalance": 400000000, "maxBalance": null,
    "minMental": null, "maxMental": null,
    "minSuspicion": null, "maxSuspicion": null,
    "requireFlags": [], "forbidFlags": []
  },
  "options": [{
    "text": "계약한다. 인생은 한 번이다",
    "effect": { "balance": -148000000, "mental": -22, "suspicion": 30 },
    "flags": ["porsche"],        // 부여할 플래그
    "result": "...",             // 선택 후 보여줄 텍스트
    "special": "halfBalance",    // 잔고 비례 등 특수 처리
    "delayed": {                 // 지연 정산 (나중에 이자/손실이 온다)
      "afterDays": 30, "balance": -84000000, "mental": 20, "text": "..."
    },
    "nextEventId": "p4_next"     // 스크립트 분기 (Phase 1~3에서만 사용)
  }]
}
```

**이벤트 추가법**: 해당 JSON 파일에 객체 하나만 넣으면 끝. 코드 수정 불필요.
Phase 1~3은 `nextEventId`로 이어지는 고정 시나리오, Phase 4는 조건·가중치 기반 랜덤 풀입니다.

## 이벤트 생성기

`engine/eventGenerator.js`는 세 겹으로 동작합니다.

1. **조건 필터** — `cond`에 맞는 이벤트만 후보로.
2. **동적 가중치** — 스트레스가 높으면 사기/위기가 2.4배, 의심도가 높으면 배신/인간관계가 2.2배, 잔고가 적으면 대형지출이 0.3배로 뜹니다.
3. **절차적 생성** — 큐레이션 풀이 마르면 템플릿 × 소재 조합으로 무한 생성. `TEMPLATES`와 `SUBJECTS`에 항목을 추가하면 조합이 곱셈으로 늘어납니다.

## 밸런스

`gameReducer.js` 상단 상수로 조정합니다.

- `SUSPICION_DECAY_RATE 0.0065` — 소문은 시간이 지나면 잦아듭니다. 정액이 아니라 비율이라, 균형점이 `이벤트당 평균 상승폭 × 37.7`로 딱 떨어집니다.
- `MAX_SUSPICION_DECAY_PER_DAY 0.35` — 감소량 상한. 없으면 의심도가 높을수록 방어력도 같이 커져서 100에 영영 도달하지 않습니다.
- `VISIBILITY_PRESSURE 0.085` — 포르쉐·롤렉스처럼 티 나는 자산은 가만히 있어도 매일 의심도를 밀어올립니다.
- `DAILY_LIVING_COST 95,000` — 가만히 있어도 나가는 돈.

1,500회 자동 시뮬레이션 기준 승률:

| 플레이 성향 | 승률 | 평균 생존 |
| --- | --- | --- |
| 다 지르기 | 0% | 134일 (파산 85% / 발각 15%) |
| 아무거나 | 34% | 284일 |
| 게이지 보고 조정 | 54% | 314일 |
| 돈만 아끼기 | 100% | 완주 (단 의심도 63 → `버티긴 했다`) |
| 완전 최적화 | 100% | 완주 (`완벽한 1년`) |

## BGM

음원 파일이 없습니다. `engine/music.js`가 Web Audio로 실시간 연주합니다.
무드마다 코드 진행 / 템포 / 음색 / 리듬 패턴이 따로 있고, 상황이 바뀌면 **다음 마디 경계에서** 크로스페이드로 갈아탑니다.

| 무드 | 언제 | 느낌 |
| --- | --- | --- |
| `tense` | 수령 전 (Phase 1~2) | A단조 108BPM, 8비트 베이스 + 하이햇. 쫓기는 느낌 |
| `triumph` | 농협 15층, 입금 순간 | 리디안 96BPM, 밝은 아르페지오 + 벨 리드 |
| `daily` | 일상 · 소확행 · 가족 | 장조 84BPM, 스윙 걸린 잔잔한 패드 |
| `luxury` | 사치품 · 대형지출 · 투자 | 도리안 100BPM, 매끄러운 7화음 + 셔플 |
| `dark` | 위기 · 사기 · 배신 · 붕괴 | 프리지안 68BPM, 저역 드론. 의심도 78+ 면 무조건 이쪽 |
| `winning` / `losing` | 엔딩 | 각각 장조 / 단조 |

패턴은 16분음표 16칸 문자열입니다 (`x` 세게, `-` 약하게, `.` 쉼).
무드를 추가하려면 `MOODS`에 항목 하나만 넣고 `moodForState()`에서 매핑하면 됩니다.

음소거는 우상단 버튼이며 `localStorage`에 저장됩니다.
브라우저 자동재생 정책 때문에 오디오는 **"QR을 찍는다" 클릭 시점**에 시작됩니다.

## 조작

숫자키 `1`~`9`로 선택지 고르기, `Space` 또는 `Enter`로 진행.
