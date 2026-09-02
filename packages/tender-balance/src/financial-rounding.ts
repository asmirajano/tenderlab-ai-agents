/**
 * TenderBalance presents financial amounts as whole numbers. The canonical
 * source token remains untouched; this policy is only for client-facing
 * figures and generated form amounts.
 */
export function roundFinancialFigure(value: number) {
  if (!Number.isFinite(value)) return value;
  return value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);
}

export function roundedFinancialFigure(value: number | null | undefined, scale = 1) {
  if (value === null || value === undefined) return null;
  return roundFinancialFigure(value / scale);
}

export function formatWholeFinancialFigure(value: number | null | undefined, scale = 1) {
  const rounded = roundedFinancialFigure(value, scale);
  if (rounded === null) return "MISSING";
  return rounded < 0
    ? `(${Math.abs(rounded).toLocaleString("en-US", { maximumFractionDigits: 0 })})`
    : rounded.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
