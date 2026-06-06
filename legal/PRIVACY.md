# Privacy Policy

> ⚠️ **TEMPLATE — not legal advice.** Review with qualified counsel before use. Replace bracketed
> placeholders and confirm the sub-processor list matches your real stack.

**Last updated:** [DATE] · **Controller for account data:** [LEGAL ENTITY], [address], [ICO reg no.].
Contact: [privacy email].

## What we collect
- **Account & billing data:** name, email, company, and payment details. Payment details are handled
  by **Stripe**; we do not store card numbers.
- **Cassettes:** the LLM/agent request and response content you record. **This may contain personal
  data** depending on what your application sends to the model. For Cassettes you are the data
  controller and we are your processor — see the `DPA.md`.
- **Usage telemetry:** logs, error events, and aggregate product metrics to operate and improve the
  Service.

## How we use it
To provide and secure the Service, process payments, detect behaviour drift, provide support, and
comply with law. We do **not** sell your data. We do **not** use your Cassettes to train any
cross-customer model unless you explicitly opt in (a future feature requiring separate consent).

## Sub-processors
We use: **Cloudflare** (hosting, storage, compute), **Stripe** (payments), **GitHub** (the PR check
integration), and [transactional email provider]. A current list is maintained at [URL].

## Data location & retention
Hosted in **Cloudflare** infrastructure ([region, e.g. EU/Western Europe]). We retain Cassettes for
as long as your subscription is active and for [30] days after termination, then delete them.
Account/billing records are kept as required by law.

## Security
Encryption in transit; secrets stored in managed secret stores; signed webhooks; least-privilege
access; an append-only audit log of registry actions.

## Your rights (UK/EU GDPR)
You may request access, correction, deletion, restriction, portability, or object to processing.
Contact [privacy email]. You may complain to the UK ICO (or your local authority). For Cassette
personal data, exercise rights via your organisation (the controller).

## International transfers
Where data leaves the UK/EEA, we rely on appropriate safeguards (e.g. UK IDTA / EU SCCs).

## Changes
We'll post updates here and, for material changes, notify you.
