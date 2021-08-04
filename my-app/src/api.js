
let google = window.google;


function exec(funcName, mockValue, ...args) {
    
    if (google === undefined)
        return mockValue;

    return new Promise((resolve, reject)=>{
    google.script.run
        .withSuccessHandler((ret)=>{
            resolve(ret);
        })
        .withFailureHandler((err)=>{
            reject(err)
        })[funcName](...args)
    });
}


export async function getUserInfo() {
    return exec("getUserInfo",
         {Name:'אריאל'});
}

export async function getPlannedGames() {
    return exec("getPlannedGames",
         [
             {id:1, Day: 'ראשון', Time:'20:01', Registered: 0},
             {id:2, Day: 'שלישי', Time:'20:01', Registered: 4},
             {id:3, Day: 'חמישי', Time:'20:01', Registered: 3}
        ]);
}

