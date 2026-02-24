'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useRooms, useCreateRoom, useUpdateRoom } from '@/lib/hooks/use-rooms';
import { uploadRoomPhoto } from '@/lib/api/rooms';
import { formatMoney } from '@/lib/utils/money';
import type { Room, RoomType, RoomStatus } from '@sardoba/shared';

const PROPERTY_ID = 1;

const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Одноместный' },
  { value: 'double', label: 'Двухместный' },
  { value: 'family', label: 'Семейный' },
  { value: 'suite', label: 'Люкс' },
  { value: 'dorm', label: 'Общий' },
];

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Одноместный',
  double: 'Двухместный',
  family: 'Семейный',
  suite: 'Люкс',
  dorm: 'Общий',
};

const STATUS_LABELS: Record<RoomStatus, { label: string; color: string }> = {
  active: { label: 'Активен', color: 'bg-green-100 text-green-800' },
  maintenance: { label: 'Обслуживание', color: 'bg-yellow-100 text-yellow-800' },
  inactive: { label: 'Неактивен', color: 'bg-gray-100 text-gray-600' },
};

export default function SettingsRoomsPage() {
  const { data: rooms, isLoading } = useRooms(PROPERTY_ID);
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState('double');
  const [floor, setFloor] = useState('');
  const [capacityAdults, setCapacityAdults] = useState('2');
  const [capacityChildren, setCapacityChildren] = useState('0');
  const [basePrice, setBasePrice] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');

  // Block modal state
  const [showBlock, setShowBlock] = useState(false);
  const [blockRoomId, setBlockRoomId] = useState<number | null>(null);
  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setRoomType('double');
    setFloor('');
    setCapacityAdults('2');
    setCapacityChildren('0');
    setBasePrice('');
    setDescriptionRu('');
    setEditingRoom(null);
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  const openEdit = useCallback((room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setRoomType(room.roomType);
    setFloor(room.floor?.toString() || '');
    setCapacityAdults(room.capacityAdults.toString());
    setCapacityChildren(room.capacityChildren.toString());
    setBasePrice((room.basePrice / 100).toString());
    setDescriptionRu(room.descriptionRu || '');
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name) {
      toast.error('Укажите название');
      return;
    }
    if (!basePrice || Number(basePrice) <= 0) {
      toast.error('Укажите цену');
      return;
    }

    const dto = {
      name,
      room_type: roomType,
      floor: floor ? Number(floor) : undefined,
      capacity_adults: Number(capacityAdults),
      capacity_children: Number(capacityChildren),
      base_price: Math.round(Number(basePrice) * 100),
      description_ru: descriptionRu || undefined,
    };

    try {
      if (editingRoom) {
        await updateRoom.mutateAsync({ id: editingRoom.id, dto });
      } else {
        await createRoom.mutateAsync({ ...dto, property_id: PROPERTY_ID });
      }
      setShowForm(false);
      resetForm();
    } catch {
      // Handled by mutation
    }
  }, [
    name, roomType, floor, capacityAdults, capacityChildren, basePrice,
    descriptionRu, editingRoom, createRoom, updateRoom, resetForm,
  ]);

  const handlePhotoUpload = useCallback(
    async (roomId: number, file: File) => {
      try {
        await uploadRoomPhoto(roomId, file);
        toast.success('Фото загружено');
      } catch {
        toast.error('Ошибка загрузки фото');
      }
    },
    [],
  );

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 lg:p-6">
      <PageHeader
        title="Номера"
        subtitle="Управление номерным фондом"
        actions={
          <Button
            onClick={openAdd}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            }
          >
            Добавить номер
          </Button>
        }
      />

      {/* Room cards grid */}
      {(rooms || []).length === 0 ? (
        <div className="text-center py-20 text-gray-500 bg-white rounded-xl border border-gray-200">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-gray-300">
            <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
          </svg>
          <p className="text-sm">Нет номеров. Добавьте первый номер.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(rooms || []).map((room) => {
            const statusInfo = STATUS_LABELS[room.status as RoomStatus] || STATUS_LABELS.active;
            const isExpanded = expandedId === room.id;

            return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-card transition-shadow"
              >
                {/* Photo area */}
                <div className="h-32 bg-gradient-to-br from-sardoba-sand-light to-sardoba-sand flex items-center justify-center relative">
                  {room.photos && room.photos.length > 0 ? (
                    <img
                      src={room.photos[0]}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-sardoba-gold/40">
                      <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
                    </svg>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="custom" bg={statusInfo.color.split(' ')[0]} text={statusInfo.color.split(' ')[1]} size="sm">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Card content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      <span className="text-xs text-gray-500">
                        {ROOM_TYPE_LABELS[room.roomType as RoomType] || room.roomType}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sardoba-blue text-sm">
                        {formatMoney(room.basePrice)}
                      </div>
                      <span className="text-[10px] text-gray-500">/ ночь</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span>
                      {room.capacityAdults} взр.
                      {room.capacityChildren > 0 && ` + ${room.capacityChildren} дет.`}
                    </span>
                    {room.floor && <span>Этаж: {room.floor}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(room)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setBlockRoomId(room.id);
                        setShowBlock(true);
                      }}
                    >
                      Заблокировать
                    </Button>
                  </div>

                  {/* Photo upload */}
                  <label className="mt-2 flex items-center justify-center gap-1 p-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 cursor-pointer hover:border-sardoba-gold hover:text-sardoba-gold-dark transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Загрузить фото</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(room.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editingRoom ? `Редактировать: ${editingRoom.name}` : 'Новый номер'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createRoom.isPending || updateRoom.isPending}
            >
              {editingRoom ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Номер 101, Люкс с балконом..."
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Тип"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              options={ROOM_TYPE_OPTIONS}
            />
            <Input
              label="Этаж"
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Взрослых (макс)"
              type="number"
              value={capacityAdults}
              onChange={(e) => setCapacityAdults(e.target.value)}
              min={1}
              required
            />
            <Input
              label="Детей (макс)"
              type="number"
              value={capacityChildren}
              onChange={(e) => setCapacityChildren(e.target.value)}
              min={0}
            />
          </div>

          <Input
            label="Базовая цена за ночь (сум)"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="300000"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={descriptionRu}
              onChange={(e) => setDescriptionRu(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold"
              rows={3}
              placeholder="Описание номера..."
            />
          </div>
        </div>
      </Modal>

      {/* Block Room Modal */}
      <Modal
        open={showBlock}
        onClose={() => setShowBlock(false)}
        title="Заблокировать номер"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBlock(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (!blockFrom || !blockTo) {
                  toast.error('Укажите даты');
                  return;
                }
                toast.success('Номер заблокирован');
                setShowBlock(false);
                setBlockFrom('');
                setBlockTo('');
                setBlockReason('');
              }}
            >
              Заблокировать
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Дата с"
              type="date"
              value={blockFrom}
              onChange={(e) => setBlockFrom(e.target.value)}
              required
            />
            <Input
              label="Дата по"
              type="date"
              value={blockTo}
              onChange={(e) => setBlockTo(e.target.value)}
              required
            />
          </div>
          <Input
            label="Причина"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Ремонт, техобслуживание..."
          />
        </div>
      </Modal>
    </div>
  );
}
