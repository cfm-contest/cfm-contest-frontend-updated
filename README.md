This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local development. V5

### 1. Install and configure

```bash
npm ci
cp .env.example .env.local
```

PowerShell’da nusxalash: `Copy-Item .env.example .env.local`. `.env.local` maxfiy yoki lokal sozlamalar uchun; uni Git’ga qo‘shmang. `.env.example` lokal Django API `http://localhost:8000/api/v1` da ishlaydi deb hisoblaydi. Boshqa port yoki URL bo‘lsa, `.env.local` ichidagi `NEXT_PUBLIC_DJANGO_API_ENDPOINT`, `DJANGO_API_ENDPOINT` va `AUTH_API_ENDPOINT` qiymatlarini moslang. `AUTH_API_ENDPOINT` bazasiga login route avtomatik `/login` qo‘shadi.

Cookie bilan test qilish uchun frontend (`localhost:3000`) va Django API (`localhost:8000`) aynan bir xil hostname — `localhost` orqali ochilishi kerak. `localhost` va `127.0.0.1` cookie uchun boshqa hostlar hisoblanadi. Django CORS’da `http://localhost:3000` origin’iga ruxsat bering va credentials’ni yoqing; `Access-Control-Allow-Origin: *` credentialed so‘rovlar bilan ishlamaydi. `django-cors-headers` ishlatilsa, odatda quyidagilar kerak bo‘ladi:

```python
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True
```

Lokal Next.js (`localhost`) production API (`api.cfmcontest.uz`) bilan ishlaganda, localhost’da o‘rnatilgan cookie production API’ga yuborilmaydi. To‘liq login/API test uchun Django’ni lokal `localhost`da ishga tushiring yoki frontendni `.cfmcontest.uz` cookie domenidan foydalanadigan test hostida oching.

### 2. Ishga tushirish

```bash
npm run dev
```

Brauzerda [http://localhost:3000](http://localhost:3000) ni oching.

### 3. Auth’ni tekshirish

- `/login` sahifasida backend’ning test OTP’i bilan kiring.
- DevTools → Application → Cookies’da `access_token` cookie borligini va `HttpOnly` ekanini tekshiring. JavaScript’dan bu cookie qiymatini o‘qib bo‘lmaydi.
- Network bo‘limida brauzerning Django API so‘rovlarida cookie yuborilayotganini tekshiring.
- Logout qiling; `access_token` cookie o‘chishi kerak. Endpointni alohida tekshirish uchun: `curl -i -X POST http://localhost:3000/api/logout`.

### 4. Kod tekshiruvlari

```bash
npm run lint
npm run typecheck
```

Hozircha loyihada `npm test` script’i yo‘q; auth oqimini yuqoridagi brauzer testi bilan tekshiring.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
