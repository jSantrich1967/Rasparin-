import Link from "next/link";
import { BackupPanel } from "./BackupPanel";

export default function BackupPage() {
  return (
    <section className="p-6">
      <h2 className="text-2xl font-bold mb-4">Respaldo</h2>
      <p className="text-sm text-slate-600 mb-4">
        Exporta todos tus datos (bancos, tarjetas, contrapartes, tasas BCV, operaciones, pagos y conciliaciones) a un archivo JSON. 
        Puedes importar ese archivo más tarde para restaurar el respaldo. <strong>Importar reemplaza todos los datos actuales.</strong>
      </p>
      <BackupPanel />
      <p className="mt-4 text-sm">
        <Link href="/dashboard" className="text-slate-600 hover:underline">← Volver al Resumen</Link>
      </p>
    </section>
  );
}
