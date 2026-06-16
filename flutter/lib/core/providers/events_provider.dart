import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/event.dart';

// ---------------------------------------------------------------------------
// EventsApi
// ---------------------------------------------------------------------------

class EventsApi {
  final ApiClient _client;

  EventsApi(this._client);

  Future<List<AppEvent>> getEvents({
    String? startDate,
    String? endDate,
  }) async {
    try {
      final query = <String, dynamic>{};
      if (startDate != null) query['startDate'] = startDate;
      if (endDate != null) query['endDate'] = endDate;

      final response = await _client.get(
        '/events',
        queryParameters: query.isEmpty ? null : query,
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['events'] as List<dynamic>? ?? [];
      return list
          .map((e) => AppEvent.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<String> createEvent(Map<String, dynamic> body) async {
    try {
      final response = await _client.post('/events', data: body);
      final data = response.data as Map<String, dynamic>;
      return data['id'] as String;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateEvent(String id, Map<String, dynamic> body) async {
    try {
      await _client.put('/events/$id', data: body);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteEvent(String id) async {
    try {
      await _client.delete('/events/$id');
    } catch (e) {
      rethrow;
    }
  }
}

// ---------------------------------------------------------------------------
// API provider
// ---------------------------------------------------------------------------

final eventsApiProvider = Provider<EventsApi>((ref) {
  return EventsApi(ApiClient());
});

// ---------------------------------------------------------------------------
// EventsNotifier
// ---------------------------------------------------------------------------

class EventsNotifier extends StateNotifier<AsyncValue<List<AppEvent>>> {
  final Ref _ref;

  EventsNotifier(this._ref) : super(const AsyncLoading()) {
    load();
  }

  EventsApi get _api => _ref.read(eventsApiProvider);

  Future<void> load({String? startDate, String? endDate}) async {
    if (mounted) state = const AsyncLoading();
    try {
      final events = await _api.getEvents(
        startDate: startDate,
        endDate: endDate,
      );
      if (mounted) state = AsyncData(events);
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> refresh() => load();

  Future<String?> create(Map<String, dynamic> body) async {
    try {
      final id = await _api.createEvent(body);
      await refresh();
      return id;
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
      return null;
    }
  }

  Future<void> update(String id, Map<String, dynamic> body) async {
    try {
      await _api.updateEvent(id, body);
      await refresh();
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }

  Future<void> delete(String id) async {
    try {
      await _api.deleteEvent(id);
      final current = state.value;
      if (current != null && mounted) {
        state = AsyncData(current.where((e) => e.id != id).toList());
      }
    } catch (e, st) {
      if (mounted) state = AsyncError(e, st);
    }
  }
}

// ---------------------------------------------------------------------------
// State provider
// ---------------------------------------------------------------------------

final eventsProvider =
    StateNotifierProvider<EventsNotifier, AsyncValue<List<AppEvent>>>(
  (ref) => EventsNotifier(ref),
);
