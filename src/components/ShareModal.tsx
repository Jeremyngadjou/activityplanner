import React, { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle, ExternalLink, ShieldCheck } from 'lucide-react';

interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ shareUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `Salut ! J'ai listé les activités que j'aimerais faire en novembre. Choisis ce qui te chauffe et tes créneaux directement ici : ${shareUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <span>Partager le lien avec vos amis</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice explaining the 403 resolution */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Lien public accessible à tous (sans erreur 403)</span>
          </div>
          <p className="leading-relaxed">
            Le lien ci-dessous (avec <strong>ais-pre-</strong>) est ouvert à tout le monde. Vos amis peuvent l'ouvrir directement sur leur smartphone ou ordi sans aucun compte.
          </p>
        </div>

        {/* Link box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Lien direct à envoyer
          </label>
          <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-2 text-xs font-mono text-slate-800 bg-transparent focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Envoyer sur WhatsApp</span>
          </a>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Tester comme un ami</span>
          </a>
        </div>
      </div>
    </div>
  );
};
