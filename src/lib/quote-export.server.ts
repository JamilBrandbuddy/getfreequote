import * as XLSX from "xlsx";

export async function buildQuoteExport(
  format: "csv" | "xlsx",
  fetchPage: (offset: number) => Promise<{ rows: Record<string, unknown>[]; total: number }>,
  headers: string[], csvLine: (values: unknown[]) => string,
  values: (row: Record<string, unknown>) => string[],
) {
  const workbook = format === "xlsx" ? XLSX.utils.book_new() : null;
  const sheet = workbook ? XLSX.utils.aoa_to_sheet([headers]) : null;
  const csv = ["\ufeff", csvLine(headers)];
  let offset = 0;
  let total = 0;
  do {
    const page = await fetchPage(offset);
    total = page.total;
    for (const row of page.rows) {
      const cells = values(row);
      if (sheet) XLSX.utils.sheet_add_aoa(sheet, [cells], { origin: -1 });
      else csv.push(csvLine(cells));
    }
    if (!page.rows.length && offset < total) throw new Error("Export changed while preparing. Please try again.");
    offset += page.rows.length;
  } while (offset < total);
  if (workbook && sheet) {
    sheet["!cols"] = headers.map((_, i) => ({ wch: i === 2 || i === 4 ? 32 : 24 }));
    sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: offset, c: headers.length - 1 } }) };
    XLSX.utils.book_append_sheet(workbook, sheet, "Quote requests");
  }
  const bytes = workbook ? new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" })) : new TextEncoder().encode(csv.join(""));
  return {
    base64: Buffer.from(bytes).toString("base64"), count: offset,
    filename: `riverbend-quotes-${new Date().toISOString().slice(0, 10)}.${format}`,
    mime: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
  };
}