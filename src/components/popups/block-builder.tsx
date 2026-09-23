'use client';

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  Copy,
  FileText,
  Gift,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Mail,
  Minus,
  MousePointerClick,
  Package,
  Plus,
  Space,
  Timer,
  Trash2,
  TrendingUp,
  Type,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { Block, BlockType } from '@/types/popups';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { BlockInspector } from './block-inspector';
import { BLOCK_LABELS, BLOCK_TYPES, LEAF_BLOCK_TYPES, blockSummary, cloneBlock, createBlock } from './popup-utils';

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  heading: Heading,
  richText: Type,
  image: ImageIcon,
  buttons: MousePointerClick,
  products: Package,
  form: Mail,
  coupon: Gift,
  spacer: Space,
  divider: Minus,
  video: Video,
  countdown: Timer,
  offerProgress: TrendingUp,
  pageEmbed: FileText,
  columns: Columns2,
};

/**
 * Sortable, collapsible list of blocks with inline inspectors. Used for the
 * top-level variant content and (with `leafOnly`) for each column of a
 * columns block.
 */
export function BlockList<T extends Block>({
  blocks,
  onChange,
  leafOnly,
}: {
  blocks: T[];
  onChange: (blocks: T[]) => void;
  leafOnly?: boolean;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(blocks, from, to));
  }

  function add(type: BlockType) {
    const block = createBlock(type) as T;
    onChange([...blocks, block]);
    setOpen((s) => new Set(s).add(block.id));
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, i) => (
            <SortableBlockRow
              key={block.id}
              block={block}
              expanded={open.has(block.id)}
              onToggle={() => toggle(block.id)}
              onChange={(b) => onChange(blocks.map((x, j) => (j === i ? (b as T) : x)))}
              onDuplicate={() => {
                const copy = cloneBlock(block);
                onChange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
              }}
              onDelete={() => onChange(blocks.filter((_, j) => j !== i))}
            />
          ))}
        </SortableContext>
      </DndContext>
      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No blocks yet.
        </p>
      )}
      <AddBlockMenu types={leafOnly ? LEAF_BLOCK_TYPES : BLOCK_TYPES} onAdd={add} small={leafOnly} />
    </div>
  );
}

function AddBlockMenu({ types, onAdd, small }: { types: BlockType[]; onAdd: (t: BlockType) => void; small?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size={small ? 'sm' : 'default'} className="w-full border-dashed" />}
      >
        <Plus className="size-4" /> Add block
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {types.map((t) => {
          const Icon = BLOCK_ICONS[t];
          return (
            <DropdownMenuItem key={t} onClick={() => onAdd(t)}>
              <Icon className="size-4" /> {BLOCK_LABELS[t]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortableBlockRow({
  block,
  expanded,
  onToggle,
  onChange,
  onDuplicate,
  onDelete,
}: {
  block: Block;
  expanded: boolean;
  onToggle: () => void;
  onChange: (b: Block) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const Icon = BLOCK_ICONS[block.type];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-lg border bg-card', isDragging && 'relative z-10 opacity-80 shadow-lg')}
    >
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-sm font-medium">{BLOCK_LABELS[block.type]}</span>
          <span className="truncate text-xs text-muted-foreground">{blockSummary(block)}</span>
        </button>
        <Button variant="ghost" size="icon-sm" aria-label="Duplicate block" onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Delete block" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {expanded && (
        <div className="border-t px-3 py-3">
          <BlockInspector block={block} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
