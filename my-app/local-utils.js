const axios = require("axios");
const fs = require("fs");
const archiver = require('archiver');
const elo = require("elo-rating");




const dayjs = require('dayjs');

var weekOfYear = require('dayjs/plugin/weekOfYear')
dayjs.extend(weekOfYear)

const db = require('./local-cred').db;

const {
    FieldPath,
    FieldValue,
} = require("@google-cloud/firestore");

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
function RecreateStats(year) {
    const waitFor = []
    //const nextYear = (parseInt(year) + 1) + ""
    waitFor.push(db.collection("stats").get());
    waitFor.push(db.collection("matches-archive")
        .where("date", ">=", year)
        //.where("date", "<", nextYear)
        .orderBy("date", "asc")
        .get());


    Promise.all(waitFor).then(all => {
        const matches = all[1].docs.filter(doc => {
            return (doc.data().matchCancelled == undefined || doc.data().matchCancelled == false) &&
                doc.data().Player2 != undefined && doc.data().date.startsWith(year)
        });
        const curStats = all[0].docs;

        const statUpdates = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i].data()
            if (!match.sets) {
                continue;
            }
            const winner = calcWinner(match.sets)

            const pair1EloAvg = getEloAvg(statUpdates, match.Player1, match.Player2);
            const pair2EloAvg = getEloAvg(statUpdates, match.Player3, match.Player4);

            const newElo1Rating = elo.calculate(pair1EloAvg.elo2021, pair2EloAvg.elo2021, winner === 1, 32);

            const eloDiff1_p1_2 = Math.abs(newElo1Rating.playerRating - pair1EloAvg.elo2021);
            const eloDiff1_p3_4 = Math.abs(newElo1Rating.opponentRating - pair2EloAvg.elo2021);

            const updatePlayer = (p, firstPair) => {
                let updateIndex = statUpdates.findIndex(s => s.email === p.email);
                if (updateIndex < 0) {
                    const curStat = curStats.find(c => c.ref.id === p.email)
                    if (!curStat) {
                        console.log("stop")
                    }
                    statUpdates.push({
                        email: p.email,
                        // wins2021: curStat.data().wins2021,
                        // loses2021: curStat.data().loses2021,
                        // ties2021: curStat.data().ties2021,
                        elo2021: curStat.data().elo2Init,
                    })
                    updateIndex = statUpdates.length - 1;
                }

                const win = (firstPair && winner == 1) || (!firstPair && winner == 2)
                const lose = (firstPair && winner == 2) || (!firstPair && winner == 1)
                const tie = winner == 0

                // statUpdates[updateIndex].wins2021 -= win ? 1 : 0;
                // statUpdates[updateIndex].loses2021 -= lose ? 1 : 0;
                // statUpdates[updateIndex].ties2021 -= tie ? 1 : 0;
                if (win) {
                    statUpdates[updateIndex].elo2021 += (firstPair ? eloDiff1_p1_2 : eloDiff1_p3_4);
                }
                if (lose) {
                    statUpdates[updateIndex].elo2021 -= (firstPair ? eloDiff1_p1_2 : eloDiff1_p3_4);;
                }
            }

            updatePlayer(match.Player1, true);
            updatePlayer(match.Player2, true);
            updatePlayer(match.Player3, false);
            updatePlayer(match.Player4, false);
        }


        const batch = db.batch();
        statUpdates.forEach(update => {
            const statRef = all[0].docs.find(s => s.ref.id === update.email);

            batch.update(statRef.ref, update);
        });
        batch.commit();
        console.log("done", JSON.stringify(statUpdates, undefined, "  "))

    });

}


// Actual work:
//RecreateStats("2021")
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


const calcWinner = (sets) => {
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
const getEloAvg = (stats, p1, p2) => {

    const p1StatDoc = stats.find(s => s.email === p1.email);
    let p1Stat;
    if (!p1StatDoc) {
        p1Stat = {
            elo2021: 1500,
            //elo2: 1500,
        };
    } else {
        p1Stat = {
            elo2021: p1StatDoc.elo2021,
            //elo2: p1StatDoc.data().elo2,
        };
    }

    const p2StatDoc = stats.find(s => s.email === p2.email);
    let p2Stat;
    if (!p2StatDoc) {
        p2Stat = {
            elo2021: 1500,
            //elo2: 1500,
        };
    } else {
        p2Stat = {
            elo2021: p2StatDoc.elo2021,
            //elo2: p2StatDoc.data().elo2,
        };
    }
    return {
        elo2021: (p1Stat.elo2021 + p2Stat.elo2021) / 2,
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
        body: `טרם שילמת את דמי ההרשמה לקבוצת ATPenn.
אנא העבר את דמי ההרשמה בלינק הבא:`,
        link: "/#4",
        createdAt: FieldValue.serverTimestamp(),
        to: ["dmitry@picnmix.ru", "amir.yaniv@one.co.il", "royfried10@gmail.com"]
    });
}

//initBetsStats()