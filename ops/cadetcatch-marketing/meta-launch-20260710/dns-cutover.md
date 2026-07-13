# EB28 mail DNS cutover — prepared, not applied

**Prepared:** 2026-07-10 17:41 EDT
**Authoritative nameservers:** `dns1.registrar-servers.com`, `dns2.registrar-servers.com`
**Safety state:** BLOCKED until the Namecheap Domain tab forwarding inventory is captured. In particular, the live `social@eb28.co` route must be preserved before any MX replacement.

## Current authoritative state

```text
MX 10 eforward1.registrar-servers.com.
MX 10 eforward2.registrar-servers.com.
MX 10 eforward3.registrar-servers.com.
MX 15 eforward4.registrar-servers.com.
MX 20 eforward5.registrar-servers.com.
TXT @ "v=spf1 include:spf.efwd.registrar-servers.com ~all"
TXT default._domainkey (absent)
TXT _dmarc (absent)
A mail (absent)
A webmail (absent)
```

## Staged replacement records

Apply as one controlled change only after the forwarding inventory is preserved:

```text
MX  @        5   mx1-hosting.jellyfish.systems.
MX  @        10  mx2-hosting.jellyfish.systems.
MX  @        20  mx3-hosting.jellyfish.systems.
A   mail         162.213.253.62
A   webmail      162.213.253.62
TXT @            "v=spf1 +ip4:162.213.253.62 +include:spf.web-hosting.com +include:spf.efwd.registrar-servers.com ~all"
TXT _dmarc       "v=DMARC1; p=none; rua=mailto:dmarc@eb28.co"
TXT default._domainkey "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzNNv9/KpIviu9Y+zLVPaheztersXNzcN86rn5XZHRu0s3rXumm+7QxnodGzLwi6Q85p49yKZRHcHSkmMxksX2yBclEf2Ad4qRRWX+as0Wht5jSrFkFZCkLOvIVBdOouZrGrLTyDrpnY0EDpVZR9mw7RjMrUFMgYHJ2QF63I8O3p3FauR1biyMBpPol3aotD5XiYew+RC9zUTs1FduJ5GQH41DQJFd9kHUOSy2XNWyvf8N9sHPps35/YdzCh0XC/QbqTlc+fTZpsi1sJjBD5n0j8dYzwWYZSTRgyblVnqw5WSTq7nrChsSuu+Gp5eaLAvm5fZfwVu5IMxWjRadvszqwIDAQAB;"
```

The forwarding SPF include remains during migration. Remove it only after the forwarding service is no longer used and mail headers prove the cPanel route is stable.

## Post-change proof required

1. Authoritative lookups show the new MX, A, SPF, DKIM, and DMARC values.
2. Inbound messages reach `richard`, `meta`, `facebook`, `cadetcatch`, `social`, and `dmarc`.
3. An outbound message to Gmail shows SPF and DKIM pass.
4. A non-production FormSubmit delivery check proves `social@eb28.co` continuity without creating a fake lead.
