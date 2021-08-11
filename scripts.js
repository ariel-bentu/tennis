
let names=[
"Dalton Ross", "Granville Solis","Oliver Mueller", "Sean Manning","Brady Espinoza", "Alec Boyle",
"Gavin Drake","Brooks Montoya","Geraldo Holloway","Vincent Bender","Isreal Morales", "Sebastian Clay",
"Joe Howe","Chris Aguirre","Curtis Sweeney","Theron Vargas","Erik Stanton","Dudley Burke","Nathaniel Crawford",
"Francisco Ellison","Martin Terrell","Lorenzo Maynard","Herman Reid","Tony Hale","Myles Mcgee"
];

let users = [];
for (let i=1;i<=25;i++) {
    users.push(
        {  
            email: i+"@gmail.com", 
            displayName: names[i-1] , 
            rank:Math.floor(Math.random() * 100) + 1
        }
    )
}

//console.log(JSON.stringify(users, undefined, 4));

//Registrations

let regs = [];
for (let i=0;i<25;i++) {
    //random user
    let user = users[ i ]
    let game = Math.floor(Math.random() * 5) + 1
    regs.push(
        {  
            email: user.email,
            GameID: game,
            _order: i+1
        }
    )
}
console.log(JSON.stringify(regs, undefined, 4));

