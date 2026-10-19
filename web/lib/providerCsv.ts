// Reads the inbox file from the mailbox provider (Instantly bulk import layout) into rows
// for admin_import_inboxes. Works with or without a header row, comma or tab separated.

export type LoginRow = {
  email: string;
  first_name: string;
  last_name: string;
  imap_username: string;
  imap_password: string;
  imap_host: string;
  imap_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_host: string;
  smtp_port: number;
};

// Column order when the file has no header row.
const ORDER: (keyof LoginRow)[] = [
  'email', 'first_name', 'last_name',
  'imap_username', 'imap_password', 'imap_host', 'imap_port',
  'smtp_username', 'smtp_password', 'smtp_host', 'smtp_port',
];

const key = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '');
const ALIASES: Record<string, keyof LoginRow> = {
  email: 'email', emailaddress: 'email', fromemail: 'email',
  firstname: 'first_name', lastname: 'last_name',
  imapusername: 'imap_username', imapuser: 'imap_username', imappassword: 'imap_password', imaphost: 'imap_host', imapport: 'imap_port',
  smtpusername: 'smtp_username', smtpuser: 'smtp_username', smtppassword: 'smtp_password', smtphost: 'smtp_host', smtpport: 'smtp_port',
  username: 'imap_username', password: 'imap_password',
};

function parse(text: string): string[][] {
  const sep = text.split('\n', 1)[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  row.push(cell), rows.push(row);
  return rows.map(r => r.map(x => x.trim())).filter(r => r.some(Boolean));
}

/** Returns the rows, or throws with a message saying which line is wrong. */
export function readProviderFile(text: string): LoginRow[] {
  const rows = parse(text);
  if (!rows.length) throw new Error('The file is empty.');
  const hasHeader = !rows[0][0].includes('@');
  const cols: (keyof LoginRow | undefined)[] = hasHeader ? rows[0].map(h => ALIASES[key(h)]) : ORDER;
  const body = hasHeader ? rows.slice(1) : rows;

  return body.map((r, n) => {
    const line = n + (hasHeader ? 2 : 1);
    const v: Partial<Record<keyof LoginRow, string>> = {};
    cols.forEach((c, i) => c && !v[c] && (v[c] = r[i] ?? ''));
    const email = (v.email ?? '').toLowerCase();
    if (!email.includes('@')) throw new Error(`Line ${line}: no email address.`);
    const imapPort = Number(v.imap_port || 993), smtpPort = Number(v.smtp_port || 587);
    const out: LoginRow = {
      email,
      first_name: v.first_name ?? '',
      last_name: v.last_name ?? '',
      imap_username: v.imap_username || email,
      imap_password: v.imap_password || v.smtp_password || '',
      imap_host: v.imap_host ?? '',
      imap_port: imapPort,
      smtp_username: v.smtp_username || v.imap_username || email,
      smtp_password: v.smtp_password || v.imap_password || '',
      smtp_host: v.smtp_host || v.imap_host || '',
      smtp_port: smtpPort,
    };
    if (!out.imap_password) throw new Error(`Line ${line} (${email}): no password.`);
    if (!out.imap_host || !out.smtp_host) throw new Error(`Line ${line} (${email}): no IMAP or SMTP host.`);
    if (!Number.isInteger(imapPort) || !Number.isInteger(smtpPort)) throw new Error(`Line ${line} (${email}): port isn't a number.`);
    return out;
  });
}
