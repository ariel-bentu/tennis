import { v4 as uuidv4 } from 'uuid';

export function isNotInMatches(matches, email) {
    return matches.every(m => isNotInMatch(m, email));
}

export function isNotInMatch(match, email) {
    return (!match.Player1 || match.Player1.email !== email) &&
        (!match.Player2 || match.Player2.email !== email) &&
        (!match.Player3 || match.Player3.email !== email) &&
        (!match.Player4 || match.Player4.email !== email);
}


export function suggestMatch(plannedGames, matches, registrations) {
    let newMatches = [...matches];

    for (let i = 0; i < plannedGames.length; i++) {
        let plannedGame = plannedGames[i];
        let regsForGame = registrations.filter(reg => reg.GameID === plannedGame.id).sort((r1,r2)=>r1._order - r2._order);
        let matchesForGame = newMatches.filter(m => m.GameID === plannedGame.id);

        let unassignedRegsForGame = regsForGame.filter(r => isNotInMatches(matchesForGame, r.email));

        //take only multiple of 4
        let numOfMatches = Math.floor(unassignedRegsForGame.length / 4);

        let unassignedRegsByRank = unassignedRegsForGame.slice(0, numOfMatches*4).sort((r1,r2)=>r1.rank - r2.rank)

        for (let j=0;j<numOfMatches*4;j+=4) {
            let newM = newMatch(plannedGame);
            newM.Player1 = unassignedRegsByRank[j];
            newM.Player2 = unassignedRegsByRank[j+3];
            newM.Player3 = unassignedRegsByRank[j+1];
            newM.Player4 = unassignedRegsByRank[j+2];

            newMatches.push(newM);
        }
    };
    return newMatches;
}

export function cleansePlayer(user) {
    if (!user)
        return user;

    let cPlayer =  { displayName: user.displayName, email: user.email};
    if (user._order)
        cPlayer._order = user._order;

    return cPlayer;
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

export function getMatchMessage(plannedGames, matches) {
    let message = "שיבוץ טניס!ֿ\n\n";
    for (let i = 0; i < plannedGames.length; i++) {
        message += `***** ${plannedGames[i].Day} *****\n`;
        let dayMatches = matches.filter(m => m.GameID === plannedGames[i].id && !m.deleted);
        if (!dayMatches || dayMatches.length === 0) {
            message += "טרם"
        } else {
            for (let j = 0; j < dayMatches.length; j++) {
                if (!dayMatches[j].Player1 || !dayMatches[j].Player3) {
                    if (dayMatches.length === 1) {
                        message += "טרם"
                    }
                    //skip this game
                    continue;
                }
                let couples = dayMatches[j].Player2 || dayMatches[j].Player4;
                let missing = couples && (!dayMatches[j].Player2 || !dayMatches[j].Player4);

                message += `${dayMatches[j].Location} מגרש ${dayMatches[j].Court} (${dayMatches[j].Hour}):\n`;


                message += `${dayMatches[j].Player1.displayName} `;
                if (missing) {
                    message += "\n";
                    if (dayMatches[j].Player2) {
                        message += `${dayMatches[j].Player2.displayName}\n`;
                    }
                    if (dayMatches[j].Player3) {
                        message += `${dayMatches[j].Player3.displayName}\n`;
                    }
                    if (dayMatches[j].Player4) {
                        message += `${dayMatches[j].Player4.displayName}\n`;
                    }
                    message += "חסר אחד!";
                } else {
                    if (couples) {
                        message += `ו${dayMatches[j].Player2.displayName} `;
                    }
                    message += "vs ";
                    message += `${dayMatches[j].Player3.displayName} `;
                    if (couples) {
                        message += `ו${dayMatches[j].Player4.displayName}`;
                    }
                }

                message += "\n\n"
            }
        }
    }

    return message;

}