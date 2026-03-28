import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const slidesDir = process.argv[2];
if (!slidesDir) {
  console.error("Usage: node patch-pptx-codekids.mjs <path-to-ppt/slides>");
  process.exit(1);
}

function patchSlide(name, fn) {
  const p = path.join(slidesDir, name);
  let s = fs.readFileSync(p, "utf8");
  s = fn(s);
  fs.writeFileSync(p, s, "utf8");
}

patchSlide("slide1.xml", (s) =>
  s
    .replace("<a:t>Наименование продукта</a:t>", "<a:t>CodeKids</a:t>")
    .replace(
      "<a:t>Название команды</a:t>",
      "<a:t>Образовательная платформа программирования</a:t>",
    ),
);

for (const n of ["slide2", "slide3", "slide4", "slide5", "slide6", "slide7"]) {
  patchSlide(`${n}.xml`, (s) =>
    s
      .replace(/<a:t>Состав команды<\/a:t>/g, "<a:t>Проект CodeKids</a:t>")
      .replace(/<a:t>Фото команды<\/a:t>/g, "<a:t>Скриншот платформы</a:t>"),
  );
}

patchSlide("slide2.xml", (s) =>
  s
    .replace("<a:t>команда </a:t>", "<a:t>Аудитория: </a:t>")
    .replace("<a:t>НАЗВАНИЕ</a:t>", "<a:t>ученики, преподаватели, родители</a:t>"),
);

patchSlide("slide3.xml", (s) => {
  s = s.replace(
    "<a:t>ТЕХНИЧЕСКОЕ РЕШЕНИЕ </a:t>",
    "<a:t>ТЕХНИЧЕСКОЕ РЕШЕНИЕ</a:t>",
  );
  let stack = 0;
  s = s.replace(/<a:t>Стек разработки<\/a:t>/g, () => {
    stack += 1;
    return stack === 1
      ? "<a:t>Клиент</a:t>"
      : "<a:t>Сервер и БД</a:t>";
  });
  let ux = 0;
  s = s.replace(/<a:t>ux<\/a:t>/g, () => {
    ux += 1;
    return ux === 1 ? "<a:t>React 19</a:t>" : "<a:t>Express</a:t>";
  });
  let ui = 0;
  s = s.replace(/<a:t>ui<\/a:t>/g, () => {
    ui += 1;
    return ui === 1 ? "<a:t>Vite</a:t>" : "<a:t>PostgreSQL 16</a:t>";
  });
  return s;
});

patchSlide("slide4.xml", (s) =>
  s
    .replace(
      "<a:t>Разработка обязательного функционала </a:t>",
      "<a:t>База: курсы, классы, роли, задания</a:t>",
    )
    .replace("<a:t>Разработка </a:t>", "<a:t>Расширения: </a:t>")
    .replace("<a:t>дополнительного </a:t>", "<a:t>компилятор, </a:t>")
    .replace("<a:t>функционала </a:t>", "<a:t>чаты, видеозвонки, геймификация</a:t>"),
);

patchSlide("slide5.xml", (s) =>
  s
    .replace(
      "<a:t>УНИКАЛЬНОСТЬ/ОСОБЕННОСТИ</a:t>",
      "<a:t>ОСОБЕННОСТИ ПЛАТФОРМЫ</a:t>",
    )
    .replace("<a:t>Уникальность</a:t>", "<a:t>Одна среда: теория и практика кода</a:t>")
    .replace("<a:t>Особенности</a:t>", "<a:t>Docker, PostgreSQL, мультиязычность</a:t>"),
);

patchSlide("slide6.xml", (s) =>
  s.replace(
    "<a:t>КОНКУРЕНТНОЕ ПРЕИМУЩЕСТВО </a:t>",
    "<a:t>OPEN SOURCE И ПОЛНЫЙ СТЕК</a:t>",
  ),
);

patchSlide("slide7.xml", (s) =>
  s.replace(
    "<a:t>ПЕРСПЕКТИВЫ РАЗВИТИЯ</a:t>",
    "<a:t>ПЕРСПЕКТИВЫ: КОНТЕНТ И МАСШТАБИРОВАНИЕ</a:t>",
  ),
);

console.log("Patched slides in", slidesDir);
