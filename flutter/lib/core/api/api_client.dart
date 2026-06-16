import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:cookie_jar/cookie_jar.dart';
import 'package:path_provider/path_provider.dart';
import '../constants.dart';

class ApiClient {
  static ApiClient? _instance;
  late final Dio _dio;
  late final PersistCookieJar _cookieJar;

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
  }

  Dio get rawDio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return _dio.put(path, data: data);
  }

  Future<Response> delete(String path) async {
    return _dio.delete(path);
  }
}
