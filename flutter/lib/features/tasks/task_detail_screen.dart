import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/area.dart';
import '../../core/models/project.dart';
import '../../core/models/tag.dart';
import '../../core/models/task.dart';
import '../../core/providers/organization_provider.dart';
import '../../core/providers/tasks_provider.dart';
import 'widgets/priority_selector.dart';

// ---------------------------------------------------------------------------
// Single-task provider
// ---------------------------------------------------------------------------

final _singleTaskProvider =
    FutureProvider.family<Task?, String>((ref, id) async {
  return ref.read(tasksApiProvider).getTask(id);
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class TaskDetailScreen extends ConsumerStatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _subtaskController = TextEditingController();
  final FocusNode _titleFocusNode = FocusNode();

  bool _initialized = false;
  Timer? _debounce;

  int _priority = 0;
  DateTime? _dueDate;
  TimeOfDay? _dueTime;
  String? _selectedProjectId;
  String? _selectedAreaId;
  Set<String> _selectedTagIds = {};
  List<Task> _subtasks = [];
  bool _isSaving = false;
  bool _isDone = false;

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    _subtaskController.dispose();
    _titleFocusNode.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _populateFromTask(Task task) {
    if (_initialized) return;
    _initialized = true;

    _titleController.text = task.title;
    _noteController.text = task.note ?? '';
    _priority = task.priority;
    _isDone = task.isDone;

    if (task.dueDate != null) {
      try {
        final parts = task.dueDate!.split('-');
        if (parts.length == 3) {
          _dueDate = DateTime(
            int.parse(parts[0]),
            int.parse(parts[1]),
            int.parse(parts[2]),
          );
        }
      } catch (_) {}
    }

    if (task.dueTime != null) {
      try {
        final timeParts = task.dueTime!.split(':');
        if (timeParts.length >= 2) {
          _dueTime = TimeOfDay(
            hour: int.parse(timeParts[0]),
            minute: int.parse(timeParts[1]),
          );
        }
      } catch (_) {}
    }

    _selectedProjectId = task.projectId;
    _selectedAreaId = task.areaId;
    _selectedTagIds = task.tags.map((t) => t.id).toSet();
    _subtasks = List<Task>.from(task.subtasks);
  }

  void _scheduleAutoSave() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _saveTask);
  }

  Future<void> _saveTask() async {
    if (_isSaving) return;
    setState(() => _isSaving = true);

    try {
      final body = <String, dynamic>{
        'title': _titleController.text.trim(),
        'note': _noteController.text.trim(),
        'priority': _priority,
        'dueDate': _dueDate != null
            ? DateFormat('yyyy-MM-dd').format(_dueDate!)
            : null,
        'dueTime': _dueTime != null
            ? '${_dueTime!.hour.toString().padLeft(2, '0')}:${_dueTime!.minute.toString().padLeft(2, '0')}'
            : null,
        'projectId': _selectedProjectId,
        'areaId': _selectedAreaId,
        'tagIds': _selectedTagIds.toList(),
      };

      await ref.read(tasksApiProvider).updateTask(widget.taskId, body);
      // Refresh the tasks list silently
      ref.read(tasksProvider.notifier).refresh();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Auto-save failed: $e'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _toggleDone() async {
    try {
      await ref.read(tasksApiProvider).toggleTask(widget.taskId);
      setState(() => _isDone = !_isDone);
      ref.read(tasksProvider.notifier).refresh();
      // Refresh this task's provider
      ref.invalidate(_singleTaskProvider(widget.taskId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to toggle: $e')),
        );
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null && mounted) {
      setState(() => _dueDate = picked);
      _scheduleAutoSave();
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _dueTime ?? TimeOfDay.now(),
    );
    if (picked != null && mounted) {
      setState(() => _dueTime = picked);
      _scheduleAutoSave();
    }
  }

  Future<void> _deleteTask() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Task'),
        content:
            const Text('Are you sure you want to delete this task? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref.read(tasksProvider.notifier).delete(widget.taskId);
        if (mounted) context.pop();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to delete: $e')),
          );
        }
      }
    }
  }

  Future<void> _addSubtask() async {
    final title = _subtaskController.text.trim();
    if (title.isEmpty) return;

    try {
      final id = await ref.read(tasksApiProvider).createTask({
        'title': title,
        'parentId': widget.taskId,
      });
      final newSubtask = Task(
        id: id,
        userId: '',
        title: title,
        status: 'todo',
        priority: 0,
        sortOrder: 0,
        createdAt: DateTime.now().toIso8601String(),
        updatedAt: DateTime.now().toIso8601String(),
        parentId: widget.taskId,
      );
      setState(() {
        _subtasks.add(newSubtask);
        _subtaskController.clear();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to add subtask: $e')),
        );
      }
    }
  }

  Future<void> _toggleSubtask(Task subtask) async {
    try {
      await ref.read(tasksApiProvider).toggleTask(subtask.id);
      setState(() {
        final idx = _subtasks.indexWhere((s) => s.id == subtask.id);
        if (idx != -1) {
          final newStatus = subtask.isDone ? 'todo' : 'done';
          _subtasks[idx] = Task.fromJson({
            ...subtask.toJson(),
            'status': newStatus,
          });
        }
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final taskAsync = ref.watch(_singleTaskProvider(widget.taskId));

    return taskAsync.when(
      loading: () => Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Task')),
        body: Center(child: Text('Error: $e')),
      ),
      data: (task) {
        if (task == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('Task not found')),
          );
        }
        _populateFromTask(task);

        return Scaffold(
          backgroundColor: colorScheme.surface,
          appBar: AppBar(
            backgroundColor: colorScheme.surface,
            surfaceTintColor: Colors.transparent,
            title: Text(
              _titleController.text.isNotEmpty
                  ? _titleController.text
                  : 'Task',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            actions: [
              // Save indicator
              if (_isSaving)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 8),
                  child: SizedBox(
                    height: 18,
                    width: 18,
                    child:
                        CircularProgressIndicator(strokeWidth: 2),
                  ),
                ),
              // Complete/uncomplete button
              IconButton(
                tooltip: _isDone ? 'Mark incomplete' : 'Mark complete',
                icon: Icon(
                  _isDone
                      ? Icons.check_circle
                      : Icons.check_circle_outline,
                  color: _isDone ? Colors.green : null,
                ),
                onPressed: _toggleDone,
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Title
              _SectionLabel('Title'),
              const SizedBox(height: 4),
              TextField(
                controller: _titleController,
                focusNode: _titleFocusNode,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Task title',
                ),
                maxLines: null,
                onChanged: (_) => _scheduleAutoSave(),
              ),
              const SizedBox(height: 16),

              // Note
              _SectionLabel('Note'),
              const SizedBox(height: 4),
              TextField(
                controller: _noteController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: 'Add notes...',
                  alignLabelWithHint: true,
                ),
                maxLines: null,
                minLines: 3,
                onChanged: (_) => _scheduleAutoSave(),
              ),
              const SizedBox(height: 16),

              // Due date & time
              _SectionLabel('Due Date & Time'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(
                          Icons.calendar_today_outlined,
                          size: 16),
                      label: Text(
                        _dueDate != null
                            ? DateFormat('MMM d, yyyy')
                                .format(_dueDate!)
                            : 'Pick date',
                        style: TextStyle(
                          color: _dueDate != null
                              ? colorScheme.primary
                              : colorScheme.onSurface
                                  .withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _dueDate != null ? _pickTime : null,
                      icon: const Icon(Icons.access_time_outlined,
                          size: 16),
                      label: Text(
                        _dueTime != null
                            ? _dueTime!.format(context)
                            : 'Pick time',
                        style: TextStyle(
                          color: _dueTime != null
                              ? colorScheme.primary
                              : colorScheme.onSurface
                                  .withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              if (_dueDate != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _dueDate = null;
                          _dueTime = null;
                        });
                        _scheduleAutoSave();
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: colorScheme.error,
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 28),
                        tapTargetSize:
                            MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('Clear date',
                          style: TextStyle(fontSize: 12)),
                    ),
                    if (_dueTime != null) ...[
                      const SizedBox(width: 12),
                      TextButton(
                        onPressed: () {
                          setState(() => _dueTime = null);
                          _scheduleAutoSave();
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: colorScheme.error,
                          padding: EdgeInsets.zero,
                          minimumSize: const Size(0, 28),
                          tapTargetSize:
                              MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Clear time',
                            style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  ],
                ),
              ],
              const SizedBox(height: 16),

              // Priority
              _SectionLabel('Priority'),
              const SizedBox(height: 8),
              PrioritySelector(
                selected: _priority,
                onChanged: (p) {
                  setState(() => _priority = p);
                  _scheduleAutoSave();
                },
              ),
              const SizedBox(height: 16),

              // Project
              ref.watch(projectsProvider).when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (projects) =>
                        _DropdownSection<Project>(
                      label: 'Project',
                      hint: 'No project',
                      value: _selectedProjectId,
                      items: projects,
                      itemLabel: (p) => p.name,
                      itemValue: (p) => p.id,
                      onChanged: (v) {
                        setState(() => _selectedProjectId = v);
                        _scheduleAutoSave();
                      },
                    ),
                  ),
              const SizedBox(height: 12),

              // Area
              ref.watch(areasProvider).when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (areas) =>
                        _DropdownSection<Area>(
                      label: 'Area',
                      hint: 'No area',
                      value: _selectedAreaId,
                      items: areas,
                      itemLabel: (a) => a.name,
                      itemValue: (a) => a.id,
                      onChanged: (v) {
                        setState(() => _selectedAreaId = v);
                        _scheduleAutoSave();
                      },
                    ),
                  ),
              const SizedBox(height: 16),

              // Tags
              _SectionLabel('Tags'),
              const SizedBox(height: 8),
              ref.watch(tagsProvider).when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (tags) => _DetailTagSelector(
                      tags: tags,
                      selected: _selectedTagIds,
                      onToggle: (id) {
                        setState(() {
                          if (_selectedTagIds.contains(id)) {
                            _selectedTagIds.remove(id);
                          } else {
                            _selectedTagIds.add(id);
                          }
                        });
                        _scheduleAutoSave();
                      },
                    ),
                  ),
              const SizedBox(height: 24),

              // Subtasks
              _SubtasksSection(
                subtasks: _subtasks,
                controller: _subtaskController,
                onAdd: _addSubtask,
                onToggle: _toggleSubtask,
              ),
              const SizedBox(height: 32),

              // Delete button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _deleteTask,
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete Task'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colorScheme.error,
                    side: BorderSide(color: colorScheme.error),
                    padding:
                        const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Helper widgets
// ---------------------------------------------------------------------------

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).textTheme.labelMedium?.copyWith(
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.55),
            letterSpacing: 0.5,
          ),
    );
  }
}

class _DropdownSection<T> extends StatelessWidget {
  final String label;
  final String hint;
  final String? value;
  final List<T> items;
  final String Function(T) itemLabel;
  final String Function(T) itemValue;
  final ValueChanged<String?> onChanged;

  const _DropdownSection({
    required this.label,
    required this.hint,
    required this.value,
    required this.items,
    required this.itemLabel,
    required this.itemValue,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel(label),
        const SizedBox(height: 4),
        DropdownButtonFormField<String>(
          initialValue: value,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding:
                EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            isDense: true,
          ),
          hint: Text(hint),
          items: [
            DropdownMenuItem<String>(
              value: null,
              child: Text(
                hint,
                style: TextStyle(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.4),
                ),
              ),
            ),
            ...items.map(
              (item) => DropdownMenuItem<String>(
                value: itemValue(item),
                child: Text(itemLabel(item)),
              ),
            ),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}

class _DetailTagSelector extends StatelessWidget {
  final List<Tag> tags;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  const _DetailTagSelector({
    required this.tags,
    required this.selected,
    required this.onToggle,
  });

  Color? _parseColor(String? hex) {
    if (hex == null) return null;
    try {
      final cleaned = hex.replaceAll('#', '');
      if (cleaned.length == 6) {
        return Color(int.parse('FF$cleaned', radix: 16));
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (tags.isEmpty) {
      return Text(
        'No tags available',
        style: TextStyle(
          color: Theme.of(context)
              .colorScheme
              .onSurface
              .withValues(alpha: 0.4),
          fontSize: 13,
        ),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: tags.map((tag) {
        final isSelected = selected.contains(tag.id);
        final color =
            _parseColor(tag.color) ?? Colors.blueGrey;
        return FilterChip(
          label: Text(tag.name),
          selected: isSelected,
          onSelected: (_) => onToggle(tag.id),
          selectedColor: color.withValues(alpha: 0.2),
          checkmarkColor: color,
          side: BorderSide(
            color: isSelected
                ? color
                : Colors.grey.withValues(alpha: 0.4),
          ),
          labelStyle: TextStyle(
            color: isSelected ? color : null,
            fontWeight: isSelected
                ? FontWeight.w600
                : FontWeight.normal,
            fontSize: 12,
          ),
          padding: const EdgeInsets.symmetric(
              horizontal: 4, vertical: 0),
          materialTapTargetSize:
              MaterialTapTargetSize.shrinkWrap,
        );
      }).toList(),
    );
  }
}

class _SubtasksSection extends StatelessWidget {
  final List<Task> subtasks;
  final TextEditingController controller;
  final VoidCallback onAdd;
  final ValueChanged<Task> onToggle;

  const _SubtasksSection({
    required this.subtasks,
    required this.controller,
    required this.onAdd,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final doneCount = subtasks.where((s) => s.isDone).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _SectionLabel('Subtasks'),
            if (subtasks.isNotEmpty) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color:
                      colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$doneCount/${subtasks.length}',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),

        // Subtask list
        if (subtasks.isNotEmpty) ...[
          Container(
            decoration: BoxDecoration(
              border: Border.all(
                  color: colorScheme.outlineVariant
                      .withValues(alpha: 0.5)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: subtasks.asMap().entries.map((entry) {
                final idx = entry.key;
                final subtask = entry.value;
                final isLast = idx == subtasks.length - 1;

                return Column(
                  children: [
                    InkWell(
                      onTap: () => onToggle(subtask),
                      borderRadius: BorderRadius.only(
                        topLeft: idx == 0
                            ? const Radius.circular(12)
                            : Radius.zero,
                        topRight: idx == 0
                            ? const Radius.circular(12)
                            : Radius.zero,
                        bottomLeft: isLast
                            ? const Radius.circular(12)
                            : Radius.zero,
                        bottomRight: isLast
                            ? const Radius.circular(12)
                            : Radius.zero,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        child: Row(
                          children: [
                            AnimatedContainer(
                              duration: const Duration(
                                  milliseconds: 150),
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: subtask.isDone
                                      ? colorScheme.primary
                                      : colorScheme.outline,
                                  width: 2,
                                ),
                                color: subtask.isDone
                                    ? colorScheme.primary
                                    : Colors.transparent,
                              ),
                              child: subtask.isDone
                                  ? Icon(
                                      Icons.check,
                                      size: 12,
                                      color: colorScheme.onPrimary,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                subtask.title,
                                style: theme.textTheme.bodyMedium
                                    ?.copyWith(
                                  decoration: subtask.isDone
                                      ? TextDecoration.lineThrough
                                      : null,
                                  color: subtask.isDone
                                      ? colorScheme.onSurface
                                          .withValues(alpha: 0.4)
                                      : colorScheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (!isLast)
                      Divider(
                        height: 1,
                        indent: 44,
                        color: colorScheme.outlineVariant
                            .withValues(alpha: 0.3),
                      ),
                  ],
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Add subtask input
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: 'Add a subtask...',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurface.withValues(alpha: 0.4),
                    fontSize: 14,
                  ),
                  border: const OutlineInputBorder(),
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  isDense: true,
                ),
                onSubmitted: (_) => onAdd(),
                textInputAction: TextInputAction.done,
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: onAdd,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
              ),
              child: const Icon(Icons.add, size: 20),
            ),
          ],
        ),
      ],
    );
  }
}
