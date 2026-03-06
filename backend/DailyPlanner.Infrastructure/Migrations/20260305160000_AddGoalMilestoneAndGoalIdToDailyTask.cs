using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalMilestoneAndGoalIdToDailyTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "GoalMilestoneId",
                table: "DailyTasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GoalId",
                table: "DailyTasks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyTasks_GoalId",
                table: "DailyTasks",
                column: "GoalId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyTasks_GoalMilestoneId",
                table: "DailyTasks",
                column: "GoalMilestoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_DailyTasks_GoalMilestones_GoalMilestoneId",
                table: "DailyTasks",
                column: "GoalMilestoneId",
                principalTable: "GoalMilestones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_DailyTasks_LongTermGoals_GoalId",
                table: "DailyTasks",
                column: "GoalId",
                principalTable: "LongTermGoals",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DailyTasks_GoalMilestones_GoalMilestoneId",
                table: "DailyTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_DailyTasks_LongTermGoals_GoalId",
                table: "DailyTasks");

            migrationBuilder.DropIndex(
                name: "IX_DailyTasks_GoalId",
                table: "DailyTasks");

            migrationBuilder.DropIndex(
                name: "IX_DailyTasks_GoalMilestoneId",
                table: "DailyTasks");

            migrationBuilder.DropColumn(
                name: "GoalMilestoneId",
                table: "DailyTasks");

            migrationBuilder.DropColumn(
                name: "GoalId",
                table: "DailyTasks");
        }
    }
}
