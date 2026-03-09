'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';
import { FloorPlanEditor } from '@/components/floor-plan/FloorPlanEditor';
import { FloorPlanViewer } from '@/components/floor-plan/FloorPlanViewer';
import { useFloorPlans, useSaveFloorPlans } from '@/lib/hooks/use-floor-plans';
import { usePropertyId } from '@/lib/hooks/use-property-id';
import { useRooms } from '@/lib/hooks/use-rooms';
import type { FloorPlan, FloorPlansConfig } from '@sardoba/shared';

export default function FloorPlanPage() {
  const propertyId = usePropertyId();
  const { data: rooms = [] } = useRooms(propertyId);
  const { data: serverConfig, isLoading } = useFloorPlans();
  const saveFloorPlans = useSaveFloorPlans();

  const [localConfig, setLocalConfig] = useState<FloorPlansConfig>({ version: 1, floors: [] });
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);

  // New floor form state
  const [newFloorNum, setNewFloorNum] = useState(1);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorRows, setNewFloorRows] = useState(8);
  const [newFloorCols, setNewFloorCols] = useState(12);

  // Sync from server — only when serverConfig actually changes (initial load or after save)
  useEffect(() => {
    if (serverConfig) {
      setLocalConfig(serverConfig);
    }
  }, [serverConfig]);

  // Auto-select first floor on initial load
  useEffect(() => {
    if (serverConfig && serverConfig.floors.length > 0 && selectedFloor === null) {
      setSelectedFloor(serverConfig.floors[0].floor);
    }
  }, [serverConfig, selectedFloor]);

  const currentPlan = localConfig.floors.find((f) => f.floor === selectedFloor);

  const otherFloorsRoomIds = useMemo(() => {
    return localConfig.floors
      .filter((f) => f.floor !== selectedFloor)
      .flatMap((f) => f.cells.filter((c) => c.roomId).map((c) => c.roomId!));
  }, [localConfig.floors, selectedFloor]);

  const handlePlanChange = useCallback(
    (updatedPlan: FloorPlan) => {
      setLocalConfig((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.floor === updatedPlan.floor
            ? { ...updatedPlan, updatedAt: new Date().toISOString() }
            : f,
        ),
      }));
    },
    [],
  );

  const handleCancel = useCallback(() => {
    if (serverConfig) {
      setLocalConfig(serverConfig);
      if (!serverConfig.floors.some((f) => f.floor === selectedFloor)) {
        setSelectedFloor(
          serverConfig.floors.length > 0 ? serverConfig.floors[0].floor : null,
        );
      }
    }
    setEditMode(false);
  }, [serverConfig, selectedFloor]);

  const handleSave = useCallback(async () => {
    try {
      await saveFloorPlans.mutateAsync(localConfig);
      toast.success('План этажа сохранен');
      setEditMode(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[]; error?: { message?: string } } } };
      const data = axiosErr?.response?.data;
      let detail = '';
      if (data?.message) {
        detail = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      } else if (data?.error?.message) {
        detail = data.error.message;
      }
      toast.error(detail ? `Ошибка: ${detail}` : 'Ошибка сохранения');
      console.error('[FloorPlan save error]', data ?? err);
    }
  }, [localConfig, saveFloorPlans]);

  const handleAddFloor = useCallback(() => {
    const exists = localConfig.floors.some((f) => f.floor === newFloorNum);
    if (exists) {
      toast.error(`Этаж ${newFloorNum} уже существует`);
      return;
    }

    const newPlan: FloorPlan = {
      floor: newFloorNum,
      name: newFloorName || `${newFloorNum}-й этаж`,
      rows: newFloorRows,
      cols: newFloorCols,
      compass: 'N',
      cells: [],
      updatedAt: new Date().toISOString(),
    };

    setLocalConfig((prev) => ({
      ...prev,
      floors: [...prev.floors, newPlan].sort((a, b) => a.floor - b.floor),
    }));
    setSelectedFloor(newFloorNum);
    setEditMode(true);
    setShowAddFloor(false);

    // Reset form
    setNewFloorNum(newFloorNum + 1);
    setNewFloorName('');
    setNewFloorRows(8);
    setNewFloorCols(12);
  }, [localConfig, newFloorNum, newFloorName, newFloorRows, newFloorCols]);

  const handleDeleteFloor = useCallback(() => {
    if (!selectedFloor) return;
    if (!confirm(`Удалить план этажа ${selectedFloor}?`)) return;

    setLocalConfig((prev) => ({
      ...prev,
      floors: prev.floors.filter((f) => f.floor !== selectedFloor),
    }));

    const remaining = localConfig.floors.filter((f) => f.floor !== selectedFloor);
    setSelectedFloor(remaining.length > 0 ? remaining[0].floor : null);
  }, [selectedFloor, localConfig]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-sardoba-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">План этажей</h1>
          <p className="text-sm text-gray-500 mt-1">
            Создайте карту расположения номеров на каждом этаже
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saveFloorPlans.isPending}
                className="px-4 py-2 text-sm text-white bg-sardoba-gold rounded-lg hover:bg-sardoba-gold/90 transition-colors disabled:opacity-50"
              >
                {saveFloorPlans.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 text-sm text-white bg-sardoba-blue rounded-lg hover:bg-sardoba-blue-light transition-colors"
              disabled={localConfig.floors.length === 0}
            >
              Редактировать
            </button>
          )}
        </div>
      </div>

      {/* Floor tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {localConfig.floors.map((f) => (
          <button
            key={f.floor}
            onClick={() => setSelectedFloor(f.floor)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              selectedFloor === f.floor
                ? 'bg-sardoba-blue text-white border-sardoba-blue'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
            )}
          >
            {f.name}
          </button>
        ))}

        <button
          onClick={() => setShowAddFloor(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          + Добавить этаж
        </button>
      </div>

      {/* Add floor form */}
      {showAddFloor && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Новый этаж</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Номер этажа</label>
              <input
                type="number"
                value={newFloorNum}
                onChange={(e) => setNewFloorNum(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none"
                min={-5}
                max={100}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название</label>
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder={`${newFloorNum}-й этаж`}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Строк</label>
              <input
                type="number"
                value={newFloorRows}
                onChange={(e) => setNewFloorRows(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none"
                min={1}
                max={50}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Столбцов</label>
              <input
                type="number"
                value={newFloorCols}
                onChange={(e) => setNewFloorCols(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-sardoba-gold outline-none"
                min={1}
                max={50}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddFloor}
              className="px-4 py-2 text-sm text-white bg-sardoba-gold rounded-lg hover:bg-sardoba-gold/90 transition-colors"
            >
              Создать
            </button>
            <button
              onClick={() => setShowAddFloor(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Floor plan content */}
      {currentPlan ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{currentPlan.name}</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{currentPlan.rows} &times; {currentPlan.cols} сетка</span>
              {editMode && (
                <button
                  onClick={handleDeleteFloor}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Удалить этаж
                </button>
              )}
            </div>
          </div>

          {editMode ? (
            <FloorPlanEditor
              plan={currentPlan}
              rooms={rooms}
              otherFloorsRoomIds={otherFloorsRoomIds}
              onChange={handlePlanChange}
            />
          ) : (
            <FloorPlanViewer plan={currentPlan} />
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <p className="text-gray-500">
            Добавьте первый этаж, чтобы начать создание плана
          </p>
        </div>
      )}

      {/* Legend */}
      {currentPlan && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Легенда</h3>
          <div className="flex flex-wrap gap-3">
            {([
              ['bg-blue-100', 'text-blue-800', 'Номер'],
              ['bg-gray-200', 'text-gray-600', 'Коридор'],
              ['bg-amber-100', 'text-amber-800', 'Лестница'],
              ['bg-purple-100', 'text-purple-800', 'Лифт'],
              ['bg-green-100', 'text-green-800', 'Ресепшн'],
              ['bg-gray-700', 'text-white', 'Стена'],
              ['bg-cyan-100', 'text-cyan-800', 'Санузел'],
              ['bg-orange-100', 'text-orange-800', 'Подсобка'],
            ] as const).map(([bg, text, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('w-4 h-4 rounded-sm', bg)} />
                <span className={cn('text-xs', text)}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
