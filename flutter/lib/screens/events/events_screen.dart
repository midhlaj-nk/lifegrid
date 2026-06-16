import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:intl/intl.dart';
import '../../core/models/event.dart';
import '../../core/providers/events_provider.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  @override
  Widget build(BuildContext context) {
    final eventsAsync = ref.watch(eventsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Events & Countdowns')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddEventSheet(context),
        child: const Icon(Icons.add),
      ),
      body: eventsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              Text('Failed to load events',
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              FilledButton.tonal(
                onPressed: () => ref.read(eventsProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (events) {
          if (events.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.event,
                      size: 64,
                      color: Theme.of(context).colorScheme.outlineVariant),
                  const SizedBox(height: 16),
                  Text(
                    'No events yet',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color:
                              Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap + to add an event or countdown',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.outline,
                        ),
                  ),
                ],
              ),
            );
          }

          // Sort events by date
          final sorted = [...events];
          sorted.sort((a, b) {
            try {
              return DateTime.parse(a.date).compareTo(DateTime.parse(b.date));
            } catch (_) {
              return 0;
            }
          });

          return RefreshIndicator(
            onRefresh: () => ref.read(eventsProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: sorted.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 72),
              itemBuilder: (context, index) {
                final event = sorted[index];
                return _EventTile(
                  event: event,
                  onDelete: () =>
                      ref.read(eventsProvider.notifier).delete(event.id),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showAddEventSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const _AddEventSheet(),
    );
  }
}

// ---------------------------------------------------------------------------
// Event tile
// ---------------------------------------------------------------------------

class _EventTile extends StatelessWidget {
  final AppEvent event;
  final VoidCallback onDelete;

  const _EventTile({required this.event, required this.onDelete});

  Color _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return Colors.deepPurple;
    try {
      final clean = hex.replaceFirst('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return Colors.deepPurple;
    }
  }

  String _countdownLabel(String dateStr) {
    try {
      final now = DateTime.now();
      var eventDate = DateTime.parse(dateStr);

      // For yearly recurring events, use the next occurrence
      if (eventDate.isBefore(now)) {
        // Try this year first
        final thisYear = DateTime(now.year, eventDate.month, eventDate.day);
        if (thisYear.isAfter(now)) {
          eventDate = thisYear;
        } else {
          eventDate =
              DateTime(now.year + 1, eventDate.month, eventDate.day);
        }
      }

      final diff = eventDate.difference(
        DateTime(now.year, now.month, now.day),
      );
      final days = diff.inDays;

      if (days == 0) return 'Today!';
      if (days > 0) return 'In $days day${days == 1 ? '' : 's'}';
      return '${(-days)} day${(-days) == 1 ? '' : 's'} ago';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _parseColor(event.color);
    final countdown = _countdownLabel(event.date);
    final isToday = countdown == 'Today!';
    final isPast = countdown.endsWith('ago');

    String formattedDate = event.date;
    try {
      formattedDate = DateFormat('MMM d, y').format(DateTime.parse(event.date));
    } catch (_) {}

    return Slidable(
      key: ValueKey(event.id),
      endActionPane: ActionPane(
        motion: const DrawerMotion(),
        children: [
          SlidableAction(
            onPressed: (_) => onDelete(),
            backgroundColor: Theme.of(context).colorScheme.error,
            foregroundColor: Theme.of(context).colorScheme.onError,
            icon: Icons.delete,
            label: 'Delete',
            borderRadius: const BorderRadius.horizontal(right: Radius.circular(8)),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Text(
            event.icon?.isNotEmpty == true ? event.icon! : '📅',
            style: const TextStyle(fontSize: 20),
          ),
        ),
        title: Text(
          event.title,
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        subtitle: Text(
          formattedDate +
              (event.yearlyRecurring ? ' · Yearly' : ''),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isToday
                    ? Colors.orange.withValues(alpha: 0.15)
                    : isPast
                        ? Theme.of(context)
                            .colorScheme
                            .surfaceContainerHighest
                        : color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                countdown,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: isToday
                          ? Colors.orange.shade700
                          : isPast
                              ? Theme.of(context).colorScheme.outline
                              : color,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Add event sheet
// ---------------------------------------------------------------------------

class _AddEventSheet extends ConsumerStatefulWidget {
  const _AddEventSheet();

  @override
  ConsumerState<_AddEventSheet> createState() => _AddEventSheetState();
}

class _AddEventSheetState extends ConsumerState<_AddEventSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _iconController = TextEditingController();
  DateTime? _selectedDate;
  String _selectedColor = '#7C3AED';
  bool _yearlyRecurring = false;
  bool _saving = false;

  static const List<String> _colorOptions = [
    '#7C3AED',
    '#2563EB',
    '#059669',
    '#D97706',
    '#DC2626',
    '#DB2777',
    '#0891B2',
    '#65A30D',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _iconController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('New Event',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleController,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Title is required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _iconController,
                decoration: const InputDecoration(
                  labelText: 'Icon (emoji)',
                  hintText: '🎂',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),

              // Date picker
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today, size: 18),
                label: Text(_selectedDate == null
                    ? 'Pick a date *'
                    : DateFormat('MMM d, y').format(_selectedDate!)),
                style: _selectedDate == null
                    ? OutlinedButton.styleFrom(
                        foregroundColor:
                            Theme.of(context).colorScheme.error,
                      )
                    : null,
                onPressed: _pickDate,
              ),
              const SizedBox(height: 12),

              // Color picker
              Text('Color',
                  style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _colorOptions.map((hex) {
                  final color = Color(int.parse(
                      'FF${hex.replaceFirst('#', '')}',
                      radix: 16));
                  final selected = _selectedColor == hex;
                  return GestureDetector(
                    onTap: () => setState(() => _selectedColor = hex),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: selected
                            ? Border.all(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface,
                                width: 3)
                            : null,
                      ),
                      child: selected
                          ? const Icon(Icons.check,
                              size: 18, color: Colors.white)
                          : null,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),

              // Yearly recurring toggle
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Yearly recurring'),
                subtitle:
                    const Text('Repeat this event every year'),
                value: _yearlyRecurring,
                onChanged: (v) => setState(() => _yearlyRecurring = v),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Add Event'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(1900),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please pick a date')),
      );
      return;
    }
    setState(() => _saving = true);

    final body = {
      'title': _titleController.text.trim(),
      'date': DateFormat('yyyy-MM-dd').format(_selectedDate!),
      'icon': _iconController.text.trim().isEmpty
          ? null
          : _iconController.text.trim(),
      'color': _selectedColor,
      'yearlyRecurring': _yearlyRecurring,
    };

    final id = await ref.read(eventsProvider.notifier).create(body);

    if (mounted) {
      setState(() => _saving = false);
      if (id != null) {
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create event')),
        );
      }
    }
  }
}
