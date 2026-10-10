import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordDto } from '@liftmate/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/haptics';
import { requestForgotPassword } from '@/lib/auth-api';

export default function ForgotPasswordScreen() {
  const { colors, radius, spacing, fontSize, fontWeight, touchTarget } = useTokens();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordDto) => {
    setFormError(null);
    try {
      await requestForgotPassword(values);
      notifySuccess();
      setIsSuccess(true);
    } catch {
      notifyError();
      setFormError(t('common.somethingWentWrong'));
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
              title={t('auth.forgotPasswordScreenTitle')}
              subtitle={t('auth.forgotPasswordScreenSubtitle')}
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
                    {t('auth.resetEmailSentTitle')}
                  </Text>
                  <Text
                    style={{
                      color: colors.inkMuted,
                      fontSize: fontSize.body,
                      lineHeight: 22,
                    }}
                  >
                    {t('auth.resetEmailSentBody')}
                  </Text>
                  <Button
                    label={t('auth.enterCodeCta')}
                    onPress={() => router.push('/(auth)/reset-password')}
                    style={{ marginTop: spacing.sm, minHeight: touchTarget.min }}
                  />
                  <Button
                    label={t('auth.toLogin')}
                    variant="ghost"
                    onPress={() => router.replace('/(auth)/login')}
                    style={{ minHeight: touchTarget.min }}
                  />
                </View>
              </Card>
            ) : (
              <Card padding="xl">
                <View style={{ gap: spacing.lg }}>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('auth.email')}
                        placeholder={t('auth.emailPlaceholder')}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        error={errors.email ? t('auth.errors.emailInvalid') : undefined}
                      />
                    )}
                  />

                  {formError ? (
                    <Text style={{ color: colors.danger, fontSize: fontSize.body }}>
                      {formError}
                    </Text>
                  ) : null}

                  <Button
                    label={t('auth.sendResetLink')}
                    loading={isSubmitting}
                    onPress={handleSubmit(onSubmit)}
                    style={{ minHeight: touchTarget.min }}
                  />

                  <Button
                    label={t('auth.enterCodeCta')}
                    variant="secondary"
                    onPress={() => router.push('/(auth)/reset-password')}
                    style={{ minHeight: touchTarget.min }}
                  />

                  <Button
                    label={t('auth.toLogin')}
                    variant="ghost"
                    onPress={() => router.back()}
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
