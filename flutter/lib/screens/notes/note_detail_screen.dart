import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/note.dart';
import '../../core/providers/notes_provider.dart';

// ---------------------------------------------------------------------------
// Common emojis for the icon picker
// ---------------------------------------------------------------------------

const _kEmojis = [
  '📄', '📝', '📃', '📋', '📊', '📈', '📉', '📌', '📍', '🗒️',
  '🗓️', '📅', '📆', '🗑️', '📁', '📂', '🗂️', '📚', '📖', '📗',
  '📘', '📙', '📕', '📓', '📔', '📒', '📑', '🔖', '🏷️', '💡',
  '🔍', '🔎', '✏️', '🖊️', '🖋️', '📐', '📏', '🗝️', '🔑', '💼',
  '🎯', '🚀', '⭐', '🌟', '💫', '✨', '🔥', '💪', '🧠', '❤️',
  '🎉', '🎊', '🏆', '🥇', '🌈', '🌍', '🌱', '🍀', '🌸', '🦋',
];

// ---------------------------------------------------------------------------
// NoteDetailScreen
// ---------------------------------------------------------------------------

class NoteDetailScreen extends ConsumerStatefulWidget {
  final String id;

  const NoteDetailScreen({super.key, required this.id});

  @override
  ConsumerState<NoteDetailScreen> createState() => _NoteDetailScreenState();
}

class _NoteDetailScreenState extends ConsumerState<NoteDetailScreen> {
  Note? _note;
  bool _loading = true;
  String? _error;

  late TextEditingController _titleController;
  late TextEditingController _contentController;

  Timer? _debounce;
  bool _dirty = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _contentController = TextEditingController();
    _loadNote();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  Future<void> _loadNote() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(notesApiProvider);
      final note = await api.getNote(widget.id);
      if (!mounted) return;
      if (note == null) {
        setState(() {
          _error = 'Note not found.';
          _loading = false;
        });
        return;
      }
      _note = note;
      _titleController.text = note.title;
      _contentController.text = _extractPlainText(note.content);
      setState(() => _loading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Plain-text extraction from BlockNote JSON
  // -------------------------------------------------------------------------

  String _extractPlainText(dynamic content) {
    if (content == null) return '';
    if (content is String) return content;
    // BlockNote content is a list of blocks
    if (content is List) {
      final buffer = StringBuffer();
      for (final block in content) {
        _appendBlock(block, buffer);
      }
      return buffer.toString().trimRight();
    }
    return '';
  }

  void _appendBlock(dynamic block, StringBuffer buf) {
    if (block is! Map) return;
    final content = block['content'];
    if (content is List) {
      for (final inline in content) {
        if (inline is Map && inline['type'] == 'text') {
          buf.write(inline['text'] ?? '');
        }
      }
    }
    // Recurse into children
    final children = block['children'];
    if (children is List) {
      for (final child in children) {
        buf.writeln();
        _appendBlock(child, buf);
      }
    }
    buf.writeln();
  }

  // -------------------------------------------------------------------------
  // Auto-save with debounce
  // -------------------------------------------------------------------------

  void _onTitleChanged(String value) {
    _dirty = true;
    _scheduleAutoSave();
  }

  void _onContentChanged(String value) {
    _dirty = true;
    _scheduleAutoSave();
  }

  void _scheduleAutoSave() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 1), _save);
  }

  Future<void> _save() async {
    if (_note == null || !_dirty) return;
    _dirty = false;
    final title = _titleController.text.trim();
    final content = _contentController.text;
    await ref.read(notesProvider.notifier).update(_note!.id, {
      'title': title.isEmpty ? 'Untitled' : title,
      'content': content,
    });
  }

  Future<void> _saveNow() async {
    _debounce?.cancel();
    await _save();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Note saved'), duration: Duration(seconds: 1)),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Icon picker
  // -------------------------------------------------------------------------

  Future<void> _showIconPicker() async {
    final chosen = await showDialog<String>(
      context: context,
      builder: (ctx) => Dialog(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Choose Icon',
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 280,
                width: double.maxFinite,
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 8,
                    crossAxisSpacing: 4,
                    mainAxisSpacing: 4,
                  ),
                  itemCount: _kEmojis.length,
                  itemBuilder: (_, i) => InkWell(
                    borderRadius: BorderRadius.circular(6),
                    onTap: () => Navigator.pop(ctx, _kEmojis[i]),
                    child: Center(
                      child: Text(
                        _kEmojis[i],
                        style: const TextStyle(fontSize: 22),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (chosen != null && _note != null) {
      setState(() => _note = _NoteHelper.withIcon(_note!, chosen));
      await ref.read(notesProvider.notifier).update(_note!.id, {'icon': chosen});
    }
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: _loading || _note == null
            ? const Text('Note')
            : Row(
                children: [
                  GestureDetector(
                    onTap: _showIconPicker,
                    child: Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: Text(
                        _note!.icon ?? '📄',
                        style: const TextStyle(fontSize: 22),
                      ),
                    ),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _titleController,
                      onChanged: _onTitleChanged,
                      style: Theme.of(context).textTheme.titleLarge,
                      decoration: const InputDecoration(
                        hintText: 'Untitled',
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ],
              ),
        actions: [
          if (!_loading && _note != null)
            IconButton(
              icon: const Icon(Icons.save_outlined),
              tooltip: 'Save',
              onPressed: _saveNow,
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadNote,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final note = _note!;

    if (note.mode == 'canvas') {
      return _CanvasPlaceholder(note: note);
    }

    return _PageEditor(
      note: note,
      contentController: _contentController,
      onContentChanged: _onContentChanged,
    );
  }
}

// ---------------------------------------------------------------------------
// Page editor
// ---------------------------------------------------------------------------

class _PageEditor extends StatelessWidget {
  final Note note;
  final TextEditingController contentController;
  final ValueChanged<String> onContentChanged;

  const _PageEditor({
    required this.note,
    required this.contentController,
    required this.onContentChanged,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy · h:mm a');
    final created = _tryParse(note.createdAt);
    final updated = _tryParse(note.updatedAt);

    return Column(
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: contentController,
              onChanged: onContentChanged,
              maxLines: null,
              expands: true,
              textAlignVertical: TextAlignVertical.top,
              style: Theme.of(context).textTheme.bodyLarge,
              decoration: InputDecoration(
                hintText: 'Start writing…',
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
                hintStyle: TextStyle(
                  color: Theme.of(context).colorScheme.outline,
                ),
              ),
              keyboardType: TextInputType.multiline,
              textCapitalization: TextCapitalization.sentences,
            ),
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (created != null)
                _InfoRow(
                  label: 'Created',
                  value: dateFormat.format(created),
                ),
              if (updated != null)
                _InfoRow(
                  label: 'Updated',
                  value: dateFormat.format(updated),
                ),
            ],
          ),
        ),
      ],
    );
  }

  DateTime? _tryParse(String raw) {
    try {
      return DateTime.parse(raw).toLocal();
    } catch (_) {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Canvas placeholder
// ---------------------------------------------------------------------------

class _CanvasPlaceholder extends StatelessWidget {
  final Note note;

  const _CanvasPlaceholder({required this.note});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.brush_outlined,
              size: 72,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              'Canvas Note',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Canvas notes can only be edited on web.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Info row widget
// ---------------------------------------------------------------------------

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final dimColor = Theme.of(context).colorScheme.outline;
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .labelSmall
                  ?.copyWith(color: dimColor),
            ),
          ),
          Text(
            value,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(color: dimColor),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: immutable copy of Note with a new icon
// ---------------------------------------------------------------------------

class _NoteHelper {
  static Note withIcon(Note n, String icon) => Note(
        id: n.id,
        userId: n.userId,
        parentId: n.parentId,
        title: n.title,
        icon: icon,
        cover: n.cover,
        content: n.content,
        canvas: n.canvas,
        mode: n.mode,
        sortOrder: n.sortOrder,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      );
}
