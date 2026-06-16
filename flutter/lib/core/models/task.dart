import 'dart:convert';

import 'tag.dart';

class Task {
  final String id;
  final String userId;
  final String? projectId;
  final String? areaId;
  final String? parentId;
  final String title;
  final String? note;
  final String status;
  final int priority;
  final String? dueDate;
  final String? dueTime;
  final String? reminderAt;
  final String? completedAt;
  final Map<String, dynamic>? recurrence;
  final int sortOrder;
  final String? kanbanColumn;
  final String createdAt;
  final String updatedAt;
  final List<Tag> tags;
  final List<Task> subtasks;
  final String? projectName;
  final String? projectColor;

  const Task({
    required this.id,
    required this.userId,
    this.projectId,
    this.areaId,
    this.parentId,
    required this.title,
    this.note,
    required this.status,
    required this.priority,
    this.dueDate,
    this.dueTime,
    this.reminderAt,
    this.completedAt,
    this.recurrence,
    required this.sortOrder,
    this.kanbanColumn,
    required this.createdAt,
    required this.updatedAt,
    this.tags = const [],
    this.subtasks = const [],
    this.projectName,
    this.projectColor,
  });

  bool get isDone => status == 'done';

  bool get isOverdue {
    if (isDone || dueDate == null) return false;
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    try {
      final parts = dueDate!.split('-');
      if (parts.length != 3) return false;
      final due = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
        int.parse(parts[2]),
      );
      return due.isBefore(todayOnly);
    } catch (_) {
      return false;
    }
  }

  factory Task.fromJson(Map<String, dynamic> json) {
    List<Tag> parsedTags = [];
    if (json['tags'] != null) {
      parsedTags = (json['tags'] as List<dynamic>)
          .map((t) => Tag.fromJson(t as Map<String, dynamic>))
          .toList();
    }

    List<Task> parsedSubtasks = [];
    if (json['subtasks'] != null) {
      parsedSubtasks = (json['subtasks'] as List<dynamic>)
          .map((s) => Task.fromJson(s as Map<String, dynamic>))
          .toList();
    }

    Map<String, dynamic>? parsedRecurrence;
    if (json['recurrence'] != null) {
      if (json['recurrence'] is String) {
        try {
          parsedRecurrence =
              jsonDecode(json['recurrence'] as String) as Map<String, dynamic>?;
        } catch (_) {
          parsedRecurrence = null;
        }
      } else if (json['recurrence'] is Map) {
        parsedRecurrence = Map<String, dynamic>.from(
            json['recurrence'] as Map);
      }
    }

    return Task(
      id: json['id'] as String,
      userId: json['userId'] as String,
      projectId: json['projectId'] as String?,
      areaId: json['areaId'] as String?,
      parentId: json['parentId'] as String?,
      title: json['title'] as String,
      note: json['note'] as String?,
      status: json['status'] as String? ?? 'todo',
      priority: (json['priority'] as num?)?.toInt() ?? 1,
      dueDate: json['dueDate'] as String?,
      dueTime: json['dueTime'] as String?,
      reminderAt: json['reminderAt'] as String?,
      completedAt: json['completedAt'] as String?,
      recurrence: parsedRecurrence,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      kanbanColumn: json['kanbanColumn'] as String?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      tags: parsedTags,
      subtasks: parsedSubtasks,
      projectName: json['projectName'] as String?,
      projectColor: json['projectColor'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'projectId': projectId,
      'areaId': areaId,
      'parentId': parentId,
      'title': title,
      'note': note,
      'status': status,
      'priority': priority,
      'dueDate': dueDate,
      'dueTime': dueTime,
      'reminderAt': reminderAt,
      'completedAt': completedAt,
      'recurrence': recurrence,
      'sortOrder': sortOrder,
      'kanbanColumn': kanbanColumn,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
      'tags': tags.map((t) => t.toJson()).toList(),
      'subtasks': subtasks.map((s) => s.toJson()).toList(),
      'projectName': projectName,
      'projectColor': projectColor,
    };
  }
}
