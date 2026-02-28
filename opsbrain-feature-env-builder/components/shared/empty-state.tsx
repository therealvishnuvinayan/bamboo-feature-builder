import { cn } from "@/lib/utils";

export function EmptyStateIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 200"
      aria-hidden="true"
      className={cn("h-auto w-full max-w-[280px]", className)}
      fill="none"
    >
      <rect x="34" y="28" width="212" height="136" rx="28" className="fill-sky-500/10 dark:fill-sky-400/10" />
      <rect x="54" y="48" width="172" height="16" rx="8" className="fill-sky-500/20 dark:fill-sky-300/20" />
      <rect x="54" y="76" width="136" height="12" rx="6" className="fill-slate-400/25 dark:fill-slate-200/15" />
      <rect x="54" y="98" width="112" height="12" rx="6" className="fill-slate-400/18 dark:fill-slate-200/10" />
      <rect x="54" y="128" width="94" height="24" rx="12" className="fill-teal-500/20 dark:fill-teal-300/20" />
      <circle cx="222" cy="44" r="18" className="fill-teal-500/20 dark:fill-teal-300/20" />
      <path
        d="M212 44h20M222 34v20"
        className="stroke-teal-700/70 dark:stroke-teal-100/70"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="62" cy="168" r="16" className="fill-sky-500/15 dark:fill-sky-300/15" />
      <circle cx="218" cy="164" r="10" className="fill-slate-400/18 dark:fill-slate-200/10" />
    </svg>
  );
}
