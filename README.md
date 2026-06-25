# Разделить счёт

PWA для дележа счёта в кафе. Сканирование чека, разбивка по участникам, трекер оплат.

**Прод:** https://airginggger-collab.github.io/razdelit-schet/

## Запуск

Локально: открой `index.html` в браузере или подними статик-сервер (`python3 -m http.server` / `npx serve`).

## Деплой

GitHub Pages с ветки `main` (project pages, субпуть `/razdelit-schet/`). Пуш в `main` → автодеплой. Пути к ассетам относительные — из-за раздачи с субпути. При изменении ассетов поднимай `CACHE` в `sw.js`. Чек-лист проверки после деплоя — в `CLAUDE.md`.

## Стек

Vanilla JS · CSS custom properties · Tesseract.js (OCR) · Service Worker (офлайн) · URL hash (шеринг)
