const functions = require("firebase-functions");
const {
    FieldPath,
    v1,
} = require("@google-cloud/firestore");
// Replace BUCKET_NAME
const bucket = "gs://atpenn-backup";

const admin = require("firebase-admin");
const axios = require("axios");
const dayjs = require("dayjs");
const elo = require("elo-rating");
const apn = require("apn");
const fs = require("fs");

const BILLING_COLLECTION = "billing";
const MATCHES_ARCHIVE_COLLECTION = "matches-archive";

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

exports.httpApp = functions.https.onRequest(app);

const getGameTariff = () => {
    const docRef = db.collection("systemInfo").doc("Billing");
    if (docRef) {
        return docRef.get().then((doc) => {
            return doc.data().PricePerGame;
        });
    }
    throw new Error("Cannot obtain price per game");
};

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

const getUpdatedMsg = (name, day, date, location, hour, court, p1, p2, p3, p4) => {
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
                "link": link,
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
            })
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
        pfx: fs.readFileSync("cert_with_pk.p12"),
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
            apnProvider.send(note, deviceToken)
        );
    });
    return Promise.all(waitFor).then(()=>apnProvider.shutdown());
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

const isAdmin = (context) => {
    return new Promise((resolve, reject) => {
        if (!context.auth) {
            reject(new Error("NotAuthenticated"));
            return;
        }


        db.collection("admins").doc(context.auth.token.email).get().then(doc => {
            if (doc.exists) {
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
        db.collection("matches-archive").doc(matchID).get().then(value => {
            if (value.exists) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(err => reject(err));
    });
};

exports.isAdmin = functions.region("europe-west1").https.onCall((data, context) => {
    return isAdmin(context).catch(err => {
        throw new functions.https.HttpsError("permission-denied", "AdminRequired", err.message);
    });
});


exports.openWeek = functions.region("europe-west1").https.onCall((data, context) => {
    const batch = db.batch();

    return isAdmin(context).then(() => {
        return db.collection("registrations").get().then(regs => {
            // Move to archive
            regs.docs.forEach((reg) => {
                const docRef = db.collection("registrations-archive").doc(reg.ref.id);
                batch.set(docRef, reg.data());
                batch.delete(reg.ref);
            });

            return batch.commit().then(() => {
                return Promise.all([
                    db.collection("users").get(),
                    db.collection("users-info").get(),
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
    }).catch(err => {
        throw new functions.https.HttpsError("permission-denied", "AdminRequired", err.message);
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

        if (dataBefore.sets !== undefined) {
            // Sets existed before - find changes, calculate and update players stats
            const winnerBefore = calcWinner(dataBefore.sets);
            const winnerAfter = calcWinner(dataAfter.sets);
            if (winnerBefore === winnerAfter) {
                // No update is needed
                resolve();
                return;
            }

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
                    email: dataAfter.Player1.email,
                    win: winVal,
                    lose: loseVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player2) {
                updates.push({
                    email: dataAfter.Player2.email,
                    win: winVal,
                    lose: loseVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player3) {
                updates.push({
                    email: dataAfter.Player3.email,
                    win: loseVal,
                    lose: winVal,
                    tie: tieVal,
                });
            }
            if (dataAfter.Player4) {
                updates.push({
                    email: dataAfter.Player4.email,
                    win: loseVal,
                    lose: winVal,
                    tie: tieVal,
                });
            }
        } else {
            // Sets now added - calculate and save players stats
            const winner = calcWinner(dataAfter.sets);
            if (dataAfter.Player1) {
                updates.push({
                    email: dataAfter.Player1.email,
                    win: winner === 1 ? 1 : 0,
                    lose: winner === 2 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player2) {
                updates.push({
                    email: dataAfter.Player2.email,
                    win: winner === 1 ? 1 : 0,
                    lose: winner === 2 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player3) {
                updates.push({
                    email: dataAfter.Player3.email,
                    win: winner === 2 ? 1 : 0,
                    lose: winner === 1 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
                });
            }
            if (dataAfter.Player4) {
                updates.push({
                    email: dataAfter.Player4.email,
                    win: winner === 2 ? 1 : 0,
                    lose: winner === 1 ? 1 : 0,
                    tie: winner === 0 ? 1 : 0,
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

                const newElo1Rating = elo.calculate(pair1EloAvg.elo1, pair2EloAvg.elo1, true, 32);
                const newElo2Rating = elo.calculate(pair1EloAvg.elo2, pair2EloAvg.elo2, true, 32);
                const eloDiff1 = Math.abs(newElo1Rating.playerRating - pair1EloAvg.elo1);
                const eloDiff2 = Math.abs(newElo2Rating.playerRating - pair1EloAvg.elo2);


                const batch = db.batch();
                updates.forEach(update => {
                    let elo1Update = update.win * eloDiff1;
                    elo1Update += update.lose * (-eloDiff1);

                    let elo2Update = update.win * eloDiff2;
                    elo2Update += update.lose * (-eloDiff2);


                    const statDoc = stats.docs.find(doc => doc.ref.id === update.email);
                    if (!statDoc || !statDoc.exists) {
                        const docRef = db.collection("stats").doc(update.email);
                        batch.set(docRef, {
                            wins: update.win,
                            loses: update.lose,
                            ties: update.tie,
                            elo1: 1500 + elo1Update,
                            elo2: 1500 + elo2Update,
                        });
                    } else {
                        const data = statDoc.data();
                        batch.update(statDoc.ref, {
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
        const usersInfoRef = db.collection("users-info");
        return usersInfoRef.where(FieldPath.documentId(), "in", snapshot.data().to).get().then(users => {
            const devices = users.docs.filter(u1 => u1.data().notificationToken).map(u2 => u2.data().notificationToken);

            const webPushDevices = devices.filter(d => d !== undefined && d !== "" && !d.startsWith("SAFARI:"));
            const safariPushDevices = devices.filter(d => d !== undefined && d !== "" && d.startsWith("SAFARI:")).map(d2 => d2.substr(7));
            const waitFor = [];
            if (webPushDevices.length > 0) {
                waitFor.push(sendNotification(snapshot.data().title, snapshot.data().body, webPushDevices, snapshot.data().link));
            }
            if (safariPushDevices.length > 0) {
                waitFor.push(sendSafaryNotification(snapshot.data().title, snapshot.data().body, safariPushDevices, snapshot.data().link));
            }
            return Promise.all(waitFor);
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
                                    return db.collection("admins").where("notifyChanges", "==", true).get().then((adminsToNotify) => {
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
                                                        dataAfter.Player3, dataAfter.Player4),
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
                                (err) => functions.logger.error("Users read error:", err)
                            ));
                    }


                    // handle match results:
                    waitFor.push(
                        handleMatchResultsChange(change).then((resultsDetected) => {
                            if (resultsDetected) {
                                functions.logger.info("Results detected - move to archive immediately");
                                return archiveMatchesImpl(context.params.matchID);
                            }
                        })
                    );

                    return Promise.all(waitFor);
                }
            });
        });
    });

exports.matchArchiveUpdated = functions.region("europe-west1").firestore
    .document("matches-archive/{matchID}")
    .onWrite((change, context) => {
        return isMatchEventsOn().then(eventsOn => {
            if (!eventsOn) {
                functions.logger.info("matchArchiveUpdated: Events are off - skipping event");
                return;
            }
            return handleMatchResultsChange(change);
        });
    });

exports.archiveMatches = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("00 21 * * *")
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        return archiveMatchesImpl();
    });

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
                    for (let i = 1; i <= 4; i++) {
                        if (matchData["Player" + i]) {
                            const email = matchData["Player" + i].email;
                            addOneGameDebt(db, batch, tariff, email,
                                match.ref.id,
                                isSingles, matchData.date);
                            msg += "- " + email + "\n";

                            if (!debtUpdateMap[email]) {
                                debtUpdateMap[email] = 0;
                            }
                            debtUpdateMap[email] += tariff;
                        }
                    }
                });

                msg += "---\n";

                // Update the balance field
                for (const [email, addToBalance] of Object.entries(debtUpdateMap)) {
                    const billingRecord = billing.docs.find(b => b.ref.id === email);

                    if (billingRecord && billingRecord.data()) {
                        batch.update(billingRecord.ref, {
                            balance: billingRecord.data().balance - addToBalance,
                        });
                        msg += email + ": " + (billingRecord.data().balance - addToBalance) + "\n";
                    } else {
                        const newBillingRecord = db.collection(BILLING_COLLECTION).doc(email);
                        batch.set(newBillingRecord, {
                            balance: -addToBalance,
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


exports.scheduledFirestoreExport = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("00 23 * * 5") // Every Friday at 23:00
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        const client = new v1.FirestoreAdminClient();
        const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
        const databaseName =
            client.databasePath(projectId, "(default)");

        return client.exportDocuments({
            name: databaseName,
            outputUriPrefix: bucket,
            // Leave collectionIds empty to export all collections
            // or set to a list of collection IDs to export,
            // collectionIds: ['users', 'posts']
            collectionIds: [],
        })
            .then(responses => {
                const response = responses[0];
                functions.logger.info(`Backup Operation Name succeeded: ${response["name"]}`);
            })
            .catch(err => {
                functions.logger.error(err);
                throw new Error("Backup operation failed");
            });
    });