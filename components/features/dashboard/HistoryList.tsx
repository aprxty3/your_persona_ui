'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useHistory } from '@/core/application/useDashboard';
import { useDownloadPdf } from '@/core/application/useAccount';
import { usePdfStatus } from '@/core/application/usePdfStatus';
import { track } from '@/core/infrastructure/analytics';
import type { HistoryItem } from '@/core/domain/dashboard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// FR-F5 — paginated test history + PDF re-download (free within quota, 1
// result = 1 PDF, re-download always free).

export function HistoryList() {
  const t = useTranslations('dashboard.history');
  const tc = useTranslations('common');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistory(page);

  if (isLoading && !data) {
    return <p className="text-sm text-slate-500">{tc('loading')}</p>;
  }

  const items = data?.items ?? [];
  const totalPages = data?.pagination?.total_pages ?? 1;

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{t('empty')}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <HistoryRow key={item.result_id} item={item} />
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('prev')}
          </Button>
          <span className="text-xs font-bold text-slate-500">
            {t('pageOf', { page, total: totalPages })}
          </span>
          <Button
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('next')}
          </Button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const t = useTranslations('dashboard.history');
  const locale = useLocale();
  const download = useDownloadPdf();
  // Poll only after a download attempt found the PDF not ready yet (§4.3).
  const [pollingWanted, setPollingWanted] = useState(false);
  const pdfStatus = usePdfStatus(item.result_id, pollingWanted);

  const status = pdfStatus.data?.pdf_status;
  const ready = !pollingWanted || status === 'completed';

  const onDownload = () => {
    track('pdf_download_clicked');
    download.mutate(item.result_id, {
      onError: () => setPollingWanted(true), // not ready → start backoff polling
    });
  };

  const date = new Date(item.created_at).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <Link
          href={`/results/${item.result_id}`}
          className="font-extrabold text-primary-700 hover:underline"
        >
          {item.mbti_type || '????'}
        </Link>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
      <div className="shrink-0">
        {pollingWanted && status === 'failed' ? (
          <span className="text-xs font-bold text-red-600">{t('pdfFailed')}</span>
        ) : (
          <Button
            variant="outline"
            onClick={onDownload}
            loading={download.isPending || (pollingWanted && !ready)}
            disabled={pollingWanted && !ready}
          >
            {pollingWanted && !ready ? t('pdfPreparing') : t('downloadPdf')}
          </Button>
        )}
      </div>
    </Card>
  );
}
