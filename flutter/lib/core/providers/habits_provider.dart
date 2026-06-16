import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/habit.dart';

// ---------------------------------------------------------------------------
// HabitsApi
// ---------------------------------------------------------------------------

class HabitsApi {
  final ApiClient _client;

  HabitsApi(this._client);

  Future<List<Habit>> getHabits() async {
    try {
      final response = await _client.get('/habits');
      final data = response.data as Map<String, dynamic>;
      final list = data['habits'] as List<dynamic>? ?? [];
      return list
          .map((h) => Habit.fromJson(h as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createHabit(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/habits', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteHabit(String id) async {
    try {
      await _client.delete('/habits/$id');
    } catch (e) {
      rethrow;
    }
  }

  /// Returns the new checked state.
  Future<bool> toggleCheck(String id) async {
    try {
      final response = await _client.post('/habits/$id/check');
      final data = response.data as Map<String, dynamic>;
      final checked = data['checked'];
      return checked == true || checked == 1;
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final habitsApiProvider = Provider<HabitsApi>((ref) {
  return HabitsApi(ApiClient());
});

// ---------------------------------------------------------------------------
// HabitsNotifier
// ---------------------------------------------------------------------------

class HabitsNotifier extends StateNotifier<AsyncValue<List<Habit>>> {
  final Ref _ref;

  HabitsNotifier(this._ref) : super(const AsyncLoading()) {
    load();
  }

  HabitsApi get _api => _ref.read(habitsApiProvider);

  Future<void> load() async {
    if (mounted) state = const AsyncLoading();
    try {
      final habits = await _api.getHabits();
      if (mounted) state = AsyncData(habits);
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> refresh() => load();

  Future<String?> create(Map<String, dynamic> body) async {
    try {
      final id = await _api.createHabit(body);
      await refresh();
      return id;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return null;
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.deleteHabit(id);
      final current = state.value;
      if (current != null && mounted) {
        state = AsyncData(current.where((h) => h.id != id).toList());
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  /// Optimistically toggles checkedToday, then confirms with the server response.
  Future<void> toggleCheck(String id) async {
    final current = state.value;
    if (current == null) return;

    // Optimistic update
    final optimistic = current.map((h) {
      if (h.id == id) return h.copyWith(checkedToday: !h.checkedToday);
      return h;
    }).toList();
    if (mounted) state = AsyncData(optimistic);

    try {
      final serverChecked = await _api.toggleCheck(id);
      // Reconcile with server value
      final reconciled = (state.value ?? optimistic).map((h) {
        if (h.id == id) return h.copyWith(checkedToday: serverChecked);
        return h;
      }).toList();
      if (mounted) state = AsyncData(reconciled);
    } catch (e, st) {
      // Revert optimistic update on failure
      if (mounted) state = AsyncData(current);
      if (mounted) state = AsyncError(e, st);
    }
  }
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final habitsProvider =
    StateNotifierProvider<HabitsNotifier, AsyncValue<List<Habit>>>(
  (ref) => HabitsNotifier(ref),
);
