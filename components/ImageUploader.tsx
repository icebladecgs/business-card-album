'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { fileToBase64, compressImage } from '@/lib/utils';

interface ImageUploaderProps {
  onImageSelect: (imageData: string) => void;
  currentImage?: string;
}

export default function ImageUploader({
  onImageSelect,
  currentImage,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string>(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    try {
      // 이미지 압축
      const compressed = await compressImage(file, 1200, 0.8);
      setPreview(compressed);
      onImageSelect(compressed);
    } catch (error) {
      console.error('Image processing error:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview('');
    onImageSelect('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      {preview ? (
        <div className="relative w-full aspect-[16/10] rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={preview}
            alt="명함 미리보기"
            className="w-full h-full object-contain bg-gray-50"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full
                     hover:bg-red-600 transition-colors shadow-lg"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full aspect-[16/10] rounded-lg border-2 border-dashed
            flex flex-col items-center justify-center gap-4
            cursor-pointer transition-all duration-200
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            }
          `}
        >
          <div className="p-4 rounded-full bg-white shadow-sm">
            {isDragging ? (
              <ImageIcon size={48} className="text-blue-500" />
            ) : (
              <Upload size={48} className="text-gray-400" />
            )}
          </div>
          
          <div className="text-center px-4">
            <p className="text-lg font-medium text-gray-700 mb-1">
              명함 이미지를 업로드하세요
            </p>
            <p className="text-sm text-gray-500">
              클릭하거나 드래그 앤 드롭
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
