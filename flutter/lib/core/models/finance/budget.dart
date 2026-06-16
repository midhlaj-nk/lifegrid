class FinBudget {
  final String id;
  final String userId;
  final String categoryId;
  final String? categoryName;
  final String? categoryIcon;
  final int monthlyLimitMinor;

  const FinBudget({
    required this.id,
    required this.userId,
    required this.categoryId,
    this.categoryName,
    this.categoryIcon,
    required this.monthlyLimitMinor,
  });

  double get monthlyLimit => monthlyLimitMinor / 100.0;

  factory FinBudget.fromJson(Map<String, dynamic> json) {
    return FinBudget(
      id: json['id'] as String,
      userId: json['userId'] as String,
      categoryId: json['categoryId'] as String,
      categoryName: json['categoryName'] as String?,
      categoryIcon: json['categoryIcon'] as String?,
      monthlyLimitMinor: (json['monthlyLimitMinor'] as num).toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'categoryId': categoryId,
      'categoryName': categoryName,
      'categoryIcon': categoryIcon,
      'monthlyLimitMinor': monthlyLimitMinor,
    };
  }
}
