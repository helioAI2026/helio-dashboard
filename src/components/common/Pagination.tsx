import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      className={
        "flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm " +
        (className ?? "")
      }
    >
      <p className="text-muted-foreground">
        <span className="font-data tabular-nums text-foreground">
          {formatNumber(first)}–{formatNumber(last)}
        </span>{" "}
        de <span className="font-data tabular-nums">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Página <span className="font-data tabular-nums">{page}</span> /{" "}
          <span className="font-data tabular-nums">{pageCount}</span>
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
