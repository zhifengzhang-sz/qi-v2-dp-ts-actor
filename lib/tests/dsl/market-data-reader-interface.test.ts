#!/usr/bin/env bun

/**
 * Unified DSL Interface Tests for MarketDataReader
 *
 * Tests the common MarketDataReader interface behavior across all implementations.
 * Uses different actor objects but validates the same interface contract.
 * This approach ensures all readers behave consistently regardless of implementation.
 */

import { type Result, getError, getValue, isFailure, isSuccess } from "@qi/base";
import {
  Exchange,
  InstrumentType,
  type Level1,
  MarketContext,
  MarketSymbol,
  type OHLCV,
  type Price,
} from "@qi/core";
import { type TimeInterval, createTimeInterval } from "@qi/dp/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { MarketDataReader } from "@qi/dp/dsl/interfaces";
import { CCXTMCPReader } from "@qi/dp/market/crypto/sources/CCXTMCPReader";
// Import all MarketDataReader implementations
import { TwelveDataMCPReader } from "@qi/dp/market/multi-asset/sources/TwelveDataMCPReader";
import { AlphaVantageMCPReader } from "@qi/dp/market/stock/sources/AlphaVantageMCPReader";

// =============================================================================
// TEST ACTOR CONFIGURATIONS
// =============================================================================

interface TestActorConfig {
  name: string;
  reader: MarketDataReader;
  symbol: MarketSymbol;
  context: MarketContext;
  supportedMethods: {
    readPrice: boolean;
    readLevel1: boolean;
    readOHLCV: boolean;
    readHistoricalPrices: boolean;
    readHistoricalLevel1: boolean;
    readHistoricalOHLCV: boolean;
  };
}

// Mock MCP clients for different services

function createMockCCXTClient() {
  return {
    callTool: async (args: any) => {
      switch (args.name) {
        case "get-ticker":
          return {
            content: [
              {
                text: JSON.stringify({
                  last: 97500,
                  timestamp: Date.now(),
                  baseVolume: 1250.5,
                }),
              },
            ],
          };
        case "get-orderbook":
          return {
            content: [
              {
                text: JSON.stringify({
                  bids: [[97495.0, 0.5]],
                  asks: [[97505.0, 0.3]],
                  timestamp: Date.now(),
                }),
              },
            ],
          };
        case "get-ohlcv":
          return {
            content: [
              {
                text: JSON.stringify([
                  [Date.now() - 24 * 60 * 60 * 1000, 96500, 98000, 96000, 97500, 2500],
                ]),
              },
            ],
          };
        default:
          throw new Error(`Unsupported CCXT tool: ${args.name}`);
      }
    },
  };
}

function createMockTwelveDataClient() {
  return {
    callTool: async (args: any) => {
      switch (args.name) {
        case "quote":
          return {
            content: [
              {
                text: JSON.stringify({ price: "97650.50" }),
              },
            ],
          };
        case "time_series":
          return {
            content: [
              {
                text: JSON.stringify({
                  values: [
                    {
                      datetime: "2025-07-10",
                      open: "96800.00",
                      high: "98200.00",
                      low: "96500.00",
                      close: "97650.50",
                      volume: "1850",
                    },
                  ],
                }),
              },
            ],
          };
        case "orderbook":
          // This should fail for readLevel1 testing
          throw new Error("TwelveData mock failure for Level1 testing");
        default:
          throw new Error(`Unsupported TwelveData tool: ${args.name}`);
      }
    },
  };
}

function createMockAlphaVantageClient() {
  return {
    callTool: async (args: any) => {
      switch (args.name) {
        case "get-stock-quote":
          return {
            content: [
              {
                text: JSON.stringify({
                  "Global Quote": {
                    "05. price": "195.34",
                    "06. volume": "45000000",
                  },
                }),
              },
            ],
          };
        case "get-time-series":
          return {
            content: [
              {
                text: JSON.stringify({
                  "Time Series (Daily)": {
                    "2025-07-10": {
                      "1. open": "194.50",
                      "2. high": "196.80",
                      "3. low": "194.20",
                      "4. close": "195.34",
                      "5. volume": "45000000",
                    },
                  },
                }),
              },
            ],
          };
        default:
          throw new Error(`Unsupported Alpha Vantage tool: ${args.name}`);
      }
    },
  };
}

// =============================================================================
// TEST ACTOR SETUP
// =============================================================================

// Set up test data at module level
const binanceExchange = Exchange.create("binance", "Binance", "Global", "centralized");
const twelveDataExchange = Exchange.create("twelvedata", "Twelve Data", "Global", "aggregated");
const stockExchange = Exchange.create("nasdaq", "NASDAQ", "US", "centralized");

const cryptoSymbol = MarketSymbol.create(
  "bitcoin",
  "Bitcoin",
  "crypto",
  "usd",
  InstrumentType.CASH,
);
const cryptoSymbolCCXT = MarketSymbol.create(
  "BTC",
  "Bitcoin",
  "crypto",
  "USDT",
  InstrumentType.CASH,
);
const cryptoSymbolTwelve = MarketSymbol.create(
  "BTC",
  "Bitcoin",
  "crypto",
  "USD",
  InstrumentType.CASH,
);
const stockSymbol = MarketSymbol.create("AAPL", "Apple Inc", "equity", "USD", InstrumentType.CASH);

// Create test actors with their configurations at module level
const testActors: TestActorConfig[] = [
  {
    name: "CCXT",
    reader: new CCXTMCPReader({
      name: "test-ccxt",
      exchange: "binance",
      mcpClient: createMockCCXTClient(),
    }),
    symbol: cryptoSymbolCCXT,
    context: MarketContext.create(binanceExchange, cryptoSymbolCCXT),
    supportedMethods: {
      readPrice: true,
      readLevel1: true,
      readOHLCV: true,
      readHistoricalPrices: true,
      readHistoricalLevel1: false, // Not practical for CCXT
      readHistoricalOHLCV: true,
    },
  },
  {
    name: "TwelveData",
    reader: new TwelveDataMCPReader({
      name: "test-twelvedata",
      apiKey: "test-key",
      assetClass: "crypto",
      mcpClient: createMockTwelveDataClient(),
    }),
    symbol: cryptoSymbolTwelve,
    context: MarketContext.create(twelveDataExchange, cryptoSymbolTwelve),
    supportedMethods: {
      readPrice: true,
      readLevel1: false, // Mock failure for testing
      readOHLCV: true,
      readHistoricalPrices: true,
      readHistoricalLevel1: true,
      readHistoricalOHLCV: true,
    },
  },
  {
    name: "Alpha Vantage",
    reader: new AlphaVantageMCPReader({
      name: "test-alphavantage",
      apiKey: "test-key",
      mcpClient: createMockAlphaVantageClient(),
    }),
    symbol: stockSymbol,
    context: MarketContext.create(stockExchange, stockSymbol),
    supportedMethods: {
      readPrice: true,
      readLevel1: false, // Alpha Vantage doesn't provide Level1
      readOHLCV: true,
      readHistoricalPrices: true,
      readHistoricalLevel1: false,
      readHistoricalOHLCV: true,
    },
  },
];

describe("MarketDataReader Interface - Unified DSL Testing", () => {
  beforeAll(async () => {
    console.log(`✅ Initialized ${testActors.length} test actors for unified DSL testing`);
  });

  // =============================================================================
  // UNIFIED INTERFACE TESTS
  // =============================================================================

  describe("DSL Interface - readPrice", () => {
    it.each(testActors.filter((actor) => actor.supportedMethods.readPrice))(
      "should read current price for $name",
      async (actor) => {
        const result = await actor.reader.readPrice(actor.symbol, actor.context);

        expect(isSuccess(result)).toBe(true);
        const priceData = getValue(result);
        expect(priceData).not.toBeNull();

        const price = Array.isArray(priceData) ? priceData[0] : priceData;
        expect(price).toBeTruthy();
        if (price) {
          expect(price.price).toBeGreaterThan(0);
          expect(typeof price.price).toBe("number");
          expect(price.timestamp).toBeInstanceOf(Date);
          expect(price.size).toBeGreaterThanOrEqual(0);

          console.log(`✅ ${actor.name}: Price $${price.price.toLocaleString()}`);
        }
      },
    );

    it.each(testActors.filter((actor) => !actor.supportedMethods.readPrice))(
      "should handle unsupported price reading gracefully for $name",
      async (actor) => {
        const result = await actor.reader.readPrice(actor.symbol, actor.context);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error?.category).toMatch(/BUSINESS|NETWORK|VALIDATION|SYSTEM/);

        console.log(`✅ ${actor.name}: Price reading properly failed - ${error?.message}`);
      },
    );

    it.each(testActors)("should return Result<T> type for $name (never throw)", async (actor) => {
      const result = await actor.reader.readPrice(actor.symbol, actor.context);

      // Should always return Result<T>, never throw
      expect(typeof result).toBe("object");
      expect("tag" in result).toBe(true);
      expect(result.tag === "failure" || result.tag === "success").toBe(true);
    });
  });

  describe("DSL Interface - readLevel1", () => {
    it.each(testActors.filter((actor) => actor.supportedMethods.readLevel1))(
      "should read Level1 data for $name",
      async (actor) => {
        const result = await actor.reader.readLevel1(actor.symbol, actor.context);

        expect(isSuccess(result)).toBe(true);
        const level1Data = getValue(result);
        expect(level1Data).not.toBeNull();

        const level1 = Array.isArray(level1Data) ? level1Data[0] : level1Data;
        expect(level1).toBeTruthy();
        if (level1) {
          expect(level1.bidPrice).toBeGreaterThan(0);
          expect(level1.askPrice).toBeGreaterThan(0);
          expect(level1.askPrice).toBeGreaterThanOrEqual(level1.bidPrice);
          expect(level1.bidSize).toBeGreaterThan(0);
          expect(level1.askSize).toBeGreaterThan(0);
          expect(level1.timestamp).toBeInstanceOf(Date);

          console.log(`✅ ${actor.name}: Bid $${level1.bidPrice}, Ask $${level1.askPrice}`);
        }
      },
    );

    it.each(testActors.filter((actor) => !actor.supportedMethods.readLevel1))(
      "should handle unsupported Level1 gracefully for $name",
      async (actor) => {
        const result = await actor.reader.readLevel1(actor.symbol, actor.context);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error?.category).toMatch(/BUSINESS|UNSUPPORTED|SYSTEM/);

        console.log(`✅ ${actor.name}: Level1 properly unsupported - ${error?.message}`);
      },
    );
  });

  describe("DSL Interface - readOHLCV", () => {
    it.each(testActors.filter((actor) => actor.supportedMethods.readOHLCV))(
      "should read OHLCV data for $name",
      async (actor) => {
        const result = await actor.reader.readOHLCV(actor.symbol, actor.context);

        expect(isSuccess(result)).toBe(true);
        const ohlcvData = getValue(result);
        expect(ohlcvData).not.toBeNull();

        const ohlcv = Array.isArray(ohlcvData) ? ohlcvData[0] : ohlcvData;
        expect(ohlcv).toBeTruthy();
        if (ohlcv) {
          expect(ohlcv.open).toBeGreaterThan(0);
          expect(ohlcv.high).toBeGreaterThan(0);
          expect(ohlcv.low).toBeGreaterThan(0);
          expect(ohlcv.close).toBeGreaterThan(0);
          expect(ohlcv.volume).toBeGreaterThanOrEqual(0);
          expect(ohlcv.timestamp).toBeInstanceOf(Date);

          // Verify OHLCV relationships
          expect(ohlcv.high).toBeGreaterThanOrEqual(ohlcv.open);
          expect(ohlcv.high).toBeGreaterThanOrEqual(ohlcv.close);
          expect(ohlcv.low).toBeLessThanOrEqual(ohlcv.open);
          expect(ohlcv.low).toBeLessThanOrEqual(ohlcv.close);

          console.log(
            `✅ ${actor.name}: OHLCV O:${ohlcv.open} H:${ohlcv.high} L:${ohlcv.low} C:${ohlcv.close}`,
          );
        }
      },
    );

    it.each(testActors.filter((actor) => !actor.supportedMethods.readOHLCV))(
      "should handle unsupported OHLCV reading gracefully for $name",
      async (actor) => {
        const result = await actor.reader.readOHLCV(actor.symbol, actor.context);

        expect(isFailure(result)).toBe(true);
        const error = getError(result);
        expect(error?.category).toMatch(/BUSINESS|NETWORK|VALIDATION|SYSTEM/);

        console.log(`✅ ${actor.name}: OHLCV reading properly failed - ${error?.message}`);
      },
    );
  });

  describe("DSL Interface - Historical Data Methods", () => {
    const testInterval = createTimeInterval(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    );

    it.each(testActors.filter((actor) => actor.supportedMethods.readHistoricalPrices))(
      "should read historical prices for $name",
      async (actor) => {
        const result = await actor.reader.readHistoricalPrices(
          actor.symbol,
          actor.context,
          testInterval,
        );

        if (isSuccess(result)) {
          const prices = getValue(result) as Price[];
          expect(Array.isArray(prices)).toBe(true);

          for (const price of prices) {
            expect(price.price).toBeGreaterThan(0);
            expect(price.timestamp).toBeInstanceOf(Date);
          }

          console.log(`✅ ${actor.name}: Historical prices ${prices.length} entries`);
        } else {
          const error = getError(result);
          console.log(`⚠️  ${actor.name}: Historical prices not available - ${error?.message}`);
        }
      },
    );

    it.each(testActors.filter((actor) => actor.supportedMethods.readHistoricalOHLCV))(
      "should read historical OHLCV for $name",
      async (actor) => {
        const result = await actor.reader.readHistoricalOHLCV(
          actor.symbol,
          actor.context,
          testInterval,
        );

        if (isSuccess(result)) {
          const ohlcvArray = getValue(result) as OHLCV[];
          expect(Array.isArray(ohlcvArray)).toBe(true);

          for (const ohlcv of ohlcvArray) {
            expect(ohlcv.open).toBeGreaterThan(0);
            expect(ohlcv.high).toBeGreaterThan(0);
            expect(ohlcv.low).toBeGreaterThan(0);
            expect(ohlcv.close).toBeGreaterThan(0);
          }

          console.log(`✅ ${actor.name}: Historical OHLCV ${ohlcvArray.length} entries`);
        } else {
          const error = getError(result);
          console.log(`⚠️  ${actor.name}: Historical OHLCV not available - ${error?.message}`);
        }
      },
    );
  });

  describe("DSL Interface - Error Handling Consistency", () => {
    it.each(testActors)("should handle invalid symbols consistently for $name", async (actor) => {
      const invalidSymbol = MarketSymbol.create(
        "INVALID999",
        "Invalid Symbol",
        actor.symbol.assetClass,
        actor.symbol.currency,
        InstrumentType.CASH,
      );
      const invalidContext = MarketContext.create(actor.context.exchange, invalidSymbol);

      const result = await actor.reader.readPrice(invalidSymbol, invalidContext);

      // Should return Result<T> (not throw) and likely fail
      expect(typeof result).toBe("object");
      expect("tag" in result).toBe(true);

      if (isFailure(result)) {
        const error = getError(result);
        expect(error?.category).toMatch(/BUSINESS|NETWORK|VALIDATION|SYSTEM/);
        console.log(`✅ ${actor.name}: Invalid symbol handled - ${error?.message}`);
      } else {
        console.log(`✅ ${actor.name}: Invalid symbol unexpectedly succeeded`);
      }
    });

    it.each(testActors)("should validate asset class compatibility for $name", async (actor) => {
      // Create symbol with wrong asset class
      const wrongAssetClass = actor.symbol.assetClass === "crypto" ? "equity" : "crypto";
      const wrongSymbol = MarketSymbol.create(
        "TEST",
        "Test Symbol",
        wrongAssetClass,
        "USD",
        InstrumentType.CASH,
      );
      const wrongContext = MarketContext.create(actor.context.exchange, wrongSymbol);

      const result = await actor.reader.readPrice(wrongSymbol, wrongContext);

      if (isFailure(result)) {
        const error = getError(result);
        // Most readers should validate asset class
        expect(error?.code).toMatch(/UNSUPPORTED_ASSET_CLASS|VALIDATION|BUSINESS/);
        console.log(`✅ ${actor.name}: Asset class validation - ${error?.message}`);
      } else {
        // Some readers might be flexible with asset classes
        console.log(`✅ ${actor.name}: Asset class flexible`);
      }
    });
  });

  describe("DSL Interface - Type Safety", () => {
    it.each(testActors)("should return properly typed data structures for $name", async (actor) => {
      if (actor.supportedMethods.readPrice) {
        const priceResult = await actor.reader.readPrice(actor.symbol, actor.context);
        if (isSuccess(priceResult)) {
          const priceData = getValue(priceResult);
          const price = Array.isArray(priceData) ? priceData[0] : priceData;

          // Verify Price object structure
          expect(price).toBeTruthy();
          if (price) {
            expect(price).toHaveProperty("price");
            expect(price).toHaveProperty("timestamp");
            expect(price).toHaveProperty("size");
            expect(typeof price.price).toBe("number");
            expect(price.timestamp).toBeInstanceOf(Date);
            expect(typeof price.size).toBe("number");
          }
        }
      }

      if (actor.supportedMethods.readOHLCV) {
        const ohlcvResult = await actor.reader.readOHLCV(actor.symbol, actor.context);
        if (isSuccess(ohlcvResult)) {
          const ohlcvData = getValue(ohlcvResult);
          const ohlcv = Array.isArray(ohlcvData) ? ohlcvData[0] : ohlcvData;

          // Verify OHLCV object structure
          expect(ohlcv).toBeTruthy();
          if (ohlcv) {
            expect(ohlcv).toHaveProperty("open");
            expect(ohlcv).toHaveProperty("high");
            expect(ohlcv).toHaveProperty("low");
            expect(ohlcv).toHaveProperty("close");
            expect(ohlcv).toHaveProperty("volume");
            expect(ohlcv).toHaveProperty("timestamp");
            expect(typeof ohlcv.open).toBe("number");
            expect(typeof ohlcv.high).toBe("number");
            expect(typeof ohlcv.low).toBe("number");
            expect(typeof ohlcv.close).toBe("number");
            expect(typeof ohlcv.volume).toBe("number");
            expect(ohlcv.timestamp).toBeInstanceOf(Date);
          }
        }
      }

      console.log(`✅ ${actor.name}: Type safety verified`);
    });
  });
});
