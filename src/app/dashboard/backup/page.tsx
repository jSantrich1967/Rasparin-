import { BackupPanel } from "./BackupPanel";
import { PageSection } from "../PageSection";

export default function BackupPage() {
  return (
    <PageSection
      title="Respaldo"
      description="Exporta o importa todos tus datos. Importar reemplaza los datos actuales."
    >
      <div className="rounded-2xl stitch-glass p-4 sm:p-6 shadow-sm">
        <BackupPanel />
      </div>
    </PageSection>
  );
}
