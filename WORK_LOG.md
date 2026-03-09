# 작업 이력 — 명함첩 PWA

날짜: 2026-03-09

---

## 배포 주소
- **서비스 URL**: https://business-card-album.vercel.app
- **Vercel 대시보드**: https://vercel.com/icebladecgs-3923s-projects/business-card-album

---

## 작업 내용

### 1. Node.js 환경 설치
- winget으로 Node.js LTS v24.14.0 설치
- npm v11.9.0 사용 가능

### 2. PWA 설정 (홈 화면 주소창 제거)
| 파일 | 내용 |
|---|---|
| `app/manifest.ts` | 웹앱 매니페스트 (display: standalone, 아이콘, 테마 색상) |
| `app/layout.tsx` | apple-mobile-web-app-capable, themeColor, viewport 메타 |
| `public/sw.js` | 서비스워커 (PWA 설치 요건 충족) |
| `components/PwaRegister.tsx` | 서비스워커 클라이언트 등록 컴포넌트 |
| `public/icon-192.png` | 앱 아이콘 192×192 |
| `public/icon-512.png` | 앱 아이콘 512×512 |
| `public/apple-icon.png` | iOS 애플 터치 아이콘 180×180 |

### 3. 홈 화면 설치 버튼
| 파일 | 내용 |
|---|---|
| `components/InstallAppButton.tsx` | 헤더 우측에 "홈 화면에 추가" 버튼 |
| `app/page.tsx` | 버튼 헤더 연결 |

**기기별 동작**
- Android Chrome: 설치 팝업 직접 호출
- iPhone Safari: 공유 버튼 안내 말풍선 표시
- 이미 설치된 경우: 버튼 자동 숨김

### 4. next.config.js 정리
- `swcMinify` 제거 (Next.js 14 deprecated)
- `images.domains` → `remotePatterns` 교체

### 5. Vercel 배포
```bash
npx vercel --prod --yes
```

---

## 홈 화면에서 앱 모드로 실행하는 방법

1. 휴대폰에서 https://business-card-album.vercel.app 접속
2. Safari/Chrome 본브라우저 사용 (카톡 내장브라우저 X)
3. 헤더의 "홈 화면에 추가" 버튼 탭
4. 기존 바로가기가 있으면 삭제 후 재추가
5. 홈 화면 아이콘으로 실행 → 주소창 없이 앱처럼 실행됨

---

## 이후 코드 변경 사항 배포 방법

```bash
# 새 터미널에서
cd C:\Dev\Projects\business-card-album
npx vercel --prod --yes
```
