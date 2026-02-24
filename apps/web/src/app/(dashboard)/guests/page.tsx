'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Table, type Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useGuests, useCreateGuest } from '@/lib/hooks/use-guests';
import { exportOvir } from '@/lib/api/guests';
import { formatMoney } from '@/lib/utils/money';
import type { Guest } from '@sardoba/shared';

const PROPERTY_ID = 1;

export default function GuestsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showOvir, setShowOvir] = useState(false);
  const [ovirFrom, setOvirFrom] = useState('');
  const [ovirTo, setOvirTo] = useState('');

  // New guest form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('UZ');

  const createGuest = useCreateGuest();

  const filters = useMemo(
    () => ({
      propertyId: PROPERTY_ID,
      search: search || undefined,
      page,
      perPage: 20,
    }),
    [search, page],
  );

  const { data, isLoading } = useGuests(filters);

  const handleRowClick = useCallback(
    (guest: Guest) => {
      router.push(`/guests/${guest.id}`);
    },
    [router],
  );

  const handleAddGuest = useCallback(async () => {
    if (!firstName || !lastName || !phone) {
      toast.error('Заполните обязательные поля');
      return;
    }
    try {
      await createGuest.mutateAsync({
        property_id: PROPERTY_ID,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email || undefined,
        nationality: nationality || undefined,
      });
      setShowAdd(false);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setNationality('UZ');
    } catch {
      // Handled by mutation
    }
  }, [firstName, lastName, phone, email, nationality, createGuest]);

  const handleExportOvir = useCallback(async () => {
    if (!ovirFrom || !ovirTo) {
      toast.error('Укажите даты');
      return;
    }
    try {
      const blob = await exportOvir(ovirFrom, ovirTo, PROPERTY_ID);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ovir_${ovirFrom}_${ovirTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setShowOvir(false);
      toast.success('Файл скачан');
    } catch {
      toast.error('Ошибка при экспорте');
    }
  }, [ovirFrom, ovirTo]);

  const columns: Column<Guest>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Имя',
        render: (g) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {g.firstName} {g.lastName}
            </span>
            {g.isVip && (
              <Badge variant="gold" size="sm">VIP</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Телефон',
        render: (g) => <span className="text-gray-600">{g.phone}</span>,
      },
      {
        key: 'nationality',
        header: 'Национальность',
        render: (g) => (
          <span className="text-gray-600">{g.nationality || '---'}</span>
        ),
        hideOnMobile: true,
      },
      {
        key: 'visits',
        header: 'Визиты',
        render: (g) => (
          <span className="font-medium text-gray-900">{g.visitCount}</span>
        ),
        hideOnMobile: true,
      },
      {
        key: 'revenue',
        header: 'Выручка',
        render: (g) => (
          <span className="font-medium text-gray-900">
            {formatMoney(g.totalRevenue)}
          </span>
        ),
        hideOnMobile: true,
      },
    ],
    [],
  );

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Гости"
        subtitle="База гостей и CRM"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowOvir(true)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              Экспорт ОВИР
            </Button>
            <Button
              onClick={() => setShowAdd(true)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
              }
            >
              Новый гость
            </Button>
          </div>
        }
      />

      {/* Search */}
      <div className="mb-4">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Поиск по имени или телефону..."
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          }
        />
      </div>

      {/* Table */}
      <Table<Guest>
        columns={columns}
        data={data?.data ?? []}
        rowKey={(g) => g.id}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        emptyMessage="Нет гостей"
      />

      {data?.meta && (
        <div className="mt-4">
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}

      {/* Add Guest Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Новый гость"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddGuest} loading={createGuest.isPending}>
              Добавить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Имя"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Фамилия"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            label="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998..."
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            label="Национальность"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            options={[
              { value: 'UZ', label: 'Узбекистан' },
              { value: 'RU', label: 'Россия' },
              { value: 'KZ', label: 'Казахстан' },
              { value: 'DE', label: 'Германия' },
              { value: 'FR', label: 'Франция' },
              { value: 'US', label: 'США' },
              { value: 'GB', label: 'Великобритания' },
              { value: 'CN', label: 'Китай' },
              { value: 'KR', label: 'Южная Корея' },
              { value: 'JP', label: 'Япония' },
              { value: 'TR', label: 'Турция' },
              { value: 'OTHER', label: 'Другое' },
            ]}
          />
        </div>
      </Modal>

      {/* OVIR Export Modal */}
      <Modal
        open={showOvir}
        onClose={() => setShowOvir(false)}
        title="Экспорт ОВИР"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowOvir(false)}>
              Отмена
            </Button>
            <Button onClick={handleExportOvir}>
              Скачать CSV
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Выберите период для экспорта данных гостей в формате ОВИР.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата с"
              type="date"
              value={ovirFrom}
              onChange={(e) => setOvirFrom(e.target.value)}
              required
            />
            <Input
              label="Дата по"
              type="date"
              value={ovirTo}
              onChange={(e) => setOvirTo(e.target.value)}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
