import { useRecoilState } from 'recoil';
import { LobbyList } from './components/LobbyList';
import { PreStart } from './components/PreStart';
import { Scoreboard } from './components/Scoreboard';
import { tourney_state } from './state/tourney.state';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import axios from 'axios';
import { w3cwebsocket as WSClient } from 'websocket';
import { lobby_state } from './state/lobby.state';

const SERVER_HOSTNAME = `http://partner.spacetimedb.net:3000`;

const wsConnection = () => {
    const ws = new WSClient(
        `ws://partner.spacetimedb.net:3000/database/subscribe?name_or_address=eead6d24dd90fe95815244e69685298f`,
        'v1.text.spacetimedb',
        undefined
        // {
        //     'Spacetime-Identity': identity,
        //     'Spacetime-Identity-Token': token
        // }
    );

    return ws;
};

const App = () => {
    const [tourneyState, setTourneyState] = useRecoilState(tourney_state);
    const [lobbyState, setLobbyState] = useRecoilState(lobby_state);

    useEffect(() => {
        const ws = wsConnection();

        ws.onmessage = (message: any) => {
            const data = JSON.parse(message.data);

            if (data) {
                if (data['SubscriptionUpdate']) {
                    const tournament_data =
                        data['SubscriptionUpdate']['table_updates'][0][
                            'table_row_operations'
                        ][0];

                    const match_data =
                        data['SubscriptionUpdate']['table_updates'][3][
                            'table_row_operations'
                        ][0];

                    const player_data =
                        data['SubscriptionUpdate']['table_updates'][2][
                            'table_row_operations'
                        ];

                    console.log(player_data);

                    setTourneyState({
                        version: tournament_data['row'][0],
                        status: tournament_data['row'][1],
                        current_match_id: tournament_data['row'][2],
                        currentMatch: {
                            id: match_data['row'][0],
                            status: match_data['row'][1],
                            skipped_first_round: match_data['row'][2],
                            is_last_round: match_data['row'][3]
                        }
                    });

                    setLobbyState({
                        players: player_data.map((player: any) => ({
                            id: player['row'][0]['data'],
                            points: player['row'][1]
                        }))
                    });
                }
            }
        };
    }, []);

    return (
        <div className="max-w-screen-2xl m-auto p-4 text-white">
            <Toaster position="bottom-right" />
            {tourneyState.status === -1 ? (
                <PreStart />
            ) : (
                <div className="flex h-screen m-auto items-center">
                    <div className="flex flex-col w-full h-full justify-around">
                        <Scoreboard />
                        <LobbyList />
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
