const axios = require("axios");
const fs = require("fs");
const archiver = require('archiver');
const elo = require("elo-rating");
const Excel = require("exceljs")



const dayjs = require('dayjs');

var weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)

const db = require('./local-cred').db;

const {
    FieldPath,
    FieldValue,
} = require("@google-cloud/firestore");
const { match } = require("assert");

function moveStatsYear() {
    const batch = db.batch();

    db.collection("stats").get().then(stats => {
        stats.docs.forEach(stat => {
            const statData = stat.data()
            batch.update(stat.ref, {
                loses2021: statData.loses,
                wins2021: statData.wins,
                ties2021: statData.ties,
                loses: 0,
                wins: 0,
                ties: 0,
                elo2: statData.elo2021,
                elo1: 1500,
            });
        })
        batch.commit()
    })
}
//year as string
//update elo1 from 1500
function RecreateStats(year, eloFieldName, eloInitFieldName, players) {
    const waitFor = []

    let matchRef = db.collection("matches-archive");
    if (year) {
        matchRef = matchRef.where("date", ">=", year)
    }
    matchRef = matchRef.orderBy("date", "asc")

    waitFor.push(db.collection("stats").get());
    waitFor.push(matchRef.get());


    Promise.all(waitFor).then(all => {
        const matches = all[1].docs.filter(doc => {
            return (doc.data().matchCancelled == undefined || doc.data().matchCancelled == false) &&
                doc.data().Player2 != undefined && (!year || doc.data().date.startsWith(year))
        });


        let curStats = all[0].docs;

        const statUpdates = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i].data()
            if (!match.sets) {
                continue;
            }
            const winner = calcWinner(match.sets, match.pairQuit, match.matchCancelled)
            if (winner === -1) {
                continue;
            }

            const pair1EloAvg = getEloAvg(statUpdates, curStats, match.Player1, match.Player2, eloFieldName, eloInitFieldName);
            const pair2EloAvg = getEloAvg(statUpdates, curStats, match.Player3, match.Player4, eloFieldName, eloInitFieldName);

            if (isNaN(pair1EloAvg[eloFieldName]) || isNaN(pair2EloAvg[eloFieldName])) {
                debugger
            }
            const newElo1Rating = elo.calculate(pair1EloAvg[eloFieldName], pair2EloAvg[eloFieldName], winner === 1, 32);

            const eloDiff1_p1_2 = Math.abs(newElo1Rating.playerRating - pair1EloAvg[eloFieldName]);
            const eloDiff1_p3_4 = Math.abs(newElo1Rating.opponentRating - pair2EloAvg[eloFieldName]);

            console.log("elo", eloDiff1_p1_2, eloDiff1_p3_4)

            const updatePlayer = (p, firstPair) => {
                let updateIndex = statUpdates.findIndex(s => s.email === p.email);
                if (updateIndex < 0) {
                    const curStat = curStats.find(c => c.ref.id === p.email)
                    if (!curStat) {
                        //only update existing stats
                        //return;
                    }

                    statUpdates.push({
                        email: p.email,
                        [eloFieldName]: curStat.data()[eloInitFieldName] || 1500,
                        // wins: 0,
                        // loses: 0,
                        // ties: 0,
                    })
                    updateIndex = statUpdates.length - 1;
                }

                const win = (firstPair && winner == 1) || (!firstPair && winner == 2)
                const lose = (firstPair && winner == 2) || (!firstPair && winner == 1)
                const tie = winner == 0

                // statUpdates[updateIndex].wins += win ? 1 : 0;
                // statUpdates[updateIndex].loses += lose ? 1 : 0;
                // statUpdates[updateIndex].ties += tie ? 1 : 0;

                if (win) {
                    statUpdates[updateIndex][eloFieldName] += (firstPair ? eloDiff1_p1_2 : eloDiff1_p3_4);
                }
                if (lose) {
                    statUpdates[updateIndex][eloFieldName] -= (firstPair ? eloDiff1_p1_2 : eloDiff1_p3_4);;
                }
                if (isNaN(statUpdates[updateIndex][eloFieldName])) {
                    debugger
                }
            }

            updatePlayer(match.Player1, true);
            updatePlayer(match.Player2, true);
            updatePlayer(match.Player3, false);
            updatePlayer(match.Player4, false);
        }


        const batch = db.batch();
        statUpdates.forEach(update => {
            if (!players || players.findIndex(p => p === update.email) !== -1) {
                const statRef = all[0].docs.find(s => s.ref.id === update.email);

                batch.update(statRef.ref, update);
                console.log("update", statRef.ref.id, update);
            }
        });
        batch.commit();

        // console.log("differences of > 25", eloFieldName, "init", eloInitFieldName)
        // statUpdates.forEach(update => {
        //     const statRef = all[0].docs.find(s => s.ref.id === update.email);
        //     if (Math.abs(update[eloFieldName] - statRef.data()[eloFieldName]) > 25) {
        //         console.log(update.email, "new", update[eloFieldName], "curr", statRef.data()[eloFieldName])
        //     }

        //     if (update.wins !== statRef.data().wins ||
        //     update.loses !== statRef.data().loses ||
        //     update.ties !== statRef.data().ties 
        //     ) {
        //         console.log(update.email, "wins/loses mismatch")
        //         console.log(update)
        //         console.log(JSON.stringify(statRef.data()))
        //     }

        // })



        //console.log("done", JSON.stringify(statUpdates, undefined, "  "))

    });

}


// Actual work:
//RecreateStats(undefined, "elo1", "none")

//["yhorr@017.net.il", "ofertalmon@gmail.com", "asaflevy22@gmail.com", "dandan.koper@gmail.com"])
// function loadStats2021ForBackup() {
//     let gib =  fs.readFileSync("/Users/i022021/Downloads/stats.json", 'utf8');
//     let stats = JSON.parse(gib)
//     const batch = db.batch();

//     stats.forEach(stat=>{
//         let ref = db.collection("stats").doc(stat._docID)
//         batch.update(ref, {elo2021: stat.elo1})
//     })
//     batch.commit();
// }
// loadStats2021ForBackup()


// Util functions
const toNum = (v) => parseInt(v);


const calcWinner = (sets, pairQuit, cancelled) => {
    if (pairQuit) {
        return pairQuit === 1 ? 2 : 1;
    }
    if (cancelled) {
        return -1;
    }
    const wonSets1 = sets.reduce((prev, curr) => prev + (toNum(curr.pair1) > toNum(curr.pair2) ? 1 : 0), 0);
    const wonSets2 = sets.reduce((prev, curr) => prev + (toNum(curr.pair1) < toNum(curr.pair2) ? 1 : 0), 0);

    if (wonSets1 > wonSets2) {
        return 1;
    } else if (wonSets1 < wonSets2) {
        return 2;
    } else {
        const wonGames1 = sets.reduce((prev, curr) => prev + toNum(curr.pair1), 0);
        const wonGames2 = sets.reduce((prev, curr) => prev + toNum(curr.pair2), 0);
        if (wonGames1 > wonGames2) {
            return 1;
        } else if (wonGames1 < wonGames2) {
            return 2;
        } else {
            // Tie...
            return 0;
        }
    }
};

//assumes 4 players
const getEloAvg = (updateStats, stats, p1, p2, field, initFieldName) => {

    const p1StatDoc = updateStats.find(s => s.email === p1.email);
    let p1Stat;
    if (!p1StatDoc) {
        const initStat = stats.find(s => s.data().email === p1.email);
        if (!initStat) {
            p1Stat = {
                [field]: 1500,
                //elo2: 1500,
            };
        } else {
            p1Stat = {
                [field]: initStat.data()[initFieldName] || 1500,
                //elo2: 1500,
            };
        }
    } else {
        p1Stat = {
            [field]: p1StatDoc[field],
            //elo2: p1StatDoc.data().elo2,
        };
    }

    const p2StatDoc = updateStats.find(s => s.email === p2.email);
    let p2Stat;
    if (!p2StatDoc) {
        const initStat = stats.find(s => s.data().email === p1.email);
        if (!initStat) {
            p2Stat = {
                [field]: 1500
                //elo2: 1500,
            };
        } else {
            p2Stat = {
                [field]: initStat.data()[initFieldName] || 1500,
                //elo2: 1500,
            };
        }
    } else {
        p2Stat = {
            [field]: p2StatDoc[field],
            //elo2: p2StatDoc.data().elo2,
        };
    }
    return {
        [field]: (p1Stat[field] + p2Stat[field]) / 2,
        //elo2: (p1Stat.elo2 + p2Stat.elo2) / 2,
    };
};

function sendSMS() {
    const postData = {
        details: {
            name: "",
            from_name: "ATPenn",
            sms_sending_profile_id: 0,
            content: "אריאל בודק",
        },
        scheduling: {
            "send_now": true,
        },
        // mobiles: numbers.map((n) => ({
        //     phone_number: n,
        // })),
        mobiles: [{ phone_number: "0542277167" }]
    };

    const headers = {
        "Authorization": "",
    };

    return axios.post("https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage", postData, {
        headers,
    }).then((response) => {
        return {
            data: response.data,
            status: response.status,
        };
    });
}

function initBetsStats() {
    db.collection("users-info").get().then(users => {
        const statUpdates = [];

        users.docs.forEach(oneUser => {
            statUpdates.push({
                total: 200,
                wins: 0,
                loses: 0,
                ref: db.collection("bets-stats").doc(oneUser.data().email)
            })
        })


        const batch = db.batch();
        statUpdates.forEach(({ ref, ...update }) => {
            batch.create(ref, update);
        });
        batch.commit();
    })
}

function sendNotification() {
    let docRef = db.collection("notifications").doc();
    docRef.set({
        title: "שים לב שחקן יקר!",
//         body: `טרם שילמת את דמי ההרשמה לקבוצת ATPenn.
// אנא העבר את דמי ההרשמה בלינק הבא:`,
        body: "test youhoo",
        link: "/#4",
        createdAt: FieldValue.serverTimestamp(),
        to: ["ariel.bentolila@gmail.com"]
    });
}

sendNotification()

//initBetsStats()


function rewardBetTokens() {
    const waitFor = [
        db.collection("bets-stats").get(),
        db.collection("matches-archive")
            .where("date", ">=", "2022-04-11")
            .get()
    ]
    Promise.all(waitFor).then(all => {
        const batch = db.batch();
        const stats = all[0].docs;
        all[1].docs.forEach(match => {
            const dataAfter = match.data();

            if (dataAfter.Player2 && dataAfter.Player4) {
                // not singles
                const rewarded = [];
                for (let i = 1; i <= 4; i++) {
                    if (dataAfter["Player" + i]) {
                        const playerEmail = dataAfter["Player" + i].email;
                        rewarded.push(playerEmail);
                    }
                }

                const actRewarded = [];
                rewarded.forEach(email => {
                    const player = stats.find(s => s.ref.id === email)

                    if (player.data().total < 200) {
                        actRewarded.push(player.ref.id);
                        batch.update(player.ref, {
                            total: FieldValue.increment(50),
                        });
                        console.log(player.ref.id, 50)
                    }
                });

                console.log("Reward players with tokens", "list", actRewarded, "amount", 50);
                //return batch.commit();
            }

        })
        return batch.commit();
    });
}

//rewardBetTokens()



function getMatchData(id) {
    db.collection("matches").doc(id).get().then(doc => {
        if (doc.exists) {
            console.log(JSON.stringify(doc.data()))
        }
    })
}
//getMatchData("IGhy1gZvTKK00dZrZbNH")


function rank(year, players) {
    let matchRef = db.collection("matches-archive");
    if (year) {
        matchRef = matchRef.where("date", ">=", year)
    }
    matchRef = matchRef.orderBy("date", "asc")

    const waitFor = [
        matchRef.get(),
        //        db.collection("stats").get()
        db.collection("users-info").get(),
    ];


    Promise.all(waitFor).then(all => {
        const matches = all[0].docs.filter(doc => {
            return (doc.data().matchCancelled == undefined || doc.data().matchCancelled == false) &&
                doc.data().Player2 != undefined && (!year || doc.data().date.startsWith(year))
        });

        //let curStats = all[0].docs;


        const users = all[1].docs;

        const statUpdates = users.map(u => ({
            email: u.ref.id,
            rank: 1500,
            lastGame: '2021-08-01',
        }));
        let lastDate = "";
        let datePlayers = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i].data()
            if (!match.sets) {
                continue;
            }

            if (match.date !== lastDate) {
                lastDate = match.date;

                // reduce rank of all who did not play
                statUpdates.filter(s1 => !datePlayers.find(s2 => s1.email === s2)).forEach(su => {
                    su.rank -= 1;
                })


                datePlayers = [];
            }

            const winner = calcWinner(match.sets, match.pairQuit, match.matchCancelled)
            if (winner === -1) {
                // cancelled
                continue;
            }

            for (let i = 1; i <= 4; i++) {
                const email = match["Player" + i].email;
                datePlayers.push(email);

                const isPair1 = i < 3;

                let update = statUpdates.find(s => s.email === email);


                // win / lose
                if (winner === 1 && isPair1 || winner === 2 && !isPair1) {
                    update.rank += 20;
                } else if (winner !== 2) { //not a tie
                    update.rank -= 20;
                }
                // participation
                update.rank += 3;

                // all others not participating

                update.lastGame = match.data;

            }

        }

        const workbook = new Excel.Workbook();
        const fileName = "/Users/i022021/dev/tennis/ATPenn/my-app/rank.xlsx"
        workbook.xlsx.readFile(fileName).then(
            (xl) => {
                const sheet = xl.worksheets[0];
                const rows = sheet.getRows(1, 1000)


                statUpdates.forEach((update, i) => {
                    const user = users.find(u => u.ref.id === update.email)

                    // find the row
                    const row = rows.find(r => r.getCell(1).value === user.data().displayName)
                    if (row) {
                        if (row.getCell(1).value == null) {
                            row.getCell(1).value = user.data().displayName;
                        } else if (row.getCell(1).value !== user.data().displayName) {
                            debugger;
                        }
                        row.getCell(4).value = update.rank;

                        row.commit();
                    }
                    //console.log(user.data().displayName, update.rank);

                });
                xl.xlsx.writeFile(fileName).then(
                    () => console.log("saved"),
                    (err) => console.log(err)
                );
            },
            (reason) => {
                console.log(reason)
            })
    });
}

// rank();