import { ExtractionResult } from '../../types';

export interface PendingCaptureData {
  result: ExtractionResult;
  source: 'photo' | 'voice';
  fileUri: string;
}

let pendingCapture: PendingCaptureData | null = null;

export const captureState = {
  setPending(data: PendingCaptureData | null) {
    pendingCapture = data;
  },
  getPending(): PendingCaptureData | null {
    return pendingCapture;
  },
  clear() {
    pendingCapture = null;
  },
};
