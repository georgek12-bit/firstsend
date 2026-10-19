# Firstsend mail infrastructure (proof of concept)

Copies Lunatro's model: inboxes live on our own mail server (logins, replies), and every outbound
email is relayed through Azure Communication Services (ACS) Email so it leaves from Microsoft's IPs.

```
Instantly --SMTP 587/465, IMAP 993--> Stalwart on Hetzner (mx.firstsend.site)
                                          | outbound: relay route "acs"
                                          v
                              smtp.azurecomm.net:587 (ACS) --> recipient
Replies --MX--> mx.firstsend.site --> IMAP --> Instantly
```

## Azure (subscription "Azure subscription 1", tenant "Default Directory")
- Resource group `firstsend` (West Europe).
- Email Communication Service `firstsend-email` (data location Europe). Custom sending domains get added here.
- Communication Service `firstsend-comms` (data location Europe). Domains must be connected to it before sending.
- Entra app `firstsend-smtp-relay` (app id `1ee7ef25-f7e0-48b8-9d1b-f49fa0661255`) with role
  "Communication and Email Service Owner" on `firstsend-comms`. Client secret expires after 2 years.
- ACS SMTP username resource `relay` with username `firstsend-relay` (password = the app's client secret).
- Default ACS limits: 30/min, 100/hour per subscription. Raise via a support request
  ("Azure Communication Services Email: Sending Limits") before taking real customers.
  The portal's "+ Add" for MailFrom addresses is disabled until then; add senders with the CLI.

## Hetzner (project `firstsend`)
- Server `firstsend-mx1`, type cpx02 (1 vCPU, 1 GB RAM + 1 GB swap), Falkenstein, Ubuntu 24.04.
  IPv4 `2.28.132.32`, IPv6 `2a01:4f8:c17:e90c::1`. Reverse DNS for both: `mx.firstsend.site`.
- Firewall `firstsend-mail`: inbound 22, 25, 80, 443, 465, 587, 993 and ping. 8080 (Stalwart recovery) stays closed.
- No outbound port 25 needed: all mail leaves through ACS on 587.

## Stalwart 0.16 on the server
- Installed with the official script; config in the database, `config.json` only holds the data store.
- Managed with `stalwart-cli` (installed on the server; `. /root/.stalwart-cli.env` then `stalwart-cli -k ...`).
- Admin account `admin@firstsend.site`. Web admin: https://mx.firstsend.site/admin
- Listeners: 25 (inbound), 465 (implicit TLS), 587 (STARTTLS, added), 993 (IMAP), 443 (admin/HTTP).
- TLS: Let's Encrypt via ACME (TLS-ALPN-01). The certificate for the default domain also covers
  autoconfig, autodiscover, mta-sts and ua-auto-config.firstsend.site, so those CNAME to mx.firstsend.site.
- Outbound routing: `MtaOutboundStrategy.route` = local domains -> `local`, everything else -> `acs`.
- Received / Return-Path / Message-Id headers are only added on port 25, so submissions from
  Instantly don't carry our server or client IPs. Check what ACS itself adds in the test.

## DNS (Cloudflare, firstsend.site zone)
- `mx` A/AAAA -> the server; `autoconfig`, `autodiscover`, `mta-sts`, `ua-auto-config` CNAME -> `mx`.

## Credentials (local only, never commit)
- `~/.config/bookd/azure-acs.env`: tenant id, app id, client secret, SMTP username.
- `~/.config/bookd/hetzner.env`: Hetzner API token.
- `~/.config/bookd/stalwart.env`: Stalwart admin login.
- `~/.ssh/firstsend_hetzner`: SSH key for root on the server.

## Per test domain (to do once it's bought)
1. Add it to `firstsend-email` as a custom domain; put the TXT verification, SPF
   (`include:spf.protection.outlook.com -all`) and the two DKIM CNAMEs in Cloudflare; verify; connect to `firstsend-comms`.
2. Add each sender address (MailFrom) on ACS with the CLI.
3. MX -> `mx.firstsend.site`; DMARC `p=reject`.
4. In Stalwart: add the domain and one account per sender address (same addresses as ACS), with passwords.
5. Connect to Instantly with custom IMAP/SMTP, test send, reply detection, warmup; seed tests vs Lunatro.
