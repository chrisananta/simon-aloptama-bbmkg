export const PRINT_BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f1f5f9;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }

  .print-bar {
    margin: 12px auto; padding: 12px 16px;
    background: #0f172a; color: #fff; border-radius: 14px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    font: 700 12px Arial, sans-serif;
  }
  .print-bar button {
    background: #0052CC; color: #fff; padding: 8px 18px;
    border-radius: 10px; border: 0; cursor: pointer; font-weight: 700;
  }

  /* Footer berulang (hanya aktif bila dokumen memakai opsi repeatFooterHtml) */
  table.print-shell { width: 100%; border-collapse: collapse; border: 0; }
  table.print-shell > tbody > tr > td,
  table.print-shell > tfoot > tr > td { padding: 0; border: 0; vertical-align: top; }
  .print-footer-space { height: 0; }
  .print-footer-fixed { margin-top: 6mm; }

  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }

    table.print-shell > tfoot { display: table-footer-group; }
    .print-footer-space { height: var(--print-footer-space, 26mm); }
    .print-footer-fixed {
      position: fixed; left: 0; right: 0; bottom: 0;
      margin: 0; background: #fff;
    }
  }
`;