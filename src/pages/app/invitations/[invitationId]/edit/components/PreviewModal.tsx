import { useState, useEffect, useCallback } from 'react';
import InvitationRenderer from './InvitationRenderer';
import type { InvitationDocument, PreviewDevice } from '../types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvitationDocument;
  title: string;
  assetLookup?: Map<string, string>;
  defaultDevice?: PreviewDevice;
}

export default function PreviewModal({
  isOpen,
  onClose,
  document,
  title,
  assetLookup,
  defaultDevice = 'desktop',
}: PreviewModalProps) {
  const [device, setDevice] = useState<PreviewDevice>(defaultDevice);

  useEffect(() => {
    setDevice(defaultDevice);
  }, [defaultDevice, isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const scale = device === 'desktop' ? 0.65 : 0.42;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-[720px] w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Invitation preview"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eee7df] flex-shrink-0">
          <h3 className="font-label text-sm font-semibold text-foreground-900 truncate">
            {title || 'Invitation Preview'}
          </h3>

          <div className="flex items-center gap-3">
            {/* Device toggle */}
            <div className="flex items-center gap-1 bg-background-50 rounded-lg p-1">
              <button
                onClick={() => setDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  device === 'desktop'
                    ? 'bg-white text-foreground-900 shadow-sm'
                    : 'text-foreground-400 hover:text-foreground-600'
                }`}
              >
                <i className="ri-computer-line text-sm" />
                Desktop
              </button>
              <button
                onClick={() => setDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  device === 'mobile'
                    ? 'bg-white text-foreground-900 shadow-sm'
                    : 'text-foreground-400 hover:text-foreground-600'
                }`}
              >
                <i className="ri-smartphone-line text-sm" />
                Mobile
              </button>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 hover:text-foreground-600 transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#faf7f2]">
          {device === 'desktop' ? (
            <div className="bg-[#f5efe0] rounded-xl p-6 shadow-inner">
              <InvitationRenderer
                document={document}
                scale={scale}
                assetLookup={assetLookup}
                interactive={false}
              />
            </div>
          ) : (
            <div className="bg-[#1a1a1a] rounded-[32px] p-4 shadow-2xl">
              <div className="bg-[#f5efe0] rounded-[20px] p-3">
                <InvitationRenderer
                  document={document}
                  scale={scale}
                  assetLookup={assetLookup}
                  interactive={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}