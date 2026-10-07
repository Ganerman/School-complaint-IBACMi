// Continue to an empty page so a server row limit cannot silently truncate totals.
export async function readAllRows<T, E>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: E | null }>) {
  const rows: T[] = []
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + 999)
    if (error) return { data: null, error }
    if (!data?.length) return { data: rows, error: null }
    rows.push(...data)
  }
}
