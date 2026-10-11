import { PrismaClient, Equipment, MuscleGroup, MovementPattern, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedExercise {
  externalId: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  movementPattern: MovementPattern;
  difficulty: Difficulty;
  instructions: string;
}

const starterExercises: SeedExercise[] = [
  // 1. Barbell
  {
    externalId: "barbell-bench-press",
    name: "Barbell Bench Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.shoulders],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.intermediate,
    instructions: "Lie flat on the bench with eyes under the bar. Grip slightly wider than shoulder width. Lower bar with control to mid-chest, then press upward to lockout.",
  },
  {
    externalId: "barbell-back-squat",
    name: "Barbell Back Squat",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes, MuscleGroup.hamstrings],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.intermediate,
    instructions: "Rest bar across upper traps. Stance shoulder-width. Descend by breaking at hips and knees until thighs are parallel to the floor, then drive through midfoot.",
  },
  {
    externalId: "barbell-deadlift",
    name: "Barbell Deadlift",
    primaryMuscle: MuscleGroup.hamstrings,
    secondaryMuscles: [MuscleGroup.glutes, MuscleGroup.back, MuscleGroup.traps],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.hinge,
    difficulty: Difficulty.advanced,
    instructions: "Stand with midfoot under barbell. Hinge at hips to grip bar. Set back flat, pull chest up, and drive floor away to lockout at hips.",
  },
  {
    externalId: "barbell-overhead-press",
    name: "Overhead Press",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.chest],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.intermediate,
    instructions: "Hold barbell at collarbone. Tighten core and glutes. Press bar vertically overhead until elbows are fully locked.",
  },
  {
    externalId: "barbell-bent-over-row",
    name: "Barbell Bent-Over Row",
    primaryMuscle: MuscleGroup.back,
    secondaryMuscles: [MuscleGroup.biceps, MuscleGroup.lats],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.intermediate,
    instructions: "Hinge torso to roughly 45 degrees. Grip bar overhand, pull bar towards lower ribcage, squeezing shoulder blades together.",
  },
  {
    externalId: "barbell-romanian-deadlift",
    name: "Barbell Romanian Deadlift",
    primaryMuscle: MuscleGroup.hamstrings,
    secondaryMuscles: [MuscleGroup.glutes],
    equipment: Equipment.barbell,
    movementPattern: MovementPattern.hinge,
    difficulty: Difficulty.intermediate,
    instructions: "Hold barbell at hip height. Push hips straight back with slight knee bend, lowering bar along shins until hamstrings are stretched, then drive hips forward.",
  },

  // 2. Dumbbell
  {
    externalId: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.shoulders],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Lie on flat bench with dumbbells over chest. Lower dumbbells with elbows around 45-75 degrees until deep chest stretch, then press back up.",
  },
  {
    externalId: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.shoulders, MuscleGroup.triceps],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.intermediate,
    instructions: "Set bench angle to 30-45 degrees. Press dumbbells upward in a slight converging arc without banging weights together.",
  },
  {
    externalId: "dumbbell-romanian-deadlift",
    name: "Dumbbell Romanian Deadlift",
    primaryMuscle: MuscleGroup.hamstrings,
    secondaryMuscles: [MuscleGroup.glutes],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.hinge,
    difficulty: Difficulty.beginner,
    instructions: "Hold dumbbells in front of thighs. Push hips backward keeping neutral spine. Lower dumbbells just past knees, then return upright.",
  },
  {
    externalId: "dumbbell-bicep-curl",
    name: "Dumbbell Bicep Curl",
    primaryMuscle: MuscleGroup.biceps,
    secondaryMuscles: [MuscleGroup.forearms],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Stand upright holding dumbbells at sides. Curl weights toward shoulders while supinating wrists. Lower slowly under control.",
  },
  {
    externalId: "dumbbell-lateral-raise",
    name: "Dumbbell Lateral Raise",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.traps],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Hold dumbbells at sides with slight forward torso lean. Raise arms laterally leading with elbows until parallel with floor.",
  },
  {
    externalId: "dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.triceps],
    equipment: Equipment.dumbbell,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Seated or standing, press dumbbells overhead from ear level until arms are fully extended overhead.",
  },

  // 3. Cable Machine
  {
    externalId: "triceps-rope-pushdown",
    name: "Triceps Rope Pushdown",
    primaryMuscle: MuscleGroup.triceps,
    secondaryMuscles: [],
    equipment: Equipment.cable_machine,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Attach rope to high pulley. Keep upper arms pinned at sides. Extend elbows downward and spread rope apart at full extension.",
  },
  {
    externalId: "cable-chest-fly",
    name: "Cable Chest Fly",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.shoulders],
    equipment: Equipment.cable_machine,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.intermediate,
    instructions: "Set pulleys at chest height. Take a staggered step forward. Bring hands together in a wide hugging arc, squeezing chest at center.",
  },
  {
    externalId: "cable-lateral-raise",
    name: "Cable Lateral Raise",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [],
    equipment: Equipment.cable_machine,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.intermediate,
    instructions: "Set pulley to lowest setting. Pull cable across body up to shoulder level with slight elbow bend.",
  },
  {
    externalId: "cable-face-pull",
    name: "Cable Face Pull",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.traps, MuscleGroup.back],
    equipment: Equipment.cable_machine,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.beginner,
    instructions: "Set pulley at eye height with rope. Pull towards bridge of nose while externally rotating wrists past ears.",
  },

  // 4. Smith Machine
  {
    externalId: "smith-machine-squat",
    name: "Smith Machine Squat",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes],
    equipment: Equipment.smith_machine,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.beginner,
    instructions: "Position bar on traps with feet slightly out in front. Unlock safety hooks, squat to parallel, and press through heels to return.",
  },
  {
    externalId: "smith-machine-incline-press",
    name: "Smith Machine Incline Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.shoulders, MuscleGroup.triceps],
    equipment: Equipment.smith_machine,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.intermediate,
    instructions: "Position incline bench under fixed track. Lower bar to upper chest, then press smoothly upward along guided path.",
  },
  {
    externalId: "smith-machine-shoulder-press",
    name: "Smith Machine Shoulder Press",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.triceps],
    equipment: Equipment.smith_machine,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Place upright bench under bar. Unrack and lower bar smoothly to chin level, then press overhead.",
  },

  // 5. Leg Press
  {
    externalId: "45-degree-leg-press",
    name: "45-Degree Leg Press",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes, MuscleGroup.hamstrings],
    equipment: Equipment.leg_press,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.beginner,
    instructions: "Place feet shoulder-width on footplate. Disengage stops, lower carriage until knees bend to 90 degrees, press platform back up without locking knees.",
  },
  {
    externalId: "horizontal-leg-press",
    name: "Horizontal Leg Press",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes],
    equipment: Equipment.leg_press,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.beginner,
    instructions: "Sit upright against back pad. Push footplate forward until legs are extended, then slowly return to starting depth.",
  },

  // 6. Hack Squat
  {
    externalId: "machine-hack-squat",
    name: "Machine Hack Squat",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes],
    equipment: Equipment.hack_squat,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.intermediate,
    instructions: "Rest back against pad with shoulders under cushions. Place feet middle-to-low on platform. Descend deep into squat, then press up through heels.",
  },
  {
    externalId: "reverse-hack-squat",
    name: "Reverse Hack Squat",
    primaryMuscle: MuscleGroup.glutes,
    secondaryMuscles: [MuscleGroup.hamstrings, MuscleGroup.quads],
    equipment: Equipment.hack_squat,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.intermediate,
    instructions: "Face machine pad with chest against cushion. Hinge hips back and squat down deeply to maximize glute and hamstring loading.",
  },

  // 7. Pulldown Machine
  {
    externalId: "lat-pulldown",
    name: "Lat Pulldown",
    primaryMuscle: MuscleGroup.lats,
    secondaryMuscles: [MuscleGroup.biceps, MuscleGroup.back],
    equipment: Equipment.pulldown_machine,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.beginner,
    instructions: "Secure thighs under pads. Grasp wide bar with overhand grip. Pull bar down smoothly to upper chest, leading with elbows.",
  },
  {
    externalId: "close-grip-lat-pulldown",
    name: "Close-Grip Lat Pulldown",
    primaryMuscle: MuscleGroup.lats,
    secondaryMuscles: [MuscleGroup.biceps, MuscleGroup.back],
    equipment: Equipment.pulldown_machine,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.beginner,
    instructions: "Attach V-grip handle to machine. Pull handle down to mid-chest while retracting shoulder blades and arching upper back slightly.",
  },

  // 8. Chest Press
  {
    externalId: "machine-chest-press",
    name: "Machine Chest Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.shoulders],
    equipment: Equipment.chest_press,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Adjust seat so handles are at mid-chest height. Press handles straight forward until arms extend, then return with control.",
  },
  {
    externalId: "incline-machine-chest-press",
    name: "Incline Machine Chest Press",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.shoulders, MuscleGroup.triceps],
    equipment: Equipment.chest_press,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Align handles with upper chest. Press forward and upward to target upper pectoral muscle fibers.",
  },

  // 9. Machines
  {
    externalId: "seated-leg-extension",
    name: "Seated Leg Extension",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [],
    equipment: Equipment.machines,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Align knee joint with machine axis of rotation. Extend legs upward until fully straight, hold briefly, then lower slowly.",
  },
  {
    externalId: "seated-leg-curl",
    name: "Seated Leg Curl",
    primaryMuscle: MuscleGroup.hamstrings,
    secondaryMuscles: [MuscleGroup.calves],
    equipment: Equipment.machines,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Align knees with pivot point. Curl lever pad down and back beneath seat, squeeze hamstrings, and resist on return.",
  },
  {
    externalId: "seated-cable-row-machine",
    name: "Seated Cable Row",
    primaryMuscle: MuscleGroup.back,
    secondaryMuscles: [MuscleGroup.biceps, MuscleGroup.lats],
    equipment: Equipment.machines,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.beginner,
    instructions: "Sit upright with feet on footplates. Pull handles into lower abdomen while keeping spine straight and squeezing shoulder blades.",
  },
  {
    externalId: "pec-deck-fly",
    name: "Pec Deck Fly",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.shoulders],
    equipment: Equipment.machines,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Sit with back flat against pad. Place forearms/hands on levers and bring arms together across chest in a controlled hugging motion.",
  },
  {
    externalId: "standing-calf-raise-machine",
    name: "Standing Calf Raise Machine",
    primaryMuscle: MuscleGroup.calves,
    secondaryMuscles: [],
    equipment: Equipment.machines,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Place balls of feet on block with shoulder pads resting on shoulders. Drop heels down for full stretch, then press up high on toes.",
  },

  // 10. Pull-Up Bar
  {
    externalId: "pull-up",
    name: "Pull-Up",
    primaryMuscle: MuscleGroup.lats,
    secondaryMuscles: [MuscleGroup.biceps, MuscleGroup.back],
    equipment: Equipment.pull_up_bar,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.intermediate,
    instructions: "Hang from pull-up bar with overhand grip wider than shoulder-width. Pull chest toward bar until chin clears bar height.",
  },
  {
    externalId: "chin-up",
    name: "Chin-Up",
    primaryMuscle: MuscleGroup.biceps,
    secondaryMuscles: [MuscleGroup.lats, MuscleGroup.back],
    equipment: Equipment.pull_up_bar,
    movementPattern: MovementPattern.pull,
    difficulty: Difficulty.intermediate,
    instructions: "Hang with underhand (supinated) grip at shoulder width. Pull body up until chin is comfortably over bar.",
  },
  {
    externalId: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    primaryMuscle: MuscleGroup.abs,
    secondaryMuscles: [MuscleGroup.forearms],
    equipment: Equipment.pull_up_bar,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.intermediate,
    instructions: "Hang from pull-up bar with straight arms. Raise legs up to 90 degrees without swinging body, pause, then lower with control.",
  },

  // 11. Resistance Bands
  {
    externalId: "band-pull-apart",
    name: "Band Pull-Apart",
    primaryMuscle: MuscleGroup.shoulders,
    secondaryMuscles: [MuscleGroup.traps, MuscleGroup.back],
    equipment: Equipment.resistance_bands,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Hold band at arm's length in front of chest. Pull hands apart horizontally until band touches chest, squeezing rear delts.",
  },
  {
    externalId: "banded-glute-bridge",
    name: "Banded Glute Bridge",
    primaryMuscle: MuscleGroup.glutes,
    secondaryMuscles: [MuscleGroup.hamstrings],
    equipment: Equipment.resistance_bands,
    movementPattern: MovementPattern.hinge,
    difficulty: Difficulty.beginner,
    instructions: "Place looped resistance band above knees. Lie on back with knees bent. Drive hips to ceiling against band tension, hold at top.",
  },
  {
    externalId: "band-assisted-push-up",
    name: "Band-Assisted Push-Up",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps],
    equipment: Equipment.resistance_bands,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Loop resistance band around waist or chest to support bodyweight during push-up movement pattern.",
  },

  // 12. Bodyweight
  {
    externalId: "push-up",
    name: "Push-Up",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.shoulders, MuscleGroup.abs],
    equipment: Equipment.bodyweight,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.beginner,
    instructions: "Set hands slightly wider than shoulders. Maintain rigid plank from head to heels. Lower chest to floor and press back up.",
  },
  {
    externalId: "parallel-bar-dip",
    name: "Parallel Bar Dip",
    primaryMuscle: MuscleGroup.chest,
    secondaryMuscles: [MuscleGroup.triceps, MuscleGroup.shoulders],
    equipment: Equipment.bodyweight,
    movementPattern: MovementPattern.push,
    difficulty: Difficulty.intermediate,
    instructions: "Suspend body on parallel dip bars. Lean torso forward slightly, lower body until elbows hit 90 degrees, then press back up.",
  },
  {
    externalId: "bodyweight-air-squat",
    name: "Bodyweight Air Squat",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes, MuscleGroup.hamstrings],
    equipment: Equipment.bodyweight,
    movementPattern: MovementPattern.squat,
    difficulty: Difficulty.beginner,
    instructions: "Stand with feet shoulder-width apart. Squat down until hips dip below parallel, keeping chest high, then return upright.",
  },
  {
    externalId: "plank",
    name: "Plank",
    primaryMuscle: MuscleGroup.abs,
    secondaryMuscles: [MuscleGroup.shoulders, MuscleGroup.full_body],
    equipment: Equipment.bodyweight,
    movementPattern: MovementPattern.isolation,
    difficulty: Difficulty.beginner,
    instructions: "Rest on forearms and toes, elbows under shoulders. Keep body in a straight line from crown to heels and brace core firmly.",
  },
  {
    externalId: "walking-lunge",
    name: "Walking Lunge",
    primaryMuscle: MuscleGroup.quads,
    secondaryMuscles: [MuscleGroup.glutes, MuscleGroup.hamstrings],
    equipment: Equipment.bodyweight,
    movementPattern: MovementPattern.lunge,
    difficulty: Difficulty.beginner,
    instructions: "Step forward into a deep lunge until trailing knee gently taps floor, then drive through leading heel into the next forward step.",
  },
];

async function main(): Promise<void> {
  console.log(`Seeding ${starterExercises.length} starter exercises across all 12 equipment categories...`);

  for (const ex of starterExercises) {
    await prisma.exercise.upsert({
      where: { externalId: ex.externalId },
      update: {
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        movementPattern: ex.movementPattern,
        difficulty: ex.difficulty,
        instructions: ex.instructions,
      },
      create: {
        externalId: ex.externalId,
        name: ex.name,
        primaryMuscle: ex.primaryMuscle,
        secondaryMuscles: ex.secondaryMuscles,
        equipment: ex.equipment,
        movementPattern: ex.movementPattern,
        difficulty: ex.difficulty,
        instructions: ex.instructions,
      },
    });
  }

  const count = await prisma.exercise.count();
  console.log(`Seeding complete. Total exercises in database: ${count}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error seeding database:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
