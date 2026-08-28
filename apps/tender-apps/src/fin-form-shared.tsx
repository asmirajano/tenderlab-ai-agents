import type { FinPresentationCurrency } from "../../../packages/tender-balance/src/fin1-fx.ts";

export function formatFigure(value: number | null, scale: number) {
  if (value === null) return "MISSING";
  const displayed = value / scale;
  return displayed < 0
    ? `(${Math.abs(displayed).toLocaleString("en-US", { maximumFractionDigits: 2 })})`
    : displayed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function FinCurrencySwitcher({ value, onChange }: { value: FinPresentationCurrency; onChange: (currency: FinPresentationCurrency) => void }) {
  return (
    <div aria-label="FIN presentation currency" className="fin-currency-switcher" role="group">
      <span>FIN currency</span>
      {(["USD", "EUR"] as const).map((currency) => (
        <button aria-pressed={value === currency} key={currency} onClick={() => onChange(currency)} type="button">{currency}</button>
      ))}
    </div>
  );
}
