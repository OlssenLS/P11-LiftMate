import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@liftmate/shared';
import { isAxiosError } from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input, ScreenHeader } from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import { t } from '@/i18n';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterScreen() {
  const { colors, spacing, fontSize } = useTokens();
  const registerUser = useAuthStore((s) => s.register);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      await registerUser(values);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setFormError(t('auth.emailTaken'));
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { padding: spacing.xl, gap: spacing.lg }]}
            keyboardShouldPersistTaps="handled"
          >
            <ScreenHeader title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} />

            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.displayName')}
                  placeholder={t('auth.displayNamePlaceholder')}
                  autoCapitalize="words"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.displayName ? t('auth.errors.displayNameRequired') : undefined}
                />
              )}
            />

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
              label={t('auth.registerCta')}
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />

            <Link href="/(auth)/login" asChild>
              <Button label={t('auth.toLogin')} variant="ghost" />
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
