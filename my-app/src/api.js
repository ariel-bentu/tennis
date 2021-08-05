
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
    [{"id":1,"Day":"ראשון","Hour":"20:01","NumOfRegistered":1,"Registered":true},{"id":2,"Day":"שלישי","Hour":"20:01","NumOfRegistered":1},{"id":3,"Day":"חמישי","Hour":"20:00"},{"id":4,"Day":"שישי","Hour":"16:00"},{"id":5,"Day":"שבת","Hour":"20:00"}]);
}


export async function submitRegistration(reg) {
    return exec("submitRegistration", "Success", reg);
}

