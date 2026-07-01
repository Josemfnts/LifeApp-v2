import { create } from 'zustand'

interface ToastStore {
  message: string
  visible: boolean
  show: (msg: string) => void
  hide: () => void
}

export const useToast = create<ToastStore>((set) => ({
  message: '',
  visible: false,
  show: (msg) => {
    set({ message: msg, visible: true })
    setTimeout(() => set({ visible: false }), 2200)
  },
  hide: () => set({ visible: false }),
}))
