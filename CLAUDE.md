# CLAUDE.md — Разделить счёт

PWA для дележа счёта (Казахстан, ₸). Vanilla JS, без сервера, без build-step.

**Прод:** https://airginggger-collab.github.io/razdelit-schet/ · Репо: `airginggger-collab/razdelit-schet` · Хостинг: GitHub Pages (project pages с ветки `main`, субпуть `/razdelit-schet/`).

## Запуск
Статик-хостинг или `python3 -m http.server` / `npx serve`. Дев-превью: `.claude/launch.json` (имя `razdelit`, порт 3131).

## Архитектура
- `index.html` — оболочка + `<template>` экранов (1–4 + `tmpl-screen-history`).
- `js/app.js` — состояние, роутер (числовые экраны + именованный `history`), init экранов, вся DOM-логика.
- `js/share.js` — encode/decode сессии в URL-hash (**вырезает телефоны**) + deep-link построители (WhatsApp/Telegram/текст). Чистые функции.
- `js/store.js` — localStorage: друзья + история (upsert по `id`). Без DOM.
- `js/ocr.js` — ленивый Tesseract.js + парсер чека (фильтрует мусор: ИНН, телефоны, даты, номера).
- `js/confetti.js` — canvas-конфетти при 100%.
- `sw.js` — cache-first офлайн (текущая версия `razdelit-v6`, с очисткой старых кэшей).

## Состояние (`state`)
`{ id, total, currency, items:[{name,price}], participants:[{id,name,phone,color,share,paid,paidAmount}] }`
- `id` присваивается на трекере (экран 4), ключ записи истории.
- `phone` — только на устройстве, **НЕ** попадает в расшаренный URL.

## Хранилище (localStorage)
- `razdelit-friends` — `[{name, phone}]` (ключ — нормализованный номер).
- `razdelit-history` — последние 10 сессий, upsert по `id`.

## Конвенции
- Доли квантуются в целые ₸ (`roundShares`, метод наибольшего остатка) — сумма точно равна счёту.
- Склонение «человек/человека» — `pluralPeople`.
- Деплой: GitHub Pages с ветки `main` (project pages, субпуть `/razdelit-schet/`). Прод = HEAD `main`, пуш в `main` → автодеплой. **Пути к ассетам — относительные** (`./style.css`, `./js/…`), потому что project pages раздаются с субпути, а не с корня домена.
- **При изменении ассетов — бамп `CACHE` в `sw.js`** (сейчас `razdelit-v6`; иначе у клиентов залипает старый service-worker-кэш и они получат старую версию).
- **Документация и контекст обновляются в том же коммите, что и код.**

## Проверка после деплоя
1. **Локаль = remote.** `git rev-parse HEAD` == `git rev-parse origin/main` (прод собирается с HEAD `main`).
2. **Build прошёл с HEAD.** Settings → Pages → последний build, либо `gh api repos/airginggger-collab/razdelit-schet/pages/builds/latest` — commit совпадает с HEAD.
3. **Прод-ассеты = локальные.** Сверить хэши ключевых файлов:
   `curl -s https://airginggger-collab.github.io/razdelit-schet/style.css | shasum` vs `shasum style.css` (и так же `js/app.js`, `sw.js`).
4. **Кэш SW.** Если менялись ассеты — убедиться, что `CACHE` в `sw.js` подняли (иначе клиенты не увидят обновление).

## Дизайн-конвенции
Следуем «Основам формирования дизайна» (рубрик в чате 2026-06-25):
- **Отступы** — шкала 4/8/12/16/24/32; токены радиусов 8/12/16, вложенные скругления ~1:2.
- **Типографика** — system-ui, мелкий лейбл → крупное число (иерархия).
- **Цвет** — 60/30/10, акцент `--red #E8131E`. **Без чистого `#000`/`#fff`**: текст `#171717`, фон `#f5f5f5`, карточки `--card #FCFCFC`, инверсный текст `--text-inverse #FFFAFA`. Серый `--text-tertiary #737373` (контраст ≥4.5).
- **Тач-зоны ≥44px** у всех интерактивных контролов (счётчик, иконки 📇/⬆/📜/×, «Назад»).
- **Состояния** — у кнопок есть `:active`, `:disabled`, `:focus-visible` (красный outline); у инпутов — `:focus`.
- **Опасных действий нет**; красный — фирменный (Kaspi-стиль).
- **Mobile single-column** (`max-width 480px`) — 12-колоночная сетка не применяется (N/A).

## Экраны
1. Добавить счёт (OCR с камеры **или фото из галереи**, ручной ввод, кнопка «📜 История»)
2. Участники (счётчик, имена, телефоны, пикер друзей, «кто что ел»)
3. Итог (поровну / индивидуально)
4. Трекер «Кто закинул» (тап = оплатил, «Напомнить» = deep-link, шеринг)
- history — список прошлых счетов, тап восстанавливает на трекер

## Документы
- Спеки: `docs/superpowers/specs/` — MVP (2026-06-24) + социальный слой (2026-06-25).
- Планы: `docs/superpowers/plans/` — соответствующие.

## Что НЕ делаем (без сервера)
Реал-тайм-синк между устройствами; авто-отправка напоминаний; Telegram по номеру напрямую (ограничение платформы).
