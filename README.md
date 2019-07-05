## วัตถุประสงค์

- เข้าใจการทำงานของ OAuth2.0
- สามารถ integrate application เข้ากับ 3rd-party authorization provider ได้

## Providers

### Google

> The application should store the refresh token for future use and use the access token to access a Google API. Once the access token expires, the application uses the refresh token to obtain a new one.

-- [Google OAuth2.0](https://developers.google.com/identity/protocols/OAuth2)

- All scopes: [https://developers.google.com/identity/protocols/googlescopes](https://developers.google.com/identity/protocols/googlescopes)

---

## express-session

- Different session secret means different session file.