# 0002: Modular monolith backend

**Decision.** A single Spring Boot application divided into feature packages under `org.accessflow`:
`auth, user, forms, onboarding, identity, profile, resume, consent, jobs, applications, support,
preferences, partner, notifications, audit, common`. Each package owns its controller, service,
repository, DTOs and migrations. Packages call each other only through service interfaces; no package
reads another package's repository directly.

**Why.** It's simpler to run, test and deploy than microservices, which suits a hackathon team and
low-cost hosting, and it keeps clear boundaries for maintenance.
