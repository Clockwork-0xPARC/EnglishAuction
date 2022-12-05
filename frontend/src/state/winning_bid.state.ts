import { atom } from 'recoil';
import { WinningBid } from 'english-auction';

export const winning_bid_state = atom<{ winningBids: WinningBid[] }>({
    key: 'winning_bid_state',
    default: {
        winningBids: []
    }
});
