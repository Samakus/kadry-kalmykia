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
            
            ${news.image ? `
                <div class="news-article__image">
                    <img src="${news.image}" alt="${news.title}" style="width:100%;max-width:720px;border-radius:12px;">
                </div>
            ` : ''}
            ${news.video ? `
                <div class="news-article__video">
                    <video controls style="width:100%;max-width:720px;border-radius:12px;">
                        <source src="${news.video}" type="video/mp4">
                        Ваш браузер не поддерживает видео.
                    </video>
                </div>
            ` : ''}

            ${news.image ? `
                <div class="news-article__image">
                    <img src="${news.image}" alt="${news.title}" style="width:100%;max-width:720px;border-radius:12px;">
                </div>
            ` : ''}

            <div class="news-article__text">
                ${renderTextBlocks(news.text)}
            </div>
        </article>
    `).join('');
}

function renderTextBlocks(textArray) {
    let html = '';
    let i = 0;

    while (i < textArray.length) {
        const line = textArray[i].trimEnd();
        const isListItem = line.endsWith(';');

        if (isListItem) {
            const items = [];
            while (i < textArray.length) {
                const item = textArray[i].trimEnd();
                if (!item.endsWith(';')) break;
                items.push(item.replace(/;$/, '').trim());
                i++;
            }
            html += '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
        } else {
            html += `<p>${textArray[i]}</p>`;
            i++;
        }
    }

    return html;
}