import Tesseract from 'tesseract.js';
import type { OcrResult } from '@/types/business-card';

// 한국 성씨 목록 (OCR 이름 감지용)
const KOREAN_SURNAMES = new Set([
  '강', '고', '공', '곽', '구', '권', '금', '김', '나', '남',
  '노', '도', '류', '마', '문', '민', '박', '방', '배', '백',
  '변', '서', '성', '손', '송', '신', '심', '안', '양', '엄',
  '여', '염', '오', '우', '원', '유', '윤', '이', '임', '장',
  '전', '정', '조', '주', '진', '차', '천', '최', '추', '하',
  '한', '허', '현', '홍', '황',
]);

// 직책 키워드 (우선순위 순)
const TITLE_KEYWORDS = [
  '대표이사', '부회장', '회장', '부사장', '전무이사', '상무이사',
  '이사', '본부장', '실장', '센터장', '소장', '원장', '팀장',
  '부장', '차장', '과장', '대리', '주임', '사원',
  '수석연구원', '책임연구원', '선임연구원', '연구원',
  '수석', '책임', '선임',
  'CEO', 'CTO', 'CFO', 'COO', 'CMO', 'CIO',
  'President', 'Director', 'Manager', 'Executive',
  '교수', '교사', '강사', '변호사', '회계사', '의사',
  '대표',
];

/**
 * Canvas 기반 이미지 전처리 — 그레이스케일 + 대비 강화 + 스케일업
 * Tesseract 정확도를 크게 향상시킴
 */
async function preprocessImageForOCR(imageData: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // 최소 1600px 가로로 스케일업 (작은 이미지에서 인식률 향상)
        const targetWidth = Math.max(1600, img.width);
        const scale = targetWidth / img.width;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(imageData); return; }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 픽셀 단위: 그레이스케일 변환 + 대비 강화
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        const contrastAdj = 55; // 0~255 범위 조정값
        const factor = (259 * (contrastAdj + 255)) / (255 * (259 - contrastAdj));

        for (let i = 0; i < d.length; i += 4) {
          // 가중 평균 그레이스케일 (사람 눈 밝기 인식 기준)
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          // 대비 강화
          const enhanced = Math.min(255, Math.max(0, Math.round(factor * (gray - 128) + 128)));
          d[i] = enhanced;
          d[i + 1] = enhanced;
          d[i + 2] = enhanced;
        }

        // 선명화 패스 (Laplacian sharpen) — 텍스트 경계를 강조해 OCR 정확도 향상
        const W = canvas.width;
        const H = canvas.height;
        const src = new Uint8ClampedArray(d); // 대비 강화 결과 복사
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const ci = (y * W + x) * 4;
            const center = src[ci];
            const top    = src[((y - 1) * W + x) * 4];
            const bottom = src[((y + 1) * W + x) * 4];
            const left   = src[(y * W + (x - 1)) * 4];
            const right  = src[(y * W + (x + 1)) * 4];
            // 50% blend: original + laplacian sharpening
            const v = Math.min(255, Math.max(0, Math.round((center + 5 * center - top - bottom - left - right) / 2)));
            d[ci] = v;
            d[ci + 1] = v;
            d[ci + 2] = v;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png')); // PNG = 손실 없음
      } catch {
        resolve(imageData); // 전처리 실패 시 원본 사용
      }
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
}

/**
 * 이미지에서 텍스트 추출 (OCR)
 */
export async function extractTextFromImage(imageData: string): Promise<string> {
  try {
    const preprocessed = await preprocessImageForOCR(imageData);
    const result = await Tesseract.recognize(preprocessed, 'kor+eng', {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('OCR 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 이메일 추출
 */
function extractEmail(text: string): string {
  const emailRegex = /[a-zA-Z0-9._+%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0].toLowerCase() : '';
}

/**
 * 전화번호 추출 — 모바일/사무실/팩스 분리
 */
function extractPhones(text: string): { mobile: string; office: string; fax: string } {
  const result = { mobile: '', office: '', fax: '' };

  // 팩스가 포함된 줄 분리
  const lines = text.split('\n');
  const faxLines = lines.filter(l => /fax|팩스|f\s*\.|f\s*:/i.test(l));
  const textWithoutFax = faxLines.reduce((t, l) => t.replace(l, ''), text);

  // 모바일 번호 패턴
  const mobilePatterns = [
    /010[-.\s]?\d{4}[-.\s]?\d{4}/,
    /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/,
    /\+82[-.\s]?10[-.\s]?\d{4}[-.\s]?\d{4}/,
  ];
  for (const p of mobilePatterns) {
    const m = textWithoutFax.match(p);
    if (m) { result.mobile = m[0].replace(/\s/g, ''); break; }
  }

  // 사무실 번호 패턴 (지역번호 포함)
  const officePatterns = [
    /0[2-9]\d[-.\s]?\d{3,4}[-.\s]?\d{4}/,
    /\+82[-.\s]?[2-9]\d[-.\s]?\d{3,4}[-.\s]?\d{4}/,
  ];
  for (const p of officePatterns) {
    const m = textWithoutFax.match(p);
    if (m) { result.office = m[0].replace(/\s/g, ''); break; }
  }

  // 팩스 번호
  for (const faxLine of faxLines) {
    for (const p of officePatterns) {
      const m = faxLine.match(p);
      if (m) { result.fax = m[0].replace(/\s/g, ''); break; }
    }
    if (result.fax) break;
  }

  return result;
}

/**
 * 회사명 추출
 */
function extractCompany(lines: string[]): string {
  // 1순위: ㈜, (주), 주식회사, 유한회사, Inc, Ltd 등 포함 줄
  for (const line of lines) {
    if (/㈜|\(주\)|주식회사|유한회사|합자회사|(Inc\.?|Corp\.?|Ltd\.?|LLC|Co\.)(?:\s|$)/i.test(line)) {
      return line.replace(/^[\s\-·•]+/, '').replace(/[\s\-·•]+$/, '').trim();
    }
  }

  // 2순위: 상위 4줄 중 가장 긴 비-연락처 줄
  const topLines = lines.slice(0, 4);
  const candidates = topLines.filter(l => {
    const clean = l.trim();
    return (
      clean.length > 2 &&
      !/@/.test(clean) &&
      !/^(010|01\d|02|0[3-9]\d)/.test(clean) &&
      !/^\d{2,}/.test(clean)
    );
  });

  if (candidates.length === 0) return '';
  return candidates.reduce((a, b) => (a.length >= b.length ? a : b)).trim();
}

/**
 * 이름 추출 — 한국 성씨 목록 기반
 */
function extractName(lines: string[], company: string): string {
  for (const line of lines) {
    const clean = line.trim();
    if (clean === company || /@/.test(clean) || /\d/.test(clean)) continue;

    // 한글 이름: 성(1자) + 이름(1~3자) = 2~4자
    if (/^[가-힣]{2,4}$/.test(clean) && KOREAN_SURNAMES.has(clean[0])) {
      return clean;
    }
    // 영문 이름: 대문자로 시작하는 단어 2개 이상
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(clean)) {
      return clean;
    }
  }

  // 성씨 목록 미포함이어도 2~4자 한글은 이름 후보
  for (const line of lines) {
    const clean = line.trim();
    if (clean === company || /@/.test(clean) || /\d/.test(clean)) continue;
    if (/^[가-힣]{2,4}$/.test(clean)) return clean;
  }

  return '';
}

/**
 * 직책 추출
 */
function extractTitle(lines: string[], name: string, company: string): string {
  for (const line of lines) {
    const clean = line.trim();
    if (clean === name || clean === company) continue;
    for (const keyword of TITLE_KEYWORDS) {
      if (clean.includes(keyword)) return clean;
    }
  }
  return '';
}

/**
 * 주소 추출
 */
function extractAddress(lines: string[]): string {
  const cityPrefixes = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  const addrKeywords = ['시', '구', '동', '로', '길', '층', '호', '번지'];

  for (const line of lines) {
    const clean = line.trim();
    if (clean.length < 5) continue;
    if (cityPrefixes.some(p => clean.startsWith(p))) return clean;
    if (addrKeywords.filter(k => clean.includes(k)).length >= 2) return clean;
  }
  return '';
}

/**
 * OCR 텍스트 파싱 — 모든 필드 추출
 */
export function parseOcrText(rawText: string): OcrResult {
  // 노이즈 문자 제거 후 라인 분리
  const lines = rawText
    .split('\n')
    .map(line => line.replace(/[|\\]/g, '').trim())
    .filter(line => line.length > 0);

  const email = extractEmail(rawText);
  const { mobile, office, fax } = extractPhones(rawText);
  const company = extractCompany(lines);
  const name = extractName(lines, company);
  const title = extractTitle(lines, name, company);
  const address = extractAddress(lines);

  // 주 전화번호: 모바일 우선, 없으면 사무실
  const phone = mobile || office;

  // 부가 정보 메모 형식으로 구성
  const extras: string[] = [];
  if (office && mobile) extras.push(`사무실: ${office}`);
  if (fax) extras.push(`팩스: ${fax}`);
  if (address) extras.push(`주소: ${address}`);

  const fieldsFound = [email, phone, company, name, title].filter(Boolean).length;

  return {
    rawText: extras.length > 0 ? `${rawText}\n---\n${extras.join('\n')}` : rawText,
    company,
    name,
    title,
    phone,
    email,
    confidence: fieldsFound / 5,
  };
}

/**
 * 명함 이미지 OCR 전체 프로세스
 */
export async function processBusinessCard(imageData: string): Promise<OcrResult> {
  try {
    const rawText = await extractTextFromImage(imageData);
    return parseOcrText(rawText);
  } catch (error) {
    console.error('Business card processing error:', error);
    return { rawText: '', company: '', name: '', title: '', phone: '', email: '', confidence: 0 };
  }
}

/**
 * OCR 진행 상황 콜백과 함께 처리
 */
export async function processBusinessCardWithProgress(
  imageData: string,
  onProgress: (progress: number) => void
): Promise<OcrResult> {
  try {
    onProgress(0.05);
    const preprocessed = await preprocessImageForOCR(imageData);
    onProgress(0.15);

    const result = await Tesseract.recognize(preprocessed, 'kor+eng', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          onProgress(0.15 + m.progress * 0.75);
        }
      },
    });

    onProgress(0.95);
    const parsed = parseOcrText(result.data.text);
    onProgress(1.0);
    return parsed;
  } catch (error) {
    console.error('OCR processing error:', error);
    return { rawText: '', company: '', name: '', title: '', phone: '', email: '', confidence: 0 };
  }
}
