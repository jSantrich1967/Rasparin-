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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Tarjeteando</h1>
        <p className="text-sm text-gray-500 mt-1">Inicia sesión</p>

        <form
          className="mt-6 space-y-3"
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
            <label className="text-sm font-medium">Usuario</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black text-white py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
