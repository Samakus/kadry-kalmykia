let orgsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadOrgs();
    document.getElementById('filterType').addEventListener('change', filterOrgs);
    document.getElementById('filterCity').addEventListener('change', filterOrgs);
});

async function loadOrgs() {
    try {
        const res = await fetch('/api/organizations');
        orgsData = await res.json();
        populateFilters();
        filterOrgs();
    } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        document.getElementById('orgsGrid').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ошибка загрузки данных</p>';
    }
}

function populateFilters() {
    const typeSelect = document.getElementById('filterType');
    const types = [...new Set(orgsData.map(o => o.type))];
    types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        typeSelect.appendChild(opt);
    });

    const citySelect = document.getElementById('filterCity');
    const cities = [...new Set(orgsData.map(o => o.city))];
    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
    });
}

function filterOrgs() {
    const type = document.getElementById('filterType').value;
    const city = document.getElementById('filterCity').value;

    let filtered = orgsData;

    if (type) {
        filtered = filtered.filter(o => o.type === type);
    }
    if (city) {
        filtered = filtered.filter(o => o.city === city);
    }

    renderOrgs(filtered);
}

function renderOrgs(orgs) {
    const grid = document.getElementById('orgsGrid');

    if (orgs.length === 0) {
        grid.innerHTML = '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ничего не найдено</p>';
        return;
    }

    grid.innerHTML = orgs.map(org => `
        <div class="org-full-card">
            <p class="org-full-card__type">${org.type}</p>
            <h2 class="org-full-card__name">${org.full_name}</h2>
            <p class="org-full-card__info">${org.address}</p>
            <p class="org-full-card__info">${org.phone}</p>
            <p class="org-full-card__info">${org.email}</p>
            <div class="org-full-card__head">
                <strong>${org.head_position}</strong>
                ${org.head_name}
            </div>
        </div>
    `).join('');
}