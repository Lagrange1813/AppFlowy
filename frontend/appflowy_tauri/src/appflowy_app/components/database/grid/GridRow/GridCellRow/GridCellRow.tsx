import { Virtualizer } from '@tanstack/react-virtual';
import { IconButton, Tooltip } from '@mui/material';
import { t } from 'i18next';
import { DragEventHandler, FC, useCallback, useMemo, useState } from 'react';
import { ReactComponent as DragSvg } from '$app/assets/drag.svg';
import { throttle } from '$app/utils/tool';
import { useViewId } from '$app/hooks';
import { useDatabase } from '../../../Database.hooks';
import { rowService, RowMeta } from '../../../application';
import { DragItem, DragType, DropPosition, VirtualizedList, useDraggable, useDroppable, ScrollDirection } from '../../../_shared';
import { GridCell } from '../../GridCell';
import { GridCellRowActions } from './GridCellRowActions';

export interface GridCellRowProps {
  rowMeta: RowMeta;
  virtualizer: Virtualizer<Element, Element>;
}

export const GridCellRow: FC<GridCellRowProps> = ({
  rowMeta,
  virtualizer,
}) => {
  const viewId = useViewId();
  const { fields } = useDatabase();

  const [ hover, setHover ] = useState(false);
  const [ openTooltip, setOpenTooltip ] = useState(false);
  const [ dropPosition, setDropPosition ] = useState<DropPosition>(DropPosition.Before);

  const handleMouseEnter = useCallback(() => {
    setHover(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(false);
  }, []);

  const handleTooltipOpen = useCallback(() => {
    setOpenTooltip(true);
  }, []);

  const handleTooltipClose = useCallback(() => {
    setOpenTooltip(false);
  }, []);

  const dragData = useMemo(() => ({
    rowMeta,
  }), [rowMeta]);

  const {
    isDragging,
    attributes,
    listeners,
    setPreviewRef,
    previewRef,
  } = useDraggable({
    type: DragType.Row,
    data: dragData,
    scrollOnEdge: {
      direction: ScrollDirection.Vertical,
    },
  });

  const onDragOver = useMemo<DragEventHandler>(() => {
    return throttle((event) => {
      const element = previewRef.current;

      if (!element) {
        return;
      }

      const { top, bottom } = element.getBoundingClientRect();
      const middle = (top + bottom) / 2;

      setDropPosition(event.clientY < middle ? DropPosition.Before : DropPosition.After);
    }, 20);
  }, [previewRef]);

  const onDrop = useCallback(({ data }: DragItem) => {
    void rowService.moveRow(viewId, (data.rowMeta as RowMeta).id, rowMeta.id);
  }, [viewId, rowMeta.id]);

  const {
    isOver,
    listeners: dropListeners,
  } = useDroppable({
    accept: DragType.Row,
    disabled: isDragging,
    onDragOver,
    onDrop,
  });

  return (
    <div
      className="flex grow ml-[-49px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...dropListeners}
    >
      <GridCellRowActions
        className={hover ? 'visible' : 'invisible'}
        rowId={rowMeta.id}
      >
        <Tooltip
          placement="top"
          title={t('grid.row.drag')}
          open={openTooltip && !isDragging}
          onOpen={handleTooltipOpen}
          onClose={handleTooltipClose}
        >
          <IconButton
            className="mx-1 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <DragSvg className='-mx-1' />
          </IconButton>
        </Tooltip>
      </GridCellRowActions>
      <div
        ref={setPreviewRef}
        className={`flex grow border-b border-line-divider relative ${isDragging ? 'bg-blue-50' : ''}`}
      >
        <VirtualizedList
          className="flex"
          itemClassName="flex border-r border-line-divider"
          virtualizer={virtualizer}
          renderItem={index => (
            <GridCell
              rowId={rowMeta.id}
              field={fields[index]}
            />
          )}
        />
        <div className="min-w-20 grow" />
        {isOver && <div className={`absolute left-0 right-0 h-0.5 bg-blue-500 z-10 ${dropPosition === DropPosition.Before ? 'top-[-1px]' : 'top-full'}`} />}
      </div>
    </div>
  );
};