import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRecoilState } from 'recoil';
import { MAX_PLAYERS } from '../constants';
import { lobby_state } from '../state/lobby.state';

export const LobbyList = () => {
    const [lobbyState, setLobbyState] = useRecoilState(lobby_state);

    useEffect(() => {}, []);

    const on_join = (player: string | number) => {
        toast(t => (
            <div>
                <div className="mr-2">
                    <b>Player {player}</b> has joined the lobby
                </div>
                <button
                    className="bg-gray-600 rounded-md text-white p-2 mt-2 w-full"
                    onClick={() => toast.dismiss(t.id)}
                >
                    Dismiss
                </button>
            </div>
        ));
    };

    return (
        <div className="flex-1 my-12 bg-card-color w-1/4 p-4 rounded-lg shadow-2xl">
            <div className="flex justify-between">
                <h2 className="text-lg font-bold text-primary tracking-widest uppercase">
                    Lobby
                </h2>
                <p className="text-faint text-lg">
                    {lobbyState.players.length} / {MAX_PLAYERS}
                </p>
            </div>
            {lobbyState.players.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    Unavailable
                </p>
            )}
        </div>
    );
};
