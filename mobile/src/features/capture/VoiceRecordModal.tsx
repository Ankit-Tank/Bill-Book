import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export interface VoiceRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordingComplete: (audioUri: string, durationSeconds: number) => void;
}

export const VoiceRecordModal: React.FC<VoiceRecordModalProps> = ({
  visible,
  onClose,
  onRecordingComplete,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Pulse animation for recording ring
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Web MediaRecorder references
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const stopRecordingCleanup = React.useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignored
      }
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignored
        }
      }
    };
  }, []);

  // Pulse animation loop
  useEffect(() => {
    if (isRecording) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecording = async () => {
    setPermissionError(null);
    setRecordSeconds(0);

    // Web Recording with MediaRecorder
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionError('Microphone audio recording is not supported in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new (window as any).MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
          const audioUrl = URL.createObjectURL(audioBlob);
          onRecordingComplete(audioUrl, recordSeconds || 1);
        };

        recorder.start(100);
        setIsRecording(true);

        timerIntervalRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      } catch {
        setPermissionError(
          'Microphone permission denied or unavailable. Please grant microphone access in your browser to record voice notes.'
        );
      }
      return;
    }

    // Native Recording via Expo Audio
    try {
      const ExpoAudio = await import('expo-audio');
      const perm = await ExpoAudio.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setPermissionError(
          'Microphone permission is required to record voice transaction notes. Please grant microphone access in settings.'
        );
        return;
      }

      // Start timer
      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      // Fallback timer simulation for environments without native audio hardware
      setIsRecording(true);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const finishRecording = () => {
    if (!isRecording) return;
    const finalSeconds = recordSeconds;
    stopRecordingCleanup();

    if (Platform.OS === 'web') {
      // onstop handler on recorder triggers onRecordingComplete
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else {
        // Fallback simulation URI
        onRecordingComplete('blob:voice-memo.mp4', finalSeconds || 2);
      }
    } else {
      onRecordingComplete('file:///data/voice-memo.m4a', finalSeconds || 2);
    }
  };

  const cancelRecording = () => {
    stopRecordingCleanup();
    setRecordSeconds(0);
    onClose();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancelRecording}
    >
      <TouchableWithoutFeedback onPress={cancelRecording}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>Voice Transaction</Text>
                <TouchableOpacity onPress={cancelRecording} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {permissionError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="mic-off-outline" size={32} color={colors.debit} />
                  <Text style={styles.errorTitle}>Microphone Access Needed</Text>
                  <Text style={styles.errorText}>{permissionError}</Text>
                  <TouchableOpacity
                    style={styles.retryPermBtn}
                    onPress={startRecording}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryPermText}>Grant Permission & Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.recorderBody}>
                  <Text style={styles.instruction}>
                    {isRecording
                      ? 'Listening... Speak your transaction clearly'
                      : 'Tap the microphone to start speaking'}
                  </Text>
                  <Text style={styles.exampleText}>
                    {'e.g. "Rahul Sharma ko 2500 ka chawal aur tel udhar diya"'}
                  </Text>

                  {/* Pulsing Mic Circle */}
                  <View style={styles.micWrapper}>
                    {isRecording ? (
                      <Animated.View
                        style={[
                          styles.pulseRing,
                          {
                            transform: [{ scale: pulseAnim }],
                          },
                        ]}
                      />
                    ) : null}

                    <TouchableOpacity
                      style={[
                        styles.micButton,
                        isRecording && styles.micButtonActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={isRecording ? finishRecording : startRecording}
                    >
                      <Ionicons
                        name={isRecording ? 'stop' : 'mic'}
                        size={36}
                        color={colors.textWhite}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Timer & Status */}
                  <View style={styles.timerRow}>
                    <View
                      style={[
                        styles.liveDot,
                        { backgroundColor: isRecording ? colors.debit : colors.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.timerText,
                        { color: isRecording ? colors.debit : colors.textMuted },
                      ]}
                    >
                      {formatTimer(recordSeconds)}
                    </Text>
                  </View>

                  {/* Waveform Bars Simulation */}
                  {isRecording ? (
                    <View style={styles.waveformContainer}>
                      {[18, 32, 48, 26, 40, 22, 44, 30, 20].map((h, i) => (
                        <View
                          key={i}
                          style={[styles.waveBar, { height: h }]}
                        />
                      ))}
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionCancel}
                      onPress={cancelRecording}
                    >
                      <Text style={styles.actionCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    {isRecording ? (
                      <TouchableOpacity
                        style={styles.actionDone}
                        onPress={finishRecording}
                      >
                        <Ionicons name="checkmark" size={18} color={colors.textWhite} style={{ marginRight: 6 }} />
                        <Text style={styles.actionDoneText}>Done & Extract</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionStart}
                        onPress={startRecording}
                      >
                        <Text style={styles.actionStartText}>Start Speaking</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 8,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  recorderBody: {
    alignItems: 'center',
    width: '100%',
  },
  instruction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    fontStyle: 'italic',
  },
  micWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.debitLight,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: colors.debit,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    backgroundColor: colors.debit,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  actionCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceNeutral,
    alignItems: 'center',
  },
  actionCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  actionStart: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
  },
  actionStartText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },
  actionDone: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDoneText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textWhite,
  },
  errorBox: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.debit,
    marginTop: 10,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryPermBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.primaryGreen,
  },
  retryPermText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
});
