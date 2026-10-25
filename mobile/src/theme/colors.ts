/**
 * BillBook Design Theme Tokens
 * Sourced from Section 3.5 of ROADMAP.md
 * 
 * Rules:
 * - No hard-coded colors in screens or components.
 * - Always import and reference tokens from this file.
 */

export const colors = {
  // Core Reference Tokens (Section 3.5)
  primaryGreen: '#0A5C3E',      // Headers, primary buttons
  creamBackground: '#FEFCE8',   // Main background
  goldFab: '#E3AE00',           // Center floating action button
  receivableRed: '#D6001C',     // Receivable card (DR balance / customer owes)
  onboardingDarkGreen: '#03231B', // Splash / onboarding screens
  tealAccent: '#26D9B5',        // Highlights and accents
  darkGreenText: '#0B3D2E',     // Primary typography

  // Semantic UI Mappings
  background: '#FEFCE8',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  
  // Ledger / Status Colors
  debit: '#D6001C',             // DR (Customer owes / Receivable)
  credit: '#0A5C3E',            // CR (Payment received / Settled)
  payable: '#0A5C3E',           // Payable (Shop owes / Green card)
  
  // Neutral & Border Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E5E7EB',
  
  // Typography
  textPrimary: '#0B3D2E',
  textSecondary: '#4A5568',
  textMuted: '#718096',
  textWhite: '#FFFFFF',
  
  // Alerts & Badges
  info: '#2B6CB0',
  warning: '#D69E2E',
  critical: '#D6001C',
  success: '#0A5C3E',
} as const;

export type ColorToken = keyof typeof colors;
