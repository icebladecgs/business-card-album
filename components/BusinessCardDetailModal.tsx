'use client';

import { useState } from 'react';
import { X, Edit2, Trash2, Star, Building2, User, Phone, Mail, Briefcase, FileText } from 'lucide-react';
import type { BusinessCard } from '@/types/business-card';
import { formatPhoneNumber, formatDate } from '@/lib/utils';

interface BusinessCardDetailModalProps {
  card: BusinessCard;
  onClose: () => void;
  onEdit: (card: BusinessCard) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function BusinessCardDetailModal({
  card,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: BusinessCardDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(card.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">명함 상세</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 명함 이미지 */}
        <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200">
          {card.imageFront ? (
            <img
              src={card.imageFront}
              alt={`${card.name} 명함`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={80} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* 명함 정보 */}
        <div className="px-6 py-6 space-y-6">
          {/* 회사명 */}
          <div className="flex items-start gap-3">
            <Building2 size={20} className="text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 mb-1">회사명</p>
              <p className="text-lg font-semibold text-gray-900">
                {card.company || '미분류'}
              </p>
            </div>
          </div>

          {/* 이름 */}
          <div className="flex items-start gap-3">
            <User size={20} className="text-gray-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500 mb-1">이름</p>
              <p className="text-lg font-semibold text-gray-900">{card.name}</p>
            </div>
          </div>

          {/* 직책 */}
          {card.title && (
            <div className="flex items-start gap-3">
              <Briefcase size={20} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 mb-1">직책</p>
                <p className="text-base text-gray-900">{card.title}</p>
              </div>
            </div>
          )}

          {/* 전화번호 */}
          {card.phone && (
            <div className="flex items-start gap-3">
              <Phone size={20} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 mb-1">전화번호</p>
                <a
                  href={`tel:${card.phone}`}
                  className="text-base text-blue-600 hover:underline"
                >
                  {formatPhoneNumber(card.phone)}
                </a>
              </div>
            </div>
          )}

          {/* 이메일 */}
          {card.email && (
            <div className="flex items-start gap-3">
              <Mail size={20} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 mb-1">이메일</p>
                <a
                  href={`mailto:${card.email}`}
                  className="text-base text-blue-600 hover:underline break-all"
                >
                  {card.email}
                </a>
              </div>
            </div>
          )}

          {/* 메모 */}
          {card.memo && (
            <div className="flex items-start gap-3">
              <FileText size={20} className="text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500 mb-1">메모</p>
                <p className="text-base text-gray-700 whitespace-pre-wrap">{card.memo}</p>
              </div>
            </div>
          )}

          {/* 날짜 정보 */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              생성일: {formatDate(card.createdAt)} | 수정일: {formatDate(card.updatedAt)}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={() => onToggleFavorite(card.id)}
            className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 
                       flex items-center justify-center gap-2
                       ${card.favorite 
                         ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                         : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                       }`}
          >
            <Star size={18} className={card.favorite ? 'fill-yellow-500' : ''} />
            {card.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
          </button>

          <button
            onClick={() => onEdit(card)}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 size={18} />
            수정
          </button>

          <button
            onClick={handleDelete}
            className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200
                       flex items-center justify-center gap-2
                       ${showDeleteConfirm
                         ? 'bg-red-600 text-white hover:bg-red-700'
                         : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                       }`}
          >
            <Trash2 size={18} />
            {showDeleteConfirm ? '정말 삭제하기' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
