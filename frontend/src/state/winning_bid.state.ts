import { atom } from 'recoil';
import { WinningBid } from '@clockworklabs/english-auction';

export const winning_bid_state = atom<{ winningBids: WinningBid[] }>({
    key: 'winning_bid_state',
    default: {
        winningBids: []
    }
});
