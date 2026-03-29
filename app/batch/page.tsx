'use client';

import Image from 'next/image';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Upload, Play, Save, CheckCircle,
  Loader2, X, ChevronDown, ChevronUp, Images, Camera,
} from 'lucide-react';
import type { OcrResult } from '@/types/business-card';
import { processBusinessCardWithProgress } from '@/lib/ocr';
import { createCard } from '@/lib/storage';
import { compressImage } from '@/lib/utils';
import { detectAndCropCard } from '@/lib/cardCrop';
import { getCategoryList } from '@/lib/storage';

type CardStatus = 'pending' | 'processing' | 'done' | 'error';

interface BatchCard {
  id: string;
  imageData: string;
  status: CardStatus;
  progress: number;
  ocrResult?: OcrResult;
  editedData: {
    company: string;
    name: string;
    title: string;
    phone: string;
    email: string;
    memo: string;
    categories: string[];
  };
  saved: boolean;
}

export default function BatchPage() {
  const router = useRouter();
  const [cards, setCards] = useState<BatchCard[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategoryList(getCategoryList());
  }, []);

  const addFiles = useCallback(async (files: FileList) => {
    const newCards: BatchCard[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file, 1200, 0.8);
        const { croppedImage } = await detectAndCropCard(compressed);
        newCards.push({
          id: `${Date.now()}-${i}`,
          imageData: croppedImage,
          status: 'pending',
          progress: 0,
          editedData: { company: '', name: '', title: '', phone: '', email: '', memo: '', categories: [] },
          saved: false,
        });
      } catch (e) {
        console.error('이미지 처리 실패:', e);
      }
    }
    setCards(prev => [...prev, ...newCards]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const startBatchOcr = async () => {
    const pendingIds = cards.filter(c => c.status === 'pending').map(c => c.id);
    if (pendingIds.length === 0) return;

    setIsProcessing(true);

    for (const id of pendingIds) {
      const card = cards.find(c => c.id === id);
      if (!card) continue;

      setCards(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'processing', progress: 0 } : c
      ));

      try {
        const result = await processBusinessCardWithProgress(
          card.imageData,
          (progress) => {
            setCards(prev => prev.map(c =>
              c.id === id ? { ...c, progress: Math.round(progress * 100) } : c
            ));
          }
        );

        setCards(prev => prev.map(c =>
          c.id === id ? {
            ...c,
            status: 'done',
            progress: 100,
            ocrResult: result,
            editedData: {
              company: result.company,
              name: result.name,
              title: result.title,
              phone: result.phone,
              email: result.email,
              memo: '',
              categories: [],
            },
          } : c
        ));
      } catch {
        setCards(prev => prev.map(c =>
          c.id === id ? { ...c, status: 'error' } : c
        ));
      }
    }

    setIsProcessing(false);
  };

  const saveAll = async () => {
    const toSave = cards.filter(c => c.status === 'done' && !c.saved);
    if (toSave.length === 0) return;

    setIsSaving(true);
    let savedCount = 0;

    for (const card of toSave) {
      try {
        await createCard({
          ...card.editedData,
          imageFront: card.imageData,
          rawOcrText: card.ocrResult?.rawText || '',
        });
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, saved: true } : c));
        savedCount++;
      } catch (e) {
        console.error('저장 실패:', e);
      }
    }

    setIsSaving(false);
    if (savedCount > 0) {
      alert(`${savedCount}개의 명함을 저장했습니다!`);
      router.push('/');
    }
  };

  const updateField = (cardId: string, field: string, value: string) => {
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, editedData: { ...c.editedData, [field]: value } } : c
    ));
  };

  const updateCategories = (cardId: string, categories: string[]) => {
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, editedData: { ...c.editedData, categories } } : c
    ));
  };

  const removeCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (expandedId === cardId) setExpandedId(null);
  };

  const pendingCount = cards.filter(c => c.status === 'pending').length;
  const doneCount = cards.filter(c => c.status === 'done').length;
  const unsavedCount = cards.filter(c => c.status === 'done' && !c.saved).length;
  const errorCount = cards.filter(c => c.status === 'error').length;

  const statusColors: Record<CardStatus, string> = {
    pending: 'bg-gray-100 text-gray-500',
    processing: 'bg-blue-100 text-blue-600',
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-600',
  };

  const statusLabels: Record<CardStatus, string> = {
    pending: '대기',
    processing: '인식 중',
    done: '완료',
    error: '실패',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">일괄 명함 추가</h1>
              {cards.length > 0 && (
                <p className="text-xs text-gray-500">
                  총 {cards.length}장
                  {doneCount > 0 && ` · 완료 ${doneCount}장`}
                  {errorCount > 0 && ` · 실패 ${errorCount}장`}
                </p>
              )}
            </div>
          </div>

          {unsavedCount > 0 && (
            <button
              onClick={saveAll}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-xl
                         hover:bg-green-700 disabled:opacity-60 flex items-center gap-2
                         transition-colors"
            >
              {isSaving
                ? <Loader2 size={16} className="animate-spin" />
                : <Save size={16} />}
              {isSaving ? '저장 중...' : `${unsavedCount}개 저장`}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* 업로드 드롭존 */}
        <div className="space-y-3">
          {/* 카메라 촬영 버튼 */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-5 bg-blue-50 border-2 border-blue-200 rounded-2xl
                       flex flex-col items-center gap-2 cursor-pointer
                       hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
          >
            <Camera size={36} className="text-blue-500" />
            <span className="text-base font-semibold text-blue-700">카메라로 촬영</span>
            <span className="text-xs text-blue-500">명함을 연속으로 찍으면 목록에 쌓입니다</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
          />

          {/* 갤러리/드래그드롭 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer
              transition-all duration-200
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'}
            `}
          >
            <div className="flex flex-col items-center gap-2">
              <Images size={32} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">갤러리에서 여러 장 선택</p>
              <p className="text-xs text-gray-400">드래그&드롭도 가능</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        {/* 인식 시작 버튼 */}
        {cards.length > 0 && pendingCount > 0 && !isProcessing && (
          <button
            onClick={startBatchOcr}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl
                       hover:bg-blue-700 transition-colors flex items-center justify-center gap-2
                       text-base shadow-sm"
          >
            <Play size={20} />
            {pendingCount}장 OCR 인식 시작
          </button>
        )}

        {isProcessing && (
          <div className="w-full py-4 bg-blue-50 border border-blue-200 rounded-2xl
                          flex items-center justify-center gap-3 text-blue-700 font-medium">
            <Loader2 size={20} className="animate-spin" />
            명함 인식 중... ({cards.filter(c => c.status === 'done').length}/{cards.filter(c => c.status !== 'pending').length})
          </div>
        )}

        {/* 카드 목록 */}
        {cards.length > 0 && (
          <div className="space-y-3">
            {cards.map((card) => (
              <div key={card.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {/* 카드 헤더 행 */}
                <div className="flex items-center gap-3 p-3">
                  {/* 썸네일 */}
                  <div className="relative w-20 h-12 rounded-lg border border-gray-200 flex-shrink-0 bg-gray-50 overflow-hidden">
                    <Image
                      src={card.imageData}
                      alt="명함"
                      fill
                      unoptimized
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  {/* 상태/내용 */}
                  <div className="flex-1 min-w-0">
                    {card.status === 'pending' && (
                      <p className="text-sm text-gray-400">인식 대기 중</p>
                    )}
                    {card.status === 'processing' && (
                      <div>
                        <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                          <Loader2 size={13} className="animate-spin" />
                          <span>OCR 분석 중... {card.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${card.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {card.status === 'done' && (
                      <div>
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {card.editedData.name || '(이름 없음)'}
                          {card.editedData.company && ` · ${card.editedData.company}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {card.editedData.title || card.editedData.phone || card.editedData.email}
                        </p>
                      </div>
                    )}
                    {card.status === 'error' && (
                      <p className="text-sm text-red-500">인식 실패 — 삭제 후 다시 시도하세요</p>
                    )}
                    {card.saved && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                        <CheckCircle size={11} /> 저장 완료
                      </span>
                    )}
                  </div>

                  {/* 우측 버튼 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[card.status]}`}>
                      {statusLabels[card.status]}
                    </span>
                    {card.status === 'done' && !card.saved && (
                      <button
                        onClick={() => setExpandedId(expandedId === card.id ? null : card.id)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        {expandedId === card.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                    {!isProcessing && (
                      <button
                        onClick={() => removeCard(card.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 확장 편집 패널 */}
                {expandedId === card.id && card.status === 'done' && !card.saved && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-3 font-medium">내용 수정</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* 관계 구분 */}
                      {categoryList.length > 0 && (
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1.5 block">관계 구분</label>
                          <div className="flex flex-wrap gap-1.5">
                            {categoryList.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  const current = card.editedData.categories;
                                  updateCategories(card.id,
                                    current.includes(cat)
                                      ? current.filter(c => c !== cat)
                                      : [...current, cat]
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all
                                  ${card.editedData.categories.includes(cat)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                                  }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {[
                        { key: 'company', label: '회사명', colSpan: 2 },
                        { key: 'name', label: '이름', colSpan: 1 },
                        { key: 'title', label: '직책', colSpan: 1 },
                        { key: 'phone', label: '전화번호', colSpan: 1 },
                        { key: 'email', label: '이메일', colSpan: 1 },
                        { key: 'memo', label: '메모', colSpan: 2 },
                      ].map(({ key, label, colSpan }) => (
                        <div key={key} className={colSpan === 2 ? 'col-span-2' : ''}>
                          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                          <input
                            type="text"
                            value={(card.editedData as Record<string, string | string[]>)[key] as string}
                            onChange={(e) => updateField(card.id, key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                       focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {cards.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Upload size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">위에서 명함 사진을 선택해주세요</p>
          </div>
        )}

        {/* 하단 저장 버튼 (카드가 여러 개일 때) */}
        {unsavedCount >= 2 && (
          <button
            onClick={saveAll}
            disabled={isSaving}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl
                       hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2
                       transition-colors shadow-sm"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? '저장 중...' : `완료된 ${unsavedCount}개 명함 저장`}
          </button>
        )}
      </main>
    </div>
  );
}
