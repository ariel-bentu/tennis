const server = require('../functions/index.js');
const dayjs = require("dayjs");

let mockBatchState = [];
let gTestData = {};
const mockBatch = {

    set: (ref, data) => {
        mockBatchState.push({
            op: "set", id:ref.id, data
        })
    },
    delete: (ref) => {
        mockBatchState.push({
            op: "delete", id:ref.id
        })
    },
    update: (ref, data) => {
        mockBatchState.push({
            op: "update", id:ref.id, data
        })
    },
    commit: async () => {
        console.log("Commit:");
        mockBatchState.forEach(op=>console.log("id",op.id, "op", op.op, op.data && JSON.stringify(op.data)));
    },
    assert: (msg, id, op, fieldValPairs)=> {
        const obj = mockBatchState.find(obj=>obj.id === id);
        if (!obj) {
            console.log("Fail", msg, "ID", id, "Not found")
            return;
        }
        if (op != obj.op) {
            console.log("Fail", msg, "op", op, "mismatch with actual", obj.op);
            return;
        }
        fieldValPairs.forEach(pair=> {
            if (obj.data[pair.name] !== pair.val) {
                console.log("Fail", msg, "field", pair.name, "mismatch val. expected", pair.val, "found", obj.data[pair.name]);
                return;
            }
        })
        return console.log("Success", msg);
    }


}

const mockDB = {
    batch: () => {
        mockBatchState = [];
        return mockBatch;
    },
    collection: (coll) => {
        switch (coll) {
            case "systemInfo":
                return {
                    doc: (docID) => {
                        switch (docID) {
                            case "Events": return {
                                get: async () => ({
                                    data: () => ({
                                        matchEvents: true,
                                    })
                                })
                            }
                            case "Billing": return {
                                get: async () => ({
                                    data: () => ({
                                        PricePerGame: 40,
                                        PricePerSinglesGame: 60,
                                    })
                                })
                            }
                        }
                    }
                }
            case "notifications":
                return {
                    doc: () => ({
                        id: "1234",
                        get: async () => ({
                            data: () => ({
                                //todo
                            })
                        })
                    }),
                }
            default: {
                return getCollectionData(coll);
            }
        }
    }
}

function getCollectionData(collName) {
    return gTestData[collName];
}
function getColl(data) {
    const coll = {
        doc: (id) => ({
            id: id,
            get: async () => ({
                exists: true,
                data: () => data.find(obj => obj._docID === id),
            })
        }),
        where: (fName, op, value) => coll,
        get: async  () => ({
            exists: true,
            docs: data.map(d => ({
                exists: true,
                data: () => d,

                ref: {
                    id: d._docID
                }
            }))
        })
    }
    return coll;
}

function getMatch(p1, p2, p3, p4, sets, dateDaysDiff, cancelled) {

    const getPlayer = (name) => ({ email: name + "@gmail.com", displayName: name, })
    const match = {
        Player1: getPlayer(p1),
        Player2: getPlayer(p2),
        Player3: getPlayer(p3),
        Player4: getPlayer(p4),
        sets,
        date: dayjs().add(dateDaysDiff, "days"),
    }
    if (cancelled !== undefined) {
        match.matchCancelled = cancelled;
    }
    return match;
}


server.setMockDB(mockDB);

async function  test_matchArchiveUpdated() {
    gTestData.stats = getColl(
        [
            {
                _docID: "a@gmail.com",
                wins: 0,
                loses: 0,
                ties: 0,
                elo1: 1500,
                elo2: 1500
            },
            {
                _docID: "b@gmail.com",
                wins: 0,
                loses: 0,
                ties: 0,
                elo1: 1500,
                elo2: 1500
            },
            {
                _docID: "c@gmail.com",
                wins: 0,
                loses: 0,
                ties: 0,
                elo1: 1500,
                elo2: 1500
            },
            {
                _docID: "d@gmail.com",
                wins: 0,
                loses: 0,
                ties: 0,
                elo1: 1500,
                elo2: 1500
            },
        ]
    )

    const gameResults = [
        {
            "pair1": "7",
            "pair2": "5"
        }
    ]
    /* set new results */
    const changeNewResults = {
        before: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", undefined, -1)
        },
        after: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", gameResults, -1)
        }
    }

    const changeSameResultsAgain = {
        before: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", gameResults, -1)
        },
        after: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", gameResults, -1)
        }
    }

    const changeGameCancelled = {
        before: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", gameResults, -1)
        },
        after: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", [] , -1, true)
        }
    }

    const changeGameReenter = {
        before: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", [], -1, true)
        },
        after: {
            exists: true,
            data: () => getMatch("a", "b", "c", "d", gameResults , -1)
        }
    }

    const context = {
        params: {
            matchID: "abcd",
        }
    }
    console.log("new results - p1 wins")
    await server.matchArchiveUpdated(changeNewResults, context)

    mockBatch.assert("verify a wins", "a@gmail.com", "update", [{name:"wins", val:"1"}])
    mockBatch.assert("verify c wins", "c@gmail.com", "update", [{name:"wins", val:"0"}, {name:"loses", val:"1"}])
    console.log("same game results again")
    await server.matchArchiveUpdated(changeSameResultsAgain, context)



    console.log("cancel game")
    await server.matchArchiveUpdated(changeGameCancelled, context)
    console.log("re-enter results p1 wins")
    await server.matchArchiveUpdated(changeGameReenter, context)
}


test_matchArchiveUpdated();