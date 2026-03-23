using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <summary>
    /// Repair migration: some environments can have EF migration history recorded without the
    /// corresponding CV hosting tables actually present. The CV admin endpoints expect
    /// "Sites"/"Documents" to exist, so we create them idempotently.
    /// </summary>
    public partial class CvRepairEnsureSitesDocumentsTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                BEGIN
                  -- Ensure consolidated table names expected by current EF mappings.
                  IF to_regclass('public."Sites"') IS NULL THEN
                    CREATE TABLE "Sites" (
                      "Id" uuid NOT NULL,
                      "OwnerUserId" character varying(450) NOT NULL,
                      "Slug" character varying(63) NOT NULL,
                      "Status" character varying(32) NOT NULL,
                      "RejectionReason" character varying(2000),
                      "RequestedAt" timestamp with time zone NOT NULL,
                      "ReviewedAt" timestamp with time zone,
                      "ReviewedByUserId" character varying(450),
                      "ThemePresetKey" character varying(64) NOT NULL,
                      "ThemeOverridesJson" jsonb,
                      "UpdatedAt" timestamp with time zone NOT NULL,

                      CONSTRAINT "PK_Sites" PRIMARY KEY ("Id"),
                      CONSTRAINT "FK_Sites_AspNetUsers_OwnerUserId"
                        FOREIGN KEY ("OwnerUserId") REFERENCES "AspNetUsers"("Id")
                        ON DELETE CASCADE,
                      CONSTRAINT "FK_Sites_AspNetUsers_ReviewedByUserId"
                        FOREIGN KEY ("ReviewedByUserId") REFERENCES "AspNetUsers"("Id")
                        ON DELETE SET NULL
                    );

                    CREATE UNIQUE INDEX "IX_Sites_OwnerUserId" ON "Sites"("OwnerUserId");
                    CREATE INDEX "IX_Sites_ReviewedByUserId" ON "Sites"("ReviewedByUserId");
                    CREATE UNIQUE INDEX "IX_Sites_Slug" ON "Sites"("Slug") WHERE "Status" <> 'rejected';
                    CREATE INDEX "IX_Sites_Status" ON "Sites"("Status");
                  END IF;

                  IF to_regclass('public."Documents"') IS NULL THEN
                    CREATE TABLE "Documents" (
                      "UserId" character varying(450) NOT NULL,
                      "ProfileJson" jsonb,
                      "PortfolioJson" jsonb,
                      "SkillsJson" jsonb,
                      "TestimonialsJson" jsonb,
                      "FactsJson" jsonb,
                      "ServicesJson" jsonb,
                      "EducationJson" jsonb,
                      "ExperienceJson" jsonb,
                      "CertificatesJson" jsonb,
                      "UpdatedAt" timestamp with time zone NOT NULL,

                      CONSTRAINT "PK_Documents" PRIMARY KEY ("UserId"),
                      CONSTRAINT "FK_Documents_AspNetUsers_UserId"
                        FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id")
                        ON DELETE CASCADE
                    );
                  END IF;
                END $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty: dropping these tables would be destructive.
        }
    }
}

