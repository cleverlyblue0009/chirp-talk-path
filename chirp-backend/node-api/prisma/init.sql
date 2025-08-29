-- Initial database setup for Chirp
-- This file is used by Docker to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial admin user (optional)
-- INSERT INTO users (id, email, role, display_name, created_at)
-- VALUES (
--   'admin-' || uuid_generate_v4(),
--   'admin@chirp.local',
--   'ADMIN',
--   'System Administrator',
--   NOW()
-- );

-- Create indexes for better performance
-- These will be created by Prisma migrations, but can be added here for reference

-- Comments for documentation
COMMENT ON SCHEMA public IS 'Chirp conversation training database';

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Chirp database initialized successfully';
END $$;