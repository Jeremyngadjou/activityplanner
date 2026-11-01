import React, { useState } from 'react';
import { Lock, KeyRound, X, Check, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, ADMIN_EMAIL } from '../firebase';
import { storeAccessToken } from '../services/calendarService';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user?: any, token?: string) => void;
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
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || '';
        if (token) {
          storeAccessToken(token);
        }
        onSuccess(user, token);
      } else {
        setError(`Accès refusé. Le compte ${user?.email || 'inconnu'} n'est pas autorisé. Seul ${ADMIN_EMAIL} a les droits d'administration.`);
      }
    } catch (err: any) {
      console.error('Erreur connexion Google:', err);
      if (
        err?.code === 'auth/unauthorized-domain' ||
        (err?.message && err.message.includes('unauthorized-domain'))
      ) {
        setError(
          `Le domaine « ${window.location.hostname} » doit être ajouté aux « Domaines autorisés » dans Firebase Console (Authentication > Paramètres > Domaines autorisés). En attendant, utilisez le code PIN.`
        );
      } else {
        setError(err?.message || 'Erreur lors de la connexion Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await onVerifyPin(pin.trim());
      if (isValid) {
        setError(null);
        onSuccess();
      } else {
        setError('Code PIN incorrect.');
        setPin('');
      }
    } catch {
      // Local fallback if offline
      if (savedPin && pin.trim() === savedPin.trim()) {
        setError(null);
        onSuccess();
      } else {
        setError('Code PIN incorrect.');
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
            <span>Espace Organisateur</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Admin Login button */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            disabled={isGoogleLoading || isVerifying}
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Connexion Google (Admin)</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Réservé à <strong className="text-slate-700">{ADMIN_EMAIL}</strong>
          </p>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-400 uppercase font-semibold">
              ou
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {!showPinInput ? (
            <button
              type="button"
              onClick={() => setShowPinInput(true)}
              className="w-full py-2 text-xs text-slate-600 hover:text-slate-900 font-semibold text-center transition-colors cursor-pointer"
            >
              Se connecter avec le code PIN
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
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
                      setError(null);
                    }}
                    className={`w-full pl-9 pr-3.5 py-2 text-center text-sm tracking-widest font-mono bg-slate-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                      error
                        ? 'border-rose-400 ring-2 ring-rose-200 text-rose-700'
                        : 'border-slate-200 focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => setShowPinInput(false)}
                  className="w-full py-2 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !pin.trim()}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Valider</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
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
