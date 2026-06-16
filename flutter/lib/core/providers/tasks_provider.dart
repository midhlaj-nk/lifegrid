import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/task.dart';
import '../models/today_data.dart';

// ---------------------------------------------------------------------------
// TasksApi
// ---------------------------------------------------------------------------

class TasksApi {
  final ApiClient _client;

  TasksApi(this._client);

  Future<List<Task>> getTasks({
    String? status,
    String? dueDate,
    String? search,
  }) async {
    try {
      final query = <String, dynamic>{};
      if (status != null) query['status'] = status;
      if (dueDate != null) query['dueDate'] = dueDate;
      if (search != null) query['search'] = search;

      final response = await _client.get(
        '/tasks',
        queryParameters: query.isEmpty ? null : query,
      );

      final data = response.data as Map<String, dynamic>;
      final list = data['tasks'] as List<dynamic>? ?? [];
      return list
          .map((t) => Task.fromJson(t as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<TodayData> getToday() async {
    try {
      final response = await _client.get('/today');
      return TodayData.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  Future<Task?> getTask(String id) async {
    try {
      final response = await _client.get('/tasks/$id');
      final data = response.data;
      if (data == null) return null;
      return Task.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createTask(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/tasks', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateTask(String id, Map<String, dynamic> body) async {
    try {
      await _client.put('/tasks/$id', data: body);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteTask(String id) async {
    try {
      await _client.delete('/tasks/$id');
    } catch (e) {
      rethrow;
    }
  }

  Future<void> toggleTask(String id) async {
    try {
      await _client.post('/tasks/$id/toggle');
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final tasksApiProvider = Provider<TasksApi>((ref) {
  return TasksApi(ApiClient());
});

// ---------------------------------------------------------------------------
// TodayProvider
// ---------------------------------------------------------------------------

final todayProvider = FutureProvider<TodayData>((ref) async {
  return ref.read(tasksApiProvider).getToday();
});

// ---------------------------------------------------------------------------
// TasksNotifier
// ---------------------------------------------------------------------------

class TasksNotifier extends StateNotifier<AsyncValue<List<Task>>> {
  final Ref _ref;

  TasksNotifier(this._ref) : super(const AsyncLoading()) {
    load();
  }

  TasksApi get _api => _ref.read(tasksApiProvider);

  Future<void> load({
    String? status,
    String? dueDate,
    String? search,
  }) async {
    if (mounted) state = const AsyncLoading();
    try {
      final tasks = await _api.getTasks(
        status: status,
        dueDate: dueDate,
        search: search,
      );
      if (mounted) state = AsyncData(tasks);
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> refresh() => load();

  Future<void> toggle(String id) async {
    try {
      await _api.toggleTask(id);
      // Refresh after toggle to get updated state from server
      final current = state.value;
      if (current != null) {
        final updated = current.map((t) {
          if (t.id == id) {
            final newStatus = t.status == 'done' ? 'todo' : 'done';
            return Task.fromJson({...t.toJson(), 'status': newStatus});
          }
          return t;
        }).toList();
        if (mounted) state = AsyncData(updated);
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.deleteTask(id);
      final current = state.value;
      if (current != null && mounted) {
        state = AsyncData(current.where((t) => t.id != id).toList());
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<String> createTask(Map<String, dynamic> body) async {
    try {
      final id = await _api.createTask(body);
      await load();
      return id;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<void> updateTask(String id, Map<String, dynamic> body) async {
    try {
      await _api.updateTask(id, body);
      final current = state.value;
      if (current != null) {
        final updated = current.map((t) {
          if (t.id == id) {
            final json = {...t.toJson(), ...body};
            return Task.fromJson(json);
          }
          return t;
        }).toList();
        if (mounted) state = AsyncData(updated);
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final tasksProvider =
    StateNotifierProvider<TasksNotifier, AsyncValue<List<Task>>>(
  (ref) => TasksNotifier(ref),
);
