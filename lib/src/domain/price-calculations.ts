#!/usr/bin/env bun

/**
 * Price Calculation Functions
 *
 * Business logic for market data price calculations.
 * Operates on pure DSL data types.
 */

import type { Result } from "@qi/base";
import { create, failure, success, validationError } from "@qi/base";
import type { Level1 } from "../dsl/types.js";

/**
 * Calculate bid/ask spread
 */
export function getSpread(level1: Level1): Result<number> {
  if (level1.askPrice <= 0 || level1.bidPrice <= 0) {
    return failure(
      validationError("Bid and ask prices must be positive", {
        code: "INVALID_PRICE",
        context: { bidPrice: level1.bidPrice, askPrice: level1.askPrice },
      }),
    );
  }
  if (level1.askPrice <= level1.bidPrice) {
    return failure(
      validationError("Ask price must be greater than bid price", {
        code: "INVALID_SPREAD",
        context: { bidPrice: level1.bidPrice, askPrice: level1.askPrice },
      }),
    );
  }
  return success(level1.askPrice - level1.bidPrice);
}

/**
 * Calculate mid price (average of bid and ask)
 */
export function getMidPrice(level1: Level1): Result<number> {
  if (level1.askPrice <= 0 || level1.bidPrice <= 0) {
    return failure(
      validationError("Bid and ask prices must be positive", {
        code: "INVALID_PRICE",
        context: { bidPrice: level1.bidPrice, askPrice: level1.askPrice },
      }),
    );
  }
  if (level1.askPrice <= level1.bidPrice) {
    return failure(
      validationError("Ask price must be greater than bid price", {
        code: "INVALID_SPREAD",
        context: { bidPrice: level1.bidPrice, askPrice: level1.askPrice },
      }),
    );
  }
  return success((level1.bidPrice + level1.askPrice) / 2);
}
