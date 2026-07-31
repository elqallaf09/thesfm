# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability, leaked credential,
authorization bypass, or exposure of financial or personal data.

Use this repository's **Security** tab and select **Report a vulnerability** to
open a private security advisory with the maintainer. Include:

- the affected route, component, or commit;
- reproduction steps and the required account role;
- observed and expected behavior;
- impact and any evidence, with secrets and personal data redacted;
- a suggested mitigation, if available.

If private vulnerability reporting is unavailable, contact the repository
owner privately through their verified GitHub profile. Do not send live access
tokens or service-role keys; revoke exposed credentials immediately and share
only redacted identifiers.

## Supported version

Security fixes target the current production branch (`main`). Older commits,
preview deployments, and local copies are not maintained release lines.

## Response and disclosure

The maintainer should acknowledge the report, validate severity, rotate any
exposed credentials, prepare a private fix, and coordinate disclosure after a
patched production release. No response-time guarantee is implied until a
formal security contact and incident on-call rotation are published.
