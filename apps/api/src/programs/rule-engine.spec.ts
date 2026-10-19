import { describe, expect, it } from 'vitest';
import {
  RuleEngine,
  isEquipmentCompatible,
  isExerciseAvoided,
  type ExerciseLookupItem,
  type SelectionCriteria,
} from './rule-engine.js';
import {
  STARTER_TEMPLATES,
  Equipment,
  FitnessGoal,
} from './templates/starter-templates.js';

describe('RuleEngine', () => {
  const mockExerciseCatalog: ExerciseLookupItem[] = [
    {
      id: 'ex-bb-squat',
      name: 'Barbell Back Squat',
      externalId: 'barbell-back-squat',
      equipment: Equipment.barbell,
      alternativeExercises: ['dumbbell-romanian-deadlift', 'bodyweight-air-squat'],
    },
    {
      id: 'ex-bb-bench',
      name: 'Barbell Bench Press',
      externalId: 'barbell-bench-press',
      equipment: Equipment.barbell,
      alternativeExercises: ['dumbbell-bench-press', 'push-up'],
    },
    {
      id: 'ex-bb-row',
      name: 'Barbell Bent-Over Row',
      externalId: 'barbell-bent-over-row',
      equipment: Equipment.barbell,
      alternativeExercises: ['seated-cable-row-machine'],
    },
    {
      id: 'ex-db-lat-raise',
      name: 'Dumbbell Lateral Raise',
      externalId: 'dumbbell-lateral-raise',
      equipment: Equipment.dumbbell,
      alternativeExercises: [],
    },
    {
      id: 'ex-plank',
      name: 'Plank',
      externalId: 'plank',
      equipment: Equipment.bodyweight,
      alternativeExercises: [],
    },
    {
      id: 'ex-bb-rdl',
      name: 'Barbell Romanian Deadlift',
      externalId: 'barbell-romanian-deadlift',
      equipment: Equipment.barbell,
      alternativeExercises: ['dumbbell-romanian-deadlift'],
    },
    {
      id: 'ex-bb-ohp',
      name: 'Overhead Press',
      externalId: 'barbell-overhead-press',
      equipment: Equipment.barbell,
      alternativeExercises: ['dumbbell-shoulder-press'],
    },
    {
      id: 'ex-lat-pull',
      name: 'Lat Pulldown',
      externalId: 'lat-pulldown',
      equipment: Equipment.pulldown_machine,
      alternativeExercises: ['pull-up'],
    },
    {
      id: 'ex-db-curl',
      name: 'Dumbbell Bicep Curl',
      externalId: 'dumbbell-bicep-curl',
      equipment: Equipment.dumbbell,
      alternativeExercises: [],
    },
    {
      id: 'ex-tri-push',
      name: 'Triceps Rope Pushdown',
      externalId: 'triceps-rope-pushdown',
      equipment: Equipment.cable_machine,
      alternativeExercises: [],
    },
    {
      id: 'ex-leg-press',
      name: '45-Degree Leg Press',
      externalId: '45-degree-leg-press',
      equipment: Equipment.leg_press,
      alternativeExercises: ['walking-lunge'],
    },
    {
      id: 'ex-inc-db-press',
      name: 'Incline Dumbbell Press',
      externalId: 'incline-dumbbell-press',
      equipment: Equipment.dumbbell,
      alternativeExercises: ['push-up'],
    },
    {
      id: 'ex-cable-row',
      name: 'Seated Cable Row',
      externalId: 'seated-cable-row-machine',
      equipment: Equipment.machines,
      alternativeExercises: [],
    },
    {
      id: 'ex-leg-curl',
      name: 'Seated Leg Curl',
      externalId: 'seated-leg-curl',
      equipment: Equipment.machines,
      alternativeExercises: [],
    },
    {
      id: 'ex-cable-lat',
      name: 'Cable Lateral Raise',
      externalId: 'cable-lateral-raise',
      equipment: Equipment.cable_machine,
      alternativeExercises: ['dumbbell-lateral-raise'],
    },
    {
      id: 'ex-db-bench',
      name: 'Dumbbell Bench Press',
      externalId: 'dumbbell-bench-press',
      equipment: Equipment.dumbbell,
      alternativeExercises: ['push-up'],
    },
    {
      id: 'ex-db-rdl',
      name: 'Dumbbell Romanian Deadlift',
      externalId: 'dumbbell-romanian-deadlift',
      equipment: Equipment.dumbbell,
      alternativeExercises: [],
    },
    {
      id: 'ex-db-ohp',
      name: 'Dumbbell Shoulder Press',
      externalId: 'dumbbell-shoulder-press',
      equipment: Equipment.dumbbell,
      alternativeExercises: [],
    },
    {
      id: 'ex-pushup',
      name: 'Push-Up',
      externalId: 'push-up',
      equipment: Equipment.bodyweight,
      alternativeExercises: [],
    },
    {
      id: 'ex-air-squat',
      name: 'Bodyweight Air Squat',
      externalId: 'bodyweight-air-squat',
      equipment: Equipment.bodyweight,
      alternativeExercises: [],
    },
    {
      id: 'ex-lunge',
      name: 'Walking Lunge',
      externalId: 'walking-lunge',
      equipment: Equipment.bodyweight,
      alternativeExercises: [],
    },
    {
      id: 'ex-dip',
      name: 'Parallel Bar Dip',
      externalId: 'parallel-bar-dip',
      equipment: Equipment.bodyweight,
      alternativeExercises: ['push-up'],
    },
    {
      id: 'ex-leg-raise',
      name: 'Hanging Leg Raise',
      externalId: 'hanging-leg-raise',
      equipment: Equipment.pull_up_bar,
      alternativeExercises: ['plank'],
    },
    {
      id: 'ex-pullup',
      name: 'Pull-Up',
      externalId: 'pull-up',
      equipment: Equipment.pull_up_bar,
      alternativeExercises: [],
    },
    {
      id: 'ex-bb-deadlift',
      name: 'Barbell Deadlift',
      externalId: 'barbell-deadlift',
      equipment: Equipment.barbell,
      alternativeExercises: ['barbell-romanian-deadlift'],
    },
    {
      id: 'ex-leg-ext',
      name: 'Seated Leg Extension',
      externalId: 'seated-leg-extension',
      equipment: Equipment.machines,
      alternativeExercises: [],
    },
    {
      id: 'ex-calf-raise',
      name: 'Standing Calf Raise Machine',
      externalId: 'standing-calf-raise-machine',
      equipment: Equipment.machines,
      alternativeExercises: [],
    },
    {
      id: 'ex-cable-fly',
      name: 'Cable Chest Fly',
      externalId: 'cable-chest-fly',
      equipment: Equipment.cable_machine,
      alternativeExercises: [],
    },
  ];

  describe('isEquipmentCompatible', () => {
    it('returns true when required equipment is subset of available', () => {
      const required = [Equipment.barbell, Equipment.dumbbell];
      const available = [Equipment.barbell, Equipment.dumbbell, Equipment.cable_machine];
      expect(isEquipmentCompatible(required, available)).toBe(true);
    });

    it('treats bodyweight as universally available', () => {
      const required = [Equipment.bodyweight];
      const available: Equipment[] = [];
      expect(isEquipmentCompatible(required, available)).toBe(true);
    });

    it('returns false when a required item is missing', () => {
      const required = [Equipment.barbell, Equipment.cable_machine];
      const available = [Equipment.barbell, Equipment.dumbbell];
      expect(isEquipmentCompatible(required, available)).toBe(false);
    });
  });

  describe('isExerciseAvoided', () => {
    const exercise: ExerciseLookupItem = {
      id: 'uuid-1234',
      name: 'Barbell Bench Press',
      externalId: 'barbell-bench-press',
      equipment: Equipment.barbell,
      alternativeExercises: [],
    };

    it('identifies exact match by externalId', () => {
      expect(isExerciseAvoided(exercise, ['barbell-bench-press'])).toBe(true);
    });

    it('identifies match by name case-insensitively', () => {
      expect(isExerciseAvoided(exercise, ['bench press'])).toBe(true);
    });

    it('identifies match by id', () => {
      expect(isExerciseAvoided(exercise, ['uuid-1234'])).toBe(true);
    });

    it('returns false when not on avoid list', () => {
      expect(isExerciseAvoided(exercise, ['squat', 'overhead press'])).toBe(false);
    });
  });

  describe('selectBestTemplate', () => {
    it('selects Bodyweight Only 3-Day when user has no equipment', () => {
      const criteria: SelectionCriteria = {
        goal: FitnessGoal.general_fitness,
        frequency: 3,
        availableEquipment: [Equipment.bodyweight],
      };

      const result = RuleEngine.selectBestTemplate(criteria, mockExerciseCatalog, STARTER_TEMPLATES);
      expect(result.template.id).toBe('bodyweight-3day');
      expect(result.exercises.length).toBeGreaterThan(0);
      expect(result.exercises.every((e) => e.exerciseId)).toBe(true);
    });

    it('selects Dumbbell Only 3-Day when user has only dumbbells', () => {
      const criteria: SelectionCriteria = {
        goal: FitnessGoal.build_muscle,
        frequency: 3,
        availableEquipment: [Equipment.dumbbell],
      };

      const result = RuleEngine.selectBestTemplate(criteria, mockExerciseCatalog, STARTER_TEMPLATES);
      expect(result.template.id).toBe('dumbbell-3day');
    });

    it('selects Upper/Lower 4-Day when frequency is 4 and user has full gym', () => {
      const criteria: SelectionCriteria = {
        goal: FitnessGoal.build_muscle,
        frequency: 4,
        availableEquipment: [
          Equipment.barbell,
          Equipment.dumbbell,
          Equipment.machines,
          Equipment.pulldown_machine,
          Equipment.cable_machine,
          Equipment.leg_press,
        ],
      };

      const result = RuleEngine.selectBestTemplate(criteria, mockExerciseCatalog, STARTER_TEMPLATES);
      expect(result.template.id).toBe('upper-lower-4day');
    });

    it('selects PPL 6-Day when frequency is 6 and user has gym equipment', () => {
      const criteria: SelectionCriteria = {
        goal: FitnessGoal.build_muscle,
        frequency: 6,
        availableEquipment: [
          Equipment.barbell,
          Equipment.dumbbell,
          Equipment.machines,
          Equipment.pulldown_machine,
          Equipment.cable_machine,
          Equipment.leg_press,
        ],
      };

      const result = RuleEngine.selectBestTemplate(criteria, mockExerciseCatalog, STARTER_TEMPLATES);
      expect(result.template.id).toBe('ppl-6day');
    });

    it('substitutes avoided exercise with fallback when available', () => {
      const criteria: SelectionCriteria = {
        goal: FitnessGoal.build_muscle,
        frequency: 3,
        availableEquipment: [
          Equipment.barbell,
          Equipment.dumbbell,
          Equipment.machines,
          Equipment.pulldown_machine,
        ],
        avoidExercises: ['barbell-bench-press'],
      };

      const result = RuleEngine.selectBestTemplate(criteria, mockExerciseCatalog, STARTER_TEMPLATES);
      expect(result.template.id).toBe('full-body-3day');

      // Check that bench press was substituted by dumbbell-bench-press
      const day1Exercises = result.exercises.filter((e) => e.day === 1);
      const benchSub = day1Exercises.find((e) => e.order === 2);
      expect(benchSub).toBeDefined();
      expect(benchSub?.exerciseName).toBe('Dumbbell Bench Press');
      expect(benchSub?.wasSubstituted).toBe(true);
    });
  });
});
