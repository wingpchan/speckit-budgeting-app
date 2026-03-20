import type { FormatProfileRecord } from './index';

export const LEDGER_VERSION = 2;

export const CONFIDENCE_THRESHOLD = 0.7;

export const SESSION_STORAGE_KEY = 'budgetapp_session_v1';

export const DEFAULT_CATEGORIES: string[] = [
  'Housing',
  'Groceries',
  'Transport',
  'Entertainment',
  'Utilities',
  'Health & Fitness',
  'Shopping',
  'Personal Care',
  'Eating Out',
  'Travel',
  'Holidays',
  'Subscriptions',
  'Insurance',
  'Savings & Investments',
  'Fuel',
  'Taxes',
  'Income',
  'Internal Transfer',
  'Uncategorised',
];

/**
 * Descriptions matching this list (case-insensitive, exact match) are
 * non-transactional ledger markers and MUST be silently excluded from import.
 */
export const SKIP_LIST: string[] = ['OPENING BALANCE', 'CLOSING BALANCE'];

/** Ordered keyword → category mappings; first match wins (case-insensitive substring) */
export const DEFAULT_KEYWORD_MAP: Array<{ keyword: string; category: string }> = [
  // Groceries
  { keyword: 'TESCO', category: 'Groceries' },
  { keyword: 'ASDA', category: 'Groceries' },
  { keyword: 'SAINSBURY', category: 'Groceries' },
  { keyword: 'MORRISONS', category: 'Groceries' },
  { keyword: 'WAITROSE', category: 'Groceries' },
  { keyword: 'ALDI', category: 'Groceries' },
  { keyword: 'LIDL', category: 'Groceries' },
  { keyword: 'CO-OP', category: 'Groceries' },
  { keyword: 'MARKS & SPENCER FOOD', category: 'Groceries' },
  { keyword: 'M&S FOOD', category: 'Groceries' },
  // Subscriptions
  { keyword: 'NETFLIX', category: 'Subscriptions' },
  { keyword: 'SPOTIFY', category: 'Subscriptions' },
  { keyword: 'AMAZON PRIME', category: 'Subscriptions' },
  { keyword: 'DISNEY', category: 'Subscriptions' },
  { keyword: 'APPLE.COM/BILL', category: 'Subscriptions' },
  { keyword: 'NOW TV', category: 'Subscriptions' },
  { keyword: 'SKY', category: 'Subscriptions' },
  // Eating Out
  { keyword: 'COSTA', category: 'Eating Out' },
  { keyword: 'STARBUCKS', category: 'Eating Out' },
  { keyword: 'CAFE', category: 'Eating Out' },
  { keyword: 'GREGGS', category: 'Eating Out' },
  { keyword: 'MCDONALDS', category: 'Eating Out' },
  { keyword: 'BURGER KING', category: 'Eating Out' },
  { keyword: 'KFC', category: 'Eating Out' },
  { keyword: 'PIZZA', category: 'Eating Out' },
  { keyword: 'NANDOS', category: 'Eating Out' },
  { keyword: 'SUBWAY', category: 'Eating Out' },
  // Shopping
  { keyword: 'AMAZON', category: 'Shopping' },
  { keyword: 'EBAY', category: 'Shopping' },
  { keyword: 'ASOS', category: 'Shopping' },
  { keyword: 'H&M', category: 'Shopping' },
  { keyword: 'ZARA', category: 'Shopping' },
  { keyword: 'NEXT', category: 'Shopping' },
  { keyword: 'JOHN LEWIS', category: 'Shopping' },
  { keyword: 'PRIMARK', category: 'Shopping' },
  { keyword: 'IKEA', category: 'Shopping' },
  // Transport
  { keyword: 'UBER', category: 'Transport' },
  { keyword: 'BOLT', category: 'Transport' },
  { keyword: 'TAXI', category: 'Transport' },
  { keyword: 'TRAINLINE', category: 'Transport' },
  { keyword: 'NATIONAL RAIL', category: 'Transport' },
  { keyword: 'TFL', category: 'Transport' },
  { keyword: 'BUS', category: 'Transport' },
  // Fuel
  { keyword: 'SHELL', category: 'Fuel' },
  { keyword: 'BP', category: 'Fuel' },
  { keyword: 'ESSO', category: 'Fuel' },
  { keyword: 'TEXACO', category: 'Fuel' },
  { keyword: 'MOTO', category: 'Fuel' },
  { keyword: 'FUEL', category: 'Fuel' },
  // Holidays
  { keyword: 'HOLIDAY INN', category: 'Holidays' },
  { keyword: 'AIRBNB', category: 'Holidays' },
  { keyword: 'BOOKING.COM', category: 'Holidays' },
  { keyword: 'EXPEDIA', category: 'Holidays' },
  { keyword: 'EASYJET', category: 'Holidays' },
  { keyword: 'RYANAIR', category: 'Holidays' },
  { keyword: 'BRITISH AIRWAYS', category: 'Holidays' },
  // Travel
  { keyword: 'HOTEL', category: 'Travel' },
  { keyword: 'HILTON', category: 'Travel' },
  { keyword: 'MARRIOTT', category: 'Travel' },
  { keyword: 'TRAVELODGE', category: 'Travel' },
  { keyword: 'PREMIER INN', category: 'Travel' },
  // Health & Fitness
  { keyword: 'GYM', category: 'Health & Fitness' },
  { keyword: 'FITNESS', category: 'Health & Fitness' },
  { keyword: 'PUREGYM', category: 'Health & Fitness' },
  { keyword: 'DAVID LLOYD', category: 'Health & Fitness' },
  { keyword: 'NUFFIELD', category: 'Health & Fitness' },
  { keyword: 'NHS', category: 'Health & Fitness' },
  { keyword: 'HOSPITAL', category: 'Health & Fitness' },
  { keyword: 'DOCTOR', category: 'Health & Fitness' },
  { keyword: 'BUPA', category: 'Health & Fitness' },
  // Personal Care
  { keyword: 'BOOTS', category: 'Personal Care' },
  { keyword: 'SUPERDRUG', category: 'Personal Care' },
  { keyword: 'PHARMACY', category: 'Personal Care' },
  { keyword: 'DENTIST', category: 'Personal Care' },
  // Housing
  { keyword: 'MORTGAGE', category: 'Housing' },
  { keyword: 'RENT', category: 'Housing' },
  { keyword: 'GROUND RENT', category: 'Housing' },
  // Utilities
  { keyword: 'GAS', category: 'Utilities' },
  { keyword: 'ELECTRIC', category: 'Utilities' },
  { keyword: 'WATER', category: 'Utilities' },
  { keyword: 'BROADBAND', category: 'Utilities' },
  { keyword: 'BT', category: 'Utilities' },
  { keyword: 'VIRGIN MEDIA', category: 'Utilities' },
  { keyword: 'EDF', category: 'Utilities' },
  { keyword: 'BRITISH GAS', category: 'Utilities' },
  // Insurance
  { keyword: 'DIRECT LINE', category: 'Insurance' },
  { keyword: 'AVIVA', category: 'Insurance' },
  { keyword: 'LV=', category: 'Insurance' },
  { keyword: 'ADMIRAL', category: 'Insurance' },
  { keyword: 'AXA', category: 'Insurance' },
  // Taxes (COUNCIL TAX REFUND before TAX to avoid broad TAX match swallowing it incorrectly)
  { keyword: 'HMRC', category: 'Taxes' },
  { keyword: 'COUNCIL TAX REFUND', category: 'Taxes' },
  { keyword: 'TAX', category: 'Taxes' },
  // Income
  { keyword: 'SALARY', category: 'Income' },
  { keyword: 'PAYROLL', category: 'Income' },
  { keyword: 'BACS CREDIT', category: 'Income' },
  { keyword: 'WAGES', category: 'Income' },
  // Internal Transfer
  { keyword: 'TRANSFER TO', category: 'Internal Transfer' },
  { keyword: 'TRANSFER FROM', category: 'Internal Transfer' },
  { keyword: 'SAVINGS TRANSFER', category: 'Internal Transfer' },
  { keyword: 'PAYMENT RECEIVED', category: 'Internal Transfer' },
  { keyword: 'PAYMENT THANK YOU', category: 'Internal Transfer' },
  { keyword: 'BALANCE TRANSFER', category: 'Internal Transfer' },
  { keyword: 'DIRECT DEBIT PAYMENT', category: 'Internal Transfer' },
  { keyword: 'CREDIT CARD PAYMENT', category: 'Internal Transfer' },
];

export const REFERENCE_FORMAT_PROFILES: Omit<FormatProfileRecord, 'createdDate'>[] = [
  {
    type: 'formatProfile',
    profileName: 'Nationwide Current Account',
    detectionHints: {
      metadataRowCount: 3,
      dateFormat: 'DD Mon YYYY',
      headerSignatures: ['Paid out', 'Paid in', 'Balance'],
      confidenceThreshold: 0.8,
    },
    columnMappings: [
      { sourceHeader: 'Date', canonicalField: 'date', transform: 'parseDDMonYYYY' },
      { sourceHeader: 'Transactions', canonicalField: 'description' },
      { sourceHeader: 'Paid out', canonicalField: 'paidOut', transform: 'stripPound' },
      { sourceHeader: 'Paid in', canonicalField: 'paidIn', transform: 'stripPound' },
      { sourceHeader: 'Balance', canonicalField: 'balance', transform: 'stripPound' },
    ],
  },
  {
    type: 'formatProfile',
    profileName: 'Nationwide Credit Card',
    detectionHints: {
      metadataRowCount: 3,
      dateFormat: 'DD Mon YYYY',
      headerSignatures: ['Paid out', 'Paid in', 'Location'],
      confidenceThreshold: 0.8,
    },
    columnMappings: [
      { sourceHeader: 'Date', canonicalField: 'date', transform: 'parseDDMonYYYY' },
      { sourceHeader: 'Transactions', canonicalField: 'description' },
      { sourceHeader: 'Location', canonicalField: 'ignore' },
      { sourceHeader: 'Paid out', canonicalField: 'paidOut', transform: 'stripPound' },
      { sourceHeader: 'Paid in', canonicalField: 'paidIn', transform: 'stripPound' },
    ],
  },
  {
    type: 'formatProfile',
    profileName: 'NewDay Credit Card',
    detectionHints: {
      metadataRowCount: 0,
      dateFormat: 'DD/MM/YYYY',
      headerSignatures: ['Date', 'Description', 'Amount'],
      confidenceThreshold: 0.7,
    },
    columnMappings: [
      { sourceHeader: 'Date', canonicalField: 'date', transform: 'parseUKDate' },
      { sourceHeader: 'Description', canonicalField: 'description' },
      { sourceHeader: 'Amount', canonicalField: 'amount' },
    ],
  },
];
