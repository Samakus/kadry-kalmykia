document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    setupTabs();
    setupModal();
    loadResumes();
    loadVacancies();
    loadResponses();
    setupLogout();
});

let currentUser = null;
let myResumes = [];
let allVacancies = [];
let organizations = [];

// Проверка авторизации
function checkAuth() {
    const user = sessionStorage.getItem('currentUser');
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = JSON.parse(user);
    if (currentUser.role !== 'applicant') {
        window.location.href = 'employer.html';
    }
}

// Отображение имени пользователя
function loadUserInfo() {
    document.getElementById('userNameDisplay').textContent = currentUser.full_name;
    document.getElementById('userGreeting').textContent = `Добро пожаловать, ${currentUser.full_name}!`;
}

// Табы
function setupTabs() {
    const tabs = document.querySelectorAll('.lk__tab');
    const panels = document.querySelectorAll('.lk__panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = tab.dataset.tab;
            document.getElementById(`panel-${panelId}`).classList.add('active');

            if (panelId === 'responses') loadResponses();
            if (panelId === 'vacancies') loadVacancies();
        });
    });
}

// Модальное окно
function setupModal() {
    const modal = document.getElementById('resumeModal');
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');
    const createBtn = document.getElementById('createResumeBtn');
    const form = document.getElementById('resumeForm');

    createBtn.addEventListener('click', () => openModal());
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveResume();
    });
}

function openModal(resume = null) {
    const modal = document.getElementById('resumeModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('resumeForm');

    form.reset();
    document.getElementById('resumeId').value = '';

    if (resume) {
        title.textContent = 'Редактировать резюме';
        document.getElementById('resumeId').value = resume.id;
        document.getElementById('resumeSpecialization').value = resume.specialization;
        document.getElementById('resumeEducation').value = resume.education;
        document.getElementById('resumeExperience').value = resume.experience;
        document.getElementById('resumeCertificates').value = resume.certificates ? resume.certificates.join(', ') : '';
        document.getElementById('resumeIsPublic').checked = resume.is_public;
    } else {
        title.textContent = 'Новое резюме';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('resumeModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Сохранение резюме
function saveResume() {
    const id = document.getElementById('resumeId').value;
    const resume = {
        id: id || 'res_' + Date.now(),
        user_id: currentUser.id,
        specialization: document.getElementById('resumeSpecialization').value.trim(),
        education: document.getElementById('resumeEducation').value.trim(),
        experience: document.getElementById('resumeExperience').value.trim(),
        certificates: document.getElementById('resumeCertificates').value
            .split(',')
            .map(s => s.trim())
            .filter(s => s),
        is_public: document.getElementById('resumeIsPublic').checked,
        created_at: new Date().toISOString().split('T')[0]
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/resumes/${id}` : '/api/resumes';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resume)
    })
        .then(response => response.json())
        .then(savedResume => {
            if (id) {
                const index = myResumes.findIndex(r => r.id === id);
                if (index !== -1) myResumes[index] = savedResume;
            } else {
                myResumes.push(savedResume);
            }
            closeModal();
            renderResumes();
        })
        .catch(err => {
            console.error('Ошибка сохранения:', err);
            alert('Ошибка соединения с сервером');
        });
}

// Загрузка резюме с сервера
async function loadResumes() {
    try {
        const response = await fetch(`/api/resumes/my?user_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        myResumes = await response.json();
    } catch (err) {
        console.error('Ошибка загрузки резюме:', err);
        myResumes = [];
    }
    renderResumes();
}

// Отрисовка резюме
function renderResumes() {
    const container = document.getElementById('resumesList');
    const empty = document.getElementById('resumesEmpty');

    if (myResumes.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.innerHTML = myResumes.map(resume => `
        <div class="resume-card">
            <div class="resume-card__info">
                <div class="resume-card__specialization">${resume.specialization}</div>
                <div class="resume-card__meta">${resume.education} • ${resume.experience}</div>
                ${resume.certificates?.length ? `<div class="resume-card__meta">Сертификаты: ${resume.certificates.join(', ')}</div>` : ''}
                <span class="resume-card__status ${resume.is_public ? 'resume-card__status--public' : 'resume-card__status--hidden'}">
                    ${resume.is_public ? 'Опубликовано' : 'Скрыто'}
                </span>
            </div>
            <div class="resume-card__actions">
                <button class="btn btn--outline btn-edit" data-id="${resume.id}">Редактировать</button>
                <button class="btn btn--outline btn-toggle" data-id="${resume.id}">
                    ${resume.is_public ? 'Скрыть' : 'Опубликовать'}
                </button>
                <button class="btn btn--outline btn-delete" data-id="${resume.id}">Удалить</button>
            </div>
        </div>
    `).join('');

    // Обработчики кнопок
    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const resume = myResumes.find(r => r.id === btn.dataset.id);
            if (resume) openModal(resume);
        });
    });

    container.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const resume = myResumes.find(r => r.id === btn.dataset.id);
            if (resume) {
                resume.is_public = !resume.is_public;
                await fetch(`/api/resumes/${resume.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_public: resume.is_public })
                });
                renderResumes();
            }
        });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить это резюме?')) {
                await fetch(`/api/resumes/${btn.dataset.id}`, {
                    method: 'DELETE'
                });
                myResumes = myResumes.filter(r => r.id !== btn.dataset.id);
                renderResumes();
            }
        });
    });
}

// Загрузка вакансий для вкладки
async function loadVacancies() {
    try {
        const [vacRes, orgRes] = await Promise.all([
            fetch('/api/vacancies'),
            fetch('/api/organizations')
        ]);
        allVacancies = await vacRes.json();
        organizations = await orgRes.json();
        renderVacancies();
    } catch (err) {
        console.error('Ошибка загрузки вакансий:', err);
    }
}

function renderVacancies() {
    const container = document.getElementById('lkVacanciesList');
    const active = allVacancies.filter(v => v.is_active);

    container.innerHTML = active.map(v => {
        const org = organizations.find(o => o.id === v.organization_id);
        return `
            <div class="vacancy-card">
                <h3 class="vacancy-card__title">${v.title}</h3>
                <p class="vacancy-card__org">${org ? org.short_name : 'Не указано'}</p>
                <p class="vacancy-card__salary">${v.salary}</p>
                <div class="vacancy-card__meta">
                    ${v.specialization ? `<span class="vacancy-card__tag">${v.specialization}</span>` : ''}
                    ${org ? `<span class="vacancy-card__tag">${org.city}</span>` : ''}
                    <span class="vacancy-card__tag">${v.slots || 1} став${(v.slots || 1) === 1 ? 'ка' : (v.slots || 1) < 5 ? 'ки' : 'ок'}</span>
                </div>
                <button class="btn btn--primary respond-btn" data-vacancy-id="${v.id}">
                    Откликнуться
                </button>
            </div>
        `;
    }).join('');

    // Обработчики откликов
    container.querySelectorAll('.respond-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const vacancy = allVacancies.find(v => v.id === btn.dataset.vacancyId);
            if (!vacancy) return;

            // Проверяем, есть ли у соискателя резюме
            if (myResumes.length === 0) {
                alert('Сначала создайте резюме');
                return;
            }

            const response = {
                user_id: currentUser.id,
                vacancy_id: vacancy.id,
                organization_id: vacancy.organization_id,
                resume_id: myResumes[0].id,
                vacancy_title: vacancy.title
            };

            try {
                await fetch('/api/responses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(response)
                });
                btn.textContent = 'Отклик отправлен ✓';
                btn.disabled = true;
                btn.style.opacity = '0.6';
                loadResponses();
            } catch (err) {
                alert('Ошибка отправки отклика');
            }
        });
    });
}

async function loadResponses() {
    try {
        const response = await fetch(`/api/responses/my?user_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Ошибка');
        const myResponses = await response.json();
        renderResponses(myResponses);
    } catch (err) {
        console.error('Ошибка загрузки откликов:', err);
    }
}

function renderResponses(responses) {
    const container = document.getElementById('myResponsesList');
    const empty = document.getElementById('responsesEmpty');

    if (!container) return;

    if (responses.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.innerHTML = responses.map(r => `
        <div class="resume-card">
            <div class="resume-card__info">
                <div class="resume-card__specialization">${r.vacancy_title}</div>
                <div class="resume-card__meta">Отклик отправлен: ${r.created_at}</div>
            </div>
        </div>
    `).join('');
}

// Выход
function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = '../../index.html';
    });
}