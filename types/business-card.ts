/**
 * 명함 데이터 타입 정의
 */

export interface BusinessCard {
  /** 고유 ID */
  id: string;
  
  /** 회사명 */
  company: string;
  
  /** 이름 */
  name: string;
  
  /** 직책 */
  title: string;
  
  /** 전화번호 */
  phone: string;
  
  /** 이메일 */
  email: string;
  
  /** 메모 */
  memo: string;
  
  /** 명함 앞면 이미지 (base64 또는 URL) */
  imageFront: string;
  
  /** 명함 뒷면 이미지 (선택) */
  imageBack?: string;
  
  /** OCR 원본 텍스트 */
  rawOcrText: string;
  
  /** 즐겨찾기 여부 */
  favorite: boolean;
  
  /** 생성일시 */
  createdAt: string;
  
  /** 수정일시 */
  updatedAt: string;
}

/**
 * 명함 생성 입력 타입
 */
export interface CreateBusinessCardInput {
  company: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  memo: string;
  imageFront: string;
  imageBack?: string;
  rawOcrText: string;
  favorite?: boolean;
}

/**
 * 명함 수정 입력 타입
 */
export interface UpdateBusinessCardInput {
  id: string;
  company?: string;
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  memo?: string;
  imageFront?: string;
  imageBack?: string;
  rawOcrText?: string;
  favorite?: boolean;
}

/**
 * OCR 추출 결과 타입
 */
export interface OcrResult {
  /** 추출된 원본 텍스트 */
  rawText: string;
  
  /** 파싱된 회사명 */
  company: string;
  
  /** 파싱된 이름 */
  name: string;
  
  /** 파싱된 직책 */
  title: string;
  
  /** 파싱된 전화번호 */
  phone: string;
  
  /** 파싱된 이메일 */
  email: string;
  
  /** OCR 신뢰도 (0-1) */
  confidence: number;
}

/**
 * 회사별 그룹핑 결과
 */
export interface CompanyGroup {
  /** 회사명 */
  company: string;
  
  /** 해당 회사 명함 개수 */
  count: number;
  
  /** 해당 회사 명함 목록 */
  cards: BusinessCard[];
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  /** 현재 페이지 (1부터 시작) */
  currentPage: number;
  
  /** 전체 페이지 수 */
  totalPages: number;
  
  /** 페이지당 아이템 수 */
  itemsPerPage: number;
  
  /** 전체 아이템 수 */
  totalItems: number;
}

/**
 * JSON export/import 포맷
 */
export interface BusinessCardExport {
  /** 버전 정보 */
  version: string;
  
  /** export 일시 */
  exportedAt: string;
  
  /** 명함 데이터 */
  cards: BusinessCard[];
}
