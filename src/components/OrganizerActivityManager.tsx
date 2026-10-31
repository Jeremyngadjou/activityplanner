import React, { useState } from 'react';
import { Activity, Category, EnergyLevel } from '../types';
import { Plus, Edit3, Trash2, Sparkles, RotateCcw, Image as ImageIcon, Check } from 'lucide-react';
import { ActivityIcon } from './ActivityIcon';

interface OrganizerActivityManagerProps {
  activities: Activity[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
  onResetDefaults: () => void;
}

const CATEGORIES: Category[] = [
  'Gastronomie',
  'Sport',
  'Culture',
  'Soirée',
  'Plein Air',
  'Atelier',
  'Jeux',
  'Détente',
  'Insolite',
];

const GRADIENTS = [
  { name: 'Ambre Chaleureux', value: 'from-amber-600 via-orange-500 to-amber-700' },
  { name: 'Émeraude Sportif', value: 'from-emerald-600 via-teal-600 to-cyan-700' },
  { name: 'Indigo Nuit', value: 'from-indigo-600 via-purple-600 to-violet-700' },
  { name: 'Terracotta Cosy', value: 'from-rose-600 via-red-500 to-amber-600' },
  { name: 'Forêt d’Automne', value: 'from-amber-700 via-orange-600 to-yellow-700' },
  { name: 'Céramique & Pierre', value: 'from-amber-800 via-stone-700 to-amber-900' },
  { name: 'Speakeasy Velvet', value: 'from-purple-900 via-fuchsia-900 to-slate-900' },
  { name: 'Ardoise & Mystère', value: 'from-slate-700 via-zinc-800 to-neutral-900' },
];

export const OrganizerActivityManager: React.FC<OrganizerActivityManagerProps> = ({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
  onResetDefaults,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Gastronomie');
  const [duration, setDuration] = useState('2h');
  const [locationType, setLocationType] = useState('En ville');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('Modéré');
  const [accentGradient, setAccentGradient] = useState(GRADIENTS[0].value);
  const [imageUrl, setImageUrl] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const openAddModal = () => {
    setEditingActivity(null);
    setTitle('');
    setDescription('');
    setCategory('Gastronomie');
    setDuration('2h');
    setLocationType('En ville');
    setEnergyLevel('Modéré');
    setAccentGradient(GRADIENTS[0].value);
    setImageUrl('');
    setModalOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setTitle(act.title);
    setDescription(act.description);
    setCategory(act.category);
    setDuration(act.duration);
    setLocationType(act.locationType);
    setEnergyLevel(act.energyLevel);
    setAccentGradient(act.accentGradient || GRADIENTS[0].value);
    setImageUrl(act.imageUrl || '');
    setModalOpen(true);
  };

  const handleEnhanceWithAI = async () => {
    if (!title.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, notes: description }),
      });
      const data = await res.json();
      if (data.pitch) {
        setDescription(data.pitch);
      }
    } catch (err) {
      console.error('Enhance pitch error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (editingActivity) {
      onUpdateActivity({
        ...editingActivity,
        title: title.trim(),
        description: description.trim(),
        category,
        duration: duration.trim(),
        locationType: locationType.trim(),
        energyLevel,
        accentGradient,
        imageUrl: imageUrl.trim() || undefined,
        iconName: category,
      });
    } else {
      onAddActivity({
        title: title.trim(),
        description: description.trim(),
        category,
        duration: duration.trim(),
        locationType: locationType.trim(),
        energyLevel,
        accentGradient,
        imageUrl: imageUrl.trim() || undefined,
        iconName: category,
        isOrganizerCustom: true,
      });
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Mon Catalogue d'Activités ({activities.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajoutez, éditez ou supprimez les idées que vous souhaitez proposer à vos proches pour novembre.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une activité</span>
          </button>
          <button
            onClick={onResetDefaults}
            className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Réinitialiser avec les activités d'origine"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of activities or empty state */}
      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Aucune activité pour l'instant
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Ajoutez au fur et à mesure les activités que vous souhaitez proposer à vos proches pour novembre.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer ma première activité</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                    {act.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(act)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                      title="Modifier"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteActivity(act.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{act.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  {act.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{act.duration}</span>
                <span>{act.energyLevel}</span>
                <span className="truncate max-w-[100px]">{act.locationType}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingActivity ? 'Modifier l’activité' : 'Nouvelle activité pour Novembre'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Titre de l'activité *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Brunch dominical gourmand, Soirée jeux de plateau..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Description & Ambiance *
                  </label>
                  <button
                    type="button"
                    onClick={handleEnhanceWithAI}
                    disabled={!title.trim() || isEnhancing}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-40 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isEnhancing ? 'Génération...' : 'Améliorer avec l’IA'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Décris ce que vous allez faire, l'ambiance et pourquoi c'est trop cool..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Niveau d'énergie
                  </label>
                  <select
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="Chill">Chill (Détente)</option>
                    <option value="Modéré">Modéré</option>
                    <option value="Intense">Intense (Sportif/Rythmé)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Durée estimée
                  </label>
                  <input
                    type="text"
                    placeholder="ex: 2h, Après-midi, Soirée"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lieu / Type de spot
                  </label>
                  <input
                    type="text"
                    placeholder="ex: À la maison, Centre-ville, En forêt"
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ambiance visuelle (Dégradé de fond)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setAccentGradient(g.value)}
                      className={`h-9 rounded-lg bg-gradient-to-r ${g.value} transition-all relative ${
                        accentGradient === g.value ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={g.name}
                    >
                      {accentGradient === g.value && (
                        <Check className="w-3.5 h-3.5 text-white mx-auto drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  {editingActivity ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
