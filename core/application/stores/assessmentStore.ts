import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AnswerMap = Record<string, string>; // question_id → value

type AssessmentState = {
  answers: AnswerMap;
  currentSection: number;
  idempotencyKey: string | null;
  payloadSnapshot: string | null; // hash/JSON of the answers when the key was minted

  setAnswer: (questionId: string, value: string) => void;
  setSection: (section: number) => void;
  /** Return the existing key when the payload matches, mint a new one when it changed. */
  ensureIdempotencyKey: (payload: string) => string;
  clearAfterSuccess: () => void;
  resetAll: () => void;
};

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      answers: {},
      currentSection: 0,
      idempotencyKey: null,
      payloadSnapshot: null,

      setAnswer: (questionId, value) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: value } })),

      setSection: (section) => set({ currentSection: section }),

      ensureIdempotencyKey: (payload) => {
        const { idempotencyKey, payloadSnapshot } = get();
        if (idempotencyKey && payloadSnapshot === payload) return idempotencyKey;
        // Changed payload = NEW key (old key + different payload = 409 from the BE).
        const key = crypto.randomUUID();
        set({ idempotencyKey: key, payloadSnapshot: payload });
        return key;
      },

      clearAfterSuccess: () =>
        set({ idempotencyKey: null, payloadSnapshot: null, answers: {}, currentSection: 0 }),

      resetAll: () =>
        set({ answers: {}, currentSection: 0, idempotencyKey: null, payloadSnapshot: null }),
    }),
    { name: 'yp_assessment' },
  ),
);
