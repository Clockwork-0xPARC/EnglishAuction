import { useRecoilState } from 'recoil';
import { lobby_state } from '../state/lobby.state';

export const Scoreboard = () => {
    const [lobbyState, setLobbyState] = useRecoilState(lobby_state);

    return (
        <div className="h-1/5 mt-8 bg-card-color w-1/4 p-4 rounded-lg shadow-2xl">
            <h2 className="text-lg text-center font-bold tracking-widest uppercase text-primary">
                Scoreboard
            </h2>
            {lobbyState.players.length === 0 && (
                <p className="text-center tracking-wide uppercase text-faint mt-12 font-medium">
                    Unavailable
                </p>
            )}
        </div>
    );
};
