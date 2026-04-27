type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  displayedResults: number;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  displayedResults,
  onPageChange,
}: PaginationControlsProps) {
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing page {currentPage} with {displayedResults} result
        {displayedResults > 1 ? "s" : ""}.
      </p>
      <div className="flex items-center gap-3">
        <button
          className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
