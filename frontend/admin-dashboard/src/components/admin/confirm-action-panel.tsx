type ConfirmActionPanelProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
};

const variantClassNames = {
  danger: {
    panel: "border-red-200 bg-red-50",
    title: "text-red-900",
    message: "text-red-800",
    confirm: "bg-red-700 text-white hover:bg-red-800",
  },
  warning: {
    panel: "border-amber-200 bg-amber-50",
    title: "text-amber-950",
    message: "text-amber-900",
    confirm: "bg-amber-700 text-white hover:bg-amber-800",
  },
};

export function ConfirmActionPanel({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmActionPanelProps) {
  const classNames = variantClassNames[variant];

  return (
    <section className={`rounded-[1.5rem] border p-6 ${classNames.panel}`}>
      <div className="space-y-2">
        <h3 className={`text-xl font-semibold tracking-tight ${classNames.title}`}>
          {title}
        </h3>
        <p className={`text-sm leading-6 ${classNames.message}`}>{message}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className={`rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${classNames.confirm}`}
          disabled={isLoading}
          onClick={onConfirm}
          type="button"
        >
          {isLoading ? "Working..." : confirmLabel}
        </button>

        <button
          className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={onCancel}
          type="button"
        >
          {cancelLabel}
        </button>
      </div>
    </section>
  );
}
