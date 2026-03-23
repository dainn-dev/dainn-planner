using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <summary>
    /// Removes the unused RepeatTask table (replaced by TaskInstances + DailyTasks.RepeatRule).
    /// </summary>
    public partial class DropObsoleteRepeatTaskTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""RepeatTask"";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE ""RepeatTask"" (
    ""TaskId"" uuid NOT NULL,
    ""RepeatDate"" timestamp with time zone NOT NULL,
    ""Description"" text NULL,
    CONSTRAINT ""PK_RepeatTask"" PRIMARY KEY (""TaskId"", ""RepeatDate""),
    CONSTRAINT ""FK_RepeatTask_DailyTasks_TaskId"" FOREIGN KEY (""TaskId"") REFERENCES ""DailyTasks"" (""Id"") ON DELETE CASCADE
);");
        }
    }
}
