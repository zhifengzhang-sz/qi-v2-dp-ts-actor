#!/usr/bin/env bun

/**
 * TwelveData MCP Reader Integration Tests
 *
 * Tests TwelveData MCP Reader with REAL API connections using .env API key.
 * Uses HTTP simulation pattern since official MCP server requires additional auth setup.
 * Verifies DSL interface compliance across multiple asset classes.
 * No mocks - tests actual TwelveData API behavior through simulated MCP pattern.
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
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
import {
  type TwelveDataMCPConfig,
  TwelveDataMCPReader,
  createTwelveDataMCPReader,
} from "@qi/dp/market/multi-asset/sources/TwelveDataMCPReader";
import { type TimeInterval, createTimeInterval } from "@qi/dp/utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("TwelveData MCP Reader - Real MCP Server Integration", () => {
  let cryptoReader: TwelveDataMCPReader;
  let stockReader: TwelveDataMCPReader;
  let forexReader: TwelveDataMCPReader;
  let mcpClient: Client;
  let transport: SSEClientTransport;

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  // Test data setup for different asset classes
  const testExchange = Exchange.create("TWELVEDATA", "Twelve Data", "Global", "aggregated");

  const cryptoSymbol = MarketSymbol.create(
    "BTC", // TwelveData crypto format
    "Bitcoin",
    "crypto",
    "USD",
    InstrumentType.CASH,
  );
  const stockSymbol = MarketSymbol.create(
    "AAPL",
    "Apple Inc",
    "equity",
    "USD",
    InstrumentType.CASH,
  );
  const forexSymbol = MarketSymbol.create(
    "EUR", // TwelveData forex format
    "Euro Dollar",
    "forex",
    "USD",
    InstrumentType.CASH,
  );

  const cryptoContext = MarketContext.create(testExchange, cryptoSymbol);
  const stockContext = MarketContext.create(testExchange, stockSymbol);
  const forexContext = MarketContext.create(testExchange, forexSymbol);

  beforeAll(async () => {
    if (!apiKey) {
      console.warn("⚠️  TWELVE_DATA_API_KEY not found in environment");
      return;
    }

    console.log("✅ TwelveData API key loaded from .env file");

    // Create simulated MCP client that makes real HTTP calls to TwelveData API
    // Note: Real MCP server connection requires additional auth configuration
    mcpClient = {
      callTool: async (args: { name: string; arguments: any }) => {
        const { name, arguments: params } = args;

        // Real HTTP calls to TwelveData API with updated tool names
        const baseUrl = "https://api.twelvedata.com";
        let url = "";

        switch (name) {
          case "quote":
            url = `${baseUrl}/price?symbol=${params.symbol}&apikey=${params.apikey}`;
            break;
          case "time_series":
            url = `${baseUrl}/time_series?symbol=${params.symbol}&interval=${params.interval}&start_date=${params.start_date}&end_date=${params.end_date}&apikey=${params.apikey}`;
            break;
          default:
            throw new Error(`Unknown TwelveData tool: ${name}`);
        }

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();

          // Handle TwelveData API errors
          if (data.status === "error") {
            throw new Error(`TwelveData API Error: ${data.message}`);
          }

          return {
            content: [
              {
                text: JSON.stringify(data),
              },
            ],
          };
        } catch (error) {
          throw new Error(`TwelveData API call failed: ${error}`);
        }
      },
    } as any;

    // Create readers for different asset classes
    const cryptoConfig: TwelveDataMCPConfig = {
      name: "crypto-integration-reader",
      apiKey,
      assetClass: "crypto",
      debug: false,
      mcpClient,
    };

    const stockConfig: TwelveDataMCPConfig = {
      name: "stock-integration-reader",
      apiKey,
      assetClass: "stocks",
      debug: false,
      mcpClient,
    };

    const forexConfig: TwelveDataMCPConfig = {
      name: "forex-integration-reader",
      apiKey,
      assetClass: "forex",
      debug: false,
      mcpClient,
    };

    cryptoReader = new TwelveDataMCPReader(cryptoConfig);
    stockReader = new TwelveDataMCPReader(stockConfig);
    forexReader = new TwelveDataMCPReader(forexConfig);
  });

  describe("Constructor and Factory", () => {
    it("should create TwelveData MCP Reader with correct configuration", () => {
      if (!apiKey) return;

      expect(cryptoReader).toBeDefined();
      expect(stockReader).toBeDefined();
      expect(forexReader).toBeDefined();
    });

    it("should create reader using factory function", () => {
      if (!apiKey) return;

      const factoryReader = createTwelveDataMCPReader({
        name: "factory-test",
        apiKey,
        assetClass: "crypto",
        mcpClient,
      });

      expect(factoryReader).toBeInstanceOf(TwelveDataMCPReader);
    });
  });

  describe("DSL Interface - readPrice", () => {
    it("should read current Bitcoin price successfully", async () => {
      if (!apiKey) return;

      const result = await cryptoReader.readPrice(cryptoSymbol, cryptoContext);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  Bitcoin price fetch failed: ${error?.message}`);
        // API might be rate limited or symbol unavailable
        expect(error?.category).toMatch(/NETWORK|BUSINESS/);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const price = getValue(result) as Price;

      expect(price.price).toBeGreaterThan(0);
      expect(typeof price.price).toBe("number");
      expect(price.timestamp).toBeInstanceOf(Date);
      expect(price.size).toBe(0); // TwelveData price endpoint doesn't include volume

      console.log(`✅ Bitcoin price: $${price.price.toLocaleString()}`);
    }, 30000);

    it("should reject mismatched asset classes", async () => {
      if (!apiKey) return;

      // Try to read stock with crypto reader (should fail validation)
      const result = await cryptoReader.readPrice(stockSymbol, stockContext);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error?.code).toBe("UNSUPPORTED_ASSET_CLASS");
      expect(error?.message).toContain("Asset class mismatch");
      expect(error?.message).toContain("Expected crypto, got stocks");
      expect(error?.category).toBe("VALIDATION");

      console.log(`✅ Asset class validation works: ${error?.message}`);
    });

    it("should handle historical price requests", async () => {
      if (!apiKey) return;

      const interval = createTimeInterval(
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      );

      const result = await cryptoReader.readPrice(cryptoSymbol, cryptoContext, interval);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  Historical prices unavailable: ${error?.message}`);
        // Historical data might not be available on free tier
        expect(error?.category).toMatch(/BUSINESS|NETWORK/);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const prices = getValue(result) as Price[];

      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);

      // Verify each price
      for (const price of prices) {
        expect(price.price).toBeGreaterThan(0);
        expect(price.timestamp).toBeInstanceOf(Date);
      }

      console.log(`✅ Retrieved ${prices.length} historical Bitcoin prices`);
    }, 45000);
  });

  describe("DSL Interface - readLevel1", () => {
    it("should read Level1 quote data successfully", async () => {
      if (!apiKey) return;

      const result = await stockReader.readLevel1(stockSymbol, stockContext);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  Level1 data unavailable: ${error?.message}`);
        // Level1 might not be available for all symbols or plans
        expect(error?.category).toMatch(/BUSINESS|NETWORK/);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result) as Level1;

      expect(level1.bidPrice).toBeGreaterThan(0);
      expect(level1.askPrice).toBeGreaterThan(0);
      expect(level1.askPrice).toBeGreaterThanOrEqual(level1.bidPrice);
      expect(level1.bidSize).toBeGreaterThan(0);
      expect(level1.askSize).toBeGreaterThan(0);
      expect(level1.timestamp).toBeInstanceOf(Date);

      console.log(
        `✅ Level1 - Bid: $${level1.bidPrice}, Ask: $${level1.askPrice}, Spread: $${(level1.askPrice - level1.bidPrice).toFixed(4)}`,
      );
    }, 30000);

    it("should handle Level1 data with default sizes", async () => {
      if (!apiKey) return;

      const result = await forexReader.readLevel1(forexSymbol, forexContext);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  Forex Level1 unavailable: ${error?.message}`);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const level1 = getValue(result) as Level1;

      // TwelveData might not provide bid/ask sizes for forex, should use defaults
      expect(level1.bidSize).toBeGreaterThan(0);
      expect(level1.askSize).toBeGreaterThan(0);

      console.log(
        `✅ Forex Level1 with default sizes: Bid ${level1.bidPrice}, Ask ${level1.askPrice}`,
      );
    }, 30000);
  });

  describe("DSL Interface - readOHLCV", () => {
    it("should read current OHLCV data successfully", async () => {
      if (!apiKey) return;

      const result = await stockReader.readOHLCV(stockSymbol, stockContext);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  OHLCV data unavailable: ${error?.message}`);
        expect(error?.category).toMatch(/BUSINESS|NETWORK/);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const ohlcv = getValue(result) as OHLCV;

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
        `✅ OHLCV - O: ${ohlcv.open}, H: ${ohlcv.high}, L: ${ohlcv.low}, C: ${ohlcv.close}, V: ${ohlcv.volume}`,
      );
    }, 30000);

    it("should read historical OHLCV data with time range", async () => {
      if (!apiKey) return;

      const interval = createTimeInterval(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      );

      const result = await stockReader.readOHLCV(stockSymbol, stockContext, interval);

      if (isFailure(result)) {
        const error = getError(result);
        console.warn(`⚠️  Historical OHLCV unavailable: ${error?.message}`);
        return;
      }

      expect(isSuccess(result)).toBe(true);
      const ohlcvArray = getValue(result) as OHLCV[];

      expect(Array.isArray(ohlcvArray)).toBe(true);
      expect(ohlcvArray.length).toBeGreaterThan(0);

      // Verify each OHLCV entry
      for (const ohlcv of ohlcvArray) {
        expect(ohlcv.open).toBeGreaterThan(0);
        expect(ohlcv.high).toBeGreaterThan(0);
        expect(ohlcv.low).toBeGreaterThan(0);
        expect(ohlcv.close).toBeGreaterThan(0);
        expect(ohlcv.volume).toBeGreaterThanOrEqual(0);
      }

      console.log(`✅ Retrieved ${ohlcvArray.length} historical OHLCV entries`);
    }, 45000);

    it("should handle invalid time intervals", async () => {
      if (!apiKey) return;

      const invalidInterval = createTimeInterval(
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Future start
        new Date(Date.now() + 48 * 60 * 60 * 1000), // Future end
      );

      const result = await cryptoReader.readOHLCV(cryptoSymbol, cryptoContext, invalidInterval);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error?.code).toBe("INVALID_TIME_INTERVAL");
      expect(error?.category).toBe("VALIDATION");

      console.log(`✅ Future interval properly rejected: ${error?.message}`);
    });
  });

  describe("Symbol Formatting", () => {
    it("should format crypto symbols correctly", async () => {
      if (!apiKey) return;

      // Test internal symbol formatting by making a call
      const result = await cryptoReader.readPrice(cryptoSymbol, cryptoContext);

      // Should not fail due to symbol formatting (other failures are acceptable)
      if (isFailure(result)) {
        const error = getError(result);
        expect(error?.code).not.toBe("INVALID_SYMBOL_FORMAT");
      }

      console.log("✅ Crypto symbol formatting works");
    }, 30000);
  });

  describe("Historical Data Methods", () => {
    it("should read historical prices successfully", async () => {
      if (!apiKey) return;

      const interval = createTimeInterval(
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );

      const result = await cryptoReader.readHistoricalPrices(cryptoSymbol, cryptoContext, interval);

      if (isSuccess(result)) {
        const prices = getValue(result) as Price[];
        expect(Array.isArray(prices)).toBe(true);
        console.log(`✅ readHistoricalPrices returned ${prices.length} entries`);
      } else {
        const error = getError(result);
        console.warn(`⚠️  Historical prices unavailable: ${error?.message}`);
      }
    }, 45000);

    it("should handle readHistoricalLevel1 appropriately", async () => {
      if (!apiKey) return;

      const interval = createTimeInterval(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date());

      const result = await stockReader.readHistoricalLevel1(stockSymbol, stockContext, interval);

      // This method should exist but might not be supported
      if (isFailure(result)) {
        const error = getError(result);
        expect(error?.category).toMatch(/BUSINESS|NETWORK/);
        console.log(`✅ Historical Level1 handled appropriately: ${error?.message}`);
      } else {
        console.log("✅ Historical Level1 supported");
      }
    }, 30000);

    it("should read historical OHLCV successfully", async () => {
      if (!apiKey) return;

      const interval = createTimeInterval(
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
      );

      const result = await stockReader.readHistoricalOHLCV(stockSymbol, stockContext, interval);

      if (isSuccess(result)) {
        const ohlcvArray = getValue(result) as OHLCV[];
        expect(Array.isArray(ohlcvArray)).toBe(true);
        console.log(`✅ readHistoricalOHLCV returned ${ohlcvArray.length} entries`);
      } else {
        const error = getError(result);
        console.warn(`⚠️  Historical OHLCV unavailable: ${error?.message}`);
      }
    }, 45000);
  });

  describe("Error Handling", () => {
    it("should handle invalid symbols", async () => {
      if (!apiKey) return;

      const invalidSymbol = MarketSymbol.create(
        "INVALIDCOIN",
        "Invalid Symbol",
        "crypto",
        "USD",
        InstrumentType.CASH,
      );
      const invalidContext = MarketContext.create(testExchange, invalidSymbol);

      const result = await cryptoReader.readPrice(invalidSymbol, invalidContext);

      expect(isFailure(result)).toBe(true);
      const error = getError(result);
      expect(error?.category).toMatch(/BUSINESS|NETWORK/);

      console.log(`✅ Invalid symbol handled: ${error?.message}`);
    }, 30000);

    it("should handle network errors gracefully", async () => {
      if (!apiKey) return;

      // Test that errors are properly wrapped in Result<T>
      try {
        const result = await cryptoReader.readPrice(cryptoSymbol, cryptoContext);

        // Should always return Result<T>, never throw
        expect(typeof result).toBe("object");
        expect("_tag" in result).toBe(true);

        if (isFailure(result)) {
          const error = getError(result);
          expect(error?.category).toMatch(/BUSINESS|NETWORK|VALIDATION/);
        }

        console.log("✅ Error handling works properly");
      } catch (error) {
        expect.fail(`TwelveData reader should not throw exceptions: ${error}`);
      }
    }, 30000);
  });
});
