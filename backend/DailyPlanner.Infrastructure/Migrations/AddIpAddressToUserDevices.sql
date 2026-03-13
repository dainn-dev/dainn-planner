-- Fix: column "IpAddress" does not exist on UserDevices
-- Run this against your PostgreSQL database (e.g. psql, pgAdmin, or dotnet run with a one-off script).
-- Then restart the API so login works again.

ALTER TABLE "UserDevices" ADD COLUMN "IpAddress" character varying(45) NULL;

-- If you applied this manually, tell EF the migration is applied so it won't try again:
-- INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
-- VALUES ('20260311100000_AddIpAddressToUserDevice', '8.0.0')
-- ON CONFLICT ("MigrationId") DO NOTHING;
