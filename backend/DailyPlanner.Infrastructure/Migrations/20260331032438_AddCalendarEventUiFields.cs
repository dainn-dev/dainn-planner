using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarEventUiFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttendeesJson",
                table: "CalendarEvents",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "DndEnabled",
                table: "CalendarEvents",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventType",
                table: "CalendarEvents",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "CalendarEvents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProjectTagsJson",
                table: "CalendarEvents",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReminderMinutes",
                table: "CalendarEvents",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendeesJson",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "DndEnabled",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "EventType",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "ProjectTagsJson",
                table: "CalendarEvents");

            migrationBuilder.DropColumn(
                name: "ReminderMinutes",
                table: "CalendarEvents");
        }
    }
}
