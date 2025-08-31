#!/usr/bin/env bun

/**
 * DSL Interfaces Unit Tests
 *
 * Tests interface compliance and capability structures.
 * Focuses on type safety and interface contracts without mocking external systems.
 */

import { type Result, failure, success, systemError, validationError } from "@qi/base";
import type {
  CapabilityInfo,
  CapabilityReporter,
  MarketDataBridge,
  MarketDataProvider,
  MarketDataReader,
  MarketDataSink,
  MarketDataWriter,
  StreamingReader,
} from "@qi/core";
import {
  Exchange,
  InstrumentType,
  Level1,
  MarketContext,
  MarketSymbol,
  OHLCV,
  Price,
} from "@qi/core";
import { type TimeInterval, createTimeInterval } from "@qi/dp/utils";
import { describe, expect, it } from "vitest";

describe("DSL Interfaces", () => {
  // Test data setup
  const testExchange = Exchange.create("TEST", "Test Exchange", "Global", "centralized");
  const testSymbol = MarketSymbol.create(
    "BTC/USD",
    "Bitcoin",
    "crypto",
    "USD",
    InstrumentType.CASH,
  );
  const testContext = MarketContext.create(testExchange, testSymbol);
  const testTimestamp = new Date("2024-01-01T12:00:00Z");
  const testPrice = Price.create(testTimestamp, 50000, 1.5);
  const testLevel1 = Level1.create(testTimestamp, 49900, 1.2, 50100, 1.8);
  const testOHLCV = OHLCV.create(testTimestamp, 49800, 50200, 49700, 50000, 100);

  describe("CapabilityInfo", () => {
    it("should define complete capability information structure", () => {
      const capabilities: CapabilityInfo = {
        supportsRealTime: true,
        supportsHistorical: true,
        supportsLevel1: true,
        supportsOHLCV: true,
        supportsStreaming: true,
        supportedAssetClasses: ["crypto", "equity"],
        supportedExchanges: ["BINANCE", "COINBASE"],
        supportedTimeframes: ["1m", "5m", "1h", "1d"],
        rateLimits: {
          requestsPerSecond: 10,
          requestsPerMinute: 600,
          requestsPerHour: 36000,
        },
      };

      expect(capabilities.supportsRealTime).toBe(true);
      expect(capabilities.supportsHistorical).toBe(true);
      expect(capabilities.supportsLevel1).toBe(true);
      expect(capabilities.supportsOHLCV).toBe(true);
      expect(capabilities.supportsStreaming).toBe(true);
      expect(capabilities.supportedAssetClasses).toContain("crypto");
      expect(capabilities.supportedExchanges).toContain("BINANCE");
      expect(capabilities.supportedTimeframes).toContain("1m");
      expect(capabilities.rateLimits?.requestsPerSecond).toBe(10);
    });

    it("should allow optional rate limits", () => {
      const capabilities: CapabilityInfo = {
        supportsRealTime: false,
        supportsHistorical: true,
        supportsLevel1: false,
        supportsOHLCV: true,
        supportsStreaming: false,
        supportedAssetClasses: ["crypto"],
        supportedExchanges: ["BINANCE"],
        supportedTimeframes: ["1d"],
      };

      expect(capabilities.rateLimits).toBeUndefined();
    });
  });

  describe("CapabilityReporter Interface", () => {
    it("should implement all required methods", () => {
      class TestCapabilityReporter implements CapabilityReporter {
        private capabilities: CapabilityInfo = {
          supportsRealTime: true,
          supportsHistorical: true,
          supportsLevel1: true,
          supportsOHLCV: true,
          supportsStreaming: true,
          supportedAssetClasses: ["crypto"],
          supportedExchanges: ["BINANCE"],
          supportedTimeframes: ["1m", "5m", "1h"],
        };

        getCapabilities(): CapabilityInfo {
          return this.capabilities;
        }

        supportsCapability(capability: string): boolean {
          switch (capability) {
            case "realtime":
              return this.capabilities.supportsRealTime;
            case "historical":
              return this.capabilities.supportsHistorical;
            case "level1":
              return this.capabilities.supportsLevel1;
            case "ohlcv":
              return this.capabilities.supportsOHLCV;
            case "streaming":
              return this.capabilities.supportsStreaming;
            default:
              return false;
          }
        }

        supportsSymbol(symbol: MarketSymbol): boolean {
          return this.capabilities.supportedAssetClasses.includes(symbol.assetClass);
        }

        supportsTimeInterval(interval: TimeInterval): boolean {
          // In a real implementation, this would check if the interval duration
          // matches supported timeframes
          return true;
        }
      }

      const reporter = new TestCapabilityReporter();
      const capabilities = reporter.getCapabilities();

      expect(capabilities.supportsRealTime).toBe(true);
      expect(reporter.supportsCapability("realtime")).toBe(true);
      expect(reporter.supportsCapability("invalid")).toBe(false);
      expect(reporter.supportsSymbol(testSymbol)).toBe(true);
      const validInterval = createTimeInterval(new Date("2024-01-01"), new Date("2024-01-02"));
      expect(reporter.supportsTimeInterval(validInterval)).toBe(true);
    });
  });

  describe("MarketDataReader Interface", () => {
    it("should define all required read methods", () => {
      class TestMarketDataReader implements MarketDataReader {
        async readPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Price | Price[]>> {
          return success(testPrice);
        }

        async readLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Level1 | Level1[]>> {
          return success(testLevel1);
        }

        async readOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<OHLCV | OHLCV[]>> {
          return success(testOHLCV);
        }

        async readHistoricalPrices(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Price[]>> {
          return success([testPrice]);
        }

        async readHistoricalLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Level1[]>> {
          return success([testLevel1]);
        }

        async readHistoricalOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<OHLCV[]>> {
          return success([testOHLCV]);
        }
      }

      const reader = new TestMarketDataReader();
      expect(reader.readPrice).toBeDefined();
      expect(reader.readLevel1).toBeDefined();
      expect(reader.readOHLCV).toBeDefined();
      expect(reader.readHistoricalPrices).toBeDefined();
      expect(reader.readHistoricalLevel1).toBeDefined();
      expect(reader.readHistoricalOHLCV).toBeDefined();
    });

    it("should handle success and failure cases", async () => {
      class TestMarketDataReader implements MarketDataReader {
        private shouldFail = false;

        setFailureMode(fail: boolean) {
          this.shouldFail = fail;
        }

        async readPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Price | Price[]>> {
          if (this.shouldFail) {
            return failure(systemError("Price read failed", { code: "READ_FAILED" }));
          }
          return success(testPrice);
        }

        async readLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Level1 | Level1[]>> {
          if (this.shouldFail) {
            return failure(systemError("Level1 read failed", { code: "READ_FAILED" }));
          }
          return success(testLevel1);
        }

        async readOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<OHLCV | OHLCV[]>> {
          if (this.shouldFail) {
            return failure(systemError("OHLCV read failed", { code: "READ_FAILED" }));
          }
          return success(testOHLCV);
        }

        async readHistoricalPrices(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Price[]>> {
          if (this.shouldFail) {
            return failure(systemError("Historical prices read failed", { code: "READ_FAILED" }));
          }
          return success([testPrice]);
        }

        async readHistoricalLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Level1[]>> {
          if (this.shouldFail) {
            return failure(systemError("Historical Level1 read failed", { code: "READ_FAILED" }));
          }
          return success([testLevel1]);
        }

        async readHistoricalOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<OHLCV[]>> {
          if (this.shouldFail) {
            return failure(systemError("Historical OHLCV read failed", { code: "READ_FAILED" }));
          }
          return success([testOHLCV]);
        }
      }

      const reader = new TestMarketDataReader();

      // Test success cases
      const priceResult = await reader.readPrice(testSymbol, testContext);
      expect(priceResult.tag).toBe("success");

      const level1Result = await reader.readLevel1(testSymbol, testContext);
      expect(level1Result.tag).toBe("success");

      // Test failure cases
      reader.setFailureMode(true);
      const failedPriceResult = await reader.readPrice(testSymbol, testContext);
      expect(failedPriceResult.tag).toBe("failure");

      const failedLevel1Result = await reader.readLevel1(testSymbol, testContext);
      expect(failedLevel1Result.tag).toBe("failure");
    });
  });

  describe("MarketDataWriter Interface", () => {
    it("should define all required write methods", () => {
      class TestMarketDataWriter implements MarketDataWriter {
        async writePrice(
          price: Price,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeLevel1(
          level1: Level1,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeOHLCV(
          ohlcv: OHLCV,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writePrices(
          prices: Price[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeLevel1Batch(
          level1Data: Level1[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeOHLCVBatch(
          ohlcvData: OHLCV[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }
      }

      const writer = new TestMarketDataWriter();
      expect(writer.writePrice).toBeDefined();
      expect(writer.writeLevel1).toBeDefined();
      expect(writer.writeOHLCV).toBeDefined();
      expect(writer.writePrices).toBeDefined();
      expect(writer.writeLevel1Batch).toBeDefined();
      expect(writer.writeOHLCVBatch).toBeDefined();
    });

    it("should handle success and failure cases", async () => {
      class TestMarketDataWriter implements MarketDataWriter {
        private shouldFail = false;

        setFailureMode(fail: boolean) {
          this.shouldFail = fail;
        }

        async writePrice(
          price: Price,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("Price write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }

        async writeLevel1(
          level1: Level1,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("Level1 write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }

        async writeOHLCV(
          ohlcv: OHLCV,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("OHLCV write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }

        async writePrices(
          prices: Price[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("Batch prices write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }

        async writeLevel1Batch(
          level1Data: Level1[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("Batch Level1 write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }

        async writeOHLCVBatch(
          ohlcvData: OHLCV[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          if (this.shouldFail) {
            return failure(systemError("Batch OHLCV write failed", { code: "WRITE_FAILED" }));
          }
          return success(void 0);
        }
      }

      const writer = new TestMarketDataWriter();

      // Test success cases
      const priceResult = await writer.writePrice(testPrice, testSymbol, testContext);
      expect(priceResult.tag).toBe("success");

      const batchResult = await writer.writePrices([testPrice], testSymbol, testContext);
      expect(batchResult.tag).toBe("success");

      // Test failure cases
      writer.setFailureMode(true);
      const failedPriceResult = await writer.writePrice(testPrice, testSymbol, testContext);
      expect(failedPriceResult.tag).toBe("failure");

      const failedBatchResult = await writer.writePrices([testPrice], testSymbol, testContext);
      expect(failedBatchResult.tag).toBe("failure");
    });
  });

  describe("StreamingReader Interface", () => {
    it("should define all required streaming methods", () => {
      class TestStreamingReader implements StreamingReader {
        async subscribeToPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (price: Price) => void,
        ) {
          // Return unsubscribe function
          return success(() => {});
        }

        async subscribeToLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (level1: Level1) => void,
        ) {
          return success(() => {});
        }

        async subscribeToOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (ohlcv: OHLCV) => void,
        ) {
          return success(() => {});
        }

        async unsubscribeAll() {
          return success(void 0);
        }
      }

      const reader = new TestStreamingReader();
      expect(reader.subscribeToPrice).toBeDefined();
      expect(reader.subscribeToLevel1).toBeDefined();
      expect(reader.subscribeToOHLCV).toBeDefined();
      expect(reader.unsubscribeAll).toBeDefined();
    });

    it("should handle callback functions correctly", async () => {
      class TestStreamingReader implements StreamingReader {
        async subscribeToPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (price: Price) => void,
        ) {
          // Simulate calling the callback
          setTimeout(() => callback(testPrice), 0);
          return success(() => {});
        }

        async subscribeToLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (level1: Level1) => void,
        ) {
          setTimeout(() => callback(testLevel1), 0);
          return success(() => {});
        }

        async subscribeToOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (ohlcv: OHLCV) => void,
        ) {
          setTimeout(() => callback(testOHLCV), 0);
          return success(() => {});
        }

        async unsubscribeAll() {
          return success(void 0);
        }
      }

      const reader = new TestStreamingReader();
      let receivedPrice: Price | null = null;
      let receivedLevel1: Level1 | null = null;

      const priceResult = await reader.subscribeToPrice(testSymbol, testContext, (price) => {
        receivedPrice = price;
      });

      const level1Result = await reader.subscribeToLevel1(testSymbol, testContext, (level1) => {
        receivedLevel1 = level1;
      });

      expect(priceResult.tag).toBe("success");
      expect(level1Result.tag).toBe("success");

      // Wait for callbacks to be called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(receivedPrice).toBe(testPrice);
      expect(receivedLevel1).toBe(testLevel1);
    });
  });

  describe("Composite Interfaces", () => {
    it("should implement MarketDataProvider interface", () => {
      class TestMarketDataProvider implements MarketDataProvider {
        // MarketDataReader methods
        async readPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Price | Price[]>> {
          return success(testPrice);
        }

        async readLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Level1 | Level1[]>> {
          return success(testLevel1);
        }

        async readOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<OHLCV | OHLCV[]>> {
          return success(testOHLCV);
        }

        async readHistoricalPrices(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Price[]>> {
          return success([testPrice]);
        }

        async readHistoricalLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Level1[]>> {
          return success([testLevel1]);
        }

        async readHistoricalOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<OHLCV[]>> {
          return success([testOHLCV]);
        }

        // StreamingReader methods
        async subscribeToPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (price: Price) => void,
        ) {
          return success(() => {});
        }

        async subscribeToLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (level1: Level1) => void,
        ) {
          return success(() => {});
        }

        async subscribeToOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (ohlcv: OHLCV) => void,
        ) {
          return success(() => {});
        }

        async unsubscribeAll() {
          return success(void 0);
        }

        // CapabilityReporter methods
        getCapabilities(): CapabilityInfo {
          return {
            supportsRealTime: true,
            supportsHistorical: true,
            supportsLevel1: true,
            supportsOHLCV: true,
            supportsStreaming: true,
            supportedAssetClasses: ["crypto"],
            supportedExchanges: ["TEST"],
            supportedTimeframes: ["1m"],
          };
        }

        supportsCapability(capability: string): boolean {
          return true;
        }

        supportsSymbol(symbol: MarketSymbol): boolean {
          return symbol.assetClass === "crypto";
        }

        supportsTimeInterval(interval: TimeInterval): boolean {
          return true;
        }
      }

      const provider = new TestMarketDataProvider();

      // Test that it implements all required interfaces
      expect(provider.readPrice).toBeDefined();
      expect(provider.subscribeToPrice).toBeDefined();
      expect(provider.getCapabilities).toBeDefined();

      const capabilities = provider.getCapabilities();
      expect(capabilities.supportsRealTime).toBe(true);
    });

    it("should implement MarketDataBridge interface", () => {
      class TestMarketDataBridge implements MarketDataBridge {
        // MarketDataReader methods
        async readPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Price | Price[]>> {
          return success(testPrice);
        }

        async readLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<Level1 | Level1[]>> {
          return success(testLevel1);
        }

        async readOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval?: TimeInterval,
        ): Promise<Result<OHLCV | OHLCV[]>> {
          return success(testOHLCV);
        }

        async readHistoricalPrices(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Price[]>> {
          return success([testPrice]);
        }

        async readHistoricalLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<Level1[]>> {
          return success([testLevel1]);
        }

        async readHistoricalOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          interval: TimeInterval,
        ): Promise<Result<OHLCV[]>> {
          return success([testOHLCV]);
        }

        // StreamingReader methods
        async subscribeToPrice(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (price: Price) => void,
        ) {
          return success(() => {});
        }

        async subscribeToLevel1(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (level1: Level1) => void,
        ) {
          return success(() => {});
        }

        async subscribeToOHLCV(
          symbol: MarketSymbol,
          context: MarketContext,
          callback: (ohlcv: OHLCV) => void,
        ) {
          return success(() => {});
        }

        async unsubscribeAll() {
          return success(void 0);
        }

        // MarketDataWriter methods
        async writePrice(
          price: Price,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeLevel1(
          level1: Level1,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeOHLCV(
          ohlcv: OHLCV,
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writePrices(
          prices: Price[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeLevel1Batch(
          level1Data: Level1[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        async writeOHLCVBatch(
          ohlcvData: OHLCV[],
          symbol: MarketSymbol,
          context: MarketContext,
        ): Promise<Result<void>> {
          return success(void 0);
        }

        // CapabilityReporter methods
        getCapabilities(): CapabilityInfo {
          return {
            supportsRealTime: true,
            supportsHistorical: true,
            supportsLevel1: true,
            supportsOHLCV: true,
            supportsStreaming: true,
            supportedAssetClasses: ["crypto"],
            supportedExchanges: ["TEST"],
            supportedTimeframes: ["1m"],
          };
        }

        supportsCapability(capability: string): boolean {
          return true;
        }

        supportsSymbol(symbol: MarketSymbol): boolean {
          return symbol.assetClass === "crypto";
        }

        supportsTimeInterval(interval: TimeInterval): boolean {
          return true;
        }
      }

      const bridge = new TestMarketDataBridge();

      // Test that it implements all required interfaces (read, write, stream, capabilities)
      expect(bridge.readPrice).toBeDefined();
      expect(bridge.writePrice).toBeDefined();
      expect(bridge.subscribeToPrice).toBeDefined();
      expect(bridge.getCapabilities).toBeDefined();

      const capabilities = bridge.getCapabilities();
      expect(capabilities.supportsRealTime).toBe(true);
    });
  });
});
