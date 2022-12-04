import { useRecoilState } from 'recoil';
import { LobbyList } from './components/LobbyList';
import { PreStart } from './components/PreStart';
import { Scoreboard } from './components/Scoreboard';
import { tourney_state } from './state/tourney.state';
import toast, { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { lobby_state } from './state/lobby.state';
import { auction_state } from './state/auction.state';
import { EAClient } from 'english-auction';

const App = () => {
    const [tourneyState, setTourneyState] = useRecoilState(tourney_state);
    const [, setLobbyState] = useRecoilState(lobby_state);
    const [auctionState, setAuctionState] = useRecoilState(auction_state);

    const auctions = auctionState.auctions.slice().sort((a, b) => b.auction_index - a.auction_index);

    const onJoin = (player: string) => {
        toast(t => (
            <div className="flex flex-col">
                <div className="mr-2">
                    <b>
                        <span>{player}</span>
                    </b>{' '}
                    has joined the lobby
                </div>
                <button
                    className="bg-gray-600 rounded-md text-white p-2 mt-2 w-[150px]"
                    onClick={() => toast.dismiss(t.id)}
                >
                    Dismiss
                </button>
            </div>
        ));
    };

    useEffect(() => {
        const client = new EAClient();
        client.onTournamentStateUpdate(tournamentState => {
            setTourneyState({
                version: tournamentState.version,
                status: tournamentState.status,
                current_match_id: tournamentState.current_match_id,
                currentMatch: {
                    id: 0,
                    status: 0,
                    skipped_first_round: false,
                    is_last_round: false
                }
            });
        });

        client.onPlayerJoined(player => {
            const players = client.getAllPlayers();
            setLobbyState({
                players,
            });
            onJoin(player.name);
        });

        client.onPlayerUpdate(player => {
            const players = client.getAllPlayers();
            setLobbyState({
                players,
            });
        })

        client.onTileAuction(() => {
            let auctions = client.getAuctions();
            setAuctionState({
                auctions,
            });
        });

    }, [setAuctionState, setLobbyState, setTourneyState]);

    return (
        <div className="max-w-screen-2xl m-auto p-4 text-white">
            <Toaster position="bottom-right" />
            {tourneyState.status === -1 ? (
                <PreStart />
            ) : (
                <div className="flex w-full h-screen m-auto items-center">
                    <div className="flex flex-col w-1/4 h-full justify-around">
                        <Scoreboard />
                        <LobbyList />
                    </div>
                    <div className="flex flex-col w-2/4 m-auto items-center justify-center">
                        {auctions.length > 0 &&
                            auctions.slice(0, 10).map((x, index) => (
                                <div
                                    key={index}
                                    className="my-4 w-full"
                                    style={{
                                        opacity: index !== 0 ? 0.5 : 1
                                    }}
                                >
                                    <div className="bg-card-color p-8 rounded-xl shadow-lg flex flex-col justify-center items-center">
                                        <h2 className="text-2xl">
                                            {index === 0
                                                ? `Current Round (${x.auction_index})`
                                                : `Prior round (${x.auction_index})`}
                                        </h2>
                                        <p className="my-4 text-lg font-bold text-yellow-500">
                                            Letter: {x.letter}
                                        </p>
                                        {index !== 0 && (
                                            <p className="text-faint">
                                                Bid Won By{' '}
                                                <span className="text-primary">
                                                    Player 2
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
