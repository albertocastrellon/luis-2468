import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Button,
  Card,
  Input,
  LockIcon,
  LoginIcon,
  MailIcon,
  PasswordInput,
  Spinner,
} from "../components/ui";
import { useAuth } from "../context/useAuth";
import { getApiError } from "../utils/errors";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Validación: solo se permiten minúsculas
   */
  const onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value.toLowerCase());
  };

  /**
   * Envía las credenciales al backend.
   * Si el login falla, muestra una alerta (SweetAlert2) con el error.
   */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      Swal.fire({
        theme: "dark",
        icon: "error",
        title: "No se pudo iniciar sesión",
        showConfirmButton: true,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#98FF98",
        customClass: { confirmButton: "!font-bold !text-ink" },
        text: getApiError(
          err,
          "Verifica tu correo y contraseña e intenta de nuevo.",
        ),
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-14 px-6 py-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div className="text-center lg:text-left">
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mx-0 lg:text-7xl">
            Tu próxima carrera
          </h1>
          <h1 className="text-mint mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mx-0 lg:text-7xl">
            comienza
          </h1>
          <h1 className="text-mint mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:mx-0 lg:text-7xl">
            aquí.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-center text-base leading-7 text-slate-400 sm:text-lg sm:leading-8 lg:mx-0 lg:text-left">
            Explora estadísticas de caracoles, recarga tu saldo con SnailPay y
            disfruta un dashboard diseñado para seguir cada victoria.
          </p>
        </div>
        <Card className="w-full max-w-md justify-self-center rounded-xl px-10 lg:justify-self-end">
          <h2 className="py-6 text-3xl font-black text-center">
            Iniciar sesión
          </h2>
          <form className="mt-6 grid gap-8" onSubmit={submit}>
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={onEmailChange}
              required
              autoComplete="email"
              icon={<MailIcon />}
            />
            {/* Input de contraseña con icono de candado y ojo para mostrar/ocultar */}
            <PasswordInput
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              icon={<LockIcon />}
            />
            {/* Botón de envío con icono de acceso; muestra Spinner mientras carga */}
            <Button disabled={loading}>
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <LoginIcon />
                  Iniciar sesión
                </>
              )}
            </Button>
          </form>
          <p className="my-6 text-center text-lg text-slate-400">
            ¿No tienes cuenta?{" "}
            <Link
              to="/register"
              className="font-bold text-mint hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </Card>
      </main>
      <section
        id="features"
        className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-3"
      ></section>
    </div>
  );
}
