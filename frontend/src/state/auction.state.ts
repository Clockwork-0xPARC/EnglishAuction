import { atom } from 'recoil';
import { Player, TileAuction } from '../../types';

export const auction_state = atom<{ bids: TileAuction[] }>({
    key: 'auction_state',
    default: {
        bids: []
    }
});
