const STATUS_ACTIVE = 2;
const COL_NAME = 0;
const COL_GAME_ID = 1;

function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate();
}

function getUserInfo(spreadsheet) {
  let email = Session.getActiveUser().getEmail()
  if (spreadsheet === undefined || spreadsheet === null)
    spreadsheet = getSpreadsheet();

  let users = spreadsheet.getSheetByName("users");
  let info = findRow(users, "Email", email);
  if (info.Status != STATUS_ACTIVE) {
    throw("NotAuthorized")
  }
  //console.log(info)
  return info;
}

function getPlannedGames() {
  let spreadsheet = getSpreadsheet();
  let info = getUserInfo(spreadsheet);
  if (info.Status == STATUS_ACTIVE) {
    let plannedGames = spreadsheet.getSheetByName("planned-games");
    let registrations = spreadsheet.getSheetByName("registrations");

    let games = getAll(plannedGames);
    let regs = registrations.getDataRange().getValues();

    for (let row = 1; row < regs.length; row++) {
      let game = games.find(g => g.id == regs[row][COL_GAME_ID]);
      if (!game)
        continue;
      let NumOfRegistered = game.NumOfRegistered || 0;
      NumOfRegistered++;
      game.NumOfRegistered = NumOfRegistered;
      if (regs[row][COL_NAME] == info.Name) {
        game.Registered = true;
      }
    }

    console.log(JSON.stringify(games));
    return games;
  }
}


function testSubmitRegistration() {
  let regs = [
    { id: 1, Registered: true },
    { id: 2, Registered: false }
  ];

  console.log("result", submitRegistration(regs));
}

function submitRegistration(registrations) {
  let spreadsheet = getSpreadsheet();
  let info = getUserInfo(spreadsheet);
  let regSheet = spreadsheet.getSheetByName("registrations")
  let colName = getColIndexByHeader(regSheet, "Name");
  let colGameID = getColIndexByHeader(regSheet, "GameID");

  if (info.Status == STATUS_ACTIVE) {
    let data = regSheet.getDataRange().getValues();

    registrations.forEach((reg, i) => {
      const match = (row) => row[colName - 1] === info.Name && row[colGameID - 1] === reg.id;

      if (reg.Registered) {
        // Verify registered
        if (!data.some(match)) {
          //not found
          regSheet.appendRow([info.Name, reg.id]);
        }
      } else {
        //verify line does not exist or delete it
        let rowIndex = data.findIndex(match);
        if (rowIndex > 0) {
          //found, delete it
          regSheet.deleteRow(rowIndex + 1);
        }
      }
    });
  }
  return "Success";
}
