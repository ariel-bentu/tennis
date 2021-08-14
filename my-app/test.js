const firebase =require( 'firebase/app')
require( 'firebase/auth');
require( 'firebase/firestore')

const config = {
    apiKey: "AIzaSyALqHMEQb4xklCnIqUP_hqbKXEo8u0zx8A",
    projectId: "atpenn-fe837",
  };


firebase.initializeApp({ ...config });

 async function getCollection(collName, orderBy) {
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

            //obj._ref = docObj.ref;
            return obj;
        })
    });
}
//getCollection("test").then(u => console.log(JSON.stringify(u,undefined, 2)));

firebase.auth().signInWithEmailAndPassword("ariel.bentolila@gmail.com", "ABcd12345").then(() => {
    getCollection("test").then(u => {
        console.log(JSON.stringify(u, undefined, 2))
        //console.log("test:", u.length);
        var db = firebase.firestore();
        db.collection("test").doc("7").set({a:16});
    });
});