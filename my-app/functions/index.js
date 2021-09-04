const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const dayjs = require("dayjs");

const BILLING_COLLECTION = "billing";
const MATCHES_ARCHIVE_COLLECTION = "matches-archive";
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseAuthVariableOverride: {
        token: { email: functions.config().admin.email },
    },
});

const db = admin.firestore();

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

const inThePast = (d, afterBy) => dayjs().subtract(afterBy || 1, "day").isAfter(dayjs(d));

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
        mobiles: numbers.map((n) => ({ phone_number: n })),
    };

    const headers = {
        "Authorization": functions.config().sms.apikey,
    };

    return axios.post("https://webapi.mymarketing.co.il/api/smscampaign/OperationalMessage", postData,
        { headers }).then((response) => {
            return { data: response.data, status: response.status };
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


exports.matchUpdated = functions.region("europe-west1").firestore
    .document("matches/{matchID}")
    .onWrite((change, context) => {
        const addedOrChanged = {};
        const deleted = {};
        const matchDate = change.before.data() &&
            change.before.data().date ||
            change.after.data() &&
            change.after.data().date;

        if (!inThePast(matchDate)) {
            if (change.after.exists) {
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
                // delete
                for (let i = 1; i <= 4; i++) {
                    const p = change.before.data()["Player" + i];
                    if (p) {
                        deleted[p.email] = 1;
                    }
                }
            }


            // read users phones:
            return db.collection("users").get().then(
                (u) => {
                    const users = u.docs.map((oneUser) => ({
                        email: oneUser.data().email,
                        phone: oneUser.data().phone,
                        displayName: oneUser.data().displayName,
                    }));
                    // functions.logger.info(...)

                    const sendSMSArray = [];

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
                        }
                    }

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
                        }
                    }

                    return Promise.all(sendSMSArray);
                },
                (err) => functions.logger.error("Users read error:", err)
            );
        }
    });


exports.archiveMatches = functions.region("europe-west1").pubsub
    // minute (0 - 59) | hour (0 - 23) | day of the month (1 - 31) | month (1 - 12) | day of the week (0 - 6) - Sunday to Saturday
    .schedule("0 18 * * *")
    .timeZone("Asia/Jerusalem")
    .onRun((context) => {
        let msg = "Billing: ";

        return getGameTariff().then((tariff) => {
            return db.collection("matches").get().then((allMatches) => {
                const batch = db.batch();
                const debtUpdateMap = {};

                const matches = allMatches.docs.filter((m) => inThePast(m.data().date), 2);

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
                            batch.update(billingRecord.ref, { balance: billingRecord.data().balance - addToBalance });
                            msg += email + ": " + (billingRecord.data().balance - addToBalance) + "\n";
                        } else {
                            const newBillingRecord = db.collection(BILLING_COLLECTION).doc(email);
                            batch.set(newBillingRecord, { balance: -addToBalance });
                            msg += email + "(new): " + (- addToBalance) + "\n";
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
    });
