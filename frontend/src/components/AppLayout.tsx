import { Link, Outlet, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../context/useAuth";
import { Button, LogoutIcon } from "./ui";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      <header className="border-b border-white/10 bg-slate-950/80 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {/* La identidad del usuario reemplaza al logo y mantiene visible quién inició sesión. */}
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-mint/30 bg-mint/10 text-2xl font-black tracking-wide text-mint">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="uppercase block truncate text-lg font-bold text-white sm:text-base">
                {user?.fullName}
              </span>
              <span className="block truncate text-lg text-slate-400">
                {user?.email}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="hidden border-l border-white/10 pl-5 text-right sm:block">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Saldo disponible
              </p>
              <p className="text-xl mt-1 font-black text-mint">
                ${user?.balance.toFixed(2)}
              </p>
            </div>
            <Button
              className="mt-0 inline-flex items-center border border-mint/30 bg-mint px-4 py-2 text-md font-bold text-ink shadow-[0_12px_35px_rgba(184,243,151,.16)] hover:bg-lime-200 sm:px-5 sm:py-3 sm:text-base"
              onClick={handleLogout}
            >
              <LogoutIcon />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
