import { create } from 'zustand'

interface ToastStore {
  message: string
  visible: boolean
  queue: string[]
  show: (msg: string) => void
  hide: () => void
  _advance: () => void
}

const DISPLAY_MS = 2200

export const useToast = create<ToastStore>((set, get) => ({
  message: '',
  visible: false,
  queue: [],
  show: (msg) => {
    if (!get().visible) {
      set({ message: msg, visible: true })
      setTimeout(() => get()._advance(), DISPLAY_MS)
    } else {
      set({ queue: [...get().queue, msg] })
    }
  },
  _advance: () => {
    const { queue } = get()
    if (queue.length === 0) {
      set({ visible: false })
      return
    }
    const [next, ...rest] = queue
    set({ message: next, queue: rest, visible: true })
    setTimeout(() => get()._advance(), DISPLAY_MS)
  },
  hide: () => set({ visible: false, queue: [] }),
}))
