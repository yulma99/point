'use strict';

// Apps Script 웹 앱 배포 후 받은 /exec URL을 큰따옴표 안에 붙여 넣으세요.
const APPS_SCRIPT_WEB_APP_URL = '여기에_Apps_Script_웹앱_URL을_입력하세요';

let students = [];
let isLoading = false;

const elements = {
  form: document.querySelector('#student-form'), nameInput: document.querySelector('#student-name'),
  list: document.querySelector('#student-list'), count: document.querySelector('#student-count'),
  total: document.querySelector('#total-points'), message: document.querySelector('#message'),
  loading: document.querySelector('#loading'), reset: document.querySelector('#reset-button')
};

function render() {
  elements.count.textContent = `${students.length}명`;
  elements.total.textContent = `${students.reduce((sum, student) => sum + student.points, 0)}점`;
  elements.loading.hidden = !isLoading;
  elements.reset.disabled = isLoading || students.length === 0;
  if (students.length === 0 && !isLoading) {
    elements.list.innerHTML = '<p class="empty">아직 등록한 학생이 없어요. 이름을 입력해 추가해 보세요!</p>';
    return;
  }
  elements.list.innerHTML = students.map((student) => `
    <article class="student-card">
      <div class="student-name">${escapeHtml(student.name)}</div>
      <div class="point-value">${student.points}점</div>
      <div class="card-actions">
        <button class="point-button" type="button" data-action="change" data-id="${student.id}" data-delta="1">+1점</button>
        <button class="point-button minus" type="button" data-action="change" data-id="${student.id}" data-delta="-1">-1점</button>
        <button class="delete-button" type="button" data-action="delete" data-id="${student.id}">학생 삭제</button>
      </div>
    </article>`).join('');
}

function escapeHtml(value) { const box = document.createElement('div'); box.textContent = value; return box.innerHTML; }
function showMessage(text, type = '') { elements.message.textContent = text; elements.message.className = `message ${type}`; }
function hasApiUrl() { return APPS_SCRIPT_WEB_APP_URL.startsWith('https://script.google.com/'); }

async function request(action, params = {}) {
  if (!hasApiUrl()) throw new Error('script.js 상단에 Apps Script 웹앱 URL을 설정해 주세요.');
  const url = new URL(APPS_SCRIPT_WEB_APP_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
  if (!response.ok) throw new Error('서버와 통신하지 못했어요. 배포 URL과 권한을 확인해 주세요.');
  const result = await response.json();
  if (!result.success) throw new Error(result.message || '요청을 처리하지 못했어요.');
  return result;
}

async function runRequest(work, successMessage = '') {
  isLoading = true; render();
  try { const result = await work(); students = result.students || students; if (successMessage) showMessage(successMessage, 'success'); }
  catch (error) { showMessage(error.message, 'error'); }
  finally { isLoading = false; render(); }
}

async function loadStudents() { await runRequest(() => request('list')); }

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = elements.nameInput.value.trim();
  if (!name) { showMessage('학생 이름을 입력해 주세요.', 'error'); elements.nameInput.focus(); return; }
  if (students.some((student) => student.name === name)) { showMessage('이미 등록된 이름이에요.', 'error'); return; }
  await runRequest(() => request('add', { name }), '학생을 추가했어요.');
  elements.nameInput.value = '';
});

elements.list.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  const { action, id, delta } = button.dataset;
  if (action === 'delete') {
    if (!confirm('정말 삭제할까요?')) return;
    await runRequest(() => request('delete', { id }), '학생을 삭제했어요.');
  } else {
    await runRequest(() => request('changePoints', { id, delta }), '포인트를 변경했어요.');
  }
});

elements.reset.addEventListener('click', async () => {
  if (!confirm('모든 학생의 포인트를 0점으로 초기화할까요? 학생 정보는 유지됩니다.')) return;
  await runRequest(() => request('resetPoints'), '모든 포인트를 0점으로 초기화했어요.');
});

render();
loadStudents();
