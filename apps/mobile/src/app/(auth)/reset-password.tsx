import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { submitResetPassword } from '@/lib/auth-api';
import { notifyError, notifySuccess, selectionTick } from '@/lib/haptics';

export default function ResetPasswordScreen() {
  const { colors, radius, spacing, fontSize, fontWeight, touchTarget } = useTokens();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const [manualToken, setManualToken] = useState<string | null>(null);
  const token = manualToken ?? (typeof params.token === 'string' ? params.token : '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setFormError(null);

    const cleanToken = token.trim();
    if (!cleanToken) {
      setFormError(t('auth.errors.tokenRequired'));
      return;
    }

    if (newPassword.length < 8) {
      setFormError(t('auth.errors.passwordMin'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(t('auth.errors.passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitResetPassword({
        token: cleanToken,
        newPassword,
      });
      notifySuccess();
      setIsSuccess(true);
    } catch {
      notifyError();
      setFormError(t('auth.errors.resetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.brandBadge,
                  {
                    backgroundColor: colors.ink,
                    borderRadius: radius.cardSm,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: fontSize.title,
                    fontWeight: fontWeight.bold,
                    letterSpacing: 1,
                  }}
                >
                  LM
                </Text>
              </View>
            </View>

            <ScreenHeader
              title={t('auth.resetPasswordTitle')}
              subtitle={t('auth.resetPasswordSubtitle')}
            />

            {isSuccess ? (
              <Card padding="xl">
                <View style={{ gap: spacing.md }}>
                  <Text
                    style={{
                      color: colors.ink,
                      fontSize: fontSize.sectionTitle,
                      fontWeight: fontWeight.bold,
                    }}
                  >
                    {t('auth.resetSuccessTitle')}
                  </Text>
                  <Text
                    style={{
                      color: colors.inkMuted,
                      fontSize: fontSize.body,
                      lineHeight: 22,
                    }}
                  >
                    {t('auth.resetSuccessBody')}
                  </Text>
                  <Button
                    label={t('auth.toLogin')}
                    onPress={() => router.replace('/(auth)/login')}
                    style={{ marginTop: spacing.sm, minHeight: touchTarget.min }}
                  />
                </View>
              </Card>
            ) : (
              <Card padding="xl">
                <View style={{ gap: spacing.lg }}>
                  <Input
                    label={t('auth.resetTokenLabel')}
                    placeholder={t('auth.resetTokenPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={token}
                    onChangeText={setManualToken}
                  />

                  <Input
                    label={t('auth.newPasswordLabel')}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoCapitalize="none"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    rightElement={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        hitSlop={8}
                        onPress={() => {
                          selectionTick();
                          setShowPassword(!showPassword);
                        }}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.inkMuted,
                            fontSize: fontSize.label,
                            fontWeight: fontWeight.semibold,
                          }}
                        >
                          {showPassword ? 'HIDE' : 'SHOW'}
                        </Text>
                      </Pressable>
                    }
                  />

                  <Input
                    label={t('auth.confirmPasswordLabel')}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    autoCapitalize="none"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                  {formError ? (
                    <Text style={{ color: colors.danger, fontSize: fontSize.body }}>
                      {formError}
                    </Text>
                  ) : null}

                  <Button
                    label={t('auth.resetPasswordSubmit')}
                    loading={isSubmitting}
                    onPress={handleSubmit}
                    style={{ minHeight: touchTarget.min }}
                  />

                  <Button
                    label={t('auth.toLogin')}
                    variant="ghost"
                    onPress={() => router.replace('/(auth)/login')}
                    style={{ minHeight: touchTarget.min }}
                  />
                </View>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: -8,
  },
  brandBadge: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
