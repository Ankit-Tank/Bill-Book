import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { dataService } from '../../services/dataService';

// Module-level in-memory cache to prevent redundant Gemini narration calls
const narrationCache = new Map<string, string>();

export interface AiInsightCardProps {
  reportType: string;
  data: Record<string, unknown>;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({
  reportType,
  data,
  title = 'KhataAI Smart Insight',
  style,
}) => {

  // Stable cache key
  const cacheKey = `${reportType}_${JSON.stringify(data)}`;

  const [narration, setNarration] = useState<string | null>(() => narrationCache.get(cacheKey) || null);
  const [loading, setLoading] = useState<boolean>(() => !narrationCache.has(cacheKey));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // If already cached, no need to fetch
    if (narrationCache.has(cacheKey)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (!dataService.narrateReport) {
          if (isMounted) setLoading(false);
          return;
        }

        const res = await dataService.narrateReport(reportType, data);
        if (isMounted) {
          if (res?.narration && res.narration.trim()) {
            narrationCache.set(cacheKey, res.narration);
            setNarration(res.narration);
          }
          setLoading(false);
        }
      } catch {
        // If narration fails, hide the card quietly
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [cacheKey, reportType, data]);

  // Text to speech readout on Web
  const handleToggleSpeak = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else if (narration) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(narration);
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  // If narration failed or returned empty, hide quietly
  if (!loading && (!narration || !narration.trim())) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.badgeWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={14} color={colors.primaryGreen} />
          </View>
          <Text style={styles.titleText}>{title}</Text>
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>Gemini AI</Text>
          </View>
        </View>

        {Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window && narration && (
          <TouchableOpacity
            style={styles.speakBtn}
            onPress={handleToggleSpeak}
            activeOpacity={0.7}
            accessibilityLabel={isSpeaking ? 'Stop speaking' : 'Read insight aloud'}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
              size={18}
              color={isSpeaking ? colors.primaryGreen : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Generating KhataAI narration...</Text>
        </View>
      ) : (
        <View style={styles.contentBody}>
          <Text style={styles.narrationText}>{narration}</Text>
          <View style={styles.footerRow}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.primaryGreen} />
            <Text style={styles.footerText}>Grounded in verified ledger transactions</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3FAF7', // Soft mint / emerald tint
    borderColor: '#BFE7DA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.darkGreenText,
    letterSpacing: 0.2,
  },
  aiTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryGreen,
    letterSpacing: 0.2,
  },
  speakBtn: {
    padding: 4,
    borderRadius: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  contentBody: {
    marginTop: 2,
  },
  narrationText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.darkGreenText,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
