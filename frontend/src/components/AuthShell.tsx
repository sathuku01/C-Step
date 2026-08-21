import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { BackendStatus } from "./BackendStatus";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="flex flex-col justify-between gap-10">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-leaf text-primary-foreground">
                <Leaf className="h-4 w-4" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="font-serif text-lg tracking-tight">Verdant</span>
            </Link>
            <div className="ml-auto flex items-center gap-2.5 lg:hidden">
              <BackendStatus />
              <ThemeToggle />
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-leaf">{eyebrow}</p>
            <h1 className="mt-4 max-w-lg font-serif text-4xl leading-tight tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">{subtitle}</p>

            <ul className="mt-8 space-y-3 text-sm text-ink-muted">
              {[
                "Sector-calibrated baseline the moment you land in the dashboard",
                "Ledger, bank and utility feeds map straight to emission factors",
                "Verified trust tier feeds the buyer-facing directory",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden items-center gap-2.5 lg:flex">
            <BackendStatus />
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl border border-rule bg-surface p-7 shadow-sm sm:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint lg:hidden">
            {eyebrow}
          </p>
          {children}
          <div className="mt-7 border-t border-rule pt-5 text-sm text-ink-muted">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export const fieldClass =
  "w-full rounded-lg border border-rule bg-background px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-leaf";

export const labelClass =
  "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint";

export const submitClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-leaf px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60";
