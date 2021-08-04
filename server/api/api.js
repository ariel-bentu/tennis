const STATUS_ACTIVE = 2;

function doGet() 
{
	return HtmlService
      .createTemplateFromFile('index')
      .evaluate();
}

function getUserInfo()
{
  let email = Session.getActiveUser().getEmail()
  let users = getSheet("users");
	let info = findRow(users, "Email", email);
  if (info.Status != STATUS_ACTIVE) {
    return null
  }
  return info;
}

function getPlannedGames() {
  let info = getUserInfo();
  if (info.Status == STATUS_ACTIVE) {
    let plannedGames = getSheet("planned-games");
    let registrations = getSheet("registrations");
    let games = getAll(plannedGames);

    //extract the already registered games for this user
    let registered = vLookup(registrations, "Name", info.Name, "GameID");
    
    registered.forEach(r=>{
      let index = games.findIndex(game => game.id === r);
      if (index >= 0) {
        games[index].Registered = true;
      }
    });

    //calculate the number of already registered
    games.forEach((game, index)=>{
      let regForGame = vLookup(registrations, "GameID", game.id, "GameID");
      games[index].NumOfRegistered = regForGame.length
    });

    //console.log(JSON.stringify(games));
    return games;
  }
}

function getSheet(name) {
  var files = DriveApp.getFilesByName("main");
  if (files.hasNext()) {
    var spreadsheet = SpreadsheetApp.open(files.next());
    return spreadsheet = spreadsheet.getSheetByName(name);
  }
}

function isActiveUser() {
  let info = getUserInfo();
  let isActive = info.Status == STATUS_ACTIVE;
  return isActive;
}