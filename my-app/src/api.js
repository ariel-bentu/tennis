import firebase from 'firebase/app'
import 'firebase/auth';
import 'firebase/firestore';
import { config } from './config';

export const Collections = {
    REGISTRATION_COLLECTION: "registrations",
    PLANNED_GAMES_COLLECTION: "planned-games",
    MATCHES_COLLECTION: "matches",
    USERS_COLLECTION: "users"
}



export function initAPI() {
    firebase.initializeApp({ ...config });
}

export async function getUserInfo(user, pwd) {
    return firebase.auth().signInWithEmailAndPassword(user, pwd)
        .then((userCredential) => {
            // Signed in
            return getUserObj(userCredential.user);
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

export function getUserObj(user) {
    return {
        displayName: user.displayName && user.displayName.length > 0 ? user.displayName : user.email,
        email: user.email,
        _user: user
    };
}



export async function getPlannedGames(currentUser) {

    var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        db.collection(Collections.PLANNED_GAMES_COLLECTION).get().then((planned) => {
            let results = []
            planned.forEach((doc) => {
                results.push(doc.data());
            });
            results.sort((a, b) => a.id - b.id);

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
                        batch.set(docRef, { GameID: reg.id, email: currentUser, time: new Date().toDateString() });
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

export async function getCollection(collName, orderBy) {

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

    if (collName === Collections.USERS_COLLECTION ) {
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


    var db = firebase.firestore();
    let colRef = db.collection(collName);
    if (orderBy) {
        colRef = colRef.orderBy(orderBy);
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

export async function saveMatches(matches) {
    var db = firebase.firestore();
    var batch = db.batch();

    matches.forEach(m => {
        if (m.deleted) {
            if (m._ref) {
                batch.delete(m._ref);
            }
            //else do nothing
        } else if (m._ref) {
            const { _ref, ...dataOnly } = m;



            batch.set(m._ref, cleanseMatch(dataOnly));
        } else {
            //new match
            var docRef = db.collection(Collections.MATCHES_COLLECTION).doc();
            batch.set(docRef, cleanseMatch(m));
        }
    })

    return batch.commit();
}

function cleanseMatch(m) {
    if (!m.Player1)
        delete m.Player1;
    if (!m.Player2)
        delete m.Player2;
    if (!m.Player3)
        delete m.Player3;
    if (!m.Player4)
        delete m.Player4;
    return m;
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


export function addUser(user, pwd) {
    return firebase.auth().createUserWithEmailAndPassword(user.email, pwd || user.phone)
        .then((userCredential) => {
            var db = firebase.firestore();
            db.collection(Collections.USERS_COLLECTION).doc(user.email).set(user).catch(err => {
                //revert 
                firebase.auth().delete(userCredential.user.uid);
                throw (err.message);
            })
        })
        .catch((error) => {
            //var errorCode = error.code;
            var errorMessage = error.message;
            throw (errorMessage);
        });
}

export async function deleteUser(user) {
    throw("Operation not supported")
}

export async function saveUsers(users) {
    var db = firebase.firestore();
    return new Promise((resolve, reject) => {

        let batch = db.batch();

        users.forEach(({ dirty, _ref, ...user }) => {
            if (dirty) {
                batch.set(_ref, user);
            }
        })
        batch.commit().then(
            () => resolve(),
            (err) => reject(err)
        );
    })
}

export async function registerUser(user, pwd) {
    return addUser(user, pwd);
}

