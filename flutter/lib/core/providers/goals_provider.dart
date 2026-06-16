import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/goal.dart';

// ---------------------------------------------------------------------------
// GoalsApi
// ---------------------------------------------------------------------------

class GoalsApi {
  final ApiClient _client;

  GoalsApi(this._client);

  Future<List<Goal>> getGoals() async {
    try {
      final response = await _client.get('/goals');
      final data = response.data as Map<String, dynamic>;
      final list = data['goals'] as List<dynamic>? ?? [];
      return list
          .map((g) => Goal.fromJson(g as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createGoal(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/goals', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateGoal(String id, Map<String, dynamic> body) async {
    try {
      await _client.put('/goals/$id', data: body);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteGoal(String id) async {
    try {
      await _client.delete('/goals/$id');
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final goalsApiProvider = Provider<GoalsApi>((ref) {
  return GoalsApi(ApiClient());
});

// ---------------------------------------------------------------------------
// GoalsNotifier
// ---------------------------------------------------------------------------

class GoalsNotifier extends StateNotifier<AsyncValue<List<Goal>>> {
  final Ref _ref;

  GoalsNotifier(this._ref) : super(const AsyncLoading()) {
    load();
  }

  GoalsApi get _api => _ref.read(goalsApiProvider);

  Future<void> load() async {
    if (mounted) state = const AsyncLoading();
    try {
      final goals = await _api.getGoals();
      if (mounted) state = AsyncData(goals);
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> refresh() => load();

  Future<String?> create(Map<String, dynamic> body) async {
    try {
      final id = await _api.createGoal(body);
      await refresh();
      return id;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return null;
    }
  }

  Future<void> update(String id, Map<String, dynamic> body) async {
    try {
      await _api.updateGoal(id, body);
      await refresh();
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.deleteGoal(id);
      final current = state.value;
      if (current != null && mounted) {
        state = AsyncData(current.where((g) => g.id != id).toList());
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final goalsProvider =
    StateNotifierProvider<GoalsNotifier, AsyncValue<List<Goal>>>(
  (ref) => GoalsNotifier(ref),
);
