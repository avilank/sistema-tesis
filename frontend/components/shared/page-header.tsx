import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-4 py-6 md:px-8">
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
        {description}
      </div>
    </div>
  );
}
