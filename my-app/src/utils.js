import { v4 as uuidv4 } from 'uuid';

export function isNotInMatches (matches, email) {
    return matches.every(m => isNotInMatch(m, email));
}

export function isNotInMatch (match, email)  {
    return (!match.Player1 || match.Player1.email !== email) &&
        (!match.Player2 || match.Player2.email !== email) &&
        (!match.Player3 || match.Player3.email !== email) &&
        (!match.Player4 || match.Player4.email !== email);
}


export function suggestMatch(plannedGames, matches, registrations) {
    let newMatches = [...matches];

    for (let i=0;i<plannedGames.length;i++) {
        let plannedGame = plannedGames[i];

        let regsForGame = registrations.filter(reg=>reg.GameID === plannedGame.id);
        let matchesForGame = newMatches.filter(m=>m.GameID === plannedGame.id);

        let unassignedRegsForGame = regsForGame.filter(r=>isNotInMatches(matchesForGame, r.email));


        for (let j=0;j<unassignedRegsForGame.length;j++) {
            let unassginedReg = unassignedRegsForGame[j];
            
            //refresh the list
            matchesForGame = newMatches.filter(m=>m.GameID === plannedGame.id);

            let matchWithFreePlayer = matchesForGame.find(m=>!m.Player1 || !m.Player2 || !m.Player3 || !m.Player4);
            if (matchWithFreePlayer) {
                //add player to this match
                if (!matchWithFreePlayer.Player1) {
                    matchWithFreePlayer.Player1 = unassginedReg;
                } else if (!matchWithFreePlayer.Player2) {
                    matchWithFreePlayer.Player2 = unassginedReg;
                } else if (!matchWithFreePlayer.Player3) {
                    matchWithFreePlayer.Player3 = unassginedReg;
                } else {
                    matchWithFreePlayer.Player4 = unassginedReg;
                }
            } else {
                let match = newMatch(plannedGame);
                match.Player1 = unassginedReg;
                newMatches.push(match);
            }
        }
    };
    return newMatches;
}


export function newMatch(game) {
    return {
        id: uuidv4(),
        GameID: game.id,
        Day: game.Day,
        Hour: game.Hour,
        Location: "רמת השרון",
        Court: "?"
    }
}