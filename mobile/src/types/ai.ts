/**
 * AI Domain Types
 * Exactly matches Section 3.3 Extraction Result and Chat/Narration Contracts
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

export interface PartyCandidate {
  id: string;
  name: string;
  phone?: string | null;
  score: number; // confidence score 0.0 to 1.0
}

export interface ExtractedItem {
  name: string;
  quantity?: number;
  rate?: number;   // in paise
  amount?: number; // in paise
}

/**
 * Extraction Result matching Section 3.3 specification
 */
export interface ExtractionResult {
  party_name: string;
  party_candidates: PartyCandidate[];
  kind: 'DR' | 'CR' | string;
  amount: number; // in paise
  txn_date: string; // YYYY-MM-DD
  particulars: string;
  items: ExtractedItem[];
  confidence: number; // confidence score 0.0 to 1.0
  needs_review_fields: string[]; // list of field names needing human confirmation
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  tool_calls?: ChatToolCall[];
}

export interface NarrationRequest {
  report_type: string;
  data: Record<string, unknown>;
}

export interface NarrationResponse {
  narration: string;
}
