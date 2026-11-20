# Plan — Day 1, task 4 · P22-56a · Deploy authenticated “Hello World”

**Status** — Approved for deployment on 2026-11-20. Preserve a conflict-free Laravel handoff. Obtain advance approval for exact network rule changes and unexpected infrastructure changes. The owner separately confirmed Docker installation and its host networking.

## Size

**S** · One temporary web service, with a provisional 60-minute timebox. P22-56a is the first unchecked Day 1 task. P22-04 records the owner's confirmation of Azure VM access and noninteractive sudo. The build will check access from its own environment after authorization. [Roadmap](p22-roadmap.md#day-1--start-the-stack-and-take-delivery-of-the-corpus) · [Task checklist](p22-task-checklist.md#day-1--start-the-stack-and-take-delivery-of-the-corpus)

## Approach

Use the existing Docker Compose workflow to run one version-pinned Caddy container on the Azure Ubuntu VM at `https://arhivar.swedencentral.cloudapp.azure.com/`. A standalone Compose file keeps the existing development stack independent and lets Caddy handle public TLS, HTTP-to-HTTPS redirection, and a site-wide Basic Auth challenge before serving the literal “Hello World” response. Mount one host-provisioned credential hash read-only outside the checkout, validate the credential configuration before publishing the service, and persist Caddy's certificate data across redeployments. The Laravel health route was considered for awareness only. It would start Laravel and PostgreSQL for a static response. [Existing Compose file](../../../compose.yaml) · [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https) · [Caddy Basic Auth](https://caddyserver.com/docs/caddyfile/directives/basic_auth)

After deployment authorization, check SSH and sudo, confirm DNS points to the intended VM, inspect existing web listeners and firewall rules, and verify Docker Engine and Compose. Install Docker and Compose if missing using the official Ubuntu instructions. Enable inbound TCP 80 and 443 on the target if required and authorized, preserving the existing SSH rules. Record which preconditions pass and which require Azure permissions. Prepare the placeholder credential through a private owner-controlled channel. Keep cleartext credentials out of files, command arguments, shell history, and logs. Keep the hash out of the checkout and evidence. [Azure inbound traffic rules](https://learn.microsoft.com/en-us/azure/virtual-network/diagnose-network-traffic-filter-problem) · [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

## Files

| Action | Path | What |
|---|---|---|
| Add | `docker/placeholder/compose.yaml` | Single Caddy service with an explicit image version, public HTTP and HTTPS ports, read-only configuration and credential mounts, and persistent certificate storage. |
| Add | `docker/placeholder/Caddyfile` | Configure the intended hostname, TLS, site-wide Basic Auth, and static response. Require the private credential configuration so missing credentials prevent startup. |
| Add | `docker/placeholder/README.md` | Document prerequisites, private credential setup, configuration validation, deploy and redeploy commands, smoke checks, and rollback. |
| Update | `docs/agents/ARCHITECTURE.md` | Record the verified temporary hosting service and its handoff to P22-56b. |
| Update | `docs/agents/plans/p22-task-checklist.md` | Record approval, verification time, evidence, and blockers. Check off P22-56a after all live acceptance checks pass. |
| Update | `AI_LOG.md` | Record the approved AI-assisted work and observed results. |
| Provision on VM | Private credential configuration outside the checkout | Store only the username and password hash with restricted permissions and mount it read-only. Persist the certificate data in a Docker volume. |

## Tests

| # | Behaviour | Test (file · kind) | Not automated? why |
|---|---|---|---|
| 1 | Configuration is valid and missing credential configuration prevents startup | `docker/placeholder/compose.yaml`, `Caddyfile` · Compose and Caddy validation using disposable synthetic credentials before live changes | Run commands locally and validate the provisioned configuration before exposing the site. |
| 2 | Public hostname has browser-trusted HTTPS and plain HTTP redirects to HTTPS | Live URL · credential-free HTTP/TLS smoke from outside the VM | Verify with normal certificate validation and confirm the redirect target. |
| 3 | The hosting gate challenges anonymous and invalid credentials and accepts the valid credential | Live URL · HTTP smoke and browser confirmation | Assert HTTP 401 with a Basic challenge when credentials are missing or invalid, including a second URL path to confirm the gate covers the site. In a fresh browser session verify the challenge, then HTTP 200 and the exact response after successful authentication. Use private credential input. |
| 4 | A repeat deployment preserves HTTPS and the authentication gate | Live Compose service · redeploy smoke | Run the same documented deployment a second time, confirm the certificate volume is retained, and repeat the live HTTP/TLS and authentication checks. |
| 5 | Local repository baseline still passes | `backend/phpunit.xml`, root `compose.yaml`, `docs/agents/tools/ledger-lint.py` · regression | Run the existing backend image build, PHPUnit and Ledger lint. Frontend build and Playwright visual comparisons are pending the P22-03 scaffold. The placeholder has no DS Screen or mock. |

## Sequencing

One builder. Obtain plan approval and explicit authorization for live deployment. Validate the configuration and failure cases locally, preflight the VM, provision the credential and deploy, then verify and redeploy. Record evidence after verification. The owner confirms the authorized browser experience if browser access or the credential is available only to the owner.

## Risks

- If access, DNS, inbound rules, or certificate issuance blocks the task, record the exact failure and use the Day 2 retry in the roadmap. Keep the HTTPS and authentication acceptance checks pending.
- If an existing service owns either web port, preserve that service and report the conflict for an owner decision. On a failed initial deployment, stop the placeholder service and keep its certificate volume for retry. Revert only inbound rules added for this task if those changes were authorized and are no longer needed. For a failed redeploy, restore the last working placeholder configuration.

## Out of scope

The live Application skeleton, Laravel authentication, Document Corpus, Share Links, Screen design, and release promotion. P22-56b handles the skeleton, and P22-56c handles removal of the temporary hosting gate during release.

## Knowledge used

Two previously confirmed decisions apply unchanged. **D-001** requires Docker for server services and governs the hosting container. **D-003** requires PHPUnit and governs the backend regression check. The plan relies on the roadmap's P22-56a acceptance criteria and P22-04's confirmed hosting record. No approved pattern, contract, or open Ledger question governs the placeholder. [Decisions](../DECISIONS.md) · [Hosting record](p22-task-checklist.md#day-1--start-the-stack-and-take-delivery-of-the-corpus)

### Considered, not applied

- **D-017, D-018, D-032, D-006** govern Application authentication, Romanian UI and errors, the Screen inventory, and frontend visual verification. P22-56a serves the roadmap's literal hosting probe before the Application is deployed.
- **PATTERN-001** is a candidate for PostgreSQL migration isolation. The existing tests use the current setup and this task adds no migration tests.

### Assumptions

- Caddy with Basic Auth is the proposed implementation for this temporary service. Approve or adjust this choice with the plan.
- The VM's effective inbound rules, port availability, and publicly trusted certificate issuance remain to be verified during the authorized build. Any conflict that changes the deployment plan comes back to the owner.

## Approval

Approve, adjust, or drop this plan. Flag any relied-on decision that is wrong or outdated. Live execution also needs explicit authorization for the deployment and any required changes to Azure inbound rules.
