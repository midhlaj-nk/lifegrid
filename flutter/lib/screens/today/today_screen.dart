import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/models/task.dart';
import '../../core/models/today_data.dart';
import '../../core/providers/tasks_provider.dart';
import '../../widgets/task_item.dart';
import '../../widgets/quick_add_bar.dart';

class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  bool _completedExpanded = false;

  Future<void> _refresh() async {
    ref.invalidate(todayProvider);
    await ref.read(todayProvider.future);
  }

  void _showQuickAdd() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const QuickAddBar(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final todayAsync = ref.watch(todayProvider);
    final now = DateTime.now();
    final dateStr = DateFormat('EEEE, d MMMM').format(now);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Today',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
            Text(
              dateStr,
              style: TextStyle(
                fontSize: 12,
                color: theme.colorScheme.onSurface.withOpacity(0.6),
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        toolbarHeight: 64,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showQuickAdd,
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: todayAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 12),
                Text('Failed to load today', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  err.toString(),
                  style: theme.textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _refresh,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (data) => _TodayBody(
            data: data,
            completedExpanded: _completedExpanded,
            onToggleCompleted: () =>
                setState(() => _completedExpanded = !_completedExpanded),
            onRefresh: _refresh,
          ),
        ),
      ),
    );
  }
}

class _TodayBody extends StatelessWidget {
  const _TodayBody({
    required this.data,
    required this.completedExpanded,
    required this.onToggleCompleted,
    required this.onRefresh,
  });

  final TodayData data;
  final bool completedExpanded;
  final VoidCallback onToggleCompleted;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final stats = data.stats;

    return ListView(
      padding: const EdgeInsets.only(bottom: 100),
      children: [
        // --- Progress section ---
        if (stats.total > 0) _ProgressSection(stats: stats),

        // --- Overdue section ---
        if (data.overdue.isNotEmpty)
          _TaskSection(
            title: 'Overdue',
            tasks: data.overdue,
            count: data.overdue.length,
            accentColor: Colors.red,
            emptyMessage: null,
            onRefresh: onRefresh,
          ),

        // --- Due Today section ---
        _TaskSection(
          title: 'Due Today',
          tasks: data.dueToday,
          count: data.dueToday.length,
          accentColor: null,
          emptyMessage: 'Nothing due today.',
          onRefresh: onRefresh,
        ),

        // --- Completed section (collapsible) ---
        if (data.doneToday.isNotEmpty)
          _CollapsibleSection(
            title: 'Completed',
            tasks: data.doneToday,
            expanded: completedExpanded,
            onToggle: onToggleCompleted,
            onRefresh: onRefresh,
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Progress section
// ---------------------------------------------------------------------------

class _ProgressSection extends StatelessWidget {
  const _ProgressSection({required this.stats});

  final TodayStats stats;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pct = stats.total > 0 ? stats.done / stats.total : 0.0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${stats.done}/${stats.total} tasks',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '${(pct * 100).round()}%',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Task section
// ---------------------------------------------------------------------------

class _TaskSection extends StatelessWidget {
  const _TaskSection({
    required this.title,
    required this.tasks,
    required this.count,
    required this.accentColor,
    required this.emptyMessage,
    required this.onRefresh,
  });

  final String title;
  final List<Task> tasks;
  final int count;
  final Color? accentColor;
  final String? emptyMessage;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = accentColor ?? theme.colorScheme.primary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Row(
            children: [
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: accentColor,
                ),
              ),
              const SizedBox(width: 8),
              if (count > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          if (tasks.isEmpty && emptyMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                emptyMessage!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
              ),
            )
          else
            ...tasks.map((task) => TaskItemWidget(
                  task: task,
                  onRefresh: onRefresh,
                )),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Collapsible completed section
// ---------------------------------------------------------------------------

class _CollapsibleSection extends StatelessWidget {
  const _CollapsibleSection({
    required this.title,
    required this.tasks,
    required this.expanded,
    required this.onToggle,
    required this.onRefresh,
  });

  final String title;
  final List<Task> tasks;
  final bool expanded;
  final VoidCallback onToggle;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Icon(
                    expanded
                        ? Icons.keyboard_arrow_down
                        : Icons.keyboard_arrow_right,
                    size: 20,
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${tasks.length}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (expanded) ...[
            const SizedBox(height: 4),
            ...tasks.map((task) => TaskItemWidget(
                  task: task,
                  onRefresh: onRefresh,
                )),
          ],
        ],
      ),
    );
  }
}
