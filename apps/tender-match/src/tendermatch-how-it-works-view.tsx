import { useEffect, useRef, useState } from "react";
import approvedHtml from "./tendermatch-general-rule.html?raw";

/** The reviewed HTML supplies all explanatory copy, figures, sequence and calculator logic. */
export function TenderMatchHowItWorksView() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [frameHeight, setFrameHeight] = useState(4200);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const measureLoadedDocument = () => {
    const document = frameRef.current?.contentDocument;
    if (!document) return;
    observerRef.current?.disconnect();
    const measure = () => setFrameHeight(Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0));
    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(document.documentElement);
    if (document.body) observerRef.current.observe(document.body);
    measure();
  };

  return <section className="tm-general-page" aria-label="Как работает TenderMatch" lang="ru">
    <nav className="tm-general-nav" aria-label="TenderMatch method pages"><span>How it works</span><a href="/tendermatch?view=formula">Formula v1.1 →</a></nav>
    <iframe
      ref={frameRef}
      title="Как TenderMatch превращает данные в возможность"
      srcDoc={approvedHtml}
      onLoad={measureLoadedDocument}
      style={{ height: frameHeight }}
    />
  </section>;
}
