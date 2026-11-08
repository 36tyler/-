# SHUFFLE STUDIO — GitHub 배포용 소스

셔플댄스 학원 웹사이트의 프론트엔드·백엔드 소스입니다. Node.js 22 이상을 사용하세요.

## 배포 방식 선택

| 방식 | 화면·다크 모드 | 관리자 로그인·편집·글자 색상 | 사진·영상 업로드·저장 |
| --- | --- | --- | --- |
| GitHub 저장소 + Cloudflare Workers / R2 | 지원 | 지원 | 지원 |
| GitHub Pages | 화면 미리보기 | 사용 불가 | 사용 불가 |

**전체 기능을 사용하려면 Cloudflare 배포를 선택하세요.** GitHub Pages는 정적 파일 호스팅이라 백엔드를 실행하지 못합니다. `preview.html`을 직접 열어도 디자인을 확인할 수 있습니다.

이 압축파일은 소스 배포용입니다. 기존 Sites의 프로젝트 식별자·비밀번호·인증 토큰과 운영 저장소는 포함하지 않습니다. 관리자가 기존 사이트에서 저장한 글·사진·영상은 별도 저장소의 데이터이므로 이 소스에 포함되지 않습니다. 신규 배포는 초기 콘텐츠로 시작하며 관리자 화면에서 실제 학원 정보를 등록할 수 있습니다. 기존 사이트는 그대로 유지됩니다.

## 1. 로컬에서 실행

압축을 풀고 `shuffle-studio` 폴더에서 터미널을 여세요.

```bash
npm ci
npm run build
npm run setup
npm start
```

`npm run setup`에서 관리자 비밀번호를 직접 입력합니다. 기존과 같은 비밀번호를 쓰려면 이 단계에서 설정하세요. 비밀번호 원문은 저장하지 않으며 해시와 임의의 salt를 `.local/admin.json`에 저장합니다. **`.local/`을 GitHub에 올리지 마세요.**

브라우저에서 `http://127.0.0.1:3000`을 여세요. 로컬 업로드와 콘텐츠도 `.local/`에 저장됩니다.

## 2. GitHub 저장소에 올리기

새 GitHub 저장소를 만든 다음 **이 폴더 안의 파일들**을 저장소 루트에 올리세요. `.github/workflows/`, `.gitignore`, `package.json`, `package-lock.json`도 포함해야 합니다. 빈 원격 저장소라면 다음 명령으로 올릴 수 있습니다.

```bash
git init
git add .
git commit -m "Initial shuffle studio website"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

`YOUR_ACCOUNT`, `YOUR_REPOSITORY`를 실제 값으로 바꾸세요. 저장소가 이미 있으면 `git init`부터 다시 실행하지 말고 해당 저장소에 파일을 복사해 커밋하세요.

## 3. 전체 기능 배포 — Cloudflare

### 처음 한 번만 설정

1. Cloudflare 계정을 만들고 **R2를 활성화**합니다. 계정에 따라 결제 수단 등록이 필요할 수 있으며 사용량에 따른 요금은 Cloudflare 정책을 따릅니다.
2. R2에서 `shuffle-studio-media` 버킷을 만듭니다. 버킷은 공개하지 않아도 됩니다. 다른 이름을 쓰면 `wrangler.jsonc`의 `bucket_name`도 바꾸세요.
3. Cloudflare 계정의 Account ID를 확인합니다.
4. Cloudflare API Token을 만듭니다. 해당 계정의 **Workers Scripts: Edit**, **Workers R2 Storage: Edit**, **Account Settings: Read** 권한을 허용합니다. 사용자 지정 도메인은 별도 설정입니다.
5. GitHub 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 아래 4개 값을 등록합니다.

| GitHub secret 이름 | 넣을 값 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `ADMIN_PASSWORD_HASH` | `npm run setup`으로 생성한 `.local/admin.json`의 해당 값 |
| `ADMIN_PASSWORD_SALT` | 같은 파일의 해당 값 |

해시와 salt도 저장소 파일로 커밋하지 말고 GitHub Secrets로만 등록하세요. GitHub CLI를 사용한다면 `gh auth login`을 마치고, 원격 저장소가 연결된 폴더에서 `npm run secrets:github`을 실행해 관리자 비밀값 2개를 자동 등록할 수 있습니다. Cloudflare 값 2개는 별도로 등록하세요.

### GitHub Actions로 배포

1. GitHub 저장소 **Actions → Deploy full website → Run workflow**를 누릅니다.
2. 워크플로는 의존성 설치 → 빌드 → 테스트 → Worker 배포 → 관리자 비밀값 설정을 실행합니다.
3. 성공한 배포 로그에 표시되는 `https://shuffle-studio.<계정>.workers.dev` 주소를 엽니다. 처음에는 비밀값 설정이 끝날 때까지 관리자 로그인이 잠시 준비 상태일 수 있습니다.
4. 상단 **관리자**에서 직접 설정한 비밀번호로 로그인합니다.

워크플로는 수동 실행 방식입니다. 코드를 수정해 GitHub에 올린 후 같은 워크플로를 다시 실행하세요. 동일한 버킷을 계속 사용하면 저장한 콘텐츠가 유지됩니다.

### 내 PC에서 직접 배포하는 방법

```bash
npx wrangler login
npx wrangler r2 bucket create shuffle-studio-media
npm run deploy
npm run secrets:cloudflare
```

버킷이 이미 있으면 `bucket create`는 생략하세요. `npm run secrets:cloudflare`는 로컬 `npm run setup`에서 생성한 관리자 설정을 Cloudflare에 전송합니다. 비밀값은 명령 인자나 추적 파일에 넣지 않습니다.

## 4. GitHub Pages로 디자인만 배포

1. GitHub 저장소 **Settings → Pages → Source → GitHub Actions**를 선택합니다.
2. **Actions → Deploy Pages design preview → Run workflow**를 실행합니다.
3. 성공 후 Pages 주소를 열면 디자인 미리보기가 표시됩니다. 프로젝트 저장소의 하위 경로에서도 작동합니다.

이 방식은 관리자·업로드 기능을 제공하지 않습니다. 전체 기능은 앞의 Cloudflare 방식을 사용하세요.

## 관리자 사용

- 로그인 후 점선으로 표시된 제목·본문을 눌러 수정하고 **저장하고 종료**를 누릅니다.
- 글자를 선택한 뒤 **글자 색상**에서 색상을 적용할 수 있습니다. **완료 → 저장하고 종료**로 반영합니다.
- **사진·영상 관리**에서 학원 정보, 강사진, 6개 커리큘럼, 영상, 페이지 문구를 수정합니다.
- 사진은 JPG·PNG·WebP·GIF 최대 10MB, 영상은 MP4·WebM 최대 500MB 또는 YouTube 링크를 지원합니다.
- 영상은 8MB 단위로 나눠 전송하며 진행률·취소·재시도를 제공합니다. 완료 후 **변경사항 저장**을 눌러야 게시됩니다.
- 인증 만료 시 편집창을 유지합니다. **다시 로그인 → 업로드 다시 시도**를 누르세요.
- 상단 **관리자 → 로그아웃**으로 편집 모드를 종료합니다. 저장하지 않은 편집이 있으면 버릴지 확인합니다.

## 파일 구성

```text
public/index.html        화면, 스타일, 관리자 UI
worker.mjs               인증, 콘텐츠 API, 미디어 응답
uploads.mjs              R2 분할 업로드 API
text-colors.mjs          글자 색상 구간 저장·검증
local-server.mjs         로컬 실행용 HTTP 서버
local-storage.mjs        로컬 저장소
setup.mjs                관리자 비밀번호 설정
build.mjs                Worker 빌드
wrangler.jsonc           Cloudflare 설정
scripts/                 배포 비밀값·Pages 빌드 도구
.github/workflows/       GitHub Actions 배포 2종
test.mjs                 기능 테스트
preview.html             직접 열 수 있는 정적 디자인 미리보기
```

`npm run build && npm test`로 검증합니다. 실제 브라우저의 모바일 화면·파일 선택·재생은 배포 후 확인하세요. MP4·WebM 확장자가 맞아도 영상 코덱에 따라 브라우저 재생 지원은 다를 수 있습니다.

## 데이터와 운영

Cloudflare R2가 콘텐츠, 업로드 파일, 관리자 세션을 보관합니다. 소스만 복사하면 기존 운영 데이터가 자동 이전되지는 않습니다. R2 버킷을 삭제하거나 이름을 바꾸면 기존 데이터에 접근할 수 없으므로 별도 백업을 유지하세요. 강사·영상 목록에서 삭제해도 원본 파일 자체는 버킷에 남습니다. 업로드를 끝내지 않고 창을 닫으면 임시 업로드가 남을 수 있습니다.

이 저장소는 새 Cloudflare 사이트를 배포하며 기존 ChatGPT Sites의 비공개 접근 정책을 이전하지 않습니다. Cloudflare 기본 주소는 일반 방문자에게 공개되며, 콘텐츠 변경 API는 관리자 로그인으로 보호됩니다. 방문자까지 제한하려면 Cloudflare Access를 별도로 설정하세요.
