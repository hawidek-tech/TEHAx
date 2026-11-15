-- V4: audio-guide preference; local demo host origins for the one-script <db-signup> module.
ALTER TABLE accessibility_preferences ADD COLUMN audio_guide BOOLEAN NOT NULL DEFAULT FALSE;

-- Local demonstration hosts (Savanna starter copy on :5510, blank page on :5520). Origins only; no secrets.
INSERT INTO organizations (id, slug, name, type, description, website, referral_enabled) VALUES
 ('0a000000-0000-4000-8000-000000000007', 'savanna-local-demo', 'Savanna static pages (local demo copy)', 'LEARNING_PLATFORM',
  'Local copy of the official Savanna static starter pages used to demonstrate the one-script integration. Not a live ALX system.', NULL, FALSE),
 ('0a000000-0000-4000-8000-000000000008', 'blank-demo', 'Blank page demo', 'LEARNING_PLATFORM',
  'A plain HTML page with no frameworks, used to demonstrate the one-script integration.', NULL, FALSE);

INSERT INTO partner_integrations (id, organization_id, publishable_key, allowed_origins) VALUES
 ('0b000000-0000-4000-8000-000000000002', '0a000000-0000-4000-8000-000000000007', 'pk_savanna_local_demo',
  '["http://localhost:5510", "http://127.0.0.1:5510"]'),
 ('0b000000-0000-4000-8000-000000000003', '0a000000-0000-4000-8000-000000000008', 'pk_blank_demo',
  '["http://localhost:5520", "http://127.0.0.1:5520"]');
