import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { dataService } from '../../services/dataService';
import { ChatMessage, ChatToolCall } from '../../types';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ChatToolCall[];
  isError?: boolean;
}

// 20 Scripted Phase 6 Questions plus quick shopkeeper prompts
const SUGGESTED_QUESTIONS = [
  'Who owes the most money right now?',
  'Sabse zyada udhaar kiska baki hai?',
  "What is Rahul Sharma's balance?",
  'Rahul Sharma ka kitna balance baki hai?',
  "What is Priya Patel's current balance?",
  'Priya Patel ka khata batao',
  'How much money does Amit Verma owe?',
  'Amit Verma ka kitna udhaar hai?',
  "What is Sunita Devi's balance?",
  'Sunita Devi ne kitna payment kiya hai?',
  'Who are the top 3 debtors?',
  'Top debtors ki list dikhao',
  "Today's sales summary",
  'Aaj ka collection kitna hua hai?',
  'Which customers have overdue payments?',
  'Kin grahako ka payment overdue hai?',
  'Show transaction history for Rahul Sharma',
  'Rahul Sharma ka purana hisab dikhao',
  'Priya Patel ke recent transactions kya hai?',
  'Tell me Balaji Provisions Distributor balance',
];

export interface KhataChatViewProps {
  initialQuestion?: string;
}

export const KhataChatView: React.FC<KhataChatViewProps> = ({ initialQuestion }) => {
  const [messages, setMessages] = useState<UIMessage[]>(() => [
    {
      id: 'welcome-0',
      role: 'assistant',
      content:
        'Namaste! I am KhataAI, your personal shop accounting copilot. Ask me anything about customer balances, sales summaries, overdue accounts, or payment histories in English or Hindi / Hinglish.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<UIMessage>>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Typing animation
  const [dotAnim1] = useState(() => new Animated.Value(0));
  const [dotAnim2] = useState(() => new Animated.Value(0));
  const [dotAnim3] = useState(() => new Animated.Value(0));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleSendMessage = useCallback(async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setOfflineError(null);
    setInputText('');

    const userMessage: UIMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    scrollToBottom();

    try {
      // Build history for API (filter out errors and initial welcome if desired)
      const historyPayload: ChatMessage[] = messages
        .filter((m) => !m.isError && m.id !== 'welcome-0')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await dataService.sendChat(query, historyPayload);

      const assistantMessage: UIMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: response.tool_calls,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setOfflineError(err?.message || 'Could not connect to KhataAI service.');
      const errorMessage: UIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          'Unable to reach KhataAI server. Please verify your internet connection or check that the backend is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [inputText, isLoading, messages, scrollToBottom]);

  // Handle optional initial question
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      const timer = setTimeout(() => {
        handleSendMessage(initialQuestion.trim());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialQuestion, handleSendMessage]);

  // Typing animation loop
  useEffect(() => {
    if (isLoading) {
      const createLoop = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: -6,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(600 - delay),
          ])
        );
      };

      const a1 = createLoop(dotAnim1, 0);
      const a2 = createLoop(dotAnim2, 150);
      const a3 = createLoop(dotAnim3, 300);

      a1.start();
      a2.start();
      a3.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
      };
    }
  }, [isLoading, dotAnim1, dotAnim2, dotAnim3]);

  // Voice Question Input (Web Speech Recognition API)
  const toggleVoiceInput = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setOfflineError('Speech recognition is not supported in this browser.');
        return;
      }

      if (isListening) {
        speechRecognitionRef.current?.stop();
        setIsListening(false);
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN'; // Supports Hindi + Indian English / Hinglish
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setOfflineError(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputText(transcript);
            handleSendMessage(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch {
        setIsListening(false);
        setOfflineError('Could not start microphone voice dictation.');
      }
    } else {
      // Native quick voice prompt shortcut
      setInputText('Sabse zyada udhaar kiska baki hai?');
    }
  };

  const renderToolBadge = (toolCalls?: ChatToolCall[]) => {
    if (!toolCalls || toolCalls.length === 0) return null;
    const tool = toolCalls[0];
    return (
      <View style={styles.toolBadge}>
        <Ionicons name="checkmark-circle" size={13} color={colors.primaryGreen} />
        <Text style={styles.toolBadgeText}>
          {`Verified via ${tool.name}`}
        </Text>
      </View>
    );
  };

  const renderMessageItem = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAssistant,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <Ionicons name="sparkles" size={14} color={colors.primaryGreen} />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
            item.isError && styles.bubbleError,
          ]}
        >
          {!isUser && (
            <View style={styles.assistantHeader}>
              <Text style={styles.assistantName}>KhataAI</Text>
              <Text style={styles.assistantTag}>Assistant</Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              isUser ? styles.messageTextUser : styles.messageTextAssistant,
              item.isError && styles.messageTextError,
            ]}
          >
            {item.content}
          </Text>

          {renderToolBadge(item.toolCalls)}

          <Text
            style={[
              styles.timestampText,
              isUser ? styles.timestampUser : styles.timestampAssistant,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Offline Error Banner */}
      {offlineError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={colors.debit} />
          <Text style={styles.errorBannerText}>{offlineError}</Text>
          <TouchableOpacity onPress={() => setOfflineError(null)}>
            <Ionicons name="close" size={16} color={colors.debit} />
          </TouchableOpacity>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToBottom}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.typingRow}>
              <View style={styles.assistantAvatar}>
                <Ionicons name="sparkles" size={14} color={colors.primaryGreen} />
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.dotsRow}>
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dotAnim1 }] }]}
                  />
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dotAnim2 }] }]}
                  />
                  <Animated.View
                    style={[styles.dot, { transform: [{ translateY: dotAnim3 }] }]}
                  />
                </View>
                <Text style={styles.typingText}>KhataAI is querying ledger...</Text>
              </View>
            </View>
          ) : undefined
        }
      />

      {/* Suggested Questions Horizontal Bar */}
      <View style={styles.suggestedContainer}>
        <Text style={styles.suggestedTitle}>Suggested Questions:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SUGGESTED_QUESTIONS}
          keyExtractor={(item, index) => `sug-${index}`}
          contentContainerStyle={styles.suggestedList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => handleSendMessage(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        {/* Voice Input Mic Button */}
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPress={toggleVoiceInput}
          activeOpacity={0.7}
          accessibilityLabel={isListening ? 'Stop voice recording' : 'Voice search'}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={22}
            color={isListening ? colors.debit : colors.primaryGreen}
          />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.textInput}
          placeholder="Ask in Hindi or English (उदा. राहुल का कितना बाकी है?)..."
          placeholderTextColor={colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
          multiline={false}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
          ]}
          onPress={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textWhite} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.textWhite} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#BFE7DA',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  bubbleUser: {
    backgroundColor: colors.primaryGreen,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assistantName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.darkGreenText,
  },
  assistantTag: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primaryGreen,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  messageTextUser: {
    color: colors.textWhite,
  },
  messageTextAssistant: {
    color: colors.darkGreenText,
  },
  messageTextError: {
    color: colors.debit,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  toolBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampUser: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timestampAssistant: {
    color: colors.textMuted,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  typingBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 24,
    height: 14,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryGreen,
  },
  typingText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.debit,
    fontWeight: '500',
  },
  suggestedContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 4,
  },
  suggestedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestedList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BFE7DA',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BFE7DA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.darkGreenText,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
});
