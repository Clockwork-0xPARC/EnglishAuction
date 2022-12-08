import { atom } from 'recoil';
import { Player } from '@clockworklabs/english-auction';

export const match_state = atom<{ players: Player[] }>({
    key: 'match_state',
    default: {
        players: []
    }
});
