export type EnemyKind = 'BUG' | 'ICE' | 'WASABI' | 'ARMOR_BUG' | 'GINKO_MAGNET';

export interface EnemyDefinition {
  kind: EnemyKind;
  name: string;
  nameJp: string;
  subtitle: string;
  description: string;
  counterDescription: string;
  effectiveSkills: ('SALT' | 'PALM_STRIKE' | 'TAIKO_PULSE')[];
  baseMass: number;
  baseRadius: number;
  scoreValue: number;
  icon: string;
  color: string;
  firstCareerLevel: number;
}

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  BUG: {
    kind: 'BUG',
    name: 'Rotten Beetle',
    nameJp: '腐れ甲虫',
    subtitle: 'Nuisance Pest',
    description: 'Small round pest with twitching antennae. Light and easy to push out.',
    counterDescription: 'Dissolved by Sacred Salt or easily shoved out of the dohyō.',
    effectiveSkills: ['SALT'],
    baseMass: 3.5,
    baseRadius: 18,
    scoreValue: 120,
    icon: '🪲',
    color: '#8E44AD',
    firstCareerLevel: 3,
  },
  ICE: {
    kind: 'ICE',
    name: 'Ice Cub',
    nameJp: '氷小僧',
    subtitle: 'Frosty Slick Block',
    description: 'Angular ice creature with visible fracture lines. Extremely slick and friction-free.',
    counterDescription: 'Shattered instantly by Palm Strike or melted by Sacred Salt. Can also be pushed out.',
    effectiveSkills: ['PALM_STRIKE', 'SALT'],
    baseMass: 6.0,
    baseRadius: 22,
    scoreValue: 150,
    icon: '🧊',
    color: '#3498DB',
    firstCareerLevel: 4,
  },
  WASABI: {
    kind: 'WASABI',
    name: 'Wasabi Slug',
    nameJp: '山葵粘獣',
    subtitle: 'Sticky Sludge Rikishi',
    description: 'Squat green creature with a viscous footprint. Slows down any rikishi that makes contact.',
    counterDescription: 'Dispersed by Taiko Pulse, purified by Sacred Salt, or crushed with 3 direct hits.',
    effectiveSkills: ['TAIKO_PULSE', 'SALT'],
    baseMass: 9.0,
    baseRadius: 25,
    scoreValue: 250,
    icon: '🟢',
    color: '#27AE60',
    firstCareerLevel: 13,
  },
  ARMOR_BUG: {
    kind: 'ARMOR_BUG',
    name: 'Armored Beetle',
    nameJp: '鉄甲虫',
    subtitle: 'Heavy Plated Tank',
    description: 'Substantially larger beetle with a segmented iron shell and 2 visible guard shields.',
    counterDescription: 'Palm Strike removes 1 guard shield per hit. Still movable and vulnerable to ring-outs!',
    effectiveSkills: ['PALM_STRIKE'],
    baseMass: 5.25, // 1.5x regular beetle (3.5 * 1.5)
    baseRadius: 24,
    scoreValue: 300,
    icon: '🛡️',
    color: '#5D6D7E',
    firstCareerLevel: 15,
  },
  GINKO_MAGNET: {
    kind: 'GINKO_MAGNET',
    name: 'Ginkgo Trickster',
    nameJp: '銀杏戯者',
    subtitle: 'Magnetic Gravity Well',
    description: 'Golden pest emitting a pulsing gravitational pull that drags nearby rikishi off-target.',
    counterDescription: 'Dispersed immediately by Taiko Pulse shockwave, or pushed over the tawara edge.',
    effectiveSkills: ['TAIKO_PULSE'],
    baseMass: 4.5,
    baseRadius: 20,
    scoreValue: 280,
    icon: '🟡',
    color: '#F39C12',
    firstCareerLevel: 19,
  },
};
