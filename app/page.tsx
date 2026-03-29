'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Download, Upload as UploadIcon, Search, Star, Building2, Clock3, BarChart3 } from 'lucide-react';
import type { BusinessCard, CompanyGroup, PaginationInfo } from '@/types/business-card';
import {
  getAllCards,
  getCardsByCompany,
  deleteCard,
  updateCard,
  toggleFavorite,
  exportToJson,
  importFromJson,
  importFromSpreadsheet,
  getCategoryList,
} from '@/lib/storage';
import { downloadFile } from '@/lib/utils';
import BusinessCardGrid from '@/components/BusinessCardGrid';
import BusinessCardDetailModal from '@/components/BusinessCardDetailModal';
import CompanyFilter from '@/components/CompanyFilter';
import PaginationControls from '@/components/PaginationControls';
import InstallAppButton from '@/components/InstallAppButton';  // PWA 설치 버튼
import {
  getCurrentUser,
  isSupabaseConfigured,
  signInWithGoogle,
  signOutSupabase,
  subscribeAuthChange,
} from '@/lib/supabase';

const APP_VERSION = 'v1.0.0';
const LAST_UPDATED_AT = '2026.03.29 21:20';

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
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  useEffect(() => {
    const loadAuth = async () => {
      setIsAuthLoading(true);
      const user = await getCurrentUser();
      setAuthEmail(user?.email ?? null);
      setIsAuthLoading(false);
    };

    void loadAuth();

    const unsubscribe = subscribeAuthChange(() => {
      void loadAuth();
      void loadData();
    });

    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    try {
      if (!isSupabaseConfigured()) {
        alert('Supabase 설정이 필요합니다. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.');
        return;
      }
      await signInWithGoogle(window.location.origin);
    } catch {
      alert('구글 로그인에 실패했습니다.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOutSupabase();
      setAuthEmail(null);
      await loadData();
    } catch {
      alert('로그아웃에 실패했습니다.');
    }
  };

  const dashboardStats = useMemo(() => {
    const sortedCompanies = [...companyGroups].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.company.localeCompare(b.company, 'ko');
    });

    const categoryCounts = cards.reduce<Record<string, number>>((acc, card) => {
      for (const category of card.categories || []) {
        acc[category] = (acc[category] || 0) + 1;
      }
      return acc;
    }, {});

    const topCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name, 'ko');
      })
      .slice(0, 5);

    const favoriteCount = cards.filter((card) => card.favorite).length;
    const recentCount = cards.filter((card) => {
      const createdAt = new Date(card.createdAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return createdAt >= sevenDaysAgo;
    }).length;
    const topCompany = sortedCompanies[0] ?? null;

    return {
      totalCards: cards.length,
      favoriteCount,
      recentCount,
      topCompany,
      topCompanies: sortedCompanies.slice(0, 5),
      topCategories,
    };
  }, [cards, companyGroups]);

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
        card.memo.toLowerCase().includes(q) ||
        (card.categories?.some((category) => category.toLowerCase().includes(q)) ?? false)
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
    } catch {
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
    } catch {
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
    } catch {
      alert('내보내기에 실패했습니다.');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.xlsx,.xls,.csv,application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        let count = 0;
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.json')) {
          const text = await file.text();
          count = await importFromJson(text);
        } else if (
          lowerName.endsWith('.xlsx') ||
          lowerName.endsWith('.xls') ||
          lowerName.endsWith('.csv')
        ) {
          count = await importFromSpreadsheet(file);
        } else {
          throw new Error('unsupported-file-type');
        }

        alert(`${count}개의 명함을 가져왔습니다.`);
        await loadData();
      } catch {
        alert('가져오기에 실패했습니다. JSON/엑셀/CSV 파일 형식을 확인해주세요.');
      }
    };

    input.click();
  };

  const handleRememberImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const count = await importFromSpreadsheet(file);
        alert(
          `${count}개의 명함을 리멤버 파일에서 가져왔습니다.\n(리멤버 내보내기 특성상 사진은 제외되고 연락처 정보만 가져옵니다.)`
        );
        await loadData();
      } catch {
        alert('리멤버 파일 가져오기에 실패했습니다. 엑셀/CSV 파일인지 확인해주세요.');
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">📇 명함첩</h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {APP_VERSION}
              </span>
              <span className="text-xs text-gray-500">
                업데이트 {LAST_UPDATED_AT}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <InstallAppButton />
              {isSupabaseConfigured() && (
                authEmail ? (
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-xs text-gray-500 truncate max-w-[180px]">{authEmail}</span>
                    <button
                      onClick={handleLogout}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isAuthLoading}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                  >
                    구글 로그인
                  </button>
                )
              )}
              <button
                onClick={handleRememberImport}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="리멤버 엑셀/CSV 가져오기"
              >
                리멤버 가져오기
              </button>
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
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">전체 명함</span>
              <BarChart3 size={18} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalCards}</p>
            <p className="mt-1 text-xs text-gray-500">저장된 연락처 기준</p>
          </div>

          <div className="rounded-2xl border border-yellow-100 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">즐겨찾기</span>
              <Star size={18} className="text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboardStats.favoriteCount}</p>
            <p className="mt-1 text-xs text-gray-500">중요 연락처 빠른 확인</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">최근 7일</span>
              <Clock3 size={18} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{dashboardStats.recentCount}</p>
            <p className="mt-1 text-xs text-gray-500">최근 등록된 명함</p>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">주요 회사</span>
              <Building2 size={18} className="text-violet-600" />
            </div>
            <p className="truncate text-lg font-bold text-gray-900">
              {dashboardStats.topCompany?.company ?? '아직 없음'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {dashboardStats.topCompany ? `${dashboardStats.topCompany.count}장 보유` : '명함을 추가하면 집계됩니다'}
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">회사 분포</h2>
                <p className="text-xs text-gray-500">가장 많이 저장된 회사 순</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                TOP {dashboardStats.topCompanies.length}
              </span>
            </div>

            <div className="space-y-3">
              {dashboardStats.topCompanies.length > 0 ? dashboardStats.topCompanies.map((group) => {
                const maxCount = dashboardStats.topCompanies[0]?.count || 1;
                const width = Math.max(18, Math.round((group.count / maxCount) * 100));

                return (
                  <div key={group.company}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-gray-700">{group.company}</span>
                      <span className="text-xs text-gray-500">{group.count}장</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  아직 집계할 회사 데이터가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">관계 구분 분포</h2>
                <p className="text-xs text-gray-500">자주 쓰는 관계 태그 순</p>
              </div>
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                TOP {dashboardStats.topCategories.length}
              </span>
            </div>

            <div className="space-y-3">
              {dashboardStats.topCategories.length > 0 ? dashboardStats.topCategories.map((category) => {
                const maxCount = dashboardStats.topCategories[0]?.count || 1;
                const width = Math.max(18, Math.round((category.count / maxCount) * 100));

                return (
                  <div key={category.name}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-gray-700">{category.name}</span>
                      <span className="text-xs text-gray-500">{category.count}건</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  아직 선택된 관계 구분 데이터가 없습니다.
                </p>
              )}
            </div>
          </div>
        </section>

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

        <div className="mb-5 flex items-center justify-between rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm">
          <p>
            현재 <span className="font-semibold text-gray-900">{filteredCards.length}개</span>를 보고 있습니다.
          </p>
          <p className="text-xs text-gray-500">
            전체 {cards.length}개 / {pagination.totalPages}페이지
          </p>
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
