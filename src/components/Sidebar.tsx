import React from 'react';
import { ViewMode } from '../types/dizi';
import {
  Home,
  Music4,
  LayoutGrid,
  TrendingUp,
  Target,
  BookMarked,
  Activity,
  Layers,
  Settings
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
    <aside className={`w-64 bg-[#091014] border-r border-[#16272C] flex flex-col justify-between py-5 px-3 select-none ${className}`}>
      {/* 1. Brand Logo */}
      <div>
        <div className="flex items-center gap-2.5 px-3 mb-6">
          {/* Bamboo Sprout Icon */}
          <div className="w-8 h-8 rounded-lg bg-[#112320] border border-[#1E3B35] flex items-center justify-center text-[#B4F45A] shadow-inner">
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
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
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
                  <span className="tracking-wide">{item.labelEn}</span>
                </div>

                <span
                  className={`text-[10px] font-calligraphy transition-colors ${
                    isActive ? 'text-[#36B39B]' : 'text-[#4F5E61] group-hover:text-[#7A8C8E]'
                  }`}
                >
                  {item.labelZh}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Traditional Bamboo Ink Emblem */}
      <div className="relative pt-6 px-3 border-t border-[#16272C] overflow-hidden">
        {/* Subtle bamboo plant background silhouette */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-[10px] tracking-widest uppercase text-[#536569] font-mono">
              Traditional Bamboo Flute
            </div>
            <div className="text-[9px] tracking-wider text-[#3B4C4F] font-mono">
              Modern Studio
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
