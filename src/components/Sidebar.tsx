import React from 'react';
import { ViewMode } from '../types/dizi';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Home,
  Music4,
  LayoutGrid,
  TrendingUp,
  Target,
  BookMarked,
  Activity,
  Layers,
  Settings,
  Languages
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  className?: string;
}

interface NavItem {
  id: ViewMode;
  labelEn: string;
  labelZh: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  className = ''
}) => {
  const { language, setLanguage } = useLanguage();
  const navItems: NavItem[] = [
    { id: 'overview', labelEn: 'Overview', labelZh: '平台概览', icon: Home },
    { id: 'transcribe', labelEn: 'Transcribe', labelZh: '转谱与简谱', icon: Music4 },
    { id: 'fingering', labelEn: 'Fingering Library', labelZh: '指法大全', icon: LayoutGrid },
    { id: 'scales', labelEn: 'Scales & Modes', labelZh: '音阶与调式', icon: TrendingUp },
    { id: 'harmony', labelEn: 'Harmony & Arpeggio', labelZh: '和声与琶音', icon: Layers },
    { id: 'practice', labelEn: 'Practice Studio', labelZh: '慢练工作台', icon: Target },
    { id: 'songbook', labelEn: 'My Songbook', labelZh: '名曲谱库', icon: BookMarked },
    { id: 'tuner', labelEn: 'Dizi Tuner', labelZh: '笛子校音器', icon: Activity },
    { id: 'settings', labelEn: 'Settings', labelZh: '笛韵设置', icon: Settings },
  ];

  return (
    <aside className={`w-[210px] xl:w-[224px] bg-[#091014] border-r border-[#16272C] flex flex-col justify-between py-3 px-2 select-none overflow-y-auto ${className}`}>
      {/* 1. Brand Logo */}
      <div>
        <div className="flex items-center gap-2 px-2.5 mb-4">
          {/* Bamboo Sprout Icon */}
          <div className="w-8 h-8 rounded-lg bg-[#112320] border border-[#1E3B35] flex items-center justify-center text-[#B4F45A] shadow-inner shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              {/* Stylized Bamboo Leaf Sprout */}
              <path d="M 12 2 C 12 2 13 8 18 10 C 13 11 12 16 12 22 C 12 16 11 11 6 10 C 11 8 12 2 12 2 Z" />
              <path d="M 12 10 Q 17 6 21 8 Q 17 12 12 10 Z" opacity="0.75" />
            </svg>
          </div>

          <div>
            <div className="font-serif font-bold text-base tracking-wider text-[#F3F5F4] flex items-baseline gap-1">
              <span>JOE DIZI</span>
            </div>
            <div className="text-[10px] tracking-widest text-[#36B39B] font-mono uppercase">
              FLUTE STUDIO
            </div>
          </div>
        </div>

        {/* 2. Navigation List */}
        <nav className="space-y-0.5" aria-label={language === 'zh' ? '主导航' : 'Main navigation'}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-[12px] font-medium transition-all group ${
                  isActive
                    ? 'bg-[#122527] text-[#B4F45A] shadow-sm border border-[#1F3D3D]'
                    : 'text-[#94A3A7] hover:text-[#F3F5F4] hover:bg-[#111D20]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#B4F45A]' : 'text-[#627376] group-hover:text-[#F3F5F4]'
                    }`}
                  />
                  <span className="tracking-wide">{language === 'zh' ? item.labelZh : item.labelEn}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Global language switch, saved on this device. */}
      <div className="relative pt-3 px-2 border-t border-[#16272C]">
        <div className="mb-2 flex items-center gap-2 text-xs text-[#94A3A7]"><Languages className="h-4 w-4" />{language === 'zh' ? '界面语言' : 'Language'}</div>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#111D20] p-1" role="group" aria-label="Choose interface language">
          {(['en', 'zh'] as const).map(option => <button key={option} type="button"
            onClick={() => setLanguage(option)} aria-pressed={language === option}
            className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${language === option ? 'bg-[#B4F45A] text-[#0B1014]' : 'text-[#94A3A7] hover:text-white'}`}>
            {option === 'en' ? 'English' : '中文'}
          </button>)}
        </div>
        {/* Subtle bamboo plant background silhouette */}
        <div className="mt-3 flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-[10px] tracking-widest uppercase text-[#536569] font-mono">
              {language === 'zh' ? '传统竹笛' : 'Traditional Bamboo Flute'}
            </div>
            <div className="text-[9px] tracking-wider text-[#3B4C4F] font-mono">
              {language === 'zh' ? '现代工作室' : 'Modern Studio'}
            </div>
          </div>

          {/* Chinese Seal Stamp Calligraphy "中國笛" */}
          <div className="flex flex-col items-center">
            <span className="font-calligraphy text-base font-bold text-[#8C9C98] tracking-widest writing-vertical">
              中國笛
            </span>
            <div className="w-4 h-1 bg-[#B4F45A] rounded-full mt-1.5 opacity-60" />
          </div>
        </div>
      </div>
    </aside>
  );
};
