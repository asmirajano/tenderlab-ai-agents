"use client";

import { useEffect } from "react";
import TopNavigation from "../top-navigation";
import "../products/products.css";

export default function BalanceSheetReviewLegacyRoute() {
  useEffect(() => {
    window.location.replace("/products#tenderbalance");
  }, []);

  return (
    <main className="products-page">
      <TopNavigation active="products" />
      <section className="products-hero">
        <div>
          <p><span /> LEGACY ROUTE · PRODUCT SEPARATED</p>
          <h1>Balance-sheet review<br /><em>moved to TenderBalance.</em></h1>
          <p>The Command Center now manages the product without hosting the client review workspace.</p>
          <a href="/products#tenderbalance">Open Client Products →</a>
        </div>
      </section>
    </main>
  );
}
