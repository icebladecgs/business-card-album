# 🚀 확장 계획 및 개선 방향

## A. 현재 MVP에서 포기한 것

### 기능적 제약

1. **실시간 카메라 촬영**
   - 현재: 파일 업로드만 지원
   - 이유: MVP 범위 축소, 파일 업로드로 충분히 검증 가능

2. **이미지 보정 기능**
   - 현재: 업로드한 이미지를 그대로 사용
   - 미제공: 회전, 크롭, 대비 조정, 왜곡 보정
   - 이유: OCR 정확도보다 "수동 수정" UX에 집중

3. **백엔드 서버 연동**
   - 현재: 100% 로컬 저장 (IndexedDB)
   - 미제공: 클라우드 동기화, 다중 기기 지원
   - 이유: 설치/운영 복잡도 제거, 프라이버시 보호

4. **검색 기능**
   - 현재: 회사별 필터만 제공
   - 미제공: 이름/전화번호/이메일 검색
   - 이유: "명함책 넘기기" UX에 집중

5. **태그 시스템**
   - 현재: 회사명 분류만
   - 미제공: 프로젝트별, 날짜별, 커스텀 태그
   - 이유: 복잡도 증가 방지

6. **명함 공유**
   - 현재: JSON export/import만
   - 미제공: 링크 공유, QR 코드 생성, vCard 내보내기
   - 이유: MVP 우선순위 외

7. **명함 수정 화면**
   - 현재: 상세 모달에서 수정 버튼만 표시 (기능 미구현)
   - 이유: 시간 절약, 삭제 후 재등록으로 대체 가능

8. **다국어 지원**
   - 현재: 한국어 UI만
   - 이유: 타겟 사용자가 국내 기준

---

## B. 2차 버전에서 붙일 기능

### Phase 2 (1-2주 내)

1. **명함 수정 기능**
   - `/edit/[id]` 페이지 추가
   - OCR 재실행 옵션

2. **카메라 촬영**
   - `navigator.mediaDevices.getUserMedia()` API 사용
   - 실시간 미리보기
   - 모바일 최적화

3. **검색 기능**
   - 상단 검색바 추가
   - 이름/회사/전화/이메일 통합 검색
   - 검색 결과 하이라이팅

4. **정렬 옵션**
   - 최신순, 이름순, 회사명순
   - 즐겨찾기 우선 정렬

### Phase 3 (백엔드 연동)

5. **Supabase 연동**
   - 사용자 인증 (이메일/소셜 로그인)
   - 클라우드 저장 및 동기화
   - 다중 기기 지원
   - 이미지 저장은 Supabase Storage 사용

6. **Firebase 대안**
   - Firebase Authentication
   - Firestore Database
   - Firebase Storage

### Phase 4 (고도화)

7. **이미지 보정**
   - 명함 모서리 자동 감지
   - 원근 왜곡 보정
   - 대비/밝기 자동 조정
   - 회전 기능

8. **태그 시스템**
   - 커스텀 태그 추가
   - 다중 태그 지원
   - 태그별 필터링

9. **명함 공유**
   - 개별 명함 링크 공유
   - QR 코드 생성
   - vCard (.vcf) 내보내기
   - 연락처 앱 직접 추가

10. **통계 대시보드**
    - 회사별 명함 수 차트
    - 등록 일자별 그래프
    - 즐겨찾기 명함 통계

---

## C. OCR 정확도를 높이는 현실적인 방법

### 1. **이미지 전처리 강화**

```typescript
// lib/image-processing.ts
export async function preprocessForOcr(imageData: string): Promise<string> {
  // 1. 그레이스케일 변환
  // 2. 대비 향상
  // 3. 노이즈 제거
  // 4. 이진화 (Binary Thresholding)
  return processedImage;
}
```

**효과**: OCR 정확도 20-30% 향상

### 2. **다중 OCR 엔진 조합**

현재: Tesseract.js만 사용  
개선: 여러 엔진 결과를 병합

```typescript
// lib/ocr-advanced.ts
export async function multiEngineOcr(imageData: string): Promise<OcrResult> {
  const results = await Promise.all([
    tesseractOcr(imageData),      // 무료, 오픈소스
    ocrSpaceApi(imageData),        // 무료 API (월 25,000건)
    googleVisionApi(imageData),    // 유료, 고정확도
  ]);
  
  return mergeResults(results);
}
```

**효과**: 신뢰도 40-50% 향상

### 3. **클라우드 OCR API 사용**

추천 서비스:
- **Google Cloud Vision API** - 가장 정확, 한글 지원 우수
- **Azure Document Intelligence** - 명함 전용 모델 제공
- **Naver Clova OCR** - 한국어 특화, 명함 인식 강점
- **OCR.space** - 무료 티어 제공

구현 예시:

```typescript
// lib/ocr-cloud.ts
export async function naverClovaOcr(imageData: string): Promise<OcrResult> {
  const response = await fetch('https://naveropenapi.apigw.ntruss.com/...', {
    method: 'POST',
    headers: {
      'X-OCR-SECRET': process.env.NAVER_OCR_SECRET,
    },
    body: imageData,
  });
  
  return parseNaverResult(await response.json());
}
```

**비용**: Naver Clova 월 1,000건 무료

### 4. **기계학습 기반 필드 추출**

Tesseract의 단순 텍스트 추출을 넘어서:

- 명함 레이아웃 학습 모델 적용
- 위치 기반 필드 인식
- NER (Named Entity Recognition) 모델 사용

예시 라이브러리:
- TensorFlow.js
- ONNX Runtime Web

### 5. **사용자 피드백 학습**

```typescript
// types/ocr-feedback.ts
interface OcrFeedback {
  originalOcr: OcrResult;
  userCorrected: BusinessCard;
  timestamp: string;
}

// 사용자가 수정한 데이터를 저장하여
// 패턴 분석 및 개선에 활용
```

---

## D. 리멤버 수준으로 가려면 필요한 추가 요소

### 1. **AI 기반 명함 인식**

- **컴퓨터 비전 모델**: 명함 영역 자동 감지 및 크롭
- **딥러닝 OCR**: 손글씨/특수 폰트 인식
- **자동 필드 매칭**: 직책/회사/이름 구분 정확도 95%+

### 2. **명함 데이터 정규화**

```typescript
// lib/normalization.ts
interface CompanyNormalization {
  '(주)삼성전자': 'Samsung Electronics',
  '삼성전자': 'Samsung Electronics',
  'SAMSUNG': 'Samsung Electronics',
  // AI 기반 자동 매칭
}
```

- 회사명 자동 통합
- 전화번호 포맷 정규화
- 중복 명함 자동 감지

### 3. **CRM 기능**

- 명함 교환 이력 (언제, 어디서 받았는지)
- 최근 연락 일자 기록
- 미팅 노트 및 follow-up 알림
- 생일/기념일 자동 알림

### 4. **네트워크 기능**

- 명함 교환 (디지털)
- 연락처 업데이트 알림 (상대방이 정보 변경 시)
- 소셜 프로필 연동 (LinkedIn, Facebook)

### 5. **비즈니스 인텔리전스**

- 업종별 명함 분석
- 네트워크 그래프 시각화
- 인맥 추천 시스템

### 6. **엔터프라이즈 기능**

- 팀 공유 명함첩
- 권한 관리
- 회사 디렉토리 연동
- 감사 로그

### 7. **UX 고도화**

- AR 카메라 (명함 자동 인식 및 안내선)
- 음성 명령 지원
- 다크 모드
- 접근성 (스크린 리더 지원)

### 8. **성능 최적화**

- 이미지 lazy loading
- Virtual scrolling (수천 개 명함 처리)
- PWA (Progressive Web App) 전환
- 오프라인 모드

### 9. **보안**

- 종단간 암호화 (E2E Encryption)
- 생체 인증 (Face ID, Touch ID)
- GDPR/개인정보보호법 준수

### 10. **비즈니스 모델**

- Freemium: 무료 50장, 유료 무제한
- OCR 정확도 pro 모드
- 프리미엄 기능 구독

---

## 요약

### 현재 MVP 완성도: 40%
- ✅ 핵심 명함 등록/조회
- ✅ 기본 OCR
- ✅ 로컬 저장
- ✅ 회사별 분류
- ✅ 페이지네이션

### 2차 목표 (70%):
- 수정/검색 기능
- 카메라 촬영
- 클라우드 저장

### 리멤버 수준 (100%):
- AI 고도화
- CRM 기능
- 네트워크 기능
- 엔터프라이즈

**현실적인 로드맵**: 개인 개발자 기준 3-6개월

---

## 빠른 개선 우선순위 (투입 시간 대비 효과)

1. **Naver Clova OCR 연동** (1일) → OCR 정확도 대폭 상승
2. **검색 기능** (1일) → 사용성 크게 개선
3. **명함 수정** (1일) → MVP 완성도 향상
4. **Supabase 연동** (3일) → 다중 기기 사용 가능
5. **카메라 촬영** (2일) → 모바일 UX 완성

**총 8일 투입 시 사용 가능한 프로덕트 완성**
