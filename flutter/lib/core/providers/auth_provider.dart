import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/auth_api.dart';

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ApiClient());
});

// ---------------------------------------------------------------------------
// AuthNotifier
// ---------------------------------------------------------------------------

class AuthNotifier extends StateNotifier<AsyncValue<Map<String, dynamic>?>> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AsyncLoading()) {
    _checkAuth();
  }

  AuthApi get _authApi => _ref.read(authApiProvider);

  Future<void> _checkAuth() async {
    try {
      final user = await _authApi.getMe();
      if (mounted) state = AsyncData(user);
    } catch (_) {
      if (mounted) state = const AsyncData(null);
    }
  }

  Future<bool> signIn(String email, String password) async {
    try {
      await _authApi.signIn(email, password);
      await _checkAuth();
      return state.value != null;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await _authApi.signOut();
    } catch (_) {
      // ignore sign-out errors — clear state regardless
    }
    if (mounted) state = const AsyncData(null);
  }

  Future<bool> signUp(String email, String password, String name) async {
    try {
      await _authApi.signUp(email, password, name);
      return true;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return false;
    }
  }

  bool get isAuthenticated => state.value != null;
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<Map<String, dynamic>?>>(
  (ref) => AuthNotifier(ref),
);
