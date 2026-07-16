export function MessageBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
      {message}
    </div>
  );
}
