import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, ADMIN_EMAIL } from '../firebase';
import { Activity, Proposal, ScheduleSlot, AppNotification, AppSettings } from '../types';
import { INITIAL_ACTIVITIES } from '../data/defaultActivities';

// Check if currently authenticated user is the designated admin
export const isUserAdmin = (): boolean => {
  const user = auth.currentUser;
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export const getAdminEmail = (): string => ADMIN_EMAIL;

// Subscribe to activities with real-time updates
export const subscribeActivities = (
  onData: (activities: Activity[]) => void
): (() => void) => {
  const colRef = collection(db, 'activities');
  let hasSeeded = false;

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && !hasSeeded) {
        hasSeeded = true;
        // If empty on first boot, seed default activities if user is admin
        // or provide initial in-memory activities
        if (isUserAdmin()) {
          try {
            const batch = writeBatch(db);
            INITIAL_ACTIVITIES.forEach((act) => {
              const docRef = doc(db, 'activities', act.id);
              batch.set(docRef, { ...act, monthKey: act.monthKey || '2026-11' });
            });
            await batch.commit();
            return;
          } catch (e) {
            console.warn('Could not auto-seed activities to Firestore:', e);
          }
        }
        onData(INITIAL_ACTIVITIES);
        return;
      }

      const list: Activity[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as Activity), id: d.id });
      });
      onData(list);
    },
    (error) => {
      console.warn('Activities Firestore listener error, using fallback:', error);
      // Fall back safely without crashing UI
      onData(INITIAL_ACTIVITIES);
      handleFirestoreError(error, OperationType.GET, 'activities');
    }
  );

  return unsubscribe;
};

// Subscribe to proposals
export const subscribeProposals = (
  onData: (proposals: Proposal[]) => void
): (() => void) => {
  const colRef = collection(db, 'proposals');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: Proposal[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as Proposal), id: d.id });
      });
      onData(list);
    },
    (error) => {
      console.warn('Proposals listener error:', error);
      handleFirestoreError(error, OperationType.GET, 'proposals');
    }
  );
  return unsubscribe;
};

// Subscribe to schedule slots
export const subscribeScheduleSlots = (
  onData: (slots: ScheduleSlot[]) => void
): (() => void) => {
  const colRef = collection(db, 'scheduleSlots');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: ScheduleSlot[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as ScheduleSlot), id: d.id });
      });
      onData(list);
    },
    (error) => {
      console.warn('ScheduleSlots listener error:', error);
      handleFirestoreError(error, OperationType.GET, 'scheduleSlots');
    }
  );
  return unsubscribe;
};

// Subscribe to notifications (admin only)
export const subscribeNotifications = (
  onData: (notifs: AppNotification[]) => void
): (() => void) => {
  if (!isUserAdmin()) {
    onData([]);
    return () => {};
  }
  const colRef = collection(db, 'notifications');
  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as AppNotification), id: d.id });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      console.warn('Notifications listener error:', error);
      handleFirestoreError(error, OperationType.GET, 'notifications');
    }
  );
  return unsubscribe;
};

// Subscribe to settings
export const subscribeSettings = (
  onData: (settings: AppSettings) => void
): (() => void) => {
  const docRef = doc(db, 'settings', 'general');
  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as AppSettings);
      } else {
        onData({ targetYear: 2026, targetMonth: 10 });
      }
    },
    (error) => {
      console.warn('Settings listener error:', error);
      handleFirestoreError(error, OperationType.GET, 'settings/general');
    }
  );
  return unsubscribe;
};

// Activity Mutations
export const saveActivityToFirestore = async (activity: Activity): Promise<void> => {
  const path = `activities/${activity.id}`;
  try {
    const docRef = doc(db, 'activities', activity.id);
    const clean: any = {
      title: activity.title,
      description: activity.description,
      category: activity.category,
      duration: activity.duration,
      locationType: activity.locationType,
      energyLevel: activity.energyLevel,
      accentGradient: activity.accentGradient,
      iconName: activity.iconName,
      monthKey: activity.monthKey || '2026-11',
      isOrganizerCustom: !!activity.isOrganizerCustom,
      bestSlots: activity.bestSlots || [],
    };
    if (activity.imageUrl) clean.imageUrl = activity.imageUrl;
    if (activity.suggestedParticipants) clean.suggestedParticipants = activity.suggestedParticipants;

    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteActivityFromFirestore = async (activityId: string): Promise<void> => {
  const path = `activities/${activityId}`;
  try {
    const docRef = doc(db, 'activities', activityId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Delete all activities at once (supports current month or all months)
export const deleteAllActivitiesFromFirestore = async (monthKey?: string): Promise<{ count: number }> => {
  const path = 'activities';
  try {
    const colRef = collection(db, 'activities');
    const q = monthKey ? query(colRef, where('monthKey', '==', monthKey)) : query(colRef);
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { count: 0 };

    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach((d) => {
      batch.delete(d.ref);
      count++;
    });

    await batch.commit();
    return { count };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return { count: 0 };
  }
};

// Import batch
export const importActivitiesToFirestore = async (
  monthKey: string,
  activities: Activity[],
  mode: 'merge' | 'replace'
): Promise<void> => {
  const path = 'activities';
  try {
    if (mode === 'replace') {
      const colRef = collection(db, 'activities');
      const q = query(colRef, where('monthKey', '==', monthKey));
      const existingSnap = await getDocs(q);
      const deleteBatch = writeBatch(db);
      existingSnap.forEach((d) => {
        deleteBatch.delete(d.ref);
      });
      await deleteBatch.commit();
    }

    const batch = writeBatch(db);
    activities.forEach((act, idx) => {
      const id = act.id || `act-${Date.now()}-${idx}`;
      const docRef = doc(db, 'activities', id);
      batch.set(docRef, {
        ...act,
        id,
        monthKey: monthKey || '2026-11',
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Proposal Mutations
export const createProposalInFirestore = async (proposal: Proposal): Promise<void> => {
  const path = `proposals/${proposal.id}`;
  try {
    const docRef = doc(db, 'proposals', proposal.id);
    const clean: any = {
      activityId: proposal.activityId,
      activityTitle: proposal.activityTitle,
      friendName: proposal.friendName,
      date: proposal.date,
      slot: proposal.slot,
      status: proposal.status,
      createdAt: proposal.createdAt,
    };
    if (proposal.friendContact) clean.friendContact = proposal.friendContact;
    if (proposal.note) clean.note = proposal.note;
    if (proposal.declineReason) clean.declineReason = proposal.declineReason;

    await setDoc(docRef, clean);

    // Also create notification
    try {
      const notifId = `notif-${proposal.id}`;
      const notifRef = doc(db, 'notifications', notifId);
      await setDoc(notifRef, {
        type: 'proposal_received',
        title: `Nouvelle proposition de ${proposal.friendName}`,
        message: `${proposal.friendName} propose « ${proposal.activityTitle} » le ${proposal.date}`,
        proposalId: proposal.id,
        friendName: proposal.friendName,
        activityTitle: proposal.activityTitle,
        date: proposal.date,
        slot: proposal.slot,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } catch (e) {
      console.warn('Could not create notification doc:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProposalStatusInFirestore = async (
  proposalId: string,
  status: 'accepted' | 'declined',
  declineReason?: string
): Promise<void> => {
  const path = `proposals/${proposalId}`;
  try {
    const docRef = doc(db, 'proposals', proposalId);
    const updateData: any = { status };
    if (declineReason) updateData.declineReason = declineReason;
    await setDoc(docRef, updateData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Schedule Slot Mutations
export const saveScheduleSlotToFirestore = async (slot: ScheduleSlot): Promise<void> => {
  const slotId = `${slot.date}_${slot.slot}`;
  const path = `scheduleSlots/${slotId}`;
  try {
    const docRef = doc(db, 'scheduleSlots', slotId);
    const clean: any = {
      date: slot.date,
      slot: slot.slot,
      proposalId: slot.proposalId,
      activityId: slot.activityId,
      activityTitle: slot.activityTitle,
      friendName: slot.friendName,
    };
    if (slot.note) clean.note = slot.note;
    await setDoc(docRef, clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteScheduleSlotFromFirestore = async (date: string, slot: string): Promise<void> => {
  const slotId = `${date}_${slot}`;
  const path = `scheduleSlots/${slotId}`;
  try {
    const docRef = doc(db, 'scheduleSlots', slotId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Settings Mutation
export const saveSettingsToFirestore = async (targetYear: number, targetMonth: number): Promise<void> => {
  const path = 'settings/general';
  try {
    const docRef = doc(db, 'settings', 'general');
    await setDoc(docRef, { targetYear, targetMonth }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
