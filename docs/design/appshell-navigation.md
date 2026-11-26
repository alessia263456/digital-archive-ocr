# AppShell navigation mapping

DS-013 is a shared authenticated shell component mock. This mapping presents the approved role access from D-042; it is not an authorization boundary.

## Permanent navigation

| Order | Label | Destination | admin | arhivar | cititor | Notes |
|---:|---|---|---|---|---|---|
| 1 | Căutare în arhivă | DS-001 | Yes | Yes | Yes | Default authenticated screen |
| 2 | Încărcare documente | DS-003 | Yes | Yes | — | |
| 3 | Cozi de lucru | DS-004 | Yes | Yes | — | Review and quarantine |
| 4 | Retenție și casare | DS-005 | Manage | View and filter | — | Arhivar cannot mutate retention or destruction |
| 5 | Statistici | DS-007 | Yes | Yes | — | |
| 6 | Jurnal de audit | DS-008 | Yes | Yes | — | Includes active Share Link management |
| 7 | Nomenclator arhivistic | DS-012 | Yes | Yes | — | |
| Bottom | Administrare | DS-006 | Yes | — | — | Admin only |

## Contextual destinations

| Screen | Opened from | Roles |
|---|---|---|
| DS-002 · Vizualizator document | Archive results and recent documents | admin, arhivar, cititor (role-specific document access remains governed by D-042) |
| DS-011 · Editor document & Anonimizare | Review workflow | admin, arhivar |

DS-002 and DS-011 keep the authenticated shell, but are not permanent navigation entries.

## Shell exceptions

| Screen | Shell | Access |
|---|---|---|
| DS-009 · Vizualizator link public | Omitted | Unauthenticated visitor with valid signed URL |
| DS-010 · Autentificare | Omitted | Unauthenticated visitor |

The header notification control is shown in the mock as an in-app notification affordance (D-019). Notification behavior is outside this mock.
