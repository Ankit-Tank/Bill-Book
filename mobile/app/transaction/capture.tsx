import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, ErrorBanner, Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { captureState } from '../../src/features/capture/captureState';
import { BillPickerModal } from '../../src/features/capture/BillPickerModal';
import { VoiceRecordModal } from '../../src/features/capture/VoiceRecordModal';

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    uri?: string;
    name?: string;
  }>();

  const mode = (params.mode === 'voice' ? 'voice' : 'photo') as 'photo' | 'voice';
  const [fileUri, setFileUri] = useState<string | null>(params.uri || null);
  const [fileName, setFileName] = useState<string>(params.name || (mode === 'photo' ? 'bill.jpg' : 'voice_note.m4a'));

  // Modals for picking if none provided
  const [showPicker, setShowPicker] = useState<boolean>(!params.uri);

  // Upload & Extraction state
  const [status, setStatus] = useState<'idle' | 'uploading' | 'cancelled' | 'error' | 'success'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Preparing upload...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startExtraction = useCallback(async (uri: string) => {
    setStatus('uploading');
    setProgress(10);
    setErrorMsg(null);
    setStatusMessage(
      mode === 'photo'
        ? 'Uploading bill photo to server...'
        : 'Uploading voice recording to server...'
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const mediaType = mode === 'photo' ? 'image' : 'audio';

      const result = await dataService.extractFromMedia(uri, mediaType, {
        signal: controller.signal,
        onProgress: (pct) => {
          setProgress(pct);
          if (pct < 40) {
            setStatusMessage('Uploading media payload...');
          } else if (pct < 75) {
            setStatusMessage('Analyzing bill particulars & line items with Gemini AI...');
          } else if (pct < 100) {
            setStatusMessage('Matching party against Khata customer ledger...');
          } else {
            setStatusMessage('Extraction complete! Preparing form...');
          }
        },
      });

      setStatus('success');
      setProgress(100);

      // Save pending extraction in memory
      captureState.setPending({
        result,
        source: mode === 'photo' ? 'photo' : 'voice',
        fileUri: uri,
      });

      // Navigate to confirmation screen
      setTimeout(() => {
        router.replace('/transaction/confirm');
      }, 350);
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || controller.signal.aborted) {
        setStatus('cancelled');
        setStatusMessage('Upload cancelled by user');
      } else {
        setStatus('error');
        setErrorMsg(err?.message || 'Failed to extract transaction details from media.');
      }
    }
  }, [mode, router]);

  useEffect(() => {
    if (fileUri && status === 'idle') {
      const timer = setTimeout(() => {
        startExtraction(fileUri);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fileUri, status, startExtraction]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('cancelled');
    setStatusMessage('Upload cancelled');
  };

  const handleRetry = () => {
    if (fileUri) {
      startExtraction(fileUri);
    } else {
      setShowPicker(true);
    }
  };

  const handleChangeMedia = () => {
    handleCancel();
    setFileUri(null);
    setShowPicker(true);
    setStatus('idle');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={mode === 'photo' ? 'Scan Bill Receipt' : 'Voice Memo Entry'}
        subtitle="AI Automated Ledger Extraction"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Media Preview Card */}
        <Card variant="default" style={styles.previewCard}>
          <View style={styles.mediaRow}>
            {mode === 'photo' && fileUri ? (
              <Image source={{ uri: fileUri }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={[styles.audioIconBox, { backgroundColor: colors.debitLight }]}>
                <Ionicons
                  name={mode === 'photo' ? 'document-text-outline' : 'mic'}
                  size={32}
                  color={mode === 'photo' ? colors.primaryGreen : colors.debit}
                />
              </View>
            )}

            <View style={styles.mediaDetails}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.modeBadge,
                    { backgroundColor: mode === 'photo' ? colors.creditLight : colors.debitLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeBadgeText,
                      { color: mode === 'photo' ? colors.primaryGreen : colors.debit },
                    ]}
                  >
                    {mode === 'photo' ? 'PHOTO CAPTURE' : 'VOICE RECORDING'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              <Text style={styles.subtext}>
                {status === 'uploading'
                  ? 'Processing with Gemini Multimodal API...'
                  : status === 'cancelled'
                  ? 'Cancelled'
                  : status === 'error'
                  ? 'Extraction failed'
                  : 'Ready for processing'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Error Banner */}
        {errorMsg ? (
          <ErrorBanner
            message={errorMsg}
            onRetry={handleRetry}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {/* Progress Card */}
        {status === 'uploading' ? (
          <Card variant="cream" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <ActivityIndicator size="small" color={colors.primaryGreen} />
              <Text style={styles.statusTitle}>Scanning with AI</Text>
              <Text style={styles.pctText}>{progress}%</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(5, Math.min(100, progress))}%` },
                ]}
              />
            </View>

            <Text style={styles.statusDesc}>{statusMessage}</Text>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.7}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.debit} style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>Cancel Upload</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {/* Cancelled State Card */}
        {status === 'cancelled' ? (
          <Card variant="default" style={styles.cancelledCard}>
            <Ionicons name="stop-circle-outline" size={36} color={colors.warning} />
            <Text style={styles.cancelledTitle}>Extraction Cancelled</Text>
            <Text style={styles.cancelledDesc}>
              The upload was aborted. Your ledger remains unchanged. You can retry with this receipt or select a different file.
            </Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                activeOpacity={0.7}
                onPress={handleChangeMedia}
              >
                <Text style={styles.secondaryBtnText}>
                  {mode === 'photo' ? 'Pick Another Photo' : 'Record Again'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryBtn}
                activeOpacity={0.7}
                onPress={handleRetry}
              >
                <Ionicons name="refresh" size={16} color={colors.textWhite} style={{ marginRight: 6 }} />
                <Text style={styles.primaryBtnText}>Retry Upload</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : null}

        {/* Error State Card */}
        {status === 'error' ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.7}
              onPress={handleChangeMedia}
            >
              <Text style={styles.secondaryBtnText}>Change Source</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.7}
              onPress={handleRetry}
            >
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Manual fallback hint */}
        <TouchableOpacity
          style={styles.manualFallback}
          onPress={() => router.replace('/transaction/new')}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={colors.primaryGreen} />
          <Text style={styles.manualFallbackText}>Or enter details manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bill Picker Modal */}
      {mode === 'photo' ? (
        <BillPickerModal
          visible={showPicker}
          onClose={() => {
            setShowPicker(false);
            if (!fileUri) router.back();
          }}
          onImageSelected={(uri, name) => {
            setShowPicker(false);
            setFileUri(uri);
            if (name) setFileName(name);
            setStatus('idle');
          }}
        />
      ) : (
        <VoiceRecordModal
          visible={showPicker}
          onClose={() => {
            setShowPicker(false);
            if (!fileUri) router.back();
          }}
          onRecordingComplete={(uri, duration) => {
            setShowPicker(false);
            setFileUri(uri);
            setFileName(`voice_clip_${duration}s.m4a`);
            setStatus('idle');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  previewCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  audioIconBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDetails: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  modeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtext: {
    fontSize: 12,
    color: colors.textMuted,
  },
  progressCard: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  pctText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryGreen,
    borderRadius: 5,
  },
  statusDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.debitSubtle,
    borderWidth: 1,
    borderColor: colors.debitBorder,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.debit,
  },
  cancelledCard: {
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    marginBottom: 6,
  },
  cancelledDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
  manualFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  manualFallbackText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
});
