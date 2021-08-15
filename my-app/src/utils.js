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

        let regsForGame = registrations.filter(reg => reg.GameID === plannedGame.id);
        let matchesForGame = newMatches.filter(m => m.GameID === plannedGame.id);

        let unassignedRegsForGame = regsForGame.filter(r => isNotInMatches(matchesForGame, r.email));


        for (let j = 0; j < unassignedRegsForGame.length; j++) {
            let unassginedReg = unassignedRegsForGame[j];

            let user = (unassginedReg);
            //refresh the list
            matchesForGame = newMatches.filter(m => m.GameID === plannedGame.id);

            let matchWithFreePlayer = matchesForGame.find(m => !m.Player1 || !m.Player2 || !m.Player3 || !m.Player4);
            if (matchWithFreePlayer) {
                //add player to this match
                if (!matchWithFreePlayer.Player1) {
                    matchWithFreePlayer.Player1 = user;
                } else if (!matchWithFreePlayer.Player2) {
                    matchWithFreePlayer.Player2 = user;
                } else if (!matchWithFreePlayer.Player3) {
                    matchWithFreePlayer.Player3 = user;
                } else {
                    matchWithFreePlayer.Player4 = user;
                }
            } else {
                let match = newMatch(plannedGame);
                match.Player1 = user;
                newMatches.push(match);
            }
        }
    };
    return newMatches;
}

export function cleansePlayer(user) {
    if (!user)
        return user;
    return { displayName: user.displayName, email: user.email }
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