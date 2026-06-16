class FinCategory {
  final String id;
  final String userId;
  final String name;
  final String? icon;
  final String kind;

  const FinCategory({
    required this.id,
    required this.userId,
    required this.name,
    this.icon,
    required this.kind,
  });

  factory FinCategory.fromJson(Map<String, dynamic> json) {
    return FinCategory(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String?,
      kind: json['kind'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'icon': icon,
      'kind': kind,
    };
  }
}
