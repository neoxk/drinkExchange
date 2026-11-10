import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";

/**
 * Prikaže vsebino samo prijavljenim uporabnikom z dovoljeno vlogo.
 * Gre zgolj za uporabniško izkušnjo – dovoljenja vedno preveri API.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="muted">Nalaganje …</p>;
  if (!user) return <Navigate to="/prijava" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) {
    return <p className="error">Za ogled te strani nimate dovoljenja.</p>;
  }
  return <>{children}</>;
}
