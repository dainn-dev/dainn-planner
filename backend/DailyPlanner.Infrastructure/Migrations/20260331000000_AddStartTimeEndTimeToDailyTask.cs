using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStartTimeEndTimeToDailyTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"DailyTasks\" ADD COLUMN IF NOT EXISTS \"StartTime\" character varying(5);");
            migrationBuilder.Sql("ALTER TABLE \"DailyTasks\" ADD COLUMN IF NOT EXISTS \"EndTime\" character varying(5);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartTime",
                table: "DailyTasks");

            migrationBuilder.DropColumn(
                name: "EndTime",
                table: "DailyTasks");
        }
    }
}
