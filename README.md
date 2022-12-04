# 0xPARC EnglishAuction Game

# Prize 
0.5 ETH ($650)
> NOTE: The system is not yet stable. Actively trying to ruin the game will disqualify you.

# Rules
The rules of the word game played between bot programs are as follows:

- The game is played by bots that are written by programmers.
- Bots can join a match room with a maximum of 5 participants.
- The game starts with a hidden bag of 100 scrabble letters.
- Each bot is secretly given 5 letters from the bag.
- Each bot is given 100 points to start.
- The remaining scrabble letters are auctioned off to the bots in a first price, sealed bid auction.
- Every second, a random letter is chosen from the bag and shown to all participants.
- All bots are assumed to bid 0 for the letter at the start of the second.
- During the 1-second auction period, the bots can change their current bid for the letter.
- At the end of the 1-second period, the highest bidder is chosen and awarded the letter.
- In case of a tie, the earlier bidder wins.
- All participants can see the ID of the winning bidder.
- This process continues until all the letters have been auctioned off.
- At any time during the auction, a bot can submit a word that they can create using their letters. The word will be secretly scored according to the scrabble letter point rules, with a bonus of 10 points for words that are 9 letters long.
- Once all the letters have been auctioned off, the bots have 1 additional second to submit their words for scoring.
- All bots are ranked by the number of points they have scored.
- A tournament consists of 10 matches, and the winner is the player who has scored the most points in total across all matches.

# How to participate
1. Form a team (however many people you want) and post your team name in our #0xPARC Discord channel
1. Write a bot (see #how to make a bot)
1. At 6 PM on Monday we will begin running test tournaments for people to try out their bot
   1. The test tournaments will run 100 matches (~2 hours)
   1. The match can have at most 5 bots join
   1. The matches will be shown in real time at this url (url)
   1. Each bot will accumulate points across all matches and will be shown on the dashboard
   1. You can test out your bots against each other in these tournaments, joining and leaving at will
1. At 9 PM on Thursday we are going to run the actual tournament
   1. The tournament will consist of 10 matches played consecutively
   2. The bot with the most post points will win
   3. Winner gets 0.5 ETH


# Making a bot
Here is an example bot which uses our Typescript SDK:

```typescript
// Everything below this is part of an example bot that uses EAClient
const checkWord = (myTiles: LetterTile[], word: string): LetterTile[] | null => {
    const tilesChosen = [];
    const myTilesRemaining = [...myTiles];
    for (const letter of word) {
        let found = false;
        for (let i = 0; i < myTilesRemaining.length;) {
            const tile = myTilesRemaining[i];
            if (tile.letter == letter) {
                tilesChosen.push({...tile});
                myTilesRemaining.splice(i, 1);
                found = true;
                break;
            } else {
                i++;
            }
        }
        if (!found) {
            return null;
        }
    }
    return tilesChosen;
};

const findRedeemableWord = (myTiles: LetterTile[], words: string[]): LetterTile[] | null => {
    for (const word of words) {
        const result = checkWord(myTiles, word);
        if (result) {
            return result;
        }
    }
    return null;
};

const client = new EAClient(TODO your credentials);
client.onInitialStateSync(async () => {
    // TODO: do this the first time 
    client.getCredentials();
    await client.registerAsPlayer("Tyler");
    client.onTileAuction(auction => {
        client.makeBid(auction.auction_index, 1);
    });
    client.onReceiveTile(tile => {
        const myTiles = client.getMyTiles();
        let words = client.getWords();
        words = words.filter(word => word.length < 4);
        myTiles.sort((a, b) => a.letter.localeCompare(b.letter));
        const tiles = findRedeemableWord(myTiles, words);
        if (!tiles) {
            return;
        }
        const tileIds = tiles.map(tile => tile.tile_id);
        client.redeemWord(tileIds);
    });
});

```





