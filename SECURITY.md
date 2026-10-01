# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately — not as a public GitHub issue.

**Preferred: [GitHub Security Advisories](https://github.com/aeon022/orbiter/security/advisories/new)**
("Security" tab → "Report a vulnerability"). This opens a private draft advisory visible
only to the maintainer, with a built-in comment thread for coordination and a CVE request
once we agree on fixed versions.

If you'd rather use email, that's fine too — mention "Orbiter security" in the subject.

Include, if you have them:
- Affected package(s) and version(s) (`@a83/orbiter-admin`, `@a83/orbiter-core`, etc.)
- Steps to reproduce, ideally against a local/throwaway pod rather than a live site
- Impact — what an attacker can actually do with it

## What's in scope

The packages in this monorepo (`packages/*`) and the admin server, CLI, MCP server, and
Astro integration they ship. Third-party dependency vulnerabilities with no demonstrated
impact on Orbiter's own code are lower priority — `npm audit` findings in build-only
tooling (Electron packaging, Wrangler, Vite/esbuild inside Astro) are tracked but not
urgent unless you can show they're reachable at runtime.

## Response

We aim to acknowledge within a few days and keep you posted on a fix timeline. We'll ask
to keep the report private until a patched version is released, then coordinate publishing
the advisory (and requesting a CVE, if applicable) together — crediting you by name/handle
unless you'd rather stay anonymous.

## Supported versions

Only the latest published version of each package is supported. Run `npm outdated` or
check `npm view <package> version` against your installed version; there's no LTS branch.
