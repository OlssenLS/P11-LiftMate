import { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUp, Info, Sparkles } from 'lucide-react-native';

import { Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { selectionTick } from '@/lib/haptics';
import {
  useActiveCoachConversation,
  useCoachStatus,
  useSendMessage,
  useSuggestedQuestions,
} from '@/features/coach';

export function CoachSheetContent({ prefill }: { prefill?: string | null } = {}) {
  const { colors, radius, spacing, fontSize, fontWeight, icons } = useTokens();
  const [inputText, setInputText] = useState(prefill ?? '');
  const [errorText, setErrorText] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: conversation, isLoading, isError, refetch } =
    useActiveCoachConversation();
  const { data: coachStatus } = useCoachStatus();
  const { data: suggestedQuestionsData } = useSuggestedQuestions();
  const sendMessageMutation = useSendMessage();

  const messages = conversation?.messages || [];
  const suggestions = suggestedQuestionsData?.suggestions || [];

  // Auto scroll to bottom when messages change or generation status changes
  useEffect(() => {
    if (messages.length > 0 || sendMessageMutation.isPending) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [messages.length, sendMessageMutation.isPending]);

  const handleSend = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || !conversation?.id || sendMessageMutation.isPending) return;

    selectionTick();
    setInputText('');
    setErrorText(null);

    sendMessageMutation.mutate(
      {
        conversationId: conversation.id,
        content,
      },
      {
        onError: (err: any) => {
          if (!textToSend) {
            setInputText(content);
          }
          const status = err?.response?.status;
          if (status === 429) {
            setErrorText(t('coach.quotaExceeded'));
          } else {
            setErrorText(t('coach.errorRetry'));
          }
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, gap: spacing.sm, paddingBottom: spacing.sm }}>
        {/* Safety & Medical Disclaimer Banner (§43, §68) */}
        <View
          style={[
            styles.disclaimerBanner,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.hairline,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Info
            size={18}
            color={colors.inkMutedText}
            strokeWidth={icons.strokeWidth}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              color: colors.inkMutedText,
              fontSize: fontSize.caption,
              lineHeight: 18,
            }}
          >
            {t('coach.disclaimer')}
          </Text>
        </View>

        {/* Runtime Diagnostics & API Status Bar */}
        {coachStatus ? (
          <View
            style={[
              styles.statusBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.hairline,
                borderRadius: radius.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: coachStatus.mode === 'live_gemini' ? colors.success : '#D97706',
                  }}
                />
                <Text
                  style={{
                    color: colors.ink,
                    fontSize: fontSize.caption,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {coachStatus.mode === 'live_gemini' ? 'Live Gemini AI' : 'Deterministic Engine'}
                </Text>
                <Text
                  style={{
                    color: colors.inkMutedText,
                    fontSize: fontSize.caption,
                  }}
                >
                  {coachStatus.mode === 'live_gemini'
                    ? `(${coachStatus.model})`
                    : '(Free Fallback)'}
                </Text>
              </View>

              <Text
                style={{
                  color: colors.inkMutedText,
                  fontSize: fontSize.caption,
                }}
              >
                {coachStatus.rateLimit.remainingToday}/{coachStatus.rateLimit.dailyLimit} daily quota
              </Text>
            </View>
          </View>
        ) : null}

        {/* Chat Thread */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={[styles.chatContent, { gap: spacing.md }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0 || sendMessageMutation.isPending) {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          {isLoading ? (
            <View style={{ paddingVertical: spacing.xxl, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : isError ? (
            <Pressable
              onPress={() => refetch()}
              style={{ paddingVertical: spacing.xl, alignItems: 'center' }}
            >
              <Text style={{ color: colors.danger, fontSize: fontSize.secondary }}>
                {t('coach.unavailable')}
              </Text>
              <Text
                style={{
                  color: colors.accentText,
                  fontSize: fontSize.caption,
                  marginTop: spacing.xs,
                  fontWeight: fontWeight.bold,
                }}
              >
                Tap to reconnect
              </Text>
            </Pressable>
          ) : messages.length === 0 ? (
            <Card padding="xl">
              <EmptyState
                title={t('coach.emptyTitle')}
                description={t('coach.emptyDescription')}
                icon={
                  <Sparkles
                    size={40}
                    color={colors.accent}
                    strokeWidth={icons.strokeWidth}
                  />
                }
              />
            </Card>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              const formattedTime = new Date(m.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              if (isUser) {
                return (
                  <View key={m.id} style={styles.userBubbleContainer}>
                    <View
                      style={[
                        styles.userBubble,
                        {
                          backgroundColor: colors.ink,
                          borderRadius: radius.lg,
                          padding: spacing.md,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.surface,
                          fontSize: fontSize.body,
                          lineHeight: 22,
                        }}
                      >
                        {m.content}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.inkMutedText,
                        fontSize: fontSize.caption,
                        marginTop: 2,
                        marginRight: spacing.xs,
                      }}
                    >
                      {formattedTime}
                    </Text>
                  </View>
                );
              }

              return (
                <View key={m.id} style={styles.assistantBubbleContainer}>
                  <View
                    style={[
                      styles.assistantBubble,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.hairline,
                        borderRadius: radius.lg,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    <View style={styles.coachBadgeRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Sparkles
                          size={15}
                          color={colors.accent}
                          strokeWidth={icons.strokeWidth}
                        />
                        <Text
                          style={{
                            color: colors.accentText,
                            fontSize: fontSize.caption,
                            fontWeight: fontWeight.bold,
                            letterSpacing: 0.5,
                          }}
                        >
                          LiftMate Coach
                        </Text>
                      </View>

                      {m.metadata ? (
                        <View
                          style={{
                            backgroundColor: colors.surfaceMuted,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: radius.pill,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.inkMutedText,
                              fontSize: 10,
                              fontWeight: fontWeight.medium,
                            }}
                          >
                            {(m.metadata as any).isLiveApi
                              ? `Gemini · ${(m.metadata as any).latencyMs ?? 0}ms`
                              : 'Offline Engine'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={{
                        color: colors.ink,
                        fontSize: fontSize.body,
                        lineHeight: 22,
                        marginTop: spacing.xs,
                      }}
                    >
                      {m.content}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.inkMutedText,
                      fontSize: fontSize.caption,
                      marginTop: 2,
                      marginLeft: spacing.xs,
                    }}
                  >
                    {formattedTime}
                  </Text>
                </View>
              );
            })
          )}

          {/* Typing Indicator */}
          {sendMessageMutation.isPending ? (
            <View style={styles.assistantBubbleContainer}>
              <View
                style={[
                  styles.assistantBubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.accent} />
                <Text
                  style={{
                    color: colors.inkMutedText,
                    fontSize: fontSize.secondary,
                  }}
                >
                  {t('coach.generating')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Error Banner */}
          {errorText ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.danger,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <Text style={{ color: colors.danger, fontSize: fontSize.caption }}>
                {errorText}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Suggested Questions (§39) */}
        {suggestions.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text
              style={{
                color: colors.accentText,
                fontSize: fontSize.caption,
                fontWeight: fontWeight.bold,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                paddingHorizontal: spacing.xs,
              }}
            >
              {t('coach.suggestedTitle')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
            >
              {suggestions.map((q) => (
                <Pressable
                  key={q.id}
                  accessibilityRole="button"
                  accessibilityLabel={q.prompt}
                  disabled={sendMessageMutation.isPending}
                  onPress={() => handleSend(q.prompt)}
                  style={({ pressed }) => [
                    styles.suggestionPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.hairline,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                    pressed ? { opacity: 0.8, backgroundColor: colors.surfaceMuted } : null,
                  ]}
                >
                  <Sparkles
                    size={14}
                    color={colors.accent}
                    strokeWidth={icons.strokeWidth}
                  />
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: fontSize.secondary,
                      fontWeight: fontWeight.medium,
                    }}
                  >
                    {q.prompt}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Input Bar */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              borderRadius: radius.pill,
              paddingLeft: spacing.md,
              paddingRight: spacing.xs,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('coach.inputPlaceholder')}
            placeholderTextColor={colors.inkMutedText}
            style={[
              styles.textInput,
              {
                color: colors.ink,
                fontSize: fontSize.body,
              },
            ]}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            editable={!sendMessageMutation.isPending}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('coach.send')}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            onPress={() => handleSend()}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !sendMessageMutation.isPending
                    ? colors.accent
                    : colors.surfaceMuted,
                borderRadius: radius.pill,
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.inkMutedText} />
            ) : (
              <ArrowUp
                size={20}
                color={
                  inputText.trim() ? colors.surface : colors.inkMutedText
                }
                strokeWidth={2.5}
              />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function CoachScreen() {
  const { colors, spacing } = useTokens();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
          <ScreenHeader title={t('coach.title')} subtitle={t('coach.subtitle')} />
          <CoachSheetContent />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubbleContainer: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    alignItems: 'flex-start',
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  statusBar: {
    borderWidth: 1,
  },
  coachBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  errorBanner: {
    borderWidth: 1,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
