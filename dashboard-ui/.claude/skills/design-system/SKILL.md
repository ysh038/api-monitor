---
name: design-system
description: Design system workflows: one-time Storybook setup (ds-init) and building Atomic-layer components (atom/molecule/organism) before writing a page (ds-add).
---
# Design System

## Part 1 — ds-init (최초 1회 설정)


# /ds-init — Storybook 온디맨드 설치 (최초 1회)

UI 작업이 처음 필요해진 시점에 실행한다. 이미 `.storybook/` 이 있으면 실행하지 않는다.

## 절차

1. **Storybook 의향 확인**: `.harness/config.json` 의 `storybook` 필드를 읽는다.
   - `off` (또는 명시적 비활성화): **사용자에게 지금 Storybook을 켤지 물어본다**.
     동의한 경우에만 계속 진행하고, `storybook` 을 `pending` 으로 변경한다.
   - `pending` 또는 필드 없음: 의향이 있다는 뜻이므로 바로 설치 진행 (간단히 확인 가능)
   - `ready`: 이미 설치됨, 이 워크플로를 실행하지 않는다

2. **브랜드 토큰 확인**: `src/design-system/tokens.css` 의 `--primitive-primary-*` 가
   아직 하네스 기본값(`#4f46e5` 계열)이면, 지금이 UI 작업이 실제로 시작되는 시점이므로
   브랜드 색상을 결정해야 한다.
   
   **모드가 `implement` 또는 `inspire`이고 `.harness/design-references.json` 에 Figma 소스가 있으면:**
   - 먼저 사용자 MCP를 통해 Figma 파일의 변수(variables) / 디자인 컨텍스트를 읽는다
   - Figma에서 primary/brand 색상 램프를 찾아 `--primitive-primary-*` 10단계로 매핑한다
   - 변수를 찾을 수 없거나 MCP를 사용할 수 없으면 아래 수동 질문으로 진행
   
   **Figma 변수가 없거나 `free` 모드이면:**
   - 사용자에게 브랜드 색상을 묻는다. 답을 받으면 램프 10단계를 전부 교체한다(단계 하나만
     바꾸면 hover·pressed 파생값이 어긋난다)
   - 아직 정해지지 않았다면 기본값 그대로 두되 `docs/product-spec.md` TODO에
     "브랜드 컬러 확정 필요"를 남긴다 — 이 확인을 건너뛰면 기본값이 그대로 굳어져
     나중에 아무도 안 건드리게 된다.

3. **공식 CLI로 설치** (손으로 설정 파일을 쓰지 않는다 — 프레임워크·빌더 감지는 CLI가 한다):

```bash
npx storybook@latest init --no-dev --yes
```

   Vite 프로젝트면 최신 Storybook init이 `addon-vitest`·`addon-a11y`까지 함께 설치한다.
   설치 후 `package.json` 에 없으면 그때만 수동 추가:

```bash
npx storybook add @storybook/addon-vitest
npx storybook add @storybook/addon-a11y
```

   **Peer dependency 충돌 대응**: `storybook init` 후 npm이 peer conflict를 보고하면
   (예: `@vitest/browser-playwright`와 vitest 버전 불일치):
   - vitest 관련 패키지를 Storybook이 요구하는 버전으로 맞추거나
   - `npm install --legacy-peer-deps` 로 경고를 무시하고 진행
   실제 빌드·테스트가 깨지지 않으면 경고만으로 막을 필요는 없다.

4. **접근성 위반을 검증 실패로**: `.storybook/preview.(ts|tsx)` 의 `parameters.a11y.test` 를
   `'todo'`(init 기본값)에서 `'error'` 로 바꾼다:

```ts
a11y: {
    test: 'error',
},
```

5. **린트 정합**: Storybook이 만든 파일이 프로젝트 eslint에 걸리지 않게 한다.
   - 타입 인식 린트(parserOptions.project)를 쓰는 프로젝트면 eslint ignores에
     `.storybook/**` 와 `vitest.shims.d.ts`(addon-vitest 생성물) 추가
   - 스토리 export(PascalCase)가 naming-convention에 걸리면 `**/*.stories.{ts,tsx}` 오버라이드로
     해당 규칙을 끈다 (하네스 lint 모듈의 `eslint.harness.config.js` 에는 이미 포함)
   - init이 만든 예제(`src/stories/`)는 프로젝트 컨벤션에 안 맞으면 삭제한다

6. **checks에 등록**: `.harness/config.json` 의 `checks` 배열에서 `test` 항목 **앞**에 추가
   (addon-vitest 설치가 vitest workspace를 구성해준 경우):

```json
{ "id": "test-storybook", "command": "npx vitest --project=storybook --run" }
```

   같은 파일에서 `storybook` 필드를 `"ready"` 로 올린다 (`off`/`pending` → `ready`).
   설치 전부터 있던 컴포넌트 중 스토리가 없는 것이 있으면
   `.harness/stories-baseline.json` 에 경로 목록을 스냅샷한다 (브라운필드 유예 —
   새 컴포넌트만 스토리 없음을 error로 취급할 때 기준점).

7. **계층 폴더 스켈레톤 생성**: Atomic 계층을 폴더로 고정한다
   (계층 정의는 `.cursor/rules/30-design-system`).

```
src/design-system/atoms/
src/design-system/molecules/
src/design-system/organisms/
src/components/layouts/        # template 계층
```

   Storybook 사이드바가 계층 순서대로 보이도록 `.storybook/preview.(ts|tsx)` 에
   `options.storySort` 를 넣는다:

```ts
options: {
    storySort: { order: ['Atoms', 'Molecules', 'Organisms', 'Layouts'] },
},
```

8. **참조 구현 생성**: 위 폴더에 이 프로젝트의 토큰만 쓰는 **한 줄기의 계층 예제**를 만든다 —
   `atoms/ExampleButton`, `molecules/ExampleFormField`(ExampleButton + 인풋 + 에러 메시지),
   `organisms/ExampleForm`(ExampleFormField 조합), `layouts/ExampleLayout`(슬롯 레이아웃).
   각각 스토리 포함, `title` 은 계층 그대로(`Atoms/ExampleButton` 등).
   **Example* 접두사를 써서 제품 컴포넌트(Button, FormField 등)와 충돌하지 않게 한다.**
   흩어진 예제 3종보다 **한 화면이 atom에서 organism까지 쌓이는 과정**을 보여주는 편이
   모방 대상으로 낫다. 이 예제들은 컴파일되는 코드이므로 API가 바뀌면 깨진다 —
   그게 목적이다. 에이전트(자신 포함)가 산문 문서 대신 이 코드를 모방하게 된다.

9. **확인**: `npm run storybook` 으로 기동 확인 후,
   `node .harness/gates/run-checks.mjs` 전체 통과 확인.
   계층 역방향 import가 lint error로 잡히는지 한 번 일부러 확인해 둔다.

## 완료 조건

- `.storybook/` 존재, a11y test = 'error', storySort 적용
- checks에 storybook 테스트 등록
- `.harness/config.json` 의 `storybook` 이 `"ready"`
- (해당 시) `.harness/stories-baseline.json` 스냅샷
- `atoms` / `molecules` / `organisms` / `layouts` 폴더와 계층 예제 + 스토리


---

## Part 2 — ds-add (UI 작업마다)


# /ds-add — Read → Plan → Layout scaffold → Fill

UI 작업 지시를 받았을 때 따르는 절차다. 큰 흐름은 네 단계다:

| 단계 | 하는 일 | 산출물 |
|------|---------|--------|
| **0. Read** | 디자인 참조 확인·읽기 | `design-references.json` 항목 (`linked`) |
| **1. Plan** | 슬롯 트리 + Atomic 목록 + 채우기 순서 | 채팅에 적은 목록 (코드 아님) |
| **2. Layout scaffold** | 페이지에 **빈 슬롯만** 작성 | `data-slot` 이 붙은 페이지 파일 |
| **3. Fill** | 슬롯을 atom → molecule → organism 으로 채움 | 컴포넌트 + 스토리 + 조립된 페이지 |

> **`implement` 모드**: 2단계를 건너뛰고 페이지에 바로 내용물을 쓰면 쓰기 시점 체크가 거부한다.
> 뼈대를 먼저 저장한 뒤 채워야 한다. 판정 기준은 페이지 파일의 `data-slot` 유무다.

계층 정의와 경계 규칙은 `.cursor/rules/30-design-system` 에 있다.

## 절차

0. **디자인 참조 확인 및 읽기 (페이지/화면 작업 시작 전 필수)**:

   **a) 기존 항목 체크**:
   - `.harness/design-references.json` 읽어 현재 화면의 항목 확인
   - 이미 있으면 (`linked`/`waived`/`needed`) → 재질문 안 함, 기존 상태 사용
   
   **b) 참조 수집** (항목 없을 때):
   - **사용자 메시지에 이미 URL/이미지 포함** → 그대로 사용, 질문 건너뜀
   - **없으면** → **반드시 물어봄**: 「이 화면에 참고할 피그마/URL/캡처 있어요? (있음 / 없음 / 나중에)」
     * **있음** → URL 또는 이미지 파일 받음
     * **없음** → `status: waived` 기록, 진행 OK
     * **나중에** → `status: needed` 기록
       - `inspire` 모드: 진행 OK
       - `implement` 모드: `needed` 만으로는 UI 작업 불가 — 지금 제공하거나 waive 필요
   
   **c) 참조 읽기 시도** (URL/이미지 받았을 때):
   - **참조 종류 판단**:
     1. **Figma** (`figma.com`, `figjam` URL) → 사용자 Figma MCP로 design context 및/또는 screenshot 시도
     2. **이미지** (png/jpg/webp/gif URL 또는 첨부) → fetch/open해 에이전트가 볼 수 있는지 확인
     3. **기타 URL** (Notion, Drive, 일반 웹) → 믿을 수 있는 match 불가 알림, Figma 노드 URL 또는 내보낸 스크린샷 요청
   
   - **읽기 성공** → `ref` (또는 `figma`) 기록 + `status: 'linked'` + `lastReadAt` + `lastReadOk: true`
   - **읽기 실패** (inspire/implement 동일):
     * **STOP**. UI 코드 작성하지 않음.
     * 다른 Figma 노드 URL 또는 스크린샷 요청 (또는 명시적 waive 선택).
     * 실패 기록: `status: 'needed'` (또는 `'waived'`) + `lastReadAt` + `lastReadOk: false` + `readError`
   
   **d) 올바른 노드 필요**:
   - `implement` 모드에서 정확한 구현을 위해 **올바른 화면/컴포넌트 노드**가 필요하다.
   - 잘못된 노드(상위 페이지, 다른 variant)를 링크하면 구현이 어긋난다.
   - 이미 잘못 링크했으면 `status: 'waived'` 로 변경하거나 올바른 URL로 재링크.
   
   **e) 섹션별 구현 (복잡한 페이지의 권장 접근법)**:
   
   복잡한 페이지/화면을 만들 때 **한 번에 전체를 다시 만들지 않는다**:
   
   1. **하나의 페이지 참조 유지** — 추가 섹션 URL 불필요
   2. **전체 페이지를 한 번 읽는다** (screenshot + layout/token)
   3. **위에서 아래로 섹션별 진행**:
      - 예: 헤더 → 메인 폼 → 사이드 패널 → 푸터
      - 각 섹션에서 필요한 Figma 노드/영역을 **같은 페이지에서** 재읽기 가능 (다른 node-id)
   4. **Atomic 계층 우선** — atoms → molecules → organisms 순으로 쌓고, 각각 스토리와 함께
   5. **각 섹션 후 비교** — Figma screenshot/Storybook과 시각적으로 비교 후 다음 섹션으로
   6. **목표: Figma와 최대한 가깝게** — 작은 단위로 반복해 충실도 유지

### 1. Plan — 코드를 쓰기 전에 목록부터

1. **슬롯 트리**: 화면을 위에서 아래로 구역(슬롯)으로 나눈다. 각 구역에 `data-slot` 이름을 정한다.

   ```
   OfficeDetailPage
     ├ data-slot="header"    — 제목 + 액션 버튼
     ├ data-slot="summary"   — 평점·배지 요약
     └ data-slot="reviews"   — 리뷰 목록
   ```

2. **화면 분해**: 만들 화면을 계층으로 쪼개 목록을 먼저 적는다.

   ```
   OfficeDetailPage (page)
     └ DetailLayout (template)
         ├ OfficeSummary (organism, 도메인 → src/components/Office/)
         │   ├ RatingStars (molecule)
         │   │   └ Icon (atom)
         │   └ Badge (atom)
         └ ReviewList (organism, 도메인 → src/components/Review/)
             └ ReviewCard (molecule, 도메인)
                 └ Avatar (atom)
   ```

   목록 없이 코드를 시작하지 않는다. 이 목록이 곧 작업 순서다.

3. **재고 조사**: 목록의 각 항목이 `src/design-system/atoms|molecules|organisms/` 와
   `src/components/` 에 이미 있는지 조회한다.
   - 있으면 그대로 쓴다. 비슷한 것이 있으면 variant/prop 추가를 우선 검토한다. 복제 금지.
   - 이름이 달라도 역할이 같을 수 있다 (`Badge` / `Tag` / `Chip`). 이름보다 **생김새와 역할**로 찾는다.
     커밋 시 이름이 비슷한 새 부품은 경고되지만, 이름이 전혀 다르면 못 잡는다.
4. **Storybook 확인**: `.storybook/` 이 없으면 먼저 `/ds-init` 을 실행한다.
5. **계층 판정**: 없는 것마다 위치를 정한다.
   - 더 못 쪼개면 atom / atom 2~3개 조합이면 molecule / 의미 있는 블록이면 organism
   - 도메인 타입을 props로 받으면 `design-system/` 이 아니라 `src/components/{Domain}/`
   - 쿼리 훅·전역 스토어를 부르고 싶어지면 컴포넌트가 아니다 — 그 호출은 page로 올린다
6. **채우기 순서 확정**: 어느 슬롯부터 채울지 정한다. 보통 위에서 아래로 (헤더 → 본문 → 하단).

### 2. Layout scaffold — 빈 뼈대를 먼저 저장한다

페이지 파일에 **슬롯만** 작성하고 저장한다. 이 단계에서 쓰는 것은:

- 슬롯 요소와 `data-slot` 속성
- 레이아웃 스타일만 (`display`, `grid`/`flex`, `gap`, 간격 토큰)
- 필요하면 레이아웃 성격의 atom (예: `Stack`, `Container`)

쓰지 않는 것: `src/components/` 및 `design-system/molecules|organisms` import, 실제 마크업, 문구, 데이터 훅.

```tsx
// src/pages/OfficeDetailPage.tsx — scaffold 단계
import styles from './OfficeDetailPage.module.css'

export function OfficeDetailPage() {
    return (
        <main className={styles.page}>
            <section data-slot="header" className={styles.header} />
            <section data-slot="summary" className={styles.summary} />
            <section data-slot="reviews" className={styles.reviews} />
        </main>
    )
}
```

뼈대를 저장한 뒤에 3단계로 넘어간다. 뼈대와 내용물을 한 번의 쓰기에 같이 넣으면 거부된다.

### 3. Fill — 슬롯을 하나씩 채운다

1. **아래에서 위로 작성**: atom을 전부 끝내고 molecule, 그 다음 organism.
   각 컴포넌트 폴더에:
   - `<Name>.tsx` — 토큰만 사용 (`tokens.css` 변수·`tokens.ts` 상수), 원시 색상값 금지.
     자기보다 위 계층 import 금지 (ESLint error)
   - 스타일 파일 (`.harness/config.json` 의 `style.styling` 에 따라):
     - `css-modules`: `<Name>.module.css` + `import styles from './Name.module.css'`
     - `css` (plain): `<Name>.css` (또는 colocated plain CSS) + `import './Name.css'`
     - `tailwind`: 최소한의 CSS 모듈 파일 또는 없음, 유틸리티 클래스 사용
     - `detected` (CSS-in-JS 등): 짧은 가이드만, module.css 강제 안 함
   - 어떤 스타일 방식이든 클릭 가능한 요소는 최소 `:hover`·`:focus-visible` 두 상태 포함
     (`30-design-system` 필수 규칙). 뜬 요소는 계층에 맞는 `--shadow-*`, 상태 전환에는
     `--duration-*`/`--easing-*` — 언제 쓰는지는 `30-design-system` 표 참고
   - **`<Name>.stories.tsx` — Storybook ready 상태에서 필수** (pending은 권장):
     `src/design-system/_story-template.tsx` 형식을 따르고
     `title` 은 계층 그대로(`Atoms/Button`), **play 함수 필수**:
     주요 상호작용(클릭·입력)과 포커스·aria 상태를 단정한다
     
     **제품 컴포넌트 스토리는 실제 사용 변형을 포함해야 한다:**
     - Example* 참조 구현과 달리, 제품 컴포넌트(Button, TextField 등)의 스토리는
       실제 화면에서 쓰이는 조합을 보여준다(예: Login 화면에서 fullWidth Button + size="large")
     - "기본 예제만 있고 실제 쓰이는 조합은 스토리에 없다"면 변형 검증이 안 된다
     - 새 화면을 만들 때 기존 컴포넌트의 variant/prop이 충분한지 스토리를 먼저 확인한다
     
     **⚠️ Storybook ready: stories 없는 컴포넌트는 쓰기 시점 체크 + 커밋 전 체크가 차단**
   - `index.ts` — 공개 API
2. **슬롯 채우기**: 컴포넌트가 준비된 슬롯부터 순서대로 채운다. 한 번에 한 슬롯씩,
   채울 때마다 디자인과 비교한다. `data-slot` 속성은 지우지 않고 그대로 둔다.
   페이지에는 훅 호출과 조립만 남는다 — 새 마크업·스타일이 필요해지면 1번으로 돌아간다.

### 4. 검증

스토리 테스트와 stylelint, lint(계층 위반 검사) 통과 확인. UI 완성도(인터랙션
상태·트랜지션·그림자)는 정적 분석으로 못 잡으므로 `/ux-review`로 별도 확인한다.

## 금지

- **뼈대 없이 페이지에 내용물부터 쓰기** (`implement` 모드에서는 쓰기 시점에 거부된다)
- 페이지 파일 안에 일회성 버튼·인풋 스타일 작성 (드리프트의 시작) — 인라인 스타일은 쓰기 시점에 거부,
  원시 컨트롤·기본 태그 증가는 커밋 시 경고
- atom에 역할을 계속 덧붙이기 — 다른 atom을 조합하거나 props가 8개를 넘으면 molecule로 올린다 (커밋 시 경고)
- 계층 건너뛰기 — atom 없이 organism부터 만들기
- atom/molecule 안에서 도메인 타입·쿼리 훅·전역 스토어 사용
- **Storybook ready: 스토리 없는 컴포넌트 (Write/Shell 게이트 + 커밋 게이트가 차단)**
- 토큰에 없는 색·간격을 쓰기 위해 인라인 style로 우회
