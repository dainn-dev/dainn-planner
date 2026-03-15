-- Adds IpAddress column to UserDevices (matches migration 20260311100000_AddIpAddressToUserDevice)
-- Run with: psql $DATABASE_URL -f scripts/add-ipaddress-column.sql
-- Or from app's connection string in appsettings.json

ALTER TABLE "UserDevices"
ADD COLUMN IF NOT EXISTS "IpAddress" character varying(45) NULL;
