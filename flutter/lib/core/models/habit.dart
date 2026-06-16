class Habit {
  final String id;
  final String userId;
  final String name;
  final String? description;
  final String? color;
  final String? icon;
  final String frequency;
  final bool checkedToday;
  final int streak;
  final String createdAt;

  const Habit({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    this.color,
    this.icon,
    required this.frequency,
    required this.checkedToday,
    required this.streak,
    required this.createdAt,
  });

  Habit copyWith({bool? checkedToday, int? streak}) {
    return Habit(
      id: id,
      userId: userId,
      name: name,
      description: description,
      color: color,
      icon: icon,
      frequency: frequency,
      checkedToday: checkedToday ?? this.checkedToday,
      streak: streak ?? this.streak,
      createdAt: createdAt,
    );
  }

  factory Habit.fromJson(Map<String, dynamic> json) {
    return Habit(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      color: json['color'] as String?,
      icon: json['icon'] as String?,
      frequency: json['frequency'] as String? ?? 'daily',
      checkedToday: json['checkedToday'] == true || json['checkedToday'] == 1,
      streak: (json['streak'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'description': description,
      'color': color,
      'icon': icon,
      'frequency': frequency,
      'checkedToday': checkedToday,
      'streak': streak,
      'createdAt': createdAt,
    };
  }
}
