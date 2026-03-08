# 🔧 핵심 로직 설명

## 1. 폴더 구조

```
20260308_사진명함철/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 루트 레이아웃
│   ├── page.tsx             # 홈 화면 (명함첩)
│   ├── globals.css          # 전역 스타일
│   └── add/
│       └── page.tsx         # 명함 등록 화면
│
├── components/              # React 컴포넌트
│   ├── BusinessCardGrid.tsx          # 명함 카드 그리드
│   ├── BusinessCardItem.tsx          # 명함 카드 아이템
│   ├── BusinessCardDetailModal.tsx   # 명함 상세 모달
│   ├── CompanyFilter.tsx             # 회사 필터
│   ├── PaginationControls.tsx        # 페이지네이션
│   ├── ImageUploader.tsx             # 이미지 업로더
│   └── OcrPreviewForm.tsx            # OCR 결과 폼
│
├── lib/                     # 핵심 로직
│   ├── ocr.ts              # OCR 처리
│   ├── storage.ts          # IndexedDB 저장
│   └── utils.ts            # 유틸리티 함수
│
├── types/                   # TypeScript 타입
│   └── business-card.ts    # 명함 데이터 타입
│
├── data/                    # 샘플 데이터
│   └── sample-cards.ts     # 더미 명함
│
└── 설정 파일들
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.js
    └── postcss.config.js
```

---

## 2. 핵심 로직 상세 설명

### 2.1 OCR 텍스트 추출 (`lib/ocr.ts`)

#### 주요 함수

**`extractTextFromImage(imageData: string): Promise<string>`**
- Tesseract.js를 사용하여 이미지에서 텍스트 추출
- 한글(kor) + 영어(eng) 동시 인식
- 진행 상황 로깅 지원

**`parseOcrText(rawText: string): OcrResult`**
- 추출된 텍스트를 필드별로 파싱
- 정규식 기반 패턴 매칭

**파싱 규칙**:

```typescript
// 이메일 추출
const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// 전화번호 추출 (한국 번호 패턴)
const phonePatterns = [
  /010[-\s]?\d{4}[-\s]?\d{4}/g,      // 010-1234-5678
  /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g,
  /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g,
];

// 회사명: 상위 3줄 중 가장 긴 줄 (이메일/전화 제외)
const company = extractCompany(lines);

// 이름: 2-4글자 한글 또는 영문 이름 패턴
const namePattern = /^[가-힣]{2,4}$|^[A-Z][a-z]+\s[A-Z][a-z]+$/;

// 직책: 키워드 기반 (대표, 이사, 팀장, CEO 등)
const titleKeywords = ['대표', '이사', 'CEO', 'Manager', ...];
```

**신뢰도 계산**:
```typescript
// 추출된 필드 개수 기반
const fieldsFound = [email, phone, company, name, title].filter(Boolean).length;
const confidence = fieldsFound / 5;  // 0.0 ~ 1.0
```

---

### 2.2 데이터 저장 (`lib/storage.ts`)

#### IndexedDB 설정

```typescript
import localforage from 'localforage';

const cardStore = localforage.createInstance({
  name: 'BusinessCardApp',      // 데이터베이스 이름
  storeName: 'cards',            // 스토어 이름
  description: '명함 데이터 저장소',
});

const STORAGE_KEY = 'business_cards';
```

#### 주요 함수

**`getAllCards(): Promise<BusinessCard[]>`**
- 전체 명함 목록 불러오기
- 실패 시 빈 배열 반환

**`createCard(input: CreateBusinessCardInput): Promise<BusinessCard>`**
- 새 명함 생성
- 고유 ID 자동 생성
- createdAt/updatedAt 타임스탬프 추가

**`getCardsByCompany(): Promise<CompanyGroup[]>`**
- 회사별 그룹핑
- 회사명 가나다순 정렬
- "미분류"는 맨 뒤로

그룹핑 로직:
```typescript
const groups = cards.reduce((acc, card) => {
  const company = card.company || '미분류';
  if (!acc[company]) {
    acc[company] = [];
  }
  acc[company].push(card);
  return acc;
}, {} as Record<string, BusinessCard[]>);
```

**`exportToJson(): Promise<string>`**
- JSON 포맷으로 내보내기
- 버전 정보 포함

**`importFromJson(jsonString: string): Promise<number>`**
- JSON 파일에서 가져오기
- 중복 제거 (ID 기준)
- 추가된 명함 개수 반환

---

### 2.3 페이지네이션 로직 (`app/page.tsx`)

#### 반응형 페이지당 아이템 수

```typescript
const [itemsPerPage, setItemsPerPage] = useState(6);

useEffect(() => {
  const updateItemsPerPage = () => {
    if (window.innerWidth < 768) {
      setItemsPerPage(4);  // 모바일: 4개
    } else {
      setItemsPerPage(6);  // 데스크탑: 6개
    }
  };

  updateItemsPerPage();
  window.addEventListener('resize', updateItemsPerPage);
  return () => window.removeEventListener('resize', updateItemsPerPage);
}, []);
```

#### 페이지네이션 정보 계산

```typescript
const pagination: PaginationInfo = useMemo(() => {
  const totalItems = filteredCards.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
  };
}, [filteredCards, currentPage, itemsPerPage]);
```

#### 현재 페이지 표시 항목

```typescript
const visibleCards = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return cards.slice(startIndex, endIndex);
}, [cards, currentPage, itemsPerPage]);
```

---

### 2.4 회사별 필터링 로직

```typescript
const filteredCards = useMemo(() => {
  if (!selectedCompany) {
    return cards;  // 전체 보기
  }
  return cards.filter((card) => {
    const company = card.company || '미분류';
    return company === selectedCompany;
  });
}, [cards, selectedCompany]);
```

필터 변경 시 페이지 초기화:
```typescript
onCompanyChange={(company) => {
  setSelectedCompany(company);
  setCurrentPage(1);  // 1페이지로 리셋
}}
```

---

### 2.5 이미지 압축 (`lib/utils.ts`)

```typescript
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> {
  // 1. FileReader로 이미지 읽기
  // 2. Canvas에 그리기
  // 3. 비율 유지하며 리사이즈
  // 4. JPEG 압축 (quality 0.8)
  // 5. base64 문자열 반환
}
```

**효과**:
- 원본 3MB → 압축 후 200-300KB
- IndexedDB 저장 공간 절약
- OCR 처리 속도 향상

---

### 2.6 명함 등록 흐름 (`app/add/page.tsx`)

**Step 1: 이미지 업로드**
```typescript
const [step, setStep] = useState<'upload' | 'ocr' | 'form'>('upload');
```

**Step 2: OCR 처리**
```typescript
const handleOcrStart = async () => {
  setIsProcessing(true);
  setStep('ocr');
  
  const result = await processBusinessCardWithProgress(
    imageData,
    (progress) => setOcrProgress(Math.round(progress * 100))
  );
  
  setOcrResult(result);
  setStep('form');
};
```

**Step 3: 정보 입력 및 저장**
```typescript
const handleFormSubmit = async (formData) => {
  await createCard({
    ...formData,
    imageFront: imageData,
    rawOcrText: ocrResult?.rawText || '',
  });
  
  router.push('/');
};
```

---

## 3. 데이터 흐름도

```
[사용자] → 이미지 업로드
    ↓
[ImageUploader] → base64 변환
    ↓
[OCR 처리] → Tesseract.js
    ↓
[텍스트 파싱] → 필드 추출
    ↓
[OcrPreviewForm] → 사용자 수정
    ↓
[storage.createCard()] → IndexedDB 저장
    ↓
[라우터 이동] → 홈 화면
    ↓
[getAllCards()] → 데이터 로드
    ↓
[회사별 그룹핑] → CompanyGroup[]
    ↓
[필터링] → selectedCompany 적용
    ↓
[페이지네이션] → 현재 페이지 아이템만
    ↓
[BusinessCardGrid] → 화면 표시
```

---

## 4. 상태 관리

### 홈 화면 (`app/page.tsx`)

```typescript
const [cards, setCards] = useState<BusinessCard[]>([]);           // 전체 명함
const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]); // 회사별 그룹
const [selectedCompany, setSelectedCompany] = useState<string>('');     // 선택된 회사
const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null); // 상세 모달
const [currentPage, setCurrentPage] = useState(1);                 // 현재 페이지
const [itemsPerPage, setItemsPerPage] = useState(6);              // 페이지당 개수
const [isLoading, setIsLoading] = useState(true);                 // 로딩 상태
```

### 등록 화면 (`app/add/page.tsx`)

```typescript
const [step, setStep] = useState<'upload' | 'ocr' | 'form'>('upload'); // 현재 단계
const [imageData, setImageData] = useState<string>('');           // 이미지 데이터
const [ocrResult, setOcrResult] = useState<OcrResult | null>(null); // OCR 결과
const [ocrProgress, setOcrProgress] = useState<number>(0);        // OCR 진행률
const [isProcessing, setIsProcessing] = useState(false);          // 처리 중
const [isSaving, setIsSaving] = useState(false);                  // 저장 중
```

---

## 5. 성능 최적화

### useMemo 사용

```typescript
// 필터링된 카드 목록 (메모이제이션)
const filteredCards = useMemo(() => {
  // 필터 로직
}, [cards, selectedCompany]);

// 페이지네이션 정보 (메모이제이션)
const pagination = useMemo(() => {
  // 계산 로직
}, [filteredCards, currentPage, itemsPerPage]);
```

**효과**: 불필요한 재계산 방지

### 이미지 압축

- 업로드 시 자동 압축 (1200px, quality 0.8)
- 메모리 사용량 감소
- 저장 공간 절약

---

## 6. 에러 처리

### OCR 실패 시

```typescript
try {
  const result = await processBusinessCard(imageData);
  setOcrResult(result);
} catch (error) {
  console.error('OCR Error:', error);
  // 빈 결과로 폼 진행 (수동 입력 가능)
  setOcrResult({
    rawText: '',
    company: '',
    name: '',
    title: '',
    phone: '',
    email: '',
    confidence: 0,
  });
}
```

### 저장 실패 시

```typescript
try {
  await createCard(data);
  alert('명함이 저장되었습니다!');
} catch (error) {
  console.error('Save Error:', error);
  alert('명함 저장에 실패했습니다.');
}
```

---

## 7. TypeScript 타입 안정성

모든 데이터는 타입이 명확히 정의되어 있습니다:

```typescript
// types/business-card.ts
export interface BusinessCard {
  id: string;
  company: string;
  name: string;
  // ... 전체 필드
}

export interface OcrResult {
  rawText: string;
  company: string;
  // ... OCR 결과 필드
}
```

**효과**:
- 컴파일 타임 에러 감지
- IDE 자동완성 지원
- 리팩토링 안정성

---

## 8. 주요 안티패턴 피하기

### ❌ 잘못된 방식

```typescript
// localStorage에 이미지 직접 저장 (용량 제한 5MB)
localStorage.setItem('cards', JSON.stringify(cards));
```

### ✅ 올바른 방식

```typescript
// IndexedDB 사용 (용량 거의 무제한)
await cardStore.setItem('business_cards', cards);
```

---

## 9. 확장 포인트

### OCR 엔진 교체

```typescript
// lib/ocr.ts에서 교체 가능
export async function extractTextFromImage(imageData: string): Promise<string> {
  // Tesseract.js 대신 다른 엔진 사용
  return await cloudOcrService(imageData);
}
```

### 저장소 교체

```typescript
// lib/storage.ts에서 교체 가능
// IndexedDB → Supabase로 변경
export async function getAllCards(): Promise<BusinessCard[]> {
  const { data } = await supabase.from('cards').select('*');
  return data || [];
}
```

---

## 10. 초보자를 위한 팁

### Next.js App Router 이해

- `app/page.tsx` = 홈 화면 (`/`)
- `app/add/page.tsx` = 추가 화면 (`/add`)
- `'use client'` = 클라이언트 컴포넌트 (상태, 이벤트 사용)

### IndexedDB vs localStorage

- localStorage: 5MB 제한, 문자열만
- IndexedDB: 수백 MB, 복잡한 객체 저장 가능

### Tesseract.js

- 브라우저에서 동작하는 OCR 라이브러리
- 첫 실행 시 언어 데이터 다운로드 (인터넷 필요)
- 이후 캐시되어 오프라인 가능
