import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import {
  Home, Music4, BookMarked, Activity, Menu, X, LayoutGrid,
  TrendingUp, Layers, Target, Settings, Check, Languages
} from 'lucide-react';
import { ViewMode } from '../types/dizi';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
}
const entries = [
  { id:'overview', en:'Home', zh:'首页', Icon:Home },
  { id:'transcribe', en:'Transcribe', zh:'转谱', Icon:Music4 },
  { id:'songbook', en:'Songs', zh:'曲库', Icon:BookMarked },
  { id:'tuner', en:'Tuner', zh:'校音', Icon:Activity },
  { id:'fingering', en:'Fingering Library', zh:'指法大全', Icon:LayoutGrid },
  { id:'scales', en:'Scales & Modes', zh:'音阶调式', Icon:TrendingUp },
  { id:'harmony', en:'Harmony & Arpeggios', zh:'和声琶音', Icon:Layers },
  { id:'practice', en:'Practice Studio', zh:'练习工作台', Icon:Target },
  { id:'settings', en:'Settings', zh:'设置', Icon:Settings },
] as const;

export const MobileNavigation: React.FC<Props> = ({currentView,onSelectView}) => {
  const { language, setLanguage } = useLanguage();
  const [open,setOpen] = useState(false);
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event:KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = original; window.removeEventListener('keydown',close); };
  },[open]);
  const choose = (id:ViewMode) => { onSelectView(id); setOpen(false); };
  const main = entries.slice(0,4);
  return <>
    <nav aria-label="Mobile navigation" className="joe-dizi-mobile-nav md:hidden">
      {main.map(({id,en,zh,Icon}) =>
        <button key={id} type="button" onClick={() => choose(id)} aria-current={currentView === id ? 'page':undefined} className={currentView === id ? 'selected':''}>
          <Icon size={18} strokeWidth={2}/>
          <span>{language === 'zh' ? zh : en}</span>
        </button>)}
      <button type="button" aria-haspopup="dialog" aria-expanded={open} className={open || !main.some(v=>v.id===currentView) ? 'selected':''} onClick={() => setOpen(true)}>
        <Menu size={18}/><span>{language === 'zh' ? '更多' : 'More'}</span>
      </button>
    </nav>
    <AnimatePresence>
      {open && <div className="joe-dizi-mobile-drawer md:hidden" role="presentation">
        <motion.button type="button" className="joe-dizi-mobile-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/>
        <motion.section className="joe-dizi-mobile-sheet" role="dialog" aria-modal="true" aria-label={language === 'zh' ? '导航菜单' : 'Studio navigation'}
          initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
          transition={{type:'spring',damping:30,stiffness:320}}
          drag="y" dragControls={drag} dragListener={false} dragConstraints={{top:0}} dragElastic={{top:0,bottom:.5}}
          onDragEnd={(_,info)=>{if(info.offset.y>80 || info.velocity.y>350)setOpen(false);}}>
          <div className="joe-dizi-mobile-handle" onPointerDown={event=>drag.start(event)} style={{touchAction:'none'}}>
            <span className="joe-dizi-mobile-grip"/>
            <div className="flex items-center justify-between">
              <strong>JOE DIZI <span className="text-[#B4F45A]">{language==='zh'?'导航':'Studio'}</span></strong>
              <button type="button" className="joe-dizi-mobile-close" onClick={()=>setOpen(false)} aria-label="Close"><X size={19}/></button>
            </div>
          </div>
          <div className="joe-dizi-mobile-sheet-content">
            <div className="joe-dizi-mobile-grid">
              {entries.map(({id,en,zh,Icon})=>
                <button type="button" key={id} aria-current={currentView===id?'page':undefined} className={currentView===id?'selected':''} onClick={()=>choose(id)}>
                  {currentView===id && <Check className="joe-dizi-mobile-check" size={15}/>}
                  <Icon size={23}/><span>{language==='zh'?zh:en}</span>
                </button>)}
            </div>
            <div className="joe-dizi-mobile-language">
              <Languages size={17}/><span>{language==='zh'?'界面语言':'Language'}</span>
              <button type="button" className={language==='en'?'selected':''} onClick={()=>setLanguage('en')}>EN</button>
              <button type="button" className={language==='zh'?'selected':''} onClick={()=>setLanguage('zh')}>中文</button>
            </div>
          </div>
        </motion.section>
      </div>}
    </AnimatePresence>
  </>;
};
