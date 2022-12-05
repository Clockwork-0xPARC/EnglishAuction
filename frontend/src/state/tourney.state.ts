import { atom } from 'recoil';
import { MatchState, TournamentState } from '@clockworklabs/english-auction';

export const tourney_state = atom<
    TournamentState & {
        currentMatch?: MatchState;
    }
>({
    key: 'tourney_state',
    default: {
        version: -1,
        status: -1,
        current_match_id: -1
    }
});
