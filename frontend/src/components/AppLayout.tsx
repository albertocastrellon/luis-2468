import { Outlet, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/useAuth";
import { Button, LogoutIcon } from "./ui";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      theme: "dark",
      icon: "warning",
      title: "¿Deseas cerrar la sesión?",
      text: "Tendrás que iniciar sesión nuevamente para volver a entrar.",
      showCancelButton: true,
      confirmButtonText: "Si, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#98FF98",
      cancelButtonColor: "#334155",
      customClass: {
        confirmButton: "!font-bold !text-ink",
        cancelButton: "!font-bold !text-white",
      },
    });

    // Solo se revoca la sesión cuando la persona confirma la acción.
    if (!result.isConfirmed) return;

    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Franja fija: mantiene el saldo y el cierre de sesión visibles en cualquier scroll. */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="shrink-0 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span className="hidden sm:inline">Saldo disponible</span>
              <span className="sm:hidden">Saldo</span>
            </span>
            <span className="truncate text-xl font-black text-mint">
              ${user?.balance.toFixed(2)}
            </span>
          </div>
          <Button
            className="!mt-0 inline-flex shrink-0 items-center border border-mint/30 bg-mint px-3 py-2 text-sm font-bold text-ink shadow-[0_12px_35px_rgba(184,243,151,.16)] hover:bg-lime-200 sm:px-4 sm:py-2.5 sm:text-base"
            onClick={handleLogout}
          >
            <LogoutIcon />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
