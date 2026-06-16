import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/auth_api.dart';

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ApiClient()));

class AuthNotifier extends StateNotifier<AsyncValue<Map<String, dynamic>?>> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AsyncLoading()) {
    _checkAuth();
  }

  AuthApi get _authApi => _ref.read(authApiProvider);

  // On app start: try getMe with stored token. If fails, unauthenticated.
  Future<void> _checkAuth() async {
    try {
      final user = await _authApi.getMe();
      if (mounted) state = AsyncData(user);
    } catch (_) {
      if (mounted) state = const AsyncData(null);
    }
  }

  // Sign in: use user from sign-in response body directly (no getMe needed)
  Future<bool> signIn(String email, String password) async {
    try {
      // ignore: avoid_print
      print('[AUTH] signIn start: $email');
      final data = await _authApi.signIn(email, password);
      // ignore: avoid_print
      print('[AUTH] signIn response keys: ${data.keys.toList()}');
      final user = data['user'] as Map<String, dynamic>?;
      // ignore: avoid_print
      print('[AUTH] user from response: $user');
      if (user != null) {
        if (mounted) state = AsyncData(user);
        return true;
      }
      await _checkAuth();
      final authenticated = state.valueOrNull != null;
      // ignore: avoid_print
      print('[AUTH] after _checkAuth authenticated=$authenticated');
      return authenticated;
    } catch (e, st) {
      // ignore: avoid_print
      print('[AUTH] signIn ERROR: $e');
      if (mounted) state = AsyncError(e, st);
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await _authApi.signOut();
    } catch (_) {}
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

  bool get isAuthenticated => state.valueOrNull != null;
}

final authStateProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<Map<String, dynamic>?>>(
  (ref) => AuthNotifier(ref),
);
