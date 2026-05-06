let vacanciesData = [];
let organizationsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('searchVacancy').addEventListener('input', filterVacancies);
    document.getElementById('filterOrg').addEventListener('change', filterVacancies);
    document.getElementById('filterCity').addEventListener('change', filterVacancies);
});

async function loadData() {
    try {
        const [vRes, oRes] = await Promise.all([
            fetch('/api/vacancies'),
            fetch('/api/organizations')
        ]);
        vacanciesData = await vRes.json();
        organizationsData = await oRes.json();
        populateFilters();
        filterVacancies();
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        document.getElementById('vacanciesGrid').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ошибка загрузки данных</p>';
    }
}

function populateFilters() {
    const orgSelect = document.getElementById('filterOrg');
    organizationsData.forEach(org => {
        const opt = document.createElement('option');
        opt.value = org.id;
        opt.textContent = org.short_name;
        orgSelect.appendChild(opt);
    });

    const citySelect = document.getElementById('filterCity');
    const cities = [...new Set(organizationsData.map(o => o.city))];
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
    });
}

function filterVacancies() {
    const search = document.getElementById('searchVacancy').value.trim().toLowerCase();
    const orgId = document.getElementById('filterOrg').value;
    const city = document.getElementById('filterCity').value;

    let filtered = vacanciesData.filter(v => v.is_active);

    if (search) {
        filtered = filtered.filter(v =>
            v.title.toLowerCase().includes(search) ||
            v.specialization.toLowerCase().includes(search)
        );
    }
    if (orgId) {
        filtered = filtered.filter(v => v.organization_id === orgId);
    }
    if (city) {
        const orgsInCity = organizationsData
            .filter(o => o.city === city)
            .map(o => o.id);
        filtered = filtered.filter(v => orgsInCity.includes(v.organization_id));
    }

    renderVacancies(filtered);
}

function renderVacancies(vacancies) {
    const grid = document.getElementById('vacanciesGrid');

    if (vacancies.length === 0) {
        grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ничего не найдено</p>';
        return;
    }

    grid.innerHTML = vacancies.map(v => {
        const org = organizationsData.find(o => o.id === v.organization_id);
        return `
            <div class="vacancy-card">
                <h3 class="vacancy-card__title">${v.title}</h3>
                <p class="vacancy-card__org">${org ? org.short_name : 'Не указано'}</p>
                <p class="vacancy-card__salary">${v.salary}</p>
                <div class="vacancy-card__meta">
                    ${v.specialization ? `<span class="vacancy-card__tag">${v.specialization}</span>` : ''}
                    ${org ? `<span class="vacancy-card__tag">${org.city}</span>` : ''}
                </div>
                <p style="font-size:0.875rem;color:var(--color-text-secondary);">${v.requirements}</p>
                <p style="font-size:0.8125rem;color:var(--color-text-secondary);">
                    Контакты: ${v.contact_phone} • ${v.contact_email}
                </p>
            </div>
        `;
    }).join('');
}