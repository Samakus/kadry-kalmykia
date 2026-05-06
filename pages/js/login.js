let forgotTimerInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const errorBlock = document.getElementById('authError');
    const forgotLink = document.getElementById('forgotLink');

    // Вход
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.needConfirmation) {
                    showConfirmationForm(email);
                    return;
                }
                errorBlock.textContent = data.error;
                errorBlock.classList.add('visible');
                return;
            }

            sessionStorage.setItem('currentUser', JSON.stringify(data.user));

            if (data.user.role === 'applicant') {
                window.location.href = 'lk/applicant.html';
            } else if (data.user.role === 'employer') {
                window.location.href = 'lk/employer.html';
            }
        } catch (err) {
            errorBlock.textContent = 'Ошибка соединения с сервером';
            errorBlock.classList.add('visible');
        }
    });

    // Забыли пароль
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotForm();
        });
    }
});

// Форма восстановления пароля
function showForgotForm() {
    // Очищаем старый таймер
    if (forgotTimerInterval) clearInterval(forgotTimerInterval);

    const card = document.querySelector('.auth-card');
    card.innerHTML = `
        <div class="auth-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
        <h1 class="auth-card__title">Восстановление пароля</h1>
        <p class="auth-card__subtitle">Введите email, на который зарегистрирован аккаунт</p>

        <div class="auth-error" id="forgotError"></div>
        <div class="auth-success" id="forgotSuccess"></div>

        <form id="forgotForm">
            <div class="input-group">
                <input type="email" id="forgotEmail" placeholder=" " required>
                <label for="forgotEmail">Email</label>
            </div>
            <button type="submit" class="btn btn--primary btn--full" id="forgotBtn">
                Отправить код
            </button>
            <p id="forgotTimer" style="text-align:center;color:var(--color-text-secondary);font-size:0.875rem;margin-top:8px;"></p>
        </form>

        <a href="login.html" class="auth-card__back">Вернуться ко входу</a>
    `;

    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('forgotEmail').value.trim();
        const errorBlock = document.getElementById('forgotError');
        const successBlock = document.getElementById('forgotSuccess');
        const submitBtn = document.getElementById('forgotBtn');
        const timerEl = document.getElementById('forgotTimer');

        errorBlock.style.display = 'none';
        successBlock.style.display = 'none';

        // Запускаем таймер
        let secondsLeft = 60;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Подождите ' + secondsLeft + ' сек.';
        timerEl.textContent = '';

        if (forgotTimerInterval) clearInterval(forgotTimerInterval);

        forgotTimerInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(forgotTimerInterval);
                submitBtn.textContent = 'Отправить код';
                submitBtn.disabled = false;
                timerEl.textContent = '';
            } else {
                submitBtn.textContent = 'Подождите ' + secondsLeft + ' сек.';
                timerEl.textContent = '';
            }
        }, 1000);

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                errorBlock.textContent = data.error;
                errorBlock.style.display = 'block';
                errorBlock.classList.add('visible');
                return;
            }

            successBlock.innerHTML = `
                <div class="auth-success__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2 style="font-size:1.25rem;font-weight:600;margin-bottom:8px;">Код отправлен!</h2>
                <p style="color:var(--color-text-secondary);font-size:0.9375rem;">
                    Проверьте почту <strong>${email}</strong>
                </p>
                <button class="btn btn--primary btn--full" style="margin-top: 16px;" id="goToResetBtn">
                    Ввести код
                </button>
            `;
            successBlock.style.display = 'block';

            document.getElementById('goToResetBtn').addEventListener('click', () => {
                showResetForm(email);
            });
        } catch (err) {
            errorBlock.textContent = 'Ошибка соединения с сервером';
            errorBlock.style.display = 'block';
            errorBlock.classList.add('visible');
        }
    });
}

// Форма сброса пароля
function showResetForm(email) {
    if (forgotTimerInterval) clearInterval(forgotTimerInterval);

    const card = document.querySelector('.auth-card');
    card.innerHTML = `
        <div class="auth-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
        <h1 class="auth-card__title">Новый пароль</h1>
        <p class="auth-card__subtitle">Введите код из письма и новый пароль</p>

        <div class="auth-error" id="resetError"></div>

        <form id="resetForm">
            <div class="input-group">
                <input type="text" id="resetCode" placeholder=" " required maxlength="6">
                <label for="resetCode">Код подтверждения</label>
            </div>
            <div class="input-group">
                <input type="password" id="resetPassword" placeholder=" " required minlength="6">
                <label for="resetPassword">Новый пароль (минимум 6 символов)</label>
            </div>
            <button type="submit" class="btn btn--primary btn--full">
                Сменить пароль
            </button>
        </form>

        <a href="login.html" class="auth-card__back">Вернуться ко входу</a>
    `;

    document.getElementById('resetForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = document.getElementById('resetCode').value.trim();
        const password = document.getElementById('resetPassword').value.trim();
        const errorBlock = document.getElementById('resetError');

        errorBlock.style.display = 'none';

        if (password.length < 6) {
            errorBlock.textContent = 'Пароль минимум 6 символов';
            errorBlock.style.display = 'block';
            errorBlock.classList.add('visible');
            return;
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, password })
            });

            const data = await response.json();

            if (!response.ok) {
                errorBlock.textContent = data.error;
                errorBlock.style.display = 'block';
                errorBlock.classList.add('visible');
                return;
            }

            card.innerHTML = `
                <div class="auth-success">
                    <div class="auth-success__icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h2 class="auth-success__title">Пароль изменён!</h2>
                    <p class="auth-success__text">Теперь вы можете войти с новым паролем.</p>
                    <a href="login.html" class="btn btn--primary btn--full" style="margin-top: 24px;">
                        Перейти ко входу
                    </a>
                </div>
            `;
        } catch (err) {
            errorBlock.textContent = 'Ошибка соединения с сервером';
            errorBlock.style.display = 'block';
            errorBlock.classList.add('visible');
        }
    });
}

// Подтверждение аккаунта
function showConfirmationForm(email) {
    const card = document.querySelector('.auth-card');
    card.innerHTML = `
        <div class="auth-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        </div>
        <h1 class="auth-card__title">Подтверждение аккаунта</h1>
        <p class="auth-card__subtitle">Введите код, отправленный на <strong>${email}</strong></p>

        <div class="auth-error" id="confirmError"></div>

        <form id="confirmForm">
            <div class="input-group">
                <input type="text" id="confirmCode" placeholder=" " required maxlength="6" autocomplete="off">
                <label for="confirmCode">Код из 6 цифр</label>
            </div>
            <button type="submit" class="btn btn--primary btn--full">Подтвердить</button>
        </form>

        <a href="login.html" class="auth-card__back">Вернуться ко входу</a>
    `;

    document.getElementById('confirmForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('confirmCode').value.trim();
        const errorBlock = document.getElementById('confirmError');

        try {
            const response = await fetch('/api/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (!response.ok) {
                errorBlock.textContent = data.error;
                errorBlock.style.display = 'block';
                errorBlock.classList.add('visible');
                return;
            }

            card.innerHTML = `
                <div class="auth-success">
                    <div class="auth-success__icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h2 class="auth-success__title">Аккаунт подтверждён!</h2>
                    <p class="auth-success__text">Теперь вы можете войти.</p>
                    <a href="login.html" class="btn btn--primary btn--full" style="margin-top: 24px;">Перейти ко входу</a>
                </div>
            `;
        } catch (err) {
            errorBlock.textContent = 'Ошибка соединения с сервером';
            errorBlock.style.display = 'block';
            errorBlock.classList.add('visible');
        }
    });
}