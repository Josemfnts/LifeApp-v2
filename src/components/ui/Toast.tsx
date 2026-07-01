export function Toast() {
  return (
    <div
      id="toast"
      className="fixed top-16 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium
        bg-[var(--color-s1)]/95 border border-white/[0.1] text-[var(--color-text)]
        shadow-xl backdrop-blur-xl pointer-events-none whitespace-nowrap z-[9998]
        opacity-0 transition-all duration-300 -translate-y-2"
    />
  )
}
