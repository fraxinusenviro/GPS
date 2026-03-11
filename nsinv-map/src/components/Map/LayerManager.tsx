import { useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useLayerStore } from '../../store/layerStore';
import { LayerItem } from './LayerItem';
import { AddLayerModal } from './AddLayerModal';

export function LayerManager() {
  const { layers, reorderLayers } = useLayerStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = layers.findIndex((l) => l.id === active.id);
    const newIdx = layers.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(layers, oldIdx, newIdx).map((l, i) => ({ ...l, order: i }));
    reorderLayers(reordered);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Layers</span>
            {layers.length > 0 && (
              <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded-full">
                {layers.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs rounded-lg transition-colors"
          >
            <Plus size={12} />
            Add Layer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {layers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Layers size={24} className="text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No layers added yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-2 text-xs text-accent hover:underline"
              >
                Add your first layer
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {[...layers].sort((a, b) => a.order - b.order).map((layer) => (
                  <LayerItem key={layer.id} layer={layer} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {showAddModal && <AddLayerModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
