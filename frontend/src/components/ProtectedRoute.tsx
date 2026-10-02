import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Spinner } from "./ui";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <Spinner />
      </div>
    );
  // Sin sesión se redirige al login.
  return user ? <Outlet /> : <Navigate to="/" replace />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <Spinner />
      </div>
    );
  // Una sesión activa no debe volver a mostrar login ni registro.
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
