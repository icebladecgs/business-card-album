'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationInfo } from '@/types/business-card';

interface PaginationControlsProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  pagination,
  onPageChange,
}: PaginationControlsProps) {
  const { currentPage, totalPages } = pagination;
  
  if (totalPages <= 1) return null;
  
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 
                   hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        <ChevronLeft size={20} />
        <span className="font-medium">이전</span>
      </button>
      
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-blue-600">{currentPage}</span>
        <span className="text-gray-400">/</span>
        <span className="text-lg font-medium text-gray-600">{totalPages}</span>
      </div>
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 
                   hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-all duration-200"
      >
        <span className="font-medium">다음</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
