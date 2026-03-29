'use client';

import { useState, useEffect, useMemo } from 'react';
import type { OcrResult } from '@/types/business-card';
import { getCategoryList, addCategoryItem, removeCategoryItem } from '@/lib/storage';

interface OcrPreviewFormProps {
  ocrResult: OcrResult;
  onSubmit: (data: {
    company: string;
    name: string;
    title: string;
    phone: string;
    email: string;
    memo: string;
    categories: string[];
  }) => void;
  isSubmitting?: boolean;
}

export default function OcrPreviewForm({
  ocrResult,
  onSubmit,
  isSubmitting = false,
}: OcrPreviewFormProps) {
  const [formData, setFormData] = useState({
    company: ocrResult.company,
    name: ocrResult.name,
    title: ocrResult.title,
    phone: ocrResult.phone,
    email: ocrResult.email,
    memo: '',
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const verification = useMemo(() => {
    const checks = [
      { key: 'company', label: '회사명', ok: Boolean(formData.company.trim()) },
      { key: 'name', label: '이름', ok: Boolean(formData.name.trim()) },
      { key: 'title', label: '직책', ok: Boolean(formData.title.trim()) },
      { key: 'phone', label: '전화번호', ok: Boolean(formData.phone.trim()) },
      { key: 'email', label: '이메일', ok: Boolean(formData.email.trim()) },
    ] as const;

    return {
      isLowConfidence: ocrResult.confidence > 0 && ocrResult.confidence < 0.6,
      checks,
      missingCount: checks.filter((field) => !field.ok).length,
    };
  }, [formData, ocrResult.confidence]);

  const getInputClassName = (field: 'company' | 'name' | 'title' | 'phone' | 'email') => {
    const base = 'w-full px-4 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent';
    const needsAttention = verification.isLowConfidence && !formData[field].trim();

    return needsAttention
      ? `${base} border-amber-300 bg-amber-50 focus:ring-amber-500`
      : `${base} border-gray-300 focus:ring-blue-500`;
  };

  useEffect(() => {
    setCategoryList(getCategoryList());
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const updated = addCategoryItem(trimmed);
    setCategoryList(updated);
    setSelectedCategories((prev) => [...prev, trimmed]);
    setNewCategory('');
    setShowAddInput(false);
  };

  const handleRemoveCategory = (cat: string) => {
    const updated = removeCategoryItem(cat);
    setCategoryList(updated);
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    onSubmit({ ...formData, categories: selectedCategories });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          ✏️ OCR 결과를 확인하고 수정하세요
        </p>
      </div>

      {verification.isLowConfidence && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ OCR 신뢰도가 낮습니다. 아래 항목을 특히 확인해주세요.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {verification.checks.map((field) => (
              <span
                key={field.key}
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  field.ok
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {field.label} {field.ok ? '확인됨' : '확인 필요'}
              </span>
            ))}
          </div>
          <p className="text-xs text-amber-700">
            미확인 항목 {verification.missingCount}개
          </p>
        </div>
      )}

      {/* 관계 구분 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          관계 구분 <span className="text-xs text-gray-400">(중복 선택 가능)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {categoryList.map((cat) => (
            <div key={cat} className="relative group">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
                  ${selectedCategories.includes(cat)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
              >
                {cat}
              </button>
              <button
                type="button"
                onClick={() => handleRemoveCategory(cat)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs
                           items-center justify-center hidden group-hover:flex leading-none"
              >
                ×
              </button>
            </div>
          ))}

          {showAddInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                placeholder="구분명"
                autoFocus
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => { setShowAddInput(false); setNewCategory(''); }}
                className="px-2 py-1 text-sm bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddInput(true)}
              className="px-3 py-1.5 rounded-full text-sm border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              + 추가
            </button>
          )}
        </div>
      </div>

      {/* 회사명 */}
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
          회사명
        </label>
        <input
          id="company"
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          placeholder="회사명을 입력하세요"
          className={getInputClassName('company')}
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="이름을 입력하세요"
          required
          className={getInputClassName('name')}
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          직책
        </label>
        <input
          id="title"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="직책을 입력하세요"
          className={getInputClassName('title')}
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          전화번호
        </label>
        <input
          id="phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="010-1234-5678"
          className={getInputClassName('phone')}
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="example@company.com"
          className={getInputClassName('email')}
        />
      </div>

      <div>
        <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
          메모
        </label>
        <textarea
          id="memo"
          name="memo"
          value={formData.memo}
          onChange={handleChange}
          placeholder="추가 메모를 입력하세요"
          rows={3}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors duration-200 text-lg"
      >
        {isSubmitting ? '저장 중...' : '명함 저장'}
      </button>
    </form>
  );
}
