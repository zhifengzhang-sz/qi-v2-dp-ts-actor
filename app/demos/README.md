# QiCore v-0.2.2 Demos

## Demo Naming Convention

Demos follow the pattern: `[component].[feature].ts`

- **Actor demos**: `[actor-name].[capability].ts`
- **System demos**: `[system-name].[purpose].ts`

## Available Demos

### DSL Foundation
- **`dsl.basic-usage.ts`** - Core DSL system demonstration with immutable data classes, time intervals, and basic market data operations

### MCP Actor Demonstrations  
- **`coingecko.live-data.ts`** - CoinGecko MCP actor with real external server integration, live Bitcoin/Ethereum prices
- **`ccxt.exchange-data.ts`** - CCXT MCP actor implementation patterns for 100+ cryptocurrency exchanges
- **`twelvedata.multi-asset.ts`** - TwelveData MCP actor supporting crypto, stocks, forex, and commodities

### Platform Validation
- **`platform.validation.ts`** - Complete v-0.2.0 architecture validation testing all three MCP actors (CoinGecko, CCXT, TwelveData)

## Running Demos

```bash
# Basic DSL functionality
bun run app/demos/dsl.basic-usage.ts

# Live cryptocurrency data from CoinGecko
bun run app/demos/coingecko.live-data.ts

# Exchange integration patterns
bun run app/demos/ccxt.exchange-data.ts

# Multi-asset data from TwelveData
bun run app/demos/twelvedata.multi-asset.ts

# Complete platform validation
bun run app/demos/platform.validation.ts
```

## Demo Requirements

- **TypeScript**: All demos use strict TypeScript compilation
- **Real Data**: CoinGecko uses live MCP server, others use realistic simulations
- **Environment**: TwelveData demos require `TWELVE_DATA_API_KEY` environment variable
- **Quality**: All demos must pass TypeScript and Biome checks

## Demo Purposes

| Demo | Purpose | Data Source | Status |
|------|---------|-------------|--------|
| `dsl.basic-usage.ts` | DSL foundation showcase | None | ✅ Working |
| `coingecko.live-data.ts` | Live crypto data | **Real MCP Server** | ✅ Working |
| `ccxt.exchange-data.ts` | Exchange patterns | Architecture Demo | ✅ Ready |
| `twelvedata.multi-asset.ts` | Multi-asset data | Realistic Simulation | ✅ Ready |
| `platform.validation.ts` | Complete validation | Real + Simulated | ✅ Working |

---

**Last Updated**: 2025-07-10  
**Version**: v-0.2.2 (MCP Integration Complete)