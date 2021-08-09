import firebase from 'firebase/app'
import 'firebase/auth';
import 'firebase/firestore';
import { config } from './config';

export const Collections = {
    REGISTRATION_COLLECTION: "registrations",
    PLANNED_GAMES_COLLECTION: "planned-games",
    MATCHES_COLLECTION: "matches"
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

export function getUserObj(user) {
    return {
        Name: user.displayName && user.displayName.length > 0 ? user.displayName : user.email,
        email: user.email
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
                        NumOfRegistered++;
                        game.NumOfRegistered = NumOfRegistered;
                        if (reg.email === currentUser) {
                            game.Registered = true;
                        }
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
                        batch.set(docRef, { GameID: reg.id, email: currentUser });
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

export async function getCollection(collName) {

    if (collName == Collections.REGISTRATION_COLLECTION) {
        return [
            { GameID: 2, email: "ariel.bentolila@gmail.com" },
            { GameID: 2, email: "ariel.bentolila1@gmail.com" },
            { GameID: 2, email: "ariel.bentolila2@gmail.com" },
            { GameID: 2, email: "ariel.bentolila3@gmail.com" },
            { GameID: 2, email: "ariel.bentolila4@gmail.com" },
            { GameID: 2, email: "ariel.bentolila5@gmail.com" },
            { GameID: 2, email: "ariel.bentolila6@gmail.com" },
            { GameID: 2, email: "ariel.bentolila7@gmail.com" },
            { GameID: 2, email: "ariel.bentolila8@gmail.com"}
        ]
    }

    if (collName == Collections.USERS_COLLECTION) {
        return [
            {  email: "ariel.bentolila@gmail.com", displayName: 'אריאל' },
            {  email: "ariel.bentolila1@gmail.com", displayName: '1אריאל' },
            {  email: "ariel.bentolila2@gmail.com", displayName: '2אריאל' },
            {  email: "ariel.bentolila3@gmail.com", displayName: '3אריאל' },
            {  email: "ariel.bentolila4@gmail.com", displayName: '4אריאל' },
            {  email: "ariel.bentolila5@gmail.com", displayName: '5אריאל' },
            {  email: "ariel.bentolila6@gmail.com", displayName: '6אריאל' },
            {  email: "ariel.bentolila7@gmail.com", displayName: '7אריאל' },
            {  email: "ariel.bentolila8@gmail.com", displayName: '8אריאל' },
            {  email: "maayan@gmail.com", displayName: 'מעין' },

        ]
    }


    var db = firebase.firestore();

    return db.collection(collName).get().then((items) => {
        return items.docs.map(docObj => docObj.data())
    });
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