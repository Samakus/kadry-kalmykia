require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==================== ЗАЩИТА ====================

// Запрет прямого доступа к JSON-файлам
app.use('/data', (req, res) => {
    res.status(403).send('Доступ запрещён');
});

// Общий лимит запросов к API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 200,
    message: { error: 'Слишком много запросов. Попробуйте позже.' }
});
app.use('/api/', apiLimiter);

// Строгий лимит на вход
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Слишком много попыток входа. Подождите 15 минут.' }
});
app.use('/api/login', loginLimiter);

// Строгий лимит на регистрацию
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 5,
    message: { error: 'Слишком много регистраций. Попробуйте позже.' }
});
app.use('/api/register', registerLimiter);

// Раздача статики
app.use(express.static(__dirname));

// ==================== ПОЧТА ====================

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==================== УТИЛИТЫ ====================

function readJSON(filename) {
    const filePath = path.join(__dirname, 'data', filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

function writeJSON(filename, data) {
    const filePath = path.join(__dirname, 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Защита от XSS: экранирование HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Валидация email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Валидация телефона
function isValidPhone(phone) {
    return /^\+?\d[\d\s()-]{6,}$/.test(phone);
}

// ==================== АВТОРИЗАЦИЯ ====================

// Вход
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.confirmed === false) {
        return res.status(403).json({
            error: 'Аккаунт не подтверждён. Проверьте почту.',
            needConfirmation: true,
            email: user.email
        });
    }

    const { password: _, confirmation_code: __, confirmed: ___, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
});

// Регистрация
app.post('/api/register', (req, res) => {
    let { email, password, role, full_name, phone, organization_id, position } = req.body;

    // Валидация
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Введите корректный email' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }
    if (!full_name || full_name.trim().length < 3) {
        return res.status(400).json({ error: 'Введите полное ФИО (минимум 3 символа)' });
    }
    if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({ error: 'Введите корректный номер телефона' });
    }
    if (!role || !['applicant', 'employer'].includes(role)) {
        return res.status(400).json({ error: 'Выберите роль' });
    }
    if (role === 'employer' && !organization_id) {
        return res.status(400).json({ error: 'Выберите учреждение' });
    }

    // Экранируем от XSS
    full_name = escapeHtml(full_name.trim());
    phone = escapeHtml(phone.trim());
    position = position ? escapeHtml(position.trim()) : '';

    const users = readJSON('users.json');

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = {
        id: 'user_' + Date.now(),
        email,
        password: hashedPassword,
        role,
        full_name,
        phone,
        organization_id: role === 'employer' ? organization_id : undefined,
        position: role === 'employer' ? position : undefined,
        confirmed: false,
        confirmation_code: code,
        created_at: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    writeJSON('users.json', users);

    // Отправка письма с кодом
    transporter.sendMail({
        from: '"Кадровый центр Калмыкии" <' + process.env.EMAIL_USER + '>',
        to: email,
        subject: 'Код подтверждения регистрации',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #1E5FDC;">Кадровый центр здравоохранения РК</h2>
                <p>Здравствуйте, <strong>${full_name}</strong>!</p>
                <p>Ваш код подтверждения:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #F1F5F9; text-align: center; border-radius: 8px; margin: 16px 0;">
                    ${code}
                </div>
                <p style="color: #64748B;">Код действителен до подтверждения аккаунта.</p>
            </div>
        `
    }).catch(err => {
        console.error('Ошибка отправки письма:', err);
    });

    const { password: _, confirmation_code: __, confirmed: ___, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword });
});

// Подтверждение аккаунта по коду
app.post('/api/confirm', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email и код обязательны' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.confirmation_code === code) {
        user.confirmed = true;
        user.confirmation_code = null;
        writeJSON('users.json', users);
        return res.json({ success: true, message: 'Аккаунт подтверждён' });
    }

    res.status(400).json({ error: 'Неверный код подтверждения' });
});

// ==================== ВАКАНСИИ ====================

// Все вакансии
app.get('/api/vacancies', (req, res) => {
    const vacancies = readJSON('vacancies.json');
    res.json(vacancies);
});

// Вакансии работодателя
app.get('/api/vacancies/my', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'ID пользователя обязателен' });
    }
    const vacancies = readJSON('vacancies.json');
    res.json(vacancies.filter(v => v.created_by_user_id === userId));
});

// Создать вакансию
app.post('/api/vacancies', (req, res) => {
    let { title, specialization, salary, slots, conditions, requirements, contact_phone, contact_email, organization_id, created_by_user_id } = req.body;

    if (!title || !specialization || !salary) {
        return res.status(400).json({ error: 'Название, специализация и зарплата обязательны' });
    }

    // Экранирование
    title = escapeHtml(title);
    specialization = escapeHtml(specialization);
    salary = escapeHtml(salary);
    const slotsNum = parseInt(slots, 10) || 1;
    conditions = conditions ? escapeHtml(conditions) : '';
    requirements = requirements ? escapeHtml(requirements) : '';
    contact_phone = contact_phone ? escapeHtml(contact_phone) : '';
    contact_email = contact_email ? escapeHtml(contact_email) : '';

    const vacancies = readJSON('vacancies.json');
    const newVacancy = {
        id: 'vac_' + Date.now(),
        organization_id,
        title,
        specialization,
        salary,
        slots: slotsNum < 1 ? 1 : slotsNum,
        conditions,
        requirements,
        contact_phone,
        contact_email,
        is_active: true,
        created_at: new Date().toISOString().split('T')[0],
        created_by_user_id
    };

    vacancies.push(newVacancy);
    writeJSON('vacancies.json', vacancies);
    res.status(201).json(newVacancy);
});

// Обновить вакансию
app.put('/api/vacancies/:id', (req, res) => {
    const vacancies = readJSON('vacancies.json');
    const index = vacancies.findIndex(v => v.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Вакансия не найдена' });
    }

    // Экранируем текстовые поля если они пришли
    const updates = req.body;
    if (updates.title) updates.title = escapeHtml(updates.title);
    if (updates.specialization) updates.specialization = escapeHtml(updates.specialization);
    if (updates.salary) updates.salary = escapeHtml(updates.salary);
    if (updates.conditions) updates.conditions = escapeHtml(updates.conditions);
    if (updates.requirements) updates.requirements = escapeHtml(updates.requirements);
    if (updates.contact_phone) updates.contact_phone = escapeHtml(updates.contact_phone);
    if (updates.contact_email) updates.contact_email = escapeHtml(updates.contact_email);
    if (updates.slots !== undefined) {
        const slotsNum = parseInt(updates.slots, 10) || 1;
        updates.slots = slotsNum < 1 ? 1 : slotsNum;
    }

    vacancies[index] = { ...vacancies[index], ...updates };
    writeJSON('vacancies.json', vacancies);
    res.json(vacancies[index]);
});

// Удалить вакансию
app.delete('/api/vacancies/:id', (req, res) => {
    let vacancies = readJSON('vacancies.json');
    const filtered = vacancies.filter(v => v.id !== req.params.id);

    if (filtered.length === vacancies.length) {
        return res.status(404).json({ error: 'Вакансия не найдена' });
    }

    writeJSON('vacancies.json', filtered);
    res.json({ success: true });
});

// ==================== РЕЗЮМЕ ====================

// Все публичные резюме
app.get('/api/resumes', (req, res) => {
    const resumes = readJSON('resumes.json');
    res.json(resumes.filter(r => r.is_public !== false));
});

// Резюме пользователя
app.get('/api/resumes/my', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'ID пользователя обязателен' });
    }
    const resumes = readJSON('resumes.json');
    res.json(resumes.filter(r => r.user_id === userId));
});

// Создать резюме
app.post('/api/resumes', (req, res) => {
    let { user_id, specialization, education, experience, certificates, is_public } = req.body;

    if (!specialization || !education || !experience) {
        return res.status(400).json({ error: 'Специализация, образование и опыт обязательны' });
    }

    // Экранирование
    specialization = escapeHtml(specialization);
    education = escapeHtml(education);
    experience = escapeHtml(experience);
    if (certificates && Array.isArray(certificates)) {
        certificates = certificates.map(c => escapeHtml(c));
    }

    const resumes = readJSON('resumes.json');
    const newResume = {
        id: 'res_' + Date.now(),
        user_id,
        specialization,
        education,
        experience,
        certificates: certificates || [],
        is_public: is_public !== false,
        created_at: new Date().toISOString().split('T')[0]
    };

    resumes.push(newResume);
    writeJSON('resumes.json', resumes);
    res.status(201).json(newResume);
});

// Обновить резюме
app.put('/api/resumes/:id', (req, res) => {
    const resumes = readJSON('resumes.json');
    const index = resumes.findIndex(r => r.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Резюме не найдено' });
    }

    const updates = req.body;
    if (updates.specialization) updates.specialization = escapeHtml(updates.specialization);
    if (updates.education) updates.education = escapeHtml(updates.education);
    if (updates.experience) updates.experience = escapeHtml(updates.experience);

    resumes[index] = { ...resumes[index], ...updates };
    writeJSON('resumes.json', resumes);
    res.json(resumes[index]);
});

// Удалить резюме
app.delete('/api/resumes/:id', (req, res) => {
    let resumes = readJSON('resumes.json');
    const filtered = resumes.filter(r => r.id !== req.params.id);

    if (filtered.length === resumes.length) {
        return res.status(404).json({ error: 'Резюме не найдено' });
    }

    writeJSON('resumes.json', filtered);
    res.json({ success: true });
});

// ==================== ОТКЛИКИ ====================

// Отклики соискателя
app.get('/api/responses/my', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) {
        return res.status(400).json({ error: 'ID пользователя обязателен' });
    }
    const responses = readJSON('responses.json');
    res.json(responses.filter(r => r.user_id === userId));
});

// Отклики для работодателя
app.get('/api/responses/employer', (req, res) => {
    const orgId = req.query.organization_id;
    if (!orgId) {
        return res.status(400).json({ error: 'ID организации обязателен' });
    }
    const responses = readJSON('responses.json');
    res.json(responses.filter(r => r.organization_id === orgId));
});

// Создать отклик
app.post('/api/responses', (req, res) => {
    let { user_id, vacancy_id, organization_id, resume_id, vacancy_title } = req.body;

    if (!user_id || !vacancy_id || !organization_id) {
        return res.status(400).json({ error: 'Недостаточно данных для отклика' });
    }

    vacancy_title = escapeHtml(vacancy_title || '');

    const responses = readJSON('responses.json');

    // Защита от дубликатов
    const exists = responses.find(r =>
        r.user_id === user_id && r.vacancy_id === vacancy_id
    );
    if (exists) {
        return res.status(400).json({ error: 'Вы уже откликнулись на эту вакансию' });
    }

    const newResponse = {
        id: 'resp_' + Date.now(),
        user_id,
        vacancy_id,
        organization_id,
        resume_id,
        vacancy_title,
        created_at: new Date().toISOString().split('T')[0]
    };

    responses.push(newResponse);
    writeJSON('responses.json', responses);
    res.status(201).json(newResponse);
});

// ==================== ОРГАНИЗАЦИИ ====================

app.get('/api/organizations', (req, res) => {
    const orgs = readJSON('organizations.json');
    res.json(orgs);
});

// ==================== ПОЛЬЗОВАТЕЛИ ====================

app.get('/api/users', (req, res) => {
    const users = readJSON('users.json');
    const safe = users.map(({ password, confirmation_code, confirmed, reset_code, last_reset_time, created_at, ...rest }) => ({
        id: rest.id,
        full_name: rest.full_name,
        phone: rest.phone,
        email: rest.email,
        role: rest.role
    }));
    res.json(safe);
});

// ==================== ЗАЯВКИ С ФОРМЫ ====================

app.post('/api/contact', (req, res) => {
    let { name, phone, email } = req.body;

    if (!name || !phone || !email) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    name = escapeHtml(name);
    phone = escapeHtml(phone);
    email = escapeHtml(email);

    const contacts = readJSON('contacts.json');
    contacts.push({
        id: 'contact_' + Date.now(),
        name,
        phone,
        email,
        created_at: new Date().toISOString()
    });
    writeJSON('contacts.json', contacts);
    res.status(201).json({ success: true });
});

// ==================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ====================

// Отправить код восстановления
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Введите email' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    // Проверка: не чаще чем раз в 60 секунд
    if (user.last_reset_time) {
        const elapsed = Date.now() - user.last_reset_time;
        if (elapsed < 60000) {
            const waitSeconds = Math.ceil((60000 - elapsed) / 1000);
            return res.status(429).json({
                error: `Подождите ${waitSeconds} сек. перед повторной отправкой`
            });
        }
    }

    const resetCode = String(Math.floor(100000 + Math.random() * 900000));
    user.reset_code = resetCode;
    user.last_reset_time = Date.now();
    writeJSON('users.json', users);

    transporter.sendMail({
        from: '"Кадровый центр Калмыкии" <' + process.env.EMAIL_USER + '>',
        to: email,
        subject: 'Восстановление пароля',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #1E5FDC;">Восстановление пароля</h2>
                <p>Здравствуйте, <strong>${user.full_name}</strong>!</p>
                <p>Ваш код для сброса пароля:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px; background: #F1F5F9; text-align: center; border-radius: 8px; margin: 16px 0;">
                    ${resetCode}
                </div>
                <p style="color: #64748B;">Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
            </div>
        `
    }).catch(err => {
        console.error('Ошибка отправки:', err);
    });

    res.json({ success: true, code: resetCode });
});

// Сбросить пароль
app.post('/api/reset-password', (req, res) => {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (user.reset_code !== code) {
        return res.status(400).json({ error: 'Неверный код' });
    }

    user.password = bcrypt.hashSync(password, 10);
    user.reset_code = null;
    writeJSON('users.json', users);

    res.json({ success: true, message: 'Пароль изменён' });
});

app.get('/api/documents', (req, res) => {
    const docs = readJSON('documents.json');
    res.json(docs);
});

app.get('/api/news', (req, res) => {
    const news = readJSON('news.json');
    res.json(news);
});

app.get('/api/contacts-page', (req, res) => {
    const data = readJSON('contacts-page.json');
    res.json(data);
});

app.get('/api/goals', (req, res) => {
    const data = readJSON('goals.json');
    res.json(data);
});

app.get('/api/mentoring', (req, res) => {
    const data = readJSON('mentoring.json');
    res.json(data);
});

app.get('/api/employment-help', (req, res) => {
    const data = readJSON('employment-help.json');
    res.json(data);
});

app.get('/api/zemstvo', (req, res) => {
    const data = readJSON('zemstvo.json');
    res.json(data);
});

app.get('/api/target-training', (req, res) => {
    const data = readJSON('target-training.json');
    res.json(data);
});

// ==================== ЗАПУСК ====================

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});