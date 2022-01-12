const functions = require("firebase-functions");
const {
    FieldPath,
    FieldValue,
} = require("@google-cloud/firestore");

const admin = require("firebase-admin");
const axios = require("axios");
const dayjs = require("dayjs");
const elo = require("elo-rating");
const apn = require("apn");
const fs = require("fs");
const archiver = require("archiver");


const BILLING_COLLECTION = "billing";
const MATCHES_ARCHIVE_COLLECTION = "matches-archive";
const MATCHES_COLLECTION = "matches";
const USERS_INFO_COLLECTION = "users-info";
const ADMINS_COLLECTION = "admins";
const NOTIFICATIONS_COLLECTION = "notifications";
const BETS_COLLECTION = "bets";

const express = require("express");
const app = express();

app.use(express.json());

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseAuthVariableOverride: {
        token: {
            email: functions.config().admin.email,
        },
    },
    storageBucket: "atpenn-fe837.appspot.com",
});

const db = admin.firestore();

app.post("/v2/devices/:deviceToken//web.com.atpenn", (req, res) => {
    const deviceToken = req.params.deviceToken;
    functions.logger.info("POST /v2/devices/deviceToken", deviceToken, JSON.stringify(req.body));
    res.send("Device token post received");
});

app.delete("/v2/devices/:deviceToken//web.com.atpenn", (req, res) => {
    const deviceToken = req.params.deviceToken;

    functions.logger.info("DELETE /v2/devices/deviceToken", deviceToken, JSON.stringify(req.body));
    res.send("Device token delete received");
});

app.post("/:version/log", (req, res) => {
    functions.logger.info("Safari Notification log", req.body.logs);
    res.send("logged");
});

exports.httpApp = functions.region("europe-west1").https.onRequest(app);

const getGameTariff = () => {
    const docRef = db.collection("systemInfo").doc("Billing");
    if (docRef) {
        return docRef.get().then((doc) => {
            return {
                PricePerGame: doc.data().PricePerGame,
                PricePerSinglesGame: doc.data().PricePerSinglesGame,
            };
        });
    }
    throw new Error("Cannot obtain price per game");
};

const normalizeFactor = (f) => f === undefined ? 1 : f;
const round = (f) => Math.floor(f * 10) / 10;


const addOneGameDebt = (db, batch, gameTariff,
    email, matchID, isSingles, date) => {
    const newBillingRecord = db.collection(BILLING_COLLECTION).doc(email).collection("debts").doc();
    batch.set(newBillingRecord, {
        date,
        matchID,
        amount: gameTariff,
        singles: isSingles,
    });
};

const MonthMap = {
    Jan: "ינו",
    Feb: "פבר",
    Mar: "מרץ",
    Apr: "אפר",
    May: "מאי",
    Jun: "יוני",
    Jul: "יולי",
    Aug: "אוג",
    Sep: "ספט",
    Oct: "אוק",
    Nov: "נוב",
    Dec: "דצמ",
};

const getNiceDate = (d) => {
    const djs = dayjs(d);
    return MonthMap[djs.format("MMM")] + "-" + djs.format("DD");
};


const getDeletedMsg = (name, day, date, location, hour, court) => {
    return `${name},
הוסרת ממשחק הטניס ביום ${day}, ${getNiceDate(date)} ב- ${hour} ב${location} במגרש ${court}.
לצפיה בשאר המשחקים שלך כנס לאפליקציה.
https://tennis.atpenn.com
טניס טוב!`;
};

const inThePast = (d, afterBy) => dayjs().subtract(afterBy === undefined ? 1 : afterBy, "day").isAfter(dayjs(d));

const getUpdatedMsg = (name, day, date, location, hour, court, p1, p2, p3, p4, autoMatch) => {
    const missing = !p1 || !p2 || !p3 || !p4;

    let team = "";
    if (missing) {
        team += "שחקנים: \n";
        if (p1) {
            team += `${p1.displayName}\n`;
        }
        if (p2) {
            team += `${p2.displayName}\n`;
        }
        if (p3) {
            team += `${p3.displayName}\n`;
        }
        if (p4) {
            team += `${p4.displayName}\n`;
        }
        team += "עדיין חסר/ים!";
    } else {
        team += `${p1.displayName} `;
        team += `ו${p2.displayName} `;
        team += "vs ";
        team += `${p3.displayName} `;
        team += `ו${p4.displayName}`;
    }

    return `${name},
שובצת, או משחקך עודכן.
ביום ${day}, ${getNiceDate(date)} ב- ${hour} ב${location} במגרש ${court}.
${team}

${autoMatch ? "השיבוץ עדיין אינו סופי" : ""}
לצפיה במשחקים שלך כנס לאפליקציה.
https://tennis.atpenn.com
טניס טוב!`;
};

const sendNotification = (title, body, devices, link) => {
    const postData = {
        "notification": {
            "title": title,
            "body": body,
            "click_action": link,
            "icon": "https://tennis.atpenn.com/favicon.ico",
        },
        "webpush": link ? {
            "fcm_options": {
                "link": "https://tennis.atpenn.com/" + link,
            },
        } : undefined,
    };

    const headers = {
        "Authorization": functions.config().notification.serverkey,
        "Content-Type": "application/json",
    };
    const waitFor = [];
    devices.forEach(device => {
        postData.to = device;
        waitFor.push(
            axios.post("https://fcm.googleapis.com/fcm/send ", postData, {
                headers,
            }),
        );
    });
    return Promise.all(waitFor);
};

const sendSafaryNotification = (title, body, deviceTokens, link) => {
    const p12 = fs.readFileSync("cert_with_pk.p12");
    if (!p12 || !p12.length || p12.length === 0) {
        functions.logger.info("Safari Notification", deviceTokens, "failed loading cert");
    } else {
        functions.logger.info("Safari Notification", deviceTokens);
    }
    const options = {
        pfx: p12,
        passphrase: functions.config().notification.passphrase,
        production: true,
    };

    const apnProvider = new apn.Provider(options);

    const note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.alert = {
        title,
        body,
    };
    note.topic = "web.com.atpenn";
    note.urlArgs = [link];

    const waitFor = [];
    deviceTokens.forEach(deviceToken => {
        waitFor.push(
            apnProvider.send(note, deviceToken),
        );
    });
    return Promise.all(waitFor).then(() => apnProvider.shutdown());
};

const sendSMS = (msg, numbers) => {
    const postData = {
        details: {
            name: "",
            from_name: "ATPenn",
            sms_sending_profile_id: 0,
            content: msg,
        },
        scheduling: {
            "send_now": true,
        },
        mobiles: numbers.map((n) => ({
            phone_number: n,
        })),
    };

    const headers = {
        "Authorization": functions.config().sms.apikey,
    };

    return axios.post("https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage", postData, {
        headers,
    }).then((response) => {
        return {
            data: response.data,
            status: response.status,
        };
    });
};

const isAdmin = (context, isFin) => {
    return new Promise((resolve, reject) => {
        if (!context.auth) {
            reject(new Error("NotAuthenticated"));
            return;
        }


        db.collection(ADMINS_COLLECTION).doc(context.auth.token.email).get().then(doc => {
            if (doc.exists && (isFin ? doc.data().finance === true : doc.data().admin === true)) {
                resolve();
            } else {
                reject(new Error("NotAnAdmin"));
            }
        });
    });
};

const isMatchEventsOn = () => {
    return db.collection("systemInfo").doc("Events").get().then(doc => {
        if (doc.data().matchEvents === true) {
            return true;
        } else {
            return false;
        }
    });
};

exports.updateNotification = functions.region("europe-west1").https.onCall((data, context) => {
    const pushNotification = data.pushNotification;
    const notificationToken = data.notificationToken;
    return db.collection(USERS_INFO_COLLECTION).doc(context.auth.token.email).get().then(doc => {
        if (doc.exists) {
            const update = {};
            if (pushNotification !== undefined) {
                update.pushNotification = pushNotification;
            }

            if (notificationToken != undefined) {
                if (doc.data().notificationTokens === undefined || !doc.data().notificationTokens.find(nt => nt.token === notificationToken.token)) {
                    update.notificationTokens = FieldValue.arrayUnion(notificationToken);
                }
            }

            return doc.ref.update(update);
        }
    });
});

exports.placeBet = functions.region("europe-west1").https.onCall((data, context) => {
    const matchID = data.matchID;
    const winner = data.winner;
    const amount = data.amount;
    return db.collection(USERS_INFO_COLLECTION).doc(context.auth.token.email).get().then(userInfo => {
        if (userInfo.exists && userInfo.data().inactive !== true) {
            return db.collection(BETS_COLLECTION)
                .where("matchID", "==", matchID)
                .where("email", "==", context.auth.token.email).get().then(bet => {
                    if (bet.docs.length == 0) {
                        if (amount > 0) {
                            const docRef = db.collection(BETS_COLLECTION).doc();
                            return docRef.set({
                                email: context.auth.token.email,
                                matchID,
                                amount,
                                winner,
                                displayName: userInfo.data().displayName,
                            });
                        }
                    } else {
                        if (amount > 0) {
                            // Update the bet
                            return bet.docs[0].ref.update({
                                amount,
                                winner,
                            });
                        } else {
                            // Delete the bet
                            return bet.docs[0].ref.delete();
                        }
                    }
                });
        }
        throw new functions.https.HttpsError("permission-denied", "UserNotFound ", "User does not exist or locked");
    });
});


exports.updateMatchResults = functions.region("europe-west1").https.onCall((data, context) => {
    const matchCancelled = data.matchCancelled;
    const isInArchive = data.isInArchive;
    const sets = data.sets;
    const matchID = data.matchID;
    const paymentFactor = data.paymentFactor;
    const collectionName = isInArchive ? MATCHES_ARCHIVE_COLLECTION : MATCHES_COLLECTION;

    const docsArray = [
        db.collection(collectionName).doc(matchID).get(),
        db.collection(USERS_INFO_COLLECTION).doc(context.auth.token.email).get(),
        db.collection(ADMINS_COLLECTION).doc(context.auth.token.email).get(),
    ];

    return Promise.all(docsArray).then(all => {
        const matchDoc = all[0];
        const userInfoDoc = all[1];
        const userAdminDoc = all[2];

        if (!matchDoc.exists) {
            throw new Error("Match not found");
        }

        if (!userInfoDoc.exists || !(userInfoDoc.data().inactive === false)) {
            throw new Error("Inactive or unknown user");
        }
        let userIsPlayer = false;
        for (let i = 1; i <= 4; i++) {
            if (matchDoc.data()["Player" + i] && matchDoc.data()["Player" + i].email === context.auth.token.email) {
                userIsPlayer = true;
                break;
            }
        }
        const priorSetResultsOrCancelled = matchDoc.data().sets && matchDoc.data().sets.length > 0 || matchDoc.data().matchCancelled === true;
        const isAdmin = userAdminDoc.exists && userAdminDoc.data().admin === true;

        if (paymentFactor >= 0 && paymentFactor !== matchDoc.data().paymentFactor && !isAdmin) {
            throw new Error("Not Authorized to modify Payment Factor");
        }

        if (priorSetResultsOrCancelled && !isAdmin) {
            throw new Error("Only administrators are authorized to modify match results");
        }

        if (!userIsPlayer && !isAdmin) {
            throw new Error("Only match players and administrators may add match results");
        }
        const update = {};
        if (matchCancelled) {
            update.matchCancelled = true;
            update.sets = [];
        } else {
            update.matchCancelled = false;
            update.sets = sets;
        }

        if (paymentFactor >= 0 && paymentFactor !== matchDoc.data().paymentFactor) {
            update.paymentFactor = paymentFactor;
        }

        return matchDoc.ref.update(update);
    });
});

exports.registerUser = functions.region("europe-west1").https.onCall((data, context) => {
    functions.logger.info("register user", data);
    // context.auth.token.email
    let phone = data.phone;
    if (phone && phone.startsWith("0")) {
        phone = "+972" + phone.substr(1);
    }

    return admin.auth()
        .createUser({
            uid: data.email,
            email: data.email,
            emailVerified: false,
            phoneNumber: phone,
            password: data.password || data.phone,
            displayName: data.displayName,
            disabled: false,
        })
        .then(
            () => {
                return db.collection("users").doc(data.email).set({
                    email: data.email,
                    phone: data.phone,
                    displayName: data.displayName,
                }).then(() => {
                    const msg = `מנהל מערכת טניס יקר.
הרגע נרשם למערכת שחקן חדש.
שמו: ${data.displayName}.
מספר הטלפון: ${data.phone}
יש לאשר אותו לפני שיוכל להשתתף.
בברכה,
מערכת הטניס הממוחשבת!`;
                    return sendSMS(msg, [functions.config().admin.phone]);
                });
            },
            (err) => {
                throw new functions.https.HttpsError("failed-precondition", err.message, err.details);
            });
});

const isMovedToArchive = (change, matchID) => {
    return new Promise((resolve, reject) => {
        if (change.after.exist) {
            resolve(false);
            return;
        }

        // check if the deleted record is now in archive
        db.collection(MATCHES_ARCHIVE_COLLECTION).doc(matchID).get().then(value => {
            if (value.exists) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(err => reject(err));
    });
};

exports.isAdmin = functions.region("europe-west1").https.onCall((data, context) => {
    return isAdmin(context, false).catch(err => {
        throw new functions.https.HttpsError("permission-denied", "AdminRequired", err.message);
    });
});

exports.smsBalance = functions.region("europe-west1").https.onCall((data, context) => {
    return isAdmin(context, false).then(() => {
        const headers = {
            "Authorization": functions.config().sms.apikey,
        };

        return axios.get("https://webapi.mymarketing.co.il/api/account/balance", {
            headers,
        }).then((response) => {
            return {
                data: response.data,
                status: response.status,
            };
        });
    });
});


exports.sendMessage = functions.region("europe-west1").https.onCall((data, context) => {
    return isAdmin(context, false).then(() => {
        const msg = data.msg;
        const numbers = data.numbers;
        return sendSMS(msg, numbers);
    });
});

exports.openWeekNew = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("00 10 * * 6")
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        const batch = db.batch();

        const waitFor = [
            db.collection("registrations").get(),
            db.collection("replacement-requests").get(),
        ];

        return Promise.all(waitFor).then(all => {
            // Move to archive
            all[0].docs.forEach((reg) => {
                const docRef = db.collection("registrations-archive").doc(reg.ref.id);
                batch.set(docRef, reg.data());
                batch.delete(reg.ref);
            });

            all[1].docs.forEach((repReq) => {
                // todo - handle games that did not yet happen??
                const docRef = db.collection("replacement-requests-archive").doc(repReq.ref.id);
                batch.set(docRef, repReq.data());
                batch.delete(repReq.ref);
            });

            return batch.commit().then(() => {
                return Promise.all([
                    db.collection("users").get(),
                    db.collection(USERS_INFO_COLLECTION).get(),
                ]).then(all => {
                    const phones = [];
                    all[0].docs.forEach(user => {
                        const userInfo = all[1].docs.find(d => d.ref.id === user.ref.id);
                        if (userInfo && !userInfo.data().inactive && user.data().phone && user.data().phone.length > 0) {
                            // Send SMS to active users only
                            phones.push(user.data().phone);
                        }
                    });

                    // functions.logger.info("Send sms to: ", phones);
                    // Send SMS
                    return sendSMS(`שיבוצי טניס נפתחו להשבוע:

https://tennis.atpenn.com
טניס טוב!`, phones);
                });
            });
        });
    });

const isMatchModified = (change) => {
    if (!change.before.exists || !change.after.exists) {
        return true;
    }

    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    let modified = false;
    for (let i = 1; i <= 4; i++) {
        if (dataBefore["Player" + i] === undefined && dataAfter["Player" + i] === undefined) {
            continue;
        }

        modified = modified ||
            (dataBefore["Player" + i] === undefined && dataAfter["Player" + i] !== undefined) ||
            (dataBefore["Player" + i] !== undefined && dataAfter["Player" + i] === undefined) ||
            dataBefore["Player" + i].email !== dataAfter["Player" + i].email;
    }

    modified = modified || dataBefore.date !== dataAfter.date;
    modified = modified || dataBefore.Day !== dataAfter.Day;
    modified = modified || dataBefore.Court !== dataAfter.Court;
    modified = modified || dataBefore.Hour !== dataAfter.Hour;
    modified = modified || dataBefore.Location !== dataAfter.Location;

    return modified;
};

const toNum = (v) => parseInt(v);

const handleMatchResultsChange = (change) => {
    return new Promise((resolve, reject) => {
        // Only handle change
        if (!change.before.exists || !change.after.exists) {
            resolve(false);
            return;
        }

        const dataBefore = change.before.data();
        const dataAfter = change.after.data();

        if (dataAfter.matchCancelled && dataAfter.Player2 === undefined) {
            // cancelled or singles
            resolve(true); // results exists (cancelled) - archive it
            return;
        }
        if (dataAfter.sets == undefined) {
            // No sets data (assume they are not deleted - when deleted, it will be empty array)
            resolve(false);
            return;
        }

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

        const updates = [];

        /*
        {
            sets: [
                { pair1: 1, pair2: 6 },
                { pair1: 1, pair2: 6 },
                { pair1: 1, pair2: 6 },
                { pair1: 1, pair2: 6 },
                { pair1: 1, pair2: 6 }
            ]
        }
        */

        const batch = db.batch();

        let winner = 0;
        if (dataBefore.sets !== undefined) {
            // Sets existed before - find changes, calculate and update players stats
            const winnerBefore = calcWinner(dataBefore.sets);
            const winnerAfter = calcWinner(dataAfter.sets);
            if (winnerBefore === winnerAfter) {
                // No update is needed
                resolve();
                return;
            }
            winner = winnerAfter;

            // Pair1
            //   winBefore  | winAfter
            // ------------------------------
            //      0       |    1          | wins:1, loses:0, tie:-1,
            //      0       |    2          | wins:0, loses:1, tie:-1,
            //      1       |    0          | wins:-1, loses:0, tie:1,
            //      1       |    2          | wins:-1, loses:1, tie:0,
            //      2       |    0          | wins:0, loses:-1, tie:1,
            //      2       |    1          | wins:1, loses:-1, tie:0,

            let tieVal = 0;
            let winVal = 0;
            let loseVal = 0;
            if (winnerBefore == 0) {
                tieVal = -1; // subtract a tie to all players
            } else if (winnerAfter == 0) {
                tieVal = 1;
            }

            if (winnerAfter === 1) {
                winVal = 1;
            } else if (winnerBefore == 1) {
                winVal = -1;
            }

            if (winnerAfter == 2) {
                loseVal = 1;
            } else if (winnerBefore == 2) {
                loseVal = -1;
            }


            if (dataAfter.Player1) {
                updates.push({
                    _pair: 1,
                    email: dataAfter.Player1.email,
                    win: winVal,
                    lose: loseVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player2) {
                updates.push({
                    _pair: 1,
                    email: dataAfter.Player2.email,
                    win: winVal,
                    lose: loseVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player3) {
                updates.push({
                    _pair: 2,
                    email: dataAfter.Player3.email,
                    win: loseVal,
                    lose: winVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player4) {
                updates.push({
                    _pair: 2,
                    email: dataAfter.Player4.email,
                    win: loseVal,
                    lose: winVal,
                    tie: tieVal,
                });
            }
        } else {
            // Sets now added - calculate and save players stats
            winner = calcWinner(dataAfter.sets);
            if (dataAfter.Player1) {
                updates.push({
                    _pair: 1,
                    email: dataAfter.Player1.email,
                    win: winner === 1 ? 1 : 0,
                    lose: winner === 2 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player2) {
                updates.push({
                    _pair: 1,
                    email: dataAfter.Player2.email,
                    win: winner === 1 ? 1 : 0,
                    lose: winner === 2 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player3) {
                updates.push({
                    _pair: 2,
                    email: dataAfter.Player3.email,
                    win: winner === 2 ? 1 : 0,
                    lose: winner === 1 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player4) {
                updates.push({
                    _pair: 2,
                    email: dataAfter.Player4.email,
                    win: winner === 2 ? 1 : 0,
                    lose: winner === 1 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }

            // Notify whom ever is interested about the new results:
            if (dataAfter.Player1 && dataAfter.Player3) {
                let pair1 = dataAfter.Player1.displayName;

                if (dataAfter.Player2) {
                    pair1 += " ו" + dataAfter.Player2.displayName;
                }
                let msgBody = pair1 + "\n מול \n";
                let pair2 = dataAfter.Player3.displayName;
                if (dataAfter.Player4) {
                    pair2 += " ו" + dataAfter.Player4.displayName;
                }

                msgBody += pair2;

                if (winner === 0) {
                    msgBody += "\nתיקו!\n";
                } else {
                    msgBody += "\nמנצחים:\n";
                    msgBody += winner === 1 ? pair1 : pair2;
                }

                const notifDoc = db.collection(NOTIFICATIONS_COLLECTION).doc();
                batch.set(notifDoc, {
                    title: "טניס: תוצאות חדשות",
                    body: msgBody,
                    link: "/#2",
                    createdAt: FieldValue.serverTimestamp(),
                    to: ["all"],
                });
            }
        }

        if (updates.length > 0) {
            const statsRef = db.collection("stats");
            statsRef.where(FieldPath.documentId(), "in", updates.map(u => u.email)).get().then(stats => {
                const getEloAvg = (p1, p2) => {
                    if (!p1) {
                        return 0;
                    }
                    const p1StatDoc = stats.docs.find(s => s.ref.id === p1.email);
                    let p1Stat;
                    if (!p1StatDoc) {
                        p1Stat = {
                            elo1: 1500,
                            elo2: 1500,
                        };
                    } else {
                        p1Stat = {
                            elo1: p1StatDoc.data().elo1,
                            elo2: p1StatDoc.data().elo2,
                        };
                    }

                    if (!p2) {
                        return p1Stat;
                    }
                    const p2StatDoc = stats.docs.find(s => s.ref.id === p2.email);
                    let p2Stat;
                    if (!p2StatDoc) {
                        p2Stat = {
                            elo1: 1500,
                            elo2: 1500,
                        };
                    } else {
                        p2Stat = {
                            elo1: p2StatDoc.data().elo1,
                            elo2: p2StatDoc.data().elo2,
                        };
                    }
                    return {
                        elo1: (p1Stat.elo1 + p2Stat.elo1) / 2,
                        elo2: (p1Stat.elo2 + p2Stat.elo2) / 2,
                    };
                };

                // Elo Rating
                const pair1EloAvg = getEloAvg(dataAfter.Player1, dataAfter.Player2);
                const pair2EloAvg = getEloAvg(dataAfter.Player3, dataAfter.Player4);

                const newElo1Rating = elo.calculate(pair1EloAvg.elo1, pair2EloAvg.elo1, winner === 1, 32);
                const newElo2Rating = elo.calculate(pair1EloAvg.elo2, pair2EloAvg.elo2, winner === 1, 32);

                const eloDiff1_p1_2 = Math.abs(newElo1Rating.playerRating - pair1EloAvg.elo1);
                const eloDiff1_p3_4 = Math.abs(newElo1Rating.opponentRating - pair2EloAvg.elo1);
                const eloDiff2_p1_2 = Math.abs(newElo2Rating.playerRating - pair1EloAvg.elo2);
                const eloDiff2_p3_4 = Math.abs(newElo2Rating.opponentRating - pair2EloAvg.elo2);


                updates.forEach(update => {
                    const eloDiff1 = update._pair == 1 ? eloDiff1_p1_2 : eloDiff1_p3_4;
                    const eloDiff2 = update._pair == 1 ? eloDiff2_p1_2 : eloDiff2_p3_4;
                    let elo1Update = update.win * eloDiff1;
                    elo1Update += update.lose * (-eloDiff1);

                    let elo2Update = update.win * eloDiff2;
                    elo2Update += update.lose * (-eloDiff2);

                    const statDoc = stats.docs.find(doc => doc.ref.id === update.email);
                    if (!statDoc || !statDoc.exists) {
                        const docRef = db.collection("stats").doc(update.email);
                        batch.set(docRef, {
                            loses2021: 0,
                            ties2021: 0,
                            wins2021: 0,
                            wins: update.win,
                            loses: update.lose,
                            ties: update.tie,
                            elo1: 1500 + elo1Update,
                            elo2: 1500 + elo2Update,
                        });
                    } else {
                        const data = statDoc.data();
                        batch.update(statDoc.ref, {
                            wins2021: data.wins2021 + update.win,
                            loses2021: data.loses2021 + update.lose,
                            ties2021: data.ties2021 + update.tie,

                            wins: data.wins + update.win,
                            loses: data.loses + update.lose,
                            ties: data.ties + update.tie,

                            elo1: data.elo1 === undefined ? 1500 + elo1Update : data.elo1 + elo1Update,
                            elo2: data.elo2 === undefined ? 1500 + elo2Update : data.elo2 + elo2Update,
                        });
                    }
                });
                return batch.commit().then(() => resolve(true));
            }).catch(err => reject(err));
        } else {
            resolve(false);
        }
    });
};

exports.notificationAdded = functions.region("europe-west1").firestore
    .document("notifications/{notifID}")
    .onCreate((snapshot, context) => {
        const usersInfoRef = db.collection(USERS_INFO_COLLECTION);
        // return usersInfoRef.where(FieldPath.documentId(), "in", snapshot.data().to).get().then(users => {
        return usersInfoRef.get().then(usersInfo => {
            const usersRef = db.collection("users");
            return usersRef.get().then(users => {
                const to = snapshot.data().to;
                const webPushDevices = [];
                const safariPushDevices = [];
                const smsNumbers = [];
                to.forEach(sentToUser => {
                    if (sentToUser === "all") {
                        usersInfo.docs.forEach(userInfo => {
                            // let chromeNotifExists = false;
                            if (userInfo && userInfo.data().pushNotification === true) {
                                if (userInfo.data().notificationTokens) {
                                    userInfo.data().notificationTokens.forEach(token => {
                                        if (token.isSafari) {
                                            safariPushDevices.push(token.token);
                                        } else {
                                            // chromeNotifExists = true;
                                            webPushDevices.push(token.token);
                                        }
                                    });
                                }

                                // Send SMS
                                // if (!chromeNotifExists) {
                                const userDoc = users.docs.find(u => u.ref.id === userInfo.ref.id);
                                if (userDoc && userDoc.data().phone && userDoc.data().phone.length > 0) {
                                    smsNumbers.push(userDoc.data().phone);
                                }
                                // }
                            }
                        });
                    } else {
                        const userInfo = usersInfo.docs.find(u => u.ref.id === sentToUser);
                        // let chromeNotifExists = false;
                        if (userInfo && userInfo.data().notificationTokens) {
                            userInfo.data().notificationTokens.forEach(token => {
                                if (token.isSafari) {
                                    safariPushDevices.push(token.token);
                                } else {
                                    // chromeNotifExists = true;
                                    webPushDevices.push(token.token);
                                }
                            });
                        }
                        // Send SMS
                        // if (!chromeNotifExists) {
                        const userDoc = users.docs.find(u => u.ref.id === userInfo.ref.id);
                        if (userDoc && userDoc.data().phone && userDoc.data().phone.length > 0) {
                            smsNumbers.push(userDoc.data().phone);
                        }
                        // }
                    }
                });

                const waitFor = [];
                if (webPushDevices.length > 0) {
                    waitFor.push(sendNotification(snapshot.data().title, snapshot.data().body, webPushDevices, snapshot.data().link));
                }
                if (safariPushDevices.length > 0) {
                    waitFor.push(sendSafaryNotification(snapshot.data().title, snapshot.data().body, safariPushDevices, snapshot.data().link));
                }

                if (smsNumbers.length > 0) {
                    const msg = `${snapshot.data().title}
${snapshot.data().body}
${"https://tennis.atpenn.com" + snapshot.data().link}`;
                    waitFor.push(sendSMS(msg, smsNumbers));
                }
                return Promise.all(waitFor);
            });
        });
    });

exports.matchUpdated = functions.region("europe-west1").firestore
    .document("matches/{matchID}")
    .onWrite((change, context) => {
        const addedOrChanged = {};
        const deleted = {};
        const matchDate = change.before.data() &&
            change.before.data().date ||
            change.after.data() &&
            change.after.data().date;

        return isMatchEventsOn().then(eventsOn => {
            if (!eventsOn) {
                functions.logger.info("matchUpdated: Events are off - skipping event");
                return;
            }


            return isMovedToArchive(change, context.params.matchID).then(movedToArchive => {
                if (!movedToArchive) {
                    const waitFor = [];
                    // Send SMS on match changes
                    if (!inThePast(matchDate) && isMatchModified(change)) {
                        let adminMsg = "מנהל קבוצה יקר,\n";
                        if (change.after.exists) {
                            if (change.before.exists) {
                                adminMsg += "משחק התעדכן:\n";
                                if (change.after.autoMatch) {
                                    if (change.after.replacementFor) {
                                        adminMsg += `עידכון אוטומטי עקב בקשת החלפה של ${change.after.replacementFor.displayName}\n`;
                                    } else {
                                        adminMsg += "עידכון אוטומטי - שחקן נרשם ושובץ למשחק חסר\n";
                                    }
                                }
                            } else {
                                adminMsg += "משחק חדש:\n";
                            }

                            // all players receive a change notification
                            for (let i = 1; i <= 4; i++) {
                                const p = change.after.data()["Player" + i];
                                if (p) {
                                    addedOrChanged[p.email] = 1;
                                }
                            }

                            if (change.before.exists) {
                                // update - need to also notify players
                                // who are removed from the match
                                for (let i = 1; i <= 4; i++) {
                                    const p = change.before.data()["Player" + i];
                                    if (p) {
                                        if (!addedOrChanged[p.email]) {
                                            // this player is no longer part of the match
                                            deleted[p.email] = 1;
                                        }
                                    }
                                }
                            }
                        } else {
                            adminMsg += "משחק בוטל:\n";
                            // delete
                            for (let i = 1; i <= 4; i++) {
                                const p = change.before.data()["Player" + i];
                                if (p) {
                                    deleted[p.email] = 1;
                                }
                            }
                        }

                        // read users phones:
                        waitFor.push(
                            db.collection("users").get().then(
                                (u) => {
                                    // load admins to notify too
                                    return db.collection(ADMINS_COLLECTION).where("notifyChanges", "==", true).get().then((adminsToNotify) => {
                                        const users = u.docs.map((oneUser) => ({
                                            email: oneUser.data().email,
                                            phone: oneUser.data().phone,
                                            displayName: oneUser.data().displayName,
                                        }));
                                        const relevantData = change.after.exists ? change.after.data() : change.before.data();

                                        // functions.logger.info(...)
                                        adminMsg += `ביום ${relevantData.Day}, ${getNiceDate(relevantData.date)} ב- ${relevantData.Hour} ב${relevantData.Location} במגרש ${relevantData.Court}.`;

                                        const sendSMSArray = [];
                                        let adminHeader = false;

                                        for (const [player] of Object.entries(addedOrChanged)) {
                                            const dataAfter = change.after.data();

                                            const user = users.find((u) => u.email === player);

                                            if (user && user.phone != "") {
                                                const ret = sendSMS(
                                                    getUpdatedMsg(user.displayName, dataAfter.Day,
                                                        dataAfter.date, dataAfter.Location, dataAfter.Hour,
                                                        dataAfter.Court,
                                                        dataAfter.Player1, dataAfter.Player2,
                                                        dataAfter.Player3, dataAfter.Player4, dataAfter.autoMatch),
                                                    [user.phone]);
                                                sendSMSArray.push(ret);
                                                if (!adminHeader) {
                                                    adminHeader = true;
                                                    adminMsg += "\nקיבלו הודעת עדכון: ";
                                                }
                                                adminMsg += user.displayName + ", ";
                                            }
                                        }


                                        adminHeader = false;
                                        for (const [player] of Object.entries(deleted)) {
                                            const dataBefore = change.before.data();
                                            const user = users.find((u) => u.email === player);
                                            if (user && user.phone != "") {
                                                const ret = sendSMS(
                                                    getDeletedMsg(user.displayName, dataBefore.Day,
                                                        dataBefore.date, dataBefore.Location, dataBefore.Hour,
                                                        dataBefore.Court),
                                                    [user.phone]);
                                                sendSMSArray.push(ret);

                                                if (!adminHeader) {
                                                    adminHeader = true;
                                                    adminMsg += "\nקיבלו הודעת ביטול: ";
                                                }
                                                adminMsg += user.displayName + ", ";
                                            }
                                        }

                                        adminMsg += "\nלצפיה במשחקים: ";
                                        adminMsg += " https://tennis.atpenn.com/#1";
                                        adminMsg += "\nטניס טוב";

                                        const adminPhones = [];

                                        adminsToNotify.docs.forEach(adminDoc => {
                                            const user = users.find((u) => u.email === adminDoc.ref.id);
                                            if (user && user.phone != "") {
                                                adminPhones.push(user.phone);
                                            }
                                        });

                                        if (adminPhones.length > 0) {
                                            const ret = sendSMS(adminMsg, adminPhones);
                                            sendSMSArray.push(ret);
                                        }

                                        return Promise.all(sendSMSArray);
                                    });
                                },
                                (err) => functions.logger.error("Users read error:", err),
                            ));
                    }


                    // handle match results:
                    waitFor.push(
                        handleMatchResultsChange(change).then((resultsDetected) => {
                            if (resultsDetected) {
                                functions.logger.info("Results detected - move to archive immediately");
                                return archiveMatchesImpl(context.params.matchID);
                            }
                        }),
                    );

                    return Promise.all(waitFor);
                }
            });
        });
    });

exports.matchArchiveUpdated = functions.region("europe-west1").firestore
    .document(MATCHES_ARCHIVE_COLLECTION + "/{matchID}")
    .onWrite((change, context) => {
        return isMatchEventsOn().then(eventsOn => {
            if (!eventsOn) {
                functions.logger.info("matchArchiveUpdated: Events are off - skipping event");
                return;
            }
            return handleMatchResultsChange(change).then(() => {
                if (change.after.exists && change.before.exists) {
                    const matchData = change.after.data();
                    const matchDataBefore = change.before.data();
                    if (normalizeFactor(matchData.paymentFactor) !== normalizeFactor(matchDataBefore.paymentFactor)) {
                        return updateGameDebt(context.params.matchID, matchData, matchDataBefore);
                    }
                }
            });
        });
    });

exports.archiveMatches = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("00 21 * * *")
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        return archiveMatchesImpl();
    });

const updateGameDebt = (matchID, matchData, matchDataBefore) => {
    return getGameTariff().then((tariff) => {
        if (matchData.paymentFactor === matchDataBefore.paymentFactor) {
            return;
        }

        const isSingles = !matchData.Player2 && !matchData.Player4;
        let price = isSingles ? tariff.PricePerSinglesGame : tariff.PricePerGame;
        const paymentFactor = normalizeFactor(matchData.paymentFactor);
        price = price * paymentFactor;

        return db.runTransaction(transaction => {
            const waitFor = [];
            for (let i = 1; i <= 4; i++) {
                if (matchData["Player" + i]) {
                    const email = matchData["Player" + i].email;

                    // Get current Debt associated with the match
                    const billingDocRef = db.collection(BILLING_COLLECTION).doc(email);
                    waitFor.push(

                        transaction.get(billingDocRef).then(billingDoc => {
                            const debtDocRef = db.collection(BILLING_COLLECTION).doc(email).collection("debts").where(
                                "matchID", "==", matchID);
                            return transaction.get(debtDocRef).then(debtDocs => {
                                let previousCharge = 0;
                                if (debtDocs.docs.length > 0) {
                                    previousCharge += debtDocs.docs[0].data().amount;
                                    transaction.delete(debtDocs.docs[0].ref);
                                }
                                // Add a new record
                                if (price !== 0) {
                                    addOneGameDebt(db, transaction, price, email,
                                        matchID,
                                        isSingles, matchData.date);
                                }

                                // updated balance:
                                let newBalance = billingDoc.data().balance;
                                newBalance = newBalance + previousCharge - price;

                                transaction.update(billingDoc.ref, { balance: round(newBalance) });
                            });
                        }));
                }
            }
            return Promise.all(waitFor);
        });
    });
};

const archiveMatchesImpl = (matchID) => {
    let msg = "Billing: ";

    return getGameTariff().then((tariff) => {
        return db.collection("matches").get().then((allMatches) => {
            const batch = db.batch();
            const debtUpdateMap = {};

            functions.logger.info("archiveMatchesImpl", matchID);
            const matches = matchID ?
                allMatches.docs.filter((m) => m.ref.id === matchID) :
                allMatches.docs.filter((m) => inThePast(m.data().date, 1) || m.data().Day === "שבת" && inThePast(m.data().date, 0));

            msg += "Number of Matches to process: " + matches.length + "\n";
            return db.collection(BILLING_COLLECTION).get().then((billing) => {
                // Add Debt for each player
                matches.forEach((match) => {
                    const matchData = match.data();
                    const isSingles = !matchData.Player2 && !matchData.Player4;
                    let price = isSingles ? tariff.PricePerSinglesGame : tariff.PricePerGame;
                    const paymentFactor = matchData.paymentFactor !== undefined ? matchData.paymentFactor : 1;
                    price = price * paymentFactor;

                    if (price !== 0) {
                        for (let i = 1; i <= 4; i++) {
                            if (matchData["Player" + i]) {
                                const email = matchData["Player" + i].email;

                                addOneGameDebt(db, batch, price, email,
                                    match.ref.id,
                                    isSingles, matchData.date);
                                msg += "- " + email + "\n";

                                if (!debtUpdateMap[email]) {
                                    debtUpdateMap[email] = 0;
                                }
                                debtUpdateMap[email] += price;
                            }
                        }
                    }
                });

                msg += "---\n";

                // Update the balance field
                for (const [email, addToBalance] of Object.entries(debtUpdateMap)) {
                    const billingRecord = billing.docs.find(b => b.ref.id === email);

                    if (billingRecord && billingRecord.data()) {
                        batch.update(billingRecord.ref, {
                            balance: round(billingRecord.data().balance - addToBalance),
                        });
                        msg += email + ": " + (billingRecord.data().balance - addToBalance) + "\n";
                    } else {
                        const newBillingRecord = db.collection(BILLING_COLLECTION).doc(email);
                        batch.set(newBillingRecord, {
                            balance: round(-addToBalance),
                        });
                        msg += email + "(new): " + (-addToBalance) + "\n";
                    }
                }

                // Move to archive
                matches.forEach((match) => {
                    const docRef = db.collection(MATCHES_ARCHIVE_COLLECTION).doc(match.ref.id);
                    const newItem = match.data();
                    batch.set(docRef, newItem);
                    batch.delete(match.ref);
                });


                functions.logger.info("Billing Summary: ", msg);

                return batch.commit();
            });
        });
    });
};

const backupCollections = [
    { name: "matches-archive" },
    { name: "matches" },
    { name: "registrations" },
    { name: "planned-games" },
    { name: "stats" },
    { name: "users" },
    { name: "users-info" },
    {
        name: "billing",
        subCollections: [
            { name: "payments" },
            { name: "debts" },
        ],
    },
];

exports.BackupDB = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("00 01 * * *") // Every dya at 01:00
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        const zipName = "backup|" + dayjs().format("YYYY-MM-DD HH:mm") + ".zip";
        const output = fs.createWriteStream("/tmp/" + zipName);
        const archive = archiver("zip", {
            gzip: true,
            zlib: { level: 9 }, // Sets the compression level.
        });

        archive.on("error", (err) => {
            throw (err);
        });

        // pipe archive data to the output file
        archive.pipe(output);

        const waitFor = [];

        for (let i = 0; i < backupCollections.length; i++) {
            waitFor.push(db.collection(backupCollections[i].name).get().then(async (collData) => {
                const name = backupCollections[i].name + "|" + dayjs().format("YYYY-MM-DD HH:mm") + ".json";
                const fileName = "/tmp/backup|" + name;

                fs.appendFileSync(fileName, "[\n");
                for (let docIndex = 0; docIndex < collData.size; docIndex++) {
                    const doc = collData.docs[docIndex];
                    const backupDoc = doc.data();
                    backupDoc._docID = doc.ref.id;

                    if (backupCollections[i].subCollections) {
                        for (let j = 0; j < backupCollections[i].subCollections.length; j++) {
                            const subColl = backupCollections[i].subCollections[j];
                            const subColDocs = await db.collection(backupCollections[i].name).doc(doc.ref.id).collection(subColl.name).get();
                            backupDoc[subColl.name] = [];
                            subColDocs.forEach(subColDoc => {
                                const backupSubColDoc = subColDoc.data();
                                backupSubColDoc._docID = subColDoc.ref.id;
                                backupDoc[subColl.name].push(backupSubColDoc);
                            });
                        }
                    }

                    fs.appendFileSync(fileName, JSON.stringify(backupDoc, undefined, " "));
                    fs.appendFileSync(fileName, ",\n");
                }
                fs.appendFileSync(fileName, "]");
                console.log("add to archive", name);
                archive.file(fileName, { name });
            }));
        }
        return Promise.all(waitFor).then(() => {
            console.log("finalize archive");
            archive.finalize().then(
                () => admin.storage().bucket().upload("/tmp/" + zipName, {
                    destination: `backups/${zipName}`,
                }),
            );
        });
    });

/**
 * ******  Weather ******
 */

const dateFormat = "YYYY-MM-DD";

const getHourlyPop = (weather, date, hour) => {
    let startHour = 19;
    if (hour && hour.length > 2) {
        startHour = parseInt(hour.substr(0, 2));
    }
    // take max of the 1 hour before and the two hours of game
    const startIndex = weather.hourly.findIndex(h => {
        const d = dayjs.unix(h.dt);
        return (d.format(dateFormat + " HH") === date + " " + startHour);
    });

    if (startIndex >= 0) {
        let pop = weather.hourly[startIndex].pop;
        let temp = weather.hourly[startIndex].temp;
        if (weather.hourly.length > startIndex + 1) {
            pop = Math.max(pop, weather.hourly[startIndex + 1].pop);
            temp = weather.hourly[startIndex + 1].temp;
        }
        if (weather.hourly.length > startIndex + 2) {
            pop = Math.max(pop, weather.hourly[startIndex + 2].pop);
        }

        return { temp, pop };
    }
    return undefined;
};

exports.getWeather = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("30 * * * *")
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        const apikey = functions.config().weather.apikey;
        const url = "https://api.openweathermap.org/data/2.5/onecall?&exclude=current,minutely&units=metric&lang=he&appid=" + apikey + "&";
        const raananaLoc = "lat=32.19&lon=34.84";
        const ramhashLoc = "lat=32.13&lon=34.83";

        const waitFor = [
            db.collection("matches").where("date", ">=", dayjs().format("YYYY-MM-DD")).get(),
            db.collection("planned-games").get(),
            axios.get(url + ramhashLoc),
            axios.get(url + raananaLoc),
        ];

        return Promise.all(waitFor).then(all => {
            const matches = all[0].docs;
            const games = all[1].docs;
            const weatherRamhash = all[2].data;
            const weatherRaanana = all[3].data;

            const batch = db.batch();
            const startDate = dayjs.unix(weatherRamhash.hourly[0].dt);
            for (let i = 0; i < 7; i++) {
                matches.filter(m => m.data().date === startDate.add(i, "day").format(dateFormat)).map(match => {
                    const matchData = match.data();
                    const weather = matchData.Location === "רעננה" ? weatherRaanana : weatherRamhash;
                    const hourlyWeather = getHourlyPop(weather, matchData.date, matchData.Hour);
                    if (hourlyWeather) {
                        if (matchData.pop != hourlyWeather.pop || matchData.temp !== hourlyWeather.temp) {
                            batch.update(match.ref, { pop: hourlyWeather.pop, temp: hourlyWeather.temp, isHourly: true });
                        }
                    } else {
                        const pop = weather.daily[i].pop;
                        const temp = weather.daily[i].temp.eve;
                        if (matchData.pop !== pop || matchData.temp !== temp) {
                            batch.update(match.ref, { pop, temp, isHourly: false });
                        }
                    }
                });
            }


            // On Saturday only:
            let weekDay = dayjs().day() + 1;
            if (weekDay == 7) {
                weekDay = 0;
            }

            games.map(game => {
                const gameData = game.data();
                const offSet = gameData.weekDay - weekDay;
                if (offSet >= 0) {
                    if (offSet < 2) {
                        const hourlyWeather = getHourlyPop(weatherRamhash, dayjs().add(offSet, "day").format(dateFormat), gameData.Hour);
                        if (hourlyWeather && (game.pop !== hourlyWeather.temp || game.pop !== hourlyWeather.temp)) {
                            batch.update(game.ref, { pop: hourlyWeather.pop, temp: hourlyWeather.temp });
                        }
                    } else {
                        // update based on daily weather
                        const pop = weatherRamhash.daily[offSet].pop;
                        const temp = weatherRamhash.daily[offSet].temp.eve;
                        if (game.pop !== pop || game.temp !== temp) {
                            batch.update(game.ref, { pop, temp });
                        }
                    }
                } else {
                    if (game.pop !== -1 || game.temp !== -999) {
                        batch.update(game.ref, { pop: -1, temp: -999 });
                    }
                }
            });

            return batch.commit();
        });
    });


exports.replacementRequest = functions.region("europe-west1").firestore
    .document("replacement-requests/{reqId}")
    .onCreate((snapshot, context) => {
        const matchID = snapshot.data().matchID;
        const email = snapshot.data().email;

        // Get the match
        return db.collection("matches").doc(matchID).get().then(matchDoc => {
            if (!matchDoc.exists) {
                return;
            }

            // Find which Player index requested the change
            let requesterIndex = -1;
            for (let i = 1; i <= 4; i++) {
                if (matchDoc.data()["Player" + i] && matchDoc.data()["Player" + i].email === email) {
                    // register user is playing in this match
                    requesterIndex = i;
                    break;
                }
            }

            if (requesterIndex === -1) {
                // not found in this match
                return;
            }

            const waitFor = [
                db.collection("registrations").get(),
                db.collection("planned-games").get(),
                // get all matches on the same date
                db.collection("matches").where("date", "==", matchDoc.data().date).get(),
            ];

            return Promise.all(waitFor).then(all => {
                const doesNotPlay = (email) => {
                    const match = all[2].docs.find(mDoc => {
                        const matchData = mDoc.data();
                        for (let i = 1; i <= 4; i++) {
                            if (matchData["Player" + i] && matchData["Player" + i].email === email) {
                                // user is playing in this match
                                return true;
                            }
                        }
                        return false;
                    });

                    // only those who are not in any match
                    return match === undefined;
                };


                // find out if there is a registered person not playing
                let registeredUsers = all[0].docs.filter(ru => ru.data().GameID === matchDoc.data().GameID);
                registeredUsers = registeredUsers.filter(ru => doesNotPlay(ru.data().email));

                if (registeredUsers.length > 0) {
                    //   if yes - replace and notification will occur on a different function

                    // found registered users to replace
                    // Look for the one who registered first
                    let firstRegistered = registeredUsers[0];
                    for (let i = 1; i < registeredUsers.length; i++) {
                        if (registeredUsers[i].date < firstRegistered.date) {
                            firstRegistered = registeredUsers[i];
                        }
                    }

                    // fetch the displayName of the replacer
                    return db.collection("users").doc(firstRegistered.data().email).get().then(userDoc => {
                        const batch = db.batch();
                        const updatedData = {
                            ["Player" + requesterIndex]: {
                                email: firstRegistered.data().email,
                                displayName: userDoc.data().displayName,
                            },
                            autoMatch: true,
                            replacementFor: {
                                email,
                                displayName: matchDoc.data()["Player" + requesterIndex].displayName,
                            },
                        };
                        batch.update(matchDoc.ref, updatedData);

                        batch.update(snapshot.ref, { fulfilled: true });

                        // delete the registration for this user
                        const reg = all[0].docs.find(regDoc => regDoc.data().email === email && regDoc.data().GameID == matchDoc.data().GameID);
                        if (reg) {
                            batch.delete(reg.ref);
                        }
                        return batch.commit();
                    });
                } else {
                    //   if no - notify all users who do not play that day + admin
                    const waitFor2 = [
                        db.collection("users").get(),
                        db.collection("users-info").get(),
                        db.collection("admins").get(),
                    ];

                    // delete the registration for this user
                    const reg = all[0].docs.find(regDoc => regDoc.data().email === email && regDoc.data().GameID == matchDoc.data().GameID);
                    if (reg) {
                        waitFor2.push(reg.ref.delete());
                    }

                    return isMatchEventsOn().then(eventsOn => {
                        if (!eventsOn) {
                            functions.logger.info("matchUpdated: Events are off - skipping event");
                            return;
                        }

                        return Promise.all(waitFor2).then(all2 => {
                            const activeUsers = all2[0].docs.filter(uDoc => {
                                const userInfo = all2[1].docs.find(uiDoc => uiDoc.ref.id === uDoc.ref.id);
                                return userInfo && !userInfo.inactive;
                            });
                            const usersToNotify = activeUsers.filter(uDoc => doesNotPlay(uDoc.data().email));
                            const phonesToNotify = usersToNotify.map(uDoc => uDoc.data().phone);
                            const matchData = matchDoc.data();

                            functions.logger.info("Message to all users who don't play", JSON.stringify(usersToNotify));

                            const waitFor3 = [
                                sendSMS(`החלפה!
                            ${matchData["Player" + requesterIndex].displayName} מחפש מחליף.
                            ביום ${matchData.Day}, ${getNiceDate(matchData.date)} ב- ${matchData.Hour} ב${matchData.Location} במגרש ${matchData.Court}.

                            אם ברצונך להחליף, פשוט כנס לאפליקציה והרשם לאותו יום בלשונית הרישום

                            לצפיה במשחק כנס לאפליקציה.
                            https://tennis.atpenn.com#1
                            טניס טוב!`, phonesToNotify),
                            ];

                            const adminsPhones = all2[2].docs.filter(admin => admin.data().notifyChanges).map(admin => {
                                const adminUser = all2[0].docs.find(uDoc => uDoc.ref.id === admin.ref.id);
                                return adminUser.data().phone;
                            });

                            waitFor3.push(
                                sendSMS(`מנהל יקר - בקשת החלפה!
${matchData["Player" + requesterIndex].displayName} מחפש מחליף.
הודעה נשלחה לכל מי שעדיין לא משחק`, adminsPhones),
                            );

                            return Promise.all(waitFor3);
                        });
                    });
                }
            });
        });
    });

exports.regstrationCreated = functions.region("europe-west1").firestore
    .document("registrations/{regId}")
    .onCreate((snapshot, context) => {
        const gameID = snapshot.data().GameID;
        const email = snapshot.data().email;

        // Get the match
        return db.collection("replacement-requests").get().then(repRequests => {
            for (let i = 0; i < repRequests.docs.length; i++) {
                if (repRequests.docs[i].data().gameID === gameID && !repRequests.docs[i].data().fulfilled) {
                    const requesterEmail = repRequests.docs[i].data().email;

                    // fetch the match
                    return db.collection("matches").doc(repRequests.docs[i].data().matchID).get().then(matchDoc => {
                        // Find which Player index requested the change
                        let requesterIndex = -1;
                        for (let i = 1; i <= 4; i++) {
                            if (matchDoc.data()["Player" + i] && matchDoc.data()["Player" + i].email === requesterEmail) {
                                // register user is playing in this match
                                requesterIndex = i;
                                break;
                            }
                        }

                        if (requesterIndex === -1) {
                            // not found in this match
                            return;
                        }

                        return db.collection("matches").where("date", "==", matchDoc.data().date).get().then(matches => {
                            const doesNotPlay = (email) => {
                                const match = matches.docs.find(mDoc => {
                                    const matchData = mDoc.data();
                                    for (let i = 1; i <= 4; i++) {
                                        if (matchData["Player" + i] && matchData["Player" + i].email === email) {
                                            // user is playing in this match
                                            return true;
                                        }
                                    }
                                    return false;
                                });

                                // only those who are not in any match
                                return match === undefined;
                            };

                            if (doesNotPlay(email)) {
                                // fetch the displayName of the replacer

                                return db.collection("users").doc(email).get().then(userDoc => {
                                    const batch = db.batch();
                                    const updatedData = {
                                        ["Player" + requesterIndex]: {
                                            email: email,
                                            displayName: userDoc.data().displayName,
                                        },
                                        autoMatch: true,
                                        replacementFor: {
                                            email: requesterEmail,
                                            displayName: matchDoc.data()["Player" + requesterIndex].displayName,
                                        },
                                    };
                                    batch.update(matchDoc.ref, updatedData);

                                    batch.update(repRequests.docs[i].ref, { fulfilled: true });
                                    return batch.commit();
                                });
                            }
                        });
                    });
                }
            }
        });
    });

const mapWeekDay2GameID = {
    0: 1, // Sunday
    1: 6, // Monday
    2: 2, // Tuesday
    3: 7, // Wednesday
    4: 3, // Thursday
    5: 4, // Friday
    6: 5, // Saturday
};

exports.NudjeForPartialMatches = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("01 10,14 * * *")
    .timeZone("Asia/Jerusalem")
    .onRun(async (context) => {
        const waitFor = [
            db.collection("registrations").get(),
            db.collection("matches").where("date", "==", dayjs().format(dateFormat)).get(),
            db.collection("replacement-requests").get(),
        ];

        const all = await Promise.all(waitFor);
        const regs = all[0].docs;
        const matches = all[1].docs;
        const repReq = all[2].docs;

        const todaysGameID = mapWeekDay2GameID[dayjs().day()];
        const openReplacements = repReq.filter(r => !r.data().fulfilled && matches.find(m => m.ref.id === r.data().matchID));

        const todaysRegs = regs.filter(r => r.data().GameID === todaysGameID);

        const regsNotPlaying = [];
        todaysRegs.forEach(reg => {
            if (doesNotPlay(matches, reg.data().email)) {
                regsNotPlaying.push(reg);
            }
        });

        // look for uncomplete matches
        const uncompleteMatches = matches.filter(match => {
            const matchData = match.data();
            return (matchData.Player1 && matchData.Player2 && matchData.Player3 && matchData.Player4) ||
                // Singles
                (matchData.Player1 && !matchData.Player2 && matchData.Player3 && !matchData.Player4);
        });

        const waitFor2 = [];
        // Try to auto match
        if (uncompleteMatches.length > 0 && regsNotPlaying.length > 0) {
            const users = await db.collection("users").get();
            const batch = db.batch();
            let playersCount = 0;
            for (let m = uncompleteMatches.length - 1; m >= 0; m--) {
                for (let i = 1; i <= 4; i++) {
                    if (uncompleteMatches[m].data()["Player" + i] === undefined) {
                        if (regsNotPlaying.length > 0) {
                            // Extract displayName for replacement
                            const userDoc = users.docs.find(u => u.ref.id === regsNotPlaying[regsNotPlaying.length - 1].email);
                            if (userDoc) {
                                batch.update(uncompleteMatches[m].ref, {
                                    ["Player" + i]: {
                                        email: regsNotPlaying[regsNotPlaying.length - 1].email,
                                        displayName: userDoc.data().displayName,
                                    },
                                    autoMatch: true,
                                });
                                regsNotPlaying.pop();
                                playersCount++;
                            }
                        }
                    } else {
                        playersCount++;
                    }
                }
                if (playersCount === 4) {
                    uncompleteMatches.pop();
                }
            }
            waitFor2.push(batch.commit());
        }


        if (regsNotPlaying.length % 4 > 1 || openReplacements.length > 0 || uncompleteMatches.length > 0) {
            let missing = 0;
            if (uncompleteMatches.length > 0) {
                missing = uncompleteMatches.length;
            } else {
                missing = 4 - (regsNotPlaying.length % 4);
            }

            const msg = `חסר שחקן.ים להיום!
    חסר עוד ${missing}, מי נרשם?
    https://tennis.atpenn.com#0`;
            let msgAdmin = `מנהל קבוצה יקר - נשלח דירבון לרישום להיום!
    חסר עוד ${missing}.
    `;
            if (uncompleteMatches.length > 0 && regsNotPlaying.length > 0) {
                msgAdmin += `שים לב שיש ${regsNotPlaying.length} שחקנים שנרשמו שטרם שובצו
`;
            }
            const mailsOfRegNoPlaying = regsNotPlaying.map(rnp => rnp.data().email);
            waitFor2.push(notifyThoseWhoAreNotPlaying(matches, mailsOfRegNoPlaying, msg, msgAdmin));
        }
        return await Promise.all(waitFor2);
    });

const doesNotPlay = (matches, email) => {
    const match = matches.find(mDoc => {
        const matchData = mDoc.data();
        for (let i = 1; i <= 4; i++) {
            if (matchData["Player" + i] && matchData["Player" + i].email === email) {
                // user is playing in this match
                return true;
            }
        }
        return false;
    });

    // only those who are not in any match
    return match === undefined;
};


const notifyThoseWhoAreNotPlaying = (matches, excludeMails, msg, adminMsg) => {
    const waitFor = [
        db.collection("users").get(),
        db.collection("users-info").get(),
        db.collection("admins").get(),
        isMatchEventsOn(),
    ];

    return Promise.all(waitFor).then(all => {
        if (!all[3]) {
            // Events are off
            return;
        }
        const users = all[0].docs;
        const usersInfo = all[1].docs;
        const admins = all[2].docs;

        const activeUsers = users.filter(uDoc => {
            const userInfo = usersInfo.find(uiDoc => uiDoc.ref.id === uDoc.ref.id);
            return userInfo && !userInfo.inactive;
        });

        const usersToNotify = activeUsers.filter(uDoc => doesNotPlay(matches, uDoc.data().email));
        const phonesToNotify = usersToNotify
            .filter(uDoc => !excludeMails.includes(uDoc.ref.id))
            .map(uDoc => uDoc.data().phone);

        const adminsPhones = admins.filter(admin => admin.data().notifyChanges).map(admin => {
            const adminUser = users.find(uDoc => uDoc.ref.id === admin.ref.id);
            return adminUser.data().phone;
        });


        const waitForMsgs = [
            sendSMS(msg, phonesToNotify),
            sendSMS(adminMsg, adminsPhones),
        ];

        return Promise.all(waitForMsgs);
    });
};
