import React, { useState } from 'react';
import { Lock, KeyRound, X, Check, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  savedPin?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onVerifyPin,
  savedPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsVerifying(true);
    setError(false);

    try {
      const isValid = await onVerifyPin(pin.trim());
      if (isValid) {
        setError(false);
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    } catch {
      // Local fallback if offline
      if (savedPin && pin.trim() === savedPin.trim()) {
        setError(false);
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <span>Accès Organisateur</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Code PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                maxLength={8}
                autoFocus
                disabled={isVerifying}
                placeholder="Code d'accès"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                className={`w-full pl-9 pr-3.5 py-2.5 text-center text-base tracking-widest font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                  error
                    ? 'border-rose-400 ring-2 ring-rose-200 text-rose-700'
                    : 'border-slate-200 focus:ring-2 focus:ring-amber-500'
                }`}
              />
            </div>
            {error && (
              <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Code incorrect.</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isVerifying}
              onClick={onClose}
              className="w-full py-2.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isVerifying || !pin.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Valider</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  onClose,
  onSavePin,
}) => {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setError('Le nouveau code doit contenir au moins 4 caractères.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Les deux nouveaux codes ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await onSavePin(oldPin.trim(), newPin.trim());
      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Impossible de modifier le code PIN.");
      }
    } catch {
      setError("Erreur de connexion avec le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <span>Modifier le code PIN</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Code PIN actuel
            </label>
            <input
              type="password"
              placeholder="Code actuel"
              disabled={isSubmitting}
              value={oldPin}
              onChange={(e) => {
                setOldPin(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nouveau code PIN (4 chiffres ou plus)
            </label>
            <input
              type="password"
              placeholder="Nouveau code"
              disabled={isSubmitting}
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmer le nouveau code
            </label>
            <input
              type="password"
              placeholder="Confirmez..."
              disabled={isSubmitting}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-wider"
              required
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full py-2.5 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
