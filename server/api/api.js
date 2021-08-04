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
  if (isActiveUser()) {
    let plannedGames = getSheet("planned-games");
    return getAll(plannedGames);
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