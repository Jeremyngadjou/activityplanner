import React, { useState } from 'react';
import { Activity, Category, EnergyLevel } from '../types';
import { Plus, Edit3, Trash2, Sparkles, RotateCcw, Check, Download, Upload, FileText, Calendar } from 'lucide-react';
import { ActivityJsonModal } from './ActivityJsonModal';
import { DeleteAllActivitiesModal } from './DeleteAllActivitiesModal';

interface OrganizerActivityManagerProps {
  activities: Activity[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => void;
  onDeleteAllActivities?: (scope: 'current' | 'all') => Promise<void>;
  onResetDefaults: () => void;
  activeYear: number;
  activeMonth: number;
  monthNames: string[];
  onChangeActiveMonth?: (year: number, month: number) => void;
  onImportActivities: (monthKey: string, activities: Activity[], mode: 'merge' | 'replace') => Promise<void>;
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
  activeYear,
  activeMonth,
  monthNames,
  onChangeActiveMonth,
  onImportActivities,
  onDeleteAllActivities,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Month filter in manager: 'current' (active month) or 'all'
  const [monthFilter, setMonthFilter] = useState<'current' | 'all'>('current');

  const currentMonthKey = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`;
  const currentMonthLabel = `${monthNames[activeMonth]} ${activeYear}`;

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Gastronomie');
  const [duration, setDuration] = useState('2h');
  const [locationType, setLocationType] = useState('En ville');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('Modéré');
  const [accentGradient, setAccentGradient] = useState(GRADIENTS[0].value);
  const [imageUrl, setImageUrl] = useState('');
  const [activityMonthKey, setActivityMonthKey] = useState<string>(currentMonthKey);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Filter activities based on selection (guaranteed unique by ID)
  const filteredActivities = React.useMemo(() => {
    const seen = new Set<string>();
    return activities.filter((act) => {
      if (!act?.id || seen.has(act.id)) return false;
      seen.add(act.id);
      if (monthFilter === 'all') return true;
      const actMonth = act.monthKey || '2026-11';
      return actMonth === currentMonthKey;
    });
  }, [activities, monthFilter, currentMonthKey]);

  const monthCount = filteredActivities.length;

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
    setActivityMonthKey(currentMonthKey);
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
    setActivityMonthKey(act.monthKey || currentMonthKey);
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
        monthKey: activityMonthKey || currentMonthKey,
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
        monthKey: activityMonthKey || currentMonthKey,
      });
    }

    setModalOpen(false);
  };

  // Generate available months starting November 2026
  const availableMonths: { key: string; label: string; year: number; month: number }[] = [];
  const startYr = 2026;
  const startMo = 10; // November
  for (let y = startYr; y <= startYr + 1; y++) {
    const moStart = y === startYr ? startMo : 0;
    for (let m = moStart; m < 12; m++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      availableMonths.push({
        key,
        label: `${monthNames[m]} ${y}`,
        year: y,
        month: m,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Catalogue des Activités
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérez vos idées par mois, ou exportez/importez vos activités en JSON.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* JSON Export & Import Trigger */}
          <button
            type="button"
            onClick={() => setJsonModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Importer ou Exporter les activités au format JSON"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>JSON (Import / Export)</span>
          </button>

          {/* Delete All Activities Trigger */}
          {onDeleteAllActivities && (
            <button
              type="button"
              onClick={() => setDeleteAllModalOpen(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Supprimer toutes les activités d'un coup"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Tout supprimer</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une activité</span>
          </button>

          <button
            type="button"
            onClick={onResetDefaults}
            className="p-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Réinitialiser avec les activités initiales"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Filter Selector Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="text-xs font-bold text-slate-900">Mois actif :</span>
          {onChangeActiveMonth ? (
            <select
              value={currentMonthKey}
              onChange={(e) => {
                const found = availableMonths.find((m) => m.key === e.target.value);
                if (found) {
                  onChangeActiveMonth(found.year, found.month);
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {currentMonthLabel}
            </span>
          )}
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMonthFilter('current')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              monthFilter === 'current'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Ce mois ({monthCount})
          </button>
          <button
            type="button"
            onClick={() => setMonthFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              monthFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tous les mois ({activities.length})
          </button>
        </div>
      </div>

      {/* Grid of activities or empty state */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Aucune activité pour {monthFilter === 'current' ? currentMonthLabel : 'ce filtre'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Vous pouvez créer une nouvelle idée ou importer un fichier JSON pour alimenter ce mois.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une activité</span>
            </button>
            <button
              onClick={() => setJsonModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-700" />
              <span>Importer JSON</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map((act) => {
            const actMonth = act.monthKey || '2026-11';
            const [yStr, mStr] = actMonth.split('-');
            const formattedMonthLabel =
              yStr && mStr ? `${monthNames[parseInt(mStr, 10) - 1]} ${yStr}` : actMonth;

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {act.category}
                      </span>
                      <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                        {formattedMonthLabel}
                      </span>
                    </div>

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
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingActivity ? 'Modifier l’activité' : 'Nouvelle activité'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Titre de l'activité *
                </label>
                <input
                  type="text"
                  placeholder="ex: Grande Raclette & Jeux au Chaud"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 text-xs"
                  required
                />
              </div>

              {/* Target Month for this activity */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mois assigné à cette activité
                </label>
                <select
                  value={activityMonthKey}
                  onChange={(e) => setActivityMonthKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Description & Accroche amicale *
                  </label>
                  <button
                    type="button"
                    onClick={handleEnhanceWithAI}
                    disabled={isEnhancing || !title.trim()}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isEnhancing ? 'Génération...' : 'Améliorer l’accroche'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder="Expliquez ce qui est prévu, l’ambiance, ce qu’on va y faire..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 leading-relaxed text-xs"
                  required
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none cursor-pointer"
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

      {/* JSON Modal */}
      <ActivityJsonModal
        isOpen={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        activities={activities}
        activeYear={activeYear}
        activeMonth={activeMonth}
        monthNames={monthNames}
        onImportActivities={onImportActivities}
      />

      {/* Delete All Activities Modal */}
      {onDeleteAllActivities && (
        <DeleteAllActivitiesModal
          isOpen={deleteAllModalOpen}
          onClose={() => setDeleteAllModalOpen(false)}
          onConfirm={onDeleteAllActivities}
          currentMonthLabel={currentMonthLabel}
          currentMonthCount={monthCount}
          totalCount={activities.length}
        />
      )}
    </div>
  );
};
