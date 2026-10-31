import React from 'react';
import { Activity } from '../types';
import { ActivityIcon } from './ActivityIcon';
import { Clock, MapPin, Edit3, Trash2, ArrowRight } from 'lucide-react';

interface ActivityCardProps {
  activity: Activity;
  isOrganizerView?: boolean;
  onSelectForBooking?: (activity: Activity) => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isOrganizerView = false,
  onSelectForBooking,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Visual Header / Banner */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
        {activity.imageUrl ? (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${activity.accentGradient} flex flex-col justify-between p-5 relative overflow-hidden`}
          >
            {/* Subtle decorative background circles */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-28 h-28 rounded-full bg-black/10 blur-lg pointer-events-none" />

            <div className="flex items-center justify-between text-white/90 z-10">
              <span className="text-xs font-semibold tracking-wider uppercase bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-md">
                {activity.category}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                <ActivityIcon name={activity.iconName} className="w-4 h-4" />
              </div>
            </div>

            <div className="z-10">
              <div className="text-xs text-white/80 font-medium">
                {activity.suggestedParticipants || 'Entre potes'}
              </div>
            </div>
          </div>
        )}

        {/* Quick action overlay if organizer */}
        {isOrganizerView && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(activity);
                }}
                className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm transition-colors"
                title="Modifier"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(activity.id);
                }}
                className="p-1.5 bg-white/90 hover:bg-rose-50 text-rose-600 rounded-lg shadow-sm transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Metadata line without static pills */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-2">
            <span className="text-slate-900 font-semibold">{activity.category}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {activity.duration}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>{activity.energyLevel}</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors tracking-tight mb-2">
            {activity.title}
          </h3>

          <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
            {activity.description}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[140px]">{activity.locationType}</span>
          </div>

          {!isOrganizerView ? (
            <button
              onClick={() => onSelectForBooking?.(activity)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-amber-700 active:scale-95 rounded-xl transition-all shadow-xs group/btn cursor-pointer"
            >
              <span>Je suis chaud !</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Configurable
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
