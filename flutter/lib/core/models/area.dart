class Area {
  final String id;
  final String userId;
  final String name;
  final String? color;
  final String? icon;
  final String? cover;
  final int sortOrder;
  final String createdAt;

  const Area({
    required this.id,
    required this.userId,
    required this.name,
    this.color,
    this.icon,
    this.cover,
    required this.sortOrder,
    required this.createdAt,
  });

  factory Area.fromJson(Map<String, dynamic> json) {
    return Area(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      color: json['color'] as String?,
      icon: json['icon'] as String?,
      cover: json['cover'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'color': color,
      'icon': icon,
      'cover': cover,
      'sortOrder': sortOrder,
      'createdAt': createdAt,
    };
  }
}
