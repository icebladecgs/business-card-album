'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { Upload, X, Camera, ImageIcon, Crop, RotateCcw, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/utils';
import { detectAndCropCard } from '@/lib/cardCrop';

interface ImageUploaderProps {
  onImageSelect: (imageData: string) => void;
  currentImage?: string;
}

type UploaderState = 'idle' | 'cropping' | 'preview' | 'done';

export default function ImageUploader({ onImageSelect, currentImage }: ImageUploaderProps) {
  const [state, setState] = useState<UploaderState>(currentImage ? 'done' : 'idle');
  const [isDragging, setIsDragging] = useState(false);
  const [originalImage, setOriginalImage] = useState<string>(currentImage || '');
  const [croppedImage, setCroppedImage] = useState<string>('');
  const [cropDetected, setCropDetected] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      const compressed = await compressImage(file, 1200, 0.8);
      setOriginalImage(compressed);
      setState('cropping');

      const result = await detectAndCropCard(compressed);
      setCroppedImage(result.croppedImage);
      setCropDetected(result.detected);
      setState('preview');
    } catch (error) {
      console.error('Image processing error:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
      setState('idle');
    }
  };

  const handleUseCropped = () => {
    setPreview(croppedImage);
    onImageSelect(croppedImage);
    setState('done');
  };

  const handleUseOriginal = () => {
    setPreview(originalImage);
    onImageSelect(originalImage);
    setState('done');
  };

  const handleRemove = () => {
    setPreview('');
    setOriginalImage('');
    setCroppedImage('');
    setCropDetected(false);
    onImageSelect('');
    setState('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
  };

  return (
    <div className="w-full">
      {/* hidden inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden" />

      {/* ── 상태: 업로드 버튼 ── */}
      {state === 'idle' && (
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-6 bg-blue-50 border-2 border-blue-200 rounded-xl
                       flex flex-col items-center gap-2 cursor-pointer
                       hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
          >
            <Camera size={40} className="text-blue-500" />
            <span className="text-base font-semibold text-blue-700">카메라로 촬영</span>
            <span className="text-xs text-blue-500">지금 바로 명함을 찍으세요</span>
          </button>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              w-full py-5 rounded-xl border-2 border-dashed
              flex flex-col items-center gap-2
              cursor-pointer transition-all duration-200
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
            `}
          >
            {isDragging
              ? <ImageIcon size={32} className="text-blue-500" />
              : <Upload size={32} className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-600">갤러리에서 선택</span>
            <span className="text-xs text-gray-400">또는 드래그&드롭</span>
          </div>
        </div>
      )}

      {/* ── 상태: 크롭 감지 중 ── */}
      {state === 'cropping' && (
        <div className="w-full py-12 flex flex-col items-center gap-4 bg-gray-50 rounded-xl border-2 border-gray-200">
          <Loader2 size={40} className="text-blue-500 animate-spin" />
          <p className="text-sm font-medium text-gray-600">명함 영역 감지 중...</p>
        </div>
      )}

      {/* ── 상태: 크롭 미리보기 ── */}
      {state === 'preview' && (
        <div className="w-full space-y-4">
          <p className="text-sm font-semibold text-gray-700 text-center">
            어떤 이미지를 사용할까요?
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* 크롭 결과 */}
            <div className="space-y-2">
              <div className="relative w-full aspect-[9/5] rounded-lg overflow-hidden border-2 border-blue-400 bg-gray-100">
                <Image
                  src={croppedImage}
                  alt="크롭된 명함"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-contain"
                />
                {cropDetected && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Crop size={10} />
                    자동 크롭
                  </div>
                )}
              </div>
              <button
                onClick={handleUseCropped}
                className="w-full py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg
                           hover:bg-blue-700 transition-colors"
              >
                {cropDetected ? '크롭 이미지 사용' : '이 이미지 사용'}
              </button>
            </div>

            {/* 원본 */}
            <div className="space-y-2">
              <div className="relative w-full aspect-[9/5] rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100">
                <Image
                  src={originalImage}
                  alt="원본 사진"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 50vw, 240px"
                  className="object-contain"
                />
                <div className="absolute top-1 left-1 bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  원본
                </div>
              </div>
              <button
                onClick={handleUseOriginal}
                className="w-full py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg
                           hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
              >
                <RotateCcw size={14} />
                원본 사용
              </button>
            </div>
          </div>

          {!cropDetected && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
              명함 영역을 자동으로 감지하지 못했습니다. 원본 이미지를 사용하거나 다시 촬영해보세요.
            </p>
          )}
        </div>
      )}

      {/* ── 상태: 선택 완료 ── */}
      {state === 'done' && (
        <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border-2 border-gray-200">
          <Image
            src={preview}
            alt="명함 미리보기"
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 768px"
            className="object-contain bg-gray-50"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full
                       hover:bg-red-600 transition-colors shadow-lg"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
