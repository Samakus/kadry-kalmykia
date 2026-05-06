document.addEventListener('DOMContentLoaded', () => {
    loadOrganizations();
    setupRoleToggle();
    setupForm();
});

// Загрузка списка организаций в выпадающий список
async function loadOrganizations() {
    try {
        const response = await fetch('/api/organizations');
        const orgs = await response.json();

        const select = document.getElementById('regOrganization');
        orgs.forEach(org => {
            const option = document.createElement('option');
            option.value = org.id;
            option.textContent = `${org.short_name} (${org.city})`;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Ошибка загрузки организаций:', err);
    }
}

// Переключение видимости полей работодателя
function setupRoleToggle() {
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const employerFields = document.getElementById('employerFields');
    const orgSelect = document.getElementById('regOrganization');

    // Сразу снимаем required при загрузке (по умолчанию выбран соискатель)
    orgSelect.removeAttribute('required');
    employerFields.style.display = 'none';

    roleInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (input.value === 'employer') {
                employerFields.style.display = 'block';
                orgSelect.setAttribute('required', 'required');
                orgSelect.value = '';
            } else {
                employerFields.style.display = 'none';
                orgSelect.removeAttribute('required');
                orgSelect.value = '';
            }
        });
    });
}

// Отправка формы
function setupForm() {
    const form = document.getElementById('registerForm');
    const errorBlock = document.getElementById('authError');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBlock.classList.remove('visible');
        errorBlock.textContent = '';

        const roleEl = document.querySelector('input[name="role"]:checked');
        if (!roleEl) {
            errorBlock.textContent = 'Выберите роль';
            errorBlock.classList.add('visible');
            return;
        }
        const role = roleEl.value;

        const full_name = document.getElementById('regFullName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();

        if (!full_name) {
            errorBlock.textContent = 'Введите ФИО';
            errorBlock.classList.add('visible');
            return;
        }

        if (!phone || !/^\+?\d[\d\s()-]{6,}$/.test(phone)) {
            errorBlock.textContent = 'Введите корректный номер телефона (например, +79991234567)';
            errorBlock.classList.add('visible');
            return;
        }

        if (!email) {
            errorBlock.textContent = 'Введите email';
            errorBlock.classList.add('visible');
            return;
        }

        if (!password || password.length < 6) {
            errorBlock.textContent = 'Пароль должен содержать минимум 6 символов';
            errorBlock.classList.add('visible');
            return;
        }

        const body = { email, password, role, full_name, phone };

        if (role === 'employer') {
            body.organization_id = document.getElementById('regOrganization').value;
            body.position = document.getElementById('regPosition').value.trim() || 'Не указана';

            if (!body.organization_id) {
                errorBlock.textContent = 'Выберите учреждение';
                errorBlock.classList.add('visible');
                return;
            }
        }

        console.log('Отправляю на сервер:', body);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            console.log('Ответ сервера:', data);

            if (!response.ok) {
                errorBlock.textContent = data.error || 'Ошибка регистрации';
                errorBlock.classList.add('visible');
                return;
            }

            showSuccessScreen(email);
        } catch (err) {
            console.error('Ошибка:', err);
            errorBlock.textContent = 'Ошибка соединения с сервером. Проверьте, запущен ли сервер.';
            errorBlock.classList.add('visible');
        }
    });
}

// Экран успешной регистрации
function showSuccessScreen(email) {
    const card = document.querySelector('.auth-card');
    card.innerHTML = `
        <div class="auth-success">
            <div class="auth-success__icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <h2 class="auth-success__title">Регистрация прошла успешно!</h2>
            <p class="auth-success__text">
                Код подтверждения отправлен на почту <strong>${email}</strong>
            </p>
            <p class="auth-success__text" style="margin-top: 8px; color: var(--color-text-secondary);">
                Проверьте папку «Входящие» или «Спам»
            </p>
            <a href="login.html" class="btn btn--primary btn--full" style="margin-top: 24px;">
                Перейти ко входу
            </a>
        </div>
    `;
}