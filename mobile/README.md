# Flipora mobile app

One Expo app builds Flipora for Android and iPhone. It opens the live marketplace at
https://shop-flipora.netlify.app, so website listings and fixes appear in both apps.

## Test on a phone

1. Install Node.js and run `cd mobile && npm install`.
2. Run `npx expo start`.
3. Open the QR code with Expo Go.

## Create installable builds

1. Create or sign in to an Expo account: `npx eas login`.
2. Link the project when prompted: `npx eas build:configure`.
3. Android test APK: `npx eas build --platform android --profile preview`.
4. Store builds: `npx eas build --platform all --profile production`.

Publishing requires the owner's Google Play Console and Apple Developer accounts.
Never commit account passwords, API secret keys, signing certificates, or store credentials.

## Before store submission

- Replace the default Expo icon and splash with final Flipora artwork.
- Test account creation, login, listing photos, checkout, Stripe redirects, and password reset.
- Add privacy policy, support URL, store screenshots, content rating, and marketplace disclosures.
- Use a non-admin reviewer/test account for Apple and Google review.
