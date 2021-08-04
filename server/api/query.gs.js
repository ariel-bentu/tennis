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

  
  for (let i = 2; i <= sheet.getDataRange().getNumRows(); i++) {
    let row = {};
    for (let col = 1; col <= sheet.getDataRange().getNumColumns(); col++) {
      row[getHeaderColumnName(sheet, col)] = sheet.getRange(i, col).getValue();  
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
  let parStart = fullName.indexOf("(");
  if (parStart > 0) {
    return fullName.substr(0, parStart).trim();
  }
  return fullName.trim();
}

