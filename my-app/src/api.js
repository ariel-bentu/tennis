import { initializeApp } from 'firebase/app'
import {
    getFirestore, collection, getDocs, getDoc, doc,
    query, where, orderBy, limit, startAfter,
    updateDoc, setDoc,
    writeBatch
} from 'firebase/firestore/lite';

import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword,
    sendPasswordResetEmail, signOut, updatePassword
} from "firebase/auth";
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

import { getFunctions, httpsCallable } from 'firebase/functions';
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
    BETS_COLLECTION: "bets",

    USERS_COLLECTION: "users",
    USERS_INFO_COLLECTION: "users-info",
    SYSTEM_INFO: "systemInfo",
    REGISTRATION_ARCHIVE_COLLECTION: "registrations-archive",
    MATCHES_ARCHIVE_COLLECTION: "matches-archive"
}



const SYSTEM_RECORD_REGISTRATION = "registration"

let app = undefined;
let db = undefined;
let auth = undefined;
let functions = undefined;

export function initAPI(onAuth, onPushNotification, onNotificationToken) {
    if (!app) {
        app = initializeApp({ ...config });
        db = getFirestore(app);
        db.collection = (collName, ...args) => collection(db, collName, ...args);
        auth = getAuth(app);
        functions = getFunctions(app, 'europe-west1');


        try {
            if ('safari' in window && 'pushNotification' in window.safari) {
                // requires user gesture...
            } else {
                const messaging = getMessaging(app);
                Notification.requestPermission().then(perm => {
                    if (perm === "granted") {
                        console.log("permission granted");
                        getToken(messaging, { vapidKey: 'BFMK8mjTcp6ArpTF4QNhnXwo387CzIADR9WmybUvlf5yXI2NExGdTFsvD4_KHZ-3CWLF4gRq19VQTngTsREWYl8' }).then((currentToken) => {
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

                    onMessage(messaging, (payload) => {
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
    onAuthStateChanged(auth, onAuth);
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

export async function updateUserNotification(pushNotification, newNotificationToken, isSafari) {
    const updateNotification = httpsCallable(functions, 'updateNotification');

    const payload = {};
    if (pushNotification !== undefined) {
        payload.pushNotification = pushNotification;
    }

    if (newNotificationToken !== undefined) {
        payload.notificationToken = {
            isSafari,
            token: newNotificationToken,
            ts: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        };
    }

    return updateNotification(payload);
}

export async function getUserInfo(user, pwd) {
    return signInWithEmailAndPassword(auth, user, pwd)
        .then((userCredential) => {
            // Signed in
            return userCredential.user;
        })
        .catch((error) => {
            throw error.message;
        });
}

export async function changePwd(user,  newPwd) {
    return updatePassword(user, newPwd).catch(err=>{
        if (err.message.includes("auth/requires-recent-login")) {
            return new Error("יש לרענן את ההתחברות לפני שינוי הסיסמא. נא להתנתק ולהתחבר שוב, ואז לנסות בשנית");
        }
        return err;
    });
}

export async function logout() {
    return signOut(auth);
}

export async function forgotPwd(email) {
    return sendPasswordResetEmail(auth, email);
}

export async function getUserObj(user) {
    if (user && user.email) {
        let docRef = doc(db, Collections.USERS_INFO_COLLECTION, user.email.toLowerCase());
        return getDoc(docRef).then(u => {
            let data = u.data();
            if (!data) {
                throw new Error("חשבונך מחכה לאישור - יש לפנות למנהל המערכת");
            } else if (data.inactive) {
                throw new Error("חשבונך אינו פעיל - יש לפנות למנהל המערכת");
            }
            return { 
                displayName: data.displayName, 
                email: user.email.toLowerCase(),
                _user: user,
                _userInfo: data, 
                pushNotification: data.pushNotification 
            };
        },
            (err) => {
                throw new Error("חשבונך אינו פעיל - יש לפנות למנהל המערכת")
            });
    }
    return undefined;
}


export async function getPlannedGames(currentUser) {

    return new Promise((resolve, reject) => {

        getDocs(db.collection(Collections.PLANNED_GAMES_COLLECTION)).then(async (planned) => {
            let results = []
            planned.forEach((doc) => {
                if (!doc.data().disabled) {
                    results.push(doc.data());
                }
            });
            results.sort((a, b) => sortByDays(a.Day, b.Day));

            getDocs(db.collection(Collections.REGISTRATION_COLLECTION)).then(
                regs => {
                    let regsData = regs.docs.map(doc => doc.data());

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

/**
 * 
 * @returns undefined if not Saterday, [] or array of reg if exists from last week's Sat
 */

export async function thisSatRegistration() {
    return new Promise((resolve, reject) => {
        let begin = dayjs()
        if (begin.day() !== 6) {
            resolve(undefined);
            return;
        }

        begin = dayjs().startOf('week').subtract(1, 'day');
        // let db = firebase.firestore();

        const coll = db.collection("registrations-archive");
        const q = query(coll,
            where("utcTime", ">=", begin.format("YYYY/MM/DD")),
            orderBy("utcTime"));

        getDocs(q).then(regs => {
            let lastSatReg = regs.docs.filter(r => r.data().GameID === 5).map((r2, i) => ({ ...r2.data(), GameID: -5, _order: i + 1 }));
            resolve(lastSatReg);
        })
    });
}

export async function setPlannedGameActive(id, active) {
    let docRef = doc(db, Collections.PLANNED_GAMES_COLLECTION, id)
    if (docRef) {
        return updateDoc(docRef, { disabled: !active });
    }
    throw new Error("Invalid ID");
}


export async function submitRegistration(newRegs, currentUser) {

    // var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        getDocs(db.collection(Collections.REGISTRATION_COLLECTION)).then((data) => {
            let batch = writeBatch(db);
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
                        var docRef = doc(db.collection(Collections.REGISTRATION_COLLECTION));
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
    const openWeek = httpsCallable(functions, 'openWeek');

    return openWeek();
}

export async function sendMessage(msg, numbers) {
    const sendMessage = httpsCallable(functions, 'sendMessage');

    return sendMessage({ msg, numbers });
}


export async function isAdmin() {
    const isAdmin = httpsCallable(functions, 'isAdmin');

    return isAdmin().then(
        () => {
            return true;
        },
        (err) => false
    );
}


export async function saveMatchResults(match, paymentFactor, isArchived) {

    const updateMatchResults = httpsCallable(functions, 'updateMatchResults');

    let payload = {
        matchID: match._ref.id,
        paymentFactor: paymentFactor ? paymentFactor : -1,
        isInArchive: isArchived,
        sets: match.sets,
        matchedCancelled: false,
    };

    return updateMatchResults(payload);
}

export async function saveMatchCanceled(match, paymentFactor, isArchived) {

    const updateMatchResults = httpsCallable(functions, 'updateMatchResults');

    let payload = {
        matchID: match._ref.id,
        paymentFactor: paymentFactor ? paymentFactor : -1,
        isInArchive: isArchived,
        sets: [],
        matchedCancelled: true,
    };

    return updateMatchResults(payload);
}

export async function getUserBalance(email) {
    let docRef = doc(db, Collections.BILLING_COLLECTION, email);

    return getDoc(docRef).then(doc => {
        if (doc.exists) {
            let data = doc.data();
            let initialBalance = data.initialBalance ? data.initialBalance : 0;
            return data.balance + initialBalance;
        } else
            return undefined;
    })
}

export async function getUserPayments(email) {
    const subColRef = db.collection(Collections.BILLING_COLLECTION, email, Collections.PAYMENTS_SUB_COLLECTION);
    const q = query(subColRef, orderBy('date', 'desc'));
    return getDocs(q).then((payments) => {
        return payments.docs.map(docObj => docObj.data());
    });
}

export async function getUserDebts(email) {
    const subColRef = db.collection(Collections.BILLING_COLLECTION, email, Collections.DEBTS_SUB_COLLECTION);
    const q = query(subColRef, orderBy('date', 'desc'));
    return getDocs(q).then((debts) => {
        return debts.docs.map(docObj => docObj.data());
    });
}

export async function addPayment(email, amountStr, comment) {
    // var db = firebase.firestore();
    const amount = Number(amountStr);
    if (isNaN(amount)) {
        throw new Error("ערך תשלום לא חוקי");
    }
    if (!comment) {
        comment = "";
    }
    let billingRecord = doc(db, Collections.BILLING_COLLECTION, email);
    return getDoc(billingRecord).then(rec => {
        var batch = writeBatch(db);

        if (rec.exists) {
            batch.update(billingRecord, { balance: rec.data().balance + amount });
        } else {
            batch.set(billingRecord, { balance: amount })
        }

        //insert record in payments
        let paymentRec = db.collection(Collections.BILLING_COLLECTION, email, Collections.PAYMENTS_SUB_COLLECTION);
        batch.set(doc(paymentRec), {
            date: dayjs().format("YYYY-MM-DD"),
            amount,
            comment
        })
        return batch.commit();
    })
}

export async function getCollection(collName, oBy, orderDesc) {
    let colRef = db.collection(collName);
    const constraints = []
    if (oBy) {
        constraints.push(orderDesc ? orderBy(oBy, "desc") : orderBy(oBy));
    }

    let i = 1;
    return getDocs(query(colRef, ...constraints)).then((items) => {
        return items.docs.map(docObj => {
            let obj = docObj.data();
            if (orderBy)
                obj._order = i++;


            obj._ref = docObj.ref;

            return obj;
        })
    });
}

export async function getPaginatedCollection(collName, oBy, orderDesc, lim, sAfter) {
    let colRef = db.collection(collName);
    const constraints = []
    if (oBy) {
        constraints.push(orderDesc ? orderBy(oBy, "desc") : orderBy(oBy));
    }

    if (lim) {
        constraints.push(limit(lim));
    }

    if (sAfter) {
        constraints.push(startAfter(sAfter));
    }
    let i = 1;
    return getDocs(query(colRef, ...constraints)).then((items) => {
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

export async function getCollectionWithWhere(collName, whereField, op, value, oBy, orderDesc) {
    let colRef = db.collection(collName);
    const constraints = []
    if (whereField) {
        constraints.push(where(whereField, op, value));
    }
    if (oBy) {
        constraints.push(orderDesc ? orderBy(oBy, "desc") : orderBy(oBy));
    }


    let i = 1;
    return getDocs(query(colRef, ...constraints)).then((items) => {
        return items.docs.map(docObj => {
            let obj = docObj.data();
            if (orderBy)
                obj._order = i++;


            obj._ref = docObj.ref;

            return obj;
        })
    });
}

export async function saveMatches(matches, isTest) {
    var batch = writeBatch(db);

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
            var docRef = doc(db.collection(Collections.MATCHES_COLLECTION));
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

    var batch = writeBatch(db);
    games.forEach(g => {
        var docRef = doc(db.collection(Collections.PLANNED_GAMES_COLLECTION));
        batch.set(docRef, g);
    })

    return batch.commit()
}


export async function addUser(user) {
    const registerUser = httpsCallable(functions, 'registerUser');

    return registerUser(user);
}

export async function deleteUser(user) {
    throw new Error("Operation not supported")
}

export async function activateUser(user, inactive, newUser) {
    let docRef = doc(db.collection(Collections.USERS_INFO_COLLECTION), user.email);

    if (newUser) {
        return setDoc(docRef, {
            email: user.email,
            displayName: user.displayName,
            inactive: inactive
        });
    } else {
        return updateDoc(docRef, {
            email: user.email,
            displayName: user.displayName,
            inactive: inactive
        })
    }
}

export async function saveUsers(users) {
    return new Promise((resolve, reject) => {

        let batch = writeBatch(db);

        users.forEach(({ dirty, _ref, _inactive, _waitForApproval, _origDisplayName, _elo1, _elo2, ...user }) => {
            if (dirty) {
                user.displayName = user.displayName.trim();
                batch.set(_ref, user);
                if (user.displayName !== _origDisplayName && !_waitForApproval) {
                    let userInfo = doc(db.collection(Collections.USERS_INFO_COLLECTION), user.email);
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
    const q = query(db.collection(Collections.USERS_INFO_COLLECTION), where("balls", ">", 0));
    return getDocs(q);
}

export async function setBallsAmount(email, curr, delta) {
    if (!curr) {
        curr = 0;
    }
    const newVal = curr + delta;
    if (newVal < 0) {
        throw new Error("ערך קטן מ-0 אינו חוקי");
    }
    // var db = firebase.firestore();
    return updateDoc(doc(db, Collections.USERS_INFO_COLLECTION, email), { balls: newVal });
}

export async function getRegistrationOpen() {
    let docRef = doc(db, Collections.SYSTEM_INFO, SYSTEM_RECORD_REGISTRATION);
    return getDoc(docRef).then(doc => {
        return doc.exists && doc.data().open
    })

}

export async function setRegistrationOpen(isOpen) {
    let docRef = doc(db, Collections.SYSTEM_INFO, SYSTEM_RECORD_REGISTRATION);
    return updateDoc(docRef, { open: isOpen });
}

export async function getDetailedStats(email) {
    // let db = firebase.firestore();
    let matches = db.collection(Collections.MATCHES_ARCHIVE_COLLECTION);

    let queries = [
        getDocs(query(matches, where("Player1.email", "==", email))),
        getDocs(query(matches, where("Player2.email", "==", email))),
        getDocs(query(matches, where("Player3.email", "==", email))),
        getDocs(query(matches, where("Player4.email", "==", email))),
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



export async function placeBet(bet) {

    delete bet._ref;

    const placeBetFunction = httpsCallable(functions, 'placeBet');

    return placeBetFunction(bet);
}