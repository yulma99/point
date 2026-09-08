'use strict';

// data.xlsx를 Google 스프레드시트로 변환한 뒤 주소에서 ID를 복사해 넣으세요.
const SPREADSHEET_ID = '여기에_스프레드시트_ID를_입력하세요';
const SHEET_NAME = 'Students';
const HEADERS = ['id', 'name', 'points', 'createdAt'];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || 'list';
    let students;
    if (action === 'list') students = getStudents();
    else if (action === 'add') students = addStudent(params.name);
    else if (action === 'changePoints') students = changePoints(params.id, params.delta);
    else if (action === 'delete') students = deleteStudent(params.id);
    else if (action === 'resetPoints') students = resetPoints();
    else throw new Error('지원하지 않는 요청입니다.');
    return jsonResponse({ success: true, students: students });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || '서버 오류가 발생했습니다.' });
  }
}

function getSheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('여기에_') === 0) throw new Error('Code.gs 상단에 스프레드시트 ID를 설정해 주세요.');
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Students 시트를 찾을 수 없습니다.');
  return sheet;
}

function getStudents() {
  const sheet = getSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    .filter((row) => row[0])
    .map((row) => ({ id: String(row[0]), name: String(row[1]), points: Math.max(0, Number(row[2]) || 0), createdAt: row[3] }));
}

function addStudent(rawName) {
  const name = String(rawName || '').trim();
  if (!name) throw new Error('학생 이름을 입력해 주세요.');
  const sheet = getSheet();
  if (getStudents().some((student) => student.name === name)) throw new Error('이미 등록된 이름입니다.');
  sheet.appendRow(['s_' + new Date().getTime(), name, 0, new Date().toISOString()]);
  return getStudents();
}

function changePoints(id, rawDelta) {
  const delta = Number(rawDelta);
  if (!id || !Number.isInteger(delta) || ![-1, 1].includes(delta)) throw new Error('잘못된 포인트 변경 요청입니다.');
  const sheet = getSheet();
  const students = getStudents();
  const index = students.findIndex((student) => student.id === String(id));
  if (index === -1) throw new Error('학생을 찾을 수 없습니다.');
  const nextPoints = Math.max(0, students[index].points + delta);
  sheet.getRange(index + 2, 3).setValue(nextPoints);
  return getStudents();
}

function deleteStudent(id) {
  const sheet = getSheet();
  const students = getStudents();
  const index = students.findIndex((student) => student.id === String(id));
  if (index === -1) throw new Error('학생을 찾을 수 없습니다.');
  sheet.deleteRow(index + 2);
  return getStudents();
}

function resetPoints() {
  const sheet = getSheet();
  const rowCount = sheet.getLastRow() - 1;
  if (rowCount > 0) sheet.getRange(2, 3, rowCount, 1).setValue(0);
  return getStudents();
}

function jsonResponse(data) {
  // ContentService 응답은 Apps Script 웹 앱의 Google 프록시를 통해 JSON으로 전달됩니다.
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
