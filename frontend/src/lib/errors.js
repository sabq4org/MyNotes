/**
 * Map a thrown axios error to a user-facing Arabic message.
 */
const ERROR_MESSAGES = {
  invalid_pin: 'الرقم السري غير صالح.',
  invalid_credentials: 'الرقم السري غير صحيح.',
  not_setup: 'لم يتم ضبط رقم سري بعد.',
  already_setup: 'تم ضبط رقم سري من قبل.',
  too_many_attempts: 'محاولات كثيرة فاشلة. حاول بعد دقائق.',
  unauthorized: 'الجلسة منتهية. سجّل الدخول من جديد.',
  token_expired: 'الجلسة منتهية. سجّل الدخول من جديد.',
  invalid_token: 'الجلسة غير صالحة. سجّل الدخول من جديد.',
  invalid_name: 'الاسم غير صالح.',
  invalid_description: 'الوصف طويل جداً.',
  invalid_title: 'العنوان طويل جداً.',
  invalid_content: 'المحتوى طويل جداً.',
  invalid_id: 'المعرّف غير صالح.',
  not_found: 'العنصر غير موجود.',
  no_fields: 'لا توجد حقول للتحديث.',
};

export function describeError(err, fallback = 'حدث خطأ. حاول مجدداً.') {
  if (!err) return fallback;
  const code = err?.response?.data?.error;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];

  const apiMessage = err?.response?.data?.message;
  if (apiMessage) return apiMessage;

  if (err.code === 'ERR_NETWORK') return 'تعذّر الاتصال بالخادم.';
  return fallback;
}
