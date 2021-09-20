import firebase from 'firebase/app'
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';



import { config } from './config';
import { cleansePlayer, sortByDays } from './utils';
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
//let functions = undefined;

export function initAPI() {
    if (!app) {
        app = firebase.initializeApp({ ...config });
        // functions = getFunctions(app)
    }
}

export async function migrateDate() {

    var db = firebase.firestore();
    let batch = db.batch();


    return getCollection("matches-archive").then(ma=>getCollection("billing").then(srcData => {
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
                srcItem._ref.collection("debts").get().then(dts=>{
                    dts.forEach(p=>{
                        //find date:
                        let match = ma.find(m=>m._ref.id === p.data().matchID)
                        if (match) {
                            //console.log(match.date)
                            let d = dayjs(match.date);
                            batch.update(p.ref, {date: d.format("YYYY-MM-DD")});    
                        }
                    })
                })
            )
            
        })
        return Promise.all(waitFor).then(()=>batch.commit());
    }))
}

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
                return { displayName: data.displayName, email: user.email.toLowerCase(), _user: user };
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

        db.collection(Collections.PLANNED_GAMES_COLLECTION).get().then((planned) => {
            let results = []
            planned.forEach((doc) => {
                if (!doc.data().disabled) {
                    results.push(doc.data());
                }
            });
            results.sort((a, b) => sortByDays(a.Day, b.Day));

            db.collection(Collections.REGISTRATION_COLLECTION).get().then(
                regs => {
                    regs.docs.forEach(regDoc => {
                        let reg = regDoc.data();
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

export async function saveMatchResults(match, isArchived) {
    var db = firebase.firestore();
    let update = { sets: match.sets }
    if (!match.sets || match.sets.length === 0 || match.sets[0].pair1 === "") {
        //remove set Results
        update = { sets: [] };
    }
    return db.collection(isArchived ? Collections.MATCHES_ARCHIVE_COLLECTION : Collections.MATCHES_COLLECTION)
        .doc(match._ref.id).update(update);
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
    let amount = parseFloat(amountStr);
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
        colRef = orderDesc? colRef.orderBy(orderBy, "desc") : colRef.orderBy(orderBy);
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

        users.forEach(({ dirty, _ref, _inactive, _waitForApproval, _origDisplayName, ...user }) => {
            if (dirty) {
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