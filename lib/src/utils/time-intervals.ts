#!/usr/bin/env bun

/**
 * Time Interval Utilities
 *
 * Utility functions for working with time intervals in market data queries.
 * Moved from DSL to maintain clean separation of concerns.
 */

import type { Result } from "@qi/base";
import { failure, success, validationError } from "@qi/base";

// =============================================================================
// TIME INTERVAL UTILITIES
// =============================================================================

/**
 * Time Interval for Historical Data Queries
 */
export interface TimeInterval {
  startDate: Date;
  endDate: Date;
}

/**
 * Helper function to create time intervals
 */
export function createTimeInterval(startDate: Date, endDate: Date): TimeInterval {
  return { startDate, endDate };
}

/**
 * Helper function to create a time interval for the last N days
 */
export function createLastNDaysInterval(days: number): TimeInterval {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return { startDate, endDate };
}

/**
 * Helper function to create a time interval for the last N hours
 */
export function createLastNHoursInterval(hours: number): TimeInterval {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setHours(endDate.getHours() - hours);
  return { startDate, endDate };
}

/**
 * Helper function to create a time interval for the last N minutes
 */
export function createLastNMinutesInterval(minutes: number): TimeInterval {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMinutes(endDate.getMinutes() - minutes);
  return { startDate, endDate };
}

/**
 * Helper function to validate time intervals
 */
export function validateTimeInterval(timeInterval: TimeInterval): Result<void> {
  if (timeInterval.startDate >= timeInterval.endDate) {
    return failure(
      validationError("Start date must be before end date", {
        code: "INVALID_INTERVAL",
        context: { startDate: timeInterval.startDate, endDate: timeInterval.endDate },
      }),
    );
  }
  if (timeInterval.endDate > new Date()) {
    return failure(
      validationError("End date cannot be in the future", {
        code: "INVALID_INTERVAL",
        context: { endDate: timeInterval.endDate, now: new Date() },
      }),
    );
  }
  return success(undefined);
}

/**
 * Helper function to check if a date is within a time interval
 */
export function isDateInInterval(date: Date, interval: TimeInterval): boolean {
  return date >= interval.startDate && date <= interval.endDate;
}

/**
 * Helper function to calculate interval duration in milliseconds
 */
export function getIntervalDurationMs(interval: TimeInterval): number {
  return interval.endDate.getTime() - interval.startDate.getTime();
}

/**
 * Helper function to calculate interval duration in days
 */
export function getIntervalDurationDays(interval: TimeInterval): number {
  const ms = getIntervalDurationMs(interval);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
