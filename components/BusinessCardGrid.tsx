'use client';

import { useMemo } from 'react';
import type { BusinessCard } from '@/types/business-card';
import BusinessCardItem from './BusinessCardItem';

interface BusinessCardGridProps {
  cards: BusinessCard[];
  currentPage: number;
  itemsPerPage: number;
  onCardClick: (card: BusinessCard) => void;
}

export default function BusinessCardGrid({
  cards,
  currentPage,
  itemsPerPage,
  onCardClick,
}: BusinessCardGridProps) {
  // 현재 페이지에 표시할 카드들
  const visibleCards = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return cards.slice(startIndex, endIndex);
  }, [cards, currentPage, itemsPerPage]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-24 h-24 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          명함이 없습니다
        </h3>
        <p className="text-gray-500">
          우측 하단 + 버튼을 눌러 명함을 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleCards.map((card) => (
        <BusinessCardItem
          key={card.id}
          card={card}
          onClick={() => onCardClick(card)}
        />
      ))}
      
      {/* 빈 공간 채우기 (페이지네이션 레이아웃 일관성) */}
      {Array.from({ length: itemsPerPage - visibleCards.length }).map((_, index) => (
        <div key={`empty-${index}`} className="invisible" />
      ))}
    </div>
  );
}
