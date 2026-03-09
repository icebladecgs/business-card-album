export interface BusinessCard {
  id: string;
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  memo: string;
  imageFront?: string;
  rawOcrText?: string;
  favorite: boolean;
  categories?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessCardInput {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  memo: string;
  imageFront?: string;
  rawOcrText?: string;
  favorite?: boolean;
  categories?: string[];
}

export interface UpdateBusinessCardInput {
  id: string;
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  memo?: string;
  imageFront?: string;
  rawOcrText?: string;
  favorite?: boolean;
  categories?: string[];
}

export interface CompanyGroup {
  company: string;
  count: number;
  cards: BusinessCard[];
}

export interface BusinessCardExport {
  version: string;
  exportedAt: string;
  cards: BusinessCard[];
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface OcrResult {
  rawText: string;
  company: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  confidence: number;
}

export const DEFAULT_CATEGORIES = [
  '친구',
  '회사동료',
  '초등동창',
  '중등동창',
  '고등동창',
  '대학동창',
  '재수친구',
  '군대친구',
];

export const CATEGORIES_STORAGE_KEY = 'businesscard_categories';
