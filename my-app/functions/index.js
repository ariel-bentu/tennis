const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseAuthVariableOverride: {
        token: { email: "noam.pinch@gmail.com" },
    },
});

const db = admin.firestore();

const getDeletedMsg = (name, day, date, location, court) => {
    return `${name},
הוסרת ממשחק הטניס ביום ${day} ה-${date} ב${location} במגרש ${court}.
לצפיה בשאר המשחקים שלך כנס לאפליקציה.
https://atpenn-fe837.web.app
טניס טוב!`;
};

const getUpdatedMsg = (name, day, date, location, court, p1, p2, p3, p4) => {
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
        team += `${p1.displayName}`;
        team += `ו${p2.displayName} `;
        team += "vs ";
        team += `${p3.displayName} `;
        team += `ו${p4.displayName}`;
    }

    return `${name},
שובצת, או משחקך עודכן.
ביום ${day} ה-${date} ב${location} במגרש ${court}.
${team}

לצפיה במשחקים שלך כנס לאפליקציה.
https://atpenn-fe837.web.app
טניס טוב!`;
};

const sendSMS = (msg, numbers) => {
    // functions.logger.info("SendSMS:", { msg, numbers });

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


exports.matchUpdated = functions.region("europe-west1").firestore
    .document("matches/{matchID}")
    .onWrite((change, context) => {
        const addedOrChanged = {};
        const deleted = {};

        // check if Match is not in the past
        // if (true || change.before.data().date) {
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
        // }

        // read users phones:
        return db.collection("users").get().then(
            (u) => {
                const users = u.docs.map((oneUser) => ({
                    email: oneUser.data().email,
                    phone: oneUser.data().phone,
                    displayName: oneUser.data().displayName,
                }));
                // functions.logger.info("Users", users);

                const sendSMSArray = [];

                for (const [player] of Object.entries(addedOrChanged)) {
                    // functions.logger.info("addedOrChanged");
                    const dataAfter = change.after.data();

                    const user = users.find((u) => u.email === player);
                    // functions.logger.info("addedOrChanged2", dataAfter,
                    //     player, user);
                    if (user && user.phone != "") {
                        const ret = sendSMS(
                            getUpdatedMsg(user.displayName, dataAfter.Day,
                                dataAfter.date, dataAfter.Location,
                                dataAfter.Court,
                                dataAfter.Player1, dataAfter.Player2,
                                dataAfter.Player3, dataAfter.Player3),
                            [user.phone]);
                        sendSMSArray.push(ret);
                    } else {
                        // functions.logger.info(player + " not found");
                    }
                }

                for (const [player] of Object.entries(deleted)) {
                    const dataBefore = change.before.data();
                    const user = users.find((u) => u.email === player);
                    if (user && user.phone != "") {
                        const ret = sendSMS(
                            getDeletedMsg(user.displayName, dataBefore.Day,
                                dataBefore.date, dataBefore.Location,
                                dataBefore.Court),
                            [user.phone]);
                        sendSMSArray.push(ret);
                    }
                }

                return Promise.all(sendSMSArray);
            },
            (err) => functions.logger.error("Users read error:", err));
    });
