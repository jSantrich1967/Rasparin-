import Link from "next/link";
import { ReactNode } from "react";

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h2>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
      {children}
      <p className="mt-6 text-sm">
        <Link href="/dashboard" className="text-blue-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
