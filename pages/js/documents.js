document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();
    updateAuthButton();
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

async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        const docs = await response.json();
        renderDocuments(docs);
    } catch (err) {
        console.error('Ошибка загрузки документов:', err);
        document.getElementById('documentsList').innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Ошибка загрузки документов</p>';
    }
}

function renderDocuments(docs) {
    const container = document.getElementById('documentsList');

    if (docs.length === 0) {
        container.innerHTML =
            '<p style="text-align:center;padding:40px;color:var(--color-text-secondary);">Документы временно отсутствуют</p>';
        return;
    }

    container.innerHTML = docs.map(doc => {
        const isPDF = doc.format === 'pdf';
        const iconColor = isPDF ? '#DC2626' : '#2563EB';
        const bgColor = isPDF ? '#FEF2F2' : '#EFF6FF';
        const label = isPDF ? 'PDF' : 'DOCX';

        return `
            <div class="document-card">
                <div class="document-card__icon" style="background-color:${bgColor}; color:${iconColor};">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                </div>
                <div class="document-card__info">
                    <div class="document-card__title">${doc.title}</div>
                    <div class="document-card__meta">${doc.date} • ${doc.type} • <span style="color:${iconColor};font-weight:600;">${label}</span></div>
                </div>
                <div class="document-card__download">
                    <a href="${doc.file}" target="_blank" class="btn btn--outline">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Скачать
                    </a>
                </div>
            </div>
        `;
    }).join('');
}