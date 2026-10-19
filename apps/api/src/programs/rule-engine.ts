import {
  STARTER_TEMPLATES,
  Equipment,
  FitnessGoal,
  type StarterTemplate,
  type TemplateDay,
  type TemplateExercise,
} from './templates/starter-templates.js';

export interface ExerciseLookupItem {
  id: string;
  name: string;
  externalId: string | null;
  equipment: Equipment;
  alternativeExercises: string[];
}

export interface SelectionCriteria {
  goal: FitnessGoal;
  frequency: number;
  availableEquipment: Equipment[];
  avoidExercises?: string[];
}

export interface ResolvedProgramExercise {
  exerciseId: string;
  exerciseName: string;
  day: number;
  dayName: string;
  sets: number;
  repMin: number;
  repMax: number;
  targetRir: number;
  restSeconds: number;
  order: number;
  wasSubstituted?: boolean;
}

export interface SelectionResult {
  template: StarterTemplate;
  score: number;
  exercises: ResolvedProgramExercise[];
}

export function isEquipmentCompatible(
  required: Equipment[],
  available: Equipment[],
): boolean {
  if (required.length === 0) return true;
  // Bodyweight is universally available to everyone
  const availableSet = new Set<Equipment>([...available, Equipment.bodyweight]);
  return required.every((eq) => availableSet.has(eq));
}

function normalize(val: string): string {
  return val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isExerciseAvoided(
  exercise: ExerciseLookupItem,
  avoidList: string[],
): boolean {
  if (!avoidList || avoidList.length === 0) return false;
  const normalizedAvoid = avoidList.map(normalize);

  const normalizedId = normalize(exercise.id);
  const normalizedExternal = exercise.externalId ? normalize(exercise.externalId) : '';
  const normalizedName = normalize(exercise.name);

  return normalizedAvoid.some(
    (avoid) =>
      avoid === normalizedId ||
      avoid === normalizedExternal ||
      avoid === normalizedName ||
      (normalizedExternal && normalizedExternal.includes(avoid)) ||
      (normalizedName && normalizedName.includes(avoid)),
  );
}

export class RuleEngine {
  /**
   * Selects the highest-scoring starter template program and resolves
   * its planned exercises against the exercise database, handling substitutions
   * for avoided exercises.
   */
  static selectBestTemplate(
    criteria: SelectionCriteria,
    exerciseCatalog: ExerciseLookupItem[],
    templates: StarterTemplate[] = STARTER_TEMPLATES,
  ): SelectionResult {
    const catalogByExternal = new Map<string, ExerciseLookupItem>();
    const catalogById = new Map<string, ExerciseLookupItem>();

    for (const ex of exerciseCatalog) {
      if (ex.externalId) catalogByExternal.set(ex.externalId, ex);
      catalogById.set(ex.id, ex);
    }

    const availableEquipment = criteria.availableEquipment ?? [];
    const avoidList = criteria.avoidExercises ?? [];

    let bestResult: SelectionResult | null = null;
    let highestScore = -Infinity;

    for (const template of templates) {
      let score = 100;

      // 1. Equipment compatibility
      const hasEquipment = isEquipmentCompatible(template.requiredEquipment, availableEquipment);
      if (!hasEquipment) {
        // Severe penalty if required equipment is missing
        score -= 200;
      }

      // 2. Frequency distance
      const freqDiff = Math.abs(template.frequency - criteria.frequency);
      score -= freqDiff * 15;

      // 3. Goal alignment
      if (template.goal === criteria.goal) {
        score += 30;
      } else if (
        (template.goal === FitnessGoal.build_muscle && criteria.goal === FitnessGoal.gain_strength) ||
        (template.goal === FitnessGoal.gain_strength && criteria.goal === FitnessGoal.build_muscle) ||
        (template.goal === FitnessGoal.build_muscle && criteria.goal === FitnessGoal.lose_fat)
      ) {
        score += 15;
      }

      // 4. Resolve exercises and handle avoid-list substitutions
      const resolvedExercises: ResolvedProgramExercise[] = [];
      let unresolvableAvoidCount = 0;

      for (const day of template.days) {
        for (const tex of day.exercises) {
          const primaryEx = catalogByExternal.get(tex.exerciseExternalId);
          if (!primaryEx) {
            // Missing seed exercise in catalog
            continue;
          }

          let chosenEx: ExerciseLookupItem = primaryEx;
          let wasSubstituted = false;

          if (isExerciseAvoided(primaryEx, avoidList)) {
            // Attempt substitution via fallbackExternalId first
            let substituteFound = false;
            if (tex.fallbackExternalId) {
              const fallbackEx = catalogByExternal.get(tex.fallbackExternalId);
              if (
                fallbackEx &&
                !isExerciseAvoided(fallbackEx, avoidList) &&
                isEquipmentCompatible([fallbackEx.equipment], availableEquipment)
              ) {
                chosenEx = fallbackEx;
                wasSubstituted = true;
                substituteFound = true;
              }
            }

            // Next attempt substitution via alternativeExercises
            if (!substituteFound && primaryEx.alternativeExercises.length > 0) {
              for (const alt of primaryEx.alternativeExercises) {
                const altEx = catalogByExternal.get(alt) || catalogById.get(alt);
                if (
                  altEx &&
                  !isExerciseAvoided(altEx, avoidList) &&
                  isEquipmentCompatible([altEx.equipment], availableEquipment)
                ) {
                  chosenEx = altEx;
                  wasSubstituted = true;
                  substituteFound = true;
                  break;
                }
              }
            }

            if (!substituteFound) {
              unresolvableAvoidCount++;
            }
          }

          resolvedExercises.push({
            exerciseId: chosenEx.id,
            exerciseName: chosenEx.name,
            day: day.day,
            dayName: day.dayName,
            sets: tex.sets,
            repMin: tex.repMin,
            repMax: tex.repMax,
            targetRir: tex.targetRir,
            restSeconds: tex.restSeconds,
            order: tex.order,
            wasSubstituted,
          });
        }
      }

      // Penalty for unresolvable avoid-list collisions
      score -= unresolvableAvoidCount * 40;

      if (score > highestScore || bestResult === null) {
        highestScore = score;
        bestResult = {
          template,
          score,
          exercises: resolvedExercises,
        };
      }
    }

    if (!bestResult) {
      // Fallback to first template
      const fallback = templates[0];
      return {
        template: fallback,
        score: 0,
        exercises: [],
      };
    }

    return bestResult;
  }
}
