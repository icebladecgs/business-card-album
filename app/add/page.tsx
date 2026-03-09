'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { OcrResult } from '@/types/business-card';
import { processBusinessCardWithProgress } from '@/lib/ocr';
import { createCard } from '@/lib/storage';
import ImageUploader from '@/components/ImageUploader';
import OcrPreviewForm from '@/components/OcrPreviewForm';

export default function AddCardPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'ocr' | 'form'>('upload');
  const [imageData, setImageData] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageSelect = (data: string) => {
    setImageData(data);
    setStep('upload');
    setOcrResult(null);
  };

  const handleOcrStart = async () => {
    if (!imageData) {
      alert('이미지를 먼저 업로드해주세요.');
      return;
    }

    setIsProcessing(true);
    setStep('ocr');
    setOcrProgress(0);

    try {
      const result = await processBusinessCardWithProgress(
        imageData,
        (progress) => {
          setOcrProgress(Math.round(progress * 100));
        }
      );

      setOcrResult(result);
      setStep('form');
    } catch (error) {
      console.error('OCR Error:', error);
      alert('OCR 처리 중 오류가 발생했습니다. 수동으로 입력해주세요.');
      
      // 오류 시 빈 결과로 폼 진행
      setOcrResult({
        rawText: '',
        company: '',
        name: '',
        title: '',
        phone: '',
        email: '',
        confidence: 0,
      });
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = async (formData: {
    company: string;
    name: string;
    title: string;
    phone: string;
    email: string;
    memo: string;
    categories: string[];
  }) => {
    setIsSaving(true);

    try {
      await createCard({
        ...formData,
        imageFront: imageData,
        rawOcrText: ocrResult?.rawText || '',
      });

      alert('명함이 저장되었습니다!');
      router.push('/');
    } catch (error) {
      console.error('Save Error:', error);
      alert('명함 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipOcr = () => {
    setOcrResult({
      rawText: '',
      company: '',
      name: '',
      title: '',
      phone: '',
      email: '',
      confidence: 0,
    });
    setStep('form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">명함 추가</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 진행 단계 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="hidden sm:inline">이미지 업로드</span>
            </div>
            
            <div className="w-12 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center gap-2 ${step === 'ocr' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'ocr' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="hidden sm:inline">OCR 인식</span>
            </div>
            
            <div className="w-12 h-0.5 bg-gray-300"></div>
            
            <div className={`flex items-center gap-2 ${step === 'form' ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="hidden sm:inline">정보 입력</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {/* Step 1: 이미지 업로드 */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ImageUploader
                onImageSelect={handleImageSelect}
                currentImage={imageData}
              />

              {imageData && (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleOcrStart}
                    disabled={isProcessing}
                    className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg
                             hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                             transition-colors duration-200 text-lg
                             flex items-center justify-center gap-2"
                  >
                    <Sparkles size={20} />
                    OCR 자동 인식 시작
                  </button>

                  <button
                    onClick={handleSkipOcr}
                    className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg
                             hover:bg-gray-200 transition-colors duration-200"
                  >
                    OCR 건너뛰고 직접 입력
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: OCR 진행 중 */}
          {step === 'ocr' && (
            <div className="py-12 text-center">
              <div className="mb-6">
                <Sparkles size={64} className="text-blue-600 mx-auto animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                OCR 인식 중...
              </h3>
              <p className="text-gray-600 mb-6">
                명함에서 정보를 추출하고 있습니다
              </p>
              
              {/* 진행률 바 */}
              <div className="max-w-md mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{ocrProgress}%</p>
              </div>
            </div>
          )}

          {/* Step 3: 정보 입력 폼 */}
          {step === 'form' && ocrResult && (
            <div className="space-y-4">
              {ocrResult.confidence > 0 && (
                <div className={`rounded-lg p-3 ${
                  ocrResult.confidence > 0.6 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <p className={`text-sm ${
                    ocrResult.confidence > 0.6 ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {ocrResult.confidence > 0.6 
                      ? '✅ OCR 인식이 정상적으로 완료되었습니다.' 
                      : '⚠️ OCR 인식률이 낮습니다. 정보를 확인해주세요.'
                    }
                  </p>
                </div>
              )}

              <OcrPreviewForm
                ocrResult={ocrResult}
                onSubmit={handleFormSubmit}
                isSubmitting={isSaving}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
