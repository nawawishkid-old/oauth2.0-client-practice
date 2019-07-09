## วัตถุประสงค์

- เข้าใจการทำงานของ OAuth2.0 สำหรับ client (client ในที่นี้หมายถึงฝั่งตรงข้ามกับ identity provider)
- สามารถ integrate application เข้ากับ 3rd-party identiry providers ได้

---

## Overview

- ใช้ `Express` เป็น HTTP server framework.
- ใช้ `MongoDB` เป็น database.
- ใช้ `pug` เป็น template engine.
- ตอนนี้ save access token และ encrypted refresh token ไว้ใน database.
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

1. ไปเพิ่ม app ใหม่ใน [Facebook for developers](https://developers.facebook.com/apps/) ก่อนครับ
2. อย่าลืมตั้งค่า redirect_uri นะ
3. นำ app_id, app_secret, และ redirect_uri ที่ได้มาใส่ใน `.env` file ในชื่อ `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, และ `FACEBOOK_CALLBACK_URL` ตามลำดับ

### Line

1. สร้าง channel ใหม่ใน Line developer console
2. อย่าลืมตั้งค่า redirect_uri นะ
3. นำ channel id, channel secret, และ redirect uri จาก developer console มาใส่ใน `.env` file ในชื่อ `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET, และ `LINE_CALLBACK_URL` ตามลำดับ

### จากนั้นก็...

1. ตั้งค่า `PORT`, `MONGODB_URL`, และ `APP_SECRET` ใน `.env` file.
2. Run `npm run dev`
3. ไปที่ `http://localhost:<PORT>`

---

## How It Works

@TODO Explain how it works in detail.
@TODO Explain what's the difference between `nonce` (replay attack) and `state` (CSRF attack) in authorization code request.

---

## Notes

- กรณีของ Google เราจะรู้ได้ไงว่าจะต้อง refresh access token เมื่อไหร่?
- ตอนทำของ Facebook ทำไมเราถึงไม่ได้ยุ่งเกี่ยวกับ refresh token เลย?
- OpenID Connect ที่ Google ใช้นั้น ต่างจาก OAuth2.0 ยังไง?
- สำหรับ Line ผมไม่ได้ request email permission เพราะต้องให้ทาง Line รีวิวก่อน และผมคิดว่าไม่จำเป็นต้องทำ เนื่องจากมันไม่ใช่ส่วนสำคัญในการทำความเข้าใจขั้นตอนการทำงานของ OAuth 2.0 protocol

### `express-session`

- Different session secret means different session file. ตอนแรกตั้ง session secret โดยใช้ `crypto.randomBytes(16).toString('hex')` พอมีการ restart server เมื่อไหร่ secret ก็เปลี่ยนใหม่ทุกที ทำให้เกิด session ใหม่ทุกครั้ง ที่เคย login ไว้ก็หายหมด เลย set เป็น static value แทน

### `session-file-store`

- มี default `ttl` value อยู่ที่ 3600 milliseconds หมายความว่ามันจะ clear store (destroy session) เมื่อเวลาผ่านไป 1 ชั่วโมง อย่างงว่าทำไมแป๊บเดียว user ไม่ได้ login แล้ว

### `mongoose`

- ใน `User` model set `email` field ไว้เป็น `required` แต่เมื่อ input เป็น `null` กลับไม่ error อะไร
