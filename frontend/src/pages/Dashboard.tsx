import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Button } from "../components/ui";
import { useAuth } from "../context/useAuth";

const bets = [
  { name: "Ganadas", value: 18 },
  { name: "Perdidas", value: 7 },
];

const snails = [
  { name: "Shellby", wins: 15 },
  { name: "Caracolín", wins: 12 },
  { name: "Turbo", wins: 10 },
  { name: "Flash", wins: 9 },
  { name: "Babosa", wins: 8 },
  { name: "Slimy", wins: 6 },
];

const tooltipStyle = {
  background: "#0b1725",
  border: "1px solid rgba(184, 243, 151, .18)",
  borderRadius: 12,
  color: "#f8fafc",
};

export function DashboardPage() {
  const { user } = useAuth();
  const totalBets = bets.reduce((total, bet) => total + bet.value, 0);
  const successRate = Math.round((bets[0].value / totalBets) * 100);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mint">
            Panel de control
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Hola,{" "}
            {user?.fullName
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
              )
              .join(" ")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Consulta tu saldo y sigue el rendimiento de tus caracoles favoritos.
          </p>
        </div>
        <Link to="/dashboard/recharge">
          <Button className="mt-0 w-full bg-mint px-6 py-3 text-base shadow-[0_12px_35px_rgba(184,243,151,.16)] hover:bg-lime-200 sm:w-auto">
            + Recargar saldo
          </Button>
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        {/* El saldo es la información financiera principal y queda visualmente priorizado. */}
        <Card className="rounded-xl relative min-h-[250px] overflow-hidden border-mint/20 bg-gradient-to-br from-[#153b3a] via-panel to-[#0c1825] p-7 sm:p-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-mint/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-md font-semibold text-slate-300">
                  Saldo disponible
                </p>
                <p className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  ${user?.balance.toFixed(2)}
                </p>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-mint/30 bg-mint/15 text-2xl text-mint">
                $
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-slate-500">
                  Estado de cuenta
                </p>
                <p className="mt-2 text-md font-semibold text-mint">
                  Cuenta activa · Saldo actualizado
                </p>
              </div>
              <Link
                to="/dashboard/recharge"
                className="text-md font-bold text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Ver opciones de recarga
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-5 xl:grid-cols-1">
          <Card className="group relative overflow-hidden rounded-xl border-mint/15 bg-gradient-to-br from-[#163936] via-[#102b2d] to-[#101f2b] p-6 shadow-[0_18px_45px_rgba(32,180,151,.1)]">
            <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-mint/10 blur-2xl transition duration-500 group-hover:bg-mint/20" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-md font-medium text-slate-300">
                  Apuestas ganadas
                </p>
                <p className="mt-3 text-5xl font-black tracking-tight text-white">
                  {bets[0].value}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Victorias acumuladas
                </p>
              </div>
              <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-black text-ink shadow-[0_8px_20px_rgba(184,243,151,.2)]">
                +12%
              </span>
            </div>
            <div className="relative mt-5 flex items-end justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-mint">
                Tendencia positiva
              </p>
              <svg
                aria-hidden="true"
                className="h-10 w-24 text-mint transition-transform duration-300 group-hover:scale-105"
                fill="none"
                viewBox="0 0 96 40"
              >
                <path
                  d="M2 31C13 31 14 25 23 27C32 29 35 19 43 21C52 23 53 13 61 16C70 19 72 7 79 10C85 12 89 6 94 3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </Card>
          <Card className="group relative overflow-hidden rounded-xl border-violet-300/15 bg-gradient-to-br from-[#29234a] via-[#191d38] to-[#101f2b] p-6 shadow-[0_18px_45px_rgba(155,135,245,.1)]">
            <div className="absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-violet-300/10 blur-2xl transition duration-500 group-hover:bg-violet-300/20" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-md font-medium text-slate-300">
                  Caracol favorito
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">
                  {snails[0].name}
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-300/15 text-lg text-violet-200">
                #1
              </span>
            </div>
            <div className="relative mt-6 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-violet-200">
                  {snails[0].wins}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  victorias registradas
                </p>
              </div>
              <div className="flex items-end gap-1" aria-hidden="true">
                {[24, 34, 20, 42, 31, 48].map((height, index) => (
                  <span
                    key={index}
                    className="w-1.5 rounded-full bg-violet-300/70"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <Card className="rounded-xl border-white/10 bg-[#0d1b2a] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-md font-bold uppercase tracking-[0.18em] text-slate-500">
                Rendimiento
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Resumen de apuestas
              </h2>
            </div>
            <span className="rounded-full bg-mint/10 px-3 py-1.5 text-sm font-bold text-mint">
              {successRate}% éxito
            </span>
          </div>
          <div
            className="relative mt-5 h-64"
            aria-label="Resumen de apuestas ganadas y perdidas"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bets}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#9b87f5" />
                  <Cell fill="#b8f397" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">
                {totalBets}
              </span>
              <span className="text-xs text-slate-400">apuestas</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-5 text-md text-slate-400">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[#9b87f5]" />
              Ganadas
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-mint" />
              Perdidas
            </span>
          </div>
        </Card>

        <Card className="rounded-xl border-white/10 bg-[#0d1b2a] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-md font-bold uppercase tracking-[0.18em] text-slate-500">
                Clasificación
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Victorias por caracol
              </h2>
            </div>
            <span className="text-sm text-slate-500">Datos simulados</span>
          </div>
          <div
            className="mt-5 h-64"
            aria-label="Victorias registradas por caracol"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={snails}
                layout="vertical"
                margin={{ left: 4, right: 12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff0b"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={76}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar
                  dataKey="wins"
                  fill="#7dd3fc"
                  radius={[0, 8, 8, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <Card className="rounded-xl border-aqua/15 bg-gradient-to-br from-[#123245] to-[#101f2b] p-5 shadow-[0_16px_38px_rgba(125,211,252,.08)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Total de apuestas
            </p>
            <span className="text-aqua">↗</span>
          </div>
          <p className="mt-4 text-3xl font-black text-white">{totalBets}</p>
          <p className="mt-1 text-xs text-aqua">Actividad del club</p>
        </Card>
        <Card className="rounded-xl border-violet-300/15 bg-gradient-to-br from-[#29234a] to-[#101f2b] p-5 shadow-[0_16px_38px_rgba(155,135,245,.08)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Mejor caracol
            </p>
            <span className="text-lg text-violet-200">★</span>
          </div>
          <p className="mt-4 text-3xl font-black text-white">
            {snails[0].wins}
          </p>
          <p className="mt-1 truncate text-xs text-violet-200">
            {snails[0].name} · líder actual
          </p>
        </Card>
        <Card className="rounded-xl border-mint/15 bg-gradient-to-br from-[#163936] to-[#101f2b] p-5 shadow-[0_16px_38px_rgba(184,243,151,.08)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Estado de cuenta
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_14px_rgba(184,243,151,.8)]" />
          </div>
          <p className="mt-4 text-3xl font-black text-mint">Activo</p>
          <p className="mt-1 text-xs text-slate-400">Sesión protegida</p>
        </Card>
      </section>
    </div>
  );
}
