import { createElement, type HTMLAttributes, type ReactNode } from "react";

export const practicalAgentOverviewPartOrder = [
  "outcome-promise",
  "input",
  "agent-transformation",
  "finished-output",
  "primary-action",
  "trust-boundary",
] as const;

export type PracticalAgentOverviewPartId = (typeof practicalAgentOverviewPartOrder)[number];
export type PracticalAgentOverviewAudience = "client" | "consultant" | "internal";

type OverviewElement = "article" | "aside" | "div" | "footer" | "header" | "section";

type PracticalAgentOverviewProps = HTMLAttributes<HTMLElement> & {
  audience: PracticalAgentOverviewAudience;
  children: ReactNode;
  productId: string;
};

type PracticalAgentOverviewPartProps = HTMLAttributes<HTMLElement> & {
  as?: OverviewElement;
  children: ReactNode;
  part: Exclude<PracticalAgentOverviewPartId, "trust-boundary">;
};

type PracticalAgentOverviewBoundaryProps = HTMLAttributes<HTMLElement> & {
  as?: OverviewElement | "details";
  children: ReactNode;
  productId: string;
};

/**
 * Audience-neutral semantic contract for every real practical-Agent Overview.
 * Agent-specific layouts and visuals remain in the caller; the data hooks are
 * stable so registry and rendered-browser gates can verify the same contract.
 */
export function PracticalAgentOverview({ audience, children, productId, ...props }: PracticalAgentOverviewProps) {
  return (
    <section
      {...props}
      data-practical-agent-overview={productId}
      data-practical-agent-overview-audience={audience}
    >
      {children}
    </section>
  );
}

export function PracticalAgentOverviewPart({ as = "div", children, part, ...props }: PracticalAgentOverviewPartProps) {
  return createElement(as, {
    ...props,
    "data-practical-agent-overview-part": part,
    ...(part === "finished-output" ? { "data-overview-visual-priority": "dominant" } : {}),
  }, children);
}

export function PracticalAgentOverviewBoundary({ as = "section", children, productId, ...props }: PracticalAgentOverviewBoundaryProps) {
  return createElement(as, {
    ...props,
    "data-practical-agent-overview-boundary-for": productId,
    "data-practical-agent-overview-part": "trust-boundary",
  }, children);
}
