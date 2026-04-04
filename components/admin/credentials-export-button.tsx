"use client";

type CredentialRow = {
  teamName: string;
  shortCode: string;
  loginEmail: string;
  loginPassword: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintableMarkup(rows: CredentialRow[]) {
  const renderedRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.teamName)}</td>
          <td>${escapeHtml(row.shortCode)}</td>
          <td>${escapeHtml(row.loginEmail)}</td>
          <td>${escapeHtml(row.loginPassword)}</td>
        </tr>
      `
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Mock IPL Auction Credentials</title>
      <style>
        :root {
          color-scheme: light;
          font-family: Inter, Arial, sans-serif;
        }
        body {
          margin: 32px;
          color: #101828;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }
        p {
          margin: 0 0 20px;
          color: #475467;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #d0d5dd;
          padding: 12px;
          text-align: left;
          font-size: 14px;
        }
        th {
          background: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 12px;
        }
        .meta {
          margin-top: 16px;
          font-size: 12px;
          color: #667085;
        }
        @media print {
          body {
            margin: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Mock IPL Auction Credentials Sheet</h1>
      <p>Use the browser print dialog and choose “Save as PDF” to export a sharable handoff sheet.</p>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>Code</th>
            <th>Email</th>
            <th>Password</th>
          </tr>
        </thead>
        <tbody>${renderedRows}</tbody>
      </table>
      <div class="meta">Generated from the admin control room.</div>
    </body>
  </html>`;
}

export function CredentialsExportButton({ rows }: { rows: CredentialRow[] }) {
  function handleExport() {
    if (rows.length === 0) {
      return;
    }

    const exportWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!exportWindow) {
      return;
    }

    exportWindow.document.open();
    exportWindow.document.write(buildPrintableMarkup(rows));
    exportWindow.document.close();
    exportWindow.focus();
    exportWindow.print();
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="rounded-full border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-4 py-2 text-sm font-medium text-[var(--gold-soft)] transition hover:border-[var(--gold)]/45 hover:bg-[rgba(245,166,35,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Export Credentials PDF
    </button>
  );
}
