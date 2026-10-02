import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";

import { SeverityPill } from "./SeverityPill";
import { StatCard } from "./StatCard";
import { DataTable } from "./DataTable";
import { Pagination } from "./Pagination";

describe("SeverityPill", () => {
  it("shows the Portuguese label and score", () => {
    render(<SeverityPill severity="critical" score={88} />);
    expect(screen.getByText("Crítico")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  it("renders value and delta, or a skeleton while loading", () => {
    const { rerender, container } = render(
      <StatCard label="Motoristas" value={32} delta={{ value: 3 }} />,
    );
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(<StatCard label="Motoristas" value={32} loading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});

type Row = { id: string; name: string };
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "name", header: "Nome" },
];

describe("DataTable", () => {
  it("renders rows and fires onRowClick", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={[
          { id: "1", name: "Alfa" },
          { id: "2", name: "Bravo" },
        ]}
        onRowClick={onRowClick}
        getRowId={(r) => r.id}
      />,
    );

    expect(screen.getByText("Alfa")).toBeInTheDocument();
    await user.click(screen.getByText("Bravo"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "2", name: "Bravo" });
  });

  it("shows the empty state", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("Nenhum registro encontrado.")).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("disables navigation at the edges and steps pages", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination page={1} pageSize={10} total={35} onPageChange={onPageChange} />,
    );

    expect(screen.getByLabelText("Página anterior")).toBeDisabled();
    await user.click(screen.getByLabelText("Próxima página"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
