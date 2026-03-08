# 명함첩 MVP (Business Card Album)

## 🎯 프로젝트 목표

휴대폰으로 명함 사진을 업로드하면 OCR로 자동 추출하고, 사용자가 수정한 뒤 회사명 기준으로 자동 분류되어 명함첩처럼 페이지를 넘기며 볼 수 있는 앱

## ✨ 핵심 기능

- 📸 명함 이미지 업로드
- 🔍 OCR 자동 텍스트 추출 (Tesseract.js)
- ✏️ OCR 결과 수동 수정
- 🏢 회사명 기준 자동 분류
- 📖 카드형 페이지네이션 UI
- 💾 IndexedDB 로컬 저장
- 📤 JSON import/export

## 📱 화면 구성

1. **홈 화면** (`/`) - 명함첩 메인
2. **등록 화면** (`/add`) - 명함 추가
3. **상세 모달** - 명함 상세보기/수정

## 🛠 기술 스택

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **OCR**: Tesseract.js
- **Storage**: IndexedDB (localforage)
- **Animation**: Framer Motion
- **Icons**: Lucide React

## 📦 설치 방법

```bash
npm install
```

## 🚀 실행 방법

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 📁 프로젝트 구조

```
/app
  /add
    page.tsx          # 명함 등록 화면
  layout.tsx          # 루트 레이아웃
  page.tsx            # 홈 화면 (명함첩)
  globals.css         # 전역 스타일

/components
  BusinessCardGrid.tsx          # 명함 카드 그리드
  BusinessCardItem.tsx          # 명함 카드 아이템
  BusinessCardDetailModal.tsx   # 명함 상세 모달
  CompanyFilter.tsx             # 회사 필터
  PaginationControls.tsx        # 페이지네이션
  ImageUploader.tsx             # 이미지 업로더
  OcrPreviewForm.tsx            # OCR 결과 폼

/lib
  ocr.ts          # OCR 로직
  storage.ts      # IndexedDB 저장 로직
  utils.ts        # 유틸리티 함수

/types
  business-card.ts   # 타입 정의

/data
  sample-cards.ts    # 샘플 데이터
```

## 🔄 2차 버전 계획

- 실시간 카메라 촬영
- 이미지 보정 (회전/대비/크롭)
- 검색 기능
- 태그 시스템
- Supabase/Firebase 백엔드 연동
- 명함 공유 기능
