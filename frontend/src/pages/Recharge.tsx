import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  Card,
  Button,
  Input,
  Spinner,
  UserIcon,
  CreditCardIcon,
} from "../components/ui";
import { paymentService } from "../services/paymentService";
import { useAuth } from "../context/useAuth";
import { getApiError } from "../utils/errors";
import type { PaymentForm } from "../types";
import { persistBalance, persistCardData } from "../utils/storage";

type FieldErrors = Partial<Record<keyof PaymentForm, string>>;
type FormState = PaymentForm;

const MAX_AMOUNT = 100000;

/** Valida todos los campos antes de permitir el envío al backend. */
function validateForm(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = form.fullName.trim();

  // El titular admite letras, espacios, apóstrofes, puntos y guiones, sin números.
  if (trimmedName.length < 2 || trimmedName.length > 80) {
    errors.fullName = "Ingresa un nombre de entre 2 y 80 caracteres.";
  } else if (!/^[\p{L}\s.'-]+$/u.test(trimmedName)) {
    errors.fullName =
      "El nombre solo puede contener letras, espacios y apóstrofes.";
  }

  // La tarjeta se procesa como una cadena para conservar exactamente sus 16 dígitos.
  if (!/^\d{16}$/.test(form.cardNumber)) {
    errors.cardNumber = "La tarjeta debe contener exactamente 16 dígitos.";
  }

  // El vencimiento debe tener un mes válido y no puede estar en el pasado.
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.expirationDate)) {
    errors.expirationDate = "Usa el formato MM/AA con un mes entre 01 y 12.";
  } else {
    const [monthText, yearText] = form.expirationDate.split("/");
    const expirationMonth = Number(monthText);
    const expirationYear = 2000 + Number(yearText);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    if (
      expirationYear < currentYear ||
      (expirationYear === currentYear && expirationMonth < currentMonth)
    ) {
      errors.expirationDate =
        "La tarjeta está vencida. Ingresa una fecha vigente.";
    }
  }

  // El CVV debe tener exactamente tres dígitos y nunca se persiste.
  if (!/^\d{3}$/.test(form.cvv)) {
    errors.cvv = "El CVV debe contener exactamente 3 dígitos.";
  }

  // El monto debe ser finito, positivo, tener hasta dos decimales y respetar el límite máximo.
  if (
    !Number.isFinite(form.amount) ||
    form.amount <= 0 ||
    form.amount > MAX_AMOUNT
  ) {
    errors.amount = `El monto debe ser mayor que $0 y menor o igual que $${MAX_AMOUNT.toLocaleString("es-MX")}.`;
  } else if (Math.round(form.amount * 100) !== form.amount * 100) {
    errors.amount = "El monto puede tener como máximo 2 decimales.";
  }

  return errors;
}

/**
 * Formatea el número de tarjeta para mostrar grupos de cuatro dígitos.
 * Si el usuario todavía no lo completa, utiliza una máscara visual.
 */
function formatCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "").slice(0, 16).padEnd(16, "•");
  return digits.match(/.{1,4}/g)?.join("  ") ?? "••••  ••••  ••••  ••••";
}

/** Inserta guiones cada cuatro dígitos para mejorar la lectura del número ingresado. */
function formatCardInput(cardNumber: string): string {
  return cardNumber
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1-");
}

/** Devuelve el nombre del titular o una etiqueta neutra para la vista previa. */
function getCardholderName(fullName: string): string {
  return fullName.trim() || "NOMBRE DEL TITULAR";
}

export function RechargePage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    cardNumber: "",
    expirationDate: "",
    cvv: "",
    fullName: user?.fullName.toUpperCase() ?? "",
    amount: 100,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const submissionInProgress = useRef(false);

  /** Navega directamente al dashboard sin confirmar el descarte del formulario. */
  const handleLeave = () => {
    navigate("/dashboard");
  };

  /** Actualiza un campo y elimina inmediatamente los caracteres que no corresponden. */
  const update =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value;

      if (field === "fullName") {
        // Elimina números y símbolos no permitidos inmediatamente al escribir.
        value = value
          .replace(/[^\p{L}\s.'-]/gu, "")
          .slice(0, 80)
          .toUpperCase();
      } else if (field === "cardNumber") {
        // Conserva únicamente dígitos y limita la tarjeta a 16 posiciones.
        value = value.replace(/\D/g, "").slice(0, 16);
      } else if (field === "expirationDate") {
        // Conserva cuatro dígitos y agrega la barra entre mes y año automáticamente.
        const digits = value.replace(/\D/g, "").slice(0, 4);
        value =
          digits.length > 2
            ? `${digits.slice(0, 2)}/${digits.slice(2)}`
            : digits;
      } else if (field === "cvv") {
        // El CVV acepta únicamente tres dígitos.
        value = value.replace(/\D/g, "").slice(0, 3);
      }

      setForm((current) => ({
        ...current,
        [field]: field === "amount" ? Number(event.target.value) : value,
      }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      setMessage(null);
    };

  /**
   * Valida y procesa una única recarga, mostrando el resultado global con SweetAlert.
   * El cerrojo por referencia bloquea eventos consecutivos antes del siguiente render.
   */
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submissionInProgress.current) return;

    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    setMessage(null);
    if (Object.keys(validationErrors).length > 0) return;

    submissionInProgress.current = true;
    setLoading(true);
    try {
      const response = await paymentService.pay({
        ...form,
        fullName: form.fullName.trim(),
      });
      //  Conservar únicamente los valores ficticios devueltos por SnailPay.
      persistCardData(response.payment.card_number, response.payment.cvv);
      if (response.payment.status === "approved") {
        // El backend es la fuente de verdad y LocalStorage conserva la copia para el dashboard.
        const updatedUser = persistBalance(user!, response.user.balance);
        await refreshUser();
        await Swal.fire({
          theme: "dark",
          icon: "success",
          title: "Cobro exitoso",
          text: `Saldo actualizado. Tu saldo ahora es de $${updatedUser.balance.toFixed(2)}.`,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#98FF98",
          customClass: { confirmButton: "!font-bold !text-ink" },
        });
      } else if (response.payment.status === "rejected") {
        await Swal.fire({
          theme: "dark",
          icon: "error",
          title: "Tarjeta rechazada",
          text: response.payment.status_detail,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#98FF98",
          customClass: { confirmButton: "!font-bold !text-ink" },
        });
      } else {
        await Swal.fire({
          theme: "dark",
          icon: "warning",
          title: "Error de sistema",
          text: response.payment.status_detail,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#98FF98",
          customClass: { confirmButton: "!font-bold !text-ink" },
        });
      }
    } catch (error) {
      const response =
        error && typeof error === "object" && "response" in error
          ? (
            error as {
              response?: {
                status?: number;
                data?: {
                  payment?: {
                    status_detail?: string;
                    card_number?: string;
                    cvv?: string;
                  };
                };
              };
            }
          ).response
          : undefined;
      if (response?.data?.payment?.card_number && response.data.payment.cvv) {
        // Solo persistir los valores ficticios incluidos en una respuesta SnailPay procesada.
        persistCardData(
          response.data.payment.card_number,
          response.data.payment.cvv,
        );
      }
      await Swal.fire({
        theme: "dark",
        icon: response?.status === 502 ? "warning" : "error",
        title:
          response?.status === 502
            ? "Error de sistema"
            : "No se pudo procesar la recarga",
        text: response?.data?.payment?.status_detail ?? getApiError(error),
        confirmButtonText: "Entendido",
        confirmButtonColor: "#98FF98",
        customClass: { confirmButton: "!font-bold !text-ink" },
      });
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        className="animate-fade-up text-lg font-bold text-slate-400 transition hover:text-white"
        onClick={handleLeave}
      >
        ← Volver al dashboard
      </button>

      <div
        className="animate-fade-up mt-6"
        style={{ animationDelay: "0.05s" }}
      >
        <p className="text-md font-bold uppercase tracking-[0.2em] text-mint">
          SnailPay
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Recarga tu saldo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Completa los datos de tu tarjeta para añadir fondos y continuar
          siguiendo tus favoritos.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.18fr_0.82fr] lg:items-start">
        {/* Panel visual que resume la tarjeta */}
        <aside
          className="animate-fade-up space-y-5 lg:sticky lg:top-6"
          style={{ animationDelay: "0.15s" }}
        >
          <Card className="relative min-h-[330px] overflow-hidden rounded-xl border-aqua/20 bg-gradient-to-br from-[#183d50] via-[#123043] to-[#111d31] p-6 shadow-[0_24px_70px_rgba(49,174,198,.12)] sm:p-8">
            <div className="absolute -right-20 -top-16 h-56 w-56 rounded-full bg-aqua/15 blur-3xl" />
            <div className="relative flex h-full min-h-[280px] flex-col justify-between">
              <div className="flex items-center justify-between gap-4">
                <span className="text-md font-bold uppercase tracking-[0.2em] text-slate-300">
                  Caracol Pay
                </span>
                <span className="text-sm rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-md font-bold uppercase tracking-[0.16em] text-mint">
                  Demo
                </span>
              </div>
              <div>
                <div className="mb-7 flex items-center gap-2 text-slate-300">
                  <span className="h-7 w-10 rounded-md border border-white/30 bg-gradient-to-br from-slate-200/80 to-slate-400/50" />
                  <span className="text-md tracking-[0.18em]">SECURE</span>
                </div>
                <p className="text-center text-3xl font-black tracking-[0.16em] text-white">
                  {formatCardNumber(form.cardNumber)}
                </p>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-md uppercase tracking-[0.16em] text-slate-400">
                      Titular
                    </p>
                    <p className="mt-1 truncate text-lg font-bold uppercase text-white">
                      {getCardholderName(form.fullName)}
                    </p>
                  </div>
                  <div>
                    <p className="text-md uppercase tracking-[0.16em] text-slate-400">
                      Vence
                    </p>
                    <p className="mt-1 text-lg font-bold text-white">
                      {form.expirationDate || "MM/AA"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-xl border-white/10 bg-[#101f2b] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-md uppercase tracking-[0.16em] text-slate-500">
                  Resumen
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Recarga de saldo
                </p>
              </div>
              <p className="text-3xl font-black text-mint">
                ${Number(form.amount || 0).toFixed(2)}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-mint" />
              Procesamiento simulado y seguro
            </div>
          </Card>
        </aside>

        <Card
          className="animate-fade-up rounded-xl border-white/10 bg-[#0d1b2a] p-6 sm:p-8"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-center mt-2 text-3xl font-black text-white">
                Detalles de pago
              </h2>
              <p className="text-center mt-2 text-sm text-slate-400">
                Ingresa los datos de tu tarjeta para completar la recarga.
              </p>
            </div>
          </div>

          <form className="grid gap-5" onSubmit={submit} noValidate>
            <Input
              label="Nombre del titular"
              value={form.fullName}
              onChange={update("fullName")}
              error={errors.fullName}
              required
              maxLength={80}
              autoComplete="cc-name"
              icon={<UserIcon />}
            />
            <Input
              label="Número de tarjeta"
              value={formatCardInput(form.cardNumber)}
              onChange={update("cardNumber")}
              error={errors.cardNumber}
              required
              maxLength={19}
              inputMode="numeric"
              pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}"
              placeholder="1234-1234-1234-1234"
              autoComplete="cc-number"
              icon={<CreditCardIcon />}
            />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              <Input
                label="Vencimiento"
                value={form.expirationDate}
                onChange={update("expirationDate")}
                error={errors.expirationDate}
                required
                maxLength={5}
                pattern="(0[1-9]|1[0-2])/[0-9]{2}"
                placeholder="MM/AA"
                autoComplete="cc-exp"
              />
              <Input
                label="CVV"
                value={form.cvv}
                onChange={update("cvv")}
                error={errors.cvv}
                required
                maxLength={3}
                inputMode="numeric"
                pattern="[0-9]{3}"
                autoComplete="cc-csc"
              />
              <Input
                label="Monto"
                type="number"
                min="0.01"
                max={MAX_AMOUNT}
                step="0.01"
                value={form.amount}
                onChange={update("amount")}
                error={errors.amount}
                required
              />
            </div>

            {message && (
              <p
                className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-mint/10 text-mint" : message.type === "warning" ? "bg-orange-400/10 text-orange-200" : "bg-rose-400/10 text-rose-200"}`}
              >
                {message.text}
              </p>
            )}

            <Button
              disabled={loading}
              className="mt-2 w-full rounded-xl py-4 text-base shadow-[0_14px_30px_rgba(184,243,151,.15)]"
            >
              {loading ? (
                <Spinner />
              ) : (
                `Pagar $${Number(form.amount).toFixed(2)}`
              )}
            </Button>
          </form>

        </Card>
      </div>
    </div>
  );
}
