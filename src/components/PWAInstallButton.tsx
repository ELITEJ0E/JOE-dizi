import React, { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    setInstalled(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setShowGuide(false); };
    const onDisplay = () => setInstalled(standalone.matches);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    standalone.addEventListener('change', onDisplay);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      standalone.removeEventListener('change', onDisplay);
    };
  }, []);

  const install = async () => {
    if (!deferred) { setShowGuide(true); return; }
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === 'accepted') setDeferred(null);
  };

  if (installed) return null;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return <>
    <button onClick={() => void install()} title="Install JOE Dizi on your device"
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#36B39B]/60 bg-[#112320] px-2.5 py-1.5 text-xs font-semibold text-[#B4F45A] hover:border-[#B4F45A] transition-colors">
      <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Install App</span>
    </button>
    {showGuide && <div role="dialog" aria-modal="true" aria-label="Install JOE Dizi" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
      <div className="relative w-full max-w-sm space-y-3 rounded-xl border border-[#29483E] bg-[#111D20] p-5 shadow-2xl">
        <button onClick={() => setShowGuide(false)} aria-label="Close installation help" className="absolute right-3 top-3 text-[#94A3A7] hover:text-white"><X className="h-5 w-5" /></button>
        <img src="/icons/dizi-192.png" alt="JOE Dizi app icon" className="h-14 w-14 rounded-xl" />
        <h2 className="font-serif text-lg font-bold">Install JOE Dizi</h2>
        <p className="text-sm leading-relaxed text-[#B9C8C6]">{isIOS
          ? 'In Safari, tap Share, then Add to Home Screen. Open the new JOE Dizi icon to use the app.'
          : 'Open your browser menu and choose Install app or Add to Home screen. For Chrome desktop, use the Install icon near the address bar.'}</p>
        {isIOS && <Share2 className="h-5 w-5 text-[#B4F45A]" />}
        <p className="text-xs text-[#849797]">Installation requires HTTPS (or localhost). Saved scores stay on this device; some media links still need internet.</p>
        <button onClick={() => setShowGuide(false)} className="rounded-lg bg-[#B4F45A] px-4 py-2 text-xs font-bold text-[#0B1014]">Got it</button>
      </div>
    </div>}
  </>;
};
