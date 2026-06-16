class Note {
  final String id;
  final String userId;
  final String? parentId;
  final String title;
  final String? icon;
  final String? cover;
  final dynamic content;
  final dynamic canvas;
  final String mode;
  final int sortOrder;
  final String createdAt;
  final String updatedAt;

  const Note({
    required this.id,
    required this.userId,
    this.parentId,
    required this.title,
    this.icon,
    this.cover,
    this.content,
    this.canvas,
    required this.mode,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['id'] as String,
      userId: json['userId'] as String,
      parentId: json['parentId'] as String?,
      title: json['title'] as String,
      icon: json['icon'] as String?,
      cover: json['cover'] as String?,
      content: json['content'],
      canvas: json['canvas'],
      mode: json['mode'] as String? ?? 'page',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'parentId': parentId,
      'title': title,
      'icon': icon,
      'cover': cover,
      'content': content,
      'canvas': canvas,
      'mode': mode,
      'sortOrder': sortOrder,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }
}
