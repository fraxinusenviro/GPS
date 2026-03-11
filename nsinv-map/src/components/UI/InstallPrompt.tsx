import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const visitCount = parseInt(localStorage.getItem('nsinv-visit-count') ?? '0') + 1;
    localStorage.setItem('nsinv-visit-count', String(visitCount));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visitCount >= 2) setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  };

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-sidebar text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-600 max-w-sm w-full mx-4">
      <Download size={18} className="text-accent shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">Install NSINV Map</p>
        <p className="text-xs text-slate-400">Add to home screen for offline use</p>
      </div>
      <button onClick={handleInstall} className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors">
        Install
      </button>
      <button onClick={() => setShow(false)} className="text-slate-400 hover:text-slate-200">
        <X size={16} />
      </button>
    </div>
  );
}
