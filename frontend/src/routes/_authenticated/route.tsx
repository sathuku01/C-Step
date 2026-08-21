import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { hasStoredSession, useAuth } from "../../lib/auth";

export const Route = createFileRoute("/_authenticated")({
  // Session lives in localStorage, so the gate has to run in the browser.
  ssr: false,
  beforeLoad: ({ location }) => {
    if (!hasStoredSession()) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { account, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !account) {
      navigate({ to: "/", replace: true });
    }
  }, [account, ready, navigate]);

  if (ready && !account) {
    return null;
  }

  return <Outlet />;
}
