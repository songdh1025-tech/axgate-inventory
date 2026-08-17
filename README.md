# AXGATE Inventory GitHub V2

기존 `axgate-inventory.html`을 기반으로 GitHub Pages + Cloudflare Worker 구조로 정리한 버전입니다.

## 포함 기능
- 기존 재고/유지보수/사용자 UI 유지
- GitHub Token을 브라우저에 저장하지 않는 Worker 저장
- 모바일 바코드/QR 스캔 (Code128 등)
- 스캔 결과가 기존 재고면 상세조회, 신규면 등록 화면으로 이동
- 장비 사진 최대 3장, JPEG 자동 압축
- QR 자산 라벨/인쇄
- Excel XLSX 내보내기/일괄 등록
- JSON/CSV 백업
- PWA 설치
- Worker가 GitHub SHA 충돌을 재시도
- Worker 미설정 시 브라우저 로컬 스냅샷 fallback

## GitHub Pages
1. 이 폴더 내용을 GitHub 저장소의 `main` 브랜치에 업로드합니다.
2. Settings → Pages → Deploy from a branch → `main` / `/root` 선택.
3. HTTPS 주소로 접속합니다.

## Cloudflare Worker
`worker.js`를 Worker에 배포하고 다음 Secret/Variable을 설정합니다.
- `GITHUB_TOKEN`: Fine-grained PAT, Contents Read and Write
- `GITHUB_OWNER`: GitHub 사용자/조직
- `GITHUB_REPO`: 저장소명
- `GITHUB_BRANCH`: 보통 `main`

Worker URL을 웹 화면의 `데이터 백업/복원 → Worker 설정`에서 한 번 입력하면 됩니다.

## 데이터 파일
Worker가 최초 저장할 때 아래 파일을 자동 생성합니다.
- `data/inven.json`
- `data/maint.json`

## 주의
사용자 비밀번호는 공개 GitHub JSON에 저장하지 않도록 현재 브라우저별 localStorage 인증으로 유지했습니다. 여러 기기에서 통합 로그인/권한을 사용하려면 다음 단계에서 Ubuntu/DB 또는 별도 인증 서비스를 붙이는 것이 안전합니다.

카메라 스캔은 HTTPS 환경이 필요합니다.

## Wrangler 배포 예시

```bash
npm install -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_OWNER
wrangler secret put GITHUB_REPO
wrangler deploy
```

`GITHUB_BRANCH`는 `wrangler.toml`의 `main` 값을 사용합니다.

## 최초 테스트

GitHub Pages에 올리기 전에 로컬에서도 가능합니다.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

단, 모바일 카메라는 보통 HTTPS 환경이 필요하므로 실제 스캔 테스트는 GitHub Pages 주소에서 하세요.
