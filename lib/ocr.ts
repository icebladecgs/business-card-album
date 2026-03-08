import Tesseract from 'tesseract.js';
import type { OcrResult } from '@/types/business-card';

/**
 * OCR 엔진 설정
 */
const OCR_CONFIG = {
  lang: 'kor+eng', // 한글 + 영어
  logger: (m: any) => {
    // OCR 진행 상황 로깅 (필요시 활성화)
    if (m.status === 'recognizing text') {
      console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
    }
  },
};

/**
 * 이미지에서 텍스트 추출 (OCR)
 */
export async function extractTextFromImage(imageData: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(imageData, OCR_CONFIG.lang, {
      logger: OCR_CONFIG.logger,
    });
    
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('OCR 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 추출된 텍스트에서 이메일 찾기
 */
function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : '';
}

/**
 * 추출된 텍스트에서 전화번호 찾기
 */
function extractPhone(text: string): string {
  // 한국 전화번호 패턴
  const patterns = [
    /010[-\s]?\d{4}[-\s]?\d{4}/g, // 휴대폰
    /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, // 기타 휴대폰
    /0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, // 일반 전화
    /\+82[-\s]?10[-\s]?\d{4}[-\s]?\d{4}/g, // 국제 번호
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // 숫자와 하이픈만 남기기
      return matches[0].replace(/\s/g, '');
    }
  }
  
  return '';
}

/**
 * 회사명 추출 (간단한 휴리스틱)
 */
function extractCompany(lines: string[]): string {
  // 상위 3줄 중에서 가장 긴 줄을 회사명으로 추정
  const topLines = lines.slice(0, 3);
  
  // 이메일이나 전화번호가 포함된 줄은 제외
  const candidates = topLines.filter(line => {
    const hasEmail = /@/.test(line);
    const hasPhone = /01\d/.test(line) || /02-/.test(line);
    return !hasEmail && !hasPhone && line.length > 2;
  });
  
  if (candidates.length === 0) return '';
  
  // 가장 긴 줄 선택
  return candidates.reduce((longest, current) => 
    current.length > longest.length ? current : longest
  );
}

/**
 * 이름 추출 (간단한 휴리스틱)
 */
function extractName(lines: string[], company: string): string {
  // 회사명 다음 줄 또는 짧은 줄에서 이름 찾기
  const candidates = lines.filter(line => {
    if (line === company) return false;
    if (/@/.test(line)) return false;
    if (/01\d/.test(line)) return false;
    
    // 2-5글자 사이의 한글 또는 영문 (이름일 가능성)
    const koreanName = /^[가-힣]{2,4}$/.test(line.trim());
    const englishName = /^[A-Z][a-z]+\s[A-Z][a-z]+$/.test(line.trim());
    
    return koreanName || englishName;
  });
  
  return candidates.length > 0 ? candidates[0].trim() : '';
}

/**
 * 직책 추출
 */
function extractTitle(lines: string[], name: string, company: string): string {
  // 명함에서 자주 나오는 직책 키워드
  const titleKeywords = [
    '대표', '이사', '부장', '차장', '과장', '팀장', '매니저', '실장',
    'CEO', 'CTO', 'CFO', 'Manager', 'Director', 'President',
    '사원', '주임', '책임', '수석', '연구원', '교수', '변호사', '회계사'
  ];
  
  for (const line of lines) {
    if (line === name || line === company) continue;
    
    for (const keyword of titleKeywords) {
      if (line.includes(keyword)) {
        return line.trim();
      }
    }
  }
  
  return '';
}

/**
 * OCR 텍스트 파싱하여 필드 추출
 */
export function parseOcrText(rawText: string): OcrResult {
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const company = extractCompany(lines);
  const name = extractName(lines, company);
  const title = extractTitle(lines, name, company);
  
  // 추출된 필드가 많을수록 신뢰도 상승
  const fieldsFound = [
    email,
    phone,
    company,
    name,
    title
  ].filter(Boolean).length;
  
  const confidence = fieldsFound / 5;
  
  return {
    rawText,
    company,
    name,
    title,
    phone,
    email,
    confidence,
  };
}

/**
 * 명함 이미지 OCR 전체 프로세스
 */
export async function processBusinessCard(imageData: string): Promise<OcrResult> {
  try {
    // 1. OCR로 텍스트 추출
    const rawText = await extractTextFromImage(imageData);
    
    // 2. 텍스트 파싱
    const result = parseOcrText(rawText);
    
    return result;
  } catch (error) {
    console.error('Business card processing error:', error);
    
    // 실패 시 빈 결과 반환
    return {
      rawText: '',
      company: '',
      name: '',
      title: '',
      phone: '',
      email: '',
      confidence: 0,
    };
  }
}

/**
 * OCR 진행 상황 콜백과 함께 처리
 */
export async function processBusinessCardWithProgress(
  imageData: string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  try {
    const result = await Tesseract.recognize(imageData, OCR_CONFIG.lang, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      },
    });
    
    const rawText = result.data.text;
    const parsed = parseOcrText(rawText);
    
    return parsed;
  } catch (error) {
    console.error('OCR processing error:', error);
    return {
      rawText: '',
      company: '',
      name: '',
      title: '',
      phone: '',
      email: '',
      confidence: 0,
    };
  }
}
