import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/models/project.dart';
import '../core/providers/tasks_provider.dart';
import '../core/providers/organization_provider.dart';

class QuickAddBar extends ConsumerStatefulWidget {
  const QuickAddBar({super.key});

  @override
  ConsumerState<QuickAddBar> createState() => _QuickAddBarState();
}

class _QuickAddBarState extends ConsumerState<QuickAddBar> {
  final _titleController = TextEditingController();
  final _focusNode = FocusNode();

  DateTime? _selectedDate;
  int _selectedPriority = 4; // 4 = no priority
  Project? _selectedProject;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  void _cyclePriority() {
    setState(() {
      // cycle through 1(high), 2(medium), 3(low), 4(none)
      _selectedPriority = _selectedPriority >= 4 ? 1 : _selectedPriority + 1;
    });
  }

  Future<void> _showProjectPicker() async {
    final projectsAsync = ref.read(projectsProvider);
    if (!projectsAsync.hasValue) return;

    final projects = projectsAsync.value!;
    if (projects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No projects found')),
      );
      return;
    }

    final selected = await showModalBottomSheet<Project>(
      context: context,
      builder: (ctx) => _ProjectPickerSheet(
        projects: projects,
        selected: _selectedProject,
      ),
    );

    if (selected != null || mounted) {
      setState(() => _selectedProject = selected);
    }
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _submitting = true);

    final body = <String, dynamic>{
      'title': title,
      'priority': _selectedPriority,
      if (_selectedDate != null)
        'dueDate': DateFormat('yyyy-MM-dd').format(_selectedDate!),
      if (_selectedProject != null) 'projectId': _selectedProject!.id,
    };

    try {
      await ref.read(tasksProvider.notifier).createTask(body);
      ref.invalidate(todayProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create task: $e')),
        );
      }
    }
  }

  Color _priorityColor(int p) {
    switch (p) {
      case 1:
        return Colors.red;
      case 2:
        return Colors.amber;
      case 3:
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  String _priorityLabel(int p) {
    switch (p) {
      case 1:
        return 'P1';
      case 2:
        return 'P2';
      case 3:
        return 'P3';
      default:
        return 'Priority';
    }
  }

  Color _parseColor(String? hex, Color fallback) {
    if (hex == null || hex.isEmpty) return fallback;
    try {
      final h = hex.replaceFirst('#', '');
      if (h.length == 6) return Color(int.parse('FF$h', radix: 16));
      if (h.length == 8) return Color(int.parse(h, radix: 16));
    } catch (_) {}
    return fallback;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Title input
          TextField(
            controller: _titleController,
            focusNode: _focusNode,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              hintText: 'Task name',
              border: InputBorder.none,
              hintStyle: TextStyle(
                color: theme.colorScheme.onSurface.withOpacity(0.4),
                fontSize: 18,
              ),
            ),
            style: const TextStyle(fontSize: 18),
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          // Chips row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Due date chip
                _ActionChip(
                  icon: Icons.calendar_today_outlined,
                  label: _selectedDate != null
                      ? DateFormat('MMM d').format(_selectedDate!)
                      : 'Due Date',
                  active: _selectedDate != null,
                  onTap: _pickDate,
                  onClear:
                      _selectedDate != null ? () => setState(() => _selectedDate = null) : null,
                ),
                const SizedBox(width: 8),

                // Priority chip
                _ActionChip(
                  icon: Icons.flag_outlined,
                  label: _priorityLabel(_selectedPriority),
                  active: _selectedPriority < 4,
                  activeColor: _selectedPriority < 4
                      ? _priorityColor(_selectedPriority)
                      : null,
                  onTap: _cyclePriority,
                  onClear: _selectedPriority < 4
                      ? () => setState(() => _selectedPriority = 4)
                      : null,
                ),
                const SizedBox(width: 8),

                // Project chip
                _ActionChip(
                  icon: Icons.folder_outlined,
                  label: _selectedProject?.name ?? 'Project',
                  active: _selectedProject != null,
                  activeColor: _selectedProject != null
                      ? _parseColor(
                          _selectedProject!.color,
                          theme.colorScheme.primary,
                        )
                      : null,
                  onTap: _showProjectPicker,
                  onClear: _selectedProject != null
                      ? () => setState(() => _selectedProject = null)
                      : null,
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Add button
          SizedBox(
            height: 48,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text(
                      'Add Task',
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reusable action chip
// ---------------------------------------------------------------------------

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.onClear,
    this.activeColor,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  final VoidCallback? onClear;
  final Color? activeColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = active
        ? (activeColor ?? theme.colorScheme.primary)
        : theme.colorScheme.onSurface.withOpacity(0.5);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: active
              ? color.withOpacity(0.12)
              : theme.colorScheme.surfaceVariant,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? color.withOpacity(0.4) : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: color,
                fontWeight:
                    active ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            if (onClear != null) ...[
              const SizedBox(width: 4),
              GestureDetector(
                onTap: onClear,
                child: Icon(Icons.close, size: 13, color: color),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Project picker bottom sheet
// ---------------------------------------------------------------------------

class _ProjectPickerSheet extends StatelessWidget {
  const _ProjectPickerSheet({
    required this.projects,
    required this.selected,
  });

  final List<Project> projects;
  final Project? selected;

  Color _parseColor(String? hex, Color fallback) {
    if (hex == null || hex.isEmpty) return fallback;
    try {
      final h = hex.replaceFirst('#', '');
      if (h.length == 6) return Color(int.parse('FF$h', radix: 16));
      if (h.length == 8) return Color(int.parse(h, radix: 16));
    } catch (_) {}
    return fallback;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: theme.colorScheme.outlineVariant,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Select Project',
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          // "No project" option
          ListTile(
            leading: Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: theme.colorScheme.outline,
                ),
              ),
            ),
            title: const Text('No project'),
            trailing: selected == null
                ? const Icon(Icons.check, color: Colors.green)
                : null,
            onTap: () => Navigator.of(context).pop(null),
          ),
          const Divider(height: 1),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.4,
            ),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: projects.length,
              itemBuilder: (ctx, i) {
                final p = projects[i];
                final dotColor =
                    _parseColor(p.color, theme.colorScheme.primary);
                return ListTile(
                  leading: Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: dotColor,
                    ),
                  ),
                  title: Text(p.name),
                  trailing: selected?.id == p.id
                      ? const Icon(Icons.check, color: Colors.green)
                      : null,
                  onTap: () => Navigator.of(context).pop(p),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
