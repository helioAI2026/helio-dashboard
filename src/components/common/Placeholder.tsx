import { Construction } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";

type PlaceholderProps = {
  title: string;
  description?: string;
  milestone?: string;
};

/** Temporary page body used while a milestone is still being built. */
export function Placeholder({ title, description, milestone }: PlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <Construction className="size-6 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Tela em construção</p>
        {milestone && (
          <p className="mt-1 text-xs text-muted-foreground">{milestone}</p>
        )}
      </div>
    </>
  );
}
