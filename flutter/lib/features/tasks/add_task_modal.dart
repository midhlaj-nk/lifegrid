import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/area.dart';
import '../../core/models/project.dart';
import '../../core/models/tag.dart';
import '../../core/providers/organization_provider.dart';
import '../../core/providers/tasks_provider.dart';
import 'widgets/priority_selector.dart';

class AddTaskModal extends ConsumerStatefulWidget {
  const AddTaskModal({super.key});

  @override
  ConsumerState<AddTaskModal> createState() => _AddTaskModalState();
}

class _AddTaskModalState extends ConsumerState<AddTaskModal> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _noteController = TextEditingController();

  int _priority = 0; // 0 = None, 1 = P1, 2 = P2, 3 = P3
  DateTime? _dueDate;
  String? _selectedProjectId;
  String? _selectedAreaId;
  final Set<String> _selectedTagIds = {};
  bool _saving = false;

  @override
  void dispose() {
    _titleController.dispose();
    _noteController.dispose();
    super.dispose();
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
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    try {
      final body = <String, dynamic>{
        'title': _titleController.text.trim(),
        if (_noteController.text.trim().isNotEmpty)
          'note': _noteController.text.trim(),
        'priority': _priority,
        if (_dueDate != null)
          'dueDate': DateFormat('yyyy-MM-dd').format(_dueDate!),
        if (_selectedProjectId != null) 'projectId': _selectedProjectId,
        if (_selectedAreaId != null) 'areaId': _selectedAreaId,
        if (_selectedTagIds.isNotEmpty) 'tagIds': _selectedTagIds.toList(),
      };

      await ref.read(tasksApiProvider).createTask(body);
      await ref.read(tasksProvider.notifier).refresh();

      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create task: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final mediaQuery = MediaQuery.of(context);

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: mediaQuery.viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurface.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'New Task',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // Title
              TextFormField(
                controller: _titleController,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'Task title',
                  border: OutlineInputBorder(),
                  labelText: 'Title *',
                ),
                textInputAction: TextInputAction.next,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Title is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Note
              TextFormField(
                controller: _noteController,
                decoration: const InputDecoration(
                  hintText: 'Add a note...',
                  border: OutlineInputBorder(),
                  labelText: 'Note',
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
                minLines: 2,
                textInputAction: TextInputAction.newline,
              ),
              const SizedBox(height: 16),

              // Priority selector
              Text(
                'Priority',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 8),
              PrioritySelector(
                selected: _priority,
                onChanged: (p) => setState(() => _priority = p),
              ),
              const SizedBox(height: 16),

              // Due date
              Text(
                'Due Date',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 4),
              OutlinedButton.icon(
                onPressed: _pickDate,
                icon: const Icon(Icons.calendar_today_outlined, size: 16),
                label: Text(
                  _dueDate != null
                      ? DateFormat('MMM d, yyyy').format(_dueDate!)
                      : 'Pick a date',
                  style: TextStyle(
                    color: _dueDate != null
                        ? colorScheme.primary
                        : colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
              if (_dueDate != null) ...[
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => setState(() => _dueDate = null),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Clear date',
                    style: TextStyle(color: colorScheme.error, fontSize: 12),
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Project
              ref.watch(projectsProvider).when(
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (projects) => _Dropdown<Project>(
                      label: 'Project',
                      hint: 'No project',
                      value: _selectedProjectId,
                      items: projects,
                      itemLabel: (p) => p.name,
                      itemValue: (p) => p.id,
                      onChanged: (v) =>
                          setState(() => _selectedProjectId = v),
                    ),
                  ),
              const SizedBox(height: 12),

              // Area
              ref.watch(areasProvider).when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (areas) => _Dropdown<Area>(
                      label: 'Area',
                      hint: 'No area',
                      value: _selectedAreaId,
                      items: areas,
                      itemLabel: (a) => a.name,
                      itemValue: (a) => a.id,
                      onChanged: (v) =>
                          setState(() => _selectedAreaId = v),
                    ),
                  ),
              const SizedBox(height: 16),

              // Tags
              Text(
                'Tags',
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 8),
              ref.watch(tagsProvider).when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (tags) => _TagSelector(
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
                      },
                    ),
                  ),
              const SizedBox(height: 24),

              // Save button
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Add Task'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Generic Dropdown
// ---------------------------------------------------------------------------

class _Dropdown<T> extends StatelessWidget {
  final String label;
  final String hint;
  final String? value;
  final List<T> items;
  final String Function(T) itemLabel;
  final String Function(T) itemValue;
  final ValueChanged<String?> onChanged;

  const _Dropdown({
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
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.labelMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
          ),
        ),
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
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
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

// ---------------------------------------------------------------------------
// Tag Selector
// ---------------------------------------------------------------------------

class _TagSelector extends StatelessWidget {
  final List<Tag> tags;
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  const _TagSelector({
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
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
          fontSize: 13,
        ),
      );
    }

    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: tags.map((tag) {
        final isSelected = selected.contains(tag.id);
        final color = _parseColor(tag.color) ?? Colors.blueGrey;
        return FilterChip(
          label: Text(tag.name),
          selected: isSelected,
          onSelected: (_) => onToggle(tag.id),
          selectedColor: color.withValues(alpha: 0.2),
          checkmarkColor: color,
          side: BorderSide(
            color: isSelected ? color : Colors.grey.withValues(alpha: 0.4),
          ),
          labelStyle: TextStyle(
            color: isSelected ? color : null,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            fontSize: 12,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        );
      }).toList(),
    );
  }
}
