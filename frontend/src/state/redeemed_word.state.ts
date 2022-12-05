import { atom } from 'recoil';
import { RedeemedWord } from '@clockworklabs/english-auction';

export const redeemed_word_state = atom<{ words: RedeemedWord[] }>({
    key: 'redeemed_word_state',
    default: {
        words: []
    }
});
