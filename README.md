## วัตถุประสงค์

- เข้าใจการทำงานของ OAuth2.0 สำหรับ client (client ในที่นี้หมายถึงฝั่งตรงข้ามกับ identity provider)
- สามารถ integrate application เข้ากับ 3rd-party identiry providers ได้

---

## Overview

- ใช้ `Express` เป็น HTTP server framework.
- ใช้ MongoDB เป็น database.
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

## Notes

### express-session

- Different session secret means different session file. ตอนแรกตั้ง session secret โดยใช้ `crypto.randomBytes(16).toString('hex')` พอมีการ restart server เมื่อไหร่ secret ก็เปลี่ยนใหม่ทุกที ทำให้เกิด session ใหม่ทุกครั้ง ที่เคย login ไว้ก็หายหมด เลย set เป็น static value แทน

### session-file-store

- มี default `ttl` value อยู่ที่ 3600 milliseconds หมายความว่ามันจะ clear store (destroy session) เมื่อเวลาผ่านไป 1 ชั่วโมง อย่างงว่าทำไมแป๊บเดียว user ไม่ได้ login แล้ว
