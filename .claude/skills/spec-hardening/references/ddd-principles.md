# Recurring DDD Principles

Apply throughout hardening, not just in a single pass.

## Linguistic Discovery

DDD is a language game. For every concept:
1. Describe what it DOES for the adopter in plain verbs and nouns
2. Test the name: "A DelegationEscrowRepo produces... anchors?" If name doesn't match output, name is wrong.
3. Try 2-3 framings before committing
4. The right name reveals something about the domain

**Red flags:**
- Using KERI/keripy term verbatim (anchor, seal, Kevery, Baser)
- Name describes a mechanism, not a job
- Can't explain the name to someone who's never seen KERI

## Service over Repository

Rich behavior (validation, coordination, invariant enforcement) = **Service**, not Repository. Repositories are storage. Services are behavior.

**Pattern: Service wraps Repository.**
- Service IS the guard (validates, enforces, routes)
- Repository IS the storage (append-only log + escrow queues)
- Adopter interacts with Services, not Repositories

```
IdentityService.commit(event)       -> KelRepository
StatusService.authorize(change)     -> TelRepository
DelegationService.approve(request)  -> uses IdentityService
VerificationService.verify(cred)    -> uses StatusService + IdentityService
```

## CQRS Read Models

Performance cache derived from primary data:
- Cache is a **read model** (query-only projection)
- Service updates it internally as side effect of commands
- Consumers only read from it
- Always reconstructible from primary source

## Adopter-Centric Vocabulary

| Protocol jargon | Adopter verb |
|---|---|
| anchor / seal (as verbs) | **commit** (to identity history) |
| delegator anchors seal | delegator **approves** the delegation |
| KEL anchor for TEL | issuer **authorizes** the credential operation |
| anchor chain | **authorization chain** |
| validate-tel-event | **verify** |

## Externals as Tier:External Domains

Infrastructure concerns (persistence, transport, crypto) are proper domain directories with `tier: "external"` -- not just string URIs. They have `domain.yaml`, `ports.yaml`, and `ubiquitous-language.yaml` with formal interfaces.
