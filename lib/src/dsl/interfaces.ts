#!/usr/bin/env bun

/**
 * DSL Interfaces - Core Market Data Interfaces
 *
 * Clean, professional interfaces for market data operations.
 * Removed FP prefixes and lifecycle interfaces for simplicity.
 */

import type { Result } from "@qi/base";
import type { Level1, MarketContext, MarketSymbol, OHLCV, Price } from "./types.js";
import type { TimeInterval } from "./utils.js";

// =============================================================================
// CORE READER INTERFACES
// =============================================================================

/**
 * Market Data Reader Interface
 * Core interface for reading market data from various sources
 */
export interface MarketDataReader {
  /**
   * Read current price for a symbol
   */
  readPrice(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<Price | Price[]>>;

  /**
   * Read Level 1 market data (best bid/ask)
   */
  readLevel1(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<Level1 | Level1[]>>;

  /**
   * Read OHLCV data (candlestick data)
   */
  readOHLCV(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<OHLCV | OHLCV[]>>;

  /**
   * Read historical prices
   */
  readHistoricalPrices(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<Price[]>>;

  /**
   * Read historical Level 1 data
   */
  readHistoricalLevel1(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<Level1[]>>;

  /**
   * Read historical OHLCV data
   */
  readHistoricalOHLCV(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<OHLCV[]>>;
}

/**
 * Market Data Writer Interface
 * Core interface for writing market data to various destinations
 */
export interface MarketDataWriter {
  /**
   * Write a single price point
   */
  writePrice(price: Price, symbol: MarketSymbol, context: MarketContext): Promise<Result<void>>;

  /**
   * Write Level 1 market data
   */
  writeLevel1(level1: Level1, symbol: MarketSymbol, context: MarketContext): Promise<Result<void>>;

  /**
   * Write OHLCV data
   */
  writeOHLCV(ohlcv: OHLCV, symbol: MarketSymbol, context: MarketContext): Promise<Result<void>>;

  /**
   * Write batch of prices
   */
  writePrices(prices: Price[], symbol: MarketSymbol, context: MarketContext): Promise<Result<void>>;

  /**
   * Write batch of Level 1 data
   */
  writeLevel1Batch(
    level1Data: Level1[],
    symbol: MarketSymbol,
    context: MarketContext,
  ): Promise<Result<void>>;

  /**
   * Write batch of OHLCV data
   */
  writeOHLCVBatch(
    ohlcvData: OHLCV[],
    symbol: MarketSymbol,
    context: MarketContext,
  ): Promise<Result<void>>;
}

// =============================================================================
// STREAMING INTERFACES
// =============================================================================

/**
 * Streaming Market Data Reader Interface
 * For real-time market data streaming
 */
export interface StreamingReader {
  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrice(
    symbol: MarketSymbol,
    context: MarketContext,
    callback: (price: Price) => void,
  ): Promise<Result<() => void>>;

  /**
   * Subscribe to real-time Level 1 updates
   */
  subscribeToLevel1(
    symbol: MarketSymbol,
    context: MarketContext,
    callback: (level1: Level1) => void,
  ): Promise<Result<() => void>>;

  /**
   * Subscribe to real-time OHLCV updates
   */
  subscribeToOHLCV(
    symbol: MarketSymbol,
    context: MarketContext,
    callback: (ohlcv: OHLCV) => void,
  ): Promise<Result<() => void>>;

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): Promise<Result<void>>;
}

// =============================================================================
// CAPABILITY REPORTING INTERFACES
// =============================================================================

/**
 * Capability Information
 * Describes what capabilities a reader/writer supports
 */
export interface CapabilityInfo {
  supportsRealTime: boolean;
  supportsHistorical: boolean;
  supportsLevel1: boolean;
  supportsOHLCV: boolean;
  supportsStreaming: boolean;
  supportedAssetClasses: string[];
  supportedExchanges: string[];
  supportedTimeframes: string[];
  rateLimits?: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

/**
 * Capability Reporter Interface
 * For reporting what capabilities are supported
 */
export interface CapabilityReporter {
  /**
   * Get capability information
   */
  getCapabilities(): CapabilityInfo;

  /**
   * Check if a specific capability is supported
   */
  supportsCapability(capability: string): boolean;

  /**
   * Check if a symbol is supported
   */
  supportsSymbol(symbol: MarketSymbol): boolean;

  /**
   * Check if a time interval is supported
   */
  supportsTimeInterval(interval: TimeInterval): boolean;
}

// =============================================================================
// COMPOSITE INTERFACES
// =============================================================================

/**
 * Full Market Data Provider Interface
 * Combines all reader capabilities
 */
export interface MarketDataProvider extends MarketDataReader, StreamingReader, CapabilityReporter {}

/**
 * Full Market Data Sink Interface
 * Combines all writer capabilities
 */
export interface MarketDataSink extends MarketDataWriter, CapabilityReporter {}

/**
 * Bidirectional Market Data Interface
 * For components that can both read and write
 */
export interface MarketDataBridge extends MarketDataProvider, MarketDataSink {}
