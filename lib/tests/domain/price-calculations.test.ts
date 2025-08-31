#!/usr/bin/env bun

/**
 * Price Calculation Functions Unit Tests
 *
 * Tests business logic for market data price calculations.
 * Verifies proper handling of Level1 data and Result<T> pattern.
 */

import { getError, getValue, isFailure, isSuccess } from "@qi/base";
import { Level1 } from "@qi/core";
import { getMidPrice, getSpread } from "@qi/dp/domain";
import { describe, expect, it } from "vitest";

describe("Price Calculation Functions", () => {
  describe("getSpread", () => {
    it("should calculate spread correctly for valid Level1 data", () => {
      // Level1.create(timestamp, bidPrice, bidSize, askPrice, askSize)
      const level1 = Level1.create(new Date(), 100.25, 1000, 100.5, 1500);
      const result = getSpread(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBe(0.25); // 100.50 - 100.25
      expect(getError(result)).toBeNull();
    });

    it("should return failure for negative bid price", () => {
      const level1 = Level1.create(new Date(), -10.25, 1000, 100.5, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Bid and ask prices must be positive");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure for negative ask price", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, -100.5, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Bid and ask prices must be positive");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure for zero bid price", () => {
      const level1 = Level1.create(new Date(), 0, 1000, 100.5, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure for zero ask price", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, 0, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure when ask price equals bid price", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, 100.25, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Ask price must be greater than bid price");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure when ask price is less than bid price", () => {
      const level1 = Level1.create(new Date(), 100.5, 1000, 100.25, 1500);
      const result = getSpread(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Ask price must be greater than bid price");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should calculate spread for small price differences", () => {
      const level1 = Level1.create(new Date(), 100.0, 1000, 100.01, 1500);
      const result = getSpread(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBeCloseTo(0.01, 2);
    });

    it("should calculate spread for large price differences", () => {
      const level1 = Level1.create(new Date(), 100.0, 1000, 150.0, 1500);
      const result = getSpread(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBe(50.0);
    });
  });

  describe("getMidPrice", () => {
    it("should calculate mid price correctly for valid Level1 data", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, 100.5, 1500);
      const result = getMidPrice(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBe(100.375); // (100.50 + 100.25) / 2
      expect(getError(result)).toBeNull();
    });

    it("should return failure for negative bid price", () => {
      const level1 = Level1.create(new Date(), -10.25, 1000, 100.5, 1500);
      const result = getMidPrice(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.message).toBe("Bid and ask prices must be positive");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure for negative ask price", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, -100.5, 1500);
      const result = getMidPrice(level1);

      expect(isFailure(result)).toBe(true);
      expect(getValue(result)).toBeNull();

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure for zero prices", () => {
      const level1 = Level1.create(new Date(), 0, 1000, 0, 1500);
      const result = getMidPrice(level1);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure when ask price equals bid price", () => {
      const level1 = Level1.create(new Date(), 100.25, 1000, 100.25, 1500);
      const result = getMidPrice(level1);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should return failure when ask price is less than bid price", () => {
      const level1 = Level1.create(new Date(), 100.5, 1000, 100.25, 1500);
      const result = getMidPrice(level1);

      expect(isFailure(result)).toBe(true);

      const error = getError(result);
      expect(error?.code).toBe("VALIDATION_ERROR");
      expect(error?.category).toBe("VALIDATION");
    });

    it("should calculate mid price for equal spread", () => {
      const level1 = Level1.create(new Date(), 99.0, 1000, 100.0, 1500);
      const result = getMidPrice(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBe(99.5); // (100.00 + 99.00) / 2
    });

    it("should calculate mid price with precision", () => {
      const level1 = Level1.create(new Date(), 100.121, 1000, 100.123, 1500);
      const result = getMidPrice(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBeCloseTo(100.122, 3);
    });

    it("should handle large price values", () => {
      const level1 = Level1.create(new Date(), 50000.25, 1000, 50000.5, 1500);
      const result = getMidPrice(level1);

      expect(isSuccess(result)).toBe(true);
      expect(getValue(result)).toBe(50000.375);
    });
  });

  describe("Function Integration", () => {
    it("should work together for real market data", () => {
      // Simulate realistic Bitcoin Level1 data
      const btcLevel1 = Level1.create(new Date(), 50123.75, 2.5, 50125.5, 3.2);

      const spreadResult = getSpread(btcLevel1);
      const midPriceResult = getMidPrice(btcLevel1);

      expect(isSuccess(spreadResult)).toBe(true);
      expect(isSuccess(midPriceResult)).toBe(true);

      const spread = getValue(spreadResult);
      const midPrice = getValue(midPriceResult);

      expect(spread).toBe(1.75); // 50125.50 - 50123.75
      expect(midPrice).toBe(50124.625); // (50125.50 + 50123.75) / 2
    });

    it("should both fail for the same invalid data", () => {
      const invalidLevel1 = Level1.create(new Date(), 50, 1000, -100, 1500);

      const spreadResult = getSpread(invalidLevel1);
      const midPriceResult = getMidPrice(invalidLevel1);

      expect(isFailure(spreadResult)).toBe(true);
      expect(isFailure(midPriceResult)).toBe(true);

      const spreadError = getError(spreadResult);
      const midPriceError = getError(midPriceResult);

      expect(spreadError?.code).toBe("VALIDATION_ERROR");
      expect(midPriceError?.code).toBe("VALIDATION_ERROR");
    });
  });
});
