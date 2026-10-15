import { sequencers } from './content';
import type { SequencerId } from './types';

export const SEQUENCER_OPTIONS: { id: SequencerId; name: string; logo: (typeof sequencers)[number] }[] = [
  { id: 'instantly', name: 'Instantly', logo: sequencers[0] },
  { id: 'smartlead', name: 'Smartlead', logo: sequencers[1] },
  { id: 'emailbison', name: 'EmailBison', logo: sequencers[2] },
  { id: 'lemlist', name: 'lemlist', logo: sequencers[3] },
  { id: 'apollo', name: 'Apollo', logo: sequencers[4] },
];

export const sequencerName = (id: SequencerId | 'other') =>
  SEQUENCER_OPTIONS.find(s => s.id === id)?.name ?? 'CSV export';
