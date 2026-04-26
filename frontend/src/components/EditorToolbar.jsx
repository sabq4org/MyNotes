import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Code,
  Code2,
  Undo,
  Redo,
} from 'lucide-react';
import clsx from 'clsx';

function ToolButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={clsx(
        'inline-flex items-center justify-center size-9 rounded-lg transition',
        'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
        active && 'bg-brand-50 text-brand-700 hover:bg-brand-100'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-ink-200" />;
}

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const promptForLink = () => {
    const previous = editor.getAttributes('link').href || '';
    const url = window.prompt('رابط (https://…)', previous);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' })
      .run();
  };

  /**
   * Smart code-block toggle:
   *  - Inside an existing code block → toggle off (default).
   *  - Selection touches a single block → default toggleCodeBlock.
   *  - Selection spans MULTIPLE top-level blocks → merge their text into
   *    one code block (this is what Tiptap's built-in command can't do).
   */
  const handleCodeBlock = () => {
    if (editor.isActive('codeBlock')) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const { state } = editor;
    const { from, to } = state.selection;

    let firstBlockPos = null;
    let lastBlockPos = null;
    const lines = [];

    state.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (parent === state.doc) {
        if (firstBlockPos === null) firstBlockPos = pos;
        lastBlockPos = pos + node.nodeSize;
        lines.push(node.textContent);
        return false;
      }
      return true;
    });

    if (firstBlockPos === null || lines.length <= 1) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const text = lines.join('\n');
    const codeBlockType = state.schema.nodes.codeBlock;
    if (!codeBlockType) {
      editor.chain().focus().toggleCodeBlock().run();
      return;
    }

    const codeBlock = codeBlockType.create(
      null,
      text ? state.schema.text(text) : null
    );

    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.replaceWith(firstBlockPos, lastBlockPos, codeBlock);
        return true;
      })
      .run();
  };

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-ink-100 bg-white sticky top-0 z-10">
      <ToolButton
        title="تراجع"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
      >
        <Undo size={17} />
      </ToolButton>
      <ToolButton
        title="إعادة"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
      >
        <Redo size={17} />
      </ToolButton>

      <Divider />

      <ToolButton
        title="عنوان كبير"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={17} />
      </ToolButton>
      <ToolButton
        title="عنوان متوسط"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={17} />
      </ToolButton>
      <ToolButton
        title="عنوان صغير"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={17} />
      </ToolButton>

      <Divider />

      <ToolButton
        title="غامق"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={17} />
      </ToolButton>
      <ToolButton
        title="مائل"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={17} />
      </ToolButton>
      <ToolButton
        title="مشطوب"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={17} />
      </ToolButton>

      <Divider />

      <ToolButton
        title="قائمة نقطية"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={17} />
      </ToolButton>
      <ToolButton
        title="قائمة مرقّمة"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={17} />
      </ToolButton>
      <ToolButton
        title="قائمة مهام"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks size={17} />
      </ToolButton>
      <ToolButton
        title="اقتباس"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={17} />
      </ToolButton>

      <Divider />

      <ToolButton
        title="رابط"
        active={editor.isActive('link')}
        onClick={promptForLink}
      >
        <LinkIcon size={17} />
      </ToolButton>

      <Divider />

      <ToolButton
        title="كود سطري"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={17} />
      </ToolButton>
      <ToolButton
        title="كتلة كود (يدمج التحديد متعدّد الأسطر في كتلة واحدة)"
        active={editor.isActive('codeBlock')}
        onClick={handleCodeBlock}
      >
        <Code2 size={17} />
      </ToolButton>
    </div>
  );
}
