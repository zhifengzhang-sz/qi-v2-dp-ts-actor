#!/usr/bin/env bun

/**
 * QiCore Market Data Platform - Main Export
 *
 * Complete export of the functional programming approach to market data processing.
 * Clean DSL interfaces, data classes, and production-ready actors.
 */

// =============================================================================
// CORE DSL SYSTEM
// =============================================================================

// DSL Types and Data Classes
export * from "./dsl/types";
export * from "./dsl/interfaces";
export * from "./dsl/utils";

// Complete DSL Export
export * from "./dsl";

// =============================================================================
// MARKET DATA ACTORS
// =============================================================================

// Source Actors (Readers)
export * from "./market/crypto/actors/sources/CCXTMCPReader";
export * from "./market/multi-asset/actors/sources/TwelveDataMCPReader";
export * from "./market/stock/actors/sources/AlphaVantageMCPReader";
export * from "./market/crypto/actors/sources";

// =============================================================================
// CORE INFRASTRUCTURE
// =============================================================================

// Now using external @qi/base and @qi/core packages

// =============================================================================
// FUNCTIONAL PROGRAMMING UTILITIES
// =============================================================================

// FP Utilities and Helpers

export * from "./utils";
export * from "./types";

// =============================================================================
// BACKWARD COMPATIBILITY
// =============================================================================

// Re-export DSL for backward compatibility
export * as DSL from "./dsl";

// =============================================================================
// VERSION INFORMATION
// =============================================================================

export const VERSION = "2.0.0-fp";
export const SYSTEM_NAME = "QiCore FP Market Data Platform";
