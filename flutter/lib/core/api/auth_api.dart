import 'package:dio/dio.dart';
import '../constants.dart';
import 'api_client.dart';

class AuthApi {
  final ApiClient _client;

  AuthApi(this._client);

  Future<Map<String, dynamic>> signIn(String email, String password) async {
    final response = await _client.rawDio.post(
      '$kAuthBase/sign-in/email',
      data: {
        'email': email,
        'password': password,
      },
      options: Options(
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    final data = response.data as Map<String, dynamic>;
    // Better Auth returns token in the response body — store it for Bearer auth
    final token = data['token'] as String?;
    if (token != null) await _client.setAuthToken(token);
    return data;
  }

  Future<void> signOut() async {
    try {
      await _client.rawDio.post(
        '$kAuthBase/sign-out',
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        ),
      );
    } finally {
      await _client.setAuthToken(null);
    }
  }

  Future<Map<String, dynamic>> signUp(
    String email,
    String password,
    String name,
  ) async {
    final response = await _client.rawDio.post(
      '$kAuthBase/sign-up/email',
      data: {
        'email': email,
        'password': password,
        'name': name,
      },
      options: Options(
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _client.get('/me');
    return response.data as Map<String, dynamic>;
  }
}
