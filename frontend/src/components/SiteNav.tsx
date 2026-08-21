import { Link, useNavigate } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { BackendStatus } from "./BackendStatus";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../lib/auth";

export function SiteNav() {
  const { account, ready, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  const navLinks = account
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/directory", label: "Directory" },
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/directory", label: "Directory" },
      ];

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-leaf text-primary-foreground">
            <Leaf className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <span className="font-serif text-lg tracking-tight">C-Step</span>
        </Link>

        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{
                className: "text-ink underline decoration-leaf decoration-2 underline-offset-8",
              }}
              className="transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {ready &&
            (account ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-leaf font-semibold">
                  {account.name || account.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-leaf px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            ))}
          <BackendStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
