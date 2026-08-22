/**
 * @file index.ts
 * @description Main Frontend API barrel export module. Aggregates and re-exports core client helpers, interface definitions, and domain API service modules.
 */

// Core HTTP Client & utilities
export * from "./client";

// Domain API Services & Type Definitions
export * from "./users";
export * from "./orders";
export * from "./slots";
export * from "./inventory";
export * from "./purchaseOrders";
export * from "./alerts";
export * from "./dashboard";
export * from "./customers";
export * from "./vendors";
export * from "./products";
export * from "./salesPersons";
export * from "./deliveryNotes";
