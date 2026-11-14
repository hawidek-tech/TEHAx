-- ACCESSFLOW core schema.
-- Conventions: random UUID primary keys (non-guessable), timestamptz, JSONB for structured lists,
-- foreign keys with explicit ON DELETE behaviour, indexes on lookup columns.
-- Data minimisation: no disability diagnoses, no full identity-document numbers.

-- ---------------------------------------------------------------- organisations (partners & employers)
CREATE TABLE organizations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             VARCHAR(64)  NOT NULL UNIQUE,
    name             VARCHAR(200) NOT NULL,
    type             VARCHAR(32)  NOT NULL CHECK (type IN ('EMPLOYER', 'LEARNING_PLATFORM', 'NGO', 'GOVERNMENT')),
    description      TEXT,
    website          VARCHAR(300),
    referral_enabled BOOLEAN      NOT NULL DEFAULT FALSE,
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- users & roles
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(254),
    phone               VARCHAR(20),
    password_hash       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(100) NOT NULL,
    preferred_locale    VARCHAR(8)   NOT NULL DEFAULT 'en',
    organization_id     UUID REFERENCES organizations (id) ON DELETE SET NULL,
    enabled             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX users_phone_uq ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE user_roles (
    user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role    VARCHAR(32) NOT NULL CHECK (role IN ('APPLICANT', 'EMPLOYER', 'SUPPORT_STAFF', 'PARTNER_ADMIN', 'PLATFORM_ADMIN')),
    PRIMARY KEY (user_id, role)
);

-- ---------------------------------------------------------------- accessibility preferences
CREATE TABLE accessibility_preferences (
    user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    locale              VARCHAR(8)  NOT NULL DEFAULT 'en',
    text_scale          SMALLINT    NOT NULL DEFAULT 100 CHECK (text_scale BETWEEN 100 AND 200),
    high_contrast       BOOLEAN     NOT NULL DEFAULT FALSE,
    simplified_language BOOLEAN     NOT NULL DEFAULT FALSE,
    captions            BOOLEAN     NOT NULL DEFAULT FALSE,
    keyboard_first      BOOLEAN     NOT NULL DEFAULT FALSE,
    read_aloud          BOOLEAN     NOT NULL DEFAULT FALSE,
    reduced_motion      BOOLEAN     NOT NULL DEFAULT FALSE,
    shared_device       BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- profile
-- education / experience / skills / languages are user-owned lists stored as JSONB.
-- support_preferences: private workplace-support categories, used ONLY for the user's own job filtering.
CREATE TABLE profiles (
    user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    given_name          VARCHAR(100),
    father_name         VARCHAR(100),
    grandfather_name    VARCHAR(100),
    birth_year          SMALLINT CHECK (birth_year BETWEEN 1900 AND 2100),
    region              VARCHAR(64),
    city                VARCHAR(100),
    headline            VARCHAR(200),
    summary             TEXT,
    education           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    experience          JSONB       NOT NULL DEFAULT '[]'::jsonb,
    skills              JSONB       NOT NULL DEFAULT '[]'::jsonb,
    languages           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    support_preferences JSONB       NOT NULL DEFAULT '[]'::jsonb,
    resume_file_id      UUID,
    completed_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- form engine drafts (server-side save & resume)
CREATE TABLE form_drafts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    flow_key           VARCHAR(64) NOT NULL,
    context_key        VARCHAR(64) NOT NULL DEFAULT '',
    definition_version INTEGER     NOT NULL,
    current_step       VARCHAR(64),
    data               JSONB       NOT NULL DEFAULT '{}'::jsonb,
    version            INTEGER     NOT NULL DEFAULT 0,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, flow_key, context_key)
);

-- ---------------------------------------------------------------- stored files (identity documents, CVs)
CREATE TABLE stored_files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose       VARCHAR(32)  NOT NULL CHECK (purpose IN ('IDENTITY_DOCUMENT', 'RESUME')),
    original_name VARCHAR(255) NOT NULL,
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    BIGINT       NOT NULL,
    storage_key   VARCHAR(100) NOT NULL UNIQUE,
    sha256        VARCHAR(64)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX stored_files_owner_idx ON stored_files (owner_id);
ALTER TABLE profiles ADD CONSTRAINT profiles_resume_fk FOREIGN KEY (resume_file_id) REFERENCES stored_files (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------- identity verification (alternative routes)
CREATE TABLE identity_verifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    route            VARCHAR(32) NOT NULL CHECK (route IN ('NATIONAL_ID', 'KEBELE_ID', 'PASSPORT', 'REFUGEE_ID',
                                                           'OTHER_DOCUMENT', 'PARTNER_REFERRAL', 'REFER_ME')),
    document_label   VARCHAR(100),
    document_last4   VARCHAR(4),
    document_file_id UUID REFERENCES stored_files (id) ON DELETE SET NULL,
    partner_org_id   UUID REFERENCES organizations (id) ON DELETE SET NULL,
    referral_code    VARCHAR(64),
    status           VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NEEDS_INFO', 'VERIFIED', 'REJECTED')),
    reviewer_id      UUID REFERENCES users (id) ON DELETE SET NULL,
    reviewer_note    VARCHAR(500),
    reviewed_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX identity_verifications_user_idx ON identity_verifications (user_id);
CREATE INDEX identity_verifications_status_idx ON identity_verifications (status);

-- ---------------------------------------------------------------- private support requests (no medical proof)
CREATE TABLE support_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category          VARCHAR(32)  NOT NULL CHECK (category IN ('REGISTRATION_HELP', 'APPLICATION_HELP', 'INTERVIEW_SUPPORT',
                                                                 'WORKPLACE_ADJUSTMENT', 'TECHNOLOGY', 'OTHER')),
    message           VARCHAR(2000) NOT NULL,
    preferred_contact VARCHAR(16)  NOT NULL CHECK (preferred_contact IN ('EMAIL', 'PHONE', 'SMS', 'IN_APP')),
    status            VARCHAR(16)  NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    staff_response    VARCHAR(2000),
    handled_by        UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX support_requests_user_idx ON support_requests (user_id);
CREATE INDEX support_requests_status_idx ON support_requests (status);

-- ---------------------------------------------------------------- jobs & employer accommodations
CREATE TABLE jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    summary          VARCHAR(500) NOT NULL,
    plain_summary    VARCHAR(1000) NOT NULL,
    description      TEXT         NOT NULL,
    region           VARCHAR(64)  NOT NULL,
    city             VARCHAR(100),
    work_mode        VARCHAR(16)  NOT NULL CHECK (work_mode IN ('ONSITE', 'REMOTE', 'HYBRID')),
    employment_type  VARCHAR(16)  NOT NULL CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP')),
    salary_text      VARCHAR(100),
    deadline         DATE         NOT NULL,
    status           VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    custom_questions JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_deadline_idx ON jobs (status, deadline);
CREATE INDEX jobs_org_idx ON jobs (organization_id);

-- One accommodation statement per job (employer accommodation form).
CREATE TABLE job_accommodations (
    job_id                    UUID PRIMARY KEY REFERENCES jobs (id) ON DELETE CASCADE,
    categories                JSONB NOT NULL DEFAULT '[]'::jsonb,
    workplace_accommodations  TEXT,
    interview_arrangements    TEXT,
    flexible_working          TEXT,
    assistive_technology      TEXT,
    application_accessibility TEXT,
    contact_name              VARCHAR(100),
    contact_email             VARCHAR(254),
    contact_phone             VARCHAR(20)
);

CREATE TABLE saved_jobs (
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    job_id     UUID        NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, job_id)
);

-- ---------------------------------------------------------------- applications
-- shared_snapshot holds ONLY the profile fields the applicant consented to share, frozen at submission.
CREATE TABLE applications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code        VARCHAR(16)  NOT NULL UNIQUE,
    job_id                UUID         NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    user_id               UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status                VARCHAR(16)  NOT NULL CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW', 'OFFERED',
                                                                   'NOT_SELECTED', 'WITHDRAWN')),
    answers               JSONB        NOT NULL,
    shared_snapshot       JSONB        NOT NULL,
    accommodation_note    VARCHAR(2000),
    submitted_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (job_id, user_id)
);
CREATE INDEX applications_user_idx ON applications (user_id);

CREATE TABLE application_status_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID        NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    status         VARCHAR(16) NOT NULL,
    note           VARCHAR(500),
    changed_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX application_status_history_app_idx ON application_status_history (application_id, changed_at);

-- ---------------------------------------------------------------- consent records
CREATE TABLE consent_records (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_org  UUID REFERENCES organizations (id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications (id) ON DELETE CASCADE,
    purpose        VARCHAR(64)  NOT NULL,
    scopes         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    notice_version VARCHAR(16)  NOT NULL,
    granted_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked_at     TIMESTAMPTZ
);
CREATE INDEX consent_records_user_idx ON consent_records (user_id);

-- ---------------------------------------------------------------- approved help content (for assistant and help pages)
CREATE TABLE help_articles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       VARCHAR(64)  NOT NULL,
    locale     VARCHAR(8)   NOT NULL,
    topic      VARCHAR(32)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT         NOT NULL,
    keywords   JSONB        NOT NULL DEFAULT '[]'::jsonb,
    reviewed   BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (slug, locale)
);

-- ---------------------------------------------------------------- notifications
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(32) NOT NULL,
    params      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------- audit trail (security-relevant events, no personal content)
CREATE TABLE audit_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID,
    action      VARCHAR(64) NOT NULL,
    target_type VARCHAR(32),
    target_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_id, created_at DESC);
CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id);

-- ---------------------------------------------------------------- partner integrations (embedding)
-- publishable_key is public and only usable from allowed_origins. Server-to-server secrets are stored hashed.
CREATE TABLE partner_integrations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    publishable_key    VARCHAR(64)  NOT NULL UNIQUE,
    secret_key_hash    VARCHAR(255),
    allowed_origins    JSONB        NOT NULL DEFAULT '[]'::jsonb,
    enabled_components JSONB        NOT NULL DEFAULT '["signup","profile","job-application"]'::jsonb,
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Short-lived bearer tokens for embedded components (no third-party cookies). Only a SHA-256 hash is stored.
CREATE TABLE embed_tokens (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash     VARCHAR(64) NOT NULL UNIQUE,
    user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    integration_id UUID        NOT NULL REFERENCES partner_integrations (id) ON DELETE CASCADE,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX embed_tokens_expiry_idx ON embed_tokens (expires_at);
