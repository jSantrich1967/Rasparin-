"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm({ from }: { from: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 stitch-bg overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl stitch-glass p-6 sm:p-8 my-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-electric-blue to-blue-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,122,255,0.3)]">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tarjeteando</h1>
            <p className="text-slate-400 text-sm mt-0.5">Inicia sesión para continuar</p>
          </div>
        </div>

        <form
          className="login-form mt-6 space-y-4 touch-manipulation"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            const res = await signIn("credentials", {
              redirect: false,
              username,
              password,
            });
            setLoading(false);
            if (res?.ok) router.push(from);
            else setError("Credenciales inválidas");
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
            <input
              type="text"
              className="login-input w-full rounded-lg border border-slate-500 bg-white px-3 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[44px] touch-manipulation"
              style={{ fontSize: "16px" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Tu usuario"
              inputMode="text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
            <input
              type="password"
              className="login-input w-full rounded-lg border border-slate-500 bg-white px-3 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[44px] touch-manipulation"
              style={{ fontSize: "16px" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Escribe tu contraseña"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-tr from-electric-blue to-blue-400 text-white py-3 text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[48px] shadow-[0_4px_14px_rgba(0,122,255,0.4)]"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
