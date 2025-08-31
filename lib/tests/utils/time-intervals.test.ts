#!/usr/bin/env bun

/**
 * Time Interval Utilities Unit Tests
 *
 * Tests utility functions for working with time intervals in market data queries.
 * Verifies creation, validation, and manipulation of time intervals.
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import {
  type TimeInterval,
  createLastNDaysInterval,
  createLastNHoursInterval,
  createLastNMinutesInterval,
  createTimeInterval,
  getIntervalDurationDays,
  getIntervalDurationMs,
  isDateInInterval,
  validateTimeInterval,
} from "@qi/dp/utils";
import { describe, expect, it } from "vitest";

describe("Time Interval Utilities", () => {
  describe("createTimeInterval", () => {
    it("should create time interval with correct properties", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-02T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(interval.startDate).toBe(startDate);
      expect(interval.endDate).toBe(endDate);
    });

    it("should handle same day intervals", () => {
      const startDate = new Date("2024-01-01T09:00:00Z");
      const endDate = new Date("2024-01-01T17:00:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(interval.startDate).toBe(startDate);
      expect(interval.endDate).toBe(endDate);
    });

    it("should handle minute-level precision", () => {
      const startDate = new Date("2024-01-01T09:30:15Z");
      const endDate = new Date("2024-01-01T09:30:45Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(interval.startDate).toBe(startDate);
      expect(interval.endDate).toBe(endDate);
    });
  });

  describe("createLastNDaysInterval", () => {
    it("should create interval for last N days", () => {
      const days = 7;
      const interval = createLastNDaysInterval(days);
      const now = new Date();

      // End date should be very close to now (within a few seconds)
      expect(Math.abs(interval.endDate.getTime() - now.getTime())).toBeLessThan(5000);

      // Start date should be approximately N days ago
      const expectedStart = new Date();
      expectedStart.setDate(now.getDate() - days);
      expect(Math.abs(interval.startDate.getTime() - expectedStart.getTime())).toBeLessThan(5000);

      // Verify interval is approximately the right duration
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const expectedDurationMs = days * 24 * 60 * 60 * 1000;
      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
    });

    it("should handle single day interval", () => {
      const interval = createLastNDaysInterval(1);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      expect(Math.abs(durationMs - oneDayMs)).toBeLessThan(5000);
    });

    it("should handle zero days (same day)", () => {
      const interval = createLastNDaysInterval(0);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();

      expect(Math.abs(durationMs)).toBeLessThan(5000);
    });

    it("should handle larger intervals", () => {
      const days = 30;
      const interval = createLastNDaysInterval(days);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const expectedDurationMs = days * 24 * 60 * 60 * 1000;

      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
    });
  });

  describe("createLastNHoursInterval", () => {
    it("should create interval for last N hours", () => {
      const hours = 6;
      const interval = createLastNHoursInterval(hours);
      const now = new Date();

      // End date should be very close to now
      expect(Math.abs(interval.endDate.getTime() - now.getTime())).toBeLessThan(5000);

      // Duration should be approximately N hours
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const expectedDurationMs = hours * 60 * 60 * 1000;
      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
    });

    it("should handle single hour interval", () => {
      const interval = createLastNHoursInterval(1);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const oneHourMs = 60 * 60 * 1000;

      expect(Math.abs(durationMs - oneHourMs)).toBeLessThan(5000);
    });

    it("should handle fractional hours correctly", () => {
      const interval = createLastNHoursInterval(24);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      expect(Math.abs(durationMs - oneDayMs)).toBeLessThan(5000);
    });
  });

  describe("createLastNMinutesInterval", () => {
    it("should create interval for last N minutes", () => {
      const minutes = 30;
      const interval = createLastNMinutesInterval(minutes);
      const now = new Date();

      // End date should be very close to now
      expect(Math.abs(interval.endDate.getTime() - now.getTime())).toBeLessThan(5000);

      // Duration should be approximately N minutes
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const expectedDurationMs = minutes * 60 * 1000;
      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
    });

    it("should handle single minute interval", () => {
      const interval = createLastNMinutesInterval(1);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const oneMinuteMs = 60 * 1000;

      expect(Math.abs(durationMs - oneMinuteMs)).toBeLessThan(5000);
    });

    it("should handle larger minute intervals", () => {
      const minutes = 120; // 2 hours
      const interval = createLastNMinutesInterval(minutes);
      const durationMs = interval.endDate.getTime() - interval.startDate.getTime();
      const expectedDurationMs = minutes * 60 * 1000;

      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
    });
  });

  describe("validateTimeInterval", () => {
    it("should validate correct time intervals", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-02T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);
      const result = validateTimeInterval(interval);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBeUndefined();
      expect(getError(result)).toBeNull();
    });

    it("should reject intervals where start date equals end date", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const interval = createTimeInterval(date, date);
      const result = validateTimeInterval(interval);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Start date must be before end date");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should reject intervals where start date is after end date", () => {
      const startDate = new Date("2024-01-02T00:00:00Z");
      const endDate = new Date("2024-01-01T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);
      const result = validateTimeInterval(interval);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Start date must be before end date");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should reject intervals with end date in the future", () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1); // 1 hour in the future
      const interval = createTimeInterval(startDate, endDate);
      const result = validateTimeInterval(interval);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("End date cannot be in the future");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should allow intervals ending very close to now", () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 1); // 1 hour ago
      const endDate = new Date(); // now
      const interval = createTimeInterval(startDate, endDate);
      const result = validateTimeInterval(interval);

      expect(isSuccess(result)).toBe(true);
    });

    it("should handle past intervals correctly", () => {
      const startDate = new Date("2023-01-01T00:00:00Z");
      const endDate = new Date("2023-01-02T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);
      const result = validateTimeInterval(interval);

      expect(isSuccess(result)).toBe(true);
    });
  });

  describe("isDateInInterval", () => {
    const startDate = new Date("2024-01-01T00:00:00Z");
    const endDate = new Date("2024-01-03T00:00:00Z");
    const interval = createTimeInterval(startDate, endDate);

    it("should return true for dates within interval", () => {
      const dateInInterval = new Date("2024-01-02T12:00:00Z");
      expect(isDateInInterval(dateInInterval, interval)).toBe(true);
    });

    it("should return true for dates at interval boundaries", () => {
      expect(isDateInInterval(startDate, interval)).toBe(true);
      expect(isDateInInterval(endDate, interval)).toBe(true);
    });

    it("should return false for dates before interval", () => {
      const dateBefore = new Date("2023-12-31T23:59:59Z");
      expect(isDateInInterval(dateBefore, interval)).toBe(false);
    });

    it("should return false for dates after interval", () => {
      const dateAfter = new Date("2024-01-03T00:00:01Z");
      expect(isDateInInterval(dateAfter, interval)).toBe(false);
    });

    it("should handle exact millisecond precision", () => {
      const startMs = new Date("2024-01-01T00:00:00.000Z");
      const endMs = new Date("2024-01-01T00:00:01.000Z");
      const intervalMs = createTimeInterval(startMs, endMs);

      const dateInMs = new Date("2024-01-01T00:00:00.500Z");
      const dateBeforeMs = new Date("2023-12-31T23:59:59.999Z");
      const dateAfterMs = new Date("2024-01-01T00:00:01.001Z");

      expect(isDateInInterval(dateInMs, intervalMs)).toBe(true);
      expect(isDateInInterval(dateBeforeMs, intervalMs)).toBe(false);
      expect(isDateInInterval(dateAfterMs, intervalMs)).toBe(false);
    });
  });

  describe("getIntervalDurationMs", () => {
    it("should calculate duration in milliseconds correctly", () => {
      const startDate = new Date("2024-01-01T00:00:00.000Z");
      const endDate = new Date("2024-01-01T00:00:01.000Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationMs(interval)).toBe(1000); // 1 second = 1000ms
    });

    it("should handle minute durations", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-01T00:01:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationMs(interval)).toBe(60000); // 1 minute = 60000ms
    });

    it("should handle hour durations", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-01T01:00:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationMs(interval)).toBe(3600000); // 1 hour = 3600000ms
    });

    it("should handle day durations", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-02T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationMs(interval)).toBe(86400000); // 1 day = 86400000ms
    });

    it("should handle complex durations", () => {
      const startDate = new Date("2024-01-01T12:30:45.123Z");
      const endDate = new Date("2024-01-01T14:45:30.456Z");
      const interval = createTimeInterval(startDate, endDate);

      const expectedMs = endDate.getTime() - startDate.getTime();
      expect(getIntervalDurationMs(interval)).toBe(expectedMs);
    });
  });

  describe("getIntervalDurationDays", () => {
    it("should calculate exact day durations", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-02T00:00:00Z");
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(1);
    });

    it("should round up partial days", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-01T12:00:00Z"); // 12 hours = 0.5 days
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(1); // Rounded up
    });

    it("should handle multiple day durations", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-01-08T00:00:00Z"); // 7 days
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(7);
    });

    it("should handle partial days consistently", () => {
      const startDate = new Date("2024-01-01T06:00:00Z");
      const endDate = new Date("2024-01-01T18:00:00Z"); // 12 hours
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(1); // Rounded up
    });

    it("should handle very short intervals", () => {
      const startDate = new Date("2024-01-01T00:00:00.000Z");
      const endDate = new Date("2024-01-01T00:00:00.001Z"); // 1 millisecond
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(1); // Rounded up
    });

    it("should handle month-long intervals", () => {
      const startDate = new Date("2024-01-01T00:00:00Z");
      const endDate = new Date("2024-02-01T00:00:00Z"); // 31 days (January)
      const interval = createTimeInterval(startDate, endDate);

      expect(getIntervalDurationDays(interval)).toBe(31);
    });
  });

  describe("Integration Tests", () => {
    it("should work with createLastNDaysInterval and validation", () => {
      const interval = createLastNDaysInterval(7);
      const validationResult = validateTimeInterval(interval);

      expect(isSuccess(validationResult)).toBe(true);
      expect(getIntervalDurationDays(interval)).toBe(7);
    });

    it("should work with createLastNHoursInterval and date checking", () => {
      const interval = createLastNHoursInterval(6);
      const now = new Date();
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(now.getHours() - 6);

      expect(isDateInInterval(now, interval)).toBe(true);
      expect(isDateInInterval(sixHoursAgo, interval)).toBe(true);

      // Date from 8 hours ago should not be in the interval
      const eightHoursAgo = new Date();
      eightHoursAgo.setHours(now.getHours() - 8);
      expect(isDateInInterval(eightHoursAgo, interval)).toBe(false);
    });

    it("should work with createLastNMinutesInterval and duration calculation", () => {
      const minutes = 45;
      const interval = createLastNMinutesInterval(minutes);
      const durationMs = getIntervalDurationMs(interval);
      const expectedDurationMs = minutes * 60 * 1000;

      expect(Math.abs(durationMs - expectedDurationMs)).toBeLessThan(5000);
      expect(getIntervalDurationDays(interval)).toBe(1); // Should round up to 1 day
    });

    it("should handle edge cases in real-world scenarios", () => {
      // Test creating an interval that spans midnight
      const interval = createLastNHoursInterval(25); // More than a day
      const validationResult = validateTimeInterval(interval);

      expect(isSuccess(validationResult)).toBe(true);
      expect(getIntervalDurationDays(interval)).toBe(2); // Should be 2 days when rounded up
    });
  });
});
