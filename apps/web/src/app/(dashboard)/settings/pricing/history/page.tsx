'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { api } from '@/lib/api';

interface PriceChange {
  id: string;
  room_name: string | null;
  rule_name: string;
  date: string;
  old_price: number | null;
  new_price: number | null;
  change_percent: number | null;
  trigger_value: number | null;
  created_at: string;
}

export default function PricingHistoryPage() {
  const propertyId = usePropertyId();
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propertyId) loadHistory();
  }, [propertyId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/properties/${propertyId}/pricing-rules/history`);
      setChanges(res.data.data);
    } catch {
      toast.error('Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p: number | null) =>
    p !== null ? `${(p / 100).toLocaleString()} сум` : '—';

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="История изменений цен" />
        <div className="flex justify-center mt-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader title="История изменений цен" />

      {changes.length === 0 ? (
        <p className="mt-8 text-center text-gray-500 py-12 bg-white rounded-xl border">
          Изменений цен пока нет
        </p>
      ) : (
        <div className="mt-6 bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Дата</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Номер</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Было</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Стало</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Изм.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Правило</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {changes.map((ch) => (
                <tr key={ch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{ch.date}</td>
                  <td className="px-4 py-3 text-gray-700">{ch.room_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatPrice(ch.old_price)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatPrice(ch.new_price)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    (ch.change_percent ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {ch.change_percent !== null ? `${ch.change_percent > 0 ? '+' : ''}${ch.change_percent}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ch.rule_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
