export type RewardId =
  | 'TRAINING_MAWASHI'
  | 'CHERRY_BLOSSOM_BOWL'
  | 'SACRED_TAWARA_STYLE'
  | 'CHAMPION_GOLD_MAWASHI';

export type RewardSlot = 'MAWASHI' | 'BOWL' | 'TAWARA';

export interface RewardDefinition {
  id: RewardId;
  slot: RewardSlot;
  name: string;
  description: string;
  icon: string;
  previewColor: string;
  accentColor: string;
  mawashiColor?: string;
}

export type RewardLoadout = Partial<Record<RewardSlot, RewardId>>;

export const REWARD_DEFINITIONS: Record<RewardId, RewardDefinition> = {
  TRAINING_MAWASHI: {
    id: 'TRAINING_MAWASHI',
    slot: 'MAWASHI',
    name: 'Training Mawashi',
    description: "Tengu's red-and-gold practice belt. Proof of your first rival victory.",
    icon: '🥋',
    previewColor: '#B91C1C',
    accentColor: '#F6C453',
    mawashiColor: '#B91C1C',
  },
  CHERRY_BLOSSOM_BOWL: {
    id: 'CHERRY_BLOSSOM_BOWL',
    slot: 'BOWL',
    name: 'Cherry Blossom Bowl',
    description: 'A spring-pink ceremonial dohyō earned from Cherry Slapper.',
    icon: '🌸',
    previewColor: '#D96C93',
    accentColor: '#FFD3E1',
  },
  SACRED_TAWARA_STYLE: {
    id: 'SACRED_TAWARA_STYLE',
    slot: 'TAWARA',
    name: 'Sacred Tawara Style',
    description: 'Golden straw bales awarded for moving the immovable Coconut Tank.',
    icon: '🌾',
    previewColor: '#A87324',
    accentColor: '#F5D98A',
  },
  CHAMPION_GOLD_MAWASHI: {
    id: 'CHAMPION_GOLD_MAWASHI',
    slot: 'MAWASHI',
    name: "Champion's Gold Mawashi",
    description: 'The final golden belt of a Yokozuna champion.',
    icon: '🏆',
    previewColor: '#D4AF37',
    accentColor: '#FFF2A8',
    mawashiColor: '#D4AF37',
  },
};

const LEGACY_REWARD_NAMES: Record<string, RewardId> = {
  'Training Mawashi': 'TRAINING_MAWASHI',
  'Cherry Blossom Bowl': 'CHERRY_BLOSSOM_BOWL',
  'Sacred Tawara Style': 'SACRED_TAWARA_STYLE',
  "Champion's Gold Mawashi": 'CHAMPION_GOLD_MAWASHI',
};

export function normalizeRewardId(value: unknown): RewardId | null {
  if (typeof value !== 'string') return null;
  if (value in REWARD_DEFINITIONS) return value as RewardId;
  return LEGACY_REWARD_NAMES[value] ?? null;
}
