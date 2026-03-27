# CodeKids

Образовательная платформа для обучения программированию с системой курсов, заданий, квизов, чатов и геймификацией.

## Стек

- **Frontend:** React 19 + Vite + Tailwind CSS + Radix UI
- **Backend API:** Express.js (Node.js 22)
- **База данных:** PostgreSQL 16

---

## Быстрый старт через Docker (рекомендуется)

### Требования
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Запуск

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Snowxdxaxd/Xak.git
cd Xak

# 2. Создать .env (можно оставить по умолчанию для локального запуска)
cp .env.example .env

# 3. Собрать и запустить все сервисы
docker compose up --build
```

После запуска откройте: **http://localhost:4000**

> Docker автоматически:
> - Поднимет PostgreSQL и применит схему БД
> - Соберёт frontend (Vite build)
> - Запустит Express сервер, который раздаёт и API, и статику

### Остановка

```bash
docker compose down          # остановить контейнеры
docker compose down -v       # остановить + удалить данные БД
```

---

## Локальный запуск (для разработки)

### Требования
- [Node.js LTS](https://nodejs.org) (v20+)
- [PostgreSQL 16+](https://www.postgresql.org/download/)

### Шаги

```bash
# 1. Клонировать репозиторий
git clone https://github.com/Snowxdxaxd/Xak.git
cd Xak

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env: указать DATABASE_URL с вашим паролем PostgreSQL

# 4. Создать базу данных
createdb -U postgres codekids

# 5. Применить схему
npm run db:init

# 6. Запустить frontend + backend
npm run dev:full
```

Откройте: **http://localhost:5173**

### Команды разработки

| Команда | Описание |
|---|---|
| `npm run dev:full` | Frontend (5173) + Backend (4000) вместе |
| `npm run dev:client` | Только Vite dev-сервер |
| `npm run dev:server` | Только Express API |
| `npm run build` | Production сборка frontend |
| `npm run db:init` | Инициализация схемы БД |

---

## Переменные окружения (`.env`)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/codekids` | Строка подключения к PostgreSQL |
| `API_PORT` | `4000` | Порт Express сервера |
| `JWT_SECRET` | `change-this-secret` | Секрет для подписи JWT токенов |
| `VITE_API_BASE_URL` | `/api` | Базовый URL API для frontend |

---

## Роли пользователей

| Роль | Возможности |
|---|---|
| `superadmin` | Полный доступ ко всему |
| `teacher` | Создание курсов/уроков, проверка заданий, управление группами |
| `student` | Прохождение курсов, сдача заданий/квизов, чат |
| `parent` | Просмотр прогресса связанных учеников |

### Суперадмин по умолчанию
- **Email:** `admin@codekids.local`
- **Пароль:** `Admin12345!`

