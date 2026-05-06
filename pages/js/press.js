document.addEventListener('DOMContentLoaded', () => {
    updateAuthButton();
    loadNews();
});

function updateAuthButton() {
    const btn = document.getElementById('authBtn');
    if (!btn) return;
    const user = sessionStorage.getItem('currentUser');
    if (user) {
        const parsed = JSON.parse(user);
        btn.textContent = 'Личный кабинет';
        btn.href = parsed.role === 'employer' ? 'lk/employer.html' : 'lk/applicant.html';
    } else {
        btn.textContent = 'Войти';
        btn.href = 'login.html';
    }
}

async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const news = await response.json();
        renderNews(news);
    } catch (err) {
        console.error('Ошибка загрузки новостей:', err);
        document.getElementById('newsList').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ошибка загрузки новостей</p>';
    }
}

function renderNews(newsList) {
    const container = document.getElementById('newsList');

    if (newsList.length === 0) {
        container.innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Новостей пока нет</p>';
        return;
    }

    container.innerHTML = newsList.map(news => `
        <article class="news-article">
            <h2 class="news-article__title">${news.title}</h2>
            <p class="news-article__date">${news.date}</p>
            
            ${news.video ? `
                <div class="news-article__video">
                    <video controls style="width:100%;max-width:720px;border-radius:12px;">
                        <source src="${news.video}" type="video/mp4">
                        Ваш браузер не поддерживает видео.
                    </video>
                </div>
            ` : ''}

            <div class="news-article__text">
                ${news.text.map(p => `<p>${p}</p>`).join('')}
            </div>
        </article>
    `).join('');
}