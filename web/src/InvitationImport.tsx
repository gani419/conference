import { useEffect, useRef, useState } from 'react';
import { FileUp, Download, Contact, Check, X } from 'lucide-react';
import {
  browserContactPicker,
  contactInvitationRows,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  parseInvitationCsv,
  sampleCsv,
  validateImport,
} from './invitationImportData';
import type { ImportedInvitee, ImportRow } from './invitationImportData';
export function InvitationImport({
  existing,
  onAdd,
  onPendingChange,
  disabled,
}: {
  existing: { email: string }[];
  onAdd: (people: ImportedInvitee[]) => void;
  onPendingChange: (pending: boolean) => void;
  disabled: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{
    source: string;
    rows: ImportRow[];
  } | null>(null);
  const [properties, setProperties] = useState<string[] | null>(null);
  useEffect(() => {
    let disposed = false;
    const picker = browserContactPicker();
    if (picker)
      void picker
        .getProperties()
        .then(props => {
          if (!disposed)
            setProperties(
              props.includes('email')
                ? props.filter(p => p === 'name' || p === 'email')
                : null,
            );
        })
        .catch(() => {});
    return () => {
      disposed = true;
      generation.current++;
    };
  }, []);
  useEffect(() => {
    onPendingChange(busy || preview !== null);
  }, [busy, preview, onPendingChange]);
  const checked = preview ? validateImport(preview.rows, existing) : [];
  const valid = checked.filter(row => !row.error);
  async function readFile(file: File) {
    const version = ++generation.current;
    setBusy(true);
    setError('');
    setNotice('');
    setPreview(null);
    try {
      if (!/\.csv$/i.test(file.name)) throw new Error('Choose a .csv file.');
      if (file.size > MAX_IMPORT_BYTES)
        throw new Error('Choose a CSV smaller than 1 MB.');
      const rows = parseInvitationCsv(await file.text());
      if (version === generation.current)
        setPreview({ source: file.name, rows });
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : 'The CSV could not be read.');
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  async function pickContacts() {
    const picker = browserContactPicker();
    if (!picker || !properties) return;
    const version = ++generation.current;
    setBusy(true);
    setError('');
    setNotice('');
    setPreview(null);
    try {
      // select is called directly from the click; capability checks happened earlier.
      const contacts = await picker.select(properties, { multiple: true });
      if (version !== generation.current) return;
      const rows = contactInvitationRows(contacts);
      if (rows.length > MAX_IMPORT_ROWS)
        throw new Error(
          `Choose up to ${MAX_IMPORT_ROWS} email addresses at a time.`,
        );
      if (rows.length) setPreview({ source: 'Selected contacts', rows });
      else setNotice('No contacts selected.');
    } catch (e) {
      if (
        version === generation.current &&
        !(e instanceof DOMException && e.name === 'AbortError')
      )
        setError(
          'Contacts could not be opened. Try CSV import or add invitees manually.',
        );
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }
  return (
    <div className="invitation-import">
      <div className="button-row import-actions">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => fileInput.current?.click()}
        >
          <FileUp size={17} aria-hidden="true" />
          Import CSV
        </button>
        <a
          className="import-sample"
          href={'data:text/csv;charset=utf-8,' + encodeURIComponent(sampleCsv)}
          download="conference-invitees.csv"
        >
          <Download size={17} aria-hidden="true" />
          Download sample
        </a>
        <button
          type="button"
          disabled={disabled || busy || !properties}
          aria-describedby="contact-import-help"
          onClick={() => void pickContacts()}
        >
          <Contact size={17} aria-hidden="true" />
          Import contacts
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          aria-label="Invitation CSV file"
          className="sr-only"
          tabIndex={-1}
          disabled={disabled || busy}
          onChange={e => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file) void readFile(file);
          }}
        />
      </div>
      <p className="small muted">
        CSV columns: display_name, email, role. Roles: guest or co_host; omitted
        roles use guest. Up to 500 rows, 1 MB.
      </p>
      <p className="small muted" id="contact-import-help">
        {properties
          ? 'Choose contacts to share their names and email addresses. Only your selected contacts are used.'
          : 'Contact picking is unavailable in this browser. Use CSV import or add invitees manually.'}
      </p>
      {busy && <p role="status">Reading invitees…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {preview && (
        <section
          className="import-preview"
          aria-label="Invitation import preview"
        >
          <div className="section-heading">
            <h3>Review import</h3>
            <button
              type="button"
              aria-label="Cancel invitation import"
              onClick={() => setPreview(null)}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
          <p className="small import-filename">{preview.source}</p>
          <p role="status">
            {valid.length} ready to add · {checked.length - valid.length}{' '}
            skipped
          </p>
          <p className="small muted">
            Review names, emails and roles below. Skipped rows will not be
            added. You can edit added invitees before saving the meeting.
          </p>
          <ul className="import-preview-list">
            {checked.map(row => (
              <li key={row.row} className={row.error ? 'import-invalid' : ''}>
                <span>
                  {row.error ? (
                    <X size={16} aria-hidden="true" />
                  ) : (
                    <Check size={16} aria-hidden="true" />
                  )}
                  Row {row.row}:{' '}
                  <strong>{row.invitee.displayName || 'Missing name'}</strong>
                </span>
                <span>
                  {row.invitee.email || 'Missing email'} ·{' '}
                  {row.invitee.role === 'co_host' ? 'Co-host' : 'Guest'}
                </span>
                {row.error && <span className="small">{row.error}</span>}
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" onClick={() => setPreview(null)}>
              Cancel import
            </button>
            <button
              type="button"
              className="primary"
              disabled={disabled || !valid.length}
              onClick={() => {
                onAdd(valid.map(row => row.invitee));
                setNotice(
                  `${valid.length} invitees added. Save the meeting to send invitations.`,
                );
                setPreview(null);
              }}
            >
              Add {valid.length} invitees
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
