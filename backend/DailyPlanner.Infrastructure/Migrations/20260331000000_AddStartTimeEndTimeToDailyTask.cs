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
            migrationBuilder.AddColumn<string>(
                name: "StartTime",
                table: "DailyTasks",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EndTime",
                table: "DailyTasks",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);
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
