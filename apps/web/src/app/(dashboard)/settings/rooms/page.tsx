'use client';

import { useState, useCallback, useRef } from 'react';
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
import { uploadRoomPhoto, blockRoom } from '@/lib/api/rooms';
import { formatMoney } from '@/lib/utils/money';
import type { Room, RoomType, RoomStatus } from '@sardoba/shared';
import { usePropertyId } from '@/lib/hooks/use-property-id';

const ROOM_TYPE_OPTIONS = [
  { value: 'single', label: 'Одноместный' },
  { value: 'double', label: 'Двухместный' },
  { value: 'family', label: 'Семейный' },
  { value: 'suite', label: 'Люкс' },
  { value: 'dorm', label: 'Общий' },
];

const ALL_AMENITIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> },
  { key: 'ac', label: 'Кондиционер', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6L12 12"/><path d="M5.6 6.6L12 12"/><path d="M12 12v10"/><path d="M18.4 17.4L12 12"/><path d="M5.6 17.4L12 12"/></svg> },
  { key: 'tv', label: 'ТВ', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg> },
  { key: 'fridge', label: 'Холодильник', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="10" y1="6" x2="10" y2="6.01"/><line x1="10" y1="14" x2="10" y2="14.01"/></svg> },
  { key: 'balcony', label: 'Балкон', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 12v9"/></svg> },
  { key: 'view', label: 'Вид', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
  { key: 'bathtub', label: 'Ванна', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3a1 1 0 0 1 1-1z"/><path d="M6 12V5a2 2 0 0 1 2-2h3v2.25"/></svg> },
  { key: 'shower', label: 'Душ', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"/></svg> },
  { key: 'safe', label: 'Сейф', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="8" x2="12" y2="12"/></svg> },
  { key: 'minibar', label: 'Мини-бар', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l4 10H4L8 2z"/><path d="M12 12v6"/><path d="M8 18h8"/></svg> },
  { key: 'kettle', label: 'Чайник', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg> },
];

const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  ALL_AMENITIES.map((a) => [a.key, a.label]),
);

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
  const propertyId = usePropertyId();
  const { data: rooms, isLoading } = useRooms(propertyId);
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
  const [amenities, setAmenities] = useState<string[]>([]);
  const [descriptionRu, setDescriptionRu] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const formPhotosInputRef = useRef<HTMLInputElement>(null);

  // Block modal state
  const [showBlock, setShowBlock] = useState(false);
  const [blockRoomId, setBlockRoomId] = useState<number | null>(null);
  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockSaving, setBlockSaving] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setRoomType('double');
    setFloor('');
    setCapacityAdults('2');
    setCapacityChildren('0');
    setBasePrice('');
    setAmenities([]);
    setDescriptionRu('');
    setFormPhotos([]);
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
    setAmenities(room.amenities ?? []);
    setDescriptionRu(room.descriptionRu || '');
    setFormPhotos(room.photos ?? []);
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
      amenities: amenities.length > 0 ? amenities : undefined,
      description_ru: descriptionRu || undefined,
    };

    try {
      if (editingRoom) {
        await updateRoom.mutateAsync({ id: editingRoom.id, dto });
      } else {
        await createRoom.mutateAsync({ ...dto, property_id: propertyId ?? 0 });
      }
      setShowForm(false);
      resetForm();
    } catch {
      // Handled by mutation
    }
  }, [
    name, roomType, floor, capacityAdults, capacityChildren, basePrice, amenities,
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

  const handleFormPhotoUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!editingRoom) {
        toast('Сохраните номер, затем добавьте фото');
        return;
      }
      setUploadingPhoto(true);
      for (const file of Array.from(files)) {
        try {
          const { url } = await uploadRoomPhoto(editingRoom.id, file);
          setFormPhotos((prev) => [...prev, url]);
        } catch {
          toast.error('Ошибка загрузки фото');
        }
      }
      setUploadingPhoto(false);
      if (formPhotosInputRef.current) formPhotosInputRef.current.value = '';
    },
    [editingRoom],
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

                  {room.amenities && room.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {room.amenities.slice(0, 5).map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 text-[10px] bg-sardoba-sand/60 text-sardoba-blue px-1.5 py-0.5 rounded-full"
                        >
                          {AMENITY_LABELS[a] || a}
                        </span>
                      ))}
                      {room.amenities.length > 5 && (
                        <span className="text-[10px] text-gray-400 px-1.5 py-0.5">
                          +{room.amenities.length - 5}
                        </span>
                      )}
                    </div>
                  )}

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Удобства
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_AMENITIES.map((item) => {
                const active = amenities.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setAmenities((prev) =>
                        active
                          ? prev.filter((a) => a !== item.key)
                          : [...prev, item.key],
                      )
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                      active
                        ? 'bg-sardoba-gold/10 border-sardoba-gold text-sardoba-gold-dark shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
                    )}
                  >
                    {item.icon}
                    {item.label}
                    {active && (
                      <svg className="w-3.5 h-3.5 text-sardoba-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {amenities.length > 0 && (
              <p className="mt-1.5 text-xs text-gray-400">
                Выбрано: {amenities.length}
              </p>
            )}
          </div>

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

          {/* Photo upload in form */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Фотографии
            </label>
            {formPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {formPhotos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {editingRoom ? (
              <>
                <button
                  type="button"
                  onClick={() => formPhotosInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-sardoba-gold hover:text-sardoba-gold-dark transition-colors disabled:opacity-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploadingPhoto ? 'Загрузка...' : 'Загрузить фото'}
                </button>
                <input
                  ref={formPhotosInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFormPhotoUpload(e.target.files)}
                />
              </>
            ) : (
              <p className="text-xs text-gray-400">
                Фотографии можно добавить после создания номера
              </p>
            )}
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
              loading={blockSaving}
              onClick={async () => {
                if (!blockFrom || !blockTo) {
                  toast.error('Укажите даты');
                  return;
                }
                if (!blockRoomId) return;
                setBlockSaving(true);
                try {
                  await blockRoom(blockRoomId, blockFrom, blockTo, blockReason);
                  toast.success('Номер заблокирован');
                  setShowBlock(false);
                  setBlockFrom('');
                  setBlockTo('');
                  setBlockReason('');
                } catch {
                  toast.error('Ошибка при блокировке номера');
                } finally {
                  setBlockSaving(false);
                }
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
