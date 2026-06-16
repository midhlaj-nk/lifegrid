class FinTransaction {
  final String id;
  final String userId;
  final String accountId;
  final String? categoryId;
  final String type;
  final int amountMinor;
  final int? originalAmount;
  final String? originalCurrency;
  final String date;
  final String? note;
  final String? transferToAccountId;
  final String createdAt;

  const FinTransaction({
    required this.id,
    required this.userId,
    required this.accountId,
    this.categoryId,
    required this.type,
    required this.amountMinor,
    this.originalAmount,
    this.originalCurrency,
    required this.date,
    this.note,
    this.transferToAccountId,
    required this.createdAt,
  });

  double get amount => amountMinor / 100.0;

  factory FinTransaction.fromJson(Map<String, dynamic> json) {
    return FinTransaction(
      id: json['id'] as String,
      userId: json['userId'] as String,
      accountId: json['accountId'] as String,
      categoryId: json['categoryId'] as String?,
      type: json['type'] as String,
      amountMinor: (json['amountMinor'] as num).toInt(),
      originalAmount: (json['originalAmount'] as num?)?.toInt(),
      originalCurrency: json['originalCurrency'] as String?,
      date: json['date'] as String,
      note: json['note'] as String?,
      transferToAccountId: json['transferToAccountId'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'accountId': accountId,
      'categoryId': categoryId,
      'type': type,
      'amountMinor': amountMinor,
      'originalAmount': originalAmount,
      'originalCurrency': originalCurrency,
      'date': date,
      'note': note,
      'transferToAccountId': transferToAccountId,
      'createdAt': createdAt,
    };
  }
}
