# CodeKids

Образовательная платформа для обучения программированию: курсы, классы, онлайн-компилятор, видеозвонки и геймификация.

**Стек:** React 19 + Vite · Express.js (Node.js 22) · PostgreSQL 16 · Docker

---

## Быстрый старт — Docker (рекомендуется)

### Требования

| Инструмент | Версия | Скачать |
|---|---|---|
| Docker Desktop | 4.x+ | https://www.docker.com/products/docker-desktop/ |
| Git | любая | https://git-scm.com/ |

> На Windows убедитесь, что **WSL 2** включён (Docker Desktop попросит при первом запуске).

---

### Шаг 1 — Клонировать репозиторий

```bash
git clone https://github.com/Snowxdxaxd/Xak.git
cd Xak
```

---

### Шаг 2 — Создать `.env` (опционально)

```bash
cp .env.example .env
```

Для базового запуска **ничего менять не нужно** — все значения по умолчанию работают.

Если хотите использовать свою почту для верификации при регистрации — заполните `SMTP_*` переменные (иначе коды печатаются в лог сервера).

---

### Шаг 3 — Запустить

```bash
docker compose up --build
```

Первый запуск занимает **2–5 минут** (скачивает образы, собирает frontend, устанавливает зависимости).

После появления строки `API server running at http://localhost:4000` — откройте:

**http://localhost:4000**

---

### Что происходит при запуске

```
Docker запускает PostgreSQL
   → применяет server/schema.sql (таблицы, индексы)
   → ждёт готовности БД (healthcheck)

Docker запускает Node.js приложение
   → ensureSchemaCompat() — добавляет новые таблицы если их нет
   → ensureRootAdmin()   — создаёт/обновляет суперадмина
   → ensureSeedData()    — создаёт демо-аккаунты и курсы (один раз)
   → раздаёт API + статику React на порту 4000
```

---

### Управление контейнерами

```bash
# Остановить (данные сохраняются в volume)
docker compose down

# Остановить + полностью удалить базу данных
docker compose down -v

# Посмотреть логи приложения в реальном времени
docker compose logs -f app

# Посмотреть логи базы данных
docker compose logs -f db

# Перезапустить только приложение (после изменений кода)
docker compose up --build app

# Зайти в контейнер (для отладки)
docker compose exec app sh
docker compose exec db psql -U postgres -d codekids
```

---

### Проверка статуса

```bash
# Healthcheck приложения
curl http://localhost:4000/healthz

# Должен вернуть: {"ok":true,"ts":...}
```

---

## Аккаунты

### Суперадминистратор

| Email | Пароль | Роль |
|---|---|---|
| `admin@codekids.local` | `Admin12345!` | superadmin |

### Демо-преподаватели

> Пароль для всех демо-аккаунтов: **`Demo1234!`**

| Email | Имя |
|---|---|
| `teacher1@codekids.demo` | Александр Петров |
| `teacher2@codekids.demo` | Мария Иванова |

### Демо-ученики

| Email | Имя |
|---|---|
| `student1@codekids.demo` | Иван Сидоров |
| `student2@codekids.demo` | Анна Козлова |
| `student3@codekids.demo` | Дмитрий Новиков |
| `student4@codekids.demo` | Елена Морозова |
| `student5@codekids.demo` | Алексей Волков |

### Предустановленные данные

- **Класс** «9А — Базовый Python» с учениками student1–3
- **Публичные курсы:** «Основы Python» (3 урока), «Основы JavaScript» (2 урока)
- **Индивидуальный курс** «Алгоритмы» — доступен только ученикам класса 9А

---

## Локальный запуск (для разработки)

### Требования

| Инструмент | Версия |
|---|---|
| Node.js | 20 LTS или 22 |
| PostgreSQL | 16+ |

### Шаги

```bash
# 1. Клонировать
git clone https://github.com/Snowxdxaxd/Xak.git
cd Xak

# 2. Установить зависимости
npm install

# 3. Создать .env
cp .env.example .env
# Открыть .env и указать реальный DATABASE_URL если PostgreSQL не на localhost

# 4. Создать базу данных
createdb -U postgres codekids

# 5. Применить схему
npm run db:init

# 6. Запустить frontend (порт 5173) + backend (порт 4000) одновременно
npm run dev:full
```

Откройте **http://localhost:5173**

### Команды разработки

| Команда | Описание |
|---|---|
| `npm run dev:full` | Frontend + Backend вместе |
| `npm run dev:client` | Только Vite dev-сервер (5173) |
| `npm run dev:server` | Только Express API (4000) |
| `npm run build` | Production сборка frontend |
| `npm run db:init` | Инициализация схемы БД |

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/codekids` | Строка подключения к PostgreSQL |
| `API_PORT` | `4000` | Порт Express сервера |
| `JWT_SECRET` | `(слабый дефолт)` | **Смените в production!** Секрет JWT |
| `ROOT_ADMIN_EMAIL` | `admin@codekids.local` | Email суперадмина |
| `ROOT_ADMIN_PASSWORD` | `Admin12345!` | Пароль суперадмина |
| `SMTP_HOST` | *(пусто)* | SMTP сервер для email-верификации |
| `SMTP_PORT` | `587` | Порт SMTP |
| `SMTP_USER` | *(пусто)* | Логин SMTP |
| `SMTP_PASS` | *(пусто)* | Пароль SMTP |
| `SMTP_FROM` | `noreply@codekids.local` | Адрес отправителя |

> Если `SMTP_HOST` пуст — коды верификации при регистрации печатаются в лог сервера (`docker compose logs -f app`).

---

## Роли пользователей

| Роль | Возможности |
|---|---|
| `superadmin` | Полный доступ, управление пользователями, экспорт БД |
| `teacher` | Создание курсов, классов, индивидуальных курсов, онлайн-уроки, дашборд |
| `student` | Прохождение курсов, компилятор, задания, рейтинг, видеоуроки |
| `parent` | Просмотр прогресса привязанных учеников |

---

## Возможности платформы

- **Курсы** — публичные и индивидуальные (🔒 только для класса)
- **Классы** — преподаватель создаёт класс, добавляет учеников, назначает курсы
- **Онлайн-уроки** — видеозвонки через Jitsi Meet прямо в браузере (требуется интернет)
- **Компилятор** — JavaScript и Python прямо в браузере
- **Задания** — ручная и автоматическая проверка
- **Чат** — мессенджер между участниками
- **Дашборд преподавателя** — статистика курсов, учеников, активности
- **Геймификация** — XP, уровни, серии дней, таблица лидеров

---

## Часто встречаемые проблемы

### Приложение не запускается — «db not ready»
PostgreSQL стартует медленнее приложения. Подождите 30–60 секунд, или:
```bash
docker compose restart app
```

### Порт 4000 или 5432 уже занят
```bash
# Изменить порт приложения в docker-compose.yml:
ports:
  - "4001:4000"   # <-- первое число — порт на вашей машине
```

### Нужно пересоздать базу данных с нуля
```bash
docker compose down -v   # удаляет volume с данными
docker compose up --build
```

### Код верификации не приходит на почту
Коды выводятся в лог сервера если SMTP не настроен:
```bash
docker compose logs app | grep "Verification code"
```

### Видеозвонок долго подключается
Нормальное поведение — WebRTC соединение устанавливается 10–30 секунд.
Если появляется кнопка «Я организатор» — нажмите её (для преподавателя).
Требуется подключение к интернету (используется meet.jit.si).

---

## Архитектура

```
codekids-app (Node.js 22)          codekids-db (PostgreSQL 16)
├── /api/*  — REST API             ├── app_users
├── /*      — React SPA (dist/)    ├── courses / lessons
└── порт 4000                      ├── groups / group_members
                                   ├── group_courses (классы ↔ курсы)
                                   ├── course_enrollments
                                   ├── class_meetings (видеозвонки)
                                   ├── submissions / grades
                                   ├── notifications
                                   └── ...
```
