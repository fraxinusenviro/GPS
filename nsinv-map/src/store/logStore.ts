import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  ts: number; // ms since epoch
  level: LogLevel;
  message: string;
}

interface LogState {
  entries: LogEntry[];
  log: (level: LogLevel, message: string) => void;
  clear: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  log: (level, message) =>
    set((s) => ({
      entries: [
        { id: crypto.randomUUID().slice(0, 8), ts: Date.now(), level, message },
        ...s.entries,
      ].slice(0, 300),
    })),
  clear: () => set({ entries: [] }),
}));

/** Call from outside React (e.g. cogRenderer.ts) */
export const mapLog = (level: LogLevel, message: string) =>
  useLogStore.getState().log(level, message);
