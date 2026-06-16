class FinAccount {
  final String id;
  final String userId;
  final String name;
  final String type;
  final int openingBalanceMinor;
  final String? color;
  final bool archived;
  final String createdAt;

  const FinAccount({
    required this.id,
    required this.userId,
    required this.name,
    required this.type,
    required this.openingBalanceMinor,
    this.color,
    required this.archived,
    required this.createdAt,
  });

  double get openingBalance => openingBalanceMinor / 100.0;

  factory FinAccount.fromJson(Map<String, dynamic> json) {
    return FinAccount(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      openingBalanceMinor:
          (json['openingBalanceMinor'] as num?)?.toInt() ?? 0,
      color: json['color'] as String?,
      archived: json['archived'] == true || json['archived'] == 1,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'type': type,
      'openingBalanceMinor': openingBalanceMinor,
      'color': color,
      'archived': archived,
      'createdAt': createdAt,
    };
  }
}
