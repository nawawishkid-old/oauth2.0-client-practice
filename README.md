## วัตถุประสงค์

- เข้าใจการทำงานของ OAuth2.0 สำหรับ client (client ในที่นี้หมายถึงฝั่งตรงข้ามกับ identity provider)
- สามารถ integrate application เข้ากับ 3rd-party identiry providers ได้

---

## Overview

- ใช้ `Express` เป็น HTTP server framework.
- ใช้ `MongoDB` เป็น database.
- ใช้ `pug` เป็น template engine.
- ตอนนี้ save refresh token และ access token ไว้ใน database.
- เก็บ session ไว้ใน file system.

---

## Project structure

```
|- sessions/ # Session files
|- src/
  |- assets/ # frontend assets
  |- config/ # configuration file(s)
  |- middlewares/ # common middlewares
  |- models/ # Database models
  |- routes/ # App routes
  |- views/ # App views
  |- server.js # Server file
|- .env.example # Example of .env file
|- .gitignore
|- nodemon.json # nodemon configuration file
```

---

## Instructions

### Google

1. ไปสร้าง OAuth2.0 client credential สำหรับ Web application ที่ [Google Console](https://console.developers.google.com/apis/credentials/oauthclient) ก่อนครับ
2. อย่าลืมตั้งค่า redirect_uri นะ
3. เอา client_id, client_secret, และ redirect_uri ที่ได้มาใส่ใน `.env` file ในชื่อ `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, และ `GOOGLE_CALLBACK_URL` ตามลำดับ

### Facebook

4. ไปเพิ่ม app ใหม่ใน [Facebook for developers](https://developers.facebook.com/apps/) ก่อนครับ
5. อย่าลืมตั้งค่า redirect_uri นะ
6. นำ app_id, app_secret, และ redirect_uri ที่ได้มาใส่ใน `.env` file ในชื่อ `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, และ `FACEBOOK_CALLBACK_URL` ตามลำดับ

### จากนั้นก็...

7. ตั้งค่า `PORT`, `MONGODB_URL`, และ `APP_SECRET` ใน `.env` file.
8. Run `npm run dev`
9. ไปที่ `http://localhost:<PORT>`

---

## How It Works

@TODO Explain how it works in detail.

---

## Notes

### `express-session`

- Different session secret means different session file. ตอนแรกตั้ง session secret โดยใช้ `crypto.randomBytes(16).toString('hex')` พอมีการ restart server เมื่อไหร่ secret ก็เปลี่ยนใหม่ทุกที ทำให้เกิด session ใหม่ทุกครั้ง ที่เคย login ไว้ก็หายหมด เลย set เป็น static value แทน

### `session-file-store`

- มี default `ttl` value อยู่ที่ 3600 milliseconds หมายความว่ามันจะ clear store (destroy session) เมื่อเวลาผ่านไป 1 ชั่วโมง อย่างงว่าทำไมแป๊บเดียว user ไม่ได้ login แล้ว
