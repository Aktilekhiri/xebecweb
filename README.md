# Xebec Studio — xebecweb.com

Сайт студии Актилека Казиева: сайты под ключ. Три языка, у каждого своя страница:
`/` — английский (главная, цены в $, нацелена на клиентов из-за рубежа), `/ru/` — русский, `/ky/` — кыргызский.
Старый адрес `/en/` автоматически ведёт на главную (файл `_redirects`).

## Что где лежит
- `content.js` — все тексты, цены, проекты и контакты. Обычно правите только этот файл.
- `build.js` — собирает сайт из `content.js` в папку `public/`.
- `public/` — готовые файлы сайта.
- `wrangler.jsonc` — настройки для Cloudflare (имя Worker `small-mode-cd71` и папка `public`).

## Заявки
Форма внизу сайта: имя, email, WhatsApp/Telegram (по желанию), услуга и пара слов о задаче.
Клиент жмёт «Отправить заявку» и остаётся на сайте, а письмо приходит на `xebecweb.com@gmail.com`
через сервис Web3Forms (бесплатно до 250 заявок в месяц). В письме можно сразу нажать «Ответить» —
ответ уйдёт клиенту.
Ключ Web3Forms — в `content.js` → `WEB3FORMS_KEY`. Если почта сменится, получи новый ключ на web3forms.com.
Если сервис вдруг не ответит, клиент увидит кнопки «написать на почту» и «WhatsApp» с уже готовым текстом.

## Как сайт попадает на xebecweb.com
Репозиторий подключён к Worker `small-mode-cd71` в Cloudflare (Settings → Builds).
Каждое изменение в ветке `main` Cloudflare сам собирает (`node build.js`) и выкладывает (`npx wrangler deploy`)
примерно за минуту. Zip загружать больше не нужно.

Поменять что-то прямо на GitHub: открыть `content.js` → карандаш ✏️ → поправить → **Commit changes**.

Если имя Worker в Cloudflare когда-нибудь поменяется, поменяй `name` в `wrangler.jsonc`, иначе сборка упадёт.

Запасной вариант без GitHub: `node build.js` создаёт `xebecweb-upload.zip`, его можно загрузить вручную.

## Поисковики (SEO)
Уже на сайте: sitemap.xml, robots.txt, canonical и hreflang для трёх языков, описания, превью для соцсетей,
данные о студии для Google (JSON-LD) и ключ IndexNow (Bing, Яндекс и др.).
Коды подтверждения Google / Яндекс / Bing можно вписать в `content.js` (GOOGLE_VERIFY, YANDEX_VERIFY, BING_VERIFY)
и пересобрать (`node build.js`). Но проще подтвердить через DNS в Cloudflare, тогда сайт пересобирать не нужно.

## Как поменять текст или цену
- Цены: массив `PRICES` в `content.js` (`kgs` — сомы для RU/KG, `usd` — доллары для EN).
- Тексты: `I18N.ru / en / ky` в `content.js`.
- После правок на GitHub ничего запускать не нужно, Cloudflare соберёт сам.

## Посмотреть локально
`npx serve public` и открыть адрес, который он покажет.

## Прочее
- Фото: `public/assets/img/aktilek.webp` .
- Скриншоты проектов: `public/assets/work/`.
- Фон с сакурой: `public/assets/sakura-night.svg` (свой рисунок).
- Превью для соцсетей: `public/assets/og-ru.jpg`, `og-en.jpg`, `og-ky.jpg`.
- `public/_headers` — кэш и базовые заголовки безопасности.
