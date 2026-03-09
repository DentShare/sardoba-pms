'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, type Column } from '@/components/ui/Table';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  listUsers,
  inviteUser,
  updateUserRole,
  removeUser,
  type PropertyUser,
} from '@/lib/api/users';

/* ── Constants ──────────────────────────────────────────────────────────── */

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Администратор' },
  { value: 'viewer', label: 'Просмотр' },
];

const ROLE_LABELS: Record<string, { label: string; variant: 'gold' | 'info' | 'default' }> = {
  owner: { label: 'Владелец', variant: 'gold' },
  admin: { label: 'Администратор', variant: 'info' },
  viewer: { label: 'Просмотр', variant: 'default' },
};

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Активен', variant: 'success' },
  invited: { label: 'Приглашён', variant: 'warning' },
  disabled: { label: 'Отключён', variant: 'default' },
};

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconPlus({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconMail({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconUsers({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEAM MANAGEMENT PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function SettingsTeamPage() {
  const [users, setUsers] = useState<PropertyUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Edit role modal state
  const [editUser, setEditUser] = useState<PropertyUser | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirmation modal state
  const [deleteUser, setDeleteUser] = useState<PropertyUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Load users ─────────────────────────────────────────────────────────── */
  const loadUsers = useCallback(async () => {
    try {
      const data = await listUsers();
      setUsers(data);
    } catch {
      toast.error('Ошибка загрузки команды');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* ── Invite user ────────────────────────────────────────────────────────── */
  function openInviteModal() {
    setInviteEmail('');
    setInviteRole('admin');
    setInviteError('');
    setInviteOpen(true);
  }

  async function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError('Введите email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Некорректный email');
      return;
    }

    setInviting(true);
    setInviteError('');
    try {
      await inviteUser({
        email,
        role: inviteRole as 'admin' | 'viewer',
      });
      toast.success(`Приглашение отправлено на ${email}`);
      setInviteOpen(false);
      loadUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg?.includes('already')) {
        setInviteError('Этот пользователь уже приглашён');
      } else {
        setInviteError('Ошибка отправки приглашения');
      }
    } finally {
      setInviting(false);
    }
  }

  /* ── Edit role ──────────────────────────────────────────────────────────── */
  function openEditModal(user: PropertyUser) {
    setEditUser(user);
    setEditRole(user.role);
  }

  async function handleEditRole() {
    if (!editUser) return;

    setEditSaving(true);
    try {
      await updateUserRole(editUser.id, {
        role: editRole as 'admin' | 'viewer',
      });
      toast.success('Роль обновлена');
      setEditUser(null);
      loadUsers();
    } catch {
      toast.error('Ошибка обновления роли');
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Remove user ────────────────────────────────────────────────────────── */
  async function handleDelete() {
    if (!deleteUser) return;

    setDeleting(true);
    try {
      await removeUser(deleteUser.id);
      toast.success('Пользователь удалён');
      setDeleteUser(null);
      loadUsers();
    } catch {
      toast.error('Ошибка удаления пользователя');
    } finally {
      setDeleting(false);
    }
  }

  /* ── Table columns ──────────────────────────────────────────────────────── */
  const columns: Column<PropertyUser>[] = [
    {
      key: 'name',
      header: 'Имя',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sardoba-gold/20 flex items-center justify-center text-sardoba-gold text-sm font-semibold shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {user.name || 'Без имени'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Роль',
      render: (user) => {
        const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.viewer;
        return (
          <Badge variant={roleInfo.variant} size="sm">
            {roleInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Статус',
      hideOnMobile: true,
      render: (user) => {
        const statusInfo = STATUS_LABELS[user.status] || STATUS_LABELS.active;
        return (
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Добавлен',
      hideOnMobile: true,
      render: (user) => (
        <span className="text-sm text-gray-500">
          {formatDate(user.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (user) => {
        if (user.role === 'owner') {
          return null;
        }
        return (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(user);
              }}
              className="p-2 text-gray-400 hover:text-sardoba-blue rounded-lg hover:bg-gray-50 transition-colors"
              title="Изменить роль"
            >
              <IconEdit />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteUser(user);
              }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <IconTrash />
            </button>
          </div>
        );
      },
    },
  ];

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Команда"
        subtitle="Управление пользователями и доступом"
        actions={
          <Button onClick={openInviteModal} icon={<IconPlus />}>
            Пригласить
          </Button>
        }
      />

      {/* Info bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sardoba-gold/10 flex items-center justify-center">
          <IconUsers className="text-sardoba-gold" />
        </div>
        <p className="text-sm text-gray-500">
          {users.length}{' '}
          {users.length === 1
            ? 'пользователь'
            : users.length < 5
              ? 'пользователя'
              : 'пользователей'}
        </p>
      </div>

      {/* Users table */}
      {loading ? (
        <Table
          columns={columns}
          data={[]}
          rowKey={(u) => u.id}
          isLoading
          skeletonRows={4}
          emptyMessage="Нет пользователей"
        />
      ) : users.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <IconUsers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">
            Нет пользователей
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Пригласите членов команды для совместной работы
          </p>
          <Button onClick={openInviteModal} icon={<IconPlus />}>
            Пригласить пользователя
          </Button>
        </div>
      ) : (
        <Table
          columns={columns}
          data={users}
          rowKey={(u) => u.id}
          emptyMessage="Нет пользователей"
        />
      )}

      {/* ── Invite Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Пригласить пользователя"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleInvite} loading={inviting}>
              Отправить приглашение
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-sardoba-gold/5 border border-sardoba-gold/20 rounded-lg">
            <IconMail className="text-sardoba-gold shrink-0" />
            <p className="text-sm text-gray-600">
              Приглашение будет отправлено на указанный email. Пользователь получит ссылку для входа.
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => {
              setInviteEmail(e.target.value);
              setInviteError('');
            }}
            placeholder="user@example.com"
            error={inviteError}
            required
          />

          <Select
            label="Роль"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLE_OPTIONS}
          />

          <div className="text-xs text-gray-400 space-y-1">
            <p>
              <span className="font-medium text-gray-500">Администратор</span>{' '}
              — полный доступ к управлению бронированиями, номерами и настройками
            </p>
            <p>
              <span className="font-medium text-gray-500">Просмотр</span>{' '}
              — только чтение данных без возможности редактирования
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Edit Role Modal ───────────────────────────────────────────────── */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title={`Изменить роль: ${editUser?.name || editUser?.email || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Отмена
            </Button>
            <Button onClick={handleEditRole} loading={editSaving}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Новая роль"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            options={ROLE_OPTIONS}
          />
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        open={deleteUser !== null}
        onClose={() => setDeleteUser(null)}
        title="Удалить пользователя?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Пользователь{' '}
          <span className="font-medium text-gray-900">
            {deleteUser?.name || deleteUser?.email}
          </span>{' '}
          будет удалён из команды и потеряет доступ к системе. Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}
