import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intl/intl.dart';
import '../../../core/models/task.dart';
import '../../../core/providers/tasks_provider.dart';

class TaskItemWidget extends ConsumerWidget {
  final Task task;
  final VoidCallback? onTap;

  const TaskItemWidget({
    super.key,
    required this.task,
    this.onTap,
  });

  Color _priorityColor(int priority) {
    switch (priority) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.orange;
      case 3:
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _priorityLabel(int priority) {
    switch (priority) {
      case 1:
        return 'P1';
      case 2:
        return 'P2';
      case 3:
        return 'P3';
      default:
        return '';
    }
  }

  Color? _projectColor(String? hex) {
    if (hex == null) return null;
    try {
      final cleaned = hex.replaceAll('#', '');
      if (cleaned.length == 6) {
        return Color(int.parse('FF$cleaned', radix: 16));
      }
      if (cleaned.length == 8) {
        return Color(int.parse(cleaned, radix: 16));
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDone = task.isDone;
    final isOverdue = task.isOverdue;

    return Slidable(
      key: ValueKey(task.id),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        children: [
          SlidableAction(
            onPressed: (_) {
              ref.read(tasksProvider.notifier).delete(task.id);
            },
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.delete_outline,
            label: 'Delete',
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(12),
              bottomRight: Radius.circular(12),
            ),
          ),
        ],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Checkbox
              GestureDetector(
                onTap: () {
                  ref.read(tasksProvider.notifier).toggle(task.id);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 22,
                  height: 22,
                  margin: const EdgeInsets.only(top: 1),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isDone
                          ? colorScheme.primary
                          : (isOverdue ? Colors.red : colorScheme.outline),
                      width: 2,
                    ),
                    color: isDone ? colorScheme.primary : Colors.transparent,
                  ),
                  child: isDone
                      ? Icon(
                          Icons.check,
                          size: 14,
                          color: colorScheme.onPrimary,
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 12),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        decoration:
                            isDone ? TextDecoration.lineThrough : null,
                        color: isDone
                            ? colorScheme.onSurface.withValues(alpha: 0.4)
                            : colorScheme.onSurface,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (task.note != null && task.note!.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        task.note!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        // Due date
                        if (task.dueDate != null) ...[
                          _Chip(
                            icon: Icons.calendar_today,
                            label: _formatDate(task.dueDate!),
                            color: isOverdue ? Colors.red : Colors.grey,
                          ),
                        ],
                        // Priority badge
                        if (task.priority > 0 && task.priority <= 3)
                          _Chip(
                            label: _priorityLabel(task.priority),
                            color: _priorityColor(task.priority),
                          ),
                        // Project badge
                        if (task.projectName != null)
                          _Chip(
                            icon: Icons.folder_outlined,
                            label: task.projectName!,
                            color:
                                _projectColor(task.projectColor) ?? Colors.grey,
                          ),
                        // Tags
                        ...task.tags.map(
                          (tag) => _Chip(
                            label: tag.name,
                            color:
                                _projectColor(tag.color) ?? Colors.blueGrey,
                          ),
                        ),
                      ],
                    ),
                    // Subtasks indicator
                    if (task.subtasks.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.subdirectory_arrow_right,
                            size: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.4),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${task.subtasks.where((s) => s.isDone).length}/${task.subtasks.length} subtasks',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withValues(alpha: 0.4),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final parts = dateStr.split('-');
      if (parts.length != 3) return dateStr;
      final date = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
        int.parse(parts[2]),
      );
      final today = DateTime.now();
      final todayOnly =
          DateTime(today.year, today.month, today.day);
      final tomorrow = todayOnly.add(const Duration(days: 1));

      if (date == todayOnly) return 'Today';
      if (date == tomorrow) return 'Tomorrow';
      return DateFormat('MMM d').format(date);
    } catch (_) {
      return dateStr;
    }
  }
}

class _Chip extends StatelessWidget {
  final IconData? icon;
  final String label;
  final Color color;

  const _Chip({
    this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: color),
            const SizedBox(width: 3),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
