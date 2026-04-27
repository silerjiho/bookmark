import { create } from "zustand";

/** 토스트 알림 정보 */
export interface Toast {
  id: string;
  message: string;
}

/** 토스트 스토어의 상태와 액션 정의 */
interface ToastState {
  /** 현재 표시 중인 토스트 목록 */
  toasts: Toast[];
  /** 새 토스트 메시지를 추가 */
  pushToast: (message: string) => void;
  /** 특정 토스트를 제거 */
  dismissToast: (id: string) => void;
}

/** 토스트가 화면에 머무는 시간 (4초) */
const TOAST_DURATION_MS = 4000;

/** 토스트 알림을 관리하는 전역 스토어 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    // 일정 시간 후 자동으로 토스트 제거
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, TOAST_DURATION_MS);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
