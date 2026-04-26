# MyNotes — مفكرتي الشخصية

تطبيق ويب شخصي متكامل لإدارة المشاريع والملاحظات. مشروع واحد ⇐ مجلّد، داخله ملاحظات بمحرّر نصوص متطوّر، قوائم مهام، ووسوم للفلترة، مع إمكانية تصدير نسخة احتياطية كاملة.

## التقنيات

- **Frontend:** React 19 + Vite + Tailwind CSS v3 + React Router + axios + lucide-react
- **Rich-text Editor:** Tiptap (ProseMirror) + StarterKit + TaskList + Link + CodeBlock + Placeholder + `@tailwindcss/typography`
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (يعمل على Neon — قاعدة بيانات سحابية بلا خادم)
- **اللغة:** عربية كاملة مع RTL وخطوط `IBM Plex Sans Arabic`.

## هيكل المشروع

```
MyNotes/
├── backend/                    # Node/Express + PostgreSQL
│   ├── src/
│   │   ├── server.js           # نقطة الدخول
│   │   ├── app.js              # إعداد Express
│   │   ├── config.js
│   │   ├── auth/               # tokens + login throttle
│   │   ├── db/                 # schema.sql + database.js
│   │   ├── middleware/
│   │   └── routes/             # auth.js, projects.js, notes.js,
│   │                           # tags.js, search.js, backup.js
│   ├── .env / .env.example
│   └── package.json
└── frontend/                   # React + Vite + Tailwind
    ├── src/
    │   ├── main.jsx, App.jsx
    │   ├── api/                # client.js, auth.js, projects.js, notes.js,
    │   │                       # tags.js, search.js, backup.js
    │   ├── lib/                # storage.js, errors.js, format.js, useDebouncedSave.js
    │   ├── context/            # AuthContext
    │   ├── components/         # AppHeader, Modal, ProjectCard, NoteEditor,
    │   │                       # EditorToolbar, NoteListItem, SaveIndicator,
    │   │                       # TagInput, TagChip, SearchModal, BackupMenu, ...
    │   └── pages/              # SetupPage, LoginPage, DashboardPage, ProjectPage
    ├── tailwind.config.js
    ├── vite.config.js          # /api → http://localhost:4000
    └── package.json
```

## ✅ المرحلة 1 — أساس الخادم

- مخطط Postgres كامل (settings, projects, notes, tags, note_tags, tasks).
- نظام مصادقة برقم سرّي واحد عبر `bcrypt` و JWT.
- محدّد محاولات (8 محاولات / 15 دقيقة).
- نقاط: `/api/auth/{status,setup,login,change}`, `/api/me`, `/api/health`.

## ✅ المرحلة 2 — الواجهة الأمامية ولوحة التحكم

- Vite + React + Tailwind v3 مع RTL وتصميم نظيف عصري.
- **شاشة الإعداد الأوّلي**: تظهر لمن لا يوجد لديه PIN بعد. تطلب إدخال PIN وتأكيده ثم تنشئه وتدخل المستخدم تلقائياً.
- **شاشة الدخول**: تظهر لمن لديه PIN؛ تتحوّل تلقائياً.
- **لوحة المشاريع**: شبكة بطاقات للمشاريع، إنشاء، تعديل، حذف (مع تأكيد)، اختيار لون، عداد ملاحظات.
- إدارة جلسة JWT في `localStorage`، تسجيل خروج، وانتهاء جلسة تلقائي عند 401.
- `vite.config.js` يحوي proxy لـ `/api` ⇐ لا حاجة لإعداد CORS أثناء التطوير.

### endpoints المضافة في هذه المرحلة

| Method | Path                      | Auth | الوصف |
|--------|---------------------------|------|-------|
| GET    | `/api/projects`           | JWT  | قائمة المشاريع مع `notesCount`. |
| POST   | `/api/projects`           | JWT  | إنشاء `{ name, description?, color?, icon? }`. |
| GET    | `/api/projects/:id`       | JWT  | تفاصيل مشروع. |
| PATCH  | `/api/projects/:id`       | JWT  | تعديل أي حقل. |
| DELETE | `/api/projects/:id`       | JWT  | حذف (مع جميع ملاحظاته بسبب `ON DELETE CASCADE`). |

## ✅ المرحلة 3 — قلب النظام: الملاحظات والمحرّر

- **صفحة المشروع** على `/projects/:id` بتخطيط مزدوج: سايدبار للملاحظات + محرّر.
- **محرّر Tiptap** مع شريط أدوات كامل: عناوين (H1–H3)، **غامق**، _مائل_، ~~مشطوب~~، قوائم نقطية ومرقّمة، **قوائم مهام** (checkboxes)، اقتباس، روابط، تراجع/إعادة.
- **حفظ تلقائي مُؤجَّل (debounced)**: تكتب، ينتظر 700ms، يحفظ. مؤشّر صغير: "تعديل…/جارٍ الحفظ…/محفوظ/فشل".
- **بحث محلّي** داخل الملاحظات (في العنوان والمحتوى النصّي).
- **تثبيت ملاحظة**: المثبَّتة تظهر في القمّة دائماً.
- **حذف بتأكيد**.
- **متجاوب**: على الجوال يظهر السايدبار كامل، وعند فتح ملاحظة يتحوّل لشاشة محرّر مع زر رجوع.
- **RTL كامل** للمحرّر، تنسيق `prose` عبر `@tailwindcss/typography`، وتصميم خاصّ لقوائم المهام بالخانات (checkboxes).

### endpoints المضافة في هذه المرحلة

| Method | Path                                        | Auth | الوصف |
|--------|---------------------------------------------|------|-------|
| GET    | `/api/projects/:projectId/notes`            | JWT  | كل ملاحظات المشروع (مرتّبة: مثبَّت → الأحدث). |
| POST   | `/api/projects/:projectId/notes`            | JWT  | إنشاء `{ title?, content?, isPinned?, tags? }`. |
| GET    | `/api/notes/:id`                            | JWT  | تفاصيل ملاحظة (مع وسومها). |
| PATCH  | `/api/notes/:id`                            | JWT  | تعديل أيٍّ من `title` / `content` / `isPinned` / `tags`. |
| DELETE | `/api/notes/:id`                            | JWT  | حذف. |

## ✅ المرحلة 4 — الوسوم، البحث الشامل، النسخ الاحتياطي

- **الوسوم (Tags)**: لكل ملاحظة وسوم بحرّية، **case-insensitive** (الوسم نفسه يُعاد استخدامه بصرف النظر عن حالة الأحرف). يُضاف الوسم بحقل chips أسفل العنوان مع **اقتراحات تلقائية** من بقية الوسوم في النظام.
- **عرض الوسوم**: chips ملوّنة (لون ثابت لكل وسم بحسب اسمه) في قائمة الملاحظات، في المحرّر، ونتائج البحث.
- **فلترة بالوسم داخل المشروع**: شريط تحت مربّع البحث يحوي وسوم المشروع. اضغط أحدها للفلترة، أو "مسح الفلتر" للإلغاء.
- **بحث شامل (Cmd/Ctrl+K)**: مودال يبحث في عناوين ومحتوى ووسوم كل الملاحظات في كل المشاريع. يدعم تنقّل لوحة المفاتيح (↑↓ + Enter + Esc). ابدأ السؤال بـ `#` لتقييد البحث على الوسوم فقط (مثال: `#مهم`).
- **نسخ احتياطي**: قائمة من رأس الصفحة:
  - **تصدير**: تنزيل ملف JSON (`mynotes-backup-<timestamp>.json`) يحوي كل المشاريع والملاحظات والوسوم.
  - **استيراد**: بعد تأكيد، يستبدل كل البيانات بمحتوى الملف. الـ PIN/JWT secret لا يتأثّران.
- **رابط مباشر للملاحظة**: التنقّل من البحث الشامل يمرّر `?note=ID`، ويختار الـ ProjectPage الملاحظة تلقائياً.

### endpoints المضافة في هذه المرحلة

| Method | Path                              | Auth | الوصف |
|--------|-----------------------------------|------|-------|
| GET    | `/api/tags`                       | JWT  | قائمة الوسوم مع `noteCount` لكلّ وسم. |
| GET    | `/api/tags/:id/notes`             | JWT  | كل الملاحظات المُسوّمة بهذا الوسم عبر المشاريع. |
| GET    | `/api/search?q=…`                 | JWT  | بحث شامل في العنوان/المحتوى/الوسم. ابدأ بـ `#` للوسم فقط. |
| GET    | `/api/backup/export`              | JWT  | تنزيل JSON كامل (downloadable attachment). |
| POST   | `/api/backup/import`              | JWT  | استيراد JSON واستبدال كل البيانات. |

ملاحظات: حدّ JSON الجسم في الخادم رُفع إلى **25MB** ليستوعب ملفات النسخ الاحتياطي الكبيرة. التصدير لا يحتوي أي أسرار (لا hash للـ PIN ولا JWT secret).

## التشغيل (للتطوير)

تحتاج نافذتي طرفية: واحدة للخادم، وأخرى للواجهة.

### 1) الخادم (Backend)

```bash
cd backend
cp .env.example .env
# ضع DATABASE_URL في .env (مثال: Neon connection string)
npm install                # مرة واحدة
npm run dev                # http://localhost:4000
```

### 2) الواجهة (Frontend)

```bash
cd frontend
npm install                # مرة واحدة
npm run dev                # http://localhost:5173
```

افتح المتصفح على `http://localhost:5173` وستظهر شاشة **الإعداد الأولي** لتختار رقمك السري. بعدها تدخل لوحة المشاريع مباشرة.

### بناء الإنتاج محلياً

```bash
cd frontend && npm run build      # ينتج dist/
cd backend  && npm start          # يخدم API
```

## النشر على Vercel (Services preset)

المشروع جاهز للنشر كخدمتين تحت دومين واحد عبر ميزة Vercel **Services** (preset متعدد الخدمات).

1. **Import** المستودع من GitHub في Vercel.
2. اختر Application Preset: **Services** (سيكتشف `frontend/` كـ Vite و `backend/` كـ Express تلقائياً).
3. سيُكتشف `vercel.json` في الـ root الذي يحتوي:

   ```json
   {
     "experimentalServices": {
       "frontend": { "entrypoint": "frontend", "routePrefix": "/", "framework": "vite" },
       "backend":  { "entrypoint": "backend",  "routePrefix": "/api", "framework": "express" }
     }
   }
   ```
4. **Environment Variables** (على مستوى المشروع — تشمل الخدمتين):

   | Key | Value (مثال) | ملاحظة |
   |-----|--------------|--------|
   | `DATABASE_URL` | `postgresql://USER:PASS@…neon.tech/neondb?sslmode=require` | إلزامي. |
   | `JWT_SECRET` | _اتركه فارغاً_ | الخادم يولّد واحداً ويخزّنه في القاعدة عند أوّل تشغيل. |
   | `JWT_EXPIRES_IN_HOURS` | `72` | اختياري. |
   | `BCRYPT_COST` | `12` | اختياري. |
   | `CORS_ORIGIN` | _اتركه فارغاً_ | الواجهة والخادم على نفس الدومين، فلا حاجة. |

5. اضغط **Deploy**. ستحصل على دومين مثل `my-notes.vercel.app` يخدّم الواجهة، وكل طلبات `/api/*` تُوجَّه تلقائياً للخادم.

### بعد النشر

- ادخل على الدومين → ستظهر شاشة الإعداد الأوّلي لاختيار الـ PIN.
- إذا أعدت النشر، الـ JWT_SECRET المخزَّن في القاعدة يبقى ثابتاً، فلن يخرج المستخدمون.
- لتدوير المفتاح يدوياً: احذف `master_jwt_secret` من جدول `settings` في القاعدة، أو اضبط `JWT_SECRET` كمتغيّر بيئي ليتجاوز الـ DB.

## النسخ الاحتياطي

- من رأس الصفحة، افتح قائمة "نسخ احتياطي":
  - **تصدير نسخة احتياطية** ⇒ تنزيل ملف JSON بكل البيانات.
  - **استيراد نسخة** ⇒ اختيار ملف JSON، تأكيد، ثم استبدال كل البيانات.
- لمزيد من الأمان يمكنك أيضاً استخدام `pg_dump` يدوياً، أو snapshots/branches من لوحة Neon.

## ⚠️ ملاحظة أمنية

- لا تشارك `DATABASE_URL` في أي مكان عام (محادثات، مستودعات، سكرين شوت).
- الملف `.env` مُضاف إلى `.gitignore`.
- إذا تسرّبت كلمة مرور قاعدة البيانات، أعد توليدها من لوحة Neon فوراً.

## المراحل القادمة (اختيارية)

- **مهام مستقلة**: استثمار جدول `tasks` (موجود في المخطط) لعرض قوائم مهام منفصلة عن المحتوى الغني، مع تواريخ استحقاق.
- **محفوظات/سلّة محذوفات**: حذف ناعم للملاحظات مع إمكانية الاستعادة.
- **مرفقات/صور**: رفع صور وتخزينها (object storage).
- **تطبيق PWA**: تثبيت الموقع كتطبيق + وضع غير متصل أساسي.
- **مزامنة عبر الأجهزة**: إن أردت بعد توسيع نموذج المستخدمين.
