// js/ocr.js — lazy-loads Tesseract.js (~4 MB) only when called

let tesseractReady = false;

export async function recogniseReceipt(imageFile, onStatus) {
  if (!tesseractReady) {
    onStatus('Загружаю OCR…');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    tesseractReady = true;
  }

  onStatus('Распознаю текст…');
  const { data: { text } } = await Tesseract.recognize(imageFile, 'rus+eng');
  return parseReceiptText(text);
}

const MAX_PRICE = 1_000_000;          // никакая позиция не стоит больше миллиона
const TOTAL_RE = /итого|всего|к\s*оплате|сумма|total/i;
// строки-метаданные, а не товары: реквизиты, телефоны, номера чеков и т.п.
const SKIP_RE  = /\b(инн|бин|бик|иик|кпп|ндс|тел|phone|чек|кассир|касс|смена|карт|сдача|терминал|оплат|номер|время|дата|guest|order|table|стол|официант)\b|№|@/i;
const DATE_RE  = /\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b|\b\d{1,2}:\d{2}\b/;
// цена: «1 200,00» / «450» — целые ограничены 2–6 знаками, чтобы отсечь ИНН и номера
const PRICE_RE = /(\d[\d ]*[.,]\d{2}|\d{2,6})(?!\d)/g;
// количество: «x2», «2x», «2 шт» — убираем, чтобы не склеить с ценой
const QTY_RE   = /(\b\d+\s*[xх*]\s*|\s*[xх*]\s*\d+\b|\b\d+\s*шт\b)/gi;
const HAS_LETTER = /[a-zа-яё]/i;

function pricesIn(str) {
  return [...str.matchAll(PRICE_RE)]
    .map(m => parseFloat(m[0].replace(/ /g, '').replace(',', '.')))
    .filter(n => n > 0 && n < MAX_PRICE);
}

export function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let total = 0;

  for (const line of lines) {
    const stripped = line.replace(QTY_RE, ' ');

    if (TOTAL_RE.test(line)) {
      const nums = pricesIn(stripped);
      if (nums.length) total = Math.max(total, Math.max(...nums));
      continue;
    }

    if (SKIP_RE.test(line) || DATE_RE.test(line)) continue;

    const nums = pricesIn(stripped);
    if (!nums.length) continue;

    const price = nums[nums.length - 1];
    const name = stripped.replace(PRICE_RE, '').replace(/[×x*]/gi, '').trim();
    // нужна осмысленная подпись (с буквами) — иначе это мусор, а не позиция
    if (name.length < 2 || !HAS_LETTER.test(name)) continue;
    items.push({ name, price });
  }

  // позиция не может стоить дороже всего счёта — отсекаем оставшийся мусор
  const clean = total ? items.filter(it => it.price <= total) : items;

  if (!total && clean.length)
    total = clean.reduce((a, b) => a + b.price, 0);

  return { items: clean, total };
}
