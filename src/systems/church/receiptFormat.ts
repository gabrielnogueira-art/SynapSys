export function formatReferenceMonthLabel(ym?: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "-";
  const [y, m] = ym.split("-");
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const idx = parseInt(m, 10) - 1;
  return `${months[idx] ?? m}/${y}`;
}
