using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DailyPlanner.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260324120000_CvRepairEnsureSitesDocumentsTables")]
    public partial class CvRepairEnsureSitesDocumentsTables
    {
        // This repair migration only adds SQL guards and does not require model-diff generation.
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
        }
    }
}

