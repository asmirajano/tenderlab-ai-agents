export function ProductBrand({ atlas = false }: { atlas?: boolean }) {
  return (
    <span className="shared-product-brand">
      <span className="shared-brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="shared-brand-copy">
        <strong>TenderLab<span>.ai</span></strong>
        {atlas && <small>ECOSYSTEM ATLAS</small>}
      </span>
    </span>
  );
}
