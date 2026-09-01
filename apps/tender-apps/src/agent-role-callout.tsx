import type { CSSProperties } from "react";
import "./agent-role-callout.css";

type AgentRoleCalloutProps = {
  className?: string;
  eyebrow: string;
  imageAlt: string;
  imagePosition?: string;
  imageSrc: string;
  subtitle: string;
  tags: readonly [string, string, string];
  title: string;
  titleId: string;
};

/**
 * Shared visual grammar for the human role behind a practical TenderApps
 * workspace. Each Agent supplies its own audience, outcome language, image,
 * verbs, palette variables, and crop; the component only owns the callout's
 * accessible structure and responsive speech-bubble composition.
 */
export function AgentRoleCallout({
  className = "",
  eyebrow,
  imageAlt,
  imagePosition = "50% 18%",
  imageSrc,
  subtitle,
  tags,
  title,
  titleId,
}: AgentRoleCalloutProps) {
  const classes = ["agent-role-callout", className].filter(Boolean).join(" ");
  const imageStyle = { "--agent-role-image-position": imagePosition } as CSSProperties;

  return (
    <aside className={classes} aria-labelledby={titleId}>
      <figure className="agent-role-callout__portrait" style={imageStyle}>
        {/* Static Vite assets keep generated portraits project-local and CSP-safe. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} decoding="async" height={1536} width={1024} />
      </figure>
      <div className="agent-role-callout__copy">
        <span className="agent-role-callout__eyebrow">{eyebrow}</span>
        <strong id={titleId}>{title}</strong>
        <p>{subtitle}</p>
        <ul className="agent-role-callout__tags" aria-label={`${title} themes`}>
          {tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
    </aside>
  );
}
