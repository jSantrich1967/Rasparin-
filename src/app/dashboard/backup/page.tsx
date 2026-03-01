import { BackupPanel } from "./BackupPanel";
import { PageSection } from "../PageSection";

export default function BackupPage() {
  return (
    <PageSection
      title="Respaldo"
      description="Exporta o importa todos tus datos. Importar reemplaza los datos actuales."
    >
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <BackupPanel />
      </div>
    </PageSection>
  );
}
