import { useRecoilState } from 'recoil';
import { LobbyList } from './components/LobbyList';
import { PreStart } from './components/PreStart';
import { Scoreboard } from './components/Scoreboard';
import { tourney_state } from './state/tourney.state';
import { Toaster } from 'react-hot-toast';

const App = () => {
    const [tourneyState, setTourneyState] = useRecoilState(tourney_state);

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
