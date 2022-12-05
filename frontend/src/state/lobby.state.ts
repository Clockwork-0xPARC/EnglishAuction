import { atom } from 'recoil';
import { Player } from '@clockworklabs/english-auction';

export const lobby_state = atom<{ players: Player[] }>({
    key: 'lobby_state',
    default: {
        players: []
    }
});
