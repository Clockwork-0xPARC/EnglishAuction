import { atom } from 'recoil';
import { TournamentPlayer } from '@clockworklabs/english-auction';

export const lobby_state = atom<{ players: TournamentPlayer[] }>({
    key: 'lobby_state',
    default: {
        players: []
    }
});
