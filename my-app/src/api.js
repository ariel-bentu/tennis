import firebase from 'firebase/app'
import 'firebase/auth';
import 'firebase/messaging';
import 'firebase/firestore';
import 'firebase/functions';



import { config } from './config';
import { calcWinner, cleansePlayer, sortByDays } from './utils';
import dayjs from 'dayjs'

export const Collections = {
    REGISTRATION_COLLECTION: "registrations",
    PLANNED_GAMES_COLLECTION: "planned-games",
    MATCHES_COLLECTION: "matches",
    BILLING_COLLECTION: "billing",
    DEBTS_SUB_COLLECTION: "debts",
    PAYMENTS_SUB_COLLECTION: "payments",
    STATS_COLLECTION: "stats",

    USERS_COLLECTION: "users",
    USERS_INFO_COLLECTION: "users-info",
    SYSTEM_INFO: "systemInfo",
    REGISTRATION_ARCHIVE_COLLECTION: "registrations-archive",
    MATCHES_ARCHIVE_COLLECTION: "matches-archive"
}



const SYSTEM_RECORD_REGISTRATION = "registration"

let app = undefined;

export function initAPI(onPushNotification, onNotificationToken) {
    if (!app) {
        app = firebase.initializeApp({ ...config });

        try {
            if ('safari' in window && 'pushNotification' in window.safari) {
                // requires user gesture...
            } else {
                const messaging = firebase.messaging(app);
                Notification.requestPermission().then(perm => {
                    if (perm === "granted") {
                        console.log("permission granted");
                        messaging.getToken({ vapidKey: 'BFMK8mjTcp6ArpTF4QNhnXwo387CzIADR9WmybUvlf5yXI2NExGdTFsvD4_KHZ-3CWLF4gRq19VQTngTsREWYl8' }).then((currentToken) => {
                            if (currentToken) {
                                // Send the token to your server and update the UI if necessary
                                console.log("Web notification", currentToken);
                                if (onNotificationToken) {
                                    onNotificationToken(currentToken);
                                }
                            } else {
                                // Show permission request UI
                                console.log('No registration token available. Request permission to generate one.');
                                // ...
                            }
                        }).catch((err) => {
                            console.log('An error occurred while retrieving token. ', err);
                            // ...
                        });
                    } else {
                        console.log("Permission denied to notifications");
                    }

                    messaging.onMessage((payload) => {
                        console.log('Message received. ', JSON.stringify(payload));
                        if (onPushNotification) {
                            onPushNotification(payload);
                        }
                    });
                });
            }
        } catch (err) {
            console.log("Cannot initialize messaging", err.message);
        }
    }
}

export const checkSafariRemotePermission = (permissionData) => {
    if (permissionData.permission === 'default') {
        // This is a new web service URL and its validity is unknown.
        window.safari.pushNotification.requestPermission(
            'https://tennis.atpenn.com', // The web service URL.
            'web.com.atpenn',     // The Website Push ID.
            {}, // Data that you choose to send to your server to help you identify the user.
            checkSafariRemotePermission         // The callback function.
        );
    }
    else if (permissionData.permission === 'denied') {
        // The user said no.
    }
    else if (permissionData.permission === 'granted') {
        // The web service URL is a valid push provider, and the user said yes.
        // permissionData.deviceToken is now available to use.
        console.log("Safari push is ready. deviceToken:", permissionData.deviceToken);
        return permissionData.deviceToken;
    }
    return undefined;
};

export async function updateUserNotificationToken(email, newNotificationToken, isSafari) {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.USERS_INFO_COLLECTION).doc(email);

    return docRef.update({
        notificationTokens: firebase.firestore.FieldValue.arrayUnion({
            isSafari,
            token: newNotificationToken,
            ts: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        }),
    });
}

/*
export async function migrateDate() {

    var db = firebase.firestore();
    let batch = db.batch();


    return getCollection("matches-archive").then(ma => getCollection("billing").then(srcData => {
        let waitFor = []
        srcData.forEach((srcItem) => {
            // waitFor.push(
            //     srcItem._ref.collection("payments").get().then(pmts=>{
            //         pmts.forEach(p=>{
            //             let d = dayjs(p.date);
            //             batch.update(p.ref, {date: d.format("YYYY-MM-DD")});
            //         })
            //     })
            // )
            waitFor.push(
                srcItem._ref.collection("debts").get().then(dts => {
                    dts.forEach(p => {
                        //find date:
                        let match = ma.find(m => m._ref.id === p.data().matchID)
                        if (match) {
                            //console.log(match.date)
                            let d = dayjs(match.date);
                            batch.update(p.ref, { date: d.format("YYYY-MM-DD") });
                        }
                    })
                })
            )

        })
        return Promise.all(waitFor).then(() => batch.commit());
    }))
}
*/

export async function getUserInfo(user, pwd) {
    return firebase.auth().signInWithEmailAndPassword(user, pwd)
        .then((userCredential) => {
            // Signed in
            return userCredential.user;
        })
        .catch((error) => {
            throw error.message;
        });
}

export async function changePwd(user, newPwd) {
    return user.updatePassword(newPwd);
}

export async function logout() {
    return firebase.auth().signOut()
}

export async function forgotPwd(email) {
    return firebase.auth().sendPasswordResetEmail(email)
}

export async function getUserObj(user) {
    var db = firebase.firestore();
    if (user && user.email) {
        let docRef = db.collection(Collections.USERS_INFO_COLLECTION).doc(user.email.toLowerCase());
        return docRef.get().then(
            u => {
                let data = u.data();
                if (!data) {
                    throw new Error("חשבונך מחכה לאישור - יש לפנות למנהל המערכת");
                } else if (data.inactive) {
                    throw new Error("חשבונך אינו פעיל - יש לפנות למנהל המערכת");
                }
                return { displayName: data.displayName, email: user.email.toLowerCase(), _user: data };
            },
            (err) => {
                throw new Error("חשבונך אינו פעיל - יש לפנות למנהל המערכת")
            });
    }
    return undefined;
}

// export function temp() {
//     return getCollection(Collections.USERS_COLLECTION).then(srcData => {
//         var db = firebase.firestore();
//         let batch = db.batch();
//         srcData.forEach(({ _ref, ...item }) => {
//             let docRef = db.collection(Collections.USERS_INFO_COLLECTION).doc(_ref.id);

//             batch.set(docRef, {
//                 email: item.email,
//                 displayName: item.displayName,
//                 inactive: false
//             });

//         })
//         batch.commit();
//     })
// }



export async function getPlannedGames(currentUser) {

    var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        db.collection(Collections.PLANNED_GAMES_COLLECTION).get().then(async (planned) => {
            let results = []
            planned.forEach((doc) => {
                if (!doc.data().disabled) {
                    results.push(doc.data());
                }
            });
            results.sort((a, b) => sortByDays(a.Day, b.Day));

            db.collection(Collections.REGISTRATION_COLLECTION).get().then(
                regs => {
                    let regsData = regs.docs.map(doc=>doc.data());
                    
                    regsData.forEach(reg => {
                        let game = results.find(g => g.id === reg.GameID);
                        if (!game)
                            return;
                        let NumOfRegistered = game.NumOfRegistered || 0;
                        if (reg.email === currentUser) {
                            game.Registered = true;
                        } else {
                            NumOfRegistered++;
                        }
                        game.NumOfRegistered = NumOfRegistered;
                    });
                    resolve(results);
                },
                (err) => resolve(results));

        })
    });

}

export async function thisSatRegistration() {
    return new Promise((resolve, reject) => {
        let begin = dayjs()
        if (begin.day() !== 6) {
            resolve([]);
            return;
        }

        begin = dayjs().startOf('week').subtract(1, 'day');
        let db = firebase.firestore();

        db.collection("registrations-archive")
            .where("utcTime", ">=", begin.format("YYYY/MM/DD"))
            .orderBy("utcTime")
            .get().then(regs => {
                let lastSatReg = regs.docs.filter(r => r.data().GameID === 5).map((r2, i) =>({...r2.data(), GameID:-5, _order:i+1}));
                resolve(lastSatReg);
            })
    });
}

export async function setPlannedGameActive(id, active) {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.PLANNED_GAMES_COLLECTION).doc(id);
    if (docRef) {
        return docRef.update({ disabled: !active });
    }
    throw new Error("Invalid ID");
}


export async function submitRegistration(newRegs, currentUser) {

    var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        db.collection(Collections.REGISTRATION_COLLECTION).get().then((data) => {
            let batch = db.batch();
            let dirty = false;

            newRegs.forEach(reg => {
                const match = (dataItemDoc) => {
                    let dataItem = dataItemDoc.data();
                    return dataItem.email === currentUser && dataItem.GameID === reg.id;
                }

                if (reg.Registered) {
                    // Verify registered
                    if (!data.docs.some(match)) {
                        //not found
                        var docRef = db.collection(Collections.REGISTRATION_COLLECTION).doc();
                        batch.set(docRef, { GameID: reg.id, email: currentUser, utcTime: getTimestamp() });
                        dirty = true;
                    }
                } else {
                    //verify line does not exist or delete it
                    let dataItemToDelete = data.docs.find(match);
                    if (dataItemToDelete) {
                        batch.delete(dataItemToDelete.ref);
                        dirty = true;
                    }
                }
            });
            if (dirty) {
                return batch.commit().then(
                    () => resolve(),
                    (err) => reject(err)
                );
            }
            resolve()
        });
    });

}

function getTimestamp() {
    return dayjs().format("YYYY/MM/DD HH:mm:ss");
}


export async function openWeekForRegistration() {
    const openWeek = app.functions('europe-west1').httpsCallable('openWeek');

    return openWeek();
}

export async function isAdmin() {
    const isAdmin = app.functions('europe-west1').httpsCallable('isAdmin');

    return isAdmin().then(
        () => {
            return true;
        },
        (err) => false
    );
}

/*
export async function openWeekForMatch() {
  let gameTarif = await getGameTarif();
 
    return getCollection(Collections.MATCHES_COLLECTION).then(srcData => {
        var db = firebase.firestore();
        var batch = db.batch();
        let debtUpdateMap = {}
 
        return getCollection(Collections.BILLING_COLLECTION).then(billing => {
 
            //Add Debt for each player
            srcData.forEach((match) => {
                let isSingles = !match.Player2 && !match.Player4;
                for (let i = 1; i <= 4; i++) {
                    if (match["Player" + i]) {
                        let email = match["Player" + i].email
                        addOneGameDebt(db, batch, gameTarif, email,
                            match._ref.id,
                            isSingles, match.date);
                        if (!debtUpdateMap[email]) {
                            debtUpdateMap[email] = 0;
                        }
                        debtUpdateMap[email] += gameTarif * (isSingles ? 1 : 1); //no difference for singles
                    }
                }
            });
 
 
            //update the balance field
            for (const [email, addToBalance] of Object.entries(debtUpdateMap)) {
                let billingRecord = billing.find(b => b._ref.id === email);
 
                if (billingRecord) {
                    batch.update(billingRecord._ref, { balance: billingRecord.balance - addToBalance });
                } else {
                    let newBillingRecord = db.collection(Collections.BILLING_COLLECTION).doc(email);
                    batch.set(newBillingRecord, { balance: -addToBalance });
                }
            }
 
            //move to archive
            srcData.forEach(({ _ref, ...item }) => {
                let docRef = db.collection(Collections.MATCHES_ARCHIVE_COLLECTION).doc(_ref.id);
                let newItem = { ...item };
                batch.set(docRef, newItem);
                batch.delete(_ref);
            })
 
            return batch.commit();
        })
    });
}
 
 
 
async function getGameTarif() {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.SYSTEM_INFO).doc(SYSTEM_RECORD_BILLING);
    if (docRef) {
        return docRef.get().then(doc => {
            return doc.data().PricePerGame
        })
    }
    throw new Error("Cannot obtain price per game");
}
*/

export async function saveMatchResults(match, paymentFactor, isArchived) {

    const updateMatchResults = app.functions('europe-west1').httpsCallable('updateMatchResults');

    let payload = {
        matchID: match._ref.id,
        paymentFactor: paymentFactor ? paymentFactor : -1,
        isInArchive: isArchived,
        sets: match.sets,
        matchedCancelled: false,
    };

    return updateMatchResults(payload);

    // var db = firebase.firestore();
    // let update = { sets: match.sets, matchCanceled: false }
    // if (!match.sets || match.sets.length === 0 || match.sets[0].pair1 === "") {
    //     //remove set Results
    //     update = { sets: [], matchCanceled: false };

    // }
    // if (paymentFactor) {
    //     update.paymentFactor = paymentFactor;
    // } else {
    //     update.paymentFactor = firebase.firestore.FieldValue.delete();
    // }
    // return db.collection(isArchived ? Collections.MATCHES_ARCHIVE_COLLECTION : Collections.MATCHES_COLLECTION)
    //     .doc(match._ref.id).update(update);
}

export async function saveMatchCanceled(match, paymentFactor, isArchived) {

    const updateMatchResults = app.functions('europe-west1').httpsCallable('updateMatchResults');

    let payload = {
        matchID: match._ref.id,
        paymentFactor: paymentFactor ? paymentFactor : -1,
        isInArchive: isArchived,
        sets: [],
        matchedCancelled: true,
    };

    return updateMatchResults(payload);

    // var db = firebase.firestore();
    // let update = { sets: [], matchCanceled: true }
    // if (paymentFactor) {
    //     update.paymentFactor = paymentFactor;
    // } else {
    //     update.paymentFactor = firebase.firestore.FieldValue.delete();
    // }

    // return db.collection(isArchived ? Collections.MATCHES_ARCHIVE_COLLECTION : Collections.MATCHES_COLLECTION)
    //     .doc(match._ref.id).update(update);
}

export async function getUserBalance(email) {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.BILLING_COLLECTION).doc(email);
    if (docRef) {
        return docRef.get().then(doc => {
            let data = doc.data();
            if (data) {
                let initialBalance = data.initialBalance ? data.initialBalance : 0;
                return data.balance + initialBalance;
            } else
                return undefined
        })
    }
    throw new Error("Not able to obtaining Billing");
}

export async function getUserPayments(email) {
    var db = firebase.firestore();
    let subColRef = db.collection(Collections.BILLING_COLLECTION).doc(email).collection(Collections.PAYMENTS_SUB_COLLECTION).orderBy('date', 'desc');
    if (subColRef) {
        return subColRef.get().then((payments) => {
            return payments.docs.map(docObj => docObj.data());
        });
    }
    throw new Error("Not able to obtaining Payments info");
}

export async function getUserDebts(email) {
    var db = firebase.firestore();
    let subColRef = db.collection(Collections.BILLING_COLLECTION).doc(email).collection(Collections.DEBTS_SUB_COLLECTION).orderBy('date', 'desc');
    if (subColRef) {
        return subColRef.get().then((dents) => {
            return dents.docs.map(docObj => docObj.data());
        });
    }
    throw new Error("Not able to obtaining Dents info");
}




export async function addPayment(email, amountStr, comment) {
    var db = firebase.firestore();
    const amount = Number(amountStr);
    if (isNaN(amount)) {
        throw new Error("ערך תשלום לא חוקי");
    }
    if (!comment) {
        comment = "";
    }
    let billingRecord = db.collection(Collections.BILLING_COLLECTION).doc(email);
    return billingRecord.get().then(rec => {
        var batch = db.batch();
        if (rec && rec.data()) {
            batch.update(billingRecord, { balance: rec.data().balance + amount });
        } else {
            batch.set(billingRecord, { balance: amount })
        }

        //insert record in payments
        let paymentRec = db.collection(Collections.BILLING_COLLECTION).doc(email).collection(Collections.PAYMENTS_SUB_COLLECTION).doc();
        batch.set(paymentRec, {
            date: dayjs().format("YYYY-MM-DD"),
            amount,
            comment
        })
        return batch.commit();
    })
}

/*
function addOneGameDebt(db, batch, gameTarif, email, matchID, isSingles, date) {
    let newBillingRecord = db.collection(Collections.BILLING_COLLECTION).doc(email).collection(Collections.DEBTS_SUB_COLLECTION).doc();
    batch.set(newBillingRecord, {
        date,
        matchID,
        amount: gameTarif, // *(isSingles ? 1:1), //no difference for singles
        singles: isSingles
    });
}
*/



export async function getCollectionTest(collName, orderBy, noObjRef) {
    if (collName === Collections.REGISTRATION_COLLECTION) {
        return [
            {
                "email": "1@gmail.com",
                "GameID": 4,
                "_order": 1
            },
            {
                "email": "2@gmail.com",
                "GameID": 5,
                "_order": 2
            },
            {
                "email": "3@gmail.com",
                "GameID": 2,
                "_order": 3
            },
            {
                "email": "4@gmail.com",
                "GameID": 2,
                "_order": 4
            },
            {
                "email": "5@gmail.com",
                "GameID": 2,
                "_order": 5
            },
            {
                "email": "6@gmail.com",
                "GameID": 4,
                "_order": 6
            },
            {
                "email": "7@gmail.com",
                "GameID": 1,
                "_order": 7
            },
            {
                "email": "8@gmail.com",
                "GameID": 2,
                "_order": 8
            },
            {
                "email": "9@gmail.com",
                "GameID": 3,
                "_order": 9
            },
            {
                "email": "10@gmail.com",
                "GameID": 2,
                "_order": 10
            },
            {
                "email": "11@gmail.com",
                "GameID": 3,
                "_order": 11
            },
            {
                "email": "12@gmail.com",
                "GameID": 3,
                "_order": 12
            },
            {
                "email": "13@gmail.com",
                "GameID": 2,
                "_order": 13
            },
            {
                "email": "14@gmail.com",
                "GameID": 3,
                "_order": 14
            },
            {
                "email": "15@gmail.com",
                "GameID": 4,
                "_order": 15
            },
            {
                "email": "16@gmail.com",
                "GameID": 3,
                "_order": 16
            },
            {
                "email": "17@gmail.com",
                "GameID": 3,
                "_order": 17
            },
            {
                "email": "18@gmail.com",
                "GameID": 1,
                "_order": 18
            },
            {
                "email": "19@gmail.com",
                "GameID": 3,
                "_order": 19
            },
            {
                "email": "20@gmail.com",
                "GameID": 2,
                "_order": 20
            },
            {
                "email": "21@gmail.com",
                "GameID": 4,
                "_order": 21
            },
            {
                "email": "22@gmail.com",
                "GameID": 2,
                "_order": 22
            },
            {
                "email": "23@gmail.com",
                "GameID": 1,
                "_order": 23
            },
            {
                "email": "24@gmail.com",
                "GameID": 4,
                "_order": 24
            },
            {
                "email": "25@gmail.com",
                "GameID": 5,
                "_order": 25
            }
        ]
    }

    if (collName === Collections.USERS_COLLECTION) {
        return [
            {
                "email": "1@gmail.com",
                "displayName": "Dalton Ross",
                "rank": 53
            },
            {
                "email": "2@gmail.com",
                "displayName": "Granville Solis",
                "rank": 74
            },
            {
                "email": "3@gmail.com",
                "displayName": "Oliver Mueller",
                "rank": 39
            },
            {
                "email": "4@gmail.com",
                "displayName": "Sean Manning",
                "rank": 95
            },
            {
                "email": "5@gmail.com",
                "displayName": "Brady Espinoza",
                "rank": 71
            },
            {
                "email": "6@gmail.com",
                "displayName": "Alec Boyle",
                "rank": 18
            },
            {
                "email": "7@gmail.com",
                "displayName": "Gavin Drake",
                "rank": 45
            },
            {
                "email": "8@gmail.com",
                "displayName": "Brooks Montoya",
                "rank": 56
            },
            {
                "email": "9@gmail.com",
                "displayName": "Geraldo Holloway",
                "rank": 34
            },
            {
                "email": "10@gmail.com",
                "displayName": "Vincent Bender",
                "rank": 4
            },
            {
                "email": "11@gmail.com",
                "displayName": "Isreal Morales",
                "rank": 90
            },
            {
                "email": "12@gmail.com",
                "displayName": "Sebastian Clay",
                "rank": 6
            },
            {
                "email": "13@gmail.com",
                "displayName": "Joe Howe",
                "rank": 81
            },
            {
                "email": "14@gmail.com",
                "displayName": "Chris Aguirre",
                "rank": 73
            },
            {
                "email": "15@gmail.com",
                "displayName": "Curtis Sweeney",
                "rank": 87
            },
            {
                "email": "16@gmail.com",
                "displayName": "Theron Vargas",
                "rank": 79
            },
            {
                "email": "17@gmail.com",
                "displayName": "Erik Stanton",
                "rank": 95
            },
            {
                "email": "18@gmail.com",
                "displayName": "Dudley Burke",
                "rank": 63
            },
            {
                "email": "19@gmail.com",
                "displayName": "Nathaniel Crawford",
                "rank": 94
            },
            {
                "email": "20@gmail.com",
                "displayName": "Francisco Ellison",
                "rank": 9
            },
            {
                "email": "21@gmail.com",
                "displayName": "Martin Terrell",
                "rank": 59
            },
            {
                "email": "22@gmail.com",
                "displayName": "Lorenzo Maynard",
                "rank": 77
            },
            {
                "email": "23@gmail.com",
                "displayName": "Herman Reid",
                "rank": 10
            },
            {
                "email": "24@gmail.com",
                "displayName": "Tony Hale",
                "rank": 27
            },
            {
                "email": "25@gmail.com",
                "displayName": "Myles Mcgee",
                "rank": 58
            }
        ]


    }
    if (collName === Collections.MATCHES_COLLECTION) {
        return [];
    }
    return getCollection(collName, orderBy, noObjRef);
}

export async function getCollection(collName, orderBy, orderDesc) {
    var db = firebase.firestore();
    let colRef = db.collection(collName);
    if (orderBy) {
        colRef = orderDesc ? colRef.orderBy(orderBy, "desc") : colRef.orderBy(orderBy);
    }

    let i = 1;
    return colRef.get().then((items) => {
        return items.docs.map(docObj => {
            let obj = docObj.data();
            if (orderBy)
                obj._order = i++;


            obj._ref = docObj.ref;

            return obj;
        })
    });
}

export async function getPaginatedCollection(collName, orderBy, orderDesc, limit, startAfter) {
    var db = firebase.firestore();
    let colRef = db.collection(collName);
    if (orderBy) {
        colRef = orderDesc ? colRef.orderBy(orderBy, "desc") : colRef.orderBy(orderBy);
    }

    if (limit) {
        colRef = colRef.limit(limit);
    }

    if (startAfter) {
        colRef = colRef.startAfter(startAfter);
    }
    let i = 1;
    return colRef.get().then((items) => {
        return items.docs.map(docObj => {
            let obj = docObj.data();
            if (orderBy)
                obj._order = i++;


            obj._ref = docObj.ref;
            obj._doc = docObj;

            return obj;
        })
    });
}

export async function saveMatches(matches, isTest) {
    var db = firebase.firestore();
    var batch = db.batch();

    matches.forEach(m => {
        if (m.deleted) {
            if (m._ref) {
                batch.delete(m._ref);
            }
            //else do nothing (was created and deleted before save)
        } else if (m._ref) {
            const { _ref, ...dataOnly } = m;



            batch.set(m._ref, cleanseMatch(dataOnly));
        } else {
            //new match
            var docRef = db.collection(Collections.MATCHES_COLLECTION).doc();
            let newMatch = cleanseMatch(m);

            batch.set(docRef, newMatch);
        }
    })
    if (isTest) {
        throw new Error("No Save In Testing");
    }
    return batch.commit();
}

function cleanseMatch(m) {
    let newMatch = { ...m };
    delete newMatch._collapse;

    if (!newMatch.Player1)
        delete newMatch.Player1;
    else
        newMatch.Player1 = cleansePlayer(newMatch.Player1)


    if (!newMatch.Player2)
        delete newMatch.Player2;
    else
        newMatch.Player2 = cleansePlayer(newMatch.Player2)

    if (!newMatch.Player3)
        delete newMatch.Player3;
    else
        newMatch.Player3 = cleansePlayer(newMatch.Player3)

    if (!newMatch.Player4)
        delete newMatch.Player4;
    else
        newMatch.Player4 = cleansePlayer(newMatch.Player4)

    return newMatch;
}


//----------
export async function initGames() {

    let games = [
        {
            id: 1,
            Day: "ראשון",
            Hour: '20:05'
        },
        {
            id: 2,
            Day: "שלישי",
            Hour: '20:05'
        },
        {
            id: 3,
            Day: "חמישי",
            Hour: '20:05'
        },
        {
            id: 4,
            Day: "שישי",
            Hour: '16:05'
        },
        {
            id: 5,
            Day: "שבת",
            Hour: '20:05'
        }
    ]

    var db = firebase.firestore();
    var batch = db.batch();

    games.forEach(g => {
        var docRef = db.collection(Collections.PLANNED_GAMES_COLLECTION).doc();
        batch.set(docRef, g);
    })

    return batch.commit()
}


export async function addUser(user) {
    const registerUser = app.functions('europe-west1').httpsCallable('registerUser');

    return registerUser(user);
}

export async function deleteUser(user) {
    throw new Error("Operation not supported")
}

export async function activateUser(user, inactive, newUser) {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.USERS_INFO_COLLECTION).doc(user.email);

    if (newUser) {
        return docRef.set({
            email: user.email,
            displayName: user.displayName,
            inactive: inactive
        })
    } else {
        return docRef.update({
            email: user.email,
            displayName: user.displayName,
            inactive: inactive
        })
    }
}

export async function saveUsers(users) {
    var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        let batch = db.batch();

        users.forEach(({ dirty, _ref, _inactive, _waitForApproval, _origDisplayName, _elo1, _elo2, ...user }) => {
            if (dirty) {
                user.displayName = user.displayName.trim();
                batch.set(_ref, user);
                if (user.displayName !== _origDisplayName && !_waitForApproval) {
                    let userInfo = db.collection(Collections.USERS_INFO_COLLECTION).doc(user.email);
                    batch.update(userInfo, { displayName: user.displayName });
                }
            }
        })
        batch.commit().then(
            () => resolve(),
            (err) => reject(err)
        );
    })
}

export async function getUsersWithBalls() {
    var db = firebase.firestore();
    return db.collection(Collections.USERS_INFO_COLLECTION).where("balls", ">", 0).get();
}

export async function setBallsAmount(email, curr, delta) {
    if (!curr) {
        curr = 0;
    }
    const newVal = curr + delta;
    if (newVal < 0) {
        throw new Error("ערך קטן מ-0 אינו חוקי");
    }
    var db = firebase.firestore();
    return db.collection(Collections.USERS_INFO_COLLECTION).doc(email).update({ balls: newVal });
}

export async function getRegistrationOpen() {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.SYSTEM_INFO).doc(SYSTEM_RECORD_REGISTRATION);
    if (docRef) {
        return docRef.get().then(doc => {
            return doc.data().open
        })
    }
    return false;
}

export async function setRegistrationOpen(isOpen) {
    var db = firebase.firestore();
    let docRef = db.collection(Collections.SYSTEM_INFO).doc(SYSTEM_RECORD_REGISTRATION);
    if (docRef) {
        return docRef.update({ open: isOpen })
    }
}

export async function getDetailedStats(email) {
    let db = firebase.firestore();
    let matches = db.collection(Collections.MATCHES_ARCHIVE_COLLECTION)
    let queries = [
        matches.where("Player1.email", "==", email).get(),
        matches.where("Player2.email", "==", email).get(),
        matches.where("Player3.email", "==", email).get(),
        matches.where("Player4.email", "==", email).get(),
    ];
    const stats = {};
    return Promise.all(queries).then(all => {
        let allMatches = all[0].docs.concat(all[1].docs).concat(all[2].docs).concat(all[3].docs);

        allMatches.forEach(matchDoc => {
            const match = matchDoc.data();

            for (let i = 1; i <= 4; i++) {
                if (match["Player" + i] && match["Player" + i].email === email) {
                    if (i < 3) {
                        match.Player1 = undefined;
                        match.Player2 = undefined;
                    } else {
                        match.Player3 = undefined;
                        match.Player4 = undefined;
                    }
                    break;
                }
            }
            if (!match.sets)
                return;

            for (let i = 1; i <= 4; i++) {
                if (match["Player" + i]) {
                    let winner = calcWinner(match);
                    let stat = stats[match["Player" + i].email];
                    if (stat === undefined) {
                        stat = {
                            wins: 0,
                            loses: 0,
                            ties: 0,
                        }
                    }
                    if (winner === 0) {
                        stat.ties++;
                    } else if (i >= 3) {
                        if (winner === 1) {
                            stat.wins++;
                        } else {
                            stat.loses++;
                        }
                    } else {
                        if (winner === 1) {
                            stat.loses++;
                        } else {
                            stat.wins++;
                        }
                    }
                    stats[match["Player" + i].email] = stat;
                }
            }
        });

        const results = []
        for (const [statId] of Object.entries(stats)) {
            results.push({
                _ref: { id: statId },
                ...stats[statId],
            })
        }
        return results;
    });
}