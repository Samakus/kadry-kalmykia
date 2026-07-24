// Загрузка данных для главной страницы
document.addEventListener('DOMContentLoaded', () => {
    loadVacancies();
    loadOrganizations();
    loadNews();
    loadGoals();
    loadEmploymentHelp();
    loadMentors();
    setupContactForm();
});

// Загрузка последних 4 вакансий
async function loadVacancies() {
    try {
        const [vacanciesResponse, orgsResponse] = await Promise.all([
            fetch('/api/vacancies'),
            fetch('/api/organizations')
        ]);
        const vacancies = await vacanciesResponse.json();
        const organizations = await orgsResponse.json();

        const activeVacancies = vacancies.filter(v => v.is_active);

        // Обновляем счетчик: сумма ставок
        const totalSlots = activeVacancies.reduce((sum, v) => sum + (v.slots || 1), 0);
        document.getElementById('vacanciesCount').textContent = totalSlots;

        // Выводим последние 4
        const latest = activeVacancies.slice(0, 4);
        const container = document.getElementById('latestVacancies');

        container.innerHTML = latest.map(v => {
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
                    <a href="pages/vacancies.html?id=${v.id}" class="vacancy-card__link">
                        Подробнее
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки вакансий:', error);
    }
}

// Загрузка организаций
async function loadOrganizations() {
    try {
        const response = await fetch('/api/organizations');
        const orgs = await response.json();

        const container = document.getElementById('organizationsList');

        const visibleOrgs = orgs.slice(0, 6);

        container.innerHTML = visibleOrgs.map(org => `
            <div class="org-card">
                <p class="org-card__type">${org.type}</p>
                <h3 class="org-card__name">${org.short_name}</h3>
                <p class="org-card__city">${org.city}</p>
            </div>
        `).join('');
        if (orgs.length > 6) {
            container.innerHTML += `
        <a href="pages/organizations.html" class="org-card org-card--all">
            <p class="org-card__type">+${orgs.length - 6}</p>
            <h3 class="org-card__name">Все организации</h3>
            <p class="org-card__city">Смотреть все</p>
        </a>
    `;
        }
    } catch (error) {
        console.error('Ошибка загрузки организаций:', error);
    }
}

// Загрузка новостей
async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const news = await response.json();

        const container = document.getElementById('latestNews');
        if (!container) return;

        const latest = news.slice(0, 3);

        container.innerHTML = latest.map(item => {
            const excerpt = Array.isArray(item.text) ? item.text[0] : (item.text || '');
            return `
                <div class="news-card">
                    ${item.image ? `<div class="news-card__image"><img src="${item.image}" alt="${item.title}"></div>` : ''}
                    <p class="news-card__date">${item.date}</p>
                    <h3 class="news-card__title">${item.title}</h3>
                    <p class="news-card__excerpt">${excerpt}</p>
                    <a href="pages/press.html?id=${item.id}" class="news-card__link">
                        Читать далее
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </a>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
    }
}

// Загрузка целей центра
async function loadGoals() {
    try {
        const container = document.getElementById('goalsList');
        if (!container) return;

        const response = await fetch('/api/goals');
        const goals = await response.json();

        container.innerHTML = goals.map((g, i) => `
            <div class="goal-card goal-card--${i}">
                <div class="goal-card__number">0${i + 1}</div>
                <h3 class="goal-card__title">${g.title}</h3>
                <p class="goal-card__desc">${g.description}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка загрузки целей:', error);
    }
}

// Помощь в трудоустройстве на главной
async function loadEmploymentHelp() {
    try {
        const container = document.getElementById('employmentHelpGrid');
        if (!container) return;

        const response = await fetch('/api/employment-help');
        const items = await response.json();

        if (!items.length) return;

        container.innerHTML = items.map((item, i) => {
            const colors = ['#4A90D9', '#27AE60', '#E67E22', '#9B59B6'];
            const c = item.color || colors[i % colors.length];
            const isExternal = item.link_url && item.link_url.startsWith('http');
            const href = isExternal ? item.link_url : 'pages/' + item.link_url;

            return `
            <div class="goal-card goal-card--${i}" style="cursor:pointer"
                 onclick="${isExternal ? `window.open('${href}','_blank')` : `location.href='${href}'`}">
                <div class="goal-card__number" style="background:${c};font-size:1.5rem">${item.icon}</div>
                <h3 class="goal-card__title">${item.title}</h3>
                <p class="goal-card__desc">${item.description}</p>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки помощи в трудоустройстве:', error);
    }
}

// Загрузка наставников на главную
async function loadMentors() {
    try {
        const container = document.getElementById('latestMentors');
        if (!container) return;

        const [mentRes, orgRes] = await Promise.all([
            fetch('/api/mentoring'),
            fetch('/api/organizations')
        ]);
        const mentoringOrgs = await mentRes.json();
        const orgs = await orgRes.json();

        if (!mentoringOrgs.length) return;

        const latest = mentoringOrgs.slice(0, 3);

        container.innerHTML = latest.map(m => {
            const org = orgs.find(o => o.id === m.organization_id);
            if (!org) return '';

            return `
            <div class="mentor-card">
                <div class="mentor-card__header">
                    <div class="mentor-card__avatar">${org.short_name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 3)}</div>
                    <div class="mentor-card__header-info">
                        <h3 class="mentor-card__name">${org.short_name}</h3>
                        <p class="mentor-card__specialty">${org.type}</p>
                    </div>
                </div>
                <div class="mentor-card__body">
                    <div class="mentor-card__stat">
                        <span class="mentor-card__stat-value">${org.city}</span>
                        <span class="mentor-card__stat-label">город</span>
                    </div>
                    <div class="mentor-card__stat">
                        <span class="mentor-card__stat-value">${org.head_name}</span>
                        <span class="mentor-card__stat-label">руководитель</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки наставников:', error);
    }
}

// Обработка формы обратной связи
function setupContactForm() {
    const form = document.getElementById('contactForm');
    const successMsg = document.getElementById('formSuccess');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contactName').value.trim();
        const phone = document.getElementById('contactPhone').value.trim();
        const email = document.getElementById('contactEmail').value.trim();

        if (name && phone && email) {
            try {
                await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email })
                });
                form.style.display = 'none';
                successMsg.style.display = 'block';
            } catch (err) {
                alert('Ошибка отправки');
            }
        }
    });
}

// Мобильное меню
document.addEventListener('DOMContentLoaded', () => {
    const burger = document.getElementById('burgerBtn');
    const nav = document.getElementById('mainNav');

    if (!burger || !nav) return;

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    // Закрытие по клику на ссылку
    nav.querySelectorAll('.nav__link, .nav__btn').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Закрытие по клику на фон (клик мимо меню)
    document.addEventListener('click', (e) => {
        if (nav.classList.contains('active') && !nav.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
            burger.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Выпадающее меню (dropdown)
    const dropdowns = nav.querySelectorAll('.nav__dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.nav__dropdown-toggle');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
    });

    // Закрытие dropdown при клике вне
    document.addEventListener('click', (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    });
});

// Обновление кнопки входа/ЛК
function updateAuthButton() {
    const btn = document.getElementById('authBtn');
    if (!btn) return;

    const user = sessionStorage.getItem('currentUser');
    const isRoot = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');

    if (user) {
        const parsed = JSON.parse(user);
        btn.textContent = 'Личный кабинет';
        btn.href = isRoot
            ? 'pages/lk/' + (parsed.role === 'employer' ? 'employer.html' : 'applicant.html')
            : 'lk/' + (parsed.role === 'employer' ? 'employer.html' : 'applicant.html');
    } else {
        btn.textContent = 'Войти';
        btn.href = isRoot ? 'pages/login.html' : 'login.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthButton();
});