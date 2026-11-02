#!/usr/bin/env python3
"""
Set up one sending domain end to end, Lunatro style:
  Azure Communication Services sends, our Stalwart server holds the inboxes.

  python3 infra/provision_domain.py getacme.com --person "Sacha Maccow" --count 5

Steps (each is safe to re-run):
  1. Add the domain to the ACS email service (customer managed) and read its DNS records.
  2. Write them to the domain's Cloudflare zone, plus MX -> mx.firstsend.site and DMARC p=reject.
  3. Ask ACS to verify Domain, SPF, DKIM and DKIM2, and wait until all are verified.
  4. Link the domain to the communication service that the SMTP relay uses.
  5. Create one ACS sender username per inbox.
  6. Create the domain and one account per inbox on Stalwart (same addresses).
  7. Write an Instantly bulk-import CSV with the logins to ~/.config/bookd/inboxes/<domain>.csv.

Needs: the domain bought in Cloudflare (bookd account), `az login` done, and the env files in
~/.config/bookd (cloudflare.env, azure-acs.env) plus the SSH key ~/.ssh/firstsend_hetzner.
Passwords are never printed.
"""
import argparse
import csv
import json
import os
import re
import secrets
import ssl
import string
import subprocess
import sys
import time
import urllib.error
import urllib.request

AZ = os.path.expanduser('~/.azure-cli/bin/az')
RG = 'firstsend'
EMAIL_SERVICE = 'firstsend-email'
COMMS = 'firstsend-comms'
MX_HOST = 'mx.firstsend.site'
SERVER = 'root@2.28.132.32'
SSH_KEY = os.path.expanduser('~/.ssh/firstsend_hetzner')
OUT_DIR = os.path.expanduser('~/.config/bookd/inboxes')
# This Mac's python.org build has no CA bundle of its own; use the system one.
SSL = ssl.create_default_context(cafile='/etc/ssl/cert.pem' if os.path.exists('/etc/ssl/cert.pem') else None)
DAILY_LIMIT = 20  # Keep in sync with SENDS_PER_INBOX in web/lib/plans.ts.


def env(name):
    path = os.path.expanduser(f'~/.config/bookd/{name}.env')
    return dict(l.strip().split('=', 1) for l in open(path) if '=' in l and not l.startswith('#'))


def say(msg):
    print(f'• {msg}', flush=True)


# ---------- Azure ----------

def az(*args, parse=True, check=True):
    r = subprocess.run([AZ, *args, '--only-show-errors', '-o', 'json'], capture_output=True, text=True)
    if check and r.returncode != 0:
        sys.exit(f'az {" ".join(args[:4])} failed:\n{r.stderr.strip()}')
    if not parse:
        return r
    return json.loads(r.stdout) if r.stdout.strip() else None


def acs_domain(domain):
    r = az('communication', 'email', 'domain', 'show', '-g', RG, '--email-service-name', EMAIL_SERVICE,
           '--domain-name', domain, check=False, parse=False)
    if r.returncode == 0:
        return json.loads(r.stdout)
    say(f'Adding {domain} to Azure email service')
    return az('communication', 'email', 'domain', 'create', '-g', RG, '--email-service-name', EMAIL_SERVICE,
              '--domain-name', domain, '--location', 'global', '--domain-management', 'CustomerManaged',
              '--user-engmnt-tracking', 'Disabled')


def acs_records(d):
    """ACS verification records as Cloudflare record dicts."""
    recs = []
    for kind, r in (d.get('verificationRecords') or {}).items():
        if not r:
            continue
        name = r['name'].rstrip('.')
        recs.append({'kind': kind, 'type': r['type'].upper(), 'name': name, 'content': r['value']})
    return recs


def acs_verify(domain):
    kinds = ['Domain', 'SPF', 'DKIM', 'DKIM2']
    started = set()
    for attempt in range(60):
        d = az('communication', 'email', 'domain', 'show', '-g', RG, '--email-service-name', EMAIL_SERVICE,
               '--domain-name', domain)
        states = {k: (d.get('verificationStates') or {}).get(k, {}).get('status') for k in kinds}
        if all(s == 'Verified' for s in states.values()):
            say('Azure verified Domain, SPF, DKIM and DKIM2')
            return
        for k, s in states.items():
            if s in (None, 'NotStarted', 'VerificationFailed') and (k not in started or s == 'VerificationFailed'):
                az('communication', 'email', 'domain', 'initiate-verification', '-g', RG,
                   '--email-service-name', EMAIL_SERVICE, '--domain-name', domain, '--verification-type', k,
                   '--no-wait', parse=False, check=False)
                started.add(k)
        if attempt % 4 == 0:
            say('Waiting for Azure verification: ' + ', '.join(f'{k} {s}' for k, s in states.items()))
        time.sleep(20)
    sys.exit('Azure did not verify the domain within 20 minutes. Re-run later; DNS may still be propagating.')


def acs_link(domain_id):
    comms = az('communication', 'show', '-n', COMMS, '-g', RG)
    linked = comms.get('linkedDomains') or []
    if any(l.lower() == domain_id.lower() for l in linked):
        return
    say('Connecting the domain to the sending service')
    az('communication', 'update', '-n', COMMS, '-g', RG, '--linked-domains', json.dumps(linked + [domain_id]))


def acs_sender(domain, local, display):
    r = az('communication', 'email', 'domain', 'sender-username', 'show', '-g', RG,
           '--email-service-name', EMAIL_SERVICE, '--domain-name', domain, '-n', local, check=False, parse=False)
    if r.returncode == 0:
        return
    az('communication', 'email', 'domain', 'sender-username', 'create', '-g', RG,
       '--email-service-name', EMAIL_SERVICE, '--domain-name', domain, '-n', local,
       '--username', local, '--display-name', display)


# ---------- Cloudflare ----------

class Cloudflare:
    def __init__(self):
        e = env('cloudflare')
        self.tokens = [t for t in (e.get('CLOUDFLARE_ZONE_TOKEN'), e.get('CLOUDFLARE_API_TOKEN')) if t]

    def call(self, method, path, body=None, token=None):
        req = urllib.request.Request(f'https://api.cloudflare.com/client/v4{path}', method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=30, context=SSL) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            return json.load(e)

    def zone(self, domain):
        for t in self.tokens:
            d = self.call('GET', f'/zones?name={domain}', token=t)
            if d.get('success') and d['result']:
                # Use whichever token can also write DNS on this zone.
                probe = self.call('GET', f"/zones/{d['result'][0]['id']}/dns_records?per_page=1", token=t)
                if probe.get('success'):
                    self.token = t
                    return d['result'][0]['id']
        sys.exit(f'{domain} is not in the bookd Cloudflare account, or no saved token can edit its DNS.')

    def upsert(self, zone, rtype, name, content, priority=None, replace_prefix=None):
        """Create a record unless an identical one exists. replace_prefix removes same-name TXT records
        starting with that text (e.g. an old SPF) so there is only one."""
        existing = self.call('GET', f'/zones/{zone}/dns_records?type={rtype}&name={name}&per_page=100',
                             token=self.token)['result']
        norm = lambda c: c.strip('"').rstrip('.').lower()
        if any(norm(r['content']) == norm(content) for r in existing):
            return False
        for r in existing:
            if rtype == 'CNAME' or rtype == 'MX' or (replace_prefix and norm(r['content']).startswith(replace_prefix)):
                self.call('DELETE', f"/zones/{zone}/dns_records/{r['id']}", token=self.token)
        body = {'type': rtype, 'name': name, 'content': content, 'ttl': 300, 'proxied': False}
        if priority is not None:
            body['priority'] = priority
        d = self.call('POST', f'/zones/{zone}/dns_records', body, token=self.token)
        if not d.get('success'):
            sys.exit(f'Cloudflare refused {rtype} {name}: {d.get("errors")}')
        return True


# ---------- Stalwart ----------

def stalwart_apply(lines):
    plan = '\n'.join(json.dumps(l) for l in lines) + '\n'
    r = subprocess.run(['ssh', '-i', SSH_KEY, '-o', 'BatchMode=yes', SERVER,
                        '. /root/.stalwart-cli.env; stalwart-cli -k apply --stdin --continue-on-error'],
                       input=plan, capture_output=True, text=True)
    out = '\n'.join(l for l in (r.stdout + r.stderr).splitlines() if 'secret' not in l.lower())
    if r.returncode != 0:
        sys.exit(f'Stalwart apply failed:\n{out}')
    return out


# ---------- Inbox names ----------

def local_parts(person, count):
    first, *rest = person.lower().split()
    last = rest[-1] if rest else ''
    f, l = re.sub(r'[^a-z]', '', first), re.sub(r'[^a-z]', '', last)
    forms = [f, f'{f}.{l}', f'{f}{l}', f'{f[0]}.{l}', f'{f}{l[:1]}', f'{f[0]}{l}', f'{l}.{f}', f'{f}_{l}',
             f'{f}-{l}', f'{f}.{l[:1]}', f'{l}{f[0]}', f'{f[0]}-{l}'] if l else [f, f'{f}1', f'{f}.hq', f'hello.{f}']
    out = []
    for x in forms:
        x = x.strip('.-_')
        if x and x not in out:
            out.append(x)
    if count > len(out):
        sys.exit(f'Only {len(out)} address styles for {person}; add more people or lower --count.')
    return out[:count]


def password():
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(24))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('domain')
    ap.add_argument('--person', required=True, help='Sender name, e.g. "Sacha Maccow"')
    ap.add_argument('--count', type=int, default=5, help='Inboxes to create (default 5)')
    a = ap.parse_args()
    domain = a.domain.lower().strip()
    first, *rest = a.person.split()
    last = ' '.join(rest)

    # 1-2. ACS domain + DNS
    d = acs_domain(domain)
    cf = Cloudflare()
    zone = cf.zone(domain)
    changed = 0
    for r in acs_records(d):
        prefix = 'v=spf1' if r['kind'] == 'SPF' else None
        changed += cf.upsert(zone, r['type'], r['name'], r['content'], replace_prefix=prefix)
    changed += cf.upsert(zone, 'MX', domain, MX_HOST, priority=10)
    changed += cf.upsert(zone, 'TXT', f'_dmarc.{domain}', 'v=DMARC1; p=reject; pct=100; adkim=r; aspf=r',
                         replace_prefix='v=dmarc1')
    say(f'DNS ready in Cloudflare ({changed} record{"s" if changed != 1 else ""} added or changed)')

    # 3-4. Verify and link
    acs_verify(domain)
    acs_link(d['id'])

    # 5. Senders on ACS
    locals_ = local_parts(a.person, a.count)
    for lp in locals_:
        acs_sender(domain, lp, a.person)
    say(f'{len(locals_)} sender addresses on Azure')

    # 6. Domain + accounts on Stalwart (new passwords each run only for accounts being created)
    out_path = os.path.join(OUT_DIR, f'{domain}.csv')
    known = {}
    if os.path.exists(out_path):
        with open(out_path) as f:
            known = {row['Email']: row['IMAP Password'] for row in csv.DictReader(f)}
    creds = {f'{lp}@{domain}': known.get(f'{lp}@{domain}') or password() for lp in locals_}
    plan = [{'@type': 'upsert', 'object': 'Domain', 'matchOn': ['name'],
             'value': {'dom': {'name': domain, 'certificateManagement': {'@type': 'Manual'},
                                       # ACS signs DKIM; a second Stalwart signature would fail DNS checks.
                                       'dkimManagement': {'@type': 'Manual'}}}}]
    accounts = {}
    for i, lp in enumerate(locals_):
        accounts[f'acc{i}'] = {'@type': 'User', 'name': lp, 'domainId': '#dom',
                               'description': a.person,
                               'credentials': {'0': {'@type': 'Password', 'secret': creds[f'{lp}@{domain}']}}}
    plan.append({'@type': 'upsert', 'object': 'Account', 'matchOn': ['name', 'domainId'], 'value': accounts})
    stalwart_apply(plan)
    say(f'{len(locals_)} inboxes on {MX_HOST}')

    # 7. Instantly CSV
    os.makedirs(OUT_DIR, mode=0o700, exist_ok=True)
    header = ['Email', 'First Name', 'Last Name', 'IMAP Username', 'IMAP Password', 'IMAP Host', 'IMAP Port',
              'SMTP Username', 'SMTP Password', 'SMTP Host', 'SMTP Port', 'Daily Limit', 'Warmup Enabled',
              'Warmup Limit', 'Warmup Increment']
    fd = os.open(out_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(header)
        for addr, pw in creds.items():
            w.writerow([addr, first, last, addr, pw, MX_HOST, 993, addr, pw, MX_HOST, 587, DAILY_LIMIT, 'TRUE', 10, 1])
    say(f'Instantly CSV with logins: {out_path}')
    print('\nInboxes:\n  ' + '\n  '.join(creds))


if __name__ == '__main__':
    main()
