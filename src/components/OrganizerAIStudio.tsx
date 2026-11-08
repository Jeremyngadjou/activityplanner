import React, { useState } from 'react';
import { Activity, Category } from '../types';
import { Sparkles, Image as ImageIcon, Plus, Check, Loader2, ArrowRight } from 'lucide-react';

interface OrganizerAIStudioProps {
  activities: Activity[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivityImage: (activityId: string, imageUrl: string) => void;
}

export const OrganizerAIStudio: React.FC<OrganizerAIStudioProps> = ({
  activities,
  onAddActivity,
  onUpdateActivityImage,
}) => {
  // Activity generation state
  const [theme, setTheme] = useState('Moments chaleureux et gourmands d’automne');
  const [modelType, setModelType] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [isGeneratingActivities, setIsGeneratingActivities] = useState(false);
  const [suggestedActivities, setSuggestedActivities] = useState<any[]>([]);
  const [addedIndexes, setAddedIndexes] = useState<number[]>([]);

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('Sortie conviviale en groupe d’amis en extérieur sous une belle lumière dorée');
  const [imageModel, setImageModel] = useState<'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1'>('gemini-3-pro-image-preview');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9'>('4:3');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedActivityIdForImage, setSelectedActivityIdForImage] = useState<string>(activities[0]?.id || '');
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageAssignedSuccess, setImageAssignedSuccess] = useState(false);

  // Generate activities handler
  const handleGenerateActivities = async () => {
    setIsGeneratingActivities(true);
    setAddedIndexes([]);
    try {
      const res = await fetch('/api/generate-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, count: 3, model: modelType }),
      });
      const data = await res.json();
      if (data.success && data.activities) {
        setSuggestedActivities(data.activities);
      }
    } catch (err) {
      console.error('Error generating activities:', err);
    } finally {
      setIsGeneratingActivities(false);
    }
  };

  const handleAddSuggested = (item: any, idx: number) => {
    onAddActivity({
      title: item.title,
      description: item.description,
      category: (item.category as Category) || 'Insolite',
      duration: item.duration || '2h',
      locationType: item.locationType || 'Centre-ville',
      energyLevel: item.energyLevel || 'Modéré',
      accentGradient: 'from-amber-600 via-orange-500 to-amber-700',
      iconName: item.category || 'Sparkles',
      isOrganizerCustom: true,
    });
    setAddedIndexes((prev) => [...prev, idx]);
  };

  // Generate image handler
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    setImageAssignedSuccess(false);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio,
          imageSize,
          model: imageModel,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        setImageError(data.error || 'Impossible de générer l’image pour le moment.');
      }
    } catch (err: any) {
      console.error('Image gen error:', err);
      setImageError(err?.message || 'Erreur réseau lors de la génération.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAssignImageToActivity = () => {
    if (!generatedImage || !selectedActivityIdForImage) return;
    onUpdateActivityImage(selectedActivityIdForImage, generatedImage);
    setImageAssignedSuccess(true);
    setTimeout(() => setImageAssignedSuccess(false), 3000);
  };

  return (
    <div className="space-y-10">
      {/* Section 1: Activities generator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Intelligence Artificielle · Gemini</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Générateur d'Idées de Sorties
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Trouvez instantanément des propositions originales et chaleureuses adaptées à vos envies du moment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thème ou type d'ambiance recherché
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="ex: Gastronomie cocooning, Sports d'intérieur insolites, Soirées jeux..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Modèle Gemini
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Équilibré & Créatif)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Ultra Rapide)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateActivities}
          disabled={isGeneratingActivities || !theme.trim()}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          {isGeneratingActivities ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Génération des idées en cours...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Générer 3 suggestions d'activités</span>
            </>
          )}
        </button>

        {/* Results */}
        {suggestedActivities.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Suggestions générées :</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestedActivities.map((item, idx) => {
                const isAdded = addedIndexes.includes(idx);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 mb-1">
                        <span>{item.category}</span>
                        <span>{item.duration}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-3 mb-3">{item.description}</p>
                    </div>

                    <button
                      onClick={() => handleAddSuggested(item, idx)}
                      disabled={isAdded}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Ajouté au catalogue</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter à mon catalogue</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Image Generation Studio */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            <ImageIcon className="w-4 h-4" />
            <span>Studio Visuel Haute Définition</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Création d'Affiches & Photos avec Gemini Image
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Illustrez vos cartes d'activités avec des visuels personnalisés, choix des formats (1:1 à 21:9) et résolutions (1K, 2K, 4K).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description de l'image (Prompt)
            </label>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="ex: Vue cinématographique d'une dégustation de ramen fumant, néons chauds, ambiance automnale..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Model select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modèle d'image
              </label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview (Studio Pro)</option>
                <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (Général)</option>
              </select>
            </div>

            {/* Resolution Affordance (1K, 2K, 4K) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Résolution d'image
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setImageSize(sz)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      imageSize === sz
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Affordance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format (Aspect Ratio)
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
              >
                <option value="4:3">4:3 (Carte standard)</option>
                <option value="16:9">16:9 (Paysage cinématographique)</option>
                <option value="1:1">1:1 (Carré Instagram)</option>
                <option value="3:2">3:2 (Photo classique)</option>
                <option value="2:3">2:3 (Portrait standard)</option>
                <option value="3:4">3:4 (Affiche verticale)</option>
                <option value="9:16">9:16 (Format Story mobile)</option>
                <option value="21:9">21:9 (Ultra-large)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !imagePrompt.trim()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération du visuel haute fidélité...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Générer l'illustration ({imageSize} · {aspectRatio})</span>
              </>
            )}
          </button>

          {imageError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {imageError} (Note: Les visuels pré-intégrés restent actifs pour toutes vos activités).
            </div>
          )}

          {/* Generated image result & assignment */}
          {generatedImage && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Visuel généré :</h3>
              <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <img
                  src={generatedImage}
                  alt="Aperçu généré"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* Affordance to link image to existing activity */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg">
                <select
                  value={selectedActivityIdForImage}
                  onChange={(e) => setSelectedActivityIdForImage(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none flex-1"
                >
                  {activities.map((act) => (
                    <option key={act.id} value={act.id}>
                      Appliquer à : {act.title}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAssignImageToActivity}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  {imageAssignedSuccess ? 'Visuel associé avec succès !' : 'Associer à cette activité'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
