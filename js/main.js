// Загрузка данных для главной страницы
document.addEventListener('DOMContentLoaded', () => {
    loadVacancies();
    loadOrganizations();
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

        // Обновляем счетчик
        document.getElementById('vacanciesCount').textContent = activeVacancies.length;

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