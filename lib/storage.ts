import localforage from 'localforage';
import type {
  BusinessCard,
  CreateBusinessCardInput,
  UpdateBusinessCardInput,
  CompanyGroup,
  BusinessCardExport,
} from '@/types/business-card';
import { DEFAULT_CATEGORIES, CATEGORIES_STORAGE_KEY } from '@/types/business-card';
import { generateId } from './utils';
import { getCurrentUser, getSupabaseClient } from './supabase';

/**
 * IndexedDB 스토어 초기화
 */
const cardStore = localforage.createInstance({
  name: 'BusinessCardApp',
  storeName: 'cards',
  description: '명함 데이터 저장소',
});

const STORAGE_KEY = 'business_cards';
const VERSION = '1.0.0';

type SpreadsheetRow = Record<string, unknown>;

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '').replace(/[()\[\]\-_.]/g, '');
}

function pickFirstValue(row: SpreadsheetRow, aliases: string[]): string {
  const normalizedAliasSet = new Set(aliases.map(normalizeHeader));

  for (const [key, raw] of Object.entries(row)) {
    if (!normalizedAliasSet.has(normalizeHeader(key))) continue;
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) return text;
  }

  return '';
}

function pickAllValues(row: SpreadsheetRow, aliases: string[]): string[] {
  const normalizedAliasSet = new Set(aliases.map(normalizeHeader));
  const values: string[] = [];

  for (const [key, raw] of Object.entries(row)) {
    if (!normalizedAliasSet.has(normalizeHeader(key))) continue;
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) values.push(text);
  }

  return values;
}

function parseCategoriesFromRow(row: SpreadsheetRow): string[] {
  const sourceValues = pickAllValues(row, [
    '보기',
    '보기구분',
    '구분',
    '관계',
    '관계구분',
    '카테고리',
    'category',
    'categories',
    'tag',
    'tags',
  ]);

  if (!sourceValues.length) return [];

  const splitTokens = sourceValues
    .flatMap((value) => value.split(/[;,/|\n]+/))
    .flatMap((value) => value.split('·'))
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(splitTokens));
}

function rowToCardInput(row: SpreadsheetRow): CreateBusinessCardInput {
  const name = pickFirstValue(row, ['name', '이름', '성명', '담당자', '담당자명']);
  const company = pickFirstValue(row, ['company', '회사', '회사명', '소속']);
  const title = pickFirstValue(row, ['title', '직책', '직급', '부서', 'position']);
  const phone = pickFirstValue(row, [
    'phone',
    '전화',
    '전화번호',
    '휴대폰',
    '휴대전화',
    '연락처',
    'mobile',
    'tel',
    'cell',
  ]);
  const email = pickFirstValue(row, ['email', '이메일', '메일', 'e-mail']);
  const memo = pickFirstValue(row, ['memo', '메모', '비고', 'note', 'notes']);
  const categories = parseCategoriesFromRow(row);

  return {
    name,
    company,
    title,
    phone,
    email,
    memo,
    favorite: false,
    categories,
  };
}

function makeDuplicateSignature(input: CreateBusinessCardInput): string {
  return [input.name, input.company, input.phone, input.email]
    .map((part) => part.trim().toLowerCase())
    .join('|');
}

interface CloudCardRow {
  id: string;
  user_id: string;
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  memo: string;
  image_front: string | null;
  raw_ocr_text: string | null;
  favorite: boolean;
  categories: string[] | null;
  created_at: string;
  updated_at: string;
}

function toCloudCardRow(card: BusinessCard, userId: string): CloudCardRow {
  return {
    id: card.id,
    user_id: userId,
    name: card.name,
    company: card.company,
    title: card.title,
    phone: card.phone,
    email: card.email,
    memo: card.memo,
    image_front: card.imageFront ?? null,
    raw_ocr_text: card.rawOcrText ?? null,
    favorite: card.favorite,
    categories: card.categories ?? [],
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}

function fromCloudCardRow(row: CloudCardRow): BusinessCard {
  return {
    id: row.id,
    name: row.name || '',
    company: row.company || '',
    title: row.title || '',
    phone: row.phone || '',
    email: row.email || '',
    memo: row.memo || '',
    imageFront: row.image_front || undefined,
    rawOcrText: row.raw_ocr_text || undefined,
    favorite: Boolean(row.favorite),
    categories: row.categories || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCloudContext(): Promise<{ userId: string; supabase: NonNullable<ReturnType<typeof getSupabaseClient>> } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  return { userId: user.id, supabase };
}

/**
 * 전체 명함 목록 불러오기
 */
export async function getAllCards(): Promise<BusinessCard[]> {
  try {
    const cloud = await getCloudContext();
    if (cloud) {
      const { data, error } = await cloud.supabase
        .from('business_cards')
        .select('*')
        .eq('user_id', cloud.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load cloud cards:', error);
        return [];
      }

      return (data as CloudCardRow[]).map(fromCloudCardRow);
    }

    const cards = await cardStore.getItem<BusinessCard[]>(STORAGE_KEY);
    return cards || [];
  } catch (error) {
    console.error('Failed to load cards:', error);
    return [];
  }
}

/**
 * 특정 명함 불러오기
 */
export async function getCardById(id: string): Promise<BusinessCard | null> {
  try {
    const cards = await getAllCards();
    return cards.find(card => card.id === id) || null;
  } catch (error) {
    console.error('Failed to get card:', error);
    return null;
  }
}

/**
 * 명함 생성
 */
export async function createCard(input: CreateBusinessCardInput): Promise<BusinessCard> {
  try {
    const newCard: BusinessCard = {
      id: generateId(),
      ...input,
      favorite: input.favorite || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cloud = await getCloudContext();
    if (cloud) {
      const row = toCloudCardRow(newCard, cloud.userId);
      const { error } = await cloud.supabase.from('business_cards').insert(row);
      if (error) throw error;
      return newCard;
    }

    const cards = await getAllCards();
    cards.push(newCard);
    await cardStore.setItem(STORAGE_KEY, cards);
    
    return newCard;
  } catch (error) {
    console.error('Failed to create card:', error);
    throw new Error('명함 생성에 실패했습니다.');
  }
}

/**
 * 명함 수정
 */
export async function updateCard(input: UpdateBusinessCardInput): Promise<BusinessCard> {
  try {
    const cloud = await getCloudContext();
    if (cloud) {
      const existing = await getCardById(input.id);
      if (!existing) {
        throw new Error('명함을 찾을 수 없습니다.');
      }

      const updatedCard: BusinessCard = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      };

      const row = toCloudCardRow(updatedCard, cloud.userId);
      const { error } = await cloud.supabase
        .from('business_cards')
        .update(row)
        .eq('id', input.id)
        .eq('user_id', cloud.userId);

      if (error) throw error;
      return updatedCard;
    }

    const cards = await getAllCards();
    const index = cards.findIndex(card => card.id === input.id);
    
    if (index === -1) {
      throw new Error('명함을 찾을 수 없습니다.');
    }
    
    const updatedCard: BusinessCard = {
      ...cards[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    
    cards[index] = updatedCard;
    await cardStore.setItem(STORAGE_KEY, cards);
    
    return updatedCard;
  } catch (error) {
    console.error('Failed to update card:', error);
    throw new Error('명함 수정에 실패했습니다.');
  }
}

/**
 * 명함 삭제
 */
export async function deleteCard(id: string): Promise<void> {
  try {
    const cloud = await getCloudContext();
    if (cloud) {
      const { error } = await cloud.supabase
        .from('business_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', cloud.userId);

      if (error) throw error;
      return;
    }

    const cards = await getAllCards();
    const filtered = cards.filter(card => card.id !== id);
    
    await cardStore.setItem(STORAGE_KEY, filtered);
  } catch (error) {
    console.error('Failed to delete card:', error);
    throw new Error('명함 삭제에 실패했습니다.');
  }
}

/**
 * 회사별 그룹핑
 */
export async function getCardsByCompany(): Promise<CompanyGroup[]> {
  try {
    const cards = await getAllCards();
    
    // 회사명으로 그룹핑
    const groups = cards.reduce((acc, card) => {
      const company = card.company || '미분류';
      
      if (!acc[company]) {
        acc[company] = [];
      }
      
      acc[company].push(card);
      return acc;
    }, {} as Record<string, BusinessCard[]>);
    
    // CompanyGroup 배열로 변환
    const result: CompanyGroup[] = Object.entries(groups).map(([company, cards]) => ({
      company,
      count: cards.length,
      cards: cards.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));
    
    // 회사명 가나다순 정렬 (미분류는 맨 뒤로)
    return result.sort((a, b) => {
      if (a.company === '미분류') return 1;
      if (b.company === '미분류') return -1;
      return a.company.localeCompare(b.company, 'ko');
    });
  } catch (error) {
    console.error('Failed to group by company:', error);
    return [];
  }
}

/**
 * 특정 회사 명함 목록
 */
export async function getCardsByCompanyName(companyName: string): Promise<BusinessCard[]> {
  try {
    const cards = await getAllCards();
    
    return cards
      .filter(card => {
        const company = card.company || '미분류';
        return company === companyName;
      })
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch (error) {
    console.error('Failed to get cards by company:', error);
    return [];
  }
}

/**
 * 즐겨찾기 토글
 */
export async function toggleFavorite(id: string): Promise<BusinessCard> {
  try {
    const card = await getCardById(id);
    
    if (!card) {
      throw new Error('명함을 찾을 수 없습니다.');
    }
    
    return updateCard({
      id,
      favorite: !card.favorite,
    });
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    throw new Error('즐겨찾기 설정에 실패했습니다.');
  }
}

/**
 * JSON으로 내보내기
 */
export async function exportToJson(): Promise<string> {
  try {
    const cards = await getAllCards();
    
    const exportData: BusinessCardExport = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      cards,
    };
    
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export:', error);
    throw new Error('내보내기에 실패했습니다.');
  }
}

/**
 * JSON에서 가져오기
 */
export async function importFromJson(jsonString: string): Promise<number> {
  try {
    const importData: BusinessCardExport = JSON.parse(jsonString);
    
    if (!importData.cards || !Array.isArray(importData.cards)) {
      throw new Error('올바르지 않은 파일 형식입니다.');
    }
    
    const existingCards = await getAllCards();
    
    // 중복 제거 (ID 기준)
    const existingIds = new Set(existingCards.map(card => card.id));
    const newCards = importData.cards.filter(card => !existingIds.has(card.id));
    
    if (newCards.length === 0) {
      return 0;
    }
    
    const mergedCards = [...existingCards, ...newCards];

    const cloud = await getCloudContext();
    if (cloud) {
      const rows = newCards.map((card) =>
        toCloudCardRow(
          {
            ...card,
            favorite: Boolean(card.favorite),
            categories: card.categories || [],
            createdAt: card.createdAt || new Date().toISOString(),
            updatedAt: card.updatedAt || new Date().toISOString(),
          },
          cloud.userId
        )
      );
      const { error } = await cloud.supabase.from('business_cards').insert(rows);
      if (error) throw error;
      return newCards.length;
    }

    await cardStore.setItem(STORAGE_KEY, mergedCards);
    
    return newCards.length;
  } catch (error) {
    console.error('Failed to import:', error);
    throw new Error('가져오기에 실패했습니다.');
  }
}

/**
 * Excel/CSV 파일에서 가져오기 (리멤버 내보내기 대응)
 */
export async function importFromSpreadsheet(file: File): Promise<number> {
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('시트가 비어 있습니다.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });

    if (!rows.length) {
      return 0;
    }

    const existingCards = await getAllCards();
    const existingSignatures = new Set(
      existingCards.map((card) =>
        makeDuplicateSignature({
          name: card.name || '',
          company: card.company || '',
          title: card.title || '',
          phone: card.phone || '',
          email: card.email || '',
          memo: card.memo || '',
          favorite: Boolean(card.favorite),
          categories: card.categories || [],
          imageFront: card.imageFront,
          rawOcrText: card.rawOcrText,
        })
      )
    );

    const now = new Date().toISOString();
    const newCards: BusinessCard[] = [];
    const importedCategorySet = new Set<string>();

    for (const row of rows) {
      const input = rowToCardInput(row);
      if (!input.name && !input.phone && !input.email && !input.company) continue;

      const signature = makeDuplicateSignature(input);
      if (existingSignatures.has(signature)) continue;

      existingSignatures.add(signature);
      for (const category of input.categories || []) {
        if (category.trim()) importedCategorySet.add(category.trim());
      }
      newCards.push({
        id: generateId(),
        name: input.name,
        company: input.company,
        title: input.title,
        phone: input.phone,
        email: input.email,
        memo: input.memo,
        favorite: false,
        categories: input.categories || [],
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!newCards.length) {
      return 0;
    }

    // 리멤버/엑셀의 보기 구분 값을 앱의 관계 구분 목록에 자동 반영
    for (const category of importedCategorySet) {
      addCategoryItem(category);
    }

    const cloud = await getCloudContext();
    if (cloud) {
      const rows = newCards.map((card) => toCloudCardRow(card, cloud.userId));
      const { error } = await cloud.supabase.from('business_cards').insert(rows);
      if (error) throw error;
      return newCards.length;
    }

    await cardStore.setItem(STORAGE_KEY, [...existingCards, ...newCards]);
    return newCards.length;
  } catch (error) {
    console.error('Failed to import spreadsheet:', error);
    throw new Error('엑셀/CSV 가져오기에 실패했습니다. 파일 형식을 확인해주세요.');
  }
}

/**
 * 모든 데이터 삭제 (초기화)
 */
export async function clearAllCards(): Promise<void> {
  try {
    const cloud = await getCloudContext();
    if (cloud) {
      const { error } = await cloud.supabase
        .from('business_cards')
        .delete()
        .eq('user_id', cloud.userId);

      if (error) throw error;
      return;
    }

    await cardStore.setItem(STORAGE_KEY, []);
  } catch (error) {
    console.error('Failed to clear cards:', error);
    throw new Error('데이터 삭제에 실패했습니다.');
  }
}

/**
 * 검색 (이름, 회사명, 이메일, 전화번호)
 */
export async function searchCards(query: string): Promise<BusinessCard[]> {
  try {
    if (!query.trim()) {
      return getAllCards();
    }
    
    const cards = await getAllCards();
    const lowerQuery = query.toLowerCase();
    
    return cards.filter(card => {
      return (
        card.name.toLowerCase().includes(lowerQuery) ||
        card.company.toLowerCase().includes(lowerQuery) ||
        card.email.toLowerCase().includes(lowerQuery) ||
        card.phone.includes(lowerQuery) ||
        card.title.toLowerCase().includes(lowerQuery) ||
        card.memo.toLowerCase().includes(lowerQuery)
      );
    });
  } catch (error) {
    console.error('Failed to search cards:', error);
    return [];
  }
}

/**
 * 카테고리(관계 구분) 목록 불러오기
 */
export function getCategoryList(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_CATEGORIES];
  try {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return [...DEFAULT_CATEGORIES];
    }
    return JSON.parse(saved) as string[];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

/**
 * 카테고리 목록 저장
 */
export function saveCategoryList(categories: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
}

/**
 * 카테고리 추가
 */
export function addCategoryItem(name: string): string[] {
  const list = getCategoryList();
  const trimmed = name.trim();
  if (trimmed && !list.includes(trimmed)) {
    list.push(trimmed);
    saveCategoryList(list);
  }
  return list;
}

/**
 * 카테고리 삭제
 */
export function removeCategoryItem(name: string): string[] {
  const list = getCategoryList().filter((c) => c !== name);
  saveCategoryList(list);
  return list;
}

/**
 * 카테고리 + 회사명 기준 그룹핑
 */
export async function getCardsByGroup(): Promise<{ key: string; type: 'category' | 'company'; cards: BusinessCard[] }[]> {
  try {
    const cards = await getAllCards();
    const groups: Record<string, { type: 'category' | 'company'; cards: BusinessCard[] }> = {};

    cards.forEach((card) => {
      const firstCat = card.categories?.[0];
      const key = firstCat || card.company || '미분류';
      const type: 'category' | 'company' = firstCat ? 'category' : 'company';
      if (!groups[key]) groups[key] = { type, cards: [] };
      groups[key].cards.push(card);
    });

    return Object.entries(groups)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => {
        if (a.key === '미분류') return 1;
        if (b.key === '미분류') return -1;
        return a.key.localeCompare(b.key, 'ko');
      });
  } catch (error) {
    console.error('Failed to group cards:', error);
    return [];
  }
}
