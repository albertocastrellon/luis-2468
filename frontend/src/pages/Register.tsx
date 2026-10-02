import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Button,
  Card,
  Input,
  LockIcon,
  MailIcon,
  PasswordInput,
  Spinner,
  UserIcon,
  UserPlusIcon,
} from "../components/ui";
import { HeroHeading } from "../components/HeroHeading";
import { useAuth } from "../context/useAuth";
import { getApiError } from "../utils/errors";

/**
 * Página de registro (`/register`).
 * Mismo layout y diseño que la HomePage (login):
 * bloque hero a la izquierda y Card con el formulario a la derecha.
 * El Card solo muestra el título, sin logo ni subtítulo.
 */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Genera un handler genérico para cada campo del formulario.
   * Validación especial: el campo "fullName" se convierte a mayúsculas
   * y el campo "email" se normaliza a minúsculas
   * para que no se permitan mayúsculas en el correo electrónico.
   */
  const update =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value =
        field === "fullName"
          ? event.target.value
              .replace(/[^\p{L} ]/gu, "")
              .toUpperCase()
          : field === "email"
            ? event.target.value
                .toLowerCase()
                .replace(/[^a-z0-9.!#$%&'*+/=?^_`{|}~\-@]/g, "")
            : event.target.value;
      setForm((current) => ({ ...current, [field]: value }));
    };

  /**
   * Valida los datos, crea la cuenta sin iniciar sesión y confirma el resultado.
   * Los errores se muestran con mensajes públicos sin exponer el payload del API.
   */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\p{L}+(?: \p{L}+)*$/u.test(form.fullName.trim())) {
      setError("El nombre completo solo puede contener letras y espacios.");
      return;
    }
    if (
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
        form.email,
      )
    ) {
      setError("Introduce un correo electrónico válido.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      await Swal.fire({
        theme: "dark",
        icon: "success",
        title: "Cuenta creada correctamente",
        text: "Ya puedes iniciar sesión con tu correo y contraseña.",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#98FF98",
        customClass: { confirmButton: "!font-bold !text-ink" },
      });
      navigate("/login", { replace: true });
    } catch (err) {
      Swal.fire({
        theme: "dark",
        icon: "error",
        title: "No pudimos crear la cuenta",
        showConfirmButton: true,
        confirmButtonText: "Entendido",
        confirmButtonColor: "#98FF98",
        customClass: { confirmButton: "!font-bold !text-ink" },
        text: getApiError(err, "Intenta nuevamente con tus datos."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-14 px-6 py-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        {/* Bloque hero reutilizable (mismo componente que la HomePage) */}
        <HeroHeading
          lines={[
            { text: "Tu próxima carrera" },
            { text: "comienza", highlight: true },
            { text: "aquí.", highlight: true },
          ]}
          description="Explora estadísticas de caracoles, recarga tu saldo con SnailPay y diviértete."
        />
        {/* Card con el mismo estilo que el de la HomePage */}
        <Card className="w-full max-w-md animate-fade-up-slow justify-self-center rounded-xl px-10 lg:justify-self-end">
          <h2 className="py-6 text-3xl font-black text-center">
            Crea tu cuenta
          </h2>
          {/* Mismo estilo de formulario que la HomePage */}
          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <Input
              label="Nombre completo"
              value={form.fullName}
              onChange={update("fullName")}
              pattern="[A-Za-zÀ-ÿ]+(?: [A-Za-zÀ-ÿ]+)*"
              title="Usa únicamente letras y espacios."
              required
              autoComplete="name"
              icon={<UserIcon />}
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={update("email")}
              pattern="[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+"
              title="Introduce un correo electrónico válido."
              required
              autoComplete="email"
              icon={<MailIcon />}
            />
            {/* Inputs de contraseña con icono de candado y ojo para mostrar/ocultar */}
            <PasswordInput
              label="Contraseña"
              value={form.password}
              onChange={update("password")}
              required
              minLength={8}
              autoComplete="new-password"
              icon={<LockIcon />}
            />
            <PasswordInput
              label="Confirmar contraseña"
              value={form.confirmPassword}
              onChange={update("confirmPassword")}
              required
              autoComplete="new-password"
              icon={<LockIcon />}
            />
            {error && (
              <p className="rounded-xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            )}
            {/* Botón de envío con icono de registro; muestra Spinner mientras carga */}
            <Button disabled={loading} className="text-xl">
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <UserPlusIcon />
                  Crear cuenta
                </>
              )}
            </Button>
          </form>
          <p className="my-6 text-center text-lg text-slate-400">
            ¿Ya tienes cuenta?{" "}
            <Link to="/" className="font-bold text-mint hover:underline">
              Inicia sesión
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
