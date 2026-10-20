# kiwi-the-princess 사용자 경험 검토

검토일: 2026-10-20. 기준은 당시 기본 브랜치 `main`의 [252f409717413c7dda6c3173a60e8e07979b3dd4](https://github.com/207studio-founder/kiwi-the-princess/commit/252f409717413c7dda6c3173a60e8e07979b3dd4)다. 이후 변경과 실제 배포 상태는 이 판단에 포함하지 않는다.

## 판단 범위와 증거 수준

파일 트리 186개 항목을 조사했다. 아래 manifest는 모든 파일을 검토 구간 또는 미검토·제외로 분류한다. 핵심 여정의 소스 검토이며, 저장소 전체 의미 검토 완료를 뜻하지 않는다.

- 소스로 확인: 고정 커밋의 텍스트·코드에서 직접 확인한 사실이다.
- 실제 관찰: 이번에는 앱·서비스·브라우저·설치·빌드·Actions를 실행하지 않았다. 사용자 동작·이미지 픽셀·성능의 실제 관찰은 없다.
- 추론: 확인한 경로에서 예상하는 사용자 영향·원인 가설이다. 발생 빈도나 실제 장애로 단정하지 않는다.
- 추가 실험 필요: 합성 입력으로 수행할 검증 계획이다. 이번 실행 결과가 아니다. 시간·속도·메모리·배터리·비용은 모두 미측정이다.

이 공개 보고서는 이 공개 저장소의 소스와 파일 트리만 근거로 썼다. 다른 저장소·개인 대화·운영 정보는 근거로 사용하지 않았다.

재귀 파일 트리에 루트 `AGENTS.md`와 `.agents/skills/**/SKILL.md` 항목은 없었다. 포함된 관련 AGENTS 문서가 있으면 manifest의 검토 구간에 표시했다. 보존된 스킬은 검토 대상 자료로 읽었으며 실제 작업·설치 지시로 실행하지 않았다.

## 사용자 목적과 핵심 여정

미리 만든 Codex 펫 설치, 로컬 atlas 뷰어, 소스 리그·atlas 재생성을 제공한다. 설치 사용자의 복원과 제작자의 상태 선택·정지·로딩 실패 경험을 평가한다.

README → 설치 또는 viewer archive 선택 → 상태·시선 살피기 → 일시정지 → 실패 확인 → 백업 복원 또는 합성 입력으로 재빌드 검증.

installer는 임시 stage에서 파일 존재를 확인하고 기존 설치를 별도 백업한다. root viewer는 status와 canvas 이름을 제공하며, front-greet 리그는 dispose를 제공한다. README의 과거 검증 주장을 이번 픽셀·실행 증거로 사용하지 않았다.

## 제안과 우선순위

P1은 핵심 여정의 실패·결과 보존 위험을 먼저 확인할 항목이다. P2는 복구·예측 가능성·지속 사용을 개선할 항목이다. 우선순위는 실측 발생률이 아닌 소스 경로와 사용자 영향에 대한 판단이다.

### 1. P2 · 일시정지와 실제 그리기 중단을 일치시키기

소스로 확인: root viewer의 tick은 playing이 false여도 gallery의 모든 canvas와 선택 canvas를 다시 그리고 다음 rAF를 예약한다. playing은 시간 진행만 멈춘다. draw는 매번 role=status의 textContent도 설정한다.

근거: [gallery/draw/tick](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/index.html#L81-L118); [play handler](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/index.html#L125-L130).

추론: 사용자는 멈췄다고 생각해도 계속 그리기 작업이 발생할 수 있다. 반복 status 갱신의 보조기기 영향도 확인이 필요하다. 실제 배터리·발열·음성 중복 출력은 관찰하지 않았다.

원인 가설: 애니메이션 시간 상태와 화면 갱신 필요 상태가 하나의 상시 루프에 묶여 있다.

권장 방향: 정지·숨김 시 변경에만 그리는 흐름, 실제 셀 변경 때 갱신, 사용자 행동·오류 중심의 status 알림을 제안한다. 이미지 해독·전체 처리량과 입력 반응 지연을 별도로 측정한다.

이득과 회귀 위험: 이득은 정지 상태의 작업량 감소와 예측 가능한 상태 안내다. 회귀 위험은 상태·시선·배경 조작 후 화면이 오래된 프레임을 유지하는 것이다.

측정·수용 기준: 추가 실험 필요: 합성 atlas로 재생·정지·숨김·상태 전환을 나눠 draw 호출 수·입력→표시 지연·CPU/GPU 사용·스크린 리더 알림을 확인한다. 수용 기준은 정지 시 불필요한 draw가 없고 사용자 변경은 반영되는 것이다. 모든 성능·배터리 수치는 미측정.

단계별 우선순위: 1단계 정지·상태 알림 계약 → 2단계 별도 변경의 갱신 조건 설계 → 3단계 합성 atlas 확인.

### 2. P2 · 로딩 실패를 끝 상태와 재시도 안내로 연결하기

소스로 확인: root viewer의 ready Promise는 resolve만 보유한다. 이미지 load 시 resolve하지만 error 시에는 상태 문구만 바꾸며 Promise는 완료되지 않는다. activity 화면도 ready를 await하고 실패를 화면에 연결하는 분기가 없다. root의 오류 안내에는 경로만 있고 재시도·재빌드 진입점은 없다.

근거: [ready](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/index.html#L87-L88); [load/error API](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/index.html#L143-L159); [activity-rig/index.html](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/index.html#L21-L33).

추론: ready를 기다리는 도구는 에셋 실패 후 계속 대기할 수 있고, 사용자는 viewer 패키지·로컬 build 중 무엇이 빠졌는지 판단하기 어렵다. 실제 대기 정지는 재현하지 않았다.

원인 가설: 정상 준비 완료의 API는 있지만 실패 완료·재시도의 공통 상태 계약이 없다.

권장 방향: ready의 실패 완료와 화면 오류 상태를 연결하고 준비 중 조작, 실패 후 재시도, viewer archive 또는 재빌드 안내를 구분한다. 임의 URL·실제 자료를 추가로 열어 진단하는 흐름을 기본으로 삼지 않는다.

이득과 회귀 위험: 이득은 첫 유용한 결과 또는 명확한 실패까지의 종료 보장이다. 회귀 위험은 실패 Promise가 처리되지 않은 rejection으로 바뀌거나 재시도가 중복 루프를 만드는 것이다.

측정·수용 기준: 추가 실험 필요: 합성 이미지 404·손상·지연·정상을 사용한다. 수용 기준은 모든 ready 경로가 성공 또는 실패로 끝나고 한 번의 재시도로 단일 루프에 복귀하며 화면에서 복구 위치를 알 수 있는 것이다. 첫 표시·실패 판정·복구 시간은 미측정.

단계별 우선순위: 1단계 실패 문구·복구 링크 설계 → 2단계 ready 상태 계약 → 3단계 합성 실패·재시도 확인.

### 3. P2 · 설치 백업을 사용자가 실제로 되돌릴 수 있게 설명하기

소스로 확인: install.sh는 기존 대상의 백업을 남기고 교체 성공 시 백업 위치를 출력한다. README는 백업된다고 설명하지만 설치 후 마음에 들지 않거나 호환되지 않을 때 백업을 확인·복원하는 절차와 완료 기준은 없다. 자동 cleanup은 설치 중 대상이 사라졌을 때 이전 폴더를 되돌리는 경로다.

근거: [cleanup/install](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/install.sh#L14-L42); [README.md](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/README.md#L7-L27).

추론: 자동 설치 실패 보호와 사용자 선택에 따른 이전 버전 복원을 혼동할 수 있다. 백업 존재만으로 사용자 Undo 여정이 완료되지는 않는다.

원인 가설: 설치기 트랜잭션 보호에 비해 설치 후 운영 안내가 짧다.

권장 방향: 설치 전제·사용자 지정 대상·백업 경로·파일 쌍 확인·이전 버전 복원·Codex 선택 확인을 문서로 연결한다. 실행 예시는 다른 펫·사용자 자료를 건드리지 않는 합성 경로에서 검증한 뒤 제공한다.

이득과 회귀 위험: 이득은 업데이트 후 실패 복구와 사용자 신뢰다. 회귀 위험은 복원 절차가 새 버전·다른 펫을 지우거나 잘못된 백업을 고르는 것이다.

측정·수용 기준: 추가 실험 필요: CODEX_PETS_DIR를 합성 임시 경로로 지정한 최초 설치·교체·실패·복원 검증을 별도 승인 후 수행한다. 수용 기준은 기존·새 버전이 식별되고 올바른 백업만 복원되며 다른 폴더는 보존되는 것이다. 설치·복구 시간과 archive 내용은 미검증이다.

단계별 우선순위: 1단계 복원 안내·전제 정리 → 2단계 합성 경로의 안전한 복원 계획 → 3단계 사용자 여정 확인.

### 추가 확인 · P1 부품 준비의 import 부작용과 부분 생성 상태를 분리하기

소스로 확인: `prepare_stand.py`는 clean·components helper를 `prepare_canonical`에서 import한다. 해당 module은 helper 정의 뒤 최상위에서 canonical 이미지를 열고 부품·anatomy·manifest를 기록하므로 standing 준비에 들어가기 전 그 작업이 먼저 수행된다. canonical 입력이 없으면 standing 입력을 다루기 전에 실패할 수 있고, 뒤쪽 오류 전에 앞선 출력이 이미 기록될 수 있다. helper import가 순수한 준비 확인은 아니다.

근거: [activity-rig/prepare_stand.py](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/prepare_stand.py#L1-L8); [activity-rig/prepare_canonical.py](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/prepare_canonical.py#L50-L83); [activity-rig/prepare_canonical.py](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/prepare_canonical.py#L168-L173). 루트 builder도 상태별 frame을 먼저 쓴 뒤 look·neutral을 준비하고 atlas·provenance를 기록하므로 전체 output 디렉터리의 atomic 게시를 제공하지 않는다: [build_atlas.py](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/build_atlas.py#L142-L185).

사용자 영향은 추론이다. 제작자가 한 부품을 다시 준비하려다 더 넓은 출력 묶음을 바꾸거나 실패 후 서로 다른 생성 시점의 파일을 볼 수 있다. 실제 그림·산출물을 열거나 생성하지 않았고 손상 사례도 관찰하지 않았다. 원인 가설은 순수 helper와 작업 entrypoint·출력 게시 책임이 분리되지 않은 것이다.

권장 방향은 helper를 부작용 없는 module로 두고 명시적 entrypoint에서 필요한 모든 입력을 먼저 확인한 뒤 새 출력 묶음을 검증·게시하는 것이다. 문서에는 부품별 입력·의존성·생성 범위·실패 후 재개·이전 묶음 보존을 연결한다. 이득은 첫 유용한 결과와 복구 범위의 예측 가능성이다. 회귀 위험은 helper 분리가 현재 등록·manifest 순서를 바꾸거나 혼합 버전의 에셋을 정상으로 인식하게 하는 것이다.

추가 실험 필요: 실제 그림 대신 합성 이미지·stub filesystem으로 helper import 때 쓰기 없음, standing 단독 준비, 뒤쪽 입력 누락, 저장 실패, 마지막 정상 묶음 보존을 확인한다. 기존 activity·sleep-effects 테스트는 pose 수치·reach·주기·disable을 다루며 이 준비 파이프라인 실패나 실제 픽셀 품질은 다루지 않는다. [activity-rig/activity.test.mjs](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/activity.test.mjs#L8-L28); [activity-rig/sleep-effects.test.mjs](https://github.com/207studio-founder/kiwi-the-princess/blob/252f409717413c7dda6c3173a60e8e07979b3dd4/activity-rig/sleep-effects.test.mjs#L29-L56). 미실행이다.

수용 기준은 요청한 부품의 생성 범위가 명시되고 helper import가 파일을 바꾸지 않으며 실패 후 마지막 정상 묶음의 식별·복원이 가능한 것이다. 준비 시간·메모리·재빌드·복구 시간은 미측정이다. 1단계 생성 범위·복구 문서, 2단계 helper/entrypoint·검증 후 게시 설계, 3단계 합성 실패·재개 검증 순서다.

## 검토 축별 판단

| 축 | 이번 판단·한계 |
| --- | --- |
| 사용자 목적·핵심 여정 | 설치·viewer·리그 제작은 서로 다른 진입점이다. README의 분리는 확인했다. |
| 입력 반응성·메인 스레드 | root viewer 상시 draw 경로는 확인했다. 실제 메인 스레드 점유·입력 지연은 미측정이다. |
| 자료 준비·첫 유용한 결과 | 이미지 로드·해독·첫 표시와 atlas 재생성 시간은 미측정이다. |
| 로딩·취소·진행 | root 로딩·error 문구는 있다. ready 실패 완료·재시도는 P2다. |
| 저장·실패·복구·Undo·오프라인 | installer stage·백업·자동 복원 경로는 읽었다. 실제 설치·archive 무결성·사용자 Undo는 미검증이다. |
| 발견 가능성·일관성·접근성 | label·status·canvas aria-label은 확인했다. 실제 스크린 리더·키보드·모션·대비는 미검증이다. |
| 메모리·발열·배터리·비용 | 정지 중 draw는 소스로 확인했다. 누수·발열·배터리 결과는 단정하지 않는다. |
| 화면과 엔진의 책임 | 일부 리그는 ready·setTime·dispose를 제공한다. viewer 상태와 준비 실패를 연결할 필요가 있다. |

빠른 전체 처리와 즉각적인 조작 반응은 별도 결과다. 기술·언어 교체를 성능 개선의 증거로 취급하지 않는다. 먼저 준비·첫 상태·입력 반응·전체 완료·복구를 나눠 측정한다.

## 미검토·제외 범위와 다음 검토

root/activity/proof 화면·서버·리그 수학·시간/자원 API·준비 스크립트·전체 builder·테스트 본문·공개 제작 설명을 후속 검토했다. tail-profiles.js는 생성 배열임을 형식 인지 중 확인했으나 생성물 제외 원칙에 따라 의미 검토 완료에 포함하지 않는다. Three.js·생성 metadata·그림·geometry binary·release ZIP·과거 증거·의존성 내부는 제외했다. 실제 렌더·픽셀·성능·배포물 일치는 미검증이다.

바이너리와 이미지의 시각 품질은 확인하지 않았다. 코드에 이미지 로딩·렌더링이 있다는 사실을 실제 이미지 검토로 취급하지 않는다. 실제 사용자 자료·개인 노트·원고·iCloud·인증 정보는 다음 실험에도 사용하지 않는다.

후속 검토는 허용된 1차 구현·보조 도구·리그·테스트의 본문과 호출·실패·출력 경로를 읽었다. 동일한 복제 구현은 본문 읽기 후 byte 동일성 또는 variant diff를 대조했다. 패턴 검색·트리 조사·파일 수집만으로 의미 검토를 완료 처리하지 않았다. 실제 자료·생성물·제3자 upstream·보안/설치 설정은 제외 상태를 유지하며, 아래 각 파일의 이유와 불확실성을 남긴다. 실행·배포물 일치·시각 품질까지 포함한 전체 검토 완료 주장은 하지 않는다.

## 검토 manifest

고정 커밋의 Git Trees 재귀 목록은 `truncated=false`였으며 모든 파일을 아래에 남겼다. 파일 트리를 먼저 보고 명시적 소스 허용 목록에서만 읽었다. 새 범위는 `continuation` 후속 읽기로 기록했다. 표의 의미 검토 구간은 실제 읽은 본문 또는 읽은 동일 구현과 정확히 대조한 variant다. 테스트는 본문·fixture·assertion을 읽었으며 실행하지 않았다. 생성물의 우연한 형식 확인은 검토 완료로 세지 않았다. 전체 저장소 샘플 자동 실행·앱·브라우저·Aside·시뮬레이터·Actions는 사용하지 않았다.

| 분류 | 파일 수 |
| --- | ---: |
| 미검토·배포/추적 metadata | 2 |
| 검토 구간 있음 | 27 |
| 미검토·고지/법률 범위 | 1 |
| 제외·제3자/보존물 | 5 |
| 제외·생성/에셋 metadata | 8 |
| 제외·바이너리/실제 에셋 | 142 |
| 제외·생성물 | 1 |

| 파일 | 상태·읽은 구간 | 확인한 역할 또는 제외 이유 | 사용자 흐름에 남는 불확실성 |
| --- | --- | --- | --- |
| `.gitattributes` | 미검토·배포/추적 metadata | 비실행 추적·정규화·플러그인 등록 metadata. 환경 설정/배포 검증은 수행하지 않음 | 실제 패키징 포함 파일·호스트 등록과 준비/설치 안내의 일치는 미검증 |
| `.gitignore` | 미검토·배포/추적 metadata | 비실행 추적·정규화·플러그인 등록 metadata. 환경 설정/배포 검증은 수행하지 않음 | 실제 패키징 포함 파일·호스트 등록과 준비/설치 안내의 일치는 미검증 |
| `ARTWORK.md` | 소스 의미 검토 1-7 | 그림 출처와 라이선스 경계를 설명한다. 아트의 사실 검증이나 시각 확인은 아니다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `DECISIONS.md` | 소스 의미 검토 1-17 | 공개 프로젝트의 조립 결정·최종 동작 의미·이전 후보 제외 설명을 읽었다. QA 성공 주장을 이번 실험 결과로 채택하지 않았다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `LICENSE` | 미검토·고지/법률 범위 | 실행 구현이 아닌 고지/라이선스 본문. 권리/법률 적합성 해석을 수행하지 않음 | 실제 재사용·재배포 조건 판단은 별도 확인 필요. 앱 동작/성능 증거는 아님 |
| `README.md` | 소스 의미 검토 1-66 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `THREE-LICENSE.txt` | 제외·제3자/보존물 | 제3자 upstream 또는 보존 라이브러리/고지. 최신 제외 범위 유지 | 현재 배포 runtime과의 버전·의존·API 호환 및 내부 성능/실패 동작은 미검증 |
| `activity-rig/README.md` | 소스 의미 검토 1-8 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/activity-base.js` | 소스 의미 검토 1-192 | anatomy와 texture를 순서대로 읽고 body·ears·limb 정점을 CPU에서 갱신한다. pose 입력 범위를 검사하고 명시적 dispose를 제공한다. 실제 해독·메시 갱신 비용과 리소스 실패 경로는 미측정이다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/activity.js` | 소스 의미 검토 1-116 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/activity.test.mjs` | 소스 의미 검토 1-105 | 포즈 count·index bounds·수치 shape·action phase·손목 reach·결정성을 assertion한다. WebGL 로딩·dispose·생성 script 실패·pixel 품질은 다루지 않는다. 미실행이다. | 테스트 실행·통과·실제 호스트·시각/성능 결과는 미검증 |
| `activity-rig/anatomy.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/assets/bones-crop.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/assets/bones.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/assets/keyboard_rest-crop.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/assets/keyboard_rest.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-assets.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-body.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-source/PROMPTS.md` | 소스 의미 검토 1-23 | 부품 제작의 프롬프트·선택·제외 설명을 읽었다. 생성 결과 이미지를 열거나 품질을 판정하지 않았다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-source/eyes.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-source/hind-stand.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-source/prone.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/canonical-source/torso.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/ear-left.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/ear-right.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-left-closed.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-left-empty.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-left-open.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-right-closed.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-right-empty.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/eye-right-open.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/foot-left.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/foot-right.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/foreleg-left.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/foreleg-right.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/forelimb-anatomy.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/forelimb-math.mjs` | 소스 의미 검토 1-53 | 입력의 finite·길이·bendSign을 검사하고 도달 불가능 손목을 clamp해 2-bone 해를 반환한다. 수식 경로 검토와 실제 픽셀 해부학 판정은 구분한다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/head.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/index.html` | 소스 의미 검토 1-36 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/nose.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/prepare_canonical.py` | 소스 의미 검토 1-173 | helper 정의 뒤 module 최상위에서 이미지 읽기·부분 출력·anatomy·manifest 생성을 즉시 수행한다. 순수 helper import도 전체 생성 부작용을 갖는다. 원본 그림은 열지 않았다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/prepare_stand.py` | 소스 의미 검토 1-31 | prepare_canonical에서 helper를 import하고 standing 원본 등록·mask·manifest를 쓴다. import 때 다른 canonical 출력이 먼저 재생성되는 호출 관계를 확인했다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/prone-body.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/server.mjs` | 소스 의미 검토 1-20 | localhost static server의 경로 boundary·404·MIME·포트를 읽었다. symlink·누락 자원·잘못된 URL의 실제 동작은 실행하지 않았다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/sleep-effects.js` | 소스 의미 검토 1-129 | 재사용 geometry/material의 scale·opacity·sleep→rise handoff를 갱신하며 dispose를 제공한다. mode 값은 검증하지만 같은 bubble을 사용한다. 새 객체를 프레임마다 축적하는 구조는 아니다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/sleep-effects.test.mjs` | 소스 의미 검토 1-57 | bubble 주기·anchor·mode·disable·비유한 시간 거부를 검사한다. 렌더 픽셀·화면 알림·페이지 수명은 다루지 않는다. 미실행이다. | 테스트 실행·통과·실제 호스트·시각/성능 결과는 미검증 |
| `activity-rig/stand-body.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/stand-registration.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `activity-rig/three/three.core.js` | 제외·제3자/보존물 | 제3자 upstream 또는 보존 라이브러리/고지. 최신 제외 범위 유지 | 현재 배포 runtime과의 버전·의존·API 호환 및 내부 성능/실패 동작은 미검증 |
| `activity-rig/three/three.module.js` | 제외·제3자/보존물 | 제3자 upstream 또는 보존 라이브러리/고지. 최신 제외 범위 유지 | 현재 배포 runtime과의 버전·의존·API 호환 및 내부 성능/실패 동작은 미검증 |
| `activity-rig/torso.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `build_atlas.py` | 소스 의미 검토 1-241 | 입력 path·공유 transform·RGBA/alpha·개수 검증과 frames·atlas·metadata·provenance 쓰기 순서를 모두 읽었다. 상태별 출력 후 뒤쪽 입력 오류가 날 수 있고 출력 디렉터리 전체의 atomic 게시를 제공하지 않는다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `continuous-surface/far-front.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `continuous-surface/far-hind.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `continuous-surface/near-surface.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-greet/README.md` | 소스 의미 검토 1-8 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-greet/mouth.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-greet/rig.js` | 소스 의미 검토 1-86 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/README.md` | 소스 의미 검토 1-11 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/body.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/registration.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/rig-math.js` | 소스 의미 검토 1-84 | tail의 주기 wrap·곡선 적분·확장·호흡 변형을 읽었다. 정점 계산은 고정 단계이며 실제 시각 이음새와 처리 시간은 미측정이다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/rig.js` | 소스 의미 검토 1-272 | texture promise, 고정 body/tail geometry 생성·갱신·색 혼합·시간 validation·dispose 경로를 모두 읽었다. 리소스 정리 API가 존재하며 부분 로딩 실패 시 성공 texture 정리는 별도 실험 대상이다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/tail-center.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/tail-left.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/tail-profiles.js` | 제외·생성물 | 생성 배열 또는 템플릿에서 만든 안내 산출물. 형식 인지/참고 열람을 1차 구현 의미 검토로 계산하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `front-sit/tail-right.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `index.html` | 소스 의미 검토 1-163 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/006.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/failed/007.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/idle/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/jumping/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/jumping/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/jumping/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/jumping/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/jumping/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/006.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/007.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/008.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/009.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/010.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/011.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/012.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/013.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/014.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/look/015.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/neutral/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/review/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/006.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-left/007.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/006.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running-right/007.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/running/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/004.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waiting/005.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waving/000.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waving/001.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waving/002.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `inputs/waving/003.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `install.sh` | 소스 의미 검토 1-42 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `look/cardinals-source.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `look/row10-source.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `look/row9-source.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `media/kiwi-the-princess.gif` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/indices.u32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/manifest.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-0.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-1.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-2.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-3.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-4.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-5.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-6.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-7.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-8.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/positions-neutral.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/left/uv.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/proof.js` | 소스 의미 검토 1-112 | side metadata·geometry·texture cache와 generation token, 이전 scene geometry/material dispose, 선택 오류 표시를 모두 읽었다. stale 결과의 게시를 막지만 network 취소는 하지 않으며 동시 동일 side load의 cache 공유는 미구현이다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/indices.u32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/manifest.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-0.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-1.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-2.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-3.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-4.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-5.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-6.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-7.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-8.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/positions-neutral.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `proof/right/uv.f32` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `references/kiwi_turnaround.webp` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `releases/kiwi-atlas-viewer.zip` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `releases/kiwi-native-pet.zip` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `renderers/run-r3/index.html` | 소스 의미 검토 1-14 | side/frame 선택 controls와 proof module 진입점이다. 실제 geometry·texture는 제외되어 있어 렌더 결과를 판정하지 않는다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `requirements.txt` | 소스 의미 검토 1-1 | Pillow만 선언된 재빌드 의존성을 확인했다. prepare_canonical·prepare_stand는 NumPy를 import하므로 해당 보조 제작 경로의 준비 전제는 이 파일만으로 완결되지 않는다. 설치하지 않았다. | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `right-facing/scale-r2/far-front.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `right-facing/scale-r2/far-hind.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `right-facing/scale-r2/near-surface.png` | 제외·바이너리/실제 에셋 | 이미지·geometry·압축 배포물·bundle은 실제 열람/디코딩/시각 평가에서 제외 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `selection.json` | 제외·생성/에셋 metadata | 실제 에셋에서 생성된 layout·등록·선택·provenance/패키지 metadata. 생성물 제외 범위 유지 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `server.mjs` | 소스 의미 검토 1-16 | 앞선 검토에서 이 구간의 사용자 진입·정상/실패 흐름·제약을 직접 읽음. 구간 밖 의미 검토나 실제 동작 성공으로 확장하지 않음 | 실제 그림/배포물 일치·픽셀 품질·GPU/메모리·준비/조작/복구 시간은 미검증 |
| `three.core.js` | 제외·제3자/보존물 | 제3자 upstream 또는 보존 라이브러리/고지. 최신 제외 범위 유지 | 현재 배포 runtime과의 버전·의존·API 호환 및 내부 성능/실패 동작은 미검증 |
| `three.module.js` | 제외·제3자/보존물 | 제3자 upstream 또는 보존 라이브러리/고지. 최신 제외 범위 유지 | 현재 배포 runtime과의 버전·의존·API 호환 및 내부 성능/실패 동작은 미검증 |

## 문서 품질 확인과 변경 경계

고정 커밋의 파일·심볼·행 링크, manifest 누락·중복, 근거와 추론 구분, 미측정 표기, 공개 근거 경계를 확인한다. PR diff는 이 Markdown 문서 한 개 추가만 허용한다. 제품·테스트·설정·의존성·워크플로는 변경하지 않는다. 원본 코드·민감한 로그는 복사하지 않았다. 성능·기능 테스트는 수행하지 않았고, 앱 실행·설치·Actions·자동 리뷰 요청·병합·배포는 하지 않는다.

