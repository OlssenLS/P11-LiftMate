import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@liftmate/shared';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/haptics';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const { colors, spacing, fontSize } = useTokens();
  const login = useAuthStore((s) => s.login);
  const [formError, setFormError] = useState<string | null>(null);

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
          >
            <ScreenHeader title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />

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
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password ? t('auth.errors.passwordMin') : undefined}
                />
              )}
            />

            {formError ? (
              <Text style={{ color: colors.danger, fontSize: fontSize.body }}>{formError}</Text>
            ) : null}

            <Button
              label={t('auth.loginCta')}
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />

            <Link href="/(auth)/register" asChild>
              <Button label={t('auth.toRegister')} variant="ghost" />
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
  content: { flexGrow: 1, justifyContent: 'center' },
});
