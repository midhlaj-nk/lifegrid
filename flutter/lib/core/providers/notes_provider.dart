import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/note.dart';

// ---------------------------------------------------------------------------
// NotesApi
// ---------------------------------------------------------------------------

class NotesApi {
  final ApiClient _client;

  NotesApi(this._client);

  Future<List<Note>> getNotes({String? parentId}) async {
    try {
      final query = <String, dynamic>{};
      if (parentId != null) query['parentId'] = parentId;

      final response = await _client.get(
        '/notes',
        queryParameters: query.isEmpty ? null : query,
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['notes'] as List<dynamic>? ?? [];
      return list
          .map((n) => Note.fromJson(n as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Note?> getNote(String id) async {
    try {
      final response = await _client.get('/notes/$id');
      final data = response.data;
      if (data == null) return null;
      return Note.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createNote(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/notes', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateNote(String id, Map<String, dynamic> body) async {
    try {
      await _client.put('/notes/$id', data: body);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteNote(String id) async {
    try {
      await _client.delete('/notes/$id');
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final notesApiProvider = Provider<NotesApi>((ref) {
  return NotesApi(ApiClient());
});

// ---------------------------------------------------------------------------
// NotesNotifier
// ---------------------------------------------------------------------------

class NotesNotifier extends StateNotifier<AsyncValue<List<Note>>> {
  final Ref _ref;

  NotesNotifier(this._ref) : super(const AsyncLoading()) {
    load();
  }

  NotesApi get _api => _ref.read(notesApiProvider);

  Future<void> load({String? parentId}) async {
    if (mounted) state = const AsyncLoading();
    try {
      final notes = await _api.getNotes(parentId: parentId);
      if (mounted) state = AsyncData(notes);
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> refresh() => load();

  Future<String?> create(Map<String, dynamic> body) async {
    try {
      final id = await _api.createNote(body);
      await refresh();
      return id;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return null;
    }
  }

  Future<void> update(String id, Map<String, dynamic> body) async {
    try {
      await _api.updateNote(id, body);
      final current = state.value;
      if (current != null) {
        // Refresh from server to get accurate updated data
        await refresh();
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.deleteNote(id);
      final current = state.value;
      if (current != null && mounted) {
        state = AsyncData(current.where((n) => n.id != id).toList());
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final notesProvider =
    StateNotifierProvider<NotesNotifier, AsyncValue<List<Note>>>(
  (ref) => NotesNotifier(ref),
);
