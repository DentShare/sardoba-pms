'use client';

import { useState } from 'react';
import { usePlatformUsers } from '@/lib/hooks';
import {
  Search,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Users,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const roleLabels: Record<string, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  viewer: 'Только просмотр',
  super_admin: 'Суперадмин',
};

const roleBadge: Record<string, string> = {
  owner: 'badge badge-purple',
  admin: 'badge badge-blue',
  viewer: 'badge badge-gray',
  super_admin: 'badge bg-red-600 text-white border-0',
};

interface UserItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  propertyId: number | null;
  propertyName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const { data, isLoading, error } = usePlatformUsers({
    page,
    perPage: PAGE_SIZE,
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <span className="ml-3 text-gray-500">Загрузка пользователей...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <span className="ml-3 text-red-600">Не удалось загрузить пользователей</span>
      </div>
    );
  }

  const users: UserItem[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, lastPage: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-500 mt-1">Управление пользователями всех отелей</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Всего</p>
            <p className="text-xl font-bold">{meta.total}</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Активные</p>
            <p className="text-xl font-bold text-emerald-600">{users.filter((u: UserItem) => u.isActive).length}</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Владельцы</p>
            <p className="text-xl font-bold text-purple-600">{users.filter((u: UserItem) => u.role === 'owner').length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по имени, email..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field w-auto"
        >
          <option value="all">Все роли</option>
          <option value="owner">Владелец</option>
          <option value="admin">Администратор</option>
          <option value="viewer">Только просмотр</option>
        </select>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Имя</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Отель</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Роль</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Статус</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Последний вход</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: UserItem) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.propertyName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={roleBadge[u.role] ?? 'badge badge-gray'}>{roleLabels[u.role] ?? u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'badge badge-green' : 'badge badge-red'}>
                      {u.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600"
                        title="Просмотр"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <p className="text-sm text-gray-500">Всего: {meta.total}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">{page} / {meta.lastPage}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={page >= meta.lastPage}
              className="p-1.5 rounded-lg hover:bg-white border disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Профиль пользователя</h2>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-lg">{selectedUser.name}</p>
                <span className={roleBadge[selectedUser.role] ?? 'badge badge-gray'}>
                  {roleLabels[selectedUser.role] ?? selectedUser.role}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Отель</p>
                <p className="font-medium">{selectedUser.propertyName ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Статус</p>
                <span className={selectedUser.isActive ? 'badge badge-green' : 'badge badge-red'}>
                  {selectedUser.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Последний вход</p>
                <p className="font-medium">{formatDateTime(selectedUser.lastLoginAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Дата регистрации</p>
                <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">ID</p>
                <p className="font-medium font-mono">#{selectedUser.id}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setSelectedUser(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
