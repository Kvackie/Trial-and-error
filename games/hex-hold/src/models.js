// The KayKit models Hex Hold uses (all CC0, see CREDITS.md). tools/pack-models.mjs
// packs them into public/models/; the game looks them up by these names.
export const WORLD_MODELS = {
  hex: [
    'hex_grass',
    'hex_water',
    // nature
    'tree_single_A',
    'tree_single_B',
    'trees_A_medium',
    'trees_B_medium',
    'trees_A_small',
    'hills_A',
    'hills_B_trees',
    'hill_single_A',
    'mountain_A',
    'mountain_B',
    'mountain_C_grass',
    'rock_single_A',
    'rock_single_C',
    'waterlily_A',
    'cloud_small',
    // buildings (blue team)
    'building_castle_blue',
    'building_home_A_blue',
    'building_home_B_blue',
    'building_lumbermill_blue',
    'building_mine_blue',
    'building_windmill_blue',
    'building_watermill_blue',
    'building_market_blue',
    'building_barracks_blue',
    'building_archeryrange_blue',
    'building_church_blue',
    'building_tower_A_blue',
    'building_well_blue',
    'building_grain',
    'building_scaffolding',
    'building_destroyed',
    'flag_blue',
    'resource_lumber',
    'resource_stone',
  ],
  dungeon: ['wall_doorway', 'torch_mounted', 'banner_patternA_red', 'rubble_large', 'chest_gold', 'barrel_small_stack'],
};

// Hero bodies, by unit id (animations are shared, from animations.glb).
export const HEROES = {
  knight: 'Knight',
  barbarian: 'Barbarian',
  rogue: 'Rogue',
  scout: 'Rogue_Hooded',
  mage: 'Mage',
};

export const HERO_ANIMATIONS = [
  'Idle',
  'Walking_A',
  'Running_A',
  '1H_Melee_Attack_Chop',
  '2H_Melee_Attack_Chop',
  '1H_Ranged_Shoot',
  'Spellcast_Shoot',
  'Hit_A',
  'Death_A',
  'Death_A_Pose',
  'Cheer',
];
