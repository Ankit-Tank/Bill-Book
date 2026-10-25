/**
 * BillBook CSV Export Utility
 * 
 * Supports both Web (instant browser file download) and Native (expo-file-system + expo-sharing).
 */

import { Platform } from 'react-native';

export async function exportAndShareCSV(csvContent: string, fileNamePrefix: string): Promise<string> {
  const sanitizedPrefix = fileNamePrefix.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `${sanitizedPrefix}_${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return fileName;
    }
    return fileName;
  }

  // Native (iOS & Android)
  try {
    const FileSystem = await import('expo-file-system') as any;
    const Sharing = await import('expo-sharing') as any;

    const docDir = FileSystem.documentDirectory || FileSystem.Paths?.documentDirectory || '';
    const fileUri = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
    });

    const isAvailable = await Sharing.isAvailableAsync?.();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${fileNamePrefix} CSV`,
        UTI: 'public.comma-separated-values-text',
      });
    }

    return fileUri;
  } catch (err: any) {
    throw new Error(`Failed to export CSV: ${err.message || 'Unknown error'}`);
  }
}
