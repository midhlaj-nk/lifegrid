import 'package:flutter/material.dart';

class PriorityBadge extends StatelessWidget {
  const PriorityBadge({super.key, required this.priority});

  final int priority;

  @override
  Widget build(BuildContext context) {
    switch (priority) {
      case 1:
        return const Icon(Icons.flag, color: Colors.red, size: 16);
      case 2:
        return const Icon(Icons.flag, color: Colors.amber, size: 16);
      case 3:
        return const Icon(Icons.flag, color: Colors.blue, size: 16);
      default:
        return const SizedBox.shrink();
    }
  }
}
