import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertTriangle,
  Camera,
  ImageIcon,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import type {
  MealType,
  RecognizedFoodItem,
  RecognizeFoodResponse,
} from '@liftmate/shared';

import {
  Card,
  Chip,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useTokens } from '@/hooks/use-tokens';
import {
  notifySuccess,
  notifyWarning,
  pressLight,
  selectionTick,
} from '@/lib/haptics';
import {
  useConfirmFoodRecognition,
  useRecognizeFood,
} from './use-nutrition-queries';

interface AiFoodRecognitionModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
  selectedDate?: string;
}

interface EditableFoodItem extends RecognizedFoodItem {
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
}

const MEAL_OPTIONS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

export function AiFoodRecognitionModal({
  visible,
  onClose,
  defaultMealType = 'lunch',
  selectedDate,
}: AiFoodRecognitionModalProps) {
  const { colors, radius, layout, type, icons, touchTarget, alpha } = useTokens();

  const recognizeMutation = useRecognizeFood();
  const confirmMutation = useConfirmFoodRecognition();

  // State
  const [step, setStep] = useState<'picker' | 'scanning' | 'confirm'>('picker');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognizeFoodResponse | null>(null);
  const [editableItems, setEditableItems] = useState<EditableFoodItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setStep('picker');
    setImageUri(null);
    setRecognitionResult(null);
    setEditableItems([]);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processImagePayload = async (base64: string, mimeType: string, uri: string) => {
    setImageUri(uri);
    setStep('scanning');
    setErrorMessage(null);

    try {
      const res = await recognizeMutation.mutateAsync({
        imageBase64: base64,
        mimeType: mimeType || 'image/jpeg',
        mealType,
      });

      setRecognitionResult(res);

      // Populate editable items with base per-gram values for instant portion adjustment
      const items: EditableFoodItem[] = res.items.map((it) => {
        const grams = it.portionGrams || 100;
        return {
          ...it,
          baseCalories: it.calories / grams,
          baseProtein: it.protein / grams,
          baseCarbs: it.carbs / grams,
          baseFat: it.fat / grams,
        };
      });

      setEditableItems(items);
      setStep('confirm');
    } catch (err: any) {
      setStep('picker');
      setErrorMessage(
        err?.response?.data?.message ||
          'Failed to analyze photo. Please check your network and try again.',
      );
    }
  };

  const handleTakePhoto = async () => {
    selectionTick();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'LiftMate needs camera access to scan your meal photos.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        const asset = result.assets[0];
        if (asset.base64) {
          await processImagePayload(
            asset.base64,
            asset.mimeType || 'image/jpeg',
            asset.uri,
          );
        }
      }
    } catch {
      Alert.alert('Error', 'Unable to open camera on this device.');
    }
  };

  const handlePickFromGallery = async () => {
    selectionTick();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission',
          'LiftMate needs photo library access to select meal photos.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        const asset = result.assets[0];
        if (asset.base64) {
          await processImagePayload(
            asset.base64,
            asset.mimeType || 'image/jpeg',
            asset.uri,
          );
        }
      }
    } catch {
      Alert.alert('Error', 'Unable to open photo gallery.');
    }
  };

  // Demo fallback scan for simulators without cameras
  const handleDemoScan = async () => {
    selectionTick();
    await processImagePayload(
      'demo_sample_food_base64_payload',
      'image/jpeg',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    );
  };

  // Portion adjusting
  const handleAdjustPortion = (itemId: string, deltaGrams: number) => {
    pressLight();
    setEditableItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newGrams = Math.max(25, item.portionGrams + deltaGrams);
        return {
          ...item,
          portionGrams: newGrams,
          calories: Math.round(newGrams * item.baseCalories),
          protein: Math.round(newGrams * item.baseProtein * 10) / 10,
          carbs: Math.round(newGrams * item.baseCarbs * 10) / 10,
          fat: Math.round(newGrams * item.baseFat * 10) / 10,
        };
      }),
    );
  };

  // Item deletion
  const handleDeleteItem = (itemId: string) => {
    notifyWarning();
    setEditableItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Confirmation submission
  const handleConfirm = async () => {
    if (editableItems.length === 0) {
      Alert.alert('No Items', 'Please select at least one food item to log.');
      return;
    }

    pressLight();
    try {
      await confirmMutation.mutateAsync({
        mealType,
        loggedAt: selectedDate ? new Date(selectedDate) : new Date(),
        items: editableItems.map((it) => ({
          foodId: it.matchedFoodId ?? undefined,
          foodName: it.matchedFoodName || it.detectedName,
          servingSize: `${it.portionGrams}g portion`,
          portionGrams: it.portionGrams,
          calories: it.calories,
          protein: it.protein,
          carbs: it.carbs,
          fat: it.fat,
        })),
      });

      notifySuccess();
      handleClose();
    } catch (err: any) {
      Alert.alert(
        'Save Failed',
        err?.response?.data?.message || 'Failed to save food log entries.',
      );
    }
  };

  // Totals calculations
  const totalCalories = editableItems.reduce((acc, it) => acc + it.calories, 0);
  const totalProtein = Math.round(editableItems.reduce((acc, it) => acc + it.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(editableItems.reduce((acc, it) => acc + it.carbs, 0) * 10) / 10;
  const totalFat = Math.round(editableItems.reduce((acc, it) => acc + it.fat, 0) * 10) / 10;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bg }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.hairline,
              paddingHorizontal: layout.screenPadding,
            },
          ]}
        >
          <View style={styles.headerTitleRow}>
            <Sparkles size={20} color={colors.accent} strokeWidth={2.5} />
            <Text style={[type.sectionTitle, { color: colors.ink }]}>
              AI Food Recognition
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close food recognition"
            onPress={handleClose}
            hitSlop={Math.max(0, (touchTarget.min - 32) / 2)}
            style={styles.closeButton}
          >
            <X size={22} color={colors.inkMuted} strokeWidth={icons.strokeWidth} />
          </Pressable>
        </View>

        {/* Error Notification Banner */}
        {errorMessage ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: '#FEE2E2',
                borderColor: '#FCA5A5',
                marginHorizontal: layout.screenPadding,
              },
            ]}
          >
            <AlertTriangle size={18} color="#DC2626" />
            <Text style={[type.secondary, { color: '#B91C1C', flex: 1 }]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* STEP 1: Photo Picker / Capture */}
        {step === 'picker' && (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: layout.screenPadding },
            ]}
          >
            <Text style={[type.eyebrow, { color: colors.inkMutedText, marginTop: 8 }]}>
              TARGET MEAL
            </Text>
            <View style={styles.chipsRow}>
              {MEAL_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  selected={mealType === opt.key}
                  onPress={() => {
                    selectionTick();
                    setMealType(opt.key);
                  }}
                />
              ))}
            </View>

            <View style={{ gap: 16, marginTop: 14 }}>
              {/* Camera Action Card */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take meal photo with camera"
                onPress={handleTakePhoto}
              >
                <Card variant="surface" padding="lg">
                  <View style={styles.actionCardRow}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: alpha(colors.accent, 0.15) },
                      ]}
                    >
                      <Camera size={26} color={colors.accent} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[type.cardLabel, { color: colors.ink, fontSize: 16 }]}>
                        Take Photo with Camera
                      </Text>
                      <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                        Snap a photo of your plate or ingredients directly
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>

              {/* Gallery Action Card */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload meal from photo library"
                onPress={handlePickFromGallery}
              >
                <Card variant="surface" padding="lg">
                  <View style={styles.actionCardRow}>
                    <View
                      style={[
                        styles.iconBadge,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <ImageIcon size={26} color={colors.ink} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[type.cardLabel, { color: colors.ink, fontSize: 16 }]}>
                        Select from Photo Library
                      </Text>
                      <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                        Upload an existing food or meal image from gallery
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>

              {/* Guidance Information Card */}
              <Card variant="surface" padding="md" style={{ backgroundColor: colors.surfaceMuted }}>
                <View style={{ gap: 6 }}>
                  <Text style={[type.cardLabel, { color: colors.ink }]}>
                    Photo Scanning Tips
                  </Text>
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    Take a clear, top-down photo under good lighting. LiftMate Vision identifies Indonesian staples (nasi, ayam, tempe, telur) and calculates exact nutrition from verified database portions.
                  </Text>
                </View>
              </Card>

              {/* Simulator / Demo Quick Test */}
              <View style={{ marginTop: 8 }}>
                <SecondaryButton
                  label="Try Demo Meal Scan"
                  onPress={handleDemoScan}
                />
              </View>
            </View>
          </ScrollView>
        )}

        {/* STEP 2: Scanning / Loading */}
        {step === 'scanning' && (
          <View style={styles.loadingContainer}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.previewImage,
                  { borderRadius: radius.md, borderColor: colors.hairline },
                ]}
              />
            ) : null}

            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
            <Text
              style={[
                type.sectionTitle,
                { color: colors.ink, marginTop: 16, textAlign: 'center' },
              ]}
            >
              Analyzing Meal with LiftMate Vision...
            </Text>
            <Text
              style={[
                type.secondary,
                { color: colors.inkMutedText, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
              ]}
            >
              Identifying visible foods, estimating portion grams, and matching verified database nutrition.
            </Text>
          </View>
        )}

        {/* STEP 3: Multi-Food Confirmation Sheet (§29–§32) */}
        {step === 'confirm' && (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: layout.screenPadding, paddingBottom: 32 },
            ]}
          >
            {/* Meal summary banner */}
            <Card variant="surface" padding="md" style={{ backgroundColor: colors.surfaceMuted }}>
              <View style={{ gap: 6 }}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.estimateBadge,
                      { backgroundColor: alpha(colors.accent, 0.15) },
                    ]}
                  >
                    <Text style={[type.eyebrow, { color: colors.accent, fontSize: 10 }]}>
                      ESTIMATED NUTRITION
                    </Text>
                  </View>
                  <Text style={[type.caption, { color: colors.inkMutedText }]}>
                    {editableItems.length} items detected
                  </Text>
                </View>
                <Text style={[type.body, { color: colors.ink }]}>
                  {recognitionResult?.imageSummary || 'Detected meal plate'}
                </Text>
              </View>
            </Card>

            {/* Spec §32 Low-Confidence Mandatory Warning */}
            {recognitionResult?.hasLowConfidenceWarning ? (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#FCD34D',
                    borderRadius: radius.md,
                    marginTop: 12,
                  },
                ]}
              >
                <AlertTriangle size={18} color="#D97706" />
                <Text style={[type.secondary, { color: '#92400E', flex: 1, fontWeight: '500' }]}>
                  {recognitionResult.warningMessage ||
                    'Food identification may be inaccurate. Please verify the detected food and portion.'}
                </Text>
              </View>
            ) : null}

            {/* Target Meal Type Row */}
            <Text style={[type.eyebrow, { color: colors.inkMutedText, marginTop: 14 }]}>
              LOGGING TO MEAL
            </Text>
            <View style={styles.chipsRow}>
              {MEAL_OPTIONS.map((opt) => (
                <Chip
                  key={opt.key}
                  label={opt.label}
                  selected={mealType === opt.key}
                  onPress={() => {
                    selectionTick();
                    setMealType(opt.key);
                  }}
                />
              ))}
            </View>

            {/* Detected Items List */}
            <Text style={[type.eyebrow, { color: colors.inkMutedText, marginTop: 16 }]}>
              DETECTED FOOD ITEMS (TAP - / + TO ADJUST PORTION)
            </Text>

            <View style={{ gap: 12, marginTop: 8 }}>
              {editableItems.map((item) => {
                const confidenceColor =
                  item.confidence === 'high'
                    ? '#16A34A'
                    : item.confidence === 'medium'
                    ? '#D97706'
                    : '#DC2626';

                return (
                  <Card key={item.id} variant="surface" padding="md">
                    <View style={{ gap: 10 }}>
                      {/* Name & Confidence Badge */}
                      <View style={styles.itemHeaderRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[type.cardLabel, { color: colors.ink, fontSize: 16 }]}>
                            {item.matchedFoodName || item.detectedName}
                          </Text>
                          {item.matchedFoodName !== item.detectedName ? (
                            <Text style={[type.caption, { color: colors.inkMutedText }]}>
                              Detected as: {item.detectedName}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.itemHeaderRight}>
                          <View
                            style={[
                              styles.confidencePill,
                              { backgroundColor: `${confidenceColor}15` },
                            ]}
                          >
                            <Text
                              style={[
                                type.eyebrow,
                                { color: confidenceColor, fontSize: 10 },
                              ]}
                            >
                              {item.confidence.toUpperCase()} CONFIDENCE
                            </Text>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.matchedFoodName}`}
                            onPress={() => handleDeleteItem(item.id)}
                            hitSlop={8}
                            style={styles.deleteButton}
                          >
                            <Trash2 size={18} color={colors.inkMuted} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Portion Stepper */}
                      <View style={styles.portionRow}>
                        <View style={styles.stepperContainer}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Decrease portion by 25 grams"
                            onPress={() => handleAdjustPortion(item.id, -25)}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: colors.surfaceMuted,
                                borderRadius: 8,
                              },
                            ]}
                          >
                            <Minus size={16} color={colors.ink} />
                          </Pressable>

                          <Text
                            style={[
                              type.cardLabel,
                              {
                                color: colors.accent,
                                fontSize: 15,
                                minWidth: 60,
                                textAlign: 'center',
                              },
                            ]}
                          >
                            {item.portionGrams}g
                          </Text>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Increase portion by 25 grams"
                            onPress={() => handleAdjustPortion(item.id, 25)}
                            style={[
                              styles.stepperBtn,
                              {
                                backgroundColor: colors.surfaceMuted,
                                borderRadius: 8,
                              },
                            ]}
                          >
                            <Plus size={16} color={colors.ink} />
                          </Pressable>
                        </View>

                        <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                          {item.calories} kcal
                        </Text>
                      </View>

                      {/* Macros Details */}
                      <View
                        style={[
                          styles.macrosPillRow,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          },
                        ]}
                      >
                        <Text style={[type.caption, { color: colors.ink }]}>
                          {item.protein}g P
                        </Text>
                        <Text style={[type.caption, { color: colors.inkMutedText }]}>•</Text>
                        <Text style={[type.caption, { color: colors.ink }]}>
                          {item.carbs}g C
                        </Text>
                        <Text style={[type.caption, { color: colors.inkMutedText }]}>•</Text>
                        <Text style={[type.caption, { color: colors.ink }]}>
                          {item.fat}g F
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>

            {/* Totals Summary Card */}
            <Card variant="surface" padding="lg" style={{ marginTop: 18 }}>
              <View style={{ gap: 10 }}>
                <View style={styles.totalHeaderRow}>
                  <Text style={[type.sectionTitle, { color: colors.ink }]}>
                    Meal Total
                  </Text>
                  <Text style={[type.sectionTitle, { color: colors.accent }]}>
                    {totalCalories} kcal
                  </Text>
                </View>

                <View style={styles.macroSummaryRow}>
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    {totalProtein}g Protein
                  </Text>
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    {totalCarbs}g Carbs
                  </Text>
                  <Text style={[type.secondary, { color: colors.inkMutedText }]}>
                    {totalFat}g Fat
                  </Text>
                </View>
              </View>
            </Card>

            {/* Action Buttons */}
            <View style={{ gap: 10, marginTop: 20 }}>
              <PrimaryButton
                label={
                  confirmMutation.isPending
                    ? 'Saving to Diary...'
                    : `Confirm & Add to Diary (${totalCalories} kcal)`
                }
                onPress={handleConfirm}
                disabled={confirmMutation.isPending || editableItems.length === 0}
              />
              <SecondaryButton
                label="Retake Photo"
                onPress={() => setStep('picker')}
                disabled={confirmMutation.isPending}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 10,
  },
  scrollContent: {
    paddingTop: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  estimateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidencePill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 4,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macrosPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
