using Xunit;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class CalendarEventServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly CalendarEventService _service;

    public CalendarEventServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        _service = new CalendarEventService(_context, _mapper);
    }

    [Fact]
    public async Task GetEventsAsync_ShouldReturnAllEvents_WhenNoFilters()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var event1 = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event 1", StartDate = DateTime.Today };
        var event2 = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event 2", StartDate = DateTime.Today.AddDays(1) };
        _context.CalendarEvents.AddRange(event1, event2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEventsAsync(userId, null, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetEventsAsync_ShouldFilterByStartDate()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var startDate = DateTime.Today;
        var event1 = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event 1", StartDate = startDate };
        var event2 = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event 2", StartDate = startDate.AddDays(-1) };
        _context.CalendarEvents.AddRange(event1, event2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEventsAsync(userId, startDate, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetEventByIdAsync_ShouldReturnEvent_WhenExists()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var eventEntity = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event", StartDate = DateTime.Today };
        _context.CalendarEvents.Add(eventEntity);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEventByIdAsync(userId, eventEntity.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("Event");
    }

    [Fact]
    public async Task GetEventByIdAsync_ShouldReturnError_WhenNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.GetEventByIdAsync(userId, Guid.NewGuid());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Event not found");
    }

    [Fact]
    public async Task CreateEventAsync_ShouldCreateEvent()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var request = new CreateCalendarEventRequest
        {
            Title = "New Event",
            Description = "Description",
            StartDate = DateTime.Today,
            EndDate = DateTime.Today.AddHours(2),
            IsAllDay = false
        };

        // Act
        var result = await _service.CreateEventAsync(userId, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        var eventEntity = await _context.CalendarEvents.FirstOrDefaultAsync(e => e.UserId == userId);
        eventEntity.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateEventAsync_ShouldUpdateEvent()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var eventEntity = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Original", StartDate = DateTime.Today };
        _context.CalendarEvents.Add(eventEntity);
        await _context.SaveChangesAsync();

        var request = new UpdateCalendarEventRequest { Title = "Updated" };

        // Act
        var result = await _service.UpdateEventAsync(userId, eventEntity.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Title.Should().Be("Updated");
    }

    [Fact]
    public async Task DeleteEventAsync_ShouldDeleteEvent()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var eventEntity = new CalendarEvent { Id = Guid.NewGuid(), UserId = userId, Title = "Event", StartDate = DateTime.Today };
        _context.CalendarEvents.Add(eventEntity);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteEventAsync(userId, eventEntity.Id);

        // Assert
        result.Success.Should().BeTrue();
        var deleted = await _context.CalendarEvents.FindAsync(eventEntity.Id);
        deleted.Should().BeNull();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

