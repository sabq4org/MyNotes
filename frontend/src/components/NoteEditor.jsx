import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import EditorToolbar from './EditorToolbar';
import CodeBlockView from './CodeBlockView';

const CustomCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    link: false,
  }),
  CustomCodeBlock,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-brand-600 underline underline-offset-2 hover:text-brand-700',
    },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Placeholder.configure({
    placeholder: 'اكتب ملاحظتك هنا… استخدم شريط الأدوات لإضافة قوائم مهام، عناوين، وكتل كود.',
  }),
];

export default function NoteEditor({ value, onChange, autoFocus = false }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value || '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        dir: 'rtl',
        class:
          'prose prose-ink max-w-none focus:outline-none min-h-[40vh] px-6 py-5 ' +
          'prose-headings:font-semibold prose-p:my-3 prose-li:my-1 ' +
          'prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline ' +
          'prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:border-brand-300 prose-blockquote:bg-brand-50/40 prose-blockquote:py-1 prose-blockquote:rounded',
      },
      // Inside a code block, always paste as plain text so multi-line
      // snippets keep their newlines and don't get split into separate
      // <p>/<code> nodes.
      handlePaste(view, event) {
        const { state } = view;
        const { $from } = state.selection;
        if ($from.parent.type.name !== 'codeBlock') return false;
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;
        view.dispatch(state.tr.insertText(text).scrollIntoView());
        return true;
      },
    },
    onUpdate({ editor: ed }) {
      onChange?.(ed.getHTML());
    },
  });

  // Sync external content changes (e.g. switching notes) without re-mounting.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => editor?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
