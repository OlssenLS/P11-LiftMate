import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@liftmate/shared';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
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
import { notifyError, notifySuccess, selectionTick } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const { colors, radius, spacing, fontSize, fontWeight, touchTarget } = useTokens();
  const login = useAuthStore((s) => s.login);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      await login(values);
      notifySuccess();
    } catch (err) {
      notifyError();
      if (isAxiosError(err) && err.response?.status === 401) {
        setFormError(t('auth.invalidCredentials'));
      } else {
        setFormError(t('common.somethingWentWrong'));
      }
    }
  };

  const onForgotPassword = () => {
    Alert.alert(t('auth.forgotPasswordTitle'), t('auth.forgotPasswordBody'), [
      { text: t('common.done') },
    ]);
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
            {/* Brand Motif */}
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
              title={t('auth.loginTitle')}
              subtitle={t('auth.loginSubtitle')}
            />

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

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={t('auth.password')}
                      placeholder={t('auth.passwordPlaceholder')}
                      autoCapitalize="none"
                      secureTextEntry={!showPassword}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password ? t('auth.errors.passwordMin') : undefined}
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
                  )}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={onForgotPassword}
                  style={styles.forgotPassBtn}
                >
                  <Text
                    style={{
                      color: colors.inkMuted,
                      fontSize: fontSize.label,
                      fontWeight: fontWeight.medium,
                      textAlign: 'right',
                    }}
                  >
                    {t('auth.forgotPassword')}
                  </Text>
                </Pressable>

                {formError ? (
                  <Text style={{ color: colors.danger, fontSize: fontSize.body }}>{formError}</Text>
                ) : null}

                <Button
                  label={t('auth.loginCta')}
                  loading={isSubmitting}
                  onPress={handleSubmit(onSubmit)}
                />
              </View>
            </Card>

            <Link href="/(auth)/register" asChild>
              <Button
                label={t('auth.toRegister')}
                variant="ghost"
                style={{ minHeight: touchTarget.min }}
              />
            </Link>
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
  forgotPassBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
});
