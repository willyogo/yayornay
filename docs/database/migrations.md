# Database Migrations

## Overview

Database migrations are managed through Supabase and stored in the supabase/migrations directory.

## Migration Files

### 20251121042518_create_proposals_and_votes_tables.sql

This migration was created on November 21, 2025 and serves as the initial schema creation. It creates the proposals table, creates the votes table, creates indexes for performance, enables Row Level Security, and creates RLS policies. The file is located at supabase/migrations/20251121042518_create_proposals_and_votes_tables.sql.

## Running Migrations

Migrations can be run using the Supabase CLI with the command `supabase db push`. Alternatively, migrations can be executed manually through the Supabase Dashboard SQL Editor by copying and executing the migration SQL.

## Creating New Migrations

New migrations can be created using the Supabase CLI with the command `supabase migration new migration_name`, which creates a file with the format YYYYMMDDHHMMSS_migration_name.sql in the migrations directory.

## Migration Naming Convention

Migrations follow the naming format YYYYMMDDHHMMSS_description.sql, for example 20251121120000_add_vote_timestamps.sql.

## Current Migration Status

The migration 20251121042518_create_proposals_and_votes_tables.sql has been applied. There are no pending migrations.

## Troubleshooting

If a migration fails due to constraint violations, the existing data should be checked and data migration may be needed before adding constraints. For migrations that take too long, indexes can be created concurrently using CREATE INDEX CONCURRENTLY. If RLS policy issues occur, the policy conditions should be checked, user roles verified, and testing done with the service role first.

## Related Documentation

- [Database Schema](./schema.md) - Schema reference
- [Supabase API Reference](../api/supabase.md) - Query patterns
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
