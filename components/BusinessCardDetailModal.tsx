'use client';

import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Star, Building2, User, Phone, Mail, Briefcase, FileText, Check, Tag } from 'lucide-react';
import type { BusinessCard } from '@/types/business-card';
import { formatPhoneNumber, formatDate } from '@/lib/utils';
import { getCategoryList, addCategoryItem, removeCategoryItem } from '@/lib/storage';

interface BusinessCardDetailModalProps {
  card: BusinessCard;
  onClose: () => void;
  onSave: (updated: Partial<BusinessCard> & { id: string }) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const FIELD_INPUT = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400';

export default function BusinessCardDetailModal({
  card,
  onClose,
  onSave,
  onDelete,
  onToggleFavorite,
}: BusinessCardDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    company: card.company,
    name: card.name,
    title: card.title,
    phone: card.phone,
    email: card.email,
    memo: card.memo,
  });
  const [draftCategories, setDraftCategories] = useState<string[]>(card.categories || []);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setCategoryList(getCategoryList());
  }, []);

  const toggleDraftCategory = (cat: string) => {
    setDraftCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCategoryItem = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const updated = addCategoryItem(trimmed);
    setCategoryList(updated);
    setDraftCategories((prev) => [...prev, trimmed]);
    setNewCategoryName('');
    setShowAddCatInput(false);
  };

  const handleRemoveCategoryItem = (cat: string) => {
    const updated = removeCategoryItem(cat);
    setCategoryList(updated);
    setDraftCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(card.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleSave = () => {
    onSave({ id: card.id, ...draft, categories: draftCategories });
    setIsEditing(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isEditing) onClose();
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft(prev => ({ ...prev, [field]: e.target.value }));

  // 편집 취소 시 draft 초기화
  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraft({ company: card.company, name: card.name, title: card.title, phone: card.phone, email: card.email, memo: card.memo });
    setDraftCategories(card.categories || []);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? '명함 수정' : '명함 상세'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 명함 이미지 */}
        {!isEditing && (
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
        )}

        {/* 명함 정보 / 편집 폼 */}
        <div className="px-6 py-6 space-y-5">
          {isEditing ? (
            /* ── 편집 모드 ── */
            <>
              {/* 은계 구분 다중 선택 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 font-medium">
                  <Tag size={14} className="text-blue-500" />
                  관계 구분
                  <span className="text-gray-400 font-normal">(중복 선택 가능)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-1">
                  {categoryList.map((cat) => (
                    <div key={cat} className="relative group">
                      <button
                        type="button"
                        onClick={() => toggleDraftCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
                          ${draftCategories.includes(cat)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                          }`}
                      >
                        {cat}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategoryItem(cat)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs
                                   items-center justify-center hidden group-hover:flex leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {showAddCatInput ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategoryItem())}
                        placeholder="구분명"
                        autoFocus
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={handleAddCategoryItem}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">추가</button>
                      <button type="button" onClick={() => { setShowAddCatInput(false); setNewCategoryName(''); }}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">취소</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddCatInput(true)}
                      className="px-3 py-1.5 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                    >
                      + 추가
                    </button>
                  )}
                </div>
              </div>
              {[
                { key: 'company', label: '회사명', icon: <Building2 size={16} className="text-blue-500" /> },
                { key: 'name',    label: '이름',   icon: <User size={16} className="text-gray-500" /> },
                { key: 'title',   label: '직책',   icon: <Briefcase size={16} className="text-gray-500" /> },
                { key: 'phone',   label: '전화번호', icon: <Phone size={16} className="text-gray-500" /> },
                { key: 'email',   label: '이메일',  icon: <Mail size={16} className="text-gray-500" /> },
              ].map(({ key, label, icon }) => (
                <div key={key}>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                    {icon}{label}
                  </label>
                  <input
                    type="text"
                    value={(draft as Record<string, string>)[key]}
                    onChange={set(key)}
                    className={FIELD_INPUT}
                  />
                </div>
              ))}
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                  <FileText size={16} className="text-gray-500" />메모
                </label>
                <textarea
                  value={draft.memo}
                  onChange={set('memo')}
                  rows={3}
                  className={`${FIELD_INPUT} resize-none`}
                />
              </div>
            </>
          ) : (
            /* ── 보기 모드 ── */
            <>
              {/* 관계 구분 태그 표시 */}
              {card.categories && card.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.categories.map((cat) => (
                    <span key={cat} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-start gap-3">
                <Building2 size={20} className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">회사명</p>
                  <p className="text-lg font-semibold text-gray-900">{card.company || '미분류'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500 mb-1">이름</p>
                  <p className="text-lg font-semibold text-gray-900">{card.name}</p>
                </div>
              </div>
              {card.title && (
                <div className="flex items-start gap-3">
                  <Briefcase size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">직책</p>
                    <p className="text-base text-gray-900">{card.title}</p>
                  </div>
                </div>
              )}
              {card.phone && (
                <div className="flex items-start gap-3">
                  <Phone size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">전화번호</p>
                    <a href={`tel:${card.phone}`} className="text-base text-blue-600 hover:underline">
                      {formatPhoneNumber(card.phone)}
                    </a>
                  </div>
                </div>
              )}
              {card.email && (
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">이메일</p>
                    <a href={`mailto:${card.email}`} className="text-base text-blue-600 hover:underline break-all">
                      {card.email}
                    </a>
                  </div>
                </div>
              )}
              {card.memo && (
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-500 mb-1">메모</p>
                    <p className="text-base text-gray-700 whitespace-pre-wrap">{card.memo}</p>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  생성일: {formatDate(card.createdAt)} | 수정일: {formatDate(card.updatedAt)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setIsEditing(false); setDraft({ company: card.company, name: card.name, title: card.title, phone: card.phone, email: card.email, memo: card.memo }); setDraftCategories(card.categories || []); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />저장
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* 즐겨찾기 — 아이콘+짧은 텍스트, 고정폭 */}
              <button
                onClick={() => onToggleFavorite(card.id)}
                className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg font-medium
                           transition-all duration-200 whitespace-nowrap
                           ${ card.favorite
                             ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                             : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                           }`}
              >
                <Star size={17} className={card.favorite ? 'fill-yellow-500' : ''} />
                {card.favorite ? '해제' : '즐겨찾기'}
              </button>

              {/* 수정 */}
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                           hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={17} />수정
              </button>

              {/* 삭제 */}
              <button
                onClick={handleDelete}
                className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200
                           flex items-center justify-center gap-2
                           ${ showDeleteConfirm
                             ? 'bg-red-600 text-white hover:bg-red-700'
                             : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                           }`}
              >
                <Trash2 size={17} />
                {showDeleteConfirm ? '확인' : '삭제'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
