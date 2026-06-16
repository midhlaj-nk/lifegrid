class Goal {
  final String id;
  final String userId;
  final String? projectId;
  final String title;
  final String? description;
  final String status;
  final int? targetValue;
  final int? currentValue;
  final String? unit;
  final String? dueDate;
  final String createdAt;
  final String updatedAt;

  const Goal({
    required this.id,
    required this.userId,
    this.projectId,
    required this.title,
    this.description,
    required this.status,
    this.targetValue,
    this.currentValue,
    this.unit,
    this.dueDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Goal.fromJson(Map<String, dynamic> json) {
    return Goal(
      id: json['id'] as String,
      userId: json['userId'] as String,
      projectId: json['projectId'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'active',
      targetValue: (json['targetValue'] as num?)?.toInt(),
      currentValue: (json['currentValue'] as num?)?.toInt(),
      unit: json['unit'] as String?,
      dueDate: json['dueDate'] as String?,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'projectId': projectId,
      'title': title,
      'description': description,
      'status': status,
      'targetValue': targetValue,
      'currentValue': currentValue,
      'unit': unit,
      'dueDate': dueDate,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
