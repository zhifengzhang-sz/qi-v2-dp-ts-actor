#!/usr/bin/env bun

/**
 * CCXT MCP Reader - Real Implementation
 *
 * Reads cryptocurrency market data from exchanges via CCXT MCP protocol.
 * Supports real Level1 order book data, price, and OHLCV data.
 * Connects to 100+ cryptocurrency exchanges through unified CCXT interface.
 */

import {
  type Result,
  failure,
  getError,
  getValue,
  isFailure,
  networkError,
  success,
  systemError,
  validationError,
} from "@qi/base";
import type { MarketDataReader } from "../../../../dsl/interfaces";
import {
  Exchange,
  InstrumentType,
  Level1,
  type MarketContext,
  type MarketSymbol,
  OHLCV,
  Price,
} from "../../../../dsl/types";
import type { TimeInterval } from "../../../../dsl/utils";
import { validateTimeInterval } from "../../../../utils/time-intervals";

// =============================================================================
// CCXT MCP READER
// =============================================================================

export interface CCXTMCPConfig {
  name: string;
  exchange: string; // e.g., "binance", "coinbase", "kraken"
  apiKey?: string;
  secret?: string;
  sandbox?: boolean;
  debug?: boolean;
  mcpClient?: any;
}

export class CCXTMCPReader implements MarketDataReader {
  private client: any; // MCP client will be injected
  private exchangeName: string;
  private apiCredentials?: { apiKey: string; secret: string };
  private sandbox: boolean;

  constructor(private config: CCXTMCPConfig) {
    this.client = config.mcpClient;
    this.exchangeName = config.exchange;
    this.sandbox = config.sandbox || false;

    if (config.apiKey && config.secret) {
      this.apiCredentials = {
        apiKey: config.apiKey,
        secret: config.secret,
      };
    }
  }

  // =============================================================================
  // MARKET DATA READER INTERFACE IMPLEMENTATION
  // =============================================================================

  async readPrice(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<Price | Price[]>> {
    if (symbol.assetClass !== "crypto") {
      return failure(
        validationError(`Only crypto assets are supported, got ${symbol.assetClass}`, {
          code: "UNSUPPORTED_ASSET_CLASS",
          context: { assetClass: symbol.assetClass },
        }),
      );
    }

    const formattedSymbol = this.formatSymbol(symbol);

    // For historical data, use OHLCV and extract close prices
    if (interval) {
      const validationResult = validateTimeInterval(interval);
      if (isFailure(validationResult)) {
        return validationResult;
      }

      // Get OHLCV data and convert to Price array
      const ohlcvResult = await this.readOHLCV(symbol, context, interval);
      if (isFailure(ohlcvResult)) {
        return ohlcvResult;
      }

      const ohlcvData = getValue(ohlcvResult);
      const ohlcvArray = Array.isArray(ohlcvData) ? ohlcvData : [ohlcvData];
      return success(
        ohlcvArray
          .filter((ohlcv) => ohlcv !== null)
          .map((ohlcv) => Price.create(ohlcv.timestamp, ohlcv.close, ohlcv.volume)),
      );
    }

    try {
      // Current price - use ticker data
      const result = await this.client.callTool({
        name: "get-ticker",
        arguments: {
          exchange: this.exchangeName,
          symbol: formattedSymbol,
        },
      });

      if (!result.content || !result.content[0] || !result.content[0].text) {
        return failure(
          networkError("Invalid response from CCXT MCP", {
            code: "INVALID_RESPONSE",
          }),
        );
      }

      const tickerData = JSON.parse(result.content[0].text);
      if (!tickerData || !tickerData.last) {
        return failure(
          systemError("No price data available", {
            code: "NO_DATA",
          }),
        );
      }

      return success(
        Price.create(
          new Date(tickerData.timestamp || Date.now()),
          tickerData.last,
          tickerData.baseVolume || 0,
        ),
      );
    } catch (error) {
      return failure(
        networkError(`Failed to fetch price data: ${error}`, {
          code: "FETCH_ERROR",
          cause: error,
        }),
      );
    }
  }

  async readLevel1(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<Level1 | Level1[]>> {
    if (symbol.assetClass !== "crypto") {
      return failure(
        validationError(`Only crypto assets are supported, got ${symbol.assetClass}`, {
          code: "UNSUPPORTED_ASSET_CLASS",
          context: { assetClass: symbol.assetClass },
        }),
      );
    }

    const formattedSymbol = this.formatSymbol(symbol);

    // CCXT provides real Level1 order book data
    const result = await this.client.callTool({
      name: "get-orderbook",
      arguments: {
        exchange: this.exchangeName,
        symbol: formattedSymbol,
      },
    });

    if (!result.content || !result.content[0] || !result.content[0].text) {
      return failure(
        networkError("Invalid response from CCXT MCP", {
          code: "INVALID_RESPONSE",
        }),
      );
    }

    const orderBook = JSON.parse(result.content[0].text);
    if (
      !orderBook ||
      !orderBook.bids ||
      !orderBook.asks ||
      orderBook.bids.length === 0 ||
      orderBook.asks.length === 0
    ) {
      return failure(
        systemError("No order book data available", {
          code: "NO_DATA",
        }),
      );
    }

    // Get best bid and ask
    const bestBid = orderBook.bids[0];
    const bestAsk = orderBook.asks[0];

    return success(
      Level1.create(
        new Date(orderBook.timestamp || Date.now()),
        bestBid[0], // bid price
        bestBid[1], // bid size
        bestAsk[0], // ask price
        bestAsk[1], // ask size
      ),
    );
  }

  async readOHLCV(
    symbol: MarketSymbol,
    context: MarketContext,
    interval?: TimeInterval,
  ): Promise<Result<OHLCV | OHLCV[]>> {
    if (symbol.assetClass !== "crypto") {
      return failure(
        validationError(`Only crypto assets are supported, got ${symbol.assetClass}`, {
          code: "UNSUPPORTED_ASSET_CLASS",
          context: { assetClass: symbol.assetClass },
        }),
      );
    }

    const formattedSymbol = this.formatSymbol(symbol);

    // Prepare parameters for CCXT
    const params: any = {
      exchange: this.exchangeName,
      symbol: formattedSymbol,
      timeframe: "1d", // Default timeframe
    };

    // Add time range for historical data
    if (interval) {
      const validationResult = validateTimeInterval(interval);
      if (isFailure(validationResult)) {
        return validationResult;
      }
      params.since = interval.startDate.getTime();
      params.limit = this.calculateLimit(interval, "1d");
    } else {
      // For current data, get last candle
      params.limit = 1;
    }

    const result = await this.client.callTool({
      name: "get-ohlcv",
      arguments: params,
    });

    if (!result.content || !result.content[0] || !result.content[0].text) {
      return failure(
        networkError("Invalid response from CCXT MCP", {
          code: "INVALID_RESPONSE",
        }),
      );
    }

    const ohlcvData = JSON.parse(result.content[0].text);
    if (!ohlcvData || !Array.isArray(ohlcvData)) {
      return failure(
        systemError("No OHLCV data available", {
          code: "NO_DATA",
        }),
      );
    }

    // Convert to OHLCV data classes
    const convertedData = ohlcvData.map(
      ([timestamp, open, high, low, close, volume]: [
        number,
        number,
        number,
        number,
        number,
        number,
      ]) => OHLCV.create(new Date(timestamp), open, high, low, close, volume),
    );

    // Filter by time interval if provided
    if (interval) {
      const filtered = convertedData.filter(
        (ohlcv) => ohlcv.timestamp >= interval.startDate && ohlcv.timestamp <= interval.endDate,
      );
      return success(filtered);
    }

    // Return single latest OHLCV if no time interval
    return success(
      convertedData.length > 0 ? convertedData[convertedData.length - 1] : convertedData[0],
    );
  }

  async readHistoricalPrices(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<Price[]>> {
    const result = await this.readPrice(symbol, context, interval);
    if (isFailure(result)) {
      return result;
    }
    const data = getValue(result);
    const dataArray = Array.isArray(data) ? data : [data];
    return success(dataArray.filter((item) => item !== null));
  }

  async readHistoricalLevel1(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<Level1[]>> {
    // Level1 historical data is typically not available through CCXT
    // This would require polling at intervals, which is not practical
    return failure(
      systemError("Historical Level1 data not supported by CCXT MCP Server", {
        code: "UNSUPPORTED_OPERATION",
      }),
    );
  }

  async readHistoricalOHLCV(
    symbol: MarketSymbol,
    context: MarketContext,
    interval: TimeInterval,
  ): Promise<Result<OHLCV[]>> {
    const result = await this.readOHLCV(symbol, context, interval);
    if (isFailure(result)) {
      return result;
    }
    const data = getValue(result);
    const dataArray = Array.isArray(data) ? data : [data];
    return success(dataArray.filter((item) => item !== null));
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private formatSymbol(symbol: MarketSymbol): string {
    // Format symbol for CCXT (e.g., "BTC/USD")
    return `${symbol.ticker}/${symbol.currency}`;
  }

  private calculateLimit(timeInterval: TimeInterval, timeframe: string): number {
    const diffTime = timeInterval.endDate.getTime() - timeInterval.startDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Adjust limit based on timeframe
    switch (timeframe) {
      case "1m":
        return Math.min(days * 24 * 60, 1000);
      case "5m":
        return Math.min(days * 24 * 12, 1000);
      case "15m":
        return Math.min(days * 24 * 4, 1000);
      case "1h":
        return Math.min(days * 24, 1000);
      case "4h":
        return Math.min(days * 6, 1000);
      case "1d":
        return Math.min(days, 1000);
      default:
        return Math.min(days, 1000);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createCCXTMCPReader(config: CCXTMCPConfig): CCXTMCPReader {
  return new CCXTMCPReader(config);
}
