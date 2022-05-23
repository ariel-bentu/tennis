exports.testFunctions = functions = {
    config: () => ({
        admin: {
            email: "a@a.com",
        },
        notification: {
            serverkey: "nothing"
        },
        sms: {
            apikey: "xyz",
        },

    }),
    logger: {
        info: (...args) => console.log(...args),

    },
    region: (reg) => ({
        https: {
            onRequest: (app) => { },
            onCall: (func) => {
                // return nothing for now
            },
        },
        firestore: {
            document: (docPattern) => {
                switch (docPattern) {
                    case "matches-archive/{matchID}":
                        return {
                            onWrite: (func) => {
                                console.log("registered test: matchArchiveUpdated")
                                return func;
                            }
                        }
                    default:
                        return {
                            onCreate: func => {
                                console.log("register for test_onCreate missing", docPattern);
                                return func;
                            },
                            onWrite: (func) => {
                                console.log("registered for test_onWrite missing", docPattern)
                                return func;
                            }
                        }
                   
                }
            }
        },
        pubsub: {
            schedule: (pattern) => (
                {
                    timeZone: (name => ({
                        onRun: (func => {
                            //do nothing for now
                        })
                    }))
                }
            )
        }
    })
}