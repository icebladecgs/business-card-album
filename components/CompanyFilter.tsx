'use client';

import { LayoutGrid } from 'lucide-react';
import type { CompanyGroup } from '@/types/business-card';

interface CompanyFilterProps {
  companies: CompanyGroup[];
  categories: string[];
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
}

export default function CompanyFilter({
  companies,
  categories,
  selectedCompany,
  onCompanyChange,
}: CompanyFilterProps) {
  const totalCount = companies.reduce((sum, group) => sum + group.count, 0);
  const totalFavorites = companies.reduce(
    (sum, group) => sum + group.cards.filter((c) => c.favorite).length,
    0
  );

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <LayoutGrid size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-800">보기 구분</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 전체 버튼 */}
        <button
          type="button"
          onClick={() => onCompanyChange('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
            ${selectedCompany === ''
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
            }`}
        >
          전체 ({totalCount})
        </button>

        {/* 즐겨찾기 버튼 */}
        {totalFavorites > 0 && (
          <button
            type="button"
            onClick={() => onCompanyChange('favorites')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
              ${selectedCompany === 'favorites'
                ? 'bg-yellow-500 border-yellow-500 text-white'
                : 'bg-white border-yellow-300 text-yellow-600 hover:border-yellow-400 hover:text-yellow-700'
              }`}
          >
            ⭐ 즐겨찾기 ({totalFavorites})
          </button>
        )}

        {/* 관계 구분 버튼들 */}
        {categories.map((cat) => {
          const count = companies.reduce((sum, g) =>
            sum + g.cards.filter((c) => c.categories?.includes(cat)).length, 0);
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCompanyChange(`category:${cat}`)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
                ${selectedCompany === `category:${cat}`
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-white border-purple-200 text-purple-600 hover:border-purple-400'
                }`}
            >
              {cat} ({count})
            </button>
          );
        })}

        {/* 회사별 버튼들 */}
        {companies.map((group) => (
          <button
            key={group.company}
            type="button"
            onClick={() => onCompanyChange(`company:${group.company}`)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all duration-150
              ${selectedCompany === `company:${group.company}`
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-green-200 text-green-700 hover:border-green-400'
              }`}
          >
            {group.company} ({group.count})
          </button>
        ))}
      </div>
    </div>
  );
}
