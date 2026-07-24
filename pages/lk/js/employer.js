document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserInfo();
    setupTabs();
    setupModal();
    loadMyVacancies();
    loadAllResumes();
    loadResponses();
    setupResumeSearch();
    setupLogout();
});

let currentUser = null;
let myVacancies = [];
let allResumes = [];
let allResumesWithUsers = [];
let organizations = [];
let allUsers = [];

function checkAuth() {
    const user = sessionStorage.getItem('currentUser');
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = JSON.parse(user);
    if (currentUser.role !== 'employer') {
        window.location.href = 'applicant.html';
    }
}

function loadUserInfo() {
    document.getElementById('userNameDisplay').textContent = currentUser.full_name;
    document.getElementById('userGreeting').textContent = `Добро пожаловать, ${currentUser.full_name}!`;
}

function setupTabs() {
    document.querySelectorAll('.lk__tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lk__tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.lk__panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panelId = tab.dataset.tab;
            document.getElementById(`panel-${panelId}`).classList.add('active');

            // Автообновление при переключении на вкладку
            if (panelId === 'responses') loadResponses();
            if (panelId === 'vacancies') loadMyVacancies();
            if (panelId === 'resumes') loadAllResumes();
        });
    });
}

function setupModal() {
    document.getElementById('createVacancyBtn').addEventListener('click', () => openVacancyModal());
    document.getElementById('modalOverlay').addEventListener('click', closeVacancyModal);
    document.getElementById('modalClose').addEventListener('click', closeVacancyModal);
    document.getElementById('modalCancel').addEventListener('click', closeVacancyModal);
    document.getElementById('vacancyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveVacancy();
    });
}

function openVacancyModal(vacancy = null) {
    document.getElementById('vacancyForm').reset();
    document.getElementById('vacancyId').value = '';
    document.getElementById('modalTitle').textContent = vacancy ? 'Редактировать вакансию' : 'Новая вакансия';

    if (vacancy) {
        document.getElementById('vacancyId').value = vacancy.id;
        document.getElementById('vacancyTitle').value = vacancy.title;
        document.getElementById('vacancySpecialization').value = vacancy.specialization;
        document.getElementById('vacancySalary').value = vacancy.salary;
        document.getElementById('vacancySlots').value = vacancy.slots || 1;
        document.getElementById('vacancyConditions').value = vacancy.conditions;
        document.getElementById('vacancyRequirements').value = vacancy.requirements;
        document.getElementById('vacancyPhone').value = vacancy.contact_phone;
        document.getElementById('vacancyEmail').value = vacancy.contact_email;
    } else {
        document.getElementById('vacancyPhone').value = currentUser.phone || '';
        document.getElementById('vacancyEmail').value = currentUser.email || '';
    }

    document.getElementById('vacancyModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeVacancyModal() {
    document.getElementById('vacancyModal').classList.remove('active');
    document.body.style.overflow = '';
}

function saveVacancy() {
    const id = document.getElementById('vacancyId').value;
    const slotsValue = parseInt(document.getElementById('vacancySlots').value, 10) || 1;
    const vacancy = {
        id: id || 'vac_' + Date.now(),
        organization_id: currentUser.organization_id,
        title: document.getElementById('vacancyTitle').value.trim(),
        specialization: document.getElementById('vacancySpecialization').value.trim(),
        salary: document.getElementById('vacancySalary').value.trim(),
        slots: slotsValue < 1 ? 1 : slotsValue,
        conditions: document.getElementById('vacancyConditions').value.trim(),
        requirements: document.getElementById('vacancyRequirements').value.trim(),
        contact_phone: document.getElementById('vacancyPhone').value.trim(),
        contact_email: document.getElementById('vacancyEmail').value.trim(),
        is_active: id ? (myVacancies.find(v => v.id === id)?.is_active ?? true) : true,
        created_at: id ? (myVacancies.find(v => v.id === id)?.created_at || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        created_by_user_id: currentUser.id
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/vacancies/${id}` : '/api/vacancies';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vacancy)
    })
        .then(r => r.json())
        .then(saved => {
            if (id) {
                const idx = myVacancies.findIndex(v => v.id === id);
                if (idx !== -1) myVacancies[idx] = saved;
            } else {
                myVacancies.push(saved);
            }
            closeVacancyModal();
            renderMyVacancies();
        })
        .catch(err => {
            console.error(err);
            alert('Ошибка соединения с сервером');
        });
}

async function loadMyVacancies() {
    try {
        const res = await fetch(`/api/vacancies/my?user_id=${currentUser.id}`);
        myVacancies = res.ok ? await res.json() : [];
    } catch (err) {
        myVacancies = [];
    }
    renderMyVacancies();
}

function renderMyVacancies() {
    const container = document.getElementById('myVacanciesList');
    const empty = document.getElementById('vacanciesEmpty');

    if (myVacancies.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.innerHTML = myVacancies.map(v => `
        <div class="resume-card">
            <div class="resume-card__info">
                <div class="resume-card__specialization">${v.title}</div>
                <div class="resume-card__meta">${v.specialization} • ${v.salary} • ${v.slots || 1} став${(v.slots || 1) === 1 ? 'ка' : (v.slots || 1) < 5 ? 'ки' : 'ок'}</div>
                <div class="resume-card__meta">${v.conditions}</div>
                <span class="resume-card__status ${v.is_active ? 'resume-card__status--public' : 'resume-card__status--hidden'}">
                    ${v.is_active ? 'Активна' : 'Снята с публикации'}
                </span>
            </div>
            <div class="resume-card__actions">
                <button class="btn btn--outline btn-edit" data-id="${v.id}">Редактировать</button>
                <button class="btn btn--outline btn-toggle" data-id="${v.id}">${v.is_active ? 'Снять' : 'Опубликовать'}</button>
                <button class="btn btn--outline btn-delete" data-id="${v.id}">Удалить</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const vac = myVacancies.find(v => v.id === btn.dataset.id);
            if (vac) openVacancyModal(vac);
        });
    });

    container.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
            const vac = myVacancies.find(v => v.id === btn.dataset.id);
            if (vac) {
                vac.is_active = !vac.is_active;
                await fetch(`/api/vacancies/${vac.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: vac.is_active })
                });
                renderMyVacancies();
            }
        });
    });

    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить эту вакансию?')) {
                await fetch(`/api/vacancies/${btn.dataset.id}`, { method: 'DELETE' });
                myVacancies = myVacancies.filter(v => v.id !== btn.dataset.id);
                renderMyVacancies();
            }
        });
    });
}

async function loadAllResumes() {
    try {
        const [resRes, usersRes] = await Promise.all([
            fetch('/api/resumes'),
            fetch('/api/users')
        ]);
        allResumes = await resRes.json();
        allUsers = await usersRes.json();

        allResumesWithUsers = allResumes.map(r => ({
            ...r,
            user: allUsers.find(u => u.id === r.user_id) || null
        }));

        renderAllResumes(allResumesWithUsers);
    } catch (err) {
        console.error(err);
        document.getElementById('allResumesList').innerHTML = '<p>Ошибка загрузки</p>';
    }
}

function renderAllResumes(resumes) {
    const container = document.getElementById('allResumesList');
    const empty = document.getElementById('resumesEmpty');
    const publicResumes = resumes.filter(r => r.is_public !== false);

    if (publicResumes.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.innerHTML = publicResumes.map(r => {
        const user = r.user;
        return `
            <div class="resume-card">
                <div class="resume-card__info">
                    <div class="resume-card__specialization">${r.specialization}</div>
                    ${user ? `<div class="resume-card__meta"><strong>${user.full_name}</strong></div>` : ''}
                    <div class="resume-card__meta">${r.education} • ${r.experience}</div>
                    ${r.certificates?.length ? `<div class="resume-card__meta">Сертификаты: ${r.certificates.join(', ')}</div>` : ''}
                    ${user ? `
                        <div class="resume-card__meta" style="margin-top: 10px;">
                            <a href="tel:${user.phone}" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">
                                📞 ${user.phone}
                            </a>
                        </div>
                        <div class="resume-card__meta">
                            <a href="mailto:${user.email}" style="color: var(--color-primary); text-decoration: none;">
                                ✉️ ${user.email}
                            </a>
                        </div>
                    ` : `<div class="resume-card__meta" style="margin-top: 10px; color: var(--color-text-secondary);">Контакты скрыты</div>`}
                </div>
                ${user ? `
                    <div class="resume-card__actions">
                        <a href="tel:${user.phone}" class="btn btn--primary">Позвонить</a>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupResumeSearch() {
    document.getElementById('resumeSearch').addEventListener('input', () => {
        const query = document.getElementById('resumeSearch').value.trim().toLowerCase();
        if (!query) {
            renderAllResumes(allResumesWithUsers);
            return;
        }
        const filtered = allResumesWithUsers.filter(r =>
            r.specialization.toLowerCase().includes(query) ||
            r.education.toLowerCase().includes(query)
        );
        renderAllResumes(filtered);
    });
}

async function loadResponses() {
    try {
        const res = await fetch(`/api/responses/employer?organization_id=${currentUser.organization_id}`);
        const data = res.ok ? await res.json() : [];
        renderEmployerResponses(data);
    } catch (err) {
        console.error(err);
    }
}

async function renderEmployerResponses(responses) {
    const container = document.getElementById('employerResponsesList');
    const empty = document.getElementById('employerResponsesEmpty');

    if (!container) return;

    if (responses.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    // Загружаем пользователей если ещё не загружены
    if (allUsers.length === 0) {
        try {
            const usersRes = await fetch('/api/users');
            allUsers = await usersRes.json();
        } catch (err) {
            console.error(err);
        }
    }

    container.innerHTML = responses.map(r => {
        const user = allUsers.find(u => u.id === r.user_id);
        return `
            <div class="resume-card">
                <div class="resume-card__info">
                    <div class="resume-card__specialization">${r.vacancy_title}</div>
                    ${user ? `
                        <div class="resume-card__meta"><strong>Соискатель:</strong> ${user.full_name}</div>
                        <div class="resume-card__meta" style="margin-top: 6px;">
                            <a href="tel:${user.phone}" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">
                                📞 ${user.phone}
                            </a>
                        </div>
                        <div class="resume-card__meta">
                            <a href="mailto:${user.email}" style="color: var(--color-primary); text-decoration: none;">
                                ✉️ ${user.email}
                            </a>
                        </div>
                    ` : ''}
                    <div class="resume-card__meta" style="margin-top: 6px;">Отклик: ${r.created_at}</div>
                </div>
                ${user ? `
                    <div class="resume-card__actions">
                        <a href="tel:${user.phone}" class="btn btn--primary">Позвонить</a>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupLogout() {
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('currentUser');
        window.location.href = '../../index.html';
    });
}