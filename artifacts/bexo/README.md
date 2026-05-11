# BEXO Mobile App

BEXO is a premium, AI-powered portfolio platform for students and professionals. This mobile application allows users to claim a handle, upload their resume for AI parsing, and manage their live professional portfolio on the go.

## 🚀 Features

- **AI Resume Parsing**: Upload a PDF resume and let AI automatically extract your education, experience, projects, and skills.
- **WhatsApp Authentication**: Seamless login using WhatsApp OTP for high security and low friction.
- **Dynamic Portfolios**: Claim your unique handle (e.g., `kavin.mybexo.com`) and keep it updated in real-time.
- **Activity Feed**: Post updates about your achievements, new roles, or projects.
- **AI Certificate Scanning**: Scan your certificates or project screenshots to automatically generate descriptions and titles.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Navigation**: Expo Router (File-based routing)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- **Image Handling**: [Expo Image](https://docs.expo.dev/versions/latest/sdk/image/) & [Expo Image Picker](https://docs.expo.dev/versions/latest/sdk/image-picker/)
- **Parsing/AI**: Custom API Server integrated with LLMs for resume and document analysis.

## 📦 Project Structure

```bash
├── app/               # Main application screens (Expo Router)
│   ├── (auth)/        # Authentication flow (Login, Verify)
│   ├── (main)/        # Post-login screens (Dashboard, Portfolio, Update)
│   ├── (onboarding)/  # First-time user flow (Contact, Photo, Handle, Resume)
│   └── ...
├── assets/            # Fonts, images, and brand assets
├── components/        # Reusable UI components
├── hooks/             # Custom React hooks (theming, etc.)
├── lib/               # Utility functions (supabase, error handling)
├── services/          # API & background services (upload, parsing)
└── stores/            # Zustand state stores
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm or npm
- Expo Go (for testing on physical devices)

### Installation
1. Clone the repository.
2. Navigate to the `artifacts/bexo` directory.
3. Install dependencies:
   ```bash
   pnpm install
   ```

### Running Locally
To start the development server:
```bash
npx expo start
```
Use the Expo Go app on your phone to scan the QR code.

## 🏗 Build & Deployment

BEXO uses **EAS Build** for production-ready binaries.

### Android Preview
```bash
npx eas-cli build --profile preview --platform android
```

### Production Submission
```bash
npx eas-cli build --profile production --platform android
```

## 🔐 Environment Variables

Create a `.env` file in the root with the following:
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
- `EXPO_PUBLIC_API_BASE_URL`: Base URL for the BEXO API server

## 📄 License
Internal use only. Copyright © 2026 BEXO.
