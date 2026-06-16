import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import '../constants.dart';

class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  late final PersistCookieJar _cookieJar;
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  String? _authToken;

  ApiClient._internal();

  factory ApiClient() {
    _instance ??= ApiClient._internal();
    return _instance!;
  }

  static Future<void> init() async {
    final client = ApiClient();
    final appDocDir = await getApplicationDocumentsDirectory();
    client._cookieJar = PersistCookieJar(
      storage: FileStorage('${appDocDir.path}/.cookies/'),
    );
    client._dio = Dio(
      BaseOptions(
        baseUrl: kV1Base,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );
    client._dio.interceptors.add(CookieManager(client._cookieJar));

    // Inject Bearer token on every request if available
    client._dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (client._authToken != null) {
            options.headers['Authorization'] = 'Bearer ${client._authToken}';
          }
          handler.next(options);
        },
      ),
    );

    // Restore persisted token
    final saved = await _storage.read(key: _tokenKey);
    if (saved != null) client._authToken = saved;
  }

  Future<void> setAuthToken(String? token) async {
    _authToken = token;
    if (token != null) {
      await _storage.write(key: _tokenKey, value: token);
    } else {
      await _storage.delete(key: _tokenKey);
    }
  }

  bool get hasToken => _authToken != null;

  Dio get rawDio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) =>
      _dio.get(path, queryParameters: queryParameters);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> put(String path, {dynamic data}) =>
      _dio.put(path, data: data);

  Future<Response> delete(String path) => _dio.delete(path);
}
