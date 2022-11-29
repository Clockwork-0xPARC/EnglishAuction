import { atom } from 'recoil';
import { Player } from '../../types';

export const lobby_state = atom<{ players: Player[] }>({
    key: 'lobby_state',
    default: {
        players: []
    }
});
