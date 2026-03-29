'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Star,
  Building2,
  User,
  Phone,
  Mail,
  Briefcase,
  FileText,
  Check,
  Tag,
  Download,
  Copy,
  PhoneCall,
  MessageSquare,
  Camera,
} from 'lucide-react';
import type { BusinessCard } from '@/types/business-card';
import {
  formatPhoneNumber,
  formatDate,
  createVCard,
  createVCardFileName,
  downloadFile,
  copyText,
} from '@/lib/utils';
import { getCategoryList, addCategoryItem, removeCategoryItem } from '@/lib/storage';
import ImageUploader from '@/components/ImageUploader';
import { detectAndCropCard } from '@/lib/cardCrop';

interface BusinessCardDetailModalProps {
  card: BusinessCard;
  onClose: () => void;
  onSave: (updated: Partial<BusinessCard> & { id: string }) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const FIELD_INPUT =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400';

export default function BusinessCardDetailModal({
  card,
  onClose,
  onSave,
  onDelete,
  onToggleFavorite,
}: BusinessCardDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isImageOnlyEdit, setIsImageOnlyEdit] = useState(false);
  const [draft, setDraft] = useState({
    company: card.company,
    name: card.name,
    title: card.title,
    phone: card.phone,
    email: card.email,
    memo: card.memo,
  });
  const [draftImageFront, setDraftImageFront] = useState(card.imageFront || '');
  const [draftCategories, setDraftCategories] = useState<string[]>(card.categories || []);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [copiedField, setCopiedField] = useState<'phone' | 'email' | null>(null);
  const [detailDisplayImage, setDetailDisplayImage] = useState(card.imageFront || '');

  useEffect(() => {
    setCategoryList(getCategoryList());
  }, []);

  useEffect(() => {
    if (!copiedField) return;
    const timeout = window.setTimeout(() => setCopiedField(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedField]);

  useEffect(() => {
    let isActive = true;

    if (isEditing || !card.imageFront) {
      setDetailDisplayImage(card.imageFront || '');
      return () => {
        isActive = false;
      };
    }

    // 상세 화면은 원본보다 명함 영역에 맞춘 이미지를 우선 표시
    setDetailDisplayImage(card.imageFront);

    void (async () => {
      try {
        const result = await detectAndCropCard(card.imageFront || '');
        if (isActive && result.detected && result.croppedImage) {
          setDetailDisplayImage(result.croppedImage);
        }
      } catch {
        // 자동 크롭 실패 시 원본 유지
      }
    })();

    return () => {
      isActive = false;
    };
  }, [card.id, card.imageFront, isEditing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditing) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onClose]);

  const resetDraftFromCard = () => {
    setDraft({
      company: card.company,
      name: card.name,
      title: card.title,
      phone: card.phone,
      email: card.email,
      memo: card.memo,
    });
    setDraftImageFront(card.imageFront || '');
    setDraftCategories(card.categories || []);
  };

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
    onSave({
      id: card.id,
      ...draft,
      imageFront: draftImageFront || undefined,
      categories: draftCategories,
    });
    setIsEditing(false);
    setIsImageOnlyEdit(false);
  };

  const handleExportVCard = () => {
    const vCard = createVCard({
      name: card.name,
      company: card.company,
      title: card.title,
      phone: card.phone,
      email: card.email,
      memo: card.memo,
    });

    downloadFile(vCard, createVCardFileName(card), 'text/vcard;charset=utf-8');
  };

  const handleCopy = async (field: 'phone' | 'email', value: string) => {
    const copied = await copyText(value);
    if (!copied) {
      alert('복사에 실패했습니다.');
      return;
    }
    setCopiedField(field);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isEditing) onClose();
  };

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsImageOnlyEdit(false);
    resetDraftFromCard();
  };

  const handleStartEdit = () => {
    resetDraftFromCard();
    setIsImageOnlyEdit(false);
    setIsEditing(true);
  };

  const handleStartImageOnlyEdit = () => {
    resetDraftFromCard();
    setIsImageOnlyEdit(true);
    setIsEditing(true);
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? '명함 수정' : '명함 상세'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {!isEditing && (
          <div className="relative w-full aspect-[9/5] bg-gradient-to-br from-gray-100 to-gray-200">
            {detailDisplayImage ? (
              <Image
                src={detailDisplayImage}
                alt={`${card.name} 명함`}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 768px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User size={80} className="text-gray-400" />
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-6 space-y-5">
          {isEditing ? (
            <>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 font-medium">
                  <User size={14} className="text-gray-500" />명함 이미지
                </label>
                <ImageUploader currentImage={draftImageFront} onImageSelect={setDraftImageFront} />
              </div>

              {isImageOnlyEdit ? (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  사진만 빠르게 교체 중입니다. 다른 텍스트 정보는 변경되지 않습니다.
                </p>
              ) : (
                <>
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
                              ${
                                draftCategories.includes(cat)
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
                            onKeyDown={(e) =>
                              e.key === 'Enter' && (e.preventDefault(), handleAddCategoryItem())
                            }
                            placeholder="구분명"
                            autoFocus
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddCategoryItem}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            추가
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddCatInput(false);
                              setNewCategoryName('');
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                          >
                            취소
                          </button>
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
                    { key: 'name', label: '이름', icon: <User size={16} className="text-gray-500" /> },
                    { key: 'title', label: '직책', icon: <Briefcase size={16} className="text-gray-500" /> },
                    { key: 'phone', label: '전화번호', icon: <Phone size={16} className="text-gray-500" /> },
                    { key: 'email', label: '이메일', icon: <Mail size={16} className="text-gray-500" /> },
                  ].map(({ key, label, icon }) => (
                    <div key={key}>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                        {icon}
                        {label}
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
              )}
            </>
          ) : (
            <>
              {card.categories && card.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                    >
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
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500 mb-1">전화번호</p>
                    <a href={`tel:${card.phone}`} className="text-base text-blue-600 hover:underline">
                      {formatPhoneNumber(card.phone)}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`tel:${card.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <PhoneCall size={13} />전화
                      </a>
                      <a
                        href={`sms:${card.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <MessageSquare size={13} />문자
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('phone', card.phone)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Copy size={13} />
                        {copiedField === 'phone' ? '복사됨' : '복사'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {card.email && (
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-gray-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-500 mb-1">이메일</p>
                    <a
                      href={`mailto:${card.email}`}
                      className="text-base text-blue-600 hover:underline break-all"
                    >
                      {card.email}
                    </a>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={`mailto:${card.email}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                      >
                        <Mail size={13} />메일 보내기
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('email', card.email)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Copy size={13} />
                        {copiedField === 'email' ? '복사됨' : '복사'}
                      </button>
                    </div>
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

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />{isImageOnlyEdit ? '사진 저장' : '저장'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleExportVCard}
                className="w-full py-3 rounded-lg border border-gray-200 text-gray-700 font-medium
                           hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={17} />vCard 저장
              </button>

              <button
                onClick={handleStartImageOnlyEdit}
                className="w-full py-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-medium
                           hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Camera size={17} />사진만 빠르게 교체
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => onToggleFavorite(card.id)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg font-medium
                             transition-all duration-200 whitespace-nowrap
                             ${
                               card.favorite
                                 ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                             }`}
                >
                  <Star size={17} className={card.favorite ? 'fill-yellow-500' : ''} />
                  {card.favorite ? '해제' : '즐겨찾기'}
                </button>

                <button
                  onClick={handleStartEdit}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                             hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={17} />수정
                </button>

                <button
                  onClick={handleDelete}
                  className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200
                             flex items-center justify-center gap-2
                             ${
                               showDeleteConfirm
                                 ? 'bg-red-600 text-white hover:bg-red-700'
                                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                             }`}
                >
                  <Trash2 size={17} />
                  {showDeleteConfirm ? '확인' : '삭제'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
