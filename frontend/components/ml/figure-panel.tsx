type FigurePanelProps = {
  title: string;
  src: string | null;
  alt: string;
  pending: string;
  className?: string;
};

export function FigurePanel({ title, src, alt, pending, className }: FigurePanelProps) {
  return (
    <div>
      <p className="text-sm font-medium text-primary mb-2">{title}</p>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={className ?? "w-full rounded-lg border border-border bg-white"}
        />
      ) : (
        <div className="h-40 rounded-lg border border-dashed border-border grid place-items-center text-muted-foreground text-sm px-4 text-center">
          {pending}
        </div>
      )}
    </div>
  );
}
