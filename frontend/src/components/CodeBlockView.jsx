import { useState } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlockView({ node }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = node.textContent || '';
    if (!text) return;

    let copiedOk = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copiedOk = true;
      }
    } catch {
      copiedOk = false;
    }

    if (!copiedOk) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        copiedOk = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        copiedOk = false;
      }
    }

    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <NodeViewWrapper className="code-block" dir="ltr">
      <button
        type="button"
        onClick={handleCopy}
        contentEditable={false}
        className="code-block__copy"
        aria-label={copied ? 'تم النسخ' : 'نسخ الكود'}
        title={copied ? 'تم النسخ' : 'نسخ'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
      </button>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
