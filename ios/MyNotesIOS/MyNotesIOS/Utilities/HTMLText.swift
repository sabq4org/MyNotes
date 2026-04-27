import SwiftUI
import WebKit

// MARK: - String helpers used everywhere (kept compatible with the original API)

extension String {
    /// Strip all HTML tags / entities and collapse whitespace. Matches the
    /// behaviour of `frontend/src/lib/format.js#stripHtml`.
    var htmlStripped: String {
        var text = self
        text = text.replacingOccurrences(of: "</p>", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<br>", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<br/>", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<br />", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<li>", with: "• ", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "</li>", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        let entities: [(String, String)] = [
            ("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
            ("&quot;", "\""), ("&#39;", "'")
        ]
        for (entity, value) in entities { text = text.replacingOccurrences(of: entity, with: value) }
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Wrap plain text into the same simple `<p>…</p>` HTML the iOS app
    /// historically produced. Used as a fallback when the user edits in the
    /// plain editor pane.
    var asSimpleHTML: String {
        let escaped = self
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let paragraphs = escaped
            .components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .map { "<p>\($0)</p>" }
        return paragraphs.isEmpty ? "" : paragraphs.joined(separator: "\n")
    }
}

// MARK: - Relative time formatter (mirrors `relativeTime` in the web app)

enum RelativeTime {
    static func format(_ iso: String?) -> String {
        guard let iso, let date = parseISO(iso) else { return "" }
        let diff = Date().timeIntervalSince(date)
        let minute: TimeInterval = 60
        let hour: TimeInterval = 3600
        let day: TimeInterval = 86_400

        if diff < minute { return "الآن" }
        if diff < hour { return "قبل \(Int(diff / minute)) دقيقة" }
        if diff < day { return "قبل \(Int(diff / hour)) ساعة" }
        if diff < 7 * day { return "قبل \(Int(diff / day)) يوم" }

        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.dateStyle = .medium
        return f.string(from: date)
    }

    private static let isoFormatters: [ISO8601DateFormatter] = {
        let a = ISO8601DateFormatter()
        a.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let b = ISO8601DateFormatter()
        b.formatOptions = [.withInternetDateTime]
        return [a, b]
    }()

    private static func parseISO(_ s: String) -> Date? {
        for f in isoFormatters { if let d = f.date(from: s) { return d } }
        return nil
    }
}

// MARK: - Note HTML renderer

/// `NoteContentView` renders the rich HTML that the web editor produces
/// (Tiptap output: paragraphs, headings, lists, task-lists, code blocks,
/// blockquotes, links, etc.). We use a `WKWebView` because UIKit's native
/// `NSAttributedString(data:options:)` flattens too many of our styles
/// (no task-list checkboxes, broken RTL handling, no code blocks).
///
/// The webview renders read-only content in an offline-friendly,
/// auto-resizing way. Same Tailwind-inspired CSS the web uses, ported here.
struct NoteContentView: UIViewRepresentable {
    let html: String
    var onTaskToggle: ((String) -> Void)? = nil
    @Binding var contentHeight: CGFloat

    init(html: String,
         contentHeight: Binding<CGFloat>,
         onTaskToggle: ((String) -> Void)? = nil) {
        self.html = html
        self._contentHeight = contentHeight
        self.onTaskToggle = onTaskToggle
    }

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let userContent = WKUserContentController()
        userContent.add(context.coordinator, name: "taskToggle")
        userContent.add(context.coordinator, name: "heightChanged")
        config.userContentController = userContent
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let web = WKWebView(frame: .zero, configuration: config)
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.backgroundColor = .clear
        web.navigationDelegate = context.coordinator
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        let prev = context.coordinator.lastHTML
        guard prev != html else { return }
        context.coordinator.lastHTML = html
        web.loadHTMLString(Self.wrap(html), baseURL: nil)
    }

    static func wrap(_ inner: String) -> String {
        let body = inner.isEmpty ? "<p style='color:#8d8d97'>ملاحظة فارغة</p>" : inner
        return """
        <!doctype html>
        <html lang="ar" dir="rtl">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          :root { color-scheme: light; }
          html, body { margin: 0; padding: 0; background: transparent; }
          body {
            font-family: -apple-system, "SF Arabic", "IBM Plex Sans Arabic", system-ui, sans-serif;
            font-size: 16px; line-height: 1.75; color: #18181c;
            padding: 4px 16px 24px; word-wrap: break-word;
          }
          h1,h2,h3,h4 { font-weight: 700; margin: 1.1em 0 0.45em; }
          h1 { font-size: 1.6rem; } h2 { font-size: 1.35rem; } h3 { font-size: 1.15rem; }
          p { margin: 0.7em 0; }
          a { color: #4f46e5; text-decoration: none; }
          a:active { text-decoration: underline; }
          ul, ol { padding-inline-start: 1.4rem; margin: 0.6em 0; }
          li { margin: 0.25em 0; }
          blockquote {
            border-right: 4px solid #a5b4fc; border-left: 0;
            padding: 6px 14px; margin: 1em 0;
            color: #3f3f47; background: rgba(238,242,255,.45);
            border-radius: 8px;
          }
          code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 0.88em; background: #eeeef0; color: #312e81;
            padding: 2px 6px; border-radius: 6px;
            direction: ltr; unicode-bidi: embed;
          }
          pre {
            margin: 1em 0; padding: 14px 16px; border-radius: 12px;
            background: #18181c; color: #eeeef0; overflow-x: auto;
            direction: ltr; text-align: left;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 13px; line-height: 1.55;
            white-space: pre-wrap; overflow-wrap: anywhere;
          }
          pre code { background: transparent; color: inherit; padding: 0; }
          ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0.5em 0; }
          ul[data-type="taskList"] li {
            display: flex; align-items: flex-start; gap: 0.6rem; margin: 0.25em 0;
          }
          ul[data-type="taskList"] li > div { flex: 1; }
          ul[data-type="taskList"] li[data-checked="true"] > div p {
            color: #8d8d97; text-decoration: line-through;
          }
          ul[data-type="taskList"] input[type="checkbox"] {
            width: 18px; height: 18px; border-radius: 5px;
            border: 1.5px solid #b7b7bf; background: white;
            appearance: none; -webkit-appearance: none;
            display: inline-grid; place-content: center;
            margin-top: 6px; cursor: pointer;
          }
          ul[data-type="taskList"] input[type="checkbox"]:checked {
            background: #4f46e5; border-color: #4f46e5;
          }
          ul[data-type="taskList"] input[type="checkbox"]:checked::before {
            content: ''; width: 9px; height: 9px;
            background: white;
            clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
          }
          img { max-width: 100%; height: auto; border-radius: 10px; }
        </style>
        </head>
        <body>
          <div id="note">\(body)</div>
          <script>
            function reportHeight() {
              const h = document.documentElement.scrollHeight;
              window.webkit.messageHandlers.heightChanged.postMessage(h);
            }
            window.addEventListener('load', reportHeight);
            new ResizeObserver(reportHeight).observe(document.body);

            document.addEventListener('change', (e) => {
              const t = e.target;
              if (!(t instanceof HTMLInputElement) || t.type !== 'checkbox') return;
              const li = t.closest('li[data-type="taskItem"]');
              if (!li) return;
              li.setAttribute('data-checked', t.checked ? 'true' : 'false');
              window.webkit.messageHandlers.taskToggle.postMessage(
                document.getElementById('note').innerHTML
              );
            });

            // Open links externally instead of navigating inside the webview.
            document.addEventListener('click', (e) => {
              const a = e.target.closest && e.target.closest('a[href]');
              if (!a) return;
              e.preventDefault();
              window.webkit.messageHandlers.heightChanged.postMessage(0);
            });
          </script>
        </body></html>
        """
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: NoteContentView
        var lastHTML: String = "__init__"
        init(_ parent: NoteContentView) { self.parent = parent }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "taskToggle":
                guard let html = message.body as? String else { return }
                parent.onTaskToggle?(html)
            case "heightChanged":
                if let h = message.body as? CGFloat, h > 0 {
                    DispatchQueue.main.async { [weak self] in
                        guard let self else { return }
                        if abs(self.parent.contentHeight - h) > 1 {
                            self.parent.contentHeight = h
                        }
                    }
                }
            default: break
            }
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}
