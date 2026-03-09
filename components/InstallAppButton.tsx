'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusSquare, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isIos = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // 바깥 클릭 시 iOS 안내 닫기
  useEffect(() => {
    if (!showIosGuide) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowIosGuide(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showIosGuide]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      return;
    }
    if (isIos) {
      setShowIosGuide((prev) => !prev);
      return;
    }
  };

  // 이미 설치됐거나, Android에서 아직 prompt 이벤트 안 온 경우 숨김
  if (isInstalled || (!deferredPrompt && !isIos)) {
    return null;
  }

  return (
    <div className="relative" ref={tooltipRef}>
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium whitespace-nowrap"
        title="홈 화면에 추가"
      >
        <PlusSquare size={16} />
        <span className="hidden sm:inline">홈 화면에 추가</span>
        <span className="sm:hidden">추가</span>
      </button>

      {/* iOS 안내 말풍선 */}
      {showIosGuide && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 text-white text-sm rounded-xl p-4 shadow-xl z-50">
          <button
            onClick={() => setShowIosGuide(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
          <p className="font-semibold mb-1">홈 화면에 추가하기</p>
          <p className="text-gray-300 leading-relaxed">
            하단 공유 버튼(□↑)을 누른 뒤<br />
            <strong className="text-white">홈 화면에 추가</strong>를 선택하세요.
          </p>
          {/* 말풍선 꼬리 */}
          <div className="absolute -top-1.5 right-5 w-3 h-3 bg-gray-900 rotate-45" />
        </div>
      )}
    </div>
  );
}
