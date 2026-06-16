import 'dart:convert';

class Project {
  final String id;
  final String userId;
  final String? areaId;
  final String name;
  final String? color;
  final int sortOrder;
  final bool archived;
  final List<String> kanbanColumns;
  final String? cover;
  final String createdAt;

  const Project({
    required this.id,
    required this.userId,
    this.areaId,
    required this.name,
    this.color,
    required this.sortOrder,
    required this.archived,
    required this.kanbanColumns,
    this.cover,
    required this.createdAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    List<String> parsedColumns = [];
    final raw = json['kanbanColumns'];
    if (raw != null) {
      if (raw is String) {
        try {
          final decoded = jsonDecode(raw);
          if (decoded is List) {
            parsedColumns = decoded.map((e) => e.toString()).toList();
          }
        } catch (_) {
          parsedColumns = [];
        }
      } else if (raw is List) {
        parsedColumns = raw.map((e) => e.toString()).toList();
      }
    }

    return Project(
      id: json['id'] as String,
      userId: json['userId'] as String,
      areaId: json['areaId'] as String?,
      name: json['name'] as String,
      color: json['color'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      archived: json['archived'] == true || json['archived'] == 1,
      kanbanColumns: parsedColumns,
      cover: json['cover'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'areaId': areaId,
      'name': name,
      'color': color,
      'sortOrder': sortOrder,
      'archived': archived,
      'kanbanColumns': kanbanColumns,
      'cover': cover,
      'createdAt': createdAt,
    };
  }
}
