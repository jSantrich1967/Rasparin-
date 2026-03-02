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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      {/* Solid background (no backdrop-blur) - backdrop-blur blocks touch/input on mobile Safari */}
      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800 p-6 sm:p-8 shadow-2xl my-auto">
        <h1 className="text-2xl font-bold text-white">Tarjeteando</h1>
        <p className="text-slate-400 text-sm mt-1">Inicia sesión para continuar</p>

        <form
          className="mt-6 space-y-4 touch-manipulation"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[44px] touch-manipulation"
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
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[44px] touch-manipulation"
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
            className="w-full rounded-lg bg-white text-slate-900 py-3 text-base font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 min-h-[48px]"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
