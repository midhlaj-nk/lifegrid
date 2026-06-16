class FinSubscription {
  final String id;
  final String userId;
  final String name;
  final int amountMinor;
  final String accountId;
  final String? categoryId;
  final String cadence;
  final String nextDueDate;
  final bool active;
  final bool autoLog;
  final String createdAt;

  const FinSubscription({
    required this.id,
    required this.userId,
    required this.name,
    required this.amountMinor,
    required this.accountId,
    this.categoryId,
    required this.cadence,
    required this.nextDueDate,
    required this.active,
    required this.autoLog,
    required this.createdAt,
  });

  double get amount => amountMinor / 100.0;

  factory FinSubscription.fromJson(Map<String, dynamic> json) {
    return FinSubscription(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      amountMinor: (json['amountMinor'] as num).toInt(),
      accountId: json['accountId'] as String,
      categoryId: json['categoryId'] as String?,
      cadence: json['cadence'] as String,
      nextDueDate: json['nextDueDate'] as String,
      active: json['active'] == true || json['active'] == 1,
      autoLog: json['autoLog'] == true || json['autoLog'] == 1,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'amountMinor': amountMinor,
      'accountId': accountId,
      'categoryId': categoryId,
      'cadence': cadence,
      'nextDueDate': nextDueDate,
      'active': active,
      'autoLog': autoLog,
      'createdAt': createdAt,
    };
  }
}
