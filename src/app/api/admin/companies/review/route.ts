import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, requireAdminApiAccess } from '@/lib/server/adminAccess';
import { isSmtpMailConfigured, sendSmtpMail } from '@/lib/server/smtpMail';

type CompanyReviewStatus = 'approved' | 'rejected' | 'needs_changes' | 'inactive' | 'pending_review';

const REVIEW_STATUS_COPY: Record<CompanyReviewStatus, { title: string; message: string; severity: 'success' | 'warning' | 'danger' | 'info'; emailSubject: string }> = {
  approved: {
    title: 'تم اعتماد شركتك',
    message: 'تمت مراجعة بيانات شركتك واعتمادها للنشر داخل دليل THE SFM.',
    severity: 'success',
    emailSubject: 'تم اعتماد شركتك في THE SFM',
  },
  rejected: {
    title: 'تم رفض طلب الشركة',
    message: 'تمت مراجعة طلب شركتك ولم يتم اعتماده حالياً. يمكنك مراجعة الملاحظات ثم إعادة الإرسال عند الحاجة.',
    severity: 'danger',
    emailSubject: 'تم رفض طلب شركتك في THE SFM',
  },
  needs_changes: {
    title: 'طلب الشركة يحتاج تعديلاً',
    message: 'تمت مراجعة بيانات شركتك وتحتاج بعض التعديلات قبل الاعتماد والنشر.',
    severity: 'warning',
    emailSubject: 'طلب شركتك يحتاج تعديلاً في THE SFM',
  },
  inactive: {
    title: 'تم إيقاف ظهور الشركة',
    message: 'تم تغيير حالة شركتك إلى غير نشطة داخل دليل THE SFM.',
    severity: 'info',
    emailSubject: 'تم تحديث حالة شركتك في THE SFM',
  },
  pending_review: {
    title: 'تمت إعادة الشركة للمراجعة',
    message: 'تمت إعادة طلب شركتك إلى قائمة المراجعة داخل THE SFM.',
    severity: 'info',
    emailSubject: 'تمت إعادة طلب شركتك للمراجعة في THE SFM',
  },
};

function siteOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;
}

function buildReviewMessage(status: CompanyReviewStatus, companyName: string, adminNotes?: string | null) {
  const copy = REVIEW_STATUS_COPY[status];
  const notes = adminNotes?.trim();
  return notes ? `${copy.message}\n\nملاحظات الإدارة:\n${notes}` : copy.message;
}

function buildReviewEmailHtml(input: { title: string; companyName: string; message: string; actionUrl: string }) {
  return `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;line-height:1.8;color:#0f172a;background:#f1f8ff;padding:24px">
      <div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:24px">
        <p style="margin:0 0 8px;color:#0b76e0;font-weight:800">THE SFM</p>
        <h1 style="margin:0 0 12px;font-size:24px">${input.title}</h1>
        <p style="margin:0 0 12px"><strong>${input.companyName}</strong></p>
        <p style="white-space:pre-line;margin:0 0 20px">${input.message}</p>
        <a href="${input.actionUrl}" style="display:inline-block;background:linear-gradient(135deg,#0b76e0,#18d4d4);color:#ffffff;text-decoration:none;font-weight:800;border-radius:14px;padding:12px 18px">مراجعة الطلب</a>
      </div>
    </div>
  `;
}

async function notifyCompanyOwner(input: {
  req: NextRequest;
  supabase: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>;
  company: { id: string; user_id: string | null; company_name: string; category: string | null; email: string | null };
  status: CompanyReviewStatus;
  adminNotes?: string | null;
}) {
  const { req, supabase, company, status, adminNotes } = input;
  const copy = REVIEW_STATUS_COPY[status];
  const message = buildReviewMessage(status, company.company_name, adminNotes);
  const actionUrl = `${siteOrigin(req)}/companies/${company.id}`;

  const ownerEmail = company.user_id
    ? (await supabase.auth.admin.getUserById(company.user_id)).data.user?.email ?? null
    : null;
  const recipientEmail = ownerEmail || company.email;

  const operations: Promise<unknown>[] = [];

  if (company.user_id) {
    operations.push(
      (async () => {
        const { error } = await supabase.from('notifications').insert({
          user_id: company.user_id,
          type: 'company_review',
          title: copy.title,
          message,
          read: false,
          link: `/companies/${company.id}`,
          status: 'unread',
          severity: copy.severity,
          source_module: 'company_listings',
          source_id: company.id,
          action_url: `/companies/${company.id}`,
          metadata: {
            company_id: company.id,
            company_name: company.company_name,
            category: company.category,
            review_status: status,
          },
        } as Record<string, unknown>);
        if (error) throw error;
      })(),
    );
  }

  if (recipientEmail && isSmtpMailConfigured()) {
    operations.push(
      sendSmtpMail({
        to: recipientEmail,
        subject: copy.emailSubject,
        text: `${copy.title}\n\n${company.company_name}\n\n${message}\n\n${actionUrl}`,
        html: buildReviewEmailHtml({ title: copy.title, companyName: company.company_name, message, actionUrl }),
      }),
    );
  }

  const results = await Promise.allSettled(operations);
  const failed = results.filter(result => result.status === 'rejected');
  if (failed.length) {
    console.error('[AdminCompanies] owner notification failed', failed);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiAccess(req, 'company_reviews');
  if (!auth.ok) return NextResponse.json({ error: auth.code }, { status: auth.status });
  const user = auth.user;

  const body = await req.json();
  const { companyId, status, adminNotes } = body;

  const VALID_STATUSES: CompanyReviewStatus[] = ['approved', 'rejected', 'needs_changes', 'inactive', 'pending_review'];
  if (!companyId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = auth.admin;
  const visibleReviewNote = status === 'rejected' || status === 'needs_changes'
    ? (typeof adminNotes === 'string' && adminNotes.trim() ? adminNotes.trim() : null)
    : null;

  const { data: companyBeforeReview, error: companyError } = await supabase
    .from('company_listings')
    .select('id,user_id,company_name,category,email,status,pending_update,update_status,deletion_requested')
    .eq('id', companyId)
    .single();

  if (companyError || !companyBeforeReview) {
    console.error('[AdminCompanies] company lookup error:', companyError);
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const pendingUpdate = companyBeforeReview.pending_update && typeof companyBeforeReview.pending_update === 'object'
    ? companyBeforeReview.pending_update as Record<string, unknown>
    : null;
  const appliesPendingUpdate = Boolean(status === 'approved' && companyBeforeReview.update_status === 'pending_update' && pendingUpdate);
  const acceptsDeletion = status === 'inactive' && Boolean(companyBeforeReview.deletion_requested);
  const updatePayload: Record<string, unknown> = {
    ...(appliesPendingUpdate && pendingUpdate ? pendingUpdate : {}),
    status,
    admin_notes: visibleReviewNote,
    update_status: 'none',
    pending_update: null,
    deletion_requested: acceptsDeletion ? false : Boolean(companyBeforeReview.deletion_requested) && status !== 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.email,
    ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
  };

  if (acceptsDeletion || status === 'approved') {
    updatePayload.deletion_requested_at = null;
  }

  const { error } = await supabase
    .from('company_listings')
    .update(updatePayload)
    .eq('id', companyId);

  if (error) {
    console.error('[AdminCompanies] update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyCompanyOwner({
    req,
    supabase,
    company: {
      id: String(companyBeforeReview.id),
      user_id: companyBeforeReview.user_id ? String(companyBeforeReview.user_id) : null,
      company_name: String(companyBeforeReview.company_name),
      category: companyBeforeReview.category ? String(companyBeforeReview.category) : null,
      email: companyBeforeReview.email ? String(companyBeforeReview.email) : null,
    },
    status,
    adminNotes: visibleReviewNote,
  });

  return NextResponse.json({ ok: true });
}
