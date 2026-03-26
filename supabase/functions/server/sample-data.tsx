import * as kv from './kv_store.tsx';

export async function initializeSampleData() {
  // Check if data already exists
  const existingCourses = await kv.getByPrefix('course:');
  if (existingCourses && existingCourses.length > 0) {
    return; // Data already initialized
  }

  // Sample Courses
  const courses = [
    {
      id: 'python-basics',
      title: 'Основы Python',
      description: 'Изучи основы программирования на Python с нуля. Научись писать свой первый код!',
      level: 'beginner',
      lessonsCount: 2,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'javascript-intro',
      title: 'Введение в JavaScript',
      description: 'Начни свое путешествие в веб-разработку с JavaScript',
      level: 'beginner',
      lessonsCount: 2,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const course of courses) {
    await kv.set(`course:${course.id}`, course);
  }

  // Sample Lessons for Python
  const pythonLessons = [
    {
      id: 'python-1',
      courseId: 'python-basics',
      title: 'Урок 1: Привет, Python!',
      content: `# Добро пожаловать в мир Python! 🐍

Python — это простой и мощный язык программирования. Давай напишем твою первую программу!

## Твоя первая программа

\`\`\`python
print("Привет, мир!")
\`\`\`

Эта программа выводит текст на экран. Функция \`print()\` — одна из самых важных в Python.

## Переменные

Переменные — это коробочки, где мы храним данные:

\`\`\`python
имя = "Алекс"
возраст = 13
print(f"Меня зовут {имя} и мне {возраст} лет")
\`\`\`

## Попробуй сам!

Создай переменную с твоим именем и выведи приветствие.
`,
      order: 0,
      hasAssignment: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'python-2',
      courseId: 'python-basics',
      title: 'Урок 2: Условия и циклы',
      content: `# Управляем программой 🎮

Научимся принимать решения в коде!

## Условия (if-else)

\`\`\`python
возраст = 14
if возраст >= 13:
    print("Ты подросток!")
else:
    print("Ты ребенок!")
\`\`\`

## Циклы (for)

Циклы позволяют повторять действия:

\`\`\`python
for i in range(5):
    print(f"Это число: {i}")
\`\`\`

## Задание

Напиши программу, которая выводит числа от 1 до 10, но только четные!
`,
      order: 1,
      hasAssignment: true,
      createdAt: new Date().toISOString(),
    },
  ];

  // Sample Lessons for JavaScript
  const jsLessons = [
    {
      id: 'js-1',
      courseId: 'javascript-intro',
      title: 'Урок 1: Основы JavaScript',
      content: `# Привет, JavaScript! 💻

JavaScript делает веб-сайты интерактивными!

## Первый код

\`\`\`javascript
console.log("Привет из JavaScript!");
\`\`\`

## Переменные

\`\`\`javascript
let имя = "Мария";
const возраст = 15;
console.log(\`Привет, \${имя}! Тебе \${возраст} лет.\`);
\`\`\`

## Функции

\`\`\`javascript
function приветствие(имя) {
    return "Привет, " + имя + "!";
}

console.log(приветствие("Программист"));
\`\`\`
`,
      order: 0,
      hasAssignment: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'js-2',
      courseId: 'javascript-intro',
      title: 'Урок 2: Работа с массивами',
      content: `# Массивы в JavaScript 📚

Массивы — это списки данных.

## Создание массива

\`\`\`javascript
const числа = [1, 2, 3, 4, 5];
const имена = ["Алекс", "Мария", "Иван"];
\`\`\`

## Работа с массивами

\`\`\`javascript
// Добавить элемент
имена.push("Катя");

// Перебрать элементы
имена.forEach(function(имя) {
    console.log("Привет, " + имя);
});
\`\`\`

## Задание

Создай массив своих любимых языков программирования и выведи каждый!
`,
      order: 1,
      hasAssignment: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const lesson of [...pythonLessons, ...jsLessons]) {
    await kv.set(`lesson:${lesson.id}`, lesson);
  }

  console.log('Sample data initialized successfully');
}
