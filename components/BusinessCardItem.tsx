'use client';

import Image from 'next/image';
import { Building2, User, Phone, Mail, Star } from 'lucide-react';
import type { BusinessCard } from '@/types/business-card';
import { formatPhoneNumber } from '@/lib/utils';

interface BusinessCardItemProps {
  card: BusinessCard;
  onClick: () => void;
}

export default function BusinessCardItem({ card, onClick }: BusinessCardItemProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300
                 cursor-pointer border border-gray-200 overflow-hidden
                 transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* 명함 이미지 */}
      <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
        {card.imageFront ? (
          <Image
            src={card.imageFront}
            alt={`${card.name} 명함`}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User size={48} className="text-gray-400" />
          </div>
        )}
        
        {/* 즐겨찾기 배지 */}
        {card.favorite && (
          <div className="absolute top-2 right-2 bg-yellow-400 rounded-full p-1.5 shadow-md">
            <Star size={16} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* 명함 정보 */}
      <div className="p-4 space-y-2">
        {/* 회사명 */}
        <div className="flex items-center gap-2 text-blue-600">
          <Building2 size={16} />
          <span className="text-sm font-medium truncate">
            {card.company || '미분류'}
          </span>
        </div>

        {/* 이름 & 직책 */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {card.name}
          </h3>
          {card.title && (
            <p className="text-sm text-gray-600 truncate">{card.title}</p>
          )}
        </div>

        {/* 전화번호 */}
        {card.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone size={14} />
            <span className="text-xs truncate">
              {formatPhoneNumber(card.phone)}
            </span>
          </div>
        )}

        {/* 이메일 */}
        {card.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <Mail size={14} />
            <span className="text-xs truncate">{card.email}</span>
          </div>
        )}

        {/* 관계 구분 태그 */}
        {card.categories && card.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-100">
            {card.categories.slice(0, 3).map(cat => (
              <span key={cat} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                {cat}
              </span>
            ))}
            {card.categories.length > 3 && (
              <span className="text-xs text-gray-400">+{card.categories.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
