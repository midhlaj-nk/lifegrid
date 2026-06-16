// Change this to your Vercel deployment URL for production
// For Android emulator, 10.0.2.2 maps to host localhost
// For iOS simulator, use 127.0.0.1
const String kApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);
const String kV1Base = '$kApiBaseUrl/api/v1';
const String kAuthBase = '$kApiBaseUrl/api/auth';
