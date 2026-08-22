"use client";

import { useEffect } from "react";
import TopNavigation from "../top-navigation";
import "./run.css";

export default function MainAgentsRunLegacyRoute() {
  useEffect(() => {
    window.location.replace("/case-simulation");
  }, []);

  return (
    <main className="page-shell legacy-run-page">
      <TopNavigation active="validation" />
      <section className="legacy-run-message">
        <p>LEGACY ROUTE · SIMULATION CONSOLIDATED</p>
        <h1>Main Run moved to Validation.</h1>
        <span>Симуляция и проверка вовлечения агентов теперь ведутся в единой методике Case Audit.</span>
        <a href="/case-simulation">Open Validation →</a>
      </section>
    </main>
  );
}
