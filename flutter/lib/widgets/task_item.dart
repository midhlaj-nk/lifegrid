import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intl/intl.dart';

import '../core/models/task.dart';
import '../core/providers/tasks_provider.dart';

class TaskItemWidget extends ConsumerStatefulWidget {
  const TaskItemWidget({
    super.key,
    required this.task,
    this.onRefresh,
  });

  final Task task;
  final Future<void> Function()? onRefresh;

  @override
  ConsumerState<TaskItemWidget> createState() => _TaskItemWidgetState();
}

class _TaskItemWidgetState extends ConsumerState<TaskItemWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _checkController;
  late Animation<double> _scaleAnimation;
  bool _optimisticDone = false;
  bool _animating = false;

  @override
  void initState() {
    super.initState();
    _optimisticDone = widget.task.isDone;
    _checkController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 1.3)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.3, end: 1.0)
            .chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_checkController);
  }

  @override
  void didUpdateWidget(TaskItemWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.task.isDone != widget.task.isDone && !_animating) {
      _optimisticDone = widget.task.isDone;
    }
  }

  @override
  void dispose() {
    _checkController.dispose();
    super.dispose();
  }

  Future<void> _toggle() async {
    if (_animating) return;
    _animating = true;
    setState(() => _optimisticDone = !_optimisticDone);
    await _checkController.forward(from: 0);
    _animating = false;
    try {
      await ref.read(tasksProvider.notifier).toggle(widget.task.id);
      widget.onRefresh?.call();
    } catch (_) {
      // Revert optimistic update on error
      if (mounted) setState(() => _optimisticDone = !_optimisticDone);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete task'),
        content: Text('Delete "${widget.task.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(tasksProvider.notifier).delete(widget.task.id);
      widget.onRefresh?.call();
    }
  }

  Future<void> _postponeToTomorrow() async {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final dateStr = DateFormat('yyyy-MM-dd').format(tomorrow);
    await ref
        .read(tasksProvider.notifier)
        .updateTask(widget.task.id, {'dueDate': dateStr});
    widget.onRefresh?.call();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final task = widget.task;

    return Slidable(
      key: ValueKey(task.id),
      startActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.25,
        children: [
          SlidableAction(
            onPressed: (_) => _toggle(),
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            icon: Icons.check_circle,
            label: _optimisticDone ? 'Undo' : 'Done',
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(12),
              bottomLeft: Radius.circular(12),
            ),
          ),
        ],
      ),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        extentRatio: 0.5,
        children: [
          SlidableAction(
            onPressed: (_) => _postponeToTomorrow(),
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            icon: Icons.calendar_today,
            label: 'Tomorrow',
          ),
          SlidableAction(
            onPressed: (_) => _delete(),
            backgroundColor: Colors.red,
            foregroundColor: Colors.white,
            icon: Icons.delete,
            label: 'Delete',
            borderRadius: const BorderRadius.only(
              topRight: Radius.circular(12),
              bottomRight: Radius.circular(12),
            ),
          ),
        ],
      ),
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
        color: theme.colorScheme.surface,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Circular checkbox with scale animation
              ScaleTransition(
                scale: _scaleAnimation,
                child: GestureDetector(
                  onTap: _toggle,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _optimisticDone
                          ? theme.colorScheme.primary
                          : Colors.transparent,
                      border: Border.all(
                        color: _optimisticDone
                            ? theme.colorScheme.primary
                            : theme.colorScheme.outline,
                        width: 2,
                      ),
                    ),
                    child: _optimisticDone
                        ? const Icon(Icons.check,
                            size: 14, color: Colors.white)
                        : null,
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Title
                    Text(
                      task.title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        decoration: _optimisticDone
                            ? TextDecoration.lineThrough
                            : null,
                        color: _optimisticDone
                            ? theme.colorScheme.onSurface.withOpacity(0.45)
                            : null,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),

                    // Subtitle metadata row
                    _MetadataRow(task: task),
                  ],
                ),
              ),

              // Three-dot menu
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.more_vert,
                  size: 18,
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
                padding: EdgeInsets.zero,
                onSelected: (value) {
                  if (value == 'delete') {
                    _delete();
                  }
                  // 'edit' could navigate to task edit screen
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit_outlined, size: 16),
                        SizedBox(width: 8),
                        Text('Edit'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline,
                            size: 16, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Delete',
                            style: TextStyle(color: Colors.red)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Metadata row: due date, priority, project, tags
// ---------------------------------------------------------------------------

class _MetadataRow extends StatelessWidget {
  const _MetadataRow({required this.task});

  final Task task;

  Color _priorityColor(int p) {
    switch (p) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.amber;
      case 3:
        return Colors.blue;
      default:
        return Colors.transparent;
    }
  }

  Color _parseColor(String? hex, Color fallback) {
    if (hex == null || hex.isEmpty) return fallback;
    try {
      final h = hex.replaceFirst('#', '');
      if (h.length == 6) {
        return Color(int.parse('FF$h', radix: 16));
      } else if (h.length == 8) {
        return Color(int.parse(h, radix: 16));
      }
    } catch (_) {}
    return fallback;
  }

  bool _isOverdue(String? dueDate) {
    if (dueDate == null) return false;
    try {
      final parts = dueDate.split('-');
      if (parts.length != 3) return false;
      final due = DateTime(
        int.parse(parts[0]),
        int.parse(parts[1]),
        int.parse(parts[2]),
      );
      final today = DateTime.now();
      final todayOnly = DateTime(today.year, today.month, today.day);
      return due.isBefore(todayOnly);
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = this.task;
    final theme = Theme.of(context);
    final baseStyle = theme.textTheme.labelSmall?.copyWith(
      color: theme.colorScheme.onSurface.withOpacity(0.55),
    );

    final items = <Widget>[];

    // Due date
    if (task.dueDate != null) {
      final overdue = _isOverdue(task.dueDate);
      String label;
      try {
        final parts = task.dueDate!.split('-');
        final dt = DateTime(
          int.parse(parts[0]),
          int.parse(parts[1]),
          int.parse(parts[2]),
        );
        label = DateFormat('MMM d').format(dt);
      } catch (_) {
        label = task.dueDate!;
      }
      items.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.calendar_today_outlined,
            size: 11,
            color: overdue ? Colors.red : null,
          ),
          const SizedBox(width: 2),
          Text(
            label,
            style: baseStyle?.copyWith(
              color: overdue ? Colors.red : null,
              fontWeight: overdue ? FontWeight.w600 : null,
            ),
          ),
        ],
      ));
    }

    // Priority flag (only 1-3)
    if (task.priority >= 1 && task.priority <= 3) {
      items.add(Icon(
        Icons.flag,
        size: 13,
        color: _priorityColor(task.priority),
      ));
    }

    // Project
    if (task.projectName != null) {
      final dot = _parseColor(
          task.projectColor, theme.colorScheme.primary);
      items.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 3),
          Text(task.projectName!, style: baseStyle),
        ],
      ));
    }

    // Tags
    for (final tag in task.tags) {
      final tagColor =
          _parseColor(tag.color, theme.colorScheme.secondary);
      items.add(Text(
        '#${tag.name}',
        style: baseStyle?.copyWith(color: tagColor),
      ));
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 3),
      child: Wrap(
        spacing: 8,
        runSpacing: 2,
        children: items,
      ),
    );
  }
}
