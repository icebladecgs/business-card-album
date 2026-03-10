'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download, Upload as UploadIcon, Search } from 'lucide-react';
import type { BusinessCard, CompanyGroup, PaginationInfo } from '@/types/business-card';
import {
  getAllCards,
  getCardsByCompany,
  deleteCard,
  updateCard,
  toggleFavorite,
  exportToJson,
  importFromJson,
  getCategoryList,
} from '@/lib/storage';
import { downloadFile } from '@/lib/utils';
import BusinessCardGrid from '@/components/BusinessCardGrid';
import BusinessCardDetailModal from '@/components/BusinessCardDetailModal';
import CompanyFilter from '@/components/CompanyFilter';
import PaginationControls from '@/components/PaginationControls';
import InstallAppButton from '@/components/InstallAppButton';  // PWA 설치 버튼

export default function HomePage() {
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  type SortOrder = 'newest' | 'oldest' | 'name' | 'company' | 'fav-first';
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // 반응형 페이지당 카드 수 (모바일: 4개, 데스크탑: 6개)
  const [itemsPerPage, setItemsPerPage] = useState(6);

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 768) {
        setItemsPerPage(4);
      } else {
        setItemsPerPage(6);
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // 데이터 로드
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allCards, groups] = await Promise.all([
        getAllCards(),
        getCardsByCompany(),
      ]);
      setCards(allCards);
      setCompanyGroups(groups);
      setCategories(getCategoryList());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 필터링 + 정렬된 카드 목록
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(card =>
        card.name.toLowerCase().includes(q) ||
        card.company.toLowerCase().includes(q) ||
        card.email.toLowerCase().includes(q) ||
        card.phone.includes(q) ||
        card.title.toLowerCase().includes(q) ||
        card.memo.toLowerCase().includes(q)
      );
    }

    // 보기 구분 필터
    if (selectedCompany === 'favorites') {
      result = result.filter(card => card.favorite);
    } else if (selectedCompany.startsWith('category:')) {
      const cat = selectedCompany.slice('category:'.length);
      result = result.filter((card) => card.categories?.includes(cat));
    } else if (selectedCompany.startsWith('company:')) {
      const company = selectedCompany.slice('company:'.length);
      result = result.filter((card) => (card.company || '미분류') === company);
    }

    // 정렬
    switch (sortOrder) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        break;
      case 'company':
        result.sort((a, b) =>
          (a.company || '미분류').localeCompare(b.company || '미분류', 'ko')
        );
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'fav-first':
        result.sort((a, b) => {
          if (b.favorite !== a.favorite) return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      default: // newest
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [cards, selectedCompany, searchQuery, sortOrder]);

  // 페이지네이션 정보
  const pagination: PaginationInfo = useMemo(() => {
    const totalItems = filteredCards.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    return {
      currentPage,
      totalPages,
      itemsPerPage,
      totalItems,
    };
  }, [filteredCards, currentPage, itemsPerPage]);

  // 페이지 변경 시 범위 체크
  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(1);
    }
  }, [pagination.totalPages, currentPage]);

  const handleCardClick = (card: BusinessCard) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const handleSave = async (updated: Partial<BusinessCard> & { id: string }) => {
    try {
      await updateCard(updated);
      await loadData();
      // 모달의 card prop 갱신
      setSelectedCard(prev => prev ? { ...prev, ...updated } : null);
    } catch {
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
      await loadData();
      setSelectedCard(null);
    } catch (error) {
      alert('명함 삭제에 실패했습니다.');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      // 즉시 UI 반영 (냙관적 업데이트)
      if (selectedCard && selectedCard.id === id) {
        setSelectedCard(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
      }
      await toggleFavorite(id);
      await loadData();
    } catch (error) {
      // 실패 시 원래대로 실전 실패 쇼리
      if (selectedCard && selectedCard.id === id) {
        setSelectedCard(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
      }
      alert('즐겨찾기 설정에 실패했습니다.');
    }
  };

  const handleExport = async () => {
    try {
      const jsonData = await exportToJson();
      const filename = `business-cards-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonData, filename);
    } catch (error) {
      alert('내보내기에 실패했습니다.');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const count = await importFromJson(text);
        alert(`${count}개의 명함을 가져왔습니다.`);
        await loadData();
      } catch (error) {
        alert('가져오기에 실패했습니다. 파일 형식을 확인해주세요.');
      }
    };

    input.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">명함 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📇 명함첩</h1>
            
            <div className="flex items-center gap-2">
              <InstallAppButton />
              <button
                onClick={handleExport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="내보내기"
              >
                <Download size={20} />
              </button>
              <button
                onClick={handleImport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="가져오기"
              >
                <UploadIcon size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색창 */}
        <div className="mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="이름, 회사, 전화번호, 이메일 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                         placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* 보기 구분 필터 */}
        <div className="mb-4">
          <CompanyFilter
            companies={companyGroups}
            categories={categories}
            selectedCompany={selectedCompany}
            onCompanyChange={(company) => {
              setSelectedCompany(company);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* 정렬 옵션 */}
        <div className="mb-5 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">정렬:</span>
          {([
            { key: 'newest',   label: '최신순' },
            { key: 'oldest',   label: '오래된순' },
            { key: 'name',     label: '이름순' },
            { key: 'company',  label: '회사순' },
            { key: 'fav-first', label: '⭐ 먼저' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSortOrder(key); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all
                ${sortOrder === key
                  ? 'bg-gray-700 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-500'
                }`}
            >
              {label}
            </button>
          ))}
          {(searchQuery || selectedCompany || sortOrder !== 'newest') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedCompany(''); setSortOrder('newest'); setCurrentPage(1); }}
              className="px-2.5 py-1 text-xs rounded-full border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-all ml-auto"
            >
              초기화
            </button>
          )}
        </div>

        {/* 명함 그리드 */}
        <BusinessCardGrid
          cards={filteredCards}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onCardClick={handleCardClick}
        />

        {/* 페이지네이션 */}
        {filteredCards.length > 0 && (
          <PaginationControls
            pagination={pagination}
            onPageChange={setCurrentPage}
          />
        )}
      </main>

      {/* FAB - 명함 추가 버튼 */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {/* 일괄 추가 버튼 */}
        <button
          onClick={() => router.push('/batch')}
          title="여러 장 일괄 추가"
          className="w-12 h-12 bg-gray-700 text-white rounded-full
                     shadow-lg hover:bg-gray-900 hover:scale-110 transition-all duration-200
                     flex items-center justify-center"
        >
          <span className="text-lg font-bold leading-none">⊞</span>
        </button>
        {/* 단건 추가 버튼 */}
        <button
          onClick={() => router.push('/add')}
          title="명함 추가"
          className="w-16 h-16 bg-blue-600 text-white rounded-full
                     shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-200
                     flex items-center justify-center"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* 상세 모달 */}
      {selectedCard && (
        <BusinessCardDetailModal
          card={selectedCard}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}
