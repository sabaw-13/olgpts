export function escapeCsv(value) {
  let text = String(value ?? '');
  // Spreadsheet applications interpret these prefixes even inside quoted cells.
  if (typeof value !== 'number' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return /[,"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
