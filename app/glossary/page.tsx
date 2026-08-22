import TopNavigation from "../top-navigation";
import { tenderGlossaryCategoryLabels, tenderGlossaryTerms } from "../tender-glossary";
import { TenderGlossaryBrowser } from "../tender-glossary-ui";

export default function TenderGlossaryPage() {
  return (
    <main className="tender-glossary-page">
      <TopNavigation active="glossary" />
      <section className="tender-glossary-hero">
        <div>
          <p className="eyebrow"><span />TENDERLAB KNOWLEDGE SYSTEM</p>
          <h1>TenderLab<br /><em>Glossary</em></h1>
          <p>Канонические термины архитектуры агентов и тендерной экосистемы — с техническим смыслом, простым объяснением и практическим примером.</p>
        </div>
        <aside aria-label="TenderLab Glossary scope">
          <span>CANONICAL DATASET</span>
          <strong>{tenderGlossaryTerms.length}</strong>
          <p>терминов · {Object.keys(tenderGlossaryCategoryLabels).length} категорий</p>
          <small>Эта база питает полную страницу и contextual quick-panel.</small>
        </aside>
      </section>
      <section className="tender-glossary-principles" aria-label="Назначение TenderLab Glossary">
        <article><b>01</b><strong>Architecture</strong><span>Как устроены agents, orchestration и dependencies.</span></article>
        <article><b>02</b><strong>Execution</strong><span>Как Case реагирует на events, decisions и waiting states.</span></article>
        <article><b>03</b><strong>Evidence</strong><span>Какие inputs, outputs и artifacts передаются дальше.</span></article>
      </section>
      <TenderGlossaryBrowser mode="page" />
    </main>
  );
}

