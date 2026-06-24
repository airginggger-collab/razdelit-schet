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

export function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let total = 0;

  const TOTAL_RE = /итого|total|сумма|к\s*оплате/i;
  const PRICE_RE = /(\d[\d\s]*[.,]\d{2}|\d{3,})/g;

  for (const line of lines) {
    if (TOTAL_RE.test(line)) {
      const nums = [...line.matchAll(PRICE_RE)].map(m =>
        parseFloat(m[0].replace(/\s/g, '').replace(',', '.')));
      if (nums.length) total = Math.max(...nums);
      continue;
    }
    const nums = [...line.matchAll(PRICE_RE)].map(m =>
      parseFloat(m[0].replace(/\s/g, '').replace(',', '.')));
    if (nums.length) {
      const price = nums[nums.length - 1];
      const name = line.replace(PRICE_RE, '').replace(/[×x]\d+/i, '').trim() || 'Позиция';
      if (price > 0) items.push({ name, price });
    }
  }

  if (!total && items.length)
    total = items.reduce((a, b) => a + b.price, 0);

  return { items, total };
}
