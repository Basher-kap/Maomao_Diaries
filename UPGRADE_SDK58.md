# Maomao Diaries: Expo SDK 57 -> 58

Your project is on SDK 57 (React Native 0.86). SDK 58 (React Native 0.88) was released on Oct 15, 2026.

## Steps
1. Use Node 22.13+ (22 line), 24.3+ (24 line) or 26+. Odd versions (23, 25) are unsupported.
2. `npx expo install expo@^58.0.0 --fix`   (aligns every expo-* package, react-native, screens, safe-area-context)
3. `npx expo-doctor@latest`
4. Create a new development build (you use expo-dev-client): `eas build --profile development --platform android`
5. Build / publish as usual. Because runtimeVersion uses the appVersion policy, an OTA update will NOT reach installs built on SDK 57 unless you bump `version` in app.json (e.g. 1.1.0) and ship a new APK.

## Things in this project that SDK 58 touches
- Android release builds now use R8 (minify) by default. Test the APK: image picking, backup export/import, sharing, AI search. If anything crashes only in release, set `android.enableMinifyInReleaseBuilds` to false via expo-build-properties.
- expo-file-system: you import `expo-file-system/legacy` (useBackupManager.js, imageStorage.js). The changelog does not list it as removed, so it should keep working. The new `File.write()` is async in 58, relevant only if you migrate to the new File/Directory API.
- expo-observe: you already use `Observe` (good). `AppMetrics` is the deprecated name.
- RN removals (InteractionManager, Touchable root export, Modal `animated`, StatusBar backgroundColor/translucent props): none are used in this code. You use StatusBar from expo-status-bar.
- Expo Router: Link, useRouter and useLocalSearchParams are unchanged. Web output now defaults to server rendering; irrelevant for your Android APK.
- `.env` handling: Expo CLI now forces NODE_ENV to development/production by command; EXPO_PUBLIC_GEMINI_API_KEY still loads from .env.

## Security note (not Expo-specific)
EXPO_PUBLIC_* variables are inlined into the app bundle, so anyone can extract EXPO_PUBLIC_GEMINI_API_KEY from the APK or the OTA bundle. Restrict that key in Google AI Studio / Cloud (Android app restriction, quota limits), or call Gemini through a small server you control. Also rotate the key if the .env or dist/ folder was ever shared.
