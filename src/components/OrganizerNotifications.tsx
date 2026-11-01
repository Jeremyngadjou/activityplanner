import React, { useState, useRef, useEffect } from 'react';
import { AppNotification } from '../types';
import { Bell, CheckCheck, Trash2, Calendar, Clock, ArrowRight, ShieldCheck, Inbox, X } from 'lucide-react';

interface OrganizerNotificationsProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAll: () => void;
  onNavigateToProposal?: (proposalId: string) => void;
}

export const OrganizerNotifications: React.FC<OrganizerNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAll,
  onNavigateToProposal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatRelativeTime = (isoString: string) => {
    try {
      const now = new Date().getTime();
      const time = new Date(isoString).getTime();
      const diffSec = Math.floor((now - time) / 1000);

      if (diffSec < 60) return "À l'instant";
      if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
      if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
      const days = Math.floor(diffSec / 86400);
      return `Il y a ${days} j`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center border ${
          unreadCount > 0
            ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-200'
            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
        }`}
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-700 animate-pulse' : 'text-slate-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4.5 h-4.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Notifications centralisées</span>
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Tout lire</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">Aucune notification</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Toutes les propositions de vos amis apparaîtront ici en direct.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read;

                return (
                  <div
                    key={notif.id}
                    className={`p-3 transition-colors flex items-start gap-3 hover:bg-slate-50/80 ${
                      isUnread ? 'bg-amber-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Icon */}
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'system' ? (
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatRelativeTime(notif.createdAt)}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {notif.message}
                      </p>

                      {/* Detail metadata if proposal */}
                      {notif.date && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {notif.date}
                          </span>
                          {notif.slot && (
                            <span className="text-slate-500 capitalize">
                              {notif.slot === 'morning' ? 'Matinée' : notif.slot === 'afternoon' ? 'Après-midi' : 'Soirée'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action footer */}
                      <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        {notif.proposalId && onNavigateToProposal ? (
                          <button
                            type="button"
                            onClick={() => {
                              onMarkAsRead(notif.id);
                              onNavigateToProposal(notif.proposalId!);
                              setIsOpen(false);
                            }}
                            className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Voir la proposition</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={() => onMarkAsRead(notif.id)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Lu
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteNotification(notif.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Supprimer la notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 px-1 font-medium">
                Synchronisé sur tous vos appareils
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-slate-500 hover:text-rose-600 px-2 py-1 rounded transition-colors cursor-pointer font-medium"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
