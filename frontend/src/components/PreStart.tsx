import Loader from './Loader';
import { LogoMain } from './LogoMain';
import { LogoTextImage } from './LogoTextImage';

export const PreStart = () => {
    return (
        <div className="flex items-center justify-center flex-col h-screen">
            <h2 className="text-faint text-center text-lg mb-8">
                Presented By
            </h2>
            <div className="flex flex-col items-center justify-center mb-12">
                <LogoMain styles={{ paddingBottom: '4px' }} width="75px" />
                <LogoTextImage width="200px" />
            </div>
            <h1 className="text-3xl font-bold tracking-widest text-white text-center my-4">
                ENGLISH AUCTION
            </h1>
            <p className="text-faint">Waiting For Tournament Data</p>
            <Loader color="white" size={80} />
        </div>
    );
};
