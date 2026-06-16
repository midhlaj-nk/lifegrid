import 'package:intl/intl.dart';

extension DateTimeExtensions on DateTime {
  String get apiDate => DateFormat('yyyy-MM-dd').format(this);
}

extension StringExtensions on String {
  DateTime? get parsedDate {
    try {
      return DateTime.parse(this);
    } catch (_) {
      return null;
    }
  }
}

extension IntExtensions on int {
  /// Formats paise (1/100 of a rupee) as ₹X.XX
  String get currencyDisplay {
    final rupees = this / 100.0;
    return '₹${rupees.toStringAsFixed(2)}';
  }
}
