const xlsx = require('xlsx');

const workbook = xlsx.readFile('c:/Users/Adr1an/Documents/projeto renda/future-funder-kit/posicao-2026-09-07-00-02-49.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log("Rows:");
for (let i = 0; i < Math.min(json.length, 20); i++) {
  console.log(json[i]);
}
