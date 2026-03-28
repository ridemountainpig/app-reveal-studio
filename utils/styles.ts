export const buttonStyles = {
  reload:
    "inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-[0.78rem] font-semibold tracking-[0.03em] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:border-white/16 hover:text-white sm:px-4 sm:py-3 sm:text-[0.84rem]",
  export:
    "inline-flex items-center justify-center gap-2 rounded-[0.95rem] border border-white/10 bg-white px-3.5 py-2.5 text-[0.78rem] font-semibold tracking-[0.03em] text-black shadow-[0_16px_40px_rgba(255,255,255,0.16)] backdrop-blur-xl transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:border-white/12 disabled:bg-white/12 disabled:text-white/56 disabled:shadow-none sm:px-4 sm:py-3 sm:text-[0.84rem]",
  github:
    "fixed top-3 left-3 z-40 inline-flex items-center gap-2 rounded-[0.8rem] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[0.8rem] font-semibold tracking-[0.04em] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition hover:border-white/16 hover:text-white/86 sm:px-4 sm:py-3 sm:text-[0.86rem]",
} as const;

export const panelStyles = {
  card: "rounded-2xl border border-white/8 bg-white/3 p-3",
  label:
    "text-[0.64rem] font-semibold tracking-[0.08em] text-white/42 uppercase",
  input:
    "w-full rounded-[0.8rem] border border-white/10 bg-white/4 px-3 py-2 text-[0.92rem] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-white/28 focus:border-white/18 focus:ring-2 focus:ring-white/8",
  fileInput:
    "block w-full cursor-pointer rounded-[0.8rem] border border-white/10 bg-white/4 px-3 py-2 text-[0.82rem] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition file:mr-3 file:cursor-pointer file:rounded-[0.65rem] file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-[0.76rem] file:font-semibold file:text-black focus:border-white/18 focus:ring-2 focus:ring-white/8",
  colorButton:
    "block h-8 w-8 cursor-pointer rounded-[0.7rem] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  range:
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-white",
  toggleButton:
    "inline-flex items-center gap-2 rounded-[0.8rem] border border-white/10 bg-white/4 px-3 py-2.5 text-[0.8rem] font-semibold tracking-[0.04em] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/16 hover:text-white/86 sm:px-4 sm:py-3 sm:text-[0.86rem]",
} as const;

export const mediaQueries = {
  tabletMax: "(max-width: 1023px)" as const,
  desktopMin: "(min-width: 1024px)" as const,
} as const;

export const exportMessages = {
  rendering: "Rendering video... This may take a few minutes.",
  downloading: "Downloading...",
  downloaded: "Downloaded!",
  failed: "Export failed.",
} as const;

export function formatExportQueueStatus(ahead: number, waitingTotal: number) {
  if (ahead === 0) {
    return `You're next — we'll start your export soon. (${waitingTotal} people waiting.)`;
  }
  return `${ahead} people ahead of you. (${waitingTotal} waiting in total)`;
}
