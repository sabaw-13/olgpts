// A fresh query per page avoids mutating a query that is already in flight.
// Continue until an empty page, including when the API caps responses below pageSize.
export async function fetchAllRows(queryFactory, pageSize = 500) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Page size must be a positive integer.');
  }
  const rows = [];
  try {
    while (true) {
      const { data, error } = await queryFactory()
        .order('id', { ascending: true })
        .range(rows.length, rows.length + pageSize - 1);
      if (error) return { data: null, error };
      if (!data?.length) return { data: rows, error: null };
      rows.push(...data);
    }
  } catch (error) {
    return { data: null, error };
  }
}
