import 'package:flutter/material.dart';

class PrioritySelector extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;

  const PrioritySelector({
    super.key,
    required this.selected,
    required this.onChanged,
  });

  static const _priorities = [
    (label: 'P1', color: Colors.red, value: 1),
    (label: 'P2', color: Colors.orange, value: 2),
    (label: 'P3', color: Colors.blue, value: 3),
    (label: 'None', color: Colors.grey, value: 0),
  ];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: _priorities.map((p) {
        final isSelected = selected == p.value;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.only(right: 6),
            child: GestureDetector(
              onTap: () => onChanged(p.value),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? p.color.withValues(alpha: 0.2)
                      : Colors.transparent,
                  border: Border.all(
                    color: isSelected
                        ? p.color
                        : Colors.grey.withValues(alpha: 0.3),
                    width: isSelected ? 1.5 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    p.label,
                    style: TextStyle(
                      color: isSelected ? p.color : Colors.grey,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
