import 'task.dart';
import 'habit.dart';
import 'event.dart';

class TodayStats {
  final int total;
  final int done;
  final double pct;

  const TodayStats({
    required this.total,
    required this.done,
    required this.pct,
  });

  factory TodayStats.fromJson(Map<String, dynamic> json) {
    return TodayStats(
      total: (json['total'] as num?)?.toInt() ?? 0,
      done: (json['done'] as num?)?.toInt() ?? 0,
      pct: (json['pct'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total': total,
      'done': done,
      'pct': pct,
    };
  }
}

class TodayData {
  final List<Task> tasks;
  final List<Task> dueToday;
  final List<Task> overdue;
  final List<Task> doneToday;
  final List<Habit> habits;
  final List<AppEvent> events;
  final int overdueCount;
  final int completedToday;
  final int totalToday;
  final TodayStats stats;

  const TodayData({
    required this.tasks,
    required this.dueToday,
    required this.overdue,
    required this.doneToday,
    required this.habits,
    required this.events,
    required this.overdueCount,
    required this.completedToday,
    required this.totalToday,
    required this.stats,
  });

  factory TodayData.fromJson(Map<String, dynamic> json) {
    List<Task> parseTasks(dynamic raw) {
      if (raw == null) return [];
      return (raw as List<dynamic>)
          .map((t) => Task.fromJson(t as Map<String, dynamic>))
          .toList();
    }

    List<Habit> parsedHabits = [];
    if (json['habits'] != null) {
      parsedHabits = (json['habits'] as List<dynamic>)
          .map((h) => Habit.fromJson(h as Map<String, dynamic>))
          .toList();
    }

    List<AppEvent> parsedEvents = [];
    if (json['events'] != null) {
      parsedEvents = (json['events'] as List<dynamic>)
          .map((e) => AppEvent.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    final parsedDueToday = parseTasks(json['dueToday']);
    final parsedOverdue = parseTasks(json['overdue']);
    final parsedDoneToday = parseTasks(json['doneToday']);
    // Support both flat 'tasks' and the dueToday/overdue/doneToday split
    final parsedTasks = json['tasks'] != null
        ? parseTasks(json['tasks'])
        : [...parsedDueToday, ...parsedOverdue, ...parsedDoneToday];

    final statsJson =
        json['stats'] as Map<String, dynamic>? ?? {};

    return TodayData(
      tasks: parsedTasks,
      dueToday: parsedDueToday,
      overdue: parsedOverdue,
      doneToday: parsedDoneToday,
      habits: parsedHabits,
      events: parsedEvents,
      overdueCount: (json['overdueCount'] as num?)?.toInt() ??
          parsedOverdue.length,
      completedToday: (json['completedToday'] as num?)?.toInt() ??
          parsedDoneToday.length,
      totalToday: (json['totalToday'] as num?)?.toInt() ?? parsedTasks.length,
      stats: TodayStats.fromJson(statsJson),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'tasks': tasks.map((t) => t.toJson()).toList(),
      'dueToday': dueToday.map((t) => t.toJson()).toList(),
      'overdue': overdue.map((t) => t.toJson()).toList(),
      'doneToday': doneToday.map((t) => t.toJson()).toList(),
      'habits': habits.map((h) => h.toJson()).toList(),
      'events': events.map((e) => e.toJson()).toList(),
      'overdueCount': overdueCount,
      'completedToday': completedToday,
      'totalToday': totalToday,
      'stats': stats.toJson(),
    };
  }
}
