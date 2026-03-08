'use client';

import { Building2 } from 'lucide-react';
import type { CompanyGroup } from '@/types/business-card';

interface CompanyFilterProps {
  companies: CompanyGroup[];
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
}

export default function CompanyFilter({
  companies,
  selectedCompany,
  onCompanyChange,
}: CompanyFilterProps) {
  const totalCount = companies.reduce((sum, group) => sum + group.count, 0);
  
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={20} className="text-blue-600" />
        <h3 className="font-semibold text-gray-800">회사별 보기</h3>
      </div>
      
      <select
        value={selectedCompany}
        onChange={(e) => onCompanyChange(e.target.value)}
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   bg-white cursor-pointer"
      >
        <option value="">전체 ({totalCount})</option>
        {companies.map((group) => (
          <option key={group.company} value={group.company}>
            {group.company} ({group.count})
          </option>
        ))}
      </select>
    </div>
  );
}
