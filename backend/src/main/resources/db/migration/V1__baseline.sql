-- ACCESSFLOW baseline migration (Phase 0).
-- Establishes Flyway history only. Domain tables are added from Phase 1 onward.
-- UUID primary keys will use gen_random_uuid(), built into PostgreSQL 13+.
SELECT 1;
