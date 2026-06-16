class Tag {
  final String id;
  final String userId;
  final String name;
  final String? color;
  final String createdAt;

  const Tag({
    required this.id,
    required this.userId,
    required this.name,
    this.color,
    required this.createdAt,
  });

  factory Tag.fromJson(Map<String, dynamic> json) {
    return Tag(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      color: json['color'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'color': color,
      'createdAt': createdAt,
    };
  }
}
