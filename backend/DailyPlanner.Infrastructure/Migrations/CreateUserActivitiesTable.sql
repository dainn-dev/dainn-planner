-- Run this script if the UserActivities table does not exist (e.g. migration was not applied).
-- PostgreSQL

CREATE TABLE IF NOT EXISTS "UserActivities" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" TEXT NOT NULL,
    "Type" VARCHAR(50) NOT NULL,
    "Action" VARCHAR(500) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL,
    "EntityType" VARCHAR(50) NULL,
    "EntityId" VARCHAR(100) NULL,
    CONSTRAINT "FK_UserActivities_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_UserActivities_UserId_CreatedAt" ON "UserActivities" ("UserId", "CreatedAt");
