type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
        {eyebrow}
      </p>
      <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <p className="max-w-3xl text-base leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}
