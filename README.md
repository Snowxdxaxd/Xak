
# Создание презентации 3D-графики

Проект переведен на локальный backend + локальную базу `PostgreSQL`.

## Стек

- Frontend: `React` + `Vite`
- Backend API: `Express`
- База данных: `PostgreSQL`

## 1) Установка PostgreSQL (Windows)

Вариант через `winget`:

```powershell
winget install -e --id PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements
```

Если установщик откроется в окне, завершите шаги мастера вручную и запомните:
- пользователь: `postgres`
- пароль пользователя `postgres` (задаете сами)
- порт: `5432`

Проверьте, что `psql` доступен:

```powershell
psql --version
```

## 2) Создание базы и схемы

Создайте БД:

```powershell
createdb -U postgres codekids
```

Инициализируйте схему:

```powershell
psql -U postgres -d codekids -f server/schema.sql
```

Или через Node-скрипт:

```powershell
npm run db:init
```

## 3) Настройка окружения

Скопируйте шаблон:

```powershell
copy .env.example .env
```

Проверьте значения в `.env`:

- `VITE_API_BASE_URL=http://localhost:4000`
- `API_PORT=4000`
- `DATABASE_URL=postgresql://postgres:ВАШ_ПАРОЛЬ@localhost:5432/codekids`
- `JWT_SECRET=любой_сложный_секрет`

## 4) Запуск проекта

Установка зависимостей:

```powershell
npm install
```

Запуск backend + frontend одной командой:

```powershell
npm run dev:full
```

Или по отдельности:

```powershell
npm run dev:server
npm run dev:client
```

Сайт откроется на:
- `http://localhost:5173`

API работает на:
- `http://localhost:4000`

## 5) Сборка

```powershell
npm run build
```
