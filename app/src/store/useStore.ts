import { create } from 'zustand';

export type Route =
  | { name: 'home' }
  | { name: 'group'; groupId: string }
  | { name: 'newGroup' }
  | { name: 'join' }
  | { name: 'addExpense'; groupId: string }
  | { name: 'settle'; groupId: string }
  | { name: 'stats'; groupId: string };

interface AppState {
  route: Route;
  refreshKey: number;
  navigate: (route: Route) => void;
  refresh: () => void;
}

export const useStore = create<AppState>((set) => ({
  route: { name: 'home' },
  refreshKey: 0,
  navigate: (route) => set({ route }),
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
