/**
 * Logo de TeachForge: un yunque cuya cara es un libro abierto, y la chispa
 * que salta de él (el criterio que pasa de un docente a otro).
 */

const YUNQUE =
  "M6 27 L20 27 Q29 22.5 38 27 Q47 22.5 56 27 L56 34 L48 34 Q43 34 43 40 L43 44 L49 44 L49 50 L15 50 L15 44 L21 44 L21 40 Q21 35 16 34 Q9 33 6 27 Z";
const CHISPA = "M38 3 Q39.4 11.6 48 13 Q39.4 14.4 38 23 Q36.6 14.4 28 13 Q36.6 11.6 38 3 Z";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="4 0 56 54" className={className} aria-hidden="true">
      <path d={YUNQUE} fill="var(--steel)" />
      <path d="M38 26.5 V33" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" />
      <path d={CHISPA} fill="var(--ember)" />
      <circle cx="49.5" cy="5.5" r="1.8" fill="var(--ember)" />
      <circle cx="26" cy="6.5" r="1.3" fill="var(--ember)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[22px] font-medium tracking-tight">
        Teach<b className="font-extrabold text-ember">Forge</b>
      </span>
    </span>
  );
}
