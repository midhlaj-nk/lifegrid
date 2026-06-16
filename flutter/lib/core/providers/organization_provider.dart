import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/area.dart';
import '../models/project.dart';
import '../models/tag.dart';

// ---------------------------------------------------------------------------
// OrganizationApi
// ---------------------------------------------------------------------------

class OrganizationApi {
  final ApiClient _client;

  OrganizationApi(this._client);

  // Areas ------------------------------------------------------------------

  Future<List<Area>> getAreas() async {
    try {
      final response = await _client.get('/areas');
      final data = response.data as Map<String, dynamic>;
      final list = data['areas'] as List<dynamic>? ?? [];
      return list
          .map((a) => Area.fromJson(a as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createArea(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/areas', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteArea(String id) async {
    try {
      await _client.delete('/areas/$id');
    } catch (e) {
      rethrow;
    }
  }

  // Projects ---------------------------------------------------------------

  Future<List<Project>> getProjects({String? areaId}) async {
    try {
      final query = <String, dynamic>{};
      if (areaId != null) query['areaId'] = areaId;

      final response = await _client.get(
        '/projects',
        queryParameters: query.isEmpty ? null : query,
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['projects'] as List<dynamic>? ?? [];
      return list
          .map((p) => Project.fromJson(p as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createProject(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/projects', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteProject(String id) async {
    try {
      await _client.delete('/projects/$id');
    } catch (e) {
      rethrow;
    }
  }

  // Tags -------------------------------------------------------------------

  Future<List<Tag>> getTags() async {
    try {
      final response = await _client.get('/tags');
      final data = response.data as Map<String, dynamic>;
      final list = data['tags'] as List<dynamic>? ?? [];
      return list
          .map((t) => Tag.fromJson(t as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createTag(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/tags', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteTag(String id) async {
    try {
      await _client.delete('/tags/$id');
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final organizationApiProvider = Provider<OrganizationApi>((ref) {
  return OrganizationApi(ApiClient());
});

// ---------------------------------------------------------------------------
// FutureProviders
// ---------------------------------------------------------------------------

final areasProvider = FutureProvider<List<Area>>((ref) async {
  return ref.read(organizationApiProvider).getAreas();
});

final projectsProvider = FutureProvider<List<Project>>((ref) async {
  return ref.read(organizationApiProvider).getProjects();
});

final tagsProvider = FutureProvider<List<Tag>>((ref) async {
  return ref.read(organizationApiProvider).getTags();
});
