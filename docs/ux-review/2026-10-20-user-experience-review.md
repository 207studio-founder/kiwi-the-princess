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

root viewer·installer·서버와 일부 builder·리그 API를 검토했다. 모든 리그 수학·준비 파이프라인·테스트·manifest 의미 검토는 미완료다. Three.js 보존 라이브러리·실제 입력 그림·geometry binary·release ZIP·GIF·이미지 픽셀은 미검토다.

바이너리와 이미지의 시각 품질은 확인하지 않았다. 코드에 이미지 로딩·렌더링이 있다는 사실을 실제 이미지 검토로 취급하지 않는다. 실제 사용자 자료·개인 노트·원고·iCloud·인증 정보는 다음 실험에도 사용하지 않는다.

다음 검토는 manifest의 미검토 1차 소스 중 위 여정의 호출자·실패 경로를 먼저 좁혀 진행한다. 외부 의존성·보존 구현의 전체 검토, 호스트 동작, 실제 배포물의 일치 여부는 별도 범위다. 이번 제안만으로 그 범위가 완료되었다고 표시하지 않는다.

## 검토 manifest

GitHub Git Trees API의 고정 커밋 재귀 목록을 사용했다. 목록은 `truncated=false`였다. 파일 내용은 트리를 먼저 확인하고 지정한 소스 허용 목록에서만 읽었다. 전체 저장소 내용을 자동 실행·샘플링하는 검사는 하지 않았다. 표의 구간 밖은 읽은 파일 안에서도 의미 검토 완료로 계산하지 않는다.

| 분류 | 파일 수 |
| --- | ---: |
| 미검토: 의존성·빌드 metadata | 3 |
| 미검토: 1차 소스·참조 문서 | 23 |
| 검토 구간 있음 | 12 |
| 미검토: 테스트·실험 소스 | 2 |
| 제외: 바이너리·이미지·배포물 | 142 |
| 미검토: 보존 upstream·외부 라이브러리 | 4 |

| 파일 | 검토 상태 |
| --- | --- |
| `.gitattributes` | 미검토: 의존성·빌드 metadata |
| `.gitignore` | 미검토: 의존성·빌드 metadata |
| `ARTWORK.md` | 미검토: 1차 소스·참조 문서 |
| `DECISIONS.md` | 미검토: 1차 소스·참조 문서 |
| `LICENSE` | 미검토: 1차 소스·참조 문서 |
| `README.md` | 검토 구간 1-66 |
| `THREE-LICENSE.txt` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/README.md` | 검토 구간 1-8 |
| `activity-rig/activity-base.js` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/activity.js` | 검토 구간 1-116 |
| `activity-rig/activity.test.mjs` | 미검토: 테스트·실험 소스 |
| `activity-rig/anatomy.json` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/assets/bones-crop.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/assets/bones.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/assets/keyboard_rest-crop.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/assets/keyboard_rest.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/canonical-assets.json` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/canonical-body.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/canonical-source/PROMPTS.md` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/canonical-source/eyes.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/canonical-source/hind-stand.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/canonical-source/prone.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/canonical-source/torso.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/ear-left.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/ear-right.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-left-closed.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-left-empty.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-left-open.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-right-closed.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-right-empty.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/eye-right-open.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/foot-left.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/foot-right.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/foreleg-left.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/foreleg-right.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/forelimb-anatomy.json` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/forelimb-math.mjs` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/head.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/index.html` | 검토 구간 1-36 |
| `activity-rig/nose.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/prepare_canonical.py` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/prepare_stand.py` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/prone-body.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/server.mjs` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/sleep-effects.js` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/sleep-effects.test.mjs` | 미검토: 테스트·실험 소스 |
| `activity-rig/stand-body.png` | 제외: 바이너리·이미지·배포물 |
| `activity-rig/stand-registration.json` | 미검토: 1차 소스·참조 문서 |
| `activity-rig/three/three.core.js` | 미검토: 보존 upstream·외부 라이브러리 |
| `activity-rig/three/three.module.js` | 미검토: 보존 upstream·외부 라이브러리 |
| `activity-rig/torso.png` | 제외: 바이너리·이미지·배포물 |
| `build_atlas.py` | 검토 구간 1-75,150-241 |
| `continuous-surface/far-front.png` | 제외: 바이너리·이미지·배포물 |
| `continuous-surface/far-hind.png` | 제외: 바이너리·이미지·배포물 |
| `continuous-surface/near-surface.png` | 제외: 바이너리·이미지·배포물 |
| `front-greet/README.md` | 검토 구간 1-8 |
| `front-greet/mouth.png` | 제외: 바이너리·이미지·배포물 |
| `front-greet/rig.js` | 검토 구간 1-86 |
| `front-sit/README.md` | 검토 구간 1-11 |
| `front-sit/body.png` | 제외: 바이너리·이미지·배포물 |
| `front-sit/registration.json` | 미검토: 1차 소스·참조 문서 |
| `front-sit/rig-math.js` | 미검토: 1차 소스·참조 문서 |
| `front-sit/rig.js` | 미검토: 1차 소스·참조 문서 |
| `front-sit/tail-center.png` | 제외: 바이너리·이미지·배포물 |
| `front-sit/tail-left.png` | 제외: 바이너리·이미지·배포물 |
| `front-sit/tail-profiles.js` | 미검토: 1차 소스·참조 문서 |
| `front-sit/tail-right.png` | 제외: 바이너리·이미지·배포물 |
| `index.html` | 검토 구간 1-163 |
| `inputs/failed/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/006.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/failed/007.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/idle/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/jumping/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/jumping/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/jumping/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/jumping/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/jumping/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/006.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/007.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/008.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/009.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/010.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/011.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/012.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/013.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/014.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/look/015.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/neutral/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/review/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/006.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-left/007.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/006.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running-right/007.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/running/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/003.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/004.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waiting/005.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waving/000.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waving/001.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waving/002.png` | 제외: 바이너리·이미지·배포물 |
| `inputs/waving/003.png` | 제외: 바이너리·이미지·배포물 |
| `install.sh` | 검토 구간 1-42 |
| `look/cardinals-source.png` | 제외: 바이너리·이미지·배포물 |
| `look/row10-source.png` | 제외: 바이너리·이미지·배포물 |
| `look/row9-source.png` | 제외: 바이너리·이미지·배포물 |
| `media/kiwi-the-princess.gif` | 제외: 바이너리·이미지·배포물 |
| `proof/left/indices.u32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/manifest.json` | 미검토: 1차 소스·참조 문서 |
| `proof/left/positions-0.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-1.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-2.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-3.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-4.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-5.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-6.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-7.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-8.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/positions-neutral.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/left/uv.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/proof.js` | 검토 구간 1-105 |
| `proof/right/indices.u32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/manifest.json` | 미검토: 1차 소스·참조 문서 |
| `proof/right/positions-0.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-1.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-2.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-3.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-4.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-5.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-6.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-7.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-8.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/positions-neutral.f32` | 제외: 바이너리·이미지·배포물 |
| `proof/right/uv.f32` | 제외: 바이너리·이미지·배포물 |
| `references/kiwi_turnaround.webp` | 제외: 바이너리·이미지·배포물 |
| `releases/kiwi-atlas-viewer.zip` | 제외: 바이너리·이미지·배포물 |
| `releases/kiwi-native-pet.zip` | 제외: 바이너리·이미지·배포물 |
| `renderers/run-r3/index.html` | 미검토: 1차 소스·참조 문서 |
| `requirements.txt` | 미검토: 의존성·빌드 metadata |
| `right-facing/scale-r2/far-front.png` | 제외: 바이너리·이미지·배포물 |
| `right-facing/scale-r2/far-hind.png` | 제외: 바이너리·이미지·배포물 |
| `right-facing/scale-r2/near-surface.png` | 제외: 바이너리·이미지·배포물 |
| `selection.json` | 미검토: 1차 소스·참조 문서 |
| `server.mjs` | 검토 구간 1-16 |
| `three.core.js` | 미검토: 보존 upstream·외부 라이브러리 |
| `three.module.js` | 미검토: 보존 upstream·외부 라이브러리 |

## 문서 품질 확인과 변경 경계

고정 커밋의 파일·심볼·행 링크, manifest 누락·중복, 근거와 추론 구분, 미측정 표기, 공개 근거 경계를 확인한다. PR diff는 이 Markdown 문서 한 개 추가만 허용한다. 제품·테스트·설정·의존성·워크플로는 변경하지 않는다. 원본 코드·민감한 로그는 복사하지 않았다. 성능·기능 테스트는 수행하지 않았고, 앱 실행·설치·Actions·자동 리뷰 요청·병합·배포는 하지 않는다.
