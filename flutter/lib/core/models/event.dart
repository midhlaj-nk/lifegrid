class AppEvent {
  final String id;
  final String userId;
  final String title;
  final String date;
  final bool yearlyRecurring;
  final String? color;
  final String? icon;
  final String? note;
  final String createdAt;

  const AppEvent({
    required this.id,
    required this.userId,
    required this.title,
    required this.date,
    required this.yearlyRecurring,
    this.color,
    this.icon,
    this.note,
    required this.createdAt,
  });

  factory AppEvent.fromJson(Map<String, dynamic> json) {
    return AppEvent(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      date: json['date'] as String,
      yearlyRecurring:
          json['yearlyRecurring'] == true || json['yearlyRecurring'] == 1,
      color: json['color'] as String?,
      icon: json['icon'] as String?,
      note: json['note'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'title': title,
      'date': date,
      'yearlyRecurring': yearlyRecurring,
      'color': color,
      'icon': icon,
      'note': note,
      'createdAt': createdAt,
    };
  }
}
