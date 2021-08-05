

function getSpreadsheet() {
  var files = DriveApp.getFilesByName("main");
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
}

function getSheet(spreadsheet, name) {
  return spreadsheet.getSheetByName(name);
}

function findRow(sheet, searchInColName, searchValue ) {
   let returnVal = null;

  let searchInIndex = getColIndexByHeader(sheet, searchInColName);
  if (searchInIndex < 0)
    return returnVal;


  for (let i = 2; i <= sheet.getDataRange().getNumRows(); i++) {
    if (sheet.getRange(i, searchInIndex).getValue() == searchValue) {
      //found
      returnVal = {};
      for (let col = 1; col <= sheet.getDataRange().getNumColumns(); col++) {
        returnVal[getHeaderColumnName(sheet, col)] = sheet.getRange(i, col).getValue();  
      }
      break;
    }
  }
  return returnVal;
}

function getAll(sheet) {
   let results = [];
   let colNames = {}
   let data = sheet.getDataRange().getValues();

   //create map of fields names from header line
   data[0].forEach((name, index)=> {
     colNames[""+index] = trimName(name);
   });
  
  for (let i = 1; i < data.length; i++) {
    let row = {};
    for (let col = 0; col < data[i].length; col++) {
      row[colNames[""+col]] = data[i][col];
    }
    results.push(row);
  }
  
  return results;
}

function vLookup(sheet, searchInColName, searchValue, returnColName) {
   let returnVal = [];

  let searchInIndex = getColIndexByHeader(sheet, searchInColName);
  if (searchInIndex < 0)
    return returnVal;

  let returnColIndex = getColIndexByHeader(sheet, returnColName);
  if (returnColIndex < 0)
    return returnVal;
  for (let i = 2; i <= sheet.getDataRange().getNumRows(); i++) {
    if (sheet.getRange(i, searchInIndex).getValue() == searchValue) {
      //found another row
      returnVal.push(sheet.getRange(i, returnColIndex).getValue());  
    
    }
  }
  return returnVal;
}

function mapColNames(sheet, obj) {
  let ret = {}
  obj.keys().forEach(key=>ret[key] = getColIndexByHeader(sheet, key));
  return ret;
}
  

function getColIndexByHeader(sheet, name) {
  
  for (let i = 1; i <= sheet.getDataRange().getNumColumns(); i++) {
    if (getHeaderColumnName(sheet, i) == name) {
      return i;
    }
  }
  return -1;
}

function getHeaderColumnName(sheet, index) {
  let fullName = sheet.getRange(1, index).getValue();
  return trimName(fullName);
  
}

function trimName(name) {
  if (!name) 
    return "";

  let parStart = name.indexOf("(");
  if (parStart > 0) {
    return name.substr(0, parStart).trim();
  }
  return name.trim();
}

function logTime(desc) {
  var start = new Date();
  var startTime = Number(start.getTime()).toFixed(0);
  console.log(startTime, desc);
}

