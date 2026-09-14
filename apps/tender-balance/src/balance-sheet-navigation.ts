import type { BalanceSheetReview } from "../../../packages/tender-balance/src/model.ts";

export type BalanceSurface = "welcome" | "intake" | "review" | "fin" | "cases";

export type BalanceNavigationState = {
  surface: BalanceSurface;
  caseId: string;
  demo: boolean;
};

const viewToSurface: Record<string, BalanceSurface> = {
  overview: "welcome",
  new: "intake",
  cases: "cases",
  result: "review",
  fin: "fin",
};

const surfaceToView: Record<BalanceSurface, string> = {
  welcome: "overview",
  intake: "new",
  cases: "cases",
  review: "result",
  fin: "fin",
};

export function isCaseSurface(surface: BalanceSurface) {
  return surface === "review" || surface === "fin";
}

export function parseBalanceNavigation(url: string | URL): BalanceNavigationState {
  const parsed = typeof url === "string" ? new URL(url, "http://localhost") : url;
  const requestedSurface = viewToSurface[parsed.searchParams.get("view") ?? ""] ?? "welcome";
  const caseId = parsed.searchParams.get("case")?.trim() ?? "";
  const surface = isCaseSurface(requestedSurface) && !caseId ? "cases" : requestedSurface;
  return { surface, caseId: isCaseSurface(surface) ? caseId : "", demo: isCaseSurface(surface) && parsed.searchParams.get("demo") === "1" };
}

export function balanceNavigationHref(state: BalanceNavigationState, pathname = "/balance-sheet-review") {
  const params = new URLSearchParams();
  params.set("view", surfaceToView[state.surface]);
  if (isCaseSurface(state.surface) && state.caseId) params.set("case", state.caseId);
  if (isCaseSurface(state.surface) && state.demo) params.set("demo", "1");
  return `${pathname}?${params.toString()}`;
}

export function resolveBalanceCase(reviews: BalanceSheetReview[], caseId: string) {
  return caseId ? reviews.find((review) => review.reviewId === caseId) : undefined;
}
