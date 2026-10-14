const MESSAGES = {
  NOT_ALLOWED: 'ليست لديك صلاحية لهذا الإجراء.',
  NOT_FOUND: 'العنصر غير موجود أو حُذف.',
  NOT_ACTIVE: 'الحساب غير مفعّل.',
  ALREADY_ACTIVE: 'الحساب مفعّل بالفعل.',
  ALREADY_KICKED: 'الحساب موقوف بالفعل.',
  CANNOT_KICK_SELF: 'لا يمكنك إيقاف حسابك.',
  REASON_REQUIRED: 'اكتب السبب (3 أحرف على الأقل).',
  TASK_TAKEN: 'سبقك أحد واستلم هذه المهمة.',
  NOT_ASSIGNEE: 'هذه المهمة ليست مسندة إليك.',
  ALREADY_SUBMITTED: 'سلّمت هذه المهمة وهي قيد المراجعة.',
  TASK_CLOSED: 'هذه المهمة مغلقة.',
  FILES_REQUIRED: 'أرفق ملفاً واحداً على الأقل.',
  TOO_MANY_FILES: 'الحد الأقصى 10 ملفات في التسليم الواحد.',
  INVALID_FILE: 'أحد الملفات غير صالح.',
  FILE_NOT_UPLOADED: 'لم يكتمل رفع أحد الملفات، أعد المحاولة.',
  NOTE_TOO_LONG: 'الملاحظات طويلة جداً.',
  INVALID_TITLE: 'العنوان يجب أن يكون بين 3 و 120 حرفاً.',
  INVALID_TYPE: 'اختر نوع المهمة.',
  INVALID_DESCRIPTION: 'اكتب شرح المهمة.',
  INVALID_PRICE: 'السعر غير صالح.',
  INVALID_CURRENCY: 'العملة غير صالحة.',
  INVALID_DURATION: 'المدة يجب أن تكون بين 15 دقيقة وسنة.',
  TOO_MANY_IMAGES: 'الحد الأقصى 4 صور للمهمة.',
  IMAGE_NOT_FOUND: 'لم يكتمل رفع إحدى الصور.',
  INVALID_SCOPE: 'حدّد هل المهمة عامة أم لمطوّر محدد.',
  ASSIGNEE_NOT_ACTIVE: 'المطوّر المختار غير مفعّل.',
  INVALID_DECISION: 'قرار غير صالح.',
  ALREADY_REVIEWED: 'تمت مراجعة هذا التسليم مسبقاً.',
  INVALID_KIND: 'النوع غير صالح.',
  INVALID_PERCENT: 'نسبة الخصم يجب أن تكون بين 0 و 100.',
  ALREADY_REVOKED: 'أُلغي مسبقاً.',
  INVALID_AMOUNT: 'المبلغ غير صالح.',
  NOTHING_TO_PAY: 'لا يوجد رصيد مستحق بهذه العملة.',
  INVALID_NAME: 'الاسم يجب أن يكون بين 2 و 32 حرفاً.',
  INVALID_AGE: 'العمر غير صالح.',
  INVALID_SPECIALIZATION: 'اختر مجالك.',
  INVALID_ROBLOX: 'اسم روبلوكس غير صالح: 3–20 حرفاً إنجليزياً أو أرقام، وشرطة سفلية واحدة كحد أقصى.',
  INVALID_DISCORD: 'اكتب اسم المستخدم (username) في ديسكورد وليس الاسم الظاهر.',
  INVALID_EMAIL: 'البريد الإلكتروني غير صالح.',
  DUPLICATE_ACCOUNT_DATA: 'هذه البيانات مستخدمة في حساب آخر.',
  INVALID_ROLE: 'الدور غير صالح.',
  DUPLICATE_RANK: 'توجد رتبة بنفس الاسم.',
  INVALID_RANK: 'بيانات الرتبة غير صالحة.',
  INVALID_INVITE_URL: 'رابط الدعوة يجب أن يكون بالشكل https://discord.gg/xxxx',
  INVALID_SITE_URL: 'رابط الموقع غير صالح.',
  INVALID_BRAND_NAME: 'اسم الفريق يجب أن يكون بين 2 و 40 حرفاً.',
  INVALID_GUILD: 'السيرفر غير صالح.',
  NOT_READY: 'التسجيل غير متاح حالياً — الإدارة لم تكمل ربط البوت بعد.',
  RATE_LIMITED: 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
  BUSY: 'ضغط كبير على التسجيل الآن، حاول بعد دقائق.',
  EMAIL_TAKEN: 'هذا البريد مسجّل مسبقاً.',
  DISCORD_TAKEN: 'حساب الديسكورد هذا مرتبط بحساب آخر.',
  ROBLOX_TAKEN: 'اسم روبلوكس هذا مستخدم في حساب آخر.',
  DISCORD_NOT_IN_GUILD: 'لم نجد هذا المستخدم داخل سيرفر الديسكورد. ادخل السيرفر أولاً ثم أعد المحاولة.',
  DM_CLOSED: 'لم نستطع مراسلتك على الديسكورد. فعّل الرسائل الخاصة (Direct Messages) من إعدادات خصوصية السيرفر ثم أعد المحاولة.',
  REQUEST_NOT_FOUND: 'انتهت صلاحية الطلب. ابدأ التسجيل من جديد.',
  ALREADY_DONE: 'تم إنشاء الحساب مسبقاً — سجّل الدخول.',
  CODE_EXPIRED: 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
  TOO_MANY_ATTEMPTS: 'محاولات خاطئة كثيرة. اطلب رمزاً جديداً.',
  INVALID_CODE: 'الرمز غير صحيح.',
  WEAK_PASSWORD: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.',
  TRY_AGAIN: 'حدث تعارض بسيط، حاول مرة أخرى.',
  CREATE_FAILED: 'تعذّر إنشاء الحساب، حاول لاحقاً.',
  RESEND_LIMIT: 'وصلت للحد الأقصى لإعادة الإرسال. ابدأ من جديد.',
  RESEND_WAIT: 'انتظر قليلاً قبل طلب رمز جديد.',
  UNAUTHORIZED: 'انتهت الجلسة، سجّل الدخول من جديد.',
  SERVER_ERROR: 'حدث خطأ في الخادم، حاول لاحقاً.',
  FUNCTION_MISSING: 'البوت غير منشور بعد على Supabase (Edge Function).',
  NETWORK: 'تعذّر الاتصال. تحقّق من الإنترنت.',
  NAME_MISMATCH: 'الاسم لا يطابق هذا الحساب.',
  BANNED: 'تم إيقاف هذا الحساب.',
  BAD_LOGIN: 'البريد أو كلمة المرور غير صحيحة.',
  UPLOAD_FAILED: 'تعذّر رفع الملف.',
  FILE_TOO_BIG: 'الملف أكبر من الحد المسموح.',
  INTERACTIONS_URL_FAILED: 'رفض الديسكورد رابط التفاعلات — تأكد أن DISCORD_PUBLIC_KEY صحيح.',
  UNKNOWN_OP: 'عملية غير معروفة.',
};

export class AppError extends Error {
  constructor(code, extra = {}) {
    super(code);
    this.code = code;
    this.extra = extra;
  }
}

export function codeOf(err) {
  if (!err) return 'SERVER_ERROR';
  if (err.code && MESSAGES[err.code]) return err.code;
  const msg = String(err.message ?? err);
  const m = msg.match(/[A-Z][A-Z0-9_]{3,}/);
  if (m && MESSAGES[m[0]]) return m[0];
  if (/^INVALID_/.test(m?.[0] ?? '')) return 'INVALID_FIELD';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'BAD_LOGIN';
  if (lower.includes('banned')) return 'BANNED';
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) return 'NETWORK';
  if (lower.includes('jwt') || lower.includes('not authenticated')) return 'UNAUTHORIZED';
  if (lower.includes('payload too large') || lower.includes('maximum allowed size')) return 'FILE_TOO_BIG';
  return 'UNKNOWN';
}

export function errorText(err) {
  const code = codeOf(err);
  if (code === 'INVALID_FIELD') return 'قيمة غير صالحة في أحد الحقول.';
  if (code === 'UNKNOWN') return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
  return MESSAGES[code];
}
